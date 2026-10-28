// Regression for the expanded food library. All fixtures are local and no user data is touched.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EXPANDED_FOODS as auditedFoods,EXPANDED_PORTIONS,EXPANDED_ALIASES,EXPANDED_COUNT,VERIFIED_SOURCE_COUNT} from "../pilot/food-expansion.js";
import {VERIFIED_FOODS} from "../pilot/food-source-audit.js";
const read=p=>readFileSync("efg-nutrition/pilot/"+p,"utf8");
const expansion=read("food-expansion.js"),catalog=read("food-catalog.js"),app=read("pilot.js"),html=read("index.html");
const foods=auditedFoods,portions=EXPANDED_PORTIONS,aliases=EXPANDED_ALIASES,count=EXPANDED_COUNT;
assert.equal(VERIFIED_SOURCE_COUNT,20,"Four batches include 20 reference foods");
assert.equal(count,foods.length);
assert.ok(count>=130,"Expanded list should have at least 130 options");
const ids=foods.map(f=>f.id);
assert.equal(new Set(ids).size,ids.length,"No duplicate new food IDs");
const originalIds=[...catalog.matchAll(/\["([a-z0-9_]+)","/g)].map(m=>m[1]);
assert.deepEqual(ids.filter(id=>originalIds.includes(id)),[],"No ID collisions with existing foods");
for(const f of foods){
 assert.ok(f.name&&["prepared","bakery","dessert","vegetable","protein"].includes(f.category),"Food category/name valid: "+f.id);
 for(const n of ["k","p","c","f","fi"])assert.ok(Number.isFinite(f[n])&&f[n]>=0,"Nutrition must be nonnegative finite: "+f.id+" "+n);
 assert.ok(f.k>0&&f.k<9,"Gross per-gram calories plausibly bounded: "+f.id);
 if(VERIFIED_FOODS[f.id]){
  assert.equal(f.sourceType,"usda_fdc","Cotejada debe citar USDA: "+f.id);
  assert.equal(f.validationStatus,"tabla_referenciada");
  assert.equal(f.sourceId,VERIFIED_FOODS[f.id].sourceId);
  assert.match(f.source,/FDC [0-9]+/);
 }else{
  assert.equal(f.sourceType,"generic_estimate","Unverified dish must stay an estimate: "+f.id);
  assert.equal(f.validationStatus,"generico_pendiente");
  assert.match(f.source,/Estimación/,"Explain generic uncertainty");
 }
}
for(const id of ["zapallo_anco_hervido","zapallo_cabutia_horno","tarta_atun_horno","tarta_verdura_acelga","sushi_maki_salmon","sushi_nigiri_salmon","pizza_jamon","helado_chocolate","chocolate_leche","gomitas_frutales","chocotorta","brownie_chocolate","flan_huevo_caramelo"]){
 assert.ok(ids.includes(id),"Missing key new food "+id);
}
for(const id of ["sushi_maki_salmon","sushi_nigiri_salmon","pizza_jamon","tarta_atun_horno","helado_chocolate","chocolate_leche","gomitas_frutales"]){
 const f=foods.find(f=>f.id===id),p=portions[id];
 assert.ok(p&&p.grams>0&&p.label,"Must record per-piece serving: "+id);
 assert.ok(f.k*p.grams>0,"Piece energy is positive "+id);
}
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const search=(query)=>foods.filter(f=>norm(f.name+" "+(aliases[f.id]||[]).join(" ")).includes(norm(query)));
assert.ok(search("tarta de atun").some(f=>f.id==="tarta_atun_horno"));
assert.ok(search("sushi").length>=12,"Sushi variants");
assert.ok(search("gomitas").length>=2);
assert.ok(search("zapallo").some(f=>f.id==="zapallo_anco_hervido"));
assert.ok(search("calabaza").some(f=>f.id==="zapallo_anco_hervido"));
assert.ok(search("pizza").length>=8);
assert.match(catalog,/\.concat\(BRANDED_FOODS,USDA_FDC_ADDITIONS,HOME_EGG_PREPARATIONS,FRUIT_SALAD_FOODS,SEAFOOD_MEDALLION_FOODS,EXPANDED_FOODS\)/);
assert.match(catalog,/Object\.assign\(FOOD_UNIT_PORTIONS,EXPANDED_PORTIONS\)/);
assert.match(app,/foodSearchText\(f\)/,"Search must include regional synonyms");
assert.match(html,/20261028-nutrition-audit4/,"Force iPhone Safari asset update");
const expected={
 zapallo_anco_horno:[169296,40,.90,10.5,.09,3.2],
 helado_crema_americana:[167575,207,3.5,23.6,11,.7],
 helado_chocolate:[168809,216,3.8,28.2,11,1.2],
 chocolate_leche:[167587,535,7.65,59.4,29.66,3.4],
 chocolate_amargo_70:[170273,598,7.79,45.9,42.6,10.9],
 chocolate_mani:[168001,519,13.1,49.7,33.5,4.7],
 chocolate_blanco:[167571,539,5.87,59.2,32.1,.2],
 malvaviscos:[167995,318,1.8,81.3,.2,.1],
 espinaca_hervida:[168463,23,2.97,3.75,.26,2.4],
 acelga_hervida:[170401,20,1.88,4.13,.08,2.1],
 remolacha_hervida:[169146,44,1.68,9.96,.18,2],
 choclo_hervido:[169999,96,3.41,20.98,1.5,2.4],
 chocolate_almendras:[168754,526,9,53.4,34.4,6.2],
 galletitas_chocolate:[172820,481,5.4,66.8,22.6,2.5],
 palomitas_saladas:[170247,500,9,57.2,28.1,10],
 caramelos_duros:[167990,394,0,98,.2,0],
 helado_frutilla_crema:[168810,192,3.2,27.6,8.4,.9],
 galletitas_rellenas:[172718,464,5.21,71,19.1,2.9],
 factura_donut:[172758,421,6.14,47.9,22.7,2.1],
 lemon_pie:[172785,268,1.5,47.2,8.7,1.2]
};
assert.equal(Object.keys(expected).length,VERIFIED_SOURCE_COUNT);
for(const [id,[fdc,k,p,c,f,fi]]of Object.entries(expected)){
 const item=foods.find(food=>food.id===id);
 assert.ok(item,"Audited food missing "+id);
 assert.equal(item.sourceId,String(fdc));
 for(const [key,value]of Object.entries({k,p,c,f,fi}))
  assert.ok(Math.abs(item[key]*100-value)<.00001,"Expected USDA value per 100g "+id+"/"+key+"="+value);
}
assert.equal(foods.filter(food=>food.validationStatus==="generico_pendiente").length,count-VERIFIED_SOURCE_COUNT);
assert.ok(foods.find(f=>f.id==="sushi_maki_salmon").source.includes("Estimación"),"Recipe-based sushi remains estimated");
console.log("PASS:",count,"new items, no identifier collisions, numeric macros, 7 portion types, searchable aliases, catalog and Safari integration.");
console.log("Auditoría Fase 2: "+VERIFIED_SOURCE_COUNT+" cotejadas USDA SR Legacy, "+(count-VERIFIED_SOURCE_COUNT)+" estimaciones sin fingir validación individual. lote 4 con helado de frutilla, galletitas rellenas, donut y lemon pie.");
