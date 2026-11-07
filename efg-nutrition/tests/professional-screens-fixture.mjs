// All rows and assertions are fictional. This fixture is not a SQL/RLS emulator.
import {SYNTHETIC_SCREEN_TRANSPORT,createProfessionalMutationGuard} from '../pilot/professional-screens-candidate.mjs?v=ncc-professional-reconciliation-r1-20261107';
export const IDS=Object.freeze({
  dual:'11111111-1111-4111-8111-111111111111', mentor:'22222222-2222-4222-8222-222222222222',
  pupil:'33333333-3333-4333-8333-333333333333', second:'44444444-4444-4444-8444-444444444444',
  outsider:'55555555-5555-4555-8555-555555555555', personal:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  professional:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', foreign:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  recipe:'dddddddd-dddd-4ddd-8ddd-dddddddddddd', message:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'});
const copy=value=>structuredClone(value);
const denied=message=>{throw Object.assign(new Error(message),{code:'DENIED',outcome:'not_applied'});};
export function createProfessionalFixture() {
  let sequence=0;
  const db={profile:{user_id:IDS.dual,email:'dual@example.invalid',nickname:'Profesional DEMO',role:'student',
    organization_id:IDS.personal,active:true},
    personalOrganization:{id:IDS.personal,coach_id:IDS.mentor,payment_alias:'PERSONAL.DEMO'},
    personalConsent:{student_id:IDS.dual,organization_id:IDS.personal,accepted:true},
    personalHistory:[{body:'HISTORIA FICTICIA SIN CAMBIOS'}],
    personalMessages:[{student_id:IDS.dual,coach_id:IDS.mentor,body:'MENSAJE PERSONAL FICTICIO'}],
    organization:{id:IDS.professional,coach_id:IDS.dual,payment_alias:'PROFESIONAL.DEMO',
      name:'Espacio profesional DEMO',is_test:true,status:'trial',legal_ready:true,seat_limit:2},
    capability:true, marker:true, confirmed:true, professionalTerms:true, professionalPrivacy:true,
    students:[IDS.pupil,IDS.second].map((user_id,index)=>({user_id,organization_id:IDS.professional,
      nickname:'Alumno DEMO '+(index+1),active:true,consent_accepted:true})),
    recipeSharing:true,intakeShared:true,studentLegal:true,coachLegal:true,
    recipes:[{id:IDS.recipe,student_id:IDS.pupil,organization_id:IDS.professional,name:'Receta FICTICIA',
      portions:2,ingredients:[{foodId:'rice_demo',grams:100}],totals:{k:130,p:3,c:28,f:1,fi:1}}],
    messages:[{id:IDS.message,student_id:IDS.pupil,coach_id:IDS.dual,sender_id:IDS.pupil,
      body:'Consulta FICTICIA',created_at:'2026-11-06T12:00:00.000Z',read_at:null}],
    audit:[]};
  const session={userId:IDS.dual,sessionId:'synthetic-session-one',epoch:1};
  let selected=true,navigationEpoch=1;
  const count={};
  function own(scope) {
    if(scope.userId!==session.userId || scope.sessionId!==session.sessionId || scope.sessionEpoch!==session.epoch ||
        !db.profile.active || !['student','coach'].includes(db.profile.role) || !db.confirmed ||
        scope.userId!==db.profile.user_id || scope.organizationId!==db.organization.id ||
        db.organization.coach_id!==scope.userId || !db.organization.is_test ||
        !['trial','active'].includes(db.organization.status) || !db.capability || !db.marker ||
        !db.professionalTerms || !db.professionalPrivacy || !db.organization.legal_ready)
      denied('El servicio ficticio negó el contexto profesional.');
  }
  function pupil(id) {
    const row=db.students.find(item=>item.user_id===id&&item.organization_id===db.organization.id&&item.active&&item.consent_accepted);
    if(!row)denied('No hay seguimiento autorizado en este espacio.');return row;
  }
  async function perform(action,args,scope) {
    count[action]=(count[action]||0)+1;own(scope);
    if(action==='workspace')return {data:{organization:copy(db.organization),students:copy(db.students)}};
    if(action==='setAlias') {
      if(typeof args.p_alias!=='string'||args.p_alias.trim()!==args.p_alias||Array.from(args.p_alias).length<3||Array.from(args.p_alias).length>100)
        denied('Alias ficticio inválido.');
      db.organization.payment_alias=args.p_alias;db.audit.push({action,organizationId:scope.organizationId});
      return {data:true}; // Exact existing RPC return type.
    }
    const studentId=args.p_student||args.student_id;pupil(studentId);
    if(action==='recipes')return {data:db.recipeSharing&&db.intakeShared&&db.studentLegal&&db.coachLegal?
      copy(db.recipes.filter(row=>row.student_id===studentId&&row.organization_id===scope.organizationId)):[]};
    if(args.coach_id!==scope.userId)denied('Pareja ficticia incorrecta.');
    if(action==='messages')return {data:copy(db.messages.filter(row=>row.student_id===studentId&&row.coach_id===scope.userId))};
    if(action==='messageReceipt')return {data:copy(db.messages.find(row=>row.id===args.id&&row.student_id===studentId&&row.coach_id===scope.userId)||null)};
    if(action==='sendMessage') {
      if(args.sender_id!==scope.userId||typeof args.body!=='string'||!args.body.trim()||Array.from(args.body).length>2000)
        denied('Remitente o mensaje ficticio inválido.');
      if(args.id&&db.messages.some(row=>row.id===args.id))throw Object.assign(new Error('Duplicate synthetic message ID'),{code:'23505',outcome:'not_applied'});
      const row={...copy(args),id:args.id||'ffffffff-ffff-4fff-8fff-'+String(++sequence).padStart(12,'0'),
        created_at:'2026-11-06T12:01:00.000Z',read_at:null};
      db.messages.push(row);db.audit.push({action,studentId,organizationId:scope.organizationId});return {data:copy(row)};
    }
    if(action==='markRead') {
      const rows=db.messages.filter(row=>args.ids.includes(row.id)&&row.student_id===studentId&&
        row.coach_id===scope.userId&&row.sender_id===studentId&&row.read_at===null);
      for(const row of rows)row.read_at='2026-11-06T12:02:00.000Z';
      return {data:rows.map(({id,read_at})=>({id,read_at}))};
    }
    denied('Acción ficticia desconocida.');
  }
  function readWorkspace() {
    return {navigationEpoch,view:{selected:selected?'coach:'+db.organization.id:'student',
      originalProfile:copy(db.profile),originalOrganization:copy(db.personalOrganization),
      professional:selected?copy(db.organization):null,
      professionalState:selected?'candidate_roster':'personal'}};
  }
  return {db,session,count,readWorkspace,mutationGuard:createProfessionalMutationGuard(),readSession:()=>copy(session),
    transport:Object.freeze({kind:SYNTHETIC_SCREEN_TRANSPORT,perform}),
    navigate(professional){selected=professional;navigationEpoch++;},
    personalSnapshot:()=>copy({profile:db.profile,organization:db.personalOrganization,consent:db.personalConsent,
      history:db.personalHistory,messages:db.personalMessages})};
}
