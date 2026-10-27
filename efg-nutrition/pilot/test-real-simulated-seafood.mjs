// EFG Nutrition Pro: distinguir saldos reales/simulados y catálogo de pescados.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const url=new URL("./",import.meta.url);
const load=async name=>await readFile(new URL(name,url),"utf8");
const mod=async name=>import("data:text/javascript;base64,"+Buffer.from(await load(name)).toString("base64"));
const {projectNutritionBalance,allPlannerFoods,proposeMeal}=await mod("planner.js");
const {EXTRA_FOODS,FOOD_UNIT_PORTIONS,FOOD_CATEGORIES}=await mod("food-catalog.js");
const goal={k:2200,p:160,c:230,f:70};
const consumed={k:1302.8,p:111.9,c:123,f:40.8};
const chosen={k:686.2,p:53.9,c:106.7,f:4.7};
const before=projectNutritionBalance({goals,consumed});
assert.ok(Math.abs(before.remaining.k-897.2)<.001);
assert.ok(Math.abs(before.remaining.p-48.1)<.001);
assert.equal(before.remaining.c,107);
assert.ok(Math.abs(before.remaining.f-29.2)<.001);
const projected=projectNutritionBalance({goals,consumed,selected:[{food:chosen,grams:1}]});
assert.deepEqual(projected.consumed,before.consumed,"La simulación no altera lo registrado");
assert.deepEqual(projected.remaining,before.remaining,"La simulación no altera el saldo REAL");
assert.ok(Math.abs(projected.projectedRemaining.k-211)<.001);
assert.ok(Math.abs(projected.projectedRemaining.p-0)<.001);
assert.ok(Math.abs(projected.projectedRemaining.c-.3)<.001);
assert.ok(Math.abs(projected.projectedRemaining.f-24.5)<.001);
assert.ok(Math.abs(projected.projectedExceeded.p-5.8)<.001);
const expected=[
 "lenguado_cocido","corvina_cocida","pejerrey_cocido","brotola_cocida",
 "abadejo_cocido","trucha_cocida","besugo_cocido","mero_cocido","tilapia_cocida",
 "merluza_filet_cruda","pulpo_cocido","mejillones_cocidos","almejas_cocidas",
 "vieiras_cocidas","centolla_cocida","camarones_cocidos","rabas_rebozadas_fritas",
 "medallon_pescado_simple","medallon_pescado_rebozado","medallon_salmon_simple",
 "medallon_pollo_simple","medallon_pollo_rebozado","medallon_pollo_espinaca",
 "medallon_cerdo_simple","medallon_cerdo_rebozado","medallon_cerdo_vegetales"
];
for(const id of expected){
 const food=EXTRA_FOODS.find(x=>x.id===id);
 assert.ok(food,"Falta el alimento "+id);
 assert.equal(food.unit,"g");
 assert.equal(food.sourceType,["pulpo_cocido","mejillones_cocidos"].includes(id)?"usda_fdc":"generic_estimate");
 assert.ok(food.k>0&&food.p>=0&&food.c>=0&&food.f>=0);
}
assert.equal(new Set(EXTRA_FOODS.map(x=>x.id)).size,EXTRA_FOODS.length,"No duplicar ids");
assert.equal(EXTRA_FOODS.find(f=>f.id==="pulpo_cocido").k,1.64);
assert.equal(EXTRA_FOODS.find(f=>f.id==="mejillones_cocidos").k,1.72);

assert.ok(FOOD_CATEGORIES[0][1].includes("mariscos"));
for(const id of expected.filter(x=>x.startsWith("medallon_"))){
 assert.equal(FOOD_UNIT_PORTIONS[id].grams,100);
 assert.equal(EXTRA_FOODS.find(x=>x.id===id).servingGrams,100);
}
const all=allPlannerFoods(EXTRA_FOODS,EXTRA_FOODS.map(x=>x.id));
assert.ok(expected.every(id=>all.some(f=>f.id===id)),"Todos disponibles en el planificador");
const chosenMeal=proposeMeal({foods:EXTRA_FOODS,approved:EXTRA_FOODS.map(x=>x.id),
 slot:"cena",remaining:{k:600,p:45,c:45,f:22},
 selections:{"cena|protein":"medallon_pescado_simple","cena|carbs":"potato",
 "cena|vegetable":"none","cena|fat":"none"}});
assert.equal(chosenMeal.rows[0].food.id,"medallon_pescado_simple");
assert.ok(chosenMeal.rows[0].grams>0);
const ui=await load("pilot.js");
assert.ok(ui.includes("projectNutritionBalance({consumed:balance,goals:goal,selected:chosenFoods})"));
assert.ok(ui.includes("Saldo REAL"));
assert.ok(ui.includes("SIMULACIÓN"));
assert.ok(ui.includes("plannerPlannedNumbers")&&ui.includes("plannerRealNumbers"));
console.log("Saldo real/simulado y nuevos pescados/medallones: OK");
