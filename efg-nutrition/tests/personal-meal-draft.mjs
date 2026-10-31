// NUT-60 isolated Personal draft contracts. No data collection, network or hosted Supabase.
import assert from "node:assert/strict";
import {PERSONAL_MEAL_EDIT_ENABLED,newPersonalMealDraft,draftPersonalMealAdd,
 draftPersonalMealChange,draftPersonalMealOmit,previewPersonalMeal} from "../pilot/personal-meal-draft.js";
import {PERSONAL_MEALS} from "../pilot/personal-workspace.js";
assert.equal(PERSONAL_MEAL_EDIT_ENABLED,false,"Writable Personal UI remains OFF.");
const date="2026-10-30";
const foods=[
 {id:"tuna",name:"Atún al natural",category:"protein",unit:"g",k:1.16,p:.26,c:0,f:.01,fi:0},
 {id:"rice",name:"Arroz integral",category:"carb",unit:"g",k:1.23,p:.027,c:.256,f:.01,fi:.018},
 {id:"tart",name:"Tarta de atún",category:"protein",unit:"g",k:2.5,p:.14,c:.22,f:.1,fi:.02},
 {id:"rocket",name:"Rúcula",category:"vegetable",unit:"g",k:.25,p:.026,c:.037,f:.007,fi:.016},
 {id:"banana",name:"Banana",category:"fruit",unit:"g",k:.89,p:.011,c:.228,f:.003,fi:.026}
];
const start=newPersonalMealDraft({day:date,slot:"almuerzo"});
assert.equal(start.items.length,0);
assert.deepEqual(start.skipped,{protein:false,carb:false});
let selected=draftPersonalMealAdd(start,foods,{foodId:"tart",quantity:200});
let preview=previewPersonalMeal(selected,foods);
assert.equal(preview.groups.find(g=>g.id==="prepared").items.length,1,"Mixed plate only enters prepared");
assert.equal(preview.groups.find(g=>g.id==="protein").items.length,0,"Tart never duplicated in protein");
assert.equal(preview.groups.find(g=>g.id==="carb").items.length,0,"Tart never duplicated in carbs");
assert.equal(preview.totals.k,500);
assert.equal(preview.totals.p,28);
assert.equal(preview.totals.c,44);
assert.equal(preview.totals.f,20);
assert.equal(preview.totals.fi,4);
assert.equal(start.items.length,0,"Immutable drafts are never edited by reference");
selected=draftPersonalMealAdd(selected,foods,{foodId:"rice",quantity:100});
selected=draftPersonalMealAdd(selected,foods,{foodId:"rocket",quantity:40});
preview=previewPersonalMeal(selected,foods);
assert.equal(preview.totals.k,633);
assert.equal(preview.totals.c,71.1);
assert.equal(preview.groups.reduce((n,g)=>n+g.items.length,0),3);
assert.equal(preview.entries.length,3,"One prepared dish contributes its macros once");
selected=draftPersonalMealChange(selected,foods,{foodId:"rice",quantity:150});
assert.equal(previewPersonalMeal(selected,foods).totals.k,694.5);
assert.equal(previewPersonalMeal(selected,foods).totals.c,83.9);
selected=draftPersonalMealChange(selected,foods,{foodId:"rice",quantity:0});
assert.equal(previewPersonalMeal(selected,foods).entries.length,2);
const omit=draftPersonalMealOmit(selected,foods,"carb",true);
assert.equal(omit.skipped.carb,true);
assert.equal(previewPersonalMeal(omit,foods).totals.c,45.5,
 "Omitting dedicated carbs never falsely removes carbs inside mixed dishes");
assert.throws(()=>draftPersonalMealAdd(omit,foods,{foodId:"rice",quantity:20}),/Volvé a activar/);
const uns=draftPersonalMealOmit(omit,foods,"carb",false);
assert.equal(draftPersonalMealAdd(uns,foods,{foodId:"rice",quantity:50}).items.length,3);
assert.throws(()=>draftPersonalMealOmit(draftPersonalMealAdd(start,foods,{foodId:"rice",quantity:100}),foods,"carb"),/Quitá primero/);
assert.throws(()=>draftPersonalMealAdd(start,foods,{foodId:"tuna",quantity:-1}),/porción/);
assert.throws(()=>draftPersonalMealAdd(start,foods,{foodId:"tuna",quantity:3000.1}),/porción/);
assert.throws(()=>draftPersonalMealAdd(start,foods,{foodId:"tuna",quantity:10.01}),/porción/);
assert.throws(()=>draftPersonalMealAdd(start,foods,{foodId:"fake",quantity:50}),/catálogo/);
assert.throws(()=>draftPersonalMealAdd(start,[...foods,foods[0]],{foodId:"tuna",quantity:50}),/catálogo/);
assert.throws(()=>draftPersonalMealAdd(draftPersonalMealAdd(start,foods,{foodId:"tuna",quantity:50}),foods,
 {foodId:"tuna",quantity:50}),/ya figura/);
assert.throws(()=>draftPersonalMealChange(start,foods,{foodId:"tuna",quantity:0}),/no figura/);
assert.throws(()=>previewPersonalMeal({...start,items:[{foodId:"rice",quantity:30,group:"protein"}]},foods),/categoría cambió/);
assert.throws(()=>previewPersonalMeal({...start,items:[
 {foodId:"tart",quantity:50,group:"prepared"},{foodId:"tart",quantity:50,group:"prepared"}]},foods),/dos veces/);
assert.throws(()=>newPersonalMealDraft({day:"2026-11-31",slot:"almuerzo"}),/fecha válidas/);
assert.throws(()=>newPersonalMealDraft({day:date,slot:"merienda"}),/comida y fecha/);
assert.throws(()=>draftPersonalMealOmit(start,foods,"other"),/solo en comidas principales/);
for(const slot of PERSONAL_MEALS.map(m=>m.id)){
 const empty=newPersonalMealDraft({day:date,slot});
 const r=previewPersonalMeal(empty,foods);
 assert.deepEqual(r.totals,{k:0,p:0,c:0,f:0,fi:0});
 if(["media_manana","media_tarde"].includes(slot)){
  assert.equal(r.groups,null,"Snacks retain the classic picker, no compulsory group");
  assert.throws(()=>draftPersonalMealOmit(empty,foods,"protein"),/solo en comidas principales/);
  assert.equal(previewPersonalMeal(draftPersonalMealAdd(empty,foods,{foodId:"banana",quantity:100}),foods).totals.k,89);
 }else assert.ok(r.groups?.length===4);
}
assert.ok(!Object.hasOwn(preview,"student_id")&&!Object.hasOwn(preview,"user_id"),
 "Draft previews must not become implicit authenticated write payloads.");
console.log("PASS NUT-60 Personal: 5 meals, 3 main group pickers, unchanged snacks, omit dedicated categories, prepared counted once, bounded portions, immutable offline drafts, NO writes.");
