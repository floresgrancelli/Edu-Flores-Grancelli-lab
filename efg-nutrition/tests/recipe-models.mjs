// Fase 2: modelos de tartas auditables, nunca venderlos como fichas analíticas.
import assert from "node:assert/strict";
import {EXTRA_FOODS,FOOD_UNIT_PORTIONS} from "../pilot/food-catalog.js";
import {RECIPE_MODELS,RECIPE_MODEL_COUNT,calculateRecipeModel,applyRecipeModels} from "../pilot/recipe-models.js";
const source=[...EXTRA_FOODS.map(f=>({...f})),
 {id:"tuna",name:"Atún al natural escurrido",unit:"g",k:1.16,p:.26,c:0,f:.01,fi:0,sourceType:"generic_estimate"},
 {id:"oil",name:"Aceite de oliva",unit:"g",k:8.84,p:0,c:0,f:1,fi:0,sourceType:"usda_fdc"}
];
const before=new Map(source.map(x=>[x.id,{...x}]));
assert.equal(RECIPE_MODEL_COUNT,4);
assert.equal(new Set(RECIPE_MODELS.map(x=>x.id)).size,4);
for(const model of RECIPE_MODELS){
 const calc=calculateRecipeModel(model,source);
 assert.equal(calc.portionGrams,FOOD_UNIT_PORTIONS[model.id].grams,"Serving must remain unchanged");
 assert.ok(calc.ingredients.some(x=>x.id==="tapa_tarta"),"Must include crust");
 assert.ok(calc.ingredients.some(x=>x.id==="oil"),"Oil must be explicitly accounted");
 for(const k of ["k","p","c","f","fi"]){
  const sum=calc.ingredients.reduce((total,x)=>{
   const food=source.find(f=>f.id===x.id);
   return total+food[k]*x.grams;
  },0);
  assert.ok(Math.abs(calc.totals[k]-sum)<1e-8,"Sum ingredients for "+model.id+"/"+k);
  assert.ok(Math.abs(calc.perGram[k]-sum/model.yieldGrams)<1e-8,"Divide by illustrative yield for "+model.id+"/"+k);
 }
}
const out=applyRecipeModels(source);
assert.equal(out,source);
for(const model of RECIPE_MODELS){
 const item=source.find(f=>f.id===model.id),orig=before.get(model.id);
 assert.equal(item.id,orig.id,"IDs do not change");
 assert.equal(item.name,orig.name,"Food visible name stays stable");
 assert.equal(item.unit,orig.unit,"Food unit stays stable");
 assert.equal(item.servingGrams,orig.servingGrams,"Previously used gram estimates do not change");
 assert.equal(item.sourceType,"recipe_estimate");
 assert.equal(item.validationStatus,"receta_estimado");
 assert.equal(item.oilIncluded,true);
 assert.ok(!item.sourceId,"Model recipe must not claim single USDA ID");
 assert.match(item.source,/NO VERIFICADO POR PESAJE/);
 assert.match(item.source,/SUPUESTO, no medido/);
 assert.match(item.source,/no se aplicaron factores de retención específicos/);
 assert.match(item.source,/aceite ya está incluido/);
 assert.match(item.source,/pesá todos los ingredientes/);
 for(const ingredient of model.ingredients){
  const food=source.find(x=>x.id===ingredient.id);
  assert.ok(item.source.includes(food.name+" "+ingredient.grams+" g"),"Ingredient trace");
 }
}
for(const food of source){
 if(!RECIPE_MODELS.some(m=>m.id===food.id))
  assert.deepEqual(food,before.get(food.id),"Unrelated food and 20 USDA citations unchanged: "+food.id);
}
for(const f of source.filter(x=>x.sourceType==="recipe_estimate"))
 assert.ok(f.validationStatus==="receta_estimado");
assert.throws(()=>calculateRecipeModel({...RECIPE_MODELS[0],yieldGrams:0},source),/Rendimiento/);
assert.throws(()=>calculateRecipeModel({...RECIPE_MODELS[0],ingredients:[{id:"inexistente",grams:50}]},source),/ingrediente válido/);
console.log("PASS: 4 recipe examples with traceable ingredient grams, non-measured final yield, source labels, portion conservation and no unrelated changes.");
