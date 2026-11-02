// Real pilot functions, synthetic Node adapter. Does not certify SDK/browser/RLS.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const directory=mkdtempSync(join(tmpdir(),'ncc-auth-hydration-'));let moduleIndex=0;
import {createAuthHydrationGate} from '../pilot/auth-hydration-gate.js';
import {sameRecipeIngredients} from '../pilot/recipe-ingredients-equal.js';
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const boot=app.slice(app.indexOf('(async function init(){'));
assert.equal(boot.split('sb.auth.onAuthStateChange(handleAuthStateChange);').length,2,'Exactly one real startup subscription');
assert.ok(boot.indexOf('sb.auth.onAuthStateChange(handleAuthStateChange);')<boot.indexOf('await sb.auth.getSession()'),'Subscribe before initial Auth await');
assert.ok(boot.indexOf('sb.auth.onAuthStateChange(handleAuthStateChange);')<boot.indexOf('await refresh()'),'Subscribe before initial hydration');

const fn=name=>{const a=app.indexOf('function '+name+'(');assert.ok(a>=0);const b=app.indexOf('\n}',a)+2;assert.ok(b>a);return app.slice(app.slice(Math.max(0,a-6),a)==='async '?a-6:a,b);};
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function until(test){for(let i=0;i<100;i++){if(test())return;await Promise.resolve();}assert.fail('Expected synthetic wait point not reached');}
async function fixture(){
 const held=defer(),tasks=[],jobs=[],renders=[];let actor='A',reads=0,heldStarted=false,getUsers=0;
 const state={loading:false,session:{user:{id:'A'}},profile:{user_id:'A',role:'student',active:true},authContextEpoch:0,tab:'home'};
 const sb={auth:{getUser:async()=>{getUsers++;return {data:{user:{id:actor}},error:null};},getSession:async()=>({data:{session:{user:{id:actor}}},error:null})},rpc:async()=>({data:true,error:null}),from(table){let owner;
  return {select(){return this;},eq(k,v){owner=v;return this;},single:async()=>({data:{user_id:owner,role:'student',active:true},error:null}),order(){
   assert.equal(table,'efg_personal_recipes');reads++;
   if(owner==='A'&&!heldStarted){heldStarted=true;return held.promise;}
   return Promise.resolve({data:[{id:'recipe-'+owner,name:owner,ingredients:[{foodId:'banana',grams:100}],portions:1,totals:{}}],error:null});
  },insert(){throw Error('Unexpected recipe mutation');}};
 }};
 let api;const gate=createAuthHydrationGate({readIdentity:()=>state.session?.user?.id||null,invalidate:epoch=>{api.resetPrivateSession();state.authContextEpoch=epoch;},schedule:f=>tasks.push(f),refresh:()=>jobs.push(api.refresh())});
 const noop=async()=>{};
 const env={state,sb,authHydration:gate,sameRecipeIngredients,
  setCoachSessionIdentity:(session,user)=>{state.session={user,session_id:'TEST_ONLY'};},
  loginView:()=>{},unauthorized:()=>{throw Error('Unexpected unauthorized');},sessionConnectionRetry:()=>{},
  MAJOR_RELEASE_FLOW_ENABLED:false,RELEASE_COMMUNICATIONS_ENABLED:false,SCIENCE_WELCOME_ENABLED:false,COACH_VERSIONED_INTAKE_ENABLED:false,COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED:false,COACH_STUDENT_JOURNEY_ENABLED:false,COACH_RELAUNCH_ONBOARDING_ENABLED:false,
  loadPersonalData:noop,loadOrgAndPayments:noop,loadCloudHabituales:noop,loadMyWeeklyReports:noop,loadRoleData:noop,coachIntakeFlow:{loadStudent:noop},refreshFoodCompatibilityEvidence:noop,loadSundayPermission:noop,inbox:{refresh:noop},sessionStorage:{removeItem(){}},loadWelcomeStatus:noop,
  render:async()=>renders.push(state.session?.user?.id||null),fail:e=>{throw e;},root:{innerHTML:''},escapeHTML:x=>x,
  pilotGuideLifecycle:{invalidate(){}},coachAdaptedWorkspace:{close(){}},localStorage:{getItem:()=>null},recipeStoreKey:()=> 'TEST_ONLY:'+state.session?.user?.id};
 const code='let cloudRecipes=[],cloudHabituales=[],myWeeklyReports=[],coachRosterConsent={},userHasUnconfirmedEdits=false,lastRenderedViewKey=null;'+['loadCloudRecipes','resetPrivateSession','handleAuthStateChange','refresh'].map(fn).join('\n')+';return {refresh,resetPrivateSession,handleAuthStateChange,recipes:()=>cloudRecipes};';
 const modulePath=join(directory,'case-'+(++moduleIndex)+'.mjs');
 writeFileSync(modulePath,'export function create(env){const {'+Object.keys(env).join(',')+'}=env;'+code+'}');
 api=(await import(pathToFileURL(modulePath).href)).create(env);
 return {state,api,gate,renders,tasks,jobs,stats:()=>({reads,getUsers}),actor:id=>{actor=id;},started:()=>heldStarted,release:()=>held.resolve({data:[{id:'old-A',name:'A'}],error:null}),event:(id,event='SIGNED_IN')=>api.handleAuthStateChange(event,id?{user:{id}}:null),flush:async()=>{while(tasks.length)tasks.shift()();await Promise.all(jobs);}};
}
try{for(const scenario of ['A-B','A-logout','A-B-C','repeated-B','same-token']){
 const f=await fixture(),first=f.api.refresh();await until(f.started);
 if(scenario==='same-token'){const epoch=f.gate.epoch();f.event('A','TOKEN_REFRESHED');assert.equal(f.gate.epoch(),epoch);}
 else if(scenario==='A-logout'){f.actor(null);f.event(null,'SIGNED_OUT');assert.equal(f.state.session,null);}
 else {f.actor('B');f.event('B');assert.equal(f.state.session,null);assert.deepEqual(f.api.recipes(),[]);
  if(scenario==='A-B-C'){f.actor('C');f.event('C');}
  if(scenario==='repeated-B')for(let i=0;i<10;i++)f.event('B');
 }
 f.release();await first;await f.flush();
 if(scenario==='A-logout'){assert.equal(f.state.session,null);assert.deepEqual(f.renders,[]);assert.equal(f.stats().getUsers,1);}
 else {const expected=scenario==='same-token'?'A':scenario==='A-B-C'?'C':'B';assert.equal(f.state.session?.user?.id,expected);assert.deepEqual(f.renders,[expected]);assert.equal(f.stats().getUsers,scenario==='same-token'?1:2);if(expected!=='A')assert.equal(f.api.recipes()[0].name,expected);}
 assert.equal(f.state.loading,false);
 console.log('PASS actual pilot hydration functions: '+scenario);
}

}finally{rmSync(directory,{recursive:true,force:true});}
