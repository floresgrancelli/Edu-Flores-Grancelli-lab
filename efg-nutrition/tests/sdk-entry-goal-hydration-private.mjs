import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const start=source.indexOf('async function loadStudentDetail(studentId){'),end=source.indexOf('\nasync function refresh(){',start);
assert.ok(start>0&&end>start);
const dir=mkdtempSync(join(tmpdir(),'ncc-source-hydration-'));
try{
 const path=join(dir,'actual.mjs');writeFileSync(path,'export function build(env){const {state,sb,coachAdaptedWorkspace,coachIntakeFlow,COACH_ATOMIC_PLAN_UI_ENABLED,coachDraftClient,coachDraftSourceCurrent,loadSundayPermission,today}=env;\n'+source.slice(start,end)+'\nreturn loadStudentDetail;}');
 const {build}=await import(pathToFileURL(path).href);
 for(const [status,current,guide,expected]of [['draft',true,null,true],['draft',true,{kind:'five_meal_example'},true],['draft',false,null,false],['published',true,null,false]]){
  const state={roster:[{user_id:'student',active:true}],coachIntakeForms:{student:{revision:1,shared_at:'date'}}};
  const chain=name=>({select(){return this;},eq(){return this;},gte(){return this;},order(){return this;},limit(){return this;},
   maybeSingle:async()=>({data:name==='efg_consents'?{accepted:true}:null}),then(resolve){return Promise.resolve({data:[]}).then(resolve);}});
  const goal={kcal:2100,protein_g:190,carb_g:220,fat_g:51,fiber_g:30};
  const run=build({state,sb:{from:chain},coachAdaptedWorkspace:{close(){}},coachIntakeFlow:{refreshCoachDetail:async()=>{}},
   COACH_ATOMIC_PLAN_UI_ENABLED:true,coachDraftClient:{load:async()=>({status,goal_proposal:goal,guide_proposal:guide})},
   coachDraftSourceCurrent:()=>current,loadSundayPermission:async()=>{},today:()=> '2026-11-01'});
  await run('student');assert.equal(!!state.pendingGoal,expected);
  if(expected)assert.deepEqual(state.pendingGoal,{...goal,student_id:'student'});
  assert.deepEqual(state.coachGuidedDraft,expected?guide:null);
 }
 console.log('PASS actual goal hydration source: current empty-guide draft retains goals; stale/published do not. Unit transport only.');
}finally{rmSync(dir,{recursive:true,force:true});}
