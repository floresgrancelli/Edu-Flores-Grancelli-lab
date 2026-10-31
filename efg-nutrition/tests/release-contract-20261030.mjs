// Release-contract guard: the dated Plan Maestro is a machine-checkable release
// boundary. This test does not assert an item is implemented or publish anything.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
const plan=JSON.parse(read("../docs/GRAN_ACTUALIZACION_20261030_REQUISITOS.json"));
assert.equal(plan.effective_date,"2026-10-30");
assert.equal(plan.requirements.length,55);
assert.equal(new Set(plan.requirements.map(x=>x.id)).size,55);
assert.equal(new Set(plan.requirements.map(x=>x.block)).size,10);
assert.ok(plan.requirements.every(x=>x.mandatory_for_coach_go===true&&
 x.acceptance.length>20&&x.source.length>4&&x.requirement.length>15));
assert.equal(plan.merge_allowed,false);
assert.equal(plan.flags_may_be_enabled_without_go,false);
for(const id of ["01-07","04-08","08-08","01-01","01-03","01-05","02-04","02-05","02-06","03-03",
 "03-04","03-05","04-03","04-04","05-02","06-01","08-01","08-02",
 "08-05","08-06","09-06","09-04","09-05","10-01","10-03","10-04","10-05"]){
 assert.ok(plan.requirements.some(x=>x.id===id),"Missing mandatory "+id);
}
const special=plan.requirements.find(x=>x.id==="08-06");
assert.match(special.requirement,/ñoquis/i);
assert.match(special.source,/PRO60|PRO-60/i);
const tip=read("../pilot/nutrition-daily-tip.js");
const app=read("../pilot/pilot.js");
const html=read("../pilot/index.html");
const sql=read("../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql");
const workflow=read("../../.github/workflows/efg-nutrition-premium-qa.yml");
assert.match(tip,/DAILY_TIP_LIBRARY_SIZE=72/);
assert.match(tip,/America\/Argentina\/Buenos_Aires/);
assert.match(app,/nutritionTipCardHTML/);
assert.match(html,/nutrition-daily-tip\.css/);
assert.match(workflow,/PRO-60 monthly ñoquis/);
assert.match(sql,/create function public\.efg_publish_coach_plan_draft_atomic/);
assert.match(sql,/coach119_reviewed_food_ids/);
assert.match(read("../pilot/coach-relaunch-onboarding.js"),/COACH_RELAUNCH_ONBOARDING_ENABLED=false/,
 "Do not enable relaunch while versioned legal and food review are missing");
assert.match(read("../pilot/coach-release-plan-gate.js"),/COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false/);
assert.match(read("../pilot/science-welcome.js"),/SCIENCE_WELCOME_ENABLED=false/);
for(const extra of ["Mac","Personal","Carla","PRO64"]){
 assert.ok(plan.post_release_explicit.some(v=>v.includes(extra)),"Missing explicit post-GO scope "+extra);
}
console.log("PASS REL-ALL contract: 55 mandatory dated requirements, 10 blocks, PRO-60 ñoquis and photos, atomic/legal gate OFF; no production changes.");
