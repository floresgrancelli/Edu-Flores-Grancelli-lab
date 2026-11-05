import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readVerifiedCoachRestrictionScope} from '../pilot/coach-guide-restriction-scope.js';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const start=source.indexOf('async function loadStudentDetail(studentId){'),end=source.indexOf('\nasync function refresh(){',start);
assert.ok(start>0&&end>start);
const healthOwnerStart=source.indexOf('function ownsCoachHealthWorkspace(){');\nconst healthOwnerEnd=source.indexOf('function foodCompatibilityRestrictions()',healthOwnerStart);\nassert.ok(healthOwnerStart>0&&healthOwnerEnd>healthOwnerStart);\nconst healthOwner=source.slice(healthOwnerStart,healthOwnerEnd);\nconst dir=mkdtempSync(join(tmpdir(),'ncc-source-hydration-'));
try{
 const path=join(dir,'actual.mjs');writeFileSync(path,'export function build(env){const {state,sb,coachAdaptedWorkspace,coachIntakeFlow,COACH_ATOMIC_PLAN_UI_ENABLED,COACH_SHARED_STUDENT_RECIPES_UI_ENABLED=false,PRIVATE_HEALTH_DECLARATION_UI_ENABLED=false,coachDraftClient,coachDraftSourceCurrent,loadSundayPermission,today,readVerifiedCoachRestrictionScope}=env;\n'+healthOwner+source.slice(start,end)+'\nreturn loadStudentDetail;}');
 const {build}=await import(pathToFileURL(path).href);
 for(const [status,current,guide,expected]of [['draft',true,null,true],['draft',true,{kind:'five_meal_example'},true],['draft',false,null,false],['published',true,null,false]]){
  const state={session:{user:{id:'coach'}},roster:[{user_id:'student',active:true}],coachIntakeForms:{student:{revision:1,shared_at:'date'}}};
  const chain=name=>({select(){return this;},eq(){return this;},gte(){return this;},order(){return this;},limit(){return this;},
   maybeSingle:async()=>({data:name==='efg_consents'?{accepted:true}:null}),then(resolve){return Promise.resolve({data:[]}).then(resolve);}});
  const goal={kcal:2100,protein_g:190,carb_g:220,fat_g:51,fiber_g:30};
  const run=build({state,sb:{from:chain,auth:{getUser:async()=>({data:{user:{id:'coach'}}})},rpc:async()=>({data:null})},coachAdaptedWorkspace:{close(){}},coachIntakeFlow:{refreshCoachDetail:async()=>{}},
   COACH_ATOMIC_PLAN_UI_ENABLED:true,coachDraftClient:{load:async()=>({status,goal_proposal:goal,guide_proposal:guide})},
   coachDraftSourceCurrent:()=>current,loadSundayPermission:async()=>{},today:()=> '2026-11-01'});
  await run('student');assert.equal(!!state.pendingGoal,expected);
  if(expected)assert.deepEqual(state.pendingGoal,{...goal,student_id:'student'});
  assert.deepEqual(state.coachGuidedDraft,expected?guide:null);
 }
 // Sharing a general intake alone must never initiate the private health read.
 const clinicalStudent='11111111-1111-4111-8111-111111111111';
 const clinicalCoach='22222222-2222-4222-8222-222222222222';
 const clinicalOrg='33333333-3333-4333-8333-333333333333';
 const otherStudent='44444444-4444-4444-8444-444444444444';
 const otherCoach='55555555-5555-4555-8555-555555555555';
 const otherOrg='66666666-6666-4666-8666-666666666666';
 const scopedHealth={student_id:clinicalStudent,organization_id:clinicalOrg,viewer_id:clinicalCoach,revision:1,
  shared_with_coach:true,processing_consent:true,followup_consent:true,conditions:{celiac:'confirmed'}};
 for(const [flag,role,overrides,reads,accepted,isTest] of [
  [false,'coach',{},0,false],[true,'admin',{},0,false],[true,'coach',{},1,true],
  [true,'coach',{processing_consent:false},1,false],[true,'coach',{followup_consent:false},1,false],
  [true,'coach',{organization_id:otherOrg},1,false],[true,'coach',{viewer_id:otherCoach},1,false],
  [true,'coach',{student_id:otherStudent},1,false],[true,'coach',{revoked:true},1,false],\n  [true,'admin',{},1,true,true],[true,'admin',{processing_consent:false},1,false,true]
 ]){
  let healthReads=0;
  const state={session:{user:{id:clinicalCoach}},org:{id:clinicalOrg,coach_id:clinicalCoach,is_test:isTest===true},profile:{user_id:clinicalCoach,active:true,role},
   roster:[{user_id:clinicalStudent,active:true}],coachIntakeForms:{[clinicalStudent]:{shared_at:'date'}}};
  const sb={from:table=>({select(){return this;},eq(){return this;},gte(){return this;},order(){return this;},limit(){return this;},
    maybeSingle:async()=>({data:table==='efg_consents'?{accepted:true}:null}),then(resolve){return Promise.resolve({data:[]}).then(resolve);}}),
   auth:{getUser:async()=>({data:{user:{id:clinicalCoach}}})},rpc:async name=>{
    assert.equal(name,'efg_get_coach_health_intake');healthReads++;return {data:{...scopedHealth,...overrides}};
   }};
  const run=build({state,sb,coachAdaptedWorkspace:{close(){}},coachIntakeFlow:{refreshCoachDetail:async()=>{}},
   COACH_ATOMIC_PLAN_UI_ENABLED:false,PRIVATE_HEALTH_DECLARATION_UI_ENABLED:flag,
   readVerifiedCoachRestrictionScope,loadSundayPermission:async()=>{},today:()=> '2026-11-01'});
  await run(clinicalStudent);
  assert.equal(healthReads,reads,'Only the owning coach or owning test admin can initiate the enabled health RPC');
  assert.deepEqual(state.coachGuideHealth?.restrictions??null,accepted?['celiac']:null);
  assert.equal(state.consent.accepted,true,'General intake remains usable independently of clinical eligibility');
 }
 // Late responses must not overwrite the currently open student even after A→B→A.
 for(const lastStudent of ['studentB','studentA']){
  const roster=['studentA','studentB'].map(user_id=>({user_id,active:true}));
  const state={roster,coachIntakeForms:{},session:{user:{id:'coach'}},org:{id:'org'}};
  const requests=[];
  const sb={from:()=>({select(){return this;},eq(){return this;},
   maybeSingle:()=>new Promise(resolve=>requests.push(resolve))})};
  const open=build({state,sb,coachAdaptedWorkspace:{close(){}},
   coachIntakeFlow:{refreshCoachDetail:async()=>{}},COACH_ATOMIC_PLAN_UI_ENABLED:false});
  const first=open('studentA');
  const second=open('studentB');
  if(lastStudent==='studentA'){
   const third=open('studentA');
   requests[2]({data:{student_id:'studentA',accepted:false,revision:3}});await third;
  }
  requests[1]({data:{student_id:'studentB',accepted:false,revision:2}});
  if(lastStudent==='studentA')await assert.rejects(second,{code:'STALE_AUTH_CONTEXT'});else await second;
  requests[0]({data:{student_id:'studentA',accepted:false,revision:1}});
  await assert.rejects(first,{code:'STALE_AUTH_CONTEXT'});
  assert.equal(state.consent.student_id,lastStudent);
  assert.equal(state.consent.revision,lastStudent==='studentA'?3:2);
 }
 console.log('PASS actual goal hydration source: current empty-guide draft retains goals; stale/published do not. Unit transport only.');
}finally{rmSync(dir,{recursive:true,force:true});}
