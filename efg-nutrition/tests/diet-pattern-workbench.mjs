// Synthetic contract tests for proposed Coach/Personal planning components.
// Zero network, no Supabase writes and no health records.
import assert from "node:assert/strict";
import {DIET_PATTERNS,EATING_WINDOWS,capabilitiesFor,evaluatePattern,evaluateEatingWindow,distributeDailyTargets} from "../pilot/diet-pattern-workbench.js";
assert.ok(DIET_PATTERNS.find(x=>x.id==="keto"));
for(const id of ["balanced","mediterranean","dash","vegetarian","vegan","pescatarian","flexitarian","portfolio","low_carb"]){
 assert.ok(DIET_PATTERNS.some(x=>x.id===id),"Expected registered evidence-informed pattern: "+id);
}
assert.deepEqual(EATING_WINDOWS.map(x=>x.id),["regular","12_12","14_10","16_8"]);
assert.equal(capabilitiesFor({role:"coach",mode:"coach"}).calculator,true);
assert.equal(capabilitiesFor({role:"coach",mode:"coach"}).canApproveStudentPlan,true);
assert.equal(capabilitiesFor({role:"student",mode:"coached_student"}).calculator,false,"Coach-linked students never use the macro calculator");
assert.equal(capabilitiesFor({role:"student",mode:"personal"}).calculator,false,"A client-supplied Personal mode must NOT unlock the calculator");
assert.equal(capabilitiesFor({role:"student",mode:"personal",serverVerifiedPersonal:true}).calculator,true);
assert.equal(capabilitiesFor({role:"student",mode:"personal",serverVerifiedPersonal:true}).canApproveStudentPlan,false);
assert.equal(capabilitiesFor({role:"admin",mode:"admin"}).calculator,false);
assert.equal(capabilitiesFor({role:"student",mode:"coached_student",serverVerifiedPersonal:true}).calculator,false);
const keto=evaluatePattern({patternId:"keto"});
assert.equal(keto.requiresReview,true);
assert.equal(keto.status,"requires_professional_review");
assert.equal(evaluatePattern({patternId:"keto",medicationFlags:["sglt2"]}).status,"blocked_pending_clinical_review");
assert.equal(evaluatePattern({patternId:"keto",healthFlags:["pregnancy"]}).status,"blocked_pending_clinical_review");
assert.equal(evaluatePattern({patternId:"keto",age:17}).status,"blocked_pending_clinical_review");
assert.equal(evaluatePattern({patternId:"balanced"}).requiresReview,false);
assert.equal(evaluateEatingWindow({windowId:"regular"}).requiresReview,false);
assert.equal(evaluateEatingWindow({windowId:"14_10"}).requiresReview,false);
assert.equal(evaluateEatingWindow({windowId:"16_8",healthFlags:["pregnancy"]}).status,"blocked_pending_clinical_review");
assert.equal(evaluateEatingWindow({windowId:"16_8",medicationFlags:["insulin"]}).requiresReview,true);
assert.equal(evaluateEatingWindow({windowId:"16_8",medicationFlags:["sglt2"]}).requiresReview,true);
assert.equal(distributeDailyTargets({targets:{k:2000,p:140,c:200,f:70},windowId:"regular",startTime:"08:00"}).endTime,null,"Ordinary times are not fasting.");

assert.throws(()=>evaluatePattern({patternId:"unknown"}),/no reconocido/);
const targets={k:2000,p:140,c:200,f:70};
for(const [mode,start,end] of [["12_12","08:00","20:00"],["14_10","10:00","20:00"],["16_8","12:00","20:00"]]){
 const plan=distributeDailyTargets({targets,windowId:mode,startTime:start});
 assert.equal(plan.startTime,start);assert.equal(plan.endTime,end);assert.equal(plan.mealCount,3);
 assert.equal(plan.preserved,true);
 for(const nutrient of ["k","p","c","f"]){
  const sum=Math.round(plan.meals.reduce((n,m)=>n+m.targets[nutrient],0)*10)/10;
  assert.equal(sum,targets[nutrient],mode+" must conserve "+nutrient);
 }
}
const plan=distributeDailyTargets({targets,windowId:"16_8",startTime:"12:00"});
assert.deepEqual(plan.meals.map(x=>x.time),["12:00","16:00","19:30"]);
assert.deepEqual(plan.meals.map(x=>x.targets.k),[700,500,800]);
const two=distributeDailyTargets({targets,windowId:"16_8",startTime:"12:00",mealCount:2});
assert.equal(two.meals.length,2);
assert.equal(two.meals.reduce((s,x)=>s+x.targets.k,0),2000);
const four=distributeDailyTargets({targets,windowId:"12_12",startTime:"08:00",mealCount:4});
assert.equal(four.meals.length,4);
assert.equal(four.meals.reduce((s,x)=>s+x.targets.p,0),140);
assert.throws(()=>distributeDailyTargets({targets,windowId:"16_8",startTime:"20:00"}),/medianoche/);
assert.throws(()=>distributeDailyTargets({targets,windowId:"5_2",startTime:"12:00"}),/desconocida/,"5:2 cannot silently produce a zero-calorie day");
assert.throws(()=>distributeDailyTargets({targets,windowId:"16_8",startTime:"12:00",mealCount:1}),/dos y cuatro/);
assert.throws(()=>distributeDailyTargets({targets,windowId:"16_8",startTime:"12:00",weights:[.5,.5,.5]}),/sumar 100/);
assert.throws(()=>distributeDailyTargets({targets:{...targets,k:0},windowId:"16_8",startTime:"12:00"}),/objetivos diarios/);
console.log("PASS draft Coach/Personal patterns: keto clinical gating, verified Personal calculator, 12:12/14:10/16:8 conserve all daily kcal and grams.");
