import assert from "node:assert/strict";
import {createCoachCalculatorPrefill,coachGuidePreviewAllowed} from "../pilot/coach-intake-prefill.js";
import {readFileSync} from "node:fs";
const sample={student_id:"student_A",shared_at:"2026-10-29T15:00:00Z",age_years:41,height_cm:174,
 weight_kg:80.5,objective:"recomp",activity_level:"moderate",dietary_pattern:"omnivore",
 preferred_foods:"Pollo, arroz",disliked_foods:"Morrón",meal_routine:"07:00 a 21:00"};
assert.throws(()=>createCoachCalculatorPrefill({intake:sample,studentId:"student_A",coachAuthorized:false}),/autorizada/);
assert.throws(()=>createCoachCalculatorPrefill({intake:sample,studentId:"student_B",coachAuthorized:true}),/autorizada/);
assert.throws(()=>createCoachCalculatorPrefill({intake:{...sample,shared_at:null},studentId:"student_A",coachAuthorized:true}),/autorizada/);
const x=createCoachCalculatorPrefill({intake:sample,studentId:"student_A",coachAuthorized:true});
assert.deepEqual(x.fields,{targetAge:"41",targetHeight:"174",targetWeight:"80.5",targetGoal:"recomp",targetActivity:"1.5"});
assert.equal(x.readyForAutomaticCalculation,false,"Sex required by equation is NEVER guessed");
assert.equal(x.eligibleForGeneralExample,true);
assert.ok(x.warnings.some(w=>w.includes("parámetro fisiológico")));
assert.ok(x.warnings.some(w=>w.includes("alergias")));
assert.equal(coachGuidePreviewAllowed(x,{studentId:"student_A",consent:true}),true);
assert.equal(coachGuidePreviewAllowed(x,{studentId:"student_B",consent:true}),false);
assert.equal(coachGuidePreviewAllowed(x,{studentId:"student_A",consent:false}),false);
for(const pattern of ["vegetarian","vegan","pescatarian","other","unknown"]){
 const v=createCoachCalculatorPrefill({intake:{...sample,dietary_pattern:pattern},studentId:"student_A",coachAuthorized:true});
 assert.equal(coachGuidePreviewAllowed(v,{studentId:"student_A",consent:true}),false,"Never create animal menu for "+pattern);
}
const high=createCoachCalculatorPrefill({intake:{...sample,activity_level:"high"},studentId:"student_A",coachAuthorized:true});
assert.equal(high.fields.targetActivity,undefined,"High must NOT silently be capped to 1.5");
assert.ok(high.warnings.some(w=>w.includes("no tiene equivalencia")));
for(const objective of ["maintenance","general",null]){
 const y=createCoachCalculatorPrefill({intake:{...sample,objective},studentId:"student_A",coachAuthorized:true});
 assert.equal(y.fields.targetGoal,undefined,"Unsupported goals cannot default to fat-loss");
}
const invalid=createCoachCalculatorPrefill({intake:{...sample,age_years:105,height_cm:110,weight_kg:20},studentId:"student_A",coachAuthorized:true});
assert.equal(invalid.fields.targetAge,undefined);
assert.equal(invalid.fields.targetHeight,undefined);
assert.equal(invalid.fields.targetWeight,undefined);
assert.ok(invalid.warnings.length>=4);
assert.ok(!Object.hasOwn(x.fields,"targetSex"),"No inferred sex");
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const form=readFileSync(new URL("../pilot/coach-intake-flow.js",import.meta.url),"utf8");
assert.match(app,/createCoachCalculatorPrefill/);
assert.match(app,/if\(action==="prepareCoachPlanFromIntake"\)/);
assert.match(app,/await loadStudentDetail\(studentId\)/,"Re-read RLS/consent before using intake");
assert.match(form,/data-act="prepareCoachPlanFromIntake"/);
assert.match(app,/coachIntakeGuidePreview/);
assert.match(app,/coachGuidePreviewAllowed/);
assert.doesNotMatch(app,/createCoachCalculatorPrefill\([\s\S]{0,150}state\.session\.user\.id\s*\)/);
console.log("PASS: coach prefill is role/consent-specific, fails closed, and cannot invent goals, clinical safety or equation sex");
