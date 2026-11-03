// NOT EXECUTED. Hook for the existing attested disposable runner, after explicit
// permission for only the two proposed RPC EXECUTE grants. Uses existing JWT users.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function verifyClinicalBridgeRPC({rpc,coach,otherCoach,student,readSnapshot,projection,frame}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');
 const original=await readSnapshot(),key=randomUUID();
 const args={p_student:student.id,p_expected:frame,p_recipe:projection,p_request_key:key};
 const preview=await rpc('efg_preview_clinical_bound_recipe',coach.token,args);assert.equal(preview.ok,true,JSON.stringify(preview.data));
 assert.equal(preview.data.request_key,key);assert.deepEqual(preview.data.recipe_projection,projection);assert.equal(preview.data.publishable,false);assert.deepEqual(await readSnapshot(),original,'Preview has no mutation');
 for(const name of ['efg_preview_clinical_bound_recipe','efg_save_clinical_bound_recipe'])for(const token of [undefined,student.token,otherCoach.token]){
  const denied=await rpc(name,token,args);assert.equal(denied.ok,false);assert.equal(denied.data.code,'42501');assert.deepEqual(await readSnapshot(),original);
 }
 for(const name of ['efg_preview_clinical_bound_recipe','efg_save_clinical_bound_recipe'])for(const invalid of [{...projection,verified:true},{...projection,receipt:{}},{meals:projection.meals.map((m,i)=>i?m:{...m,items:m.items.map((x,j)=>j?x:{...x,k:999})})}]){
  const rejected=await rpc(name,coach.token,{...args,p_recipe:invalid});assert.equal(rejected.ok,false);assert.equal(rejected.data.code,'22023');assert.deepEqual(await readSnapshot(),original);
 }
 const stale=await rpc('efg_save_clinical_bound_recipe',coach.token,{...args,p_expected:{...frame,health:frame.health+1}});assert.equal(stale.ok,false);assert.equal(stale.data.code,'PT409');assert.deepEqual(await readSnapshot(),original);
 // Fixture must have genuinely ready server decisions; never inject readiness.
 assert.equal(preview.data.compatibility.compatibilityReady,true);
 const saved=await rpc('efg_save_clinical_bound_recipe',coach.token,args);assert.equal(saved.ok,true,JSON.stringify(saved.data));assert.equal(saved.data.draft_revision,frame.draft+1);
 assert.equal(saved.data.publishable,false);assert.equal(saved.data.request_key,key);
 const readback=await rpc('efg_read_bound_guide',coach.token,{p_student:student.id});assert.equal(readback.ok,true);assert.deepEqual(readback.data.guide,saved.data.guide);assert.equal(readback.data.draft_revision,saved.data.draft_revision);
 const after=await readSnapshot();const replay=await rpc('efg_save_clinical_bound_recipe',coach.token,args);assert.equal(replay.ok,false);assert.equal(replay.data.code,'PT409');assert.deepEqual(await readSnapshot(),after);
 return {status:'PASS_REAL_LOCAL_RPC',revision:saved.data.draft_revision,published:false};
}

// Every method/scenario gets a fresh real SQL fixture; no response substitution.
// snapshot must cover draft, binding, receipts and other tables touched by setup;
// capture AFTER the intentional source/intake/revocation change, BEFORE the RPC.
export async function verifyClinicalMutationRejections({cases,rpc}){
 for(const method of ['preview','save'])for(const name of ['revoked','source_changed','intake_changed','expired_during_wait']){
  const fixture=cases[name];assert.equal(typeof fixture,'function',`Missing real SQL fixture: ${name}`);
  const f=await fixture({method});const before=await f.snapshot();
  try{
   const response=await rpc(`efg_${method}_clinical_bound_recipe`,f.coachToken,f.args);
   if(method==='preview'&&['source_changed','expired_during_wait'].includes(name)&&response.ok){
    // Preview may truthfully return an unresolved decision rather than HTTP error.
    assert.equal(response.data.compatibility.compatibilityReady,false,name);
    assert.equal(response.data.publishable,false);
    assert.ok(response.data.compatibility.decisions.some(d=>d.eligible!==true),name);
   }else{
    assert.equal(response.ok,false,`${method}/${name}`);
    assert.ok(['42501','PT409'].includes(response.data.code),`${method}/${name}`);
   }
   assert.deepEqual(await f.snapshot(),before,`${method}/${name}: zero mutation`);
   if(name==='expired_during_wait')assert.equal(await f.pauseWasReached(),true,`${method}: pause really reached`);
  }finally{await f.cleanup();}
 }
 // Separate final gate test: let save start valid, then expire inside the final
 // save/readback path. A pre-send expired fixture does not establish rollback.
 const fixture=cases.expired_during_save;assert.equal(typeof fixture,'function');
 const f=await fixture({method:'save',stage:'after_mutation_before_return'}),before=await f.snapshot();
 try{
  const response=await rpc('efg_save_clinical_bound_recipe',f.coachToken,f.args);
  assert.equal(response.ok,false);assert.equal(response.data.code,'PT409');
  assert.equal(await f.pauseWasReached(),true);assert.equal(await f.mutationReached(),true,'Must reach transactional mutation before final TTL check');
  assert.deepEqual(await f.snapshot(),before,'Final TTL failure rolls back draft/binding/receipts');
 }finally{await f.cleanup();}
 return {status:'PASS_REAL_SQL_REJECTIONS',scenarios:9};
}
