// COACH-66 · Fail-closed integration safety. No users, no network, no medical claims.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COACH_RELAUNCH_ONBOARDING_ENABLED} from "../pilot/coach-relaunch-onboarding.js";
import {COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED,
 COACH_RELAUNCH_LEGACY_PLAN_ACTIONS,assertCoachReleasePlanWriteAllowed}
 from "../pilot/coach-release-plan-gate.js";
import {createCoachPlanDraftClient,COACH_ATOMIC_PLAN_UI_ENABLED}
 from "../pilot/coach-plan-draft-client.js";
assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false);
assert.equal(COACH_ATOMIC_PLAN_UI_ENABLED,false);
assert.equal(COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED,false);
assert.equal(assertCoachReleasePlanWriteAllowed({relaunchEnabled:false}),true);
assert.throws(()=>assertCoachReleasePlanWriteAllowed({relaunchEnabled:true}),
 /servidor la nueva ficha por versión/);
assert.equal(new Set(COACH_RELAUNCH_LEGACY_PLAN_ACTIONS).size,COACH_RELAUNCH_LEGACY_PLAN_ACTIONS.length);
for(const x of ["approveGoal","approveGoalRevision","saveGuidedDay","publishCoachStudentPlan",
 "saveCoachAtomicDraft","publishCoachAtomicDraft","approveGuidedDay"]){
 assert.ok(COACH_RELAUNCH_LEGACY_PLAN_ACTIONS.includes(x),"Missing write barrier "+x);
}
const STUDENT="00000000-0000-4000-8000-000000000011";
const REQ="30000000-0000-4000-8000-000000000001";
let operations=0;
const sb={from(){operations++;throw Error("Unexpected read")},
 rpc(){operations++;throw Error("Unexpected write")}};
const draft=createCoachPlanDraftClient({sb,enabled:true,relaunchEnabled:true});
await assert.rejects(()=>draft.load(STUDENT),/nueva ficha por versión/);
await assert.rejects(()=>draft.save({studentId:STUDENT}),/nueva ficha por versión/);
await assert.rejects(()=>draft.publish({studentId:STUDENT,expectedRevision:1,requestId:REQ,confirmed:true}),
 /nueva ficha por versión/);
assert.equal(operations,0,"Not one old-table query or RPC allowed in relaunch mode.");
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const flow=readFileSync(new URL("../pilot/coach-intake-flow.js",import.meta.url),"utf8");
assert.match(app,/COACH_RELAUNCH_LEGACY_PLAN_ACTIONS\.includes\(action\)/);
assert.match(app,/assertCoachReleasePlanWriteAllowed\(\); \/\/ Frontend defense/);
assert.match(app,/COACH_VERSIONED_INTAKE_ENABLED&&!COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED/);
assert.match(app,/la publicación de objetivo y guía de cinco comidas está detenida/);
assert.match(flow,/async function publish\(\)\{\s*assertCoachReleasePlanWriteAllowed\(\)/);
const draftSql=readFileSync(new URL("../docs/COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql",import.meta.url),"utf8");
const publishSql=readFileSync(new URL("../docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql",import.meta.url),"utf8");
assert.match(draftSql,/from public\.efg_student_intakes intake/);
assert.match(publishSql,/from public\.efg_student_intakes intake/);
assert.equal(COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED,false,
 "Legacy SQL still locks old intake; versioned backend MUST NOT be declared verified.");
console.log("PASS COACH-66: no legacy draft/goal/guide writes after launch version switch; current Coach remains unchanged; server-versioned publish remains NO GO.");
