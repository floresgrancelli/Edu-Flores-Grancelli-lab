import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GUIDED_MEAL_GROUPS,GUIDED_MEAL_SLOTS,isGuidedMealSlot,guidedMealGroupFor,guidedMealTotals,guidedMealMarks} from "../pilot/guided-meal-picker.js";
import {educationalGuideSections} from "../pilot/guide-meal-education.js";
import {guideTotals} from "../pilot/guided-day.js";
const src=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
const weekly=readFileSync(new URL("../pilot/weekly-consistency.js",import.meta.url),"utf8");
assert.deepEqual(GUIDED_MEAL_SLOTS,["desayuno","almuerzo","cena"]);
for(const meal of ["media_manana","media_tarde","merienda"])assert.equal(isGuidedMealSlot(meal),false,meal+" MUST keep classic picker");
assert.deepEqual(GUIDED_MEAL_GROUPS.map(x=>x.id),["protein","carb","prepared","other"]);
const group=(name,category,id)=>guidedMealGroupFor({name,id},category);
assert.equal(group("Atún al natural","protein","tuna"),"protein");
assert.equal(group("Pan integral","carb","bread"),"carb");
assert.equal(group("Tarta de atún","prepared","tarta_atun"),"prepared");
assert.equal(group("Sushi en piezas","prepared","sushi"),"prepared");
assert.equal(group("Pizza","prepared","pizza"),"prepared");
assert.equal(group("Empanada de carne","prepared","empanada"),"prepared");
assert.equal(group("Tarta de atún","protein","tarta_atun"),"prepared","mixed dishes must override individual protein tag");
assert.equal(group("Rúcula","vegetable","rocket"),"other");
assert.equal(group("Aceite de oliva","fat","oil"),"other");
const totals=guidedMealTotals([{id:"tuna_tart",k:320,p:22,c:28,f:14,fi:3},{id:"rice",k:120,p:3,c:25,f:1,fi:1}]);
assert.deepEqual(totals,{k:440,p:25,c:53,f:15,fi:4},"mixed plate counted once, fats automatically from both entries");
assert.deepEqual(guidedMealMarks({}, "desayuno"),{protein:false,carb:false});
assert.deepEqual(guidedMealMarks({_guidedComponents:{desayuno:{protein:true}}},"desayuno"),{protein:true,carb:false});
assert.match(src,/const guided=isGuidedMealSlot\(slot\)/);
assert.match(src,/guidedMealGroupFor\(f,groupIdFor\(f\)\)===activeGuidedMealGroup/);
assert.match(src,/data-mealomit/);
assert.match(src,/data-act="guidedMealGroup" data-mealgroup/,"Category buttons must reach delegated action router");
assert.match(src,/data-act="guidedMealOmit" data-mealomit/,"Omit buttons must reach delegated action router");
assert.match(src,/data-act="saveSelectedMealContinue"/);
assert.match(src,/async function saveSelectedMeal\(continueGuided=false\)/);
assert.match(src,/d\.skipped\._guidedComponents\[slot\]/);
assert.match(src,/const guidedPanel=guided\?/);
assert.match(src,/data-mealsuggestion/,"food results must be actionable");
assert.match(src,/pickMealSearchSuggestion\(el\.dataset\.mealsuggestion\)/,"suggestions must reach real food selection");
assert.match(html,/pilot\.js\?v=20261029-uxguide1/,"force new meal picker script on release");
assert.match(src,/Grasas registradas en esta comida/);
assert.match(html,/guided-meal-picker\.css\?v=20261029-uxguide1/);
assert.match(src,/guided-meal-picker\.js\?v=20261029-uxmeals1/);
assert.match(weekly,/draw\("ideal","OBJETIVO CUMPLIDO · ±5%"/);
assert.doesNotMatch(weekly,/ZONA IDEAL · ±5%|OBJETIVO CUMPLIDO · ±10%|WEEKLY_RANGES\.acceptable/);
assert.match(weekly,/const acceptable=ideal;/);
// UX-GUIDE-01: cada alimento de la guía se presenta en UN grupo sin alterar
// el objeto almacenado, el índice de edición ni los nutrientes agregados.
const testMeal={slot:"almuerzo",label:"Almuerzo",items:[
 {id:"tarta_atun",name:"Tarta de atún",category:"protein",qty:150,unit:"g",k:2,p:.15,c:.2,f:.08,fi:.01},
 {id:"rice",name:"Arroz integral",category:"carb",qty:100,unit:"g",k:1.3,p:.03,c:.27,f:.01,fi:.02},
 {id:"chicken",name:"Pollo",category:"protein",qty:130,unit:"g",k:1.65,p:.31,c:0,f:.04,fi:0},
 {id:"rocket",name:"Rúcula",category:"vegetable",qty:40,unit:"g",k:.25,p:.025,c:.03,f:.007,fi:.015}
]};
const beforeGuide=JSON.stringify(testMeal);
const beforeNumbers=guideTotals({meals:[testMeal]}).totals;
const guideSections=educationalGuideSections(testMeal,food=>food.category);
assert.deepEqual(guideSections.map(g=>g.id),["protein","carb","prepared","other"]);
assert.deepEqual(Object.fromEntries(guideSections.map(g=>[g.id,g.entries.map(e=>e.food.id)])),{
 protein:["chicken"],carb:["rice"],prepared:["tarta_atun"],other:["rocket"]
});
assert.deepEqual(guideSections.flatMap(g=>g.entries.map(e=>e.index)).sort((a,b)=>a-b),[0,1,2,3],"do not lose/duplicate any food or original editable index");
assert.equal(guideSections.find(g=>g.id==="prepared").entries[0].index,0,"mixed dish editor must keep its original slot:0");
assert.equal(JSON.stringify(testMeal),beforeGuide,"grouping cannot change the approved meal or stored plan");
assert.deepEqual(guideTotals({meals:[testMeal]}).totals,beforeNumbers,"render-only education must leave macros intact");
for(const slot of ["desayuno","almuerzo","cena"]){
 const sections=educationalGuideSections({slot,items:[]});
 assert.deepEqual(sections.map(x=>x.id),["protein","carb"],"empty educational sources remain explained");
}
for(const slot of ["media_manana","media_tarde","merienda"])
 assert.equal(educationalGuideSections({slot,items:testMeal.items}),null,"snacks/afternoon must keep unchanged classic guide");
assert.match(src,/educationalGuideSections\(meal,groupIdFor\)/);
assert.match(src,/foodRow\(food,index\)/,"coach must edit original indexed food");
assert.match(src,/data-guidefoodgroup/,"educational groups must reach the actual coach/student renderer");
assert.match(html,/guided-meal-picker\.css\?v=20261029-uxguide1/);
assert.match(src,/guide-meal-education\.js\?v=20261029-uxguide1/);
console.log("PASS UX-GUIDE-01: coach/student shared guide main meals by group, originals intact; snacks classic; mixed food once; macro totals unchanged.");
console.log("PASS: guided only breakfast/lunch/dinner; mixed plates counted once incl fats; optional skip, all other foods accessible; snacks remain classic; one 5% weekly bar.");
