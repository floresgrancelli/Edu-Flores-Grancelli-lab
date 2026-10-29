// NUT-55 static regression gate for legacy Coach writes.
// In production, old editing stays available while feature flag is OFF.
// When feature is ON, ALL four legacy writes must reject BEFORE sending HTTP.
// Backend revokes DML independently in the staging SQL. This test is NOT E2E.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const pilot=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const draftClient=readFileSync(new URL("../pilot/coach-plan-draft-client.js",import.meta.url),"utf8");
assert.match(draftClient,/export const COACH_ATOMIC_PLAN_UI_ENABLED=false\s*;/,"Never enable experimental UI from this QA");
const blocks=[
 ["saveCoachFoods","async function saveCoachFoods(){","function sportView(){","efg_food_plans","upsert"],
 ["approveGuidedDay","async function approveGuidedDay(){","function","efg_food_plans","upsert"],
 ["approveGoalRevision","async function approveGoalRevision(){","function regenerateCoachIntakeGuidePreview","efg_goals","insert"],
 ["approveGoal action","if(action===\"approveGoal\"){","if(action===\"checkAppVersion\")","efg_goals","insert"]
];
for(const [name,start,end,table,method] of blocks){
 const begin=pilot.indexOf(start);
 assert.ok(begin>=0,name+" entry point not found");
 const finish=pilot.indexOf(end,begin+start.length);
 assert.ok(finish>begin,name+" boundary not found");
 const body=pilot.slice(begin,finish);
 const guard=body.indexOf("if(COACH_ATOMIC_PLAN_UI_ENABLED)throw Error(");
 const write=body.indexOf('sb.from("'+table+'").'+method+"(");
 assert.ok(guard>=0&&write>guard,name+" must fail closed before a direct "+table+" write");
}
const dynamicWrites=[...pilot.matchAll(/sb\.from\(["'](efg_goals|efg_food_plans)["']\)\.(insert|upsert|update|delete)\s*\(/g)];
assert.equal(dynamicWrites.length,blocks.length,
 "A new direct Coach goal/guide write was added; audit and gate it before activation");
for(const match of dynamicWrites){
 const idx=match.index;
 assert.ok(blocks.some(([,start,end])=>{
  const a=pilot.indexOf(start),b=pilot.indexOf(end,a+start.length);
  return a>=0&&b>a&&idx>a&&idx<b;
 }),"Direct write outside audited legacy handlers: "+match[0]);
}
assert.match(draftClient,/sb\.rpc\("efg_save_coach_plan_draft"/);
assert.match(draftClient,/sb\.rpc\("efg_publish_coach_plan_draft"/);
assert.doesNotMatch(draftClient,/\.from\(["']efg_goals["']\)\.(insert|upsert|update|delete)/);
assert.doesNotMatch(draftClient,/\.from\(["']efg_food_plans["']\)\.(insert|upsert|update|delete)/);
console.log("PASS NUT-55 STATIC LEGACY WRITE AUDIT: 4 direct writes are guarded before RPC when flag ON, draft client only uses atomic RPC, feature remains OFF. Manual app flows and hosted RLS are NOT certified.");
