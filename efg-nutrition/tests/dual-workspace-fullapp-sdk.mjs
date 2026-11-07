// Browser fixture ONLY. Served from loopback by dual-workspace-fullapp-server.mjs.
// This is not Supabase, does not validate JWTs/RLS, and never performs I/O.
import {createSyntheticService} from './dual-workspace-fixture.mjs';
import {API} from '../pilot/dual-workspace-candidate.mjs';
const service=createSyntheticService(),calls=[];
let app=null,actor=null,subscription=null,pendingDelay=null;
const sessionId='00000000-0000-4000-8000-000000000001';
const known=new Set(Object.values(API));
const syntheticError=message=>({data:null,error:{message,code:'SYNTHETIC_TRANSPORT_ONLY'}});
function query(table){
 calls.push({actor,table,operation:'read'});
 const filters=[],q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},
  in(){return q;},not(){return q;},order(){return q;},limit(){return q;},gte(){return q;},lte(){return q;},
  insert(){return Promise.resolve(syntheticError('Legacy writes blocked by fixture'));},
  update(){return Promise.resolve(syntheticError('Legacy writes blocked by fixture'));},
  upsert(){return Promise.resolve(syntheticError('Legacy writes blocked by fixture'));},
  delete(){return Promise.resolve(syntheticError('Legacy writes blocked by fixture'));},
  maybeSingle:async()=>({data:rows()[0]||null,error:null}),single:async()=>({data:rows()[0]||null,error:null}),
  then(resolve){resolve({data:rows(),error:null});}};
 const rows=()=>{
  const db=service.inspect();let data=[];
  if(table==='efg_profiles')data=db.profiles.filter(p=>p.user_id===actor);
  if(table==='efg_organizations')data=db.organizations.filter(o=>o.id===app?.state?.profile?.organization_id);
  return data.filter(row=>filters.every(([k,v])=>row[k]===v));
 };return q;
}
export function createClient(url){
 if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)||new URL(url).origin!==location.origin)
  throw Error('Synthetic SDK is restricted to the fixture origin');
 return {auth:{getSession:async()=>({data:{session:actor?{user:{id:actor,email:actor+'@example.invalid'},access_token:'synthetic.'+btoa(JSON.stringify({sub:actor,session_id:sessionId,exp:Math.floor(Date.now()/1000)+300}))+'.not-signed'}:null},error:null}),
  getUser:async()=>({data:{user:actor?{id:actor,email:actor+'@example.invalid'}:null},error:null}),
  onAuthStateChange(callback){subscription=callback;return {data:{subscription:{unsubscribe(){subscription=null;}}}};},
  async signOut(){actor=null;subscription?.('SIGNED_OUT',null);return {error:null};}},
  from:table=>query(table),
  rpc:async(name,args)=>{
   calls.push({actor,name,args:structuredClone(args)});
   if(name==='efg_claim_invitation'&&!service.inspect().profiles.some(p=>p.user_id===actor))return {data:null,error:{code:'42501',message:'Synthetic legacy invitation absent'}};
   if(!known.has(name))return {data:null,error:null}; // No hosted fallback of any kind.
   const identity=actor;let result;
   try{result=await service.call(identity,name,args);}catch(error){
    if(error.code==='NO_INVITATION')return {data:null,error:{code:'42501',message:'No matching coach invitation'}};
    throw error;
   }
   if(pendingDelay?.name===name){const delay=pendingDelay;pendingDelay=null;await delay.promise;}
   return result;
  }};
}
export function bindApp(hooks){app=hooks;}
export const fixture=Object.freeze({
 async prepareNewCoach(id='new-coach',invited=true){
  if(!/^[a-z-]+$/.test(id))throw Error('Synthetic identity only');
  service.arrange(db=>{if(!db.accounts.some(a=>a.user_id===id))db.accounts.push({user_id:id,email:id+'@example.invalid',confirmed:true});});
  if(invited)return (await service.call('admin',API.create,{p_email:id+'@example.invalid',p_name:'Nuevo Coach DEMO',p_seats:3,p_request_id:'prepare-'+id})).data.organization_id;
 },
 async loginViaBootstrap(id){
  if(!service.inspect().accounts.some(a=>a.user_id===id))throw Error('Unknown synthetic account');
  app.handleAuthStateChange('SIGNED_OUT',null);app.resetPrivateSession();actor=id;
  await app.refresh();await app.frame.ready();
 },
 async loginAs(id){
  if(!app)throw Error('Full pilot.js has not booted');
  const db=service.inspect(),profile=db.profiles.find(p=>p.user_id===id);
  if(!profile)throw Error('Unknown synthetic identity');
  const epoch=(app.state.authContextEpoch||0)+1;
  app.resetPrivateSession();actor=id;
  const s=app.state,day=app.today();
  s.authContextEpoch=epoch;s.session={user:{id,email:profile.email},session_id:sessionId};
  s.profile=structuredClone(profile);s.org=structuredClone(db.organizations.find(o=>o.id===profile.organization_id)||db.organizations.find(o=>o.coach_id===id)||null);
  s.orgs=structuredClone(db.organizations);s.tab=profile.role==='admin'?'admin':profile.role==='coach'?'coach':'home';
  s.welcomePending=false;s.scienceWelcomePending=false;s.renderedDay=day;
  s.coachPilotEntry=profile.role==='student'?{route:'ready',canLogMeals:true}:null;
  s.planAccessSupported=true;s.planAccess={status:'published'};
  s.diary={student_id:id,log_day:day,meals:Object.fromEntries(['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'].map(x=>[x,[]])),sports:[],skipped:{},totals:{}};
  s.goals=[{start_on:day,kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28}];
  s.personalTargets={kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};s.consent={accepted:true};
  s.weights=[];s.activities=[];s.progressLogs=[];s.payments=[];s.roster=[];s.invitations=[];s.testInvitations=[];
  await app.render();await app.frame.ready();
 },
 inspect:()=>service.inspect(),calls:()=>structuredClone(calls),
 delayNext(name){let release;const promise=new Promise(resolve=>{release=resolve;});pendingDelay={name,promise};return release;},
 async ensureDual(){
  const existing=service.inspect().capabilities.find(c=>c.user_id==='learner');
  if(existing)return existing.organization_id;
  return (await service.call('admin',API.create,{p_email:'learner@example.invalid',p_name:'Coach DEMO',p_seats:3,p_request_id:'fullapp-create'})).data.organization_id;
 },
 addSyntheticRoster(org){service.arrange(db=>{db.profiles.push({user_id:'own-pupil',nickname:'Alumno DEMO',email:'own-pupil@example.invalid',role:'student',organization_id:org,active:true,confirmed:true});db.consents.push({student_id:'own-pupil',organization_id:org,accepted:false});});}
});
