// Activate only the new journey in a disposable module copy. No backend/network.
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {usesVersionedCoachIntake,COACH_VERSIONED_INTAKE_ENABLED} from '../pilot/coach-versioned-mode.js';
assert.equal(COACH_VERSIONED_INTAKE_ENABLED,false);
for(const [a,b,want] of [[false,false,false],[true,false,true],[false,true,true],[true,true,true]])
 assert.equal(usesVersionedCoachIntake({relaunchEnabled:a,studentJourneyEnabled:b}),want);
const dir=mkdtempSync(join(tmpdir(),'coach-journey-'));
try{
 cpSync(new URL('../pilot/',import.meta.url),dir,{recursive:true});
 const entry=join(dir,'coach-student-journey.js');
 writeFileSync(entry,readFileSync(entry,'utf8').replace('COACH_STUDENT_JOURNEY_ENABLED=false','COACH_STUDENT_JOURNEY_ENABLED=true'));
 const load=name=>import(pathToFileURL(join(dir,name)));
 const {COACH_RELAUNCH_ONBOARDING_ENABLED}=await load('coach-relaunch-onboarding.js');
 assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false,'Do not enable the duplicate student entry route');
 assert.equal((await load('coach-versioned-mode.js')).COACH_VERSIONED_INTAKE_ENABLED,true);
 const {createCoachPlanDraftClient}=await load('coach-plan-draft-client.js');
 const {coachDraftSourceCurrent}=await load('coach-draft-review.js');
 const {createCoachIntakeFlow}=await load('coach-intake-flow.js');
 const student='11111111-1111-4111-8111-111111111111';
 const request='22222222-2222-4222-8222-222222222222';
 const goalId='33333333-3333-4333-8333-333333333333';
 const stamp='2026-10-31T10:00:00Z';
 const intake={student_id:student,shared_at:stamp,updated_at:stamp,completed_version:'coach_major_2026_r1',revision:4,dietary_pattern:'keto',eating_window:'14_10'};
 const draft={source_intake_updated_at:stamp,source_intake_revision:4};
 assert.equal(coachDraftSourceCurrent(intake,draft),true);
 assert.equal(coachDraftSourceCurrent({...intake,revision:5},draft),false,'Same timestamp cannot hide a revision change');
 const reads=[],calls=[];
 const sb={from(table){
  assert.notEqual(table,'efg_student_intakes','New journey must never read old intake');
  reads.push(table);
  const q={select(){return q},eq(){return q},not(){return q},in(){return q},
   limit:async()=>({data:table==='efg_coach_relaunch_intakes'?[intake]:[],error:null}),
   maybeSingle:async()=>({data:table==='efg_consents'?{accepted:true}:intake,error:null})};
  return q;
 },rpc:async(name,params)=>{calls.push({name,params});return {data:goalId,error:null}}};
 const blocked=createCoachPlanDraftClient({sb,enabled:true});
 await assert.rejects(()=>blocked.load(student),/nueva ficha por versión/);
 assert.equal(reads.length,0,'Unverified backend must block before any legacy fallback');
 const client=createCoachPlanDraftClient({sb,enabled:true,versionedBackendVerified:true});
 await client.publish({studentId:student,expectedRevision:2,requestId:request,confirmed:true});
 assert.equal(calls.at(-1).name,'efg_publish_coach_plan_draft_atomic');
 assert.ok(reads.includes('efg_coach_relaunch_intakes'));
 const state={coachIntakeForms:{},coachIntakeAccess:{}};
 const flow=createCoachIntakeFlow({sb,state,escapeHTML:String});
 await flow.loadCoach([student]);
 assert.equal(state.coachIntakeForms[student].revision,4);
 assert.match(flow.details(student),/Cetogénica/);
 assert.match(flow.details(student),/14:10/);
 await assert.rejects(()=>flow.save(),/ficha de relanzamiento/);
 await assert.rejects(()=>flow.deleteOwn(),/borrado antiguo está deshabilitado/);
}finally{rmSync(dir,{recursive:true,force:true})}
console.log('PASS new journey only: versioned Coach intake, revision guard, COACH119 endpoint, backend gate, pattern/window display; no legacy fallback. Isolated modules, no JWT claim.');
