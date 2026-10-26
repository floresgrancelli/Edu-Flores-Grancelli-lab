// Regresión EFG Nutrition: selección de cena, soja Gobinda y alternativa B.
// Ejecutar en la raíz del repositorio: node efg-nutrition/pilot/test-planner.mjs
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const base=new URL("./",import.meta.url);
const load=async name=>await readFile(new URL(name,base),"utf8");
const text=await load("planner.js");
const {FOOD_GROUPS,optionsFor,proposeMeal,makePlan,equivalentPortion}=await import("data:text/javascript;base64,"+Buffer.from(text).toString("base64"));
const catalog=await import("data:text/javascript;base64,"+Buffer.from(await load("food-catalog.js")).toString("base64"));
const gobinda=catalog.EXTRA_FOODS.find(f=>f.id==="milanesa_soy_gobinda");
assert.ok(gobinda && FOOD_GROUPS.protein.includes(gobinda.id),"Gobinda debe aparecer en proteínas");
assert.equal(gobinda.k*125,312,"Una milanesa Gobinda de 125 g = 312 kcal");
const fake=[gobinda,
 {id:"chicken",name:"Pollo",unit:"g",k:1.65,p:.31,c:0,f:.04,fi:0},
 {id:"potato",name:"Papa",unit:"g",k:.87,p:.019,c:.2,f:.001,fi:.018},
 {id:"rocket",name:"Rúcula",unit:"g",k:.25,p:.026,c:.037,f:.007,fi:.016},
 {id:"oil",name:"Aceite",unit:"g",k:8.84,p:0,c:0,f:1,fi:0}
];
const ids=fake.map(f=>f.id);
assert.ok(optionsFor(fake,ids,"protein").some(f=>f.id===gobinda.id));
const selected=proposeMeal({foods:fake,approved:ids,slot:"cena",remaining:{k:950,p:55,c:100,f:30},selections:{"cena|protein":gobinda.id}});
const portion=selected.rows.find(row=>row.category==="protein");
assert.equal(portion.food.id,gobinda.id,"Opción A debe respetar la selección");
assert.ok(portion.grams>0 && portion.grams<=260,"Porciones de cena dentro del límite");
assert.ok(selected.estimate.c>0 && selected.estimate.f>0,"Gobinda aporta carbohidratos y grasas en la planificación");
assert.ok(equivalentPortion(portion.food,portion.grams,fake[1],"protein")?.grams>0,"Alternativa B calcula su equivalencia proteica");
const plan=makePlan({foods:fake,approved:ids,diary:{meals:{},skipped:{}},goals:{k:1200,p:65,c:130,f:40},totals:{k:0,p:0,c:0,f:0},dinnerOnly:true,selections:{"cena|protein":gobinda.id}});
assert.equal(plan.meals[0].rows.find(row=>row.category==="protein").food.id,gobinda.id);
const ui=await load("pilot.js");
assert.match(ui,/state\.plannerSelections\[key\]=e\.target\.value;delete state\.plannerSelections\["alt:"\+key\];refreshPlannerCard\(key,false\)/);
assert.match(ui,/state\.plannerSelections\["alt:"\+key\]=e\.target\.value;refreshPlannerCard\(key,true\)/);
assert.match(ui,/const chosen=select\?\.value\|\|state\.plannerSelections\["alt:"\+key\]/);
assert.ok(!ui.includes('"alt_"+e.target.dataset.planalt'),"Error anterior alt_ ya no debe existir");
assert.match(ui,/function refreshPlannerCard\(/);
console.log("EFG Nutrition: selección A/B, Gobinda y sumatoria de macros: OK");
