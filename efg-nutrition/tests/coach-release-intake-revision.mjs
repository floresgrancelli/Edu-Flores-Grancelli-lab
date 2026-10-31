// COACH-RELEASE-REV-01: genuine version-bound UI protection in isolated fixtures.
// No hosted database, no personal data, no clinical advice, release flags unchanged.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COACH_RELEASE_INTAKE_VERSION,COACH_RELAUNCH_ONBOARDING_ENABLED} from "../pilot/coach-relaunch-onboarding.js";
import {COACH_ATOMIC_PLAN_UI_ENABLED} from "../pilot/coach-plan-draft-client.js";
import {coachDraftSourceCurrent,assessCoachDraftPublication,verifyCoachDraftReadback} from "../pilot/coach-draft-review.js";

assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false);
assert.equal(COACH_ATOMIC_PLAN_UI_ENABLED,false);
const id="00000000-0000-4000-8000-000000000011";
const stamp="2026-10-30T14:00:00.000Z";
const intake={student_id:id,shared_at:stamp,updated_at:stamp,
 completed_version:COACH_RELEASE_INTAKE_VERSION,revision:2};
const goal={goal_type:"maintenance",kcal:2100,protein_g:140,carb_g:245,fat_g:60,fiber_g:28};
const item={id:"egg",unit:"g",qty:50,k:1.48,p:.124,c:.0096,f:.0996,fi:0};
const guide={kind:"five_meal_example",version:1,
 meals:["desayuno","media_manana","almuerzo","merienda","cena"]
  .map(slot=>({slot,items:[{...item}]}))};
const draft={student_id:id,source_intake_updated_at:stamp,source_intake_revision:2,
 draft_revision:7,status:"draft",goal_proposal:goal,guide_proposal:guide};
const check=(intakeRow,draftRow=draft)=>
 assessCoachDraftPublication({studentId:id,intake:intakeRow,savedDraft:draftRow,
  goal,guide,versioned:true});
assert.equal(coachDraftSourceCurrent(intake,draft,{versioned:true}),true);
assert.equal(check(intake).ready,true);
const good=verifyCoachDraftReadback({studentId:id,intake,savedDraft:draft,
 expectedRevision:7,goal,guide,versioned:true});
assert.notEqual(good,draft,"The readback must be a detached snapshot.");
const revised={...intake,revision:3};
assert.equal(revised.updated_at,intake.updated_at,"Simulate identical DB timestamps");
assert.equal(coachDraftSourceCurrent(revised,draft,{versioned:true}),false);
assert.equal(check(revised).ready,false,"A same-timestamp new revision blocks publication");
assert.throws(()=>verifyCoachDraftReadback({studentId:id,intake:revised,
 savedDraft:draft,expectedRevision:7,goal,guide,versioned:true}),/confirmar/);
assert.equal(check({...intake,completed_version:"coach_major_OLD"}).ready,false);
assert.equal(check(intake,{...draft,source_intake_revision:null}).ready,false);
assert.equal(check(intake,{...draft,source_intake_revision:3}).ready,false);
assert.equal(check({...intake,shared_at:null}).ready,false,"Sharing was withdrawn");
assert.equal(check({...intake,updated_at:"2026-10-30T14:01:00.000Z"}).ready,false);
assert.equal(check(intake,{...draft,status:"published"}).ready,false);
assert.equal(coachDraftSourceCurrent({...intake,revision:3},draft,{versioned:false}),true,
 "Legacy Coach remains timestamp-bound while relaunch is OFF.");
assert.equal(coachDraftSourceCurrent(intake,draft,{versioned:true}),true);
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
assert.match(app,/const active=saved\?\.status==="draft"&&coachDraftSourceCurrent\(intake,saved\)/);
assert.match(app,/coachDraftSourceCurrent\(state\.coachIntakeForms\[studentId\],savedDraft\)/);
assert.match(app,/intakeRevision:state\.coachIntakeForms\?\.\[selected\]\?\.revision\?\?null/);
assert.match(app,/state\.coachIntakeForms\?\.\[selected\]\?\.revision===coachEdits\.intakeRevision/);
assert.match(app,/!COACH_VERSIONED_INTAKE_ENABLED\|\|\(/);
console.log("PASS COACH-RELEASE-REV-01: same-timestamp newer intake revisions block outdated draft review, publication and readback; shared consent and version enforced in client, flags OFF. Server JWT still required.");
