import assert from 'node:assert/strict';
import {createBoundGuidePreparation} from '../pilot/coach-bound-guide-preparation.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const scope={userId:'coach',profileId:'coach',ownerId:'coach',sessionId:'session',organizationId:'A',studentOrganizationId:'A',studentId:'student',role:'coach',active:true,studentActive:true,consent:true,consentStudentId:'student',consentOrganizationId:'A',sourceEpoch:1};
const initial={student_id:'student',goal_type:'maintenance',kcal:2100,protein_g:168,carb_g:254,fat_g:46,fiber_g:29};
async function scenario(stage,change){
 let goal={...initial},writes=0,onSaved=0,authCalls=0;const held=deferred(),entered=deferred();
 const wait=async at=>{if(at===stage){entered.resolve();await held.promise;}};
 const client={auth:{getUser:async()=>{await wait(++authCalls===1?'auth':'auth-before-write');return {data:{user:{id:'coach'}}};}},
  from(name){const q={select(){return q;},eq(){return q;},async single(){await wait('intake');return {data:{organization_id:'A',revision:1,shared_at:'2026-11-01'}};},async maybeSingle(){await wait('draft');return {data:null};}};return q;},
  async rpc(name,args){
   if(name==='efg_get_coach_health_intake'){await wait('health');return {data:{student_id:'student',organization_id:'A',revision:1,restriction_declaration:{kind:'none_declared',declared_by:'student',source_revision:1}}};}
   if(name==='efg_prepare_bound_guide'){writes++;await wait('sent');return {data:1};}
   if(name==='efg_read_bound_guide'){await wait('readback');return {data:{draft_revision:1,goal:{...initial}}};}
   throw Error(name);
  }};
 const api=createBoundGuidePreparation({sb:client,readScope:()=>scope,readGoal:()=>goal,foodIds:['apple'],onSaved:async(id,guard)=>{await wait('refresh-before-render');guard();onSaved++;}});
 const pending=api.prepare({preferredIds:[],dislikedIds:[],confirmed:true});
 if(stage){await entered.promise;if(change==='goal')goal={...goal,kcal:2300};else api.invalidate();held.resolve();await assert.rejects(pending,/Cambió/);}
 else assert.equal(await pending,1);
 assert.equal(writes,['sent','readback','refresh-before-render'].includes(stage)||!stage?1:0,stage+' write count');
 assert.equal(onSaved,stage?0:1,stage+' stale UI callback');
 return {stage:stage||'unchanged',change,writes,onSaved};
}
const results=[];
for(const stage of ['auth','intake','health','draft','auth-before-write','sent','readback','refresh-before-render'])results.push(await scenario(stage,'goal'));
for(const stage of ['auth','sent'])results.push(await scenario(stage,'invalidate'));
results.push(await scenario(null,null));
console.log(JSON.stringify({status:'PASS_GOAL_RACE',results,limit:'Sent RPC may commit; stale response must not update UI. Synthetic Node transport, no SQL.'},null,2));
