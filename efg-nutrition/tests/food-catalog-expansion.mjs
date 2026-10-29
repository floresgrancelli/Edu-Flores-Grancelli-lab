import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EXTRA_FOODS,FOOD_CATEGORIES,FOOD_UNIT_PORTIONS,foodSearchText,EXPANDED_COUNT} from "../pilot/food-catalog.js";
import {EXPANDED_FOODS,EXPANDED_ALIASES,VERIFIED_SOURCE_COUNT} from "../pilot/food-expansion.js";
import {VERIFIED_FOODS} from "../pilot/food-source-audit.js";
import {PLANT_BAKERY_FOODS,PLANT_BAKERY_COUNT,PLANT_BAKERY_PORTIONS} from "../pilot/food-plant-bakery-phase3.js";
const pilot=readFileSync("efg-nutrition/pilot/pilot.js","utf8");
const index=readFileSync("efg-nutrition/pilot/index.html","utf8");
const normalize=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const ids=new Set(EXTRA_FOODS.map(f=>f.id));
const catSet=new Set(FOOD_CATEGORIES.map(c=>c[0]));
assert.ok(EXPANDED_COUNT>=130,"Nutrition catalogue must significantly expand");
assert.equal(EXPANDED_FOODS.length,EXPANDED_COUNT);
assert.equal(ids.size,EXTRA_FOODS.length,"No duplicate food IDs or contradictory records");
assert.equal(new Set(EXPANDED_FOODS.map(f=>f.id)).size,EXPANDED_COUNT);
assert.ok(EXPANDED_FOODS.every(f=>catSet.has(f.category)),"All additions must appear in a visible category");
for(const item of EXPANDED_FOODS){
 for(const k of ["k","p","c","f","fi"]){
  assert.ok(Number.isFinite(item[k])&&item[k]>=0,"Invalid nutrient "+k+" "+item.id);
 }
 assert.ok(item.k>0,"No calorie-free invented food: "+item.id);
 if(VERIFIED_FOODS[item.id]){
  assert.equal(item.sourceType,"usda_fdc","Only identifiable USDA entries may use USDA provenance: "+item.id);
  assert.equal(item.validationStatus,"tabla_referenciada");
  assert.equal(item.sourceId,VERIFIED_FOODS[item.id].sourceId);
  assert.match(item.source,/FDC \d+/);
 }else{
  assert.equal(item.sourceType,"generic_estimate","Estimates must never impersonate analysed samples: "+item.id);
  assert.equal(item.validationStatus,"generico_pendiente","No fabricated verified FDC ID: "+item.id);
  assert.match(item.source,/Estimación/);
 }
 if(item.servingGrams){
  assert.equal(FOOD_UNIT_PORTIONS[item.id]?.grams,item.servingGrams,"Unit serving weight mismatch: "+item.id);
  assert.ok(item.servingGrams>=3&&item.servingGrams<=400,"Check realistic unit size "+item.id);
 }
}
const find=id=>id==="pumpkin"?{id:"pumpkin",name:"Calabaza cocida"}:EXTRA_FOODS.find(f=>f.id===id);
assert.match(pilot,/id:"pumpkin",name:"Calabaza cocida"/,"Main catalogue must still contain the existing pumpkin");
for(const [query,id] of [
 ["zapallo","pumpkin"],
 ["zapallo","zapallo_anco_hervido"],
 ["anco","zapallo_anco_hervido"],
 ["kabutia","zapallo_cabutia_horno"],
 ["tarta atun","tarta_atun_horno"],
 ["tarta verdura","tarta_verdura_acelga"],
 ["sushi","sushi_maki_salmon"],
 ["philadelphia","sushi_philadelphia"],
 ["maki atun","sushi_maki_atun"],
 ["pizza","pizza_jamon"],
 ["fugazzeta","pizza_fugazzeta"],
 ["helado chocolate","helado_chocolate"],
 ["gomitas","gomitas_frutales"],
 ["alfajor","alfajor_chocolate_triple"],
 ["chocotorta","chocotorta"],
 ["chocolate amargo","chocolate_amargo_70"]
]){
 const food=find(id);
 assert.ok(food,"Missing "+id);
 const hay=normalize(foodSearchText(food));
 assert.ok(query.split(" ").every(word=>hay.includes(normalize(word))),"Query "+query+" cannot find "+food.name);
}
for(const [id,grams] of [["sushi_maki_salmon",28],["sushi_nigiri_salmon",35],["pizza_jamon",125],["tarta_atun_horno",160],["gomitas_frutales",4],["helado_chocolate",75]]){
 assert.equal(FOOD_UNIT_PORTIONS[id]?.grams,grams,"Wrong weight or missing unit "+id);
 const f=find(id);
 assert.ok(f.k*grams>=.01);
}
assert.ok(pilot.includes("foodSearchText(f)"),"Student/coach/planner must use shared synonyms");
assert.match(index,/name="efg-build" content="202610(?:28-regional2(?:-luxury-pro-(?:rc1|r1))?|29-(?:seats-visible-r1|coach-commercial-r[12]))"/,"Versioned iPhone build marker required");
assert.ok(index.includes("luxury-theme.css?v=20261029-coach-commercial-r2"),"Luxury CSS must be cache-busted for iPhone");
assert.equal(VERIFIED_SOURCE_COUNT,20);
assert.ok(EXPANDED_ALIASES.sushi_maki_salmon.includes("maki salmon"));
console.log("PASS expanded catalogue: "+EXPANDED_COUNT+" new foods, "+EXTRA_FOODS.length+" existing extension foods, units, source flags, synonyms and numeric macros");

// Phase 3 catalog: bakery + proteins without duplicating the existing tofu,
// tempeh, seitan, legumes or the gummy candies that were already available.
assert.equal(PLANT_BAKERY_COUNT,16);
assert.equal(PLANT_BAKERY_FOODS.length,16);
assert.equal(new Set(PLANT_BAKERY_FOODS.map(f=>f.id)).size,16);
assert.ok(PLANT_BAKERY_FOODS.every(f=>EXTRA_FOODS.some(entry=>entry.id===f.id)));
assert.ok(PLANT_BAKERY_FOODS.every(f=>f.sourceType==="generic_estimate"&&f.validationStatus==="generico_pendiente"));
assert.ok(PLANT_BAKERY_FOODS.every(f=>/NO representa una marca/.test(f.source)&&!f.sourceId));
assert.ok(PLANT_BAKERY_FOODS.every(f=>["bakery","prepared","legumes","plant"].includes(f.category)));
assert.ok(PLANT_BAKERY_FOODS.every(f=>["k","p","c","f","fi"].every(k=>Number.isFinite(f[k])&&f[k]>=0)));
for(const f of PLANT_BAKERY_FOODS){
 assert.ok(f.k>0&&f.k<8,"Plausible per-gram energy range: "+f.id);
 assert.equal(FOOD_UNIT_PORTIONS[f.id]?.grams,PLANT_BAKERY_PORTIONS[f.id]?.grams);
 const derived=(f.p*4+f.c*4+f.f*9);
 assert.ok(Math.abs(f.k-derived)<.01,"Consistent calorie estimate: "+f.id);
}
for(const [query,id] of [
 ["pan comun de panaderia","pan_frances"],["pan mignon","pan_mignon_panaderia"],
 ["pan de campo","pan_campo_panaderia"],["ositos","gomitas_frutales"],
 ["gomitas acidas","gomitas_acidas"],["golosinas","gomitas_frutales"],
 ["tofu ahumado","tofu_ahumado_generic"],["lentejas rojas","lentils_red_cooked"],
 ["porotos mung","mung_beans_cooked"],["hamburguesa vegana soja","soy_tvp_burger_home"],
 ["albondigas veganas","soy_tvp_meatballs_home"],["tortilla vegana","chickpea_omelette_home"],
 ["pasta legumbres","lentil_pasta_dry_generic"],["yogur vegano","soy_yogurt_plain_generic"]
]){
 const food=find(id);
 assert.ok(food,"Missing catalog record "+id);
 const hay=normalize(foodSearchText(food));
 assert.ok(query.split(" ").every(word=>hay.includes(normalize(word))),"Search "+query+" failed for "+id);
}
assert.ok(FOOD_CATEGORIES.some(([id,label])=>id==="candy"&&/Golosinas/.test(label)),"Golosinas needs its own visible category");
for(const id of ["gomitas_frutales","gomitas_acidas","caramelos_duros","chupetin_dulce","malvaviscos","pastillas_menta"]){
 assert.equal(find(id)?.category,"candy","Candy must appear under Golosinas: "+id);
}
assert.equal(EXTRA_FOODS.filter(f=>f.id==="gomitas_frutales").length,1);
assert.equal(EXTRA_FOODS.filter(f=>f.id==="pan_frances").length,1);
assert.equal(EXTRA_FOODS.filter(f=>f.id==="tofu_firm").length,1);
console.log("PASS phase 3: 16 new regional/plant foods, transparent estimates, pan común & gomitas synonyms and no duplicate IDs.");
