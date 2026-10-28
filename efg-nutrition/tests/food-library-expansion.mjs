// Regression for the expanded food library. All fixtures are local and no user data is touched.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync("efg-nutrition/pilot/"+p,"utf8");
const expansion=read("food-expansion.js"),catalog=read("food-catalog.js"),app=read("pilot.js"),html=read("index.html");
assert.doesNotThrow(()=>new Function(expansion.replace(/^export /gm,"")),"Expansion JS syntax must parse");
const exports=new Function(expansion.replace(/^export /gm,"")+"\nreturn {EXPANDED_FOODS,EXPANDED_PORTIONS,EXPANDED_ALIASES,EXPANDED_COUNT};")();
const {EXPANDED_FOODS:foods,EXPANDED_PORTIONS:portions,EXPANDED_ALIASES:aliases,EXPANDED_COUNT:count}=exports;
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
 assert.equal(f.sourceType,"generic_estimate","Never mislabel generic compositions as USDA verified");
 assert.equal(f.validationStatus,"generico_pendiente");
 assert.match(f.source,/Estimación/,"Explain generic uncertainty");
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
assert.match(html,/20261028-foodwide/,"Force iPhone Safari asset update");
console.log("PASS:",count,"new items, no identifier collisions, numeric macros, 7 portion types, searchable aliases, catalog and Safari integration.");
console.log("QA note: prepared dishes are generic estimates; manufacturer labels and weighed recipes remain required for exact entries.");
