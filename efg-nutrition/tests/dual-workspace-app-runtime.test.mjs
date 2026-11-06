// Execute the actual application's refresh/render functions with synthetic deps.
// This is a Node contract/runtime test, not browser validation or backend parity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {API} from '../pilot/dual-workspace-candidate.mjs';
import {createDualWorkspaceBootstrap} from '../pilot/dual-workspace-bootstrap.mjs';
import {createSyntheticService} from './dual-workspace-fixture.mjs';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
function section(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function compile(code,name,deps){return new Function(...Object.keys(deps),code+';return '+name+';')(...Object.values(deps));}
async function harness({enabled=true,invited=true}={}){
 const service=createSyntheticService(),state={loading:false,session:null,profile:null,authContextEpoch:1},calls=[],frames=[],errors=[];
 const user={id:'new-coach',email:'new-coach@example.invalid'};
 service.arrange(db=>db.accounts.push({user_id:user.id,email:user.email,confirmed:true}));
 if(invited)await service.call('admin',API.create,{p_email:user.email,p_name:'Nuevo DEMO',p_seats:3,p_request_id:'setup'});
 const rpc=async(name,args)=>{
  calls.push(name);
  if(name==='efg_claim_invitation')return {data:null,error:{message:'Synthetic legacy invitation absent'}};
  try{return await service.call(user.id,name,args);}catch(error){if(error.code==='NO_INVITATION')return {error:{code:'42501',message:'No matching coach invitation'}};throw error;}
 };
 const sb={auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user}}})},rpc,
  from(){throw Error('Unexpected legacy table read');}};
 const bootstrap=createDualWorkspaceBootstrap({enabled,syntheticEnvironment:()=>true,
  readSession:()=>({userId:state.session?.user?.id,sessionId:'synthetic',epoch:state.authContextEpoch}),rpc,
  readProfile:async()=>({data:service.inspect().profiles.find(p=>p.user_id===user.id)||null}),requestId:()=>crypto.randomUUID()});
 const render=compile(section('async function render(){','function updateFoodHint(){'),'render',{
  state,weeklyPdfReview:{close(){}},closePeriodPdfView(){},pilotGuideLifecycle:{invalidate(){}},coachAdaptedWorkspace:{close(){}},
  loginView(){throw Error('Unexpected login route');},frame:html=>frames.push(html)});
 const gate={begin:()=>({}),read:async(_ticket,p)=>p,verified(){},current:()=>true,finish(){}};
 const refresh=compile(section('async function refresh(){','// Explicit pull-to-refresh:'),'refresh',{
  state,sb,authHydration:gate,dualWorkspaceBootstrap:bootstrap,
  setCoachSessionIdentity(_session,identity){state.session={user:identity,session_id:'synthetic'};},render,
  unauthorized:()=>calls.push('unauthorized'),fail:error=>errors.push(error),root:{innerHTML:''},escapeHTML:String,
  resetPrivateSession:()=>assert.fail('Unexpected stale reset'),loginView:()=>calls.push('login')});
 return {state,service,calls,frames,errors,refresh,render};
}
test('actual refresh reaches restricted real render before any legacy claim/table/private load',async()=>{
 const h=await harness();await h.refresh();assert.deepEqual(h.errors,[]);
 assert.equal(h.state.profile.role,'coach');assert.equal(h.state.dualCandidateCoach,true);
 assert.equal(h.calls.filter(x=>x===API.claim).length,1);assert.ok(!h.calls.includes('efg_claim_invitation'));
 assert.equal(h.frames.length,1);assert.match(h.frames[0],/Cuenta de coach candidata/);
 // Actual pull-to-refresh function must use the bootstrap path again, no legacy loaders.
 const pull=compile(section('async function refreshVisibleWorkspace(){','async function saveWeight(){'),'refreshVisibleWorkspace',{state:h.state,refresh:h.refresh});
 await pull();assert.deepEqual(h.errors,[]);assert.equal(h.calls.filter(x=>x===API.claim).length,1);
 const timer=compile(section('async function updateAtDayChange(){','root.addEventListener("click"'),'updateAtDayChange',{state:h.state});
 await timer();
});
test('actual refresh handles absent candidate invitation through unchanged legacy denial path',async()=>{
 const h=await harness({invited:false});await h.refresh();assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.calls,[API.claim,'efg_claim_invitation','unauthorized']);assert.equal(h.state.profile,null);assert.equal(h.frames.length,0);
});
test('actual refresh with flag OFF never reads or claims candidate invitation',async()=>{
 const h=await harness({enabled:false});await h.refresh();assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.calls,['efg_claim_invitation','unauthorized']);assert.equal(h.state.profile,null);
 assert.equal(h.service.inspect().pendingCoaches[0].claimed_by,null);
});

test('actual refresh after candidate revocation cannot call legacy claim or render clinical content',async()=>{
 const h=await harness();await h.refresh();const frames=h.frames.length;
 h.service.arrange(db=>{db.capabilities[0].active=false;});
 await h.refresh();assert.equal(h.errors.at(-1)?.code,'BOOTSTRAP_CONTEXT_UNAVAILABLE');
 assert.ok(!h.calls.includes('efg_claim_invitation'));assert.equal(h.frames.length,frames);
 assert.equal(h.state.dualCandidateCoach,true,'Restrictive shell marker cannot be lost after failed revalidation');
});
