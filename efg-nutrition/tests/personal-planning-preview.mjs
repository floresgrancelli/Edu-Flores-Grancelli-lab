// NUT-62 · No-network nutritional preview contracts, entirely synthetic.
import assert from "node:assert/strict";
import {PERSONAL_PLANNING_PREVIEW_ENABLED,PERSONAL_PREVIEW_SHARES,
 createPersonalPlanningPreview,renderPersonalPlanningPreview} from "../pilot/personal-planning-preview.js";
import {parsePersonalIntake} from "../pilot/personal-intake-draft.js";
assert.equal(PERSONAL_PLANNING_PREVIEW_ENABLED,false,
 "A Personal educational preview must stay OFF until consent, clinical/legal and release approval.");
const fake={
 goal:"recomp",age_years:41,height_cm:174,weight_kg:79.4,
 activity_level:"moderate",sex_for_equation:"male",dietary_pattern:"omnivore",
 health_flags:[],preferred_foods:"Huevos",disliked_foods:"",
 allergy_details:"",meal_routine:"",notes:""
};
assert.throws(()=>createPersonalPlanningPreview(fake),/solicitud expresa/);
const preview=createPersonalPlanningPreview(fake,{explicitPreviewRequest:true});
assert.equal(preview.previewOnly,true);
assert.equal(preview.approved,false);
assert.equal(preview.persistent,false);
assert.equal(preview.coachAccess,false);
assert.equal(preview.clinicalClearance,false);
assert.equal(preview.canGenerateFoodGuide,false);
assert.equal(preview.method,"mifflin_st_jeor");
assert.equal(preview.totals.kcal,2400);
assert.equal(preview.maintenance,2522);
assert.equal(preview.totals.protein_g,159);
assert.equal(preview.totals.fat_g,71);
assert.equal(preview.totals.carb_g,281);
assert.equal(preview.totals.fiber_g,34);
assert.deepEqual(preview.meals.map(m=>m.slot),
 ["desayuno","media_manana","almuerzo","media_tarde","cena"]);
assert.deepEqual(preview.meals.map(m=>m.targets.kcal),[528,312,696,336,528]);
assert.ok(Math.abs(PERSONAL_PREVIEW_SHARES.reduce((a,m)=>a+m.share,0)-1)<1e-12,
 "Decimal shares must sum to 100% up to floating-point precision.");
for(const [k,value] of Object.entries(preview.totals)){
 assert.equal(preview.meals.reduce((n,m)=>n+m.targets[k],0),value,"Exact split "+k);
 assert.ok(preview.meals.every(m=>Number.isInteger(m.targets[k])&&m.targets[k]>=0));
}
const html=renderPersonalPlanningPreview(preview);
for(const s of ["Ejemplo orientativo de objetivos","Desayuno","Media mañana","Almuerzo","Media tarde","Cena","2.400","no se guarda"]){
 assert.ok(html.includes(s),"Missing "+s);
}
assert.doesNotMatch(html,/<input|<button|data-act|type="submit"/i,
 "Read-only educational preview cannot add controls that save/approve/share data.");
assert.doesNotMatch(html,/<script|onerror=|onload=/i);
assert.doesNotMatch(JSON.stringify(preview),/preferred_foods|disliked_foods|health_flags|allergy_details|user_id|student_id|organization_id/,
 "Never retain raw intake, private identifiers or clinical flags in a calculation preview.");
assert.ok(html.includes("Mifflin"),"Method visible, no inferred medical approval");
assert.ok(html.includes("no genera una dieta guía automática"));
for(const patch of [
 {health_flags:["celiac"]},{health_flags:["diabetes"]},
 {health_flags:["food_allergy"],allergy_details:"maní"},
 {health_flags:["kidney_disease"]},{health_flags:["hypertension"]},
 {goal:"general"},{goal:"maintenance"},{age_years:91},
 {height_cm:110},{weight_kg:34},{weight_kg:301},
 {sex_for_equation:""},{activity_level:""}
]){
 assert.throws(()=>createPersonalPlanningPreview({...fake,...patch},{explicitPreviewRequest:true}),
  /revisión|Completá|rango validado|objetivo/i,JSON.stringify(patch));
}
assert.throws(()=>createPersonalPlanningPreview({...fake,goal:"keto"},{explicitPreviewRequest:true}),
 /reconocido/i);
assert.throws(()=>createPersonalPlanningPreview({...fake,health_flags:["celiac"],allergy_details:""}),/solicitud expresa/);
assert.equal(parsePersonalIntake(fake).goal,"recomp");
const small=createPersonalPlanningPreview({...fake,goal:"fat_loss",age_years:35,weight_kg:70,activity_level:"light"},
 {explicitPreviewRequest:true});
assert.equal(small.meals.length,5);
for(const k of Object.keys(small.totals))
 assert.equal(small.meals.reduce((sum,m)=>sum+m.targets[k],0),small.totals[k]);
const tampered={...preview,meals:preview.meals.map((m,i)=>i===1?{...m,targets:{...m.targets,kcal:m.targets.kcal+1}}:m)};
assert.throws(()=>renderPersonalPlanningPreview(tampered),/no coinciden/);
assert.throws(()=>renderPersonalPlanningPreview({...preview,approved:true}),/no es un resultado verificado/);
assert.throws(()=>renderPersonalPlanningPreview({...preview,coachAccess:true}),/no es un resultado verificado/);
const injected=renderPersonalPlanningPreview({...preview,warnings:[...preview.warnings,'<img src=x onerror="bad()">']});
assert.ok(injected.includes("&lt;img"));
assert.doesNotMatch(injected,/<img src=x/);
console.log("PASS NUT-62: explicit request, no medical flags, bounded Mifflin inputs, five exact meal splits, no raw health data or writes, method and disclaimers.");
// Keep the future Personal day-balance gate with the OFF-by-default planning preview.
await import("./personal-day-balance.mjs");
