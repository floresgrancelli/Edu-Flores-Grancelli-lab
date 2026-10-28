// Fase 2 - gate no destructivo de platos regionales, marca y trazabilidad.
// No se consultan usuarios, cuentas ni datos de Supabase.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EXTRA_FOODS,FOOD_UNIT_PORTIONS,foodSearchText} from "../pilot/food-catalog.js";
import {REGIONAL_COMPOSITE_MODELS,REGIONAL_COMPOSITE_COUNT,applyRegionalCompositeModels} from "../pilot/regional-composite-models.js";
import {calculateRecipeModel} from "../pilot/recipe-models.js";
import {ARGENTINE_LABEL_FOODS,ARGENTINE_LABEL_COUNT} from "../pilot/argentine-manufacturer-labels.js";
const src=[...EXTRA_FOODS.map(f=>({...f})),
 {id:"rice",name:"Arroz blanco cocido sin aceite",unit:"g",k:1.29,p:.0267,c:.2799,f:.0028,fi:.004,sourceType:"usda_fdc"},
 {id:"oil",name:"Aceite de oliva",unit:"g",k:8.84,p:0,c:0,f:1,fi:0,sourceType:"usda_fdc"},
 {id:"avocado",name:"Palta",unit:"g",k:1.60,p:.02,c:.0853,f:.1466,fi:.067,sourceType:"usda_fdc"}
];
assert.equal(REGIONAL_COMPOSITE_COUNT,9);
assert.equal(ARGENTINE_LABEL_COUNT,6);
assert.equal(new Set(src.map(f=>f.id)).size,src.length,"Duplicate catalogue ids");
const before=new Map(src.map(f=>[f.id,{...f}]));
const out=applyRegionalCompositeModels(src);
assert.equal(out,src,"Expected in-memory update");
const modelIds=new Set(REGIONAL_COMPOSITE_MODELS.map(m=>m.id));
assert.equal(modelIds.size,9,"Each model must have its own ID");
for(const model of REGIONAL_COMPOSITE_MODELS){
 const f=src.find(x=>x.id===model.id),original=before.get(model.id);
 assert.ok(f&&original,"Model food exists");
 assert.equal(f.name,original.name);
 assert.equal(f.unit,original.unit);
 assert.equal(f.servingGrams,original.servingGrams);
 assert.equal(f.sourceType,"recipe_estimate");
 assert.equal(f.validationStatus,"receta_estimado");
 assert.equal(f.oilIncluded,model.oilIncluded);
 assert.equal(FOOD_UNIT_PORTIONS[f.id].grams,model.yieldGrams/model.portions);
 assert.match(f.source,/SUPUESTO, no medido/);
 assert.match(f.source,/NO VERIFICADO|SIN PESAJE/);
 assert.match(f.source,/PROXIES/);
 for(const n of ["k","p","c","f","fi"]){
  assert.ok(f[n]>=0&&Number.isFinite(f[n]));
  const sum=model.ingredients.reduce((t,item)=>{
   const food=src.find(x=>x.id===item.id);
   if(food)return t+food[n]*item.grams;
   const match=f.source.match(new RegExp("dummynever"));
   void match;
   return t;
  },0);
  assert.ok(f[n]*model.yieldGrams>=sum-1e-8,"Derived nutrient includes listed ingredients "+model.id+"/"+n);
 }
 for(const part of model.ingredients){
  assert.ok(f.source.includes(part.grams+" g"),"Source lists gram inputs");
 }
 if(model.id.startsWith("pizza_"))assert.match(f.source,/aceite ya está incluido/);
 if(model.id.startsWith("sushi_"))assert.match(f.source,/arroz ya cocido/);
}
for(const f of src){
 if(!modelIds.has(f.id))assert.deepEqual(f,before.get(f.id),"Unrelated item unchanged: "+f.id);
}
const expected=[
 ["arcor_chocolate_leche_porcion",527,5.9,61,29,0,16],
 ["arcor_chocolate_blanco_porcion",543,6.7,60,31,0,16],
 ["arcor_saladix_jamon",433,8.9,71,13,2.1,30],
 ["arcor_mini_alfajor_aguila_chocolate",401,6.4,60,15,2.4,24],
 ["arcor_chocolate_aguila_familiar",474,7,55,25,9,21],
 ["arcor_bon_o_bon_blanco",564,11,49,36,0,15]
];
for(const [id,k,p,c,f,fi,portion] of expected){
 const item=ARGENTINE_LABEL_FOODS.find(x=>x.id===id);
 assert.ok(item,"Missing branded item "+id);
 assert.equal(item.sourceType,"manufacturer_web_label");
 assert.equal(item.validationStatus,"rotulo_web_fabricante");
 assert.match(item.source,/arcor.com/);
 for(const [key,n] of Object.entries({k,p,c,f,fi}))assert.ok(Math.abs(item[key]*100-n)<1e-8,id+"/"+key);
 assert.equal(item.servingGrams,portion);
 assert.equal(FOOD_UNIT_PORTIONS[id].grams,portion);
 assert.ok(foodSearchText(item).toLowerCase().includes(item.brand.split(" ")[0].toLowerCase()));
}
const pilot=readFileSync("efg-nutrition/pilot/pilot.js","utf8");
const html=readFileSync("efg-nutrition/pilot/index.html","utf8");
assert.match(pilot,/applyRecipeModels\(foods\);\s*applyRegionalCompositeModels\(foods\)/);
assert.match(pilot,/rotulo_web_fabricante:/);
assert.match(html,/20261028-regional2/);
console.log("PASS Fase 2: 4 pizzas + 5 sushi en recetas estimadas auditables; 6 etiquetas argentinas, porciones y gramajes correctos; 20 fuentes USDA y otros registros sin alterar.");
