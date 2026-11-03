// NUT-63 · Personal arithmetic-only balance, synthetic foods and days. No account/API.
import assert from "node:assert/strict";
import {createPersonalPlanningPreview} from "../pilot/personal-planning-preview.js";
import {newPersonalMealDraft,draftPersonalMealAdd} from "../pilot/personal-meal-draft.js";
import {PERSONAL_DAY_BALANCE_ENABLED,calculatePersonalDayBalance,renderPersonalDayBalance}
 from "../pilot/personal-day-balance.js";
assert.equal(PERSONAL_DAY_BALANCE_ENABLED,false);
const day="2026-10-30",fake={
 goal:"recomp",age_years:41,height_cm:174,weight_kg:79.4,activity_level:"moderate",
 sex_for_equation:"male",dietary_pattern:"omnivore",health_flags:[]
};
const preview=createPersonalPlanningPreview(fake,{explicitPreviewRequest:true});
const catalog=[
 {id:"egg",name:"Huevo",unit:"g",category:"dairy",k:1.5,p:.12,c:.01,f:.1,fi:0},
 {id:"banana",name:"Banana",unit:"g",category:"fruit",k:.89,p:.01,c:.23,f:.003,fi:.025},
 {id:"tart",name:"Tarta de atún",unit:"g",category:"protein",k:2.5,p:.14,c:.22,f:.1,fi:.02},
 {id:"oil",name:"Aceite de oliva",unit:"g",category:"fat",k:9,p:0,c:0,f:1,fi:0}
];
function meal(slot,id,quantity,date=day){
 return draftPersonalMealAdd(newPersonalMealDraft({day:date,slot}),catalog,{foodId:id,quantity});
}
const entries=[meal("desayuno","egg",100),meal("media_manana","banana",100),meal("almuerzo","tart",200)];
const report=calculatePersonalDayBalance({day,goalPreview:preview,drafts:entries,catalog});
assert.equal(report.previewOnly,true);
assert.equal(report.persistent,false);
assert.equal(report.approved,false);
assert.equal(report.allMealsEntered,false);
assert.deepEqual(report.consumed,{k:739,p:41,c:68,f:30.3,fi:6.5});
assert.deepEqual(report.target,{k:2400,p:159,c:281,f:71,fi:34});
assert.deepEqual(report.lacking,{k:1661,p:118,c:213,f:40.7,fi:27.5});
assert.deepEqual(report.excess,{k:0,p:0,c:0,f:0,fi:0});
assert.deepEqual(report.distribution.map(m=>m.slot),["media_tarde","cena"]);
assert.deepEqual(report.distribution.map(m=>m.targets.k),[553.7,1107.3]);
assert.deepEqual(report.distribution.map(m=>m.targets.p),[39.3,78.7]);
assert.deepEqual(report.distribution.map(m=>m.targets.c),[71,142]);
assert.deepEqual(report.distribution.map(m=>m.targets.f),[13.6,27.1]);
assert.deepEqual(report.distribution.map(m=>m.targets.fi),[9.2,18.3]);
for(const nutrient of ["k","p","c","f","fi"]){
 assert.ok(Math.abs(report.distribution.reduce((x,m)=>x+m.targets[nutrient],0)-report.lacking[nutrient])<1e-8,
  "Pending targets must sum to missing "+nutrient);
}
assert.equal(entries[0].items.length,1,"Arithmetic cannot mutate original drafts.");
assert.equal(report.summary.length,5);
assert.deepEqual(report.summary.filter(m=>m.registered).map(m=>m.slot),
 ["desayuno","media_manana","almuerzo"]);
const html=renderPersonalDayBalance(report);
for(const word of ["Lo que llevo y lo que falta","Faltante","Exceso","Media tarde","Cena","1.661","553,7","1.107,3"]){
 assert.ok(html.includes(word),"Missing "+word);
}
assert.doesNotMatch(html,/data-act=|<button|<input|<form/i,"Offline arithmetic must not expose writes.");
const onlyDinner=calculatePersonalDayBalance({day,goalPreview:preview,drafts:entries,
 catalog,remainingSlots:["cena"]});
assert.equal(onlyDinner.distribution.length,1);
assert.deepEqual(onlyDinner.distribution[0].targets,report.lacking,
 "All remaining nutrients go to dinner if no afternoon snack is pending.");
const none=calculatePersonalDayBalance({day,goalPreview:preview,drafts:entries,catalog,remainingSlots:[]});
assert.equal(none.distribution.length,0,"No invented future meal");
const overflow=calculatePersonalDayBalance({day,goalPreview:preview,
 drafts:[meal("desayuno","oil",300)],catalog});
assert.equal(overflow.lacking.k,0,"Excess calories never produce negative food targets");
assert.ok(overflow.excess.k>0);
assert.ok(overflow.distribution.every(m=>m.targets.k===0));
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:preview,drafts:[...entries,entries[0]],catalog}),/repetidas/);
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:preview,drafts:[meal("desayuno","egg",100,"2026-10-29")],catalog}),/otra fecha/);
assert.throws(()=>calculatePersonalDayBalance({day:"2026-11-31",goalPreview:preview,drafts:entries,catalog}),/fecha/);
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:{...preview,approved:true},drafts:entries,catalog}),/nunca un plan aprobado/);
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:preview,drafts:entries,catalog,remainingSlots:["almuerzo"]}),/restantes/);
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:preview,drafts:entries,catalog,remainingSlots:["cena","cena"]}),/restantes/);
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:preview,drafts:[...entries,meal("media_tarde","banana",50)],catalog}),/ya tiene alimentos/);
assert.throws(()=>calculatePersonalDayBalance({day,goalPreview:preview,drafts:entries,catalog:[]}),/catálogo/);
assert.throws(()=>renderPersonalDayBalance({...report,approved:true}),/inválida/);
assert.throws(()=>renderPersonalDayBalance({...report,summary:report.summary.slice(1)}),/inválida/);
assert.throws(()=>renderPersonalDayBalance({...report,day:"2026-02-30"}),/inválida/);
assert.deepEqual(Object.keys(report),["previewOnly","persistent","approved","day","goalType","summary",
 "consumed","target","lacking","excess","remainingSlots","distribution","kcalFraction",
 "allMealsEntered","note"]);
assert.ok(!JSON.stringify(report).includes("health_flags")&&!JSON.stringify(report).includes("student_id"),
 "The report must not contain health data or coach-linked identity fields.");
console.log("PASS NUT-63: Personal day balance, exact 1/3 afternoon 2/3 dinner arithmetic, prepared food once, no negative macros, read-only, OFF.");
