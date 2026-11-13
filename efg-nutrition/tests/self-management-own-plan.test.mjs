import test from 'node:test';import assert from 'node:assert/strict';
import {readOwnSelfManagedPlan} from '../pilot/self-management-own-plan.js';
function fixture(){
 const query={select(){return this;},eq(key,id){assert.equal(key,'user_id');assert.equal(id,'owner');return this;},async maybeSingle(){return {data:{user_id:'owner',mode:'independent',active:true}};}};
 const sb={from(table){assert.equal(table,'ncc_self_accounts');return query;},auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'signed-test-only'}}})}};
 const context={userId:'owner',intake:{user_id:'owner',revision:2,data:{weight_kg:80}},latestPlan:{userId:'owner',intakeRevision:2,result:{goal:{kcal:2100},guide:{createdFrom:'self_managed_estimate',coachReviewed:false}}}};
 const options={userId:'owner',role:'admin',epoch:3,current:()=>true,fetcher:async(url,options)=>{assert.deepEqual(JSON.parse(options.body),{action:'context'});return {ok:true,json:async()=>context};}};
 return {sb,context,options};
}
test('Mi Día reads only the verified owner plan and never supplies a pupil ID',async()=>{const f=fixture();const result=await readOwnSelfManagedPlan(f.sb,f.options);assert.equal(result.goal.kcal,2100);assert.equal(result.owner,'owner');assert.equal(result.epoch,3);});
test('coached students cannot inherit independent goals',async()=>{const f=fixture();assert.equal(await readOwnSelfManagedPlan(f.sb,{...f.options,role:'student'}),null);});
test('a different owner or a guide whose intake is stale cannot replace current goals',async()=>{const f=fixture();f.context.userId='pupil';assert.equal((await readOwnSelfManagedPlan(f.sb,f.options)).error,true);f.context.userId='owner';f.context.latestPlan.intakeRevision=1;assert.equal((await readOwnSelfManagedPlan(f.sb,f.options)).pending,true);});
test('late private responses are discarded after session/workspace changes',async()=>{const f=fixture();let current=true;f.options.current=()=>current;f.options.fetcher=async()=>{current=false;return {ok:true,json:async()=>f.context};};assert.equal(await readOwnSelfManagedPlan(f.sb,f.options),null);});
