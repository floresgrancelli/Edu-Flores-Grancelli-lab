import test from 'node:test';
import assert from 'node:assert/strict';
import {API} from '../pilot/dual-workspace-candidate.mjs';
import {createDualWorkspaceBootstrap,isAbsentCoachInvitation} from '../pilot/dual-workspace-bootstrap.mjs';
import {createSyntheticService} from './dual-workspace-fixture.mjs';
let sequence=0;
async function harness({invited=true,id='new-coach'}={}){
 const service=createSyntheticService(),calls=[];let scope={userId:id,sessionId:'session',epoch:1};
 service.arrange(db=>{db.accounts.push({user_id:'new-coach',email:'new-coach@example.invalid',confirmed:true});});
 if(invited)await service.call('admin',API.create,{p_email:'new-coach@example.invalid',p_name:'Nuevo Coach DEMO',p_seats:4,p_request_id:'setup-'+(++sequence)});
 let intercept=null,profileError=null;
 const bootstrap=createDualWorkspaceBootstrap({enabled:true,syntheticEnvironment:()=>true,readSession:()=>scope,requestId:()=>`claim-${++sequence}`,
  readProfile:async uid=>({data:service.inspect().profiles.find(p=>p.user_id===uid)||null,error:profileError}),
  rpc:async(n,a)=>{
   const uid=scope?.userId;calls.push({uid,name:n,args:a});
   if(intercept)return intercept({name:n,args:a,userId:uid,service});
   try{return await service.call(uid,n,a);}catch(e){if(e.code==='NO_INVITATION')return {error:{code:'42501',message:'No matching coach invitation'}};throw e;}
  }});
 return {service,calls,bootstrap,user:{id,email:id+'@example.invalid'},scope:s=>{scope=s;},intercept:fn=>{intercept=fn;},profileError:error=>{profileError=error;}};
}
test('OFF uses absolutely no candidate dependencies, profile read or environment check',async()=>{
 const forbidden=()=>assert.fail('OFF touched a candidate dependency');
 const b=createDualWorkspaceBootstrap({syntheticEnvironment:forbidden,readSession:forbidden,readProfile:forbidden,rpc:forbidden});
 assert.deepEqual(await b.resolve(null),{mode:'legacy',skipLegacyClaim:false});b.invalidate();
});
test('ON is limited to explicit synthetic environment and verified .invalid account',async()=>{
 const forbidden=()=>assert.fail('Candidate accessed outside synthetic fixture');
 for(const [environment,email] of [[false,'new@example.invalid'],[true,'private@example.com']]){
  const b=createDualWorkspaceBootstrap({enabled:true,syntheticEnvironment:()=>environment,readSession:forbidden,readProfile:forbidden,rpc:forbidden});
  assert.equal((await b.resolve({id:'x',email})).mode,'legacy');
 }
});
test('new verified account claims once, reads server profile and opens restricted candidate shell',async()=>{
 const h=await harness();const outcome=await h.bootstrap.resolve(h.user);
 assert.equal(outcome.mode,'candidate_coach');assert.equal(outcome.skipLegacyClaim,true);
 assert.equal(outcome.profile.role,'coach');assert.equal(outcome.profile.organization_id,null);
 assert.equal(outcome.contexts.coach_contexts[0].legal_ready,false);
 assert.equal(h.calls.filter(c=>c.name===API.claim).length,1);
 assert.equal(h.calls.some(c=>c.name==='efg_claim_invitation'),false);
 const again=await h.bootstrap.resolve(h.user);assert.equal(again.mode,'candidate_coach');
 assert.equal(h.calls.filter(c=>c.name===API.claim).length,1,'Existing claimed profile is never claimed twice');
});
test('existing student and existing admin keep exact profile and never invoke candidate claim',async()=>{
 for(const id of ['learner','admin']){
  const h=await harness({id}),before=h.service.inspect();
  assert.deepEqual(await h.bootstrap.resolve(h.user),{mode:'legacy',skipLegacyClaim:false,profile:undefined});
  assert.equal(h.calls.length,0);assert.deepEqual(h.service.inspect(),before);
 }
});
test('ON synthetic coach without candidate context fails closed because legacy/revoked are indistinguishable',async()=>{
 const h=await harness({id:'mentor'});await assert.rejects(h.bootstrap.resolve(h.user),{code:'BOOTSTRAP_CONTEXT_UNAVAILABLE'});
 assert.equal(h.calls.filter(c=>c.name===API.claim).length,0);
});
test('absence falls back only for exact known SQL error, not arbitrary 42501',async()=>{
 const h=await harness({invited:false});assert.deepEqual(await h.bootstrap.resolve(h.user),{mode:'legacy',skipLegacyClaim:false});
 assert.equal(h.service.inspect().profiles.some(p=>p.user_id==='new-coach'),false);
 assert.equal(isAbsentCoachInvitation({code:'42501',message:'Verified identity required'}),false);
 assert.equal(isAbsentCoachInvitation({code:'NO_INVITATION',message:'No matching coach invitation'}),false);
 const denied=await harness();denied.intercept(async()=>({error:{code:'42501',message:'Coach workspace unavailable'}}));
 await assert.rejects(denied.bootstrap.resolve(denied.user),/Coach workspace unavailable/);
});
test('concurrent refresh/double click share the same operation and claim request ID',async()=>{
 const h=await harness();const a=h.bootstrap.resolve(h.user),b=h.bootstrap.resolve(h.user);assert.equal(a,b);
 await Promise.all([a,b]);assert.equal(h.calls.filter(c=>c.name===API.claim).length,1);
 assert.equal(h.service.inspect().capabilities.length,1);
});
test('late claim after A to B or same UID new epoch cannot return old profile',async()=>{
 for(const next of [{userId:'learner',sessionId:'session',epoch:2},{userId:'new-coach',sessionId:'session',epoch:2}]){
  const h=await harness();let release,started;const begun=new Promise(r=>{started=r;}),gate=new Promise(r=>{release=r;});
  h.intercept(async({name,args,userId,service})=>{const result=await service.call(userId,name,args);if(name===API.claim){started();await gate;}return result;});
  const promise=h.bootstrap.resolve(h.user);await begun;h.scope(next);release();
  await assert.rejects(promise,{code:'STALE_AUTH_CONTEXT'});
  assert.equal(h.calls.filter(c=>c.name===API.contexts).length,0);
 }
});
test('profile read errors cannot trigger a claim or fallback',async()=>{
 const h=await harness();h.profileError({code:'READ_DENIED',message:'Profile unavailable'});
 await assert.rejects(h.bootstrap.resolve(h.user),{code:'READ_DENIED'});assert.equal(h.calls.length,0);
});
test('uncertain failure before claim retries through receipt with same request ID',async()=>{
 const h=await harness();let lost=true;
 h.intercept(async({name,args,userId,service})=>{if(name===API.claim&&lost){lost=false;throw Error('Transport unavailable');}return service.call(userId,name,args);});
 await assert.rejects(h.bootstrap.resolve(h.user),/Transport unavailable/);
 assert.equal((await h.bootstrap.resolve(h.user)).mode,'candidate_coach');
 const claims=h.calls.filter(c=>c.name===API.claim);assert.equal(claims.length,2);assert.equal(claims[0].args.p_request_id,claims[1].args.p_request_id);
 assert.ok(h.calls.some(c=>c.name===API.receipt));assert.equal(h.service.inspect().capabilities.length,1);
});
test('lost response after commit is resolved by authoritative profile/context readback without another claim',async()=>{
 const h=await harness();let lost=true;
 h.intercept(async({name,args,userId,service})=>{const result=await service.call(userId,name,args);if(name===API.claim&&lost){lost=false;throw Error('Lost response');}return result;});
 await assert.rejects(h.bootstrap.resolve(h.user),/Lost response/);
 assert.equal((await h.bootstrap.resolve(h.user)).mode,'candidate_coach');
 assert.equal(h.calls.filter(c=>c.name===API.claim).length,1);assert.equal(h.service.inspect().capabilities.length,1);
});
test('student appearing during claim keeps role and original organization; legacy claim is skipped',async()=>{
 const h=await harness();
 h.intercept(async({name,args,userId,service})=>{
  if(name===API.claim)service.arrange(db=>db.profiles.push({user_id:'new-coach',email:'new-coach@example.invalid',nickname:'Alumna nueva',role:'student',organization_id:'original',active:true,confirmed:true}));
  return service.call(userId,name,args);
 });
 const result=await h.bootstrap.resolve(h.user);assert.equal(result.mode,'legacy');assert.equal(result.skipLegacyClaim,true);
 assert.equal(result.profile.role,'student');assert.equal(result.profile.organization_id,'original');
});

test('candidate revocation never falls back to legacy on refresh, new session, or a fresh bootstrap instance',async()=>{
 const h=await harness();await h.bootstrap.resolve(h.user);
 h.service.arrange(db=>{db.capabilities.find(c=>c.user_id==='new-coach').active=false;});
 await assert.rejects(h.bootstrap.resolve(h.user),{code:'BOOTSTRAP_CONTEXT_UNAVAILABLE'});
 h.scope({userId:'new-coach',sessionId:'new-session',epoch:2});
 await assert.rejects(h.bootstrap.resolve(h.user),{code:'BOOTSTRAP_CONTEXT_UNAVAILABLE'});
 const fresh=createDualWorkspaceBootstrap({enabled:true,syntheticEnvironment:()=>true,
  readSession:()=>({userId:'new-coach',sessionId:'fresh-page',epoch:1}),
  readProfile:async()=>({data:h.service.inspect().profiles.find(p=>p.user_id==='new-coach')}),
  rpc:(name,args)=>h.service.call('new-coach',name,args)});
 await assert.rejects(fresh.resolve(h.user),{code:'BOOTSTRAP_CONTEXT_UNAVAILABLE'});
 assert.equal(h.calls.filter(c=>c.name===API.claim).length,1);
 assert.equal(h.calls.some(c=>c.name==='efg_claim_invitation'),false);
});
