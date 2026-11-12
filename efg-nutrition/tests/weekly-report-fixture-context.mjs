// Test-only hydration regression. Executes the real render gate + real report
// loader and the exact two browser fixture callbacks. No hosted auth/RLS claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const fixture=readFileSync(new URL('./weekly-report-flow-private.mjs',import.meta.url),'utf8');
const section=(text,first,last)=>{
 const start=text.indexOf(first),end=text.indexOf(last,start);
 assert.ok(start>=0&&end>start,'Exact source boundary: '+first);
 return text.slice(start,end);
};
const callbacks=[...section(fixture,'// Student reads the actual serialized INSERT','  const published=')
 .matchAll(/await page\.evaluate\((async\(\)=>\{[\s\S]*?)\n  \}\);/g)]
 .map(match=>match[1]+'\n  }');
assert.equal(callbacks.length,2,'Incomplete transition followed by explicit post-onboarding input');
const renderPrefix=section(source,'async function render(){',' if(state.profile.role==="student"&&COACH_RELAUNCH_ONBOARDING_ENABLED)');
const loader=section(source,'async function loadMyWeeklyReports(week=null){','function weeklyStudentPanel(){');
const rows=[{id:'own-saved-report',student_id:'demo-student-a',report_text:'FICTICIO saved snapshot'},
 {id:'other-report',student_id:'other-fictitious-student',report_text:'Must not load'}];
async function run(readyCallback){
 const reads=[],root={innerHTML:''},state={session:{user:{id:'demo-coach'}},profile:{role:'coach'},
  coachPilotEntry:null,planAccessSupported:true,planAccess:{status:'published'},
  foodRestrictionReader:{refresh:async()=>{}},authContextEpoch:1};
 const sb={from(table){
  assert.equal(table,'efg_weekly_reports');let studentId;
  const q={select(){return q;},eq(key,id){assert.equal(key,'student_id');studentId=id;return q;},
   order(){return q;},limit(){return q;},then(resolve){reads.push(studentId);resolve({data:rows.filter(r=>r.student_id===studentId),error:null});}};
  return q;
 }};
 const context=vm.createContext({state,root,sb,
  professionalReleaseFrame:{mountUnframedRoot(){}},weeklyPdfReview:{close(){}},closePeriodPdfView(){},pilotGuideLifecycle:{invalidate(){}},coachAdaptedWorkspace:{close(){}},
  PRIVATE_HEALTH_DECLARATION_UI_ENABLED:true,COACH_STUDENT_JOURNEY_ENABLED:true,
  SCIENCE_WELCOME_ENABLED:false,MAJOR_RELEASE_FLOW_ENABLED:false,PERSONAL_WORKSPACE_ENABLED:false,
  COACH_RELAUNCH_ONBOARDING_ENABLED:false});
 // Stop only after the unmodified gate. Full rendering remains covered by the
 // browser job; this unit test does not replace its DOM, touch or pixel checks.
 vm.runInContext('let myWeeklyReports=[];'+loader+renderPrefix+
  '\nroot.innerHTML="REACHED_VERIFIED_RENDER_BOUNDARY";}finally{if(state.profile?.active)professionalReleaseFrame.mountUnframedRoot?.(root);}}'+
  '\nglobalThis.window={__EFG_VISUAL_QA__:{state,render,loadMyWeeklyReports}};',context);
 await vm.runInContext('('+callbacks[0]+')()',context);
 assert.match(root.innerHTML,/Tu ingreso necesita verificación/);
 assert.deepEqual(reads,['demo-student-a'],'Actual loader scopes the saved report to the new student');
 assert.deepEqual(Array.from(vm.runInContext('myWeeklyReports.map(r=>r.id)',context)),['own-saved-report']);
 await vm.runInContext('('+readyCallback+')()',context);
 return {html:root.innerHTML,state,reads};
}
const result=await run(callbacks[1]);
assert.equal(result.html,'REACHED_VERIFIED_RENDER_BOUNDARY');
assert.equal(result.state.coachPilotEntry.route,'ready');
assert.equal(result.state.planAccessSupported,true);
assert.equal(result.state.planAccess.status,'published');
assert.deepEqual(result.reads,['demo-student-a'],'Do not replace the real loaded history');
const omitted=callbacks[1].replace("s.coachPilotEntry={route:'ready',canLogMeals:true};",'');
assert.notEqual(omitted,callbacks[1]);
assert.match((await run(omitted)).html,/Tu ingreso necesita verificación/,'Missing readiness remains blocked, reproducing the original CI failure');
const wrong=callbacks[1].replace("route:'ready'","route:'unverified'");
assert.match((await run(wrong)).html,/Tu ingreso necesita verificación/,'Unknown readiness never grants access');
console.log('PASS actual student render gate, exact fixture transition, real owner-scoped loader and omitted/unknown readiness negatives. Not browser/auth/RLS certification.');
