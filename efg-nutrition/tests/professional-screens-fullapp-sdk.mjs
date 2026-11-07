// Test-only Supabase-shaped in-memory SDK. No JWT, RLS or HTTP parity claim.
// Imported only by the full-app loopback response adapter, never production.
import {createProfessionalFixture,IDS} from './professional-screens-fixture.mjs';
import {API} from '../pilot/dual-workspace-candidate.mjs';
const data=createProfessionalFixture(),initialPersonal=data.personalSnapshot(),calls=[];
let app=null,actor=null,subscription=null;
const clone=x=>structuredClone(x);
const error=message=>({data:null,error:{code:'SYNTHETIC_TRANSPORT_ONLY',message}});
const scope=()=>({userId:actor,sessionId:data.session.sessionId,sessionEpoch:data.session.epoch,organizationId:IDS.professional,navigationEpoch:1});
const signedUser=()=>actor?{id:actor,email:'dual@example.invalid'}:null;
function contexts(){const db=data.db,{payment_alias,...organization}=db.organization;return {user_id:actor,profile_role:db.profile.role,active:db.profile.active,
 student_context:{organization_id:IDS.personal,coach_id:IDS.mentor,consent_accepted:true},
 coach_contexts:db.capability&&db.marker?[{...organization,active_students:2,pending_invitations:0,
  legal_ready:db.organization.legal_ready&&db.professionalTerms&&db.professionalPrivacy}]:[]};}
function query(table){
 const filters=[],orders=[];let selected='*',action='read',payload=null,single=false,limit=null,promise=null;
 const q={select(columns){selected=columns;return q;},eq(k,v){filters.push([k,v,'eq']);return q;},
  is(k,v){filters.push([k,v,'eq']);return q;},in(k,v){filters.push([k,v,'in']);return q;},
  not(){return q;},gte(){return q;},lte(){return q;},order(k,o){orders.push([k,o?.ascending!==false]);return q;},limit(n){limit=n;return q;},
  insert(v){action='insert';payload=v;return q;},update(v){action='update';payload=v;return q;},
  upsert(){return Promise.resolve(error('Legacy writes blocked by fixture'));},delete(){return Promise.resolve(error('Legacy writes blocked by fixture'));},
  single(){single=true;return q;},maybeSingle(){single=true;return q;},then(resolve,reject){promise||=execute();return promise.then(resolve,reject);}};
 async function execute(){
  calls.push({table,action,filters:clone(filters),selected,payload:clone(payload)});let rows=[];
  if(!actor)return {data:single?null:[],error:null};
  if(table==='efg_profiles')rows=[clone(data.db.profile)];
  else if(table==='efg_organizations'){
   rows=[clone(data.db.personalOrganization)];if(data.db.capability&&data.db.marker)rows.push(clone(data.db.organization));
  }else if(table==='efg_messages'){
   const student=filters.find(([k])=>k==='student_id')?.[1]||payload?.student_id;
   const coach=filters.find(([k])=>k==='coach_id')?.[1]||payload?.coach_id;
   if(student===IDS.dual&&coach===IDS.mentor&&action==='read')return {data:[],error:null};
   if(![IDS.pupil,IDS.second].includes(student)||coach!==actor)return error('Explicit professional pair required');
   if(action==='insert')rows=[(await data.transport.perform('sendMessage',payload,scope())).data];
   else if(action==='update'){
    if(Object.keys(payload||{}).join(',')!=='read_at')return error('Only read_at update allowed');
    const ids=filters.find(([k,,op])=>k==='id'&&op==='in')?.[1];
    const receipts=(await data.transport.perform('markRead',{student_id:student,coach_id:coach,ids},scope())).data;
    rows=clone(data.db.messages.filter(m=>receipts.some(r=>r.id===m.id)));
   }else rows=(await data.transport.perform('messages',{student_id:student,coach_id:coach},scope())).data;
  }
  if(action==='read')rows=rows.filter(row=>filters.every(([k,v,op])=>op==='in'?v.includes(row[k]):row[k]===v));
  for(const [k,ascending] of [...orders].reverse())rows.sort((a,b)=>String(a[k]).localeCompare(String(b[k]))*(ascending?1:-1));
  if(limit!==null)rows=rows.slice(0,limit);
  if(selected!=='*')rows=rows.map(row=>Object.fromEntries(selected.split(',').filter(k=>k in row).map(k=>[k,row[k]])));
  return {data:single?rows[0]||null:rows,error:null};
 }
 return q;
}
export function createClient(url){
 if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)||new URL(url).origin!==location.origin)throw Error('Loopback fixture only');
 return {supabaseUrl:new URL(url).href,auth:{
  getUser:async()=>({data:{user:signedUser()},error:null}),
  getSession:async()=>({data:{session:actor?{user:signedUser(),access_token:'synthetic.'+btoa(JSON.stringify({sub:actor,session_id:data.session.sessionId,exp:Math.floor(Date.now()/1000)+300}))+'.not-signed'}:null},error:null}),
  onAuthStateChange(callback){subscription=callback;return {data:{subscription:{unsubscribe(){subscription=null;}}}};},
  async signOut(){actor=null;subscription?.('SIGNED_OUT',null);return {error:null};}
 },from:query,rpc:async(name,args)=>{
  calls.push({name,args:clone(args)});if(!actor)return error('Fictional login required');
  if(name===API.contexts)return {data:contexts()};
  if(name===API.roster){if(args.p_org!==IDS.professional)return error('Wrong workspace');return {data:(await data.transport.perform('workspace',{},scope())).data.students};}
  if(name==='efg_set_coach_alias')return data.transport.perform('setAlias',args,scope());
  if(name==='efg_coach_shared_student_recipes')return data.transport.perform('recipes',args,scope());
  if(Object.values(API).includes(name))return error('This fixture does not implement workspace mutations');
  return {data:null,error:null};
 }};
}
export const fixture={
 async loginAs(){
  if(!app)throw Error('Full app has not booted');app.resetPrivateSession();actor=IDS.dual;data.session.epoch=(app.state.authContextEpoch||0)+1;
  const s=app.state,day=app.today();s.authContextEpoch=data.session.epoch;s.session={user:signedUser(),session_id:data.session.sessionId};
  s.profile=clone(data.db.profile);s.org=clone(data.db.personalOrganization);s.orgs=[clone(data.db.personalOrganization),clone(data.db.organization)];
  s.tab='home';s.welcomePending=false;s.scienceWelcomePending=false;s.renderedDay=day;s.coachPilotEntry={route:'ready',canLogMeals:true};
  s.planAccessSupported=true;s.planAccess={status:'published'};s.diary={student_id:IDS.dual,log_day:day,meals:Object.fromEntries(['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'].map(x=>[x,[]])),sports:[],skipped:{},totals:{}};
  s.goals=[{start_on:day,kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28}];s.personalTargets={kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};s.consent={accepted:true};
  s.weights=[];s.activities=[];s.progressLogs=[];s.payments=[];s.roster=[];s.invitations=[];s.testInvitations=[];
  await app.render();await app.frame.ready();
 },
 inspect:()=>clone(data.db),calls:()=>clone(calls),
 preserved:()=>JSON.stringify(data.personalSnapshot())===JSON.stringify(initialPersonal)&&app?.state?.profile?.role==='student'&&app?.state?.profile?.organization_id===IDS.personal&&app?.state?.org?.id===IDS.personal,
 revoke(){data.db.capability=false;},
 async logout(){app.resetPrivateSession();actor=null;app.state.profile=null;app.state.session=null;await app.render();}
};
export function bindApp(hooks){
 app=hooks;const bar=document.createElement('section'),notice=document.createElement('p');bar.id='ncc-professional-fixture-controls';
 bar.style.cssText='padding:16px;background:#fff1c4;color:#17352e;position:relative;z-index:2';
 const title=document.createElement('strong');title.textContent='Ensayo de app completa · datos ficticios · sin backend real';bar.append(title);
 const add=(label,fn)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='margin:8px;padding:10px';button.addEventListener('click',async()=>{try{await fn();}catch(e){notice.textContent=e.message;}});bar.append(button);};
 add('Iniciar alumna dual ficticia',async()=>{await fixture.loginAs();notice.textContent='Sesión ficticia iniciada. Abrí Mis alumnos en el selector.';});
 add('Comprobar vínculo personal',()=>{notice.textContent=fixture.preserved()?'Rol student, organización, consentimiento e historial personales intactos.':'ERROR: cambió el contexto personal.';});
 add('Revocar capacidad ficticia',()=>{fixture.revoke();notice.textContent='Capacidad revocada en fixture. La próxima operación debe negar acceso.';});
 add('Cerrar sesión ficticia',async()=>{await fixture.logout();notice.textContent='Sesión ficticia cerrada.';});
 notice.setAttribute('role','status');bar.append(notice);document.body.prepend(bar);
}
