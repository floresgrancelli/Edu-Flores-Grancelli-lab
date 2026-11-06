// In-memory synthetic service. No database, email, network, keys or account changes.
import {API, accountInput, canonical, occupancy, seatLimit} from '../pilot/dual-workspace-candidate.mjs';
const clone = value => structuredClone(value);
function reject(code, message) {
  throw Object.assign(new Error(message), {code, outcome: 'not_applied'});
}
function syntheticEmail(value) {
  if (!value.endsWith('@example.invalid')) reject('SYNTHETIC_ONLY', 'Solo correos ficticios .invalid.');
}
export function seed() {
  return {
    profiles: [
      {user_id:'admin', email:'admin@example.invalid', nickname:'Admin DEMO', role:'admin', organization_id:null, active:true, confirmed:true},
      {user_id:'mentor', email:'mentor@example.invalid', nickname:'Mentor DEMO', role:'coach', organization_id:null, active:true, confirmed:true},
      {user_id:'learner', email:'learner@example.invalid', nickname:'Alumna DEMO', role:'student', organization_id:'original', active:true, confirmed:true},
      {user_id:'other', email:'other@example.invalid', nickname:'Otro coach DEMO', role:'coach', organization_id:null, active:true, confirmed:true},
      {user_id:'other-student', email:'other-student@example.invalid', nickname:'Alumno ajeno DEMO', role:'student', organization_id:'other-org', active:true, confirmed:true}
    ],
    organizations: [
      {id:'original', name:'Mentor DEMO', coach_id:'mentor', seat_limit:10, status:'trial', is_test:true},
      {id:'other-org', name:'Otro DEMO', coach_id:'other', seat_limit:10, status:'trial', is_test:true}
    ],
    consents:[{student_id:'learner', organization_id:'original', accepted:true},
      {student_id:'other-student', organization_id:'other-org', accepted:true}],
    history:[{student_id:'learner', body:'HISTORIAL FICTICIO INALTERADO'}],
    invitations:[], capabilities:[], pendingCoaches:[], receipts:[], audit:[]
  };
}
export function createSyntheticService(initial = seed()) {
  let db = clone(initial), seq = 0, queue = Promise.resolve();
  db.accounts ||= db.profiles.map(p=>({user_id:p.user_id,email:p.email,confirmed:p.confirmed}));
  const count = {};
  const nextId = prefix => prefix + '-' + (++seq);
  function identity(userId) {
    const a=db.accounts.find(a=>a.user_id===userId),p=db.profiles.find(p=>p.user_id===userId);
    if(!a?.confirmed || p&&!p.active)reject('DENIED','Identidad verificada requerida.');
    return a;
  }
  function actor(userId) {
    identity(userId);
    const p = db.profiles.find(p => p.user_id === userId);
    if (!p?.active || !p.confirmed) reject('DENIED', 'Cuenta activa y verificada requerida.');
    return p;
  }
  function admin(userId) {
    const p = actor(userId);
    if (p.role !== 'admin') reject('ADMIN_REQUIRED', 'Solo administrador.');
    return p;
  }
  function own(userId, orgId, needsLegal=true) {
    actor(userId);
    const org = db.organizations.find(o => o.id === orgId);
    if (!org || org.coach_id !== userId || !org.is_test ||
        !['trial', 'active'].includes(org.status) ||
        !db.capabilities.some(c => c.user_id === userId && c.organization_id === orgId && c.active))
      reject('DENIED', 'No hay capacidad profesional vigente para este espacio.');
    if(needsLegal&&!db.capabilities.some(c=>c.user_id===userId&&c.organization_id===orgId&&
       c.terms_version==='synthetic-terms-v1'&&c.privacy_version==='synthetic-privacy-v1'))
      reject('PROFESSIONAL_TERMS_REQUIRED','Faltan términos profesionales vigentes.');
    return org;
  }
  function summary(org) {
    const {active, pending} = occupancy(db.profiles, db.invitations, org.id);
    const capability=db.capabilities.find(c=>c.organization_id===org.id);
    return {...clone(org), active_students:active, pending_invitations:pending,
      legal_ready:capability?.terms_version==='synthetic-terms-v1'&&capability?.privacy_version==='synthetic-privacy-v1'};
  }
  function contexts(userId) {
    const p = actor(userId);
    const studentOrg = p.role === 'student' ? db.organizations.find(o => o.id === p.organization_id) : null;
    return {user_id:userId, profile_role:p.role, active:true,
      student_context:studentOrg ? {organization_id:studentOrg.id, coach_id:studentOrg.coach_id,
        consent_accepted:db.consents.some(c => c.student_id === userId &&
          c.organization_id === studentOrg.id && c.accepted)} : null,
      coach_contexts:db.organizations.filter(o => o.coach_id === userId && o.is_test &&
        ['trial','active'].includes(o.status) && db.capabilities.some(c =>
          c.user_id === userId && c.organization_id === o.id && c.active)).map(summary),
      managed_coaches:p.role === 'admin' ? db.organizations.filter(o =>
        db.capabilities.some(c => c.organization_id === o.id) ||
        db.pendingCoaches.some(c => c.organization_id === o.id && !c.revoked_at)).map(summary) : []};
  }
  async function call(userId, name, args = {}) {
    count[name] = (count[name] || 0) + 1;
    if (name === API.contexts) return {data:contexts(userId)};
    if(name===API.roster){
      const org=own(userId,args.p_org);
      return {data:db.profiles.filter(p=>p.role==='student'&&p.organization_id===org.id).map(p=>({
        user_id:p.user_id,organization_id:p.organization_id,nickname:p.nickname,active:p.active,
        consent_accepted:db.consents.some(c=>c.student_id===p.user_id&&c.organization_id===org.id&&c.accepted)}))};
    }
    if (name === API.receipt) {
      identity(userId);
      return {data:clone(db.receipts.find(r => r.actor_id === userId && r.request_id === args.p_request_id) || null)};
    }
    // One queue emulates the transaction boundary, NOT PostgreSQL concurrency.
    const job = queue.then(() => transaction(userId, name, args));
    queue = job.catch(() => {});
    return job;
  }
  function transaction(userId, name, input) {
    if(name===API.claim)identity(userId);else actor(userId);
    const before = clone(db);
    try {
      const operation = Object.keys(API).find(key => API[key] === name);
      if (!['create','seats','invite','claim','acceptTerms'].includes(operation)) reject('UNKNOWN_RPC', 'RPC desconocida.');
      if (!input.p_request_id || typeof input.p_request_id !== 'string') reject('REQUEST_ID_REQUIRED', 'Falta ID de operación.');
      const {p_request_id:requestId, ...args} = input;
      const prior = db.receipts.find(r => r.actor_id === userId && r.request_id === requestId);
      if (prior) {
        if (prior.operation !== operation || canonical(prior.payload) !== canonical(args))
          reject('IDEMPOTENCY_CONFLICT', 'El ID corresponde a otra operación.');
        return {data:clone(prior.result)};
      }
      let result;
      if(operation==='acceptTerms'){
        const org=own(userId,args.p_org,false);
        if(args.p_terms_version!=='synthetic-terms-v1'||args.p_privacy_version!=='synthetic-privacy-v1')
          reject('INVALID_LEGAL_VERSION','Versión profesional inválida.');
        const capability=db.capabilities.find(c=>c.user_id===userId&&c.organization_id===org.id);
        capability.terms_version=args.p_terms_version;capability.privacy_version=args.p_privacy_version;
        result={organization_id:org.id,legal_ready:true};
      }else if(operation==='claim'){
        const account=identity(userId);syntheticEmail(account.email);
        const invite=db.pendingCoaches.find(i=>i.email===account.email&&!i.revoked_at&&(!i.claimed_by||i.claimed_by===userId));
        if(!invite)reject('NO_INVITATION','No hay invitación para esta identidad.');
        const org=db.organizations.find(o=>o.id===invite.organization_id);
        let p=db.profiles.find(p=>p.user_id===userId);
        if(!org?.is_test||!['trial','active'].includes(org.status)||org.coach_id&&org.coach_id!==userId||
           p&&(p.role==='admin'||p.email!==account.email||!p.active)||
           db.organizations.some(o=>o.coach_id===userId&&o.id!==org.id)||
           db.capabilities.some(c=>c.user_id===userId&&(c.organization_id!==org.id||!c.active)))
          reject('DENIED','La invitación no puede habilitar esta cuenta.');
        if(!p){p={user_id:userId,email:account.email,nickname:invite.name,role:'coach',organization_id:null,active:true,confirmed:true};db.profiles.push(p);}
        org.coach_id=userId;invite.claimed_by=userId;
        if(!db.capabilities.some(c=>c.user_id===userId))db.capabilities.push({user_id:userId,organization_id:org.id,active:true});
        result={organization_id:org.id,seat_limit:org.seat_limit,state:'enabled_verified_account',student_link_preserved:p.role==='student'};
      } else if (operation === 'create') {
        admin(userId);
        const {email, name} = accountInput(args.p_email, args.p_name);
        syntheticEmail(email);
        const seats = seatLimit(args.p_seats);
        const p = db.profiles.find(p => p.email.toLowerCase() === email);
        if (p && (!p.active || !p.confirmed || p.role === 'admin')) reject('TARGET_INELIGIBLE', 'Cuenta no elegible.');
        if (p && (db.organizations.some(o => o.coach_id === p.user_id) ||
            db.capabilities.some(c => c.user_id === p.user_id)) ||
            db.pendingCoaches.some(i => i.email === email && !i.revoked_at) ||
            db.invitations.some(i => i.email === email && !i.revoked_at))
          reject('ALREADY_ENROLLED', 'Cuenta ya habilitada o invitada.');
        const org = {id:nextId('pilot'), name, coach_id:p?.user_id || null,
          seat_limit:seats, status:'trial', is_test:true, license_fee_ars:null};
        db.organizations.push(org);
        if (p) db.capabilities.push({user_id:p.user_id, organization_id:org.id, active:true});
        else db.pendingCoaches.push({id:nextId('coach-invite'), email, name,
          organization_id:org.id, claimed_by:null, revoked_at:null});
        result = {organization_id:org.id, seat_limit:seats, state:p ? 'enabled_existing' : 'pending_verified_account',
          student_link_preserved:p?.role === 'student'};
      } else if (operation === 'seats') {
        admin(userId);
        const org = db.organizations.find(o => o.id === args.p_org && o.is_test &&
          (db.capabilities.some(c => c.organization_id === o.id) || db.pendingCoaches.some(c => c.organization_id === o.id)));
        if (!org) reject('DENIED', 'Coach piloto candidato no encontrado.');
        const seats = seatLimit(args.p_seats), {used} = occupancy(db.profiles, db.invitations, org.id);
        if (seats < used) reject('SEATS_OCCUPIED', 'El cupo es menor que los alumnos e invitaciones vigentes.');
        org.seat_limit = seats;
        result = {organization_id:org.id, seat_limit:seats};
      } else {
        const org = own(userId, args.p_org);
        const {email, name} = accountInput(args.p_email, args.p_name);
        syntheticEmail(email);
        if (db.profiles.some(p => p.email.toLowerCase() === email) ||
            db.invitations.some(i => i.email === email && !i.revoked_at) ||
            db.pendingCoaches.some(i => i.email === email && !i.revoked_at))
          reject('ALREADY_ENROLLED', 'La cuenta ya existe o está invitada.');
        if (occupancy(db.profiles, db.invitations, org.id).used >= org.seat_limit)
          reject('SEAT_LIMIT_REACHED', 'Se completaron los cupos.');
        const invitation = {id:nextId('student-invite'), email, nickname:name, role:'student',
          organization_id:org.id, invited_by:userId, claimed_by:null, revoked_at:null};
        db.invitations.push(invitation);
        result = {organization_id:org.id, invitation_id:invitation.id};
      }
      db.receipts.push({actor_id:userId, request_id:requestId, operation, payload:clone(args), result:clone(result)});
      db.audit.push({actor_id:userId, operation, organization_id:result.organization_id});
      return {data:clone(result)};
    } catch (error) {
      db = before;
      error.outcome = 'not_applied';
      throw error;
    }
  }
  function canReadStudent(userId, studentId) {
    try { actor(userId); } catch { return false; }
    if (userId === studentId) return true;
    const student = db.profiles.find(p => p.user_id === studentId && p.active && p.role === 'student');
    const org = db.organizations.find(o => o.id === student?.organization_id &&
      o.coach_id === userId && ['active','trial'].includes(o.status));
    if (!org) return false;
    const p = db.profiles.find(p => p.user_id === userId);
    const coach = p.role === 'coach' || db.capabilities.some(c =>
      c.user_id === userId && c.organization_id === org.id && c.active&&
      c.terms_version==='synthetic-terms-v1'&&c.privacy_version==='synthetic-privacy-v1');
    return coach && db.consents.some(c => c.student_id === studentId && c.organization_id === org.id && c.accepted);
  }
  return {call, canReadStudent, inspect:() => clone(db), count,
    // Test-only fixtures. No endpoint is offered for these mutations.
    arrange:fn => {const draft=clone(db); fn(draft); db=draft;}};
}
