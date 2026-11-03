import assert from 'node:assert/strict';
import {createBoundGuidePreparation} from '../pilot/coach-bound-guide-preparation.js';
const scope={userId:'coach',profileId:'coach',ownerId:'coach',role:'coach',active:true,studentId:'student',studentActive:true,
 organizationId:'org',studentOrganizationId:'org',consent:true,consentStudentId:'student',consentOrganizationId:'org',sessionId:'session',sourceEpoch:1};
const goal={student_id:'student',goal_type:'fat_loss',kcal:2100,protein_g:190,carb_g:220,fat_g:51,fiber_g:30};
let current={...scope},duringAuth=()=>{},writes=0,saved=0;
const chain=data=>({select(){return this;},eq(){return this;},single:async()=>({data}),maybeSingle:async()=>({data})});
const sb={auth:{getUser:async()=>{duringAuth();return {data:{user:{id:'coach'}}};}},from:name=>chain(name==='efg_coach_relaunch_intakes'?{organization_id:'org',shared_at:'date',revision:1}:null),
 rpc:async(name,args)=>{
  if(name==='efg_get_coach_health_intake')return {data:{student_id:'student',organization_id:'org',revision:1,restriction_declaration:{kind:'none_declared',declared_by:'student',source_revision:1}}};
  if(name==='efg_prepare_bound_guide'){writes++;assert.equal(args.p_goal.kcal,goal.kcal);return {data:1};}
  if(name==='efg_read_bound_guide')return {data:{draft_revision:1,goal}};
  throw Error('Unexpected RPC');
 }};
const make=()=>createBoundGuidePreparation({sb,readScope:()=>current,readGoal:()=>goal,foodIds:['apple','banana'],onSaved:async()=>{saved++;}});
await assert.rejects(make().prepare({preferredIds:['banana'],dislikedIds:['apple']}));assert.equal(writes,0);
await assert.rejects(make().prepare({preferredIds:['apple'],dislikedIds:['apple'],confirmed:true}));assert.equal(writes,0);
duringAuth=()=>{current={...current,sourceEpoch:2};};
await assert.rejects(make().prepare({preferredIds:['banana'],dislikedIds:['apple'],confirmed:true}));assert.equal(writes,0);
current={...scope};duringAuth=()=>{};
assert.equal(await make().prepare({preferredIds:['banana'],dislikedIds:['apple'],confirmed:true}),1);assert.equal(writes,1);assert.equal(saved,1);
console.log('PASS bound preparation unit: explicit review, disjoint choices, Auth race, same goals read back. Synthetic unit transport only.');
