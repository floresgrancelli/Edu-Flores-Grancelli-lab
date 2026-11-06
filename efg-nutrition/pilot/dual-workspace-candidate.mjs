// Candidate only. NOT imported by pilot.js; never enables existing permissions.
export const DUAL_WORKSPACE_RELEASE_ENABLED = false;
export const API = Object.freeze({
  contexts: 'ncc_dual_workspace_contexts_v1',
  create: 'ncc_pilot_workspace_create_v1',
  seats: 'ncc_pilot_workspace_set_seats_v1',
  invite: 'ncc_pilot_workspace_invite_student_v1',
  claim: 'ncc_pilot_workspace_claim_v1',
  acceptTerms: 'ncc_pilot_workspace_accept_terms_v1',
  roster: 'ncc_pilot_workspace_roster_v1',
  receipt: 'ncc_pilot_workspace_receipt_v1'
});

export function fail(code, message) {
  throw Object.assign(new Error(message), {code});
}
export function seatLimit(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      typeof value === 'string' && !/^\d+$/.test(value.trim()))
    fail('INVALID_SEATS', 'Elegí una cantidad entera de cupos.');
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000)
    fail('INVALID_SEATS', 'Los cupos deben estar entre 1 y 10.000.');
  return count;
}
export function accountInput(email, name) {
  if (typeof email !== 'string' || typeof name !== 'string')
    fail('INVALID_ACCOUNT', 'Completá el nombre y el correo.');
  email = email.trim().toLowerCase();
  name = name.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      name.length < 2 || name.length > 70 || /[\u0000-\u001f\u007f]/.test(name))
    fail('INVALID_ACCOUNT', 'Revisá el nombre y el correo.');
  return {email, name};
}
export function occupancy(profiles, invitations, organizationId) {
  const active = profiles.filter(p => p.organization_id === organizationId &&
    p.role === 'student' && p.active === true).length;
  const pending = invitations.filter(i => i.organization_id === organizationId &&
    i.role === 'student' && !i.claimed_by && !i.revoked_at).length;
  return {active, pending, used: active + pending};
}
const clone = value => structuredClone(value);
export const canonical = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
const sameContext = (a, b) => !!a && !!b && a.userId === b.userId &&
  a.sessionId === b.sessionId && !!a.userId && !!a.sessionId;
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
function validateContexts(raw, actor) {
  if (!raw || raw.user_id !== actor.userId || raw.active !== true ||
      !['admin', 'coach', 'student'].includes(raw.profile_role) ||
      !Array.isArray(raw.coach_contexts)) fail('INVALID_CONTEXT', 'No se pudo verificar tu espacio.');
  if ((raw.profile_role === 'student') !== Boolean(raw.student_context))
    fail('INVALID_CONTEXT', 'Falta verificar el vínculo original de alumno.');
  if (raw.student_context && (raw.profile_role !== 'student' ||
      !id(raw.student_context.organization_id) || !id(raw.student_context.coach_id)))
    fail('INVALID_CONTEXT', 'El vínculo de alumno no coincide.');
  const seen = new Set();
  for (const org of raw.coach_contexts) {
    if (!id(org.id) || org.coach_id !== actor.userId || org.is_test !== true ||
        !['trial', 'active'].includes(org.status) || seen.has(org.id))
      fail('INVALID_CONTEXT', 'El espacio de coach no coincide con tu cuenta.');
    seatLimit(org.seat_limit);
    if (![org.active_students, org.pending_invitations].every(n => Number.isSafeInteger(n) && n >= 0) ||
        org.active_students + org.pending_invitations > org.seat_limit)
      fail('INVALID_CONTEXT', 'No se pudieron verificar los cupos.');
    seen.add(org.id);
  }
  return clone(raw);
}

// readSession is authoritative only for stale-response protection, never authorization.
// Every server RPC must independently derive auth.uid() and check organization scope.
export function createDualWorkspaceClient({rpc, readSession, enabled = DUAL_WORKSPACE_RELEASE_ENABLED,
  requestId = () => crypto.randomUUID()} = {}) {
  let actor = null, epoch = 0, workspaceEpoch = 0, selected = null, contexts = null;
  let refreshVersion = 0;
  const operations = new Map();
  function sync() {
    const next = readSession?.();
    if (!sameContext(actor, next)) {
      actor = next ? {...next} : null;
      epoch++; workspaceEpoch++; contexts = null; selected = null; operations.clear(); refreshVersion++;
    }
    if (!enabled) fail('FEATURE_DISABLED', 'La función todavía no está habilitada.');
    if (!actor?.userId || !actor?.sessionId) fail('LOGIN_REQUIRED', 'Volvé a iniciar sesión.');
    return {epoch, actor: {...actor}};
  }
  function current(ticket) {
    sync();
    if (ticket.epoch !== epoch || !sameContext(ticket.actor, actor))
      fail('STALE_CONTEXT', 'La cuenta cambió. Volvé a abrir este espacio.');
  }
  async function call(name, args, ticket) {
    current(ticket);
    const result = await rpc(name, args);
    current(ticket);
    if (result?.error) throw Object.assign(new Error(result.error.message), result.error);
    return result?.data;
  }
  async function refresh() {
    const ticket = sync(), version = ++refreshVersion;
    const result = validateContexts(await call(API.contexts, {}, ticket), ticket.actor);
    if (version !== refreshVersion) fail('STALE_CONTEXT', 'Llegó una consulta anterior.');
    contexts = result;
    for (const [key, op] of operations) if (op.state === 'done') operations.delete(key);
    if (!selected || !choices().some(c => c.key === selected)) {
      workspaceEpoch++;
      selected = result.student_context ? 'student' : result.coach_contexts[0] ?
        'coach:' + result.coach_contexts[0].id : 'personal';
    }
    return snapshot();
  }
  function choices() {
    if (!contexts) return [];
    return [contexts.student_context ? {key: 'student', label: 'Mi seguimiento como alumna/o'} :
      {key: 'personal', label: 'Mi día'}, ...contexts.coach_contexts.map(o =>
      ({key: 'coach:' + o.id, label: 'Mis alumnos · ' + o.name, organizationId: o.id}))];
  }
  function snapshot() { sync(); return clone({contexts, selected, choices: choices()}); }
  function select(key) {
    sync();
    if (!choices().some(c => c.key === key)) fail('WRONG_WORKSPACE', 'Ese espacio no está disponible.');
    if(selected!==key)workspaceEpoch++;
    selected = key;
    return snapshot(); // Only changes local presentation, never account role/consent.
  }
  function requireAdmin() {
    sync();
    if (contexts?.profile_role !== 'admin') fail('ADMIN_REQUIRED', 'Solo el administrador administra coaches.');
  }
  async function mutate(kind, args) {
    const ticket = sync();
    const professionalEpoch=workspaceEpoch;
    const fingerprint = canonical(args);
    let op = operations.get(kind);
    if (op && op.fingerprint !== fingerprint && op.state !== 'done')
      fail('RESOLVE_PENDING', 'Primero verificá el resultado de la operación anterior.');
    if (op?.fingerprint === fingerprint && op.inflight) return op.inflight;
    if (op?.fingerprint === fingerprint && op.state === 'done') return clone(op.result);
    if (!op || op.fingerprint !== fingerprint) {
      op = {requestId: requestId(), fingerprint, state: 'new', args: clone(args)};
      operations.set(kind, op);
    }
    const execute = async () => {
      try {
        if (op.state === 'uncertain') {
          const receipt = await call(API.receipt, {p_request_id: op.requestId}, ticket);
          if (receipt) {
            if (receipt.operation !== kind || canonical(receipt.payload || {}) !== op.fingerprint)
              fail('INVALID_RECEIPT', 'No se pudo verificar la operación anterior.');
            if(['invite','acceptTerms'].includes(kind)&&professionalEpoch!==workspaceEpoch)
              fail('STALE_WORKSPACE','El espacio cambió durante la verificación. Volvé a abrirlo.');
            op.state = 'done'; op.result = clone(receipt.result);
            return clone(op.result);
          }
        }
        op.state = 'pending';
        const result = await call(API[kind], {...op.args, p_request_id: op.requestId}, ticket);
        if(['invite','acceptTerms'].includes(kind)&&professionalEpoch!==workspaceEpoch)
          fail('STALE_WORKSPACE','El espacio cambió. Verificá el resultado al volver.');
        if (!result || !id(result.organization_id)) fail('INVALID_RECEIPT', 'Respuesta incompleta del servidor.');
        op.state = 'done'; op.result = clone(result);
        return clone(result);
      } catch (error) {
        // A network failure is not proof of rollback. Keep the ID for receipt lookup.
        if (error.outcome === 'not_applied') operations.delete(kind);
        else op.state = 'uncertain';
        throw error;
      } finally { op.inflight = null; }
    };
    op.inflight = execute();
    return op.inflight;
  }
  function createPilot({email, name, seats}) {
    requireAdmin();
    const account = accountInput(email, name);
    return mutate('create', {p_email: account.email, p_name: account.name, p_seats: seatLimit(seats)});
  }
  function setSeats({organizationId, seats}) {
    requireAdmin();
    if (!id(organizationId)) fail('WRONG_WORKSPACE', 'Elegí un coach de prueba.');
    return mutate('seats', {p_org: organizationId, p_seats: seatLimit(seats)});
  }
  function inviteStudent({email, name}) {
    sync();
    const org = contexts?.coach_contexts.find(o => 'coach:' + o.id === selected);
    if (!org) fail('WRONG_WORKSPACE', 'Abrí Mis alumnos antes de invitar.');
    if(org.legal_ready!==true)fail('PROFESSIONAL_TERMS_REQUIRED','Revisá los términos profesionales de este espacio.');
    const account = accountInput(email, name);
    return mutate('invite', {p_org: org.id, p_email: account.email, p_name: account.name});
  }
  const claimPilot = () => mutate('claim', {});
  function acceptSyntheticTerms({termsVersion,privacyVersion,accepted}) {
    sync();
    const org=contexts?.coach_contexts.find(o=>'coach:'+o.id===selected);
    if(!org)fail('WRONG_WORKSPACE','Abrí tu espacio profesional.');
    if(accepted!==true||termsVersion!=='synthetic-terms-v1'||privacyVersion!=='synthetic-privacy-v1')
      fail('EXPLICIT_ACCEPTANCE_REQUIRED','La simulación requiere aceptación expresa de ambas versiones ficticias.');
    return mutate('acceptTerms',{p_org:org.id,p_terms_version:termsVersion,p_privacy_version:privacyVersion});
  }
  async function roster(){
    const ticket=sync(),selection=workspaceEpoch;
    const org=contexts?.coach_contexts.find(o=>'coach:'+o.id===selected);
    if(!org)fail('WRONG_WORKSPACE','Abrí tu espacio profesional.');
    if(org.legal_ready!==true)fail('PROFESSIONAL_TERMS_REQUIRED','Revisá los términos profesionales.');
    const rows=await call(API.roster,{p_org:org.id},ticket);
    if(selection!==workspaceEpoch)fail('STALE_WORKSPACE','El espacio cambió durante la consulta.');
    if(!Array.isArray(rows)||rows.some(r=>r.organization_id!==org.id||!id(r.user_id)||typeof r.nickname!=='string'||
      typeof r.active!=='boolean'||typeof r.consent_accepted!=='boolean'||Object.keys(r).some(k=>!['user_id','organization_id','nickname','active','consent_accepted'].includes(k))))
      fail('INVALID_ROSTER','La lista no coincide con el espacio autorizado.');
    return clone(rows);
  }
  return Object.freeze({refresh, snapshot, select, createPilot, setSeats, inviteStudent, claimPilot,acceptSyntheticTerms,roster});
}
