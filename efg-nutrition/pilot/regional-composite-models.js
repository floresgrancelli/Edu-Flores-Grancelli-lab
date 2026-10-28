// Fase 2 — composición orientativa de pizzas y sushi argentinos.
// No son productos analizados, recetas caseras medidas ni equivalentes universales.
// Las bases de pizza, alga, vinagre y azúcar son proxies ESTIMADOS; el arroz es ya cocido.
// Cada ingrediente y el rendimiento final SUPUESTO se muestran al usuario.
// No modifica la comida histórica persistida, solo los modelos de la sesión actual.
import {calculateRecipeModel} from "./recipe-models.js";

const PROXIES=Object.freeze([
 {id:"pizza_base_efg",name:"Base de pizza horneada genérica (sin toppings, PROXY)",unit:"g",k:2.65,p:.085,c:.50,f:.03,fi:.022,sourceType:"generic_estimate"},
 {id:"sushi_nori_efg",name:"Alga nori (estimación)",unit:"g",k:3.5,p:.35,c:.35,f:.02,fi:.25,sourceType:"generic_estimate"},
 {id:"sushi_azucar_efg",name:"Azúcar de condimentación (estimación)",unit:"g",k:4,p:0,c:1,f:0,fi:0,sourceType:"generic_estimate"},
 {id:"sushi_vinagre_efg",name:"Vinagre de arroz (estimación)",unit:"g",k:.18,p:0,c:.04,f:0,fi:0,sourceType:"generic_estimate"}
]);
const rows=[
 // ID | rendimiento final supuesto g | unidades | aceite incluido | ingredientes id, gramos | interpretación
 ["pizza_margarita",880,8,true,[["pizza_base_efg",480],["mozzarella",240],["tomato",140],["oil",20]],"Pizza margarita con base común, mozzarella, tomate y aceite; sin contar otro aceite."],
 ["pizza_jamon",1000,8,true,[["pizza_base_efg",500],["mozzarella",230],["ham_cooked",180],["tomato",70],["oil",20]],"Pizza de jamón y mozzarella; no incluye salsa extra ni aderezos."],
 ["pizza_fugazza",880,8,true,[["pizza_base_efg",510],["onion",335],["oil",35]],"Fugazza sin queso; cebolla y aceite ya contados."],
 ["pizza_vegana",920,8,true,[["pizza_base_efg",520],["onion",120],["bellpepper",100],["tomato",150],["oil",30]],"Pizza sin queso con cebolla, morrón, tomate y aceite incluido."],
 ["sushi_maki_salmon",224,8,false,[["rice",150],["sushi_sashimi_salmon",60],["sushi_nori_efg",3],["sushi_azucar_efg",5],["sushi_vinagre_efg",6]],"Ocho piezas de maki con arroz COCIDO, salmón orientativo, nori y aliño. No incluye soja, wasabi ni salsas."],
 ["sushi_maki_atun",224,8,false,[["rice",150],["sushi_sashimi_atun",60],["sushi_nori_efg",3],["sushi_azucar_efg",5],["sushi_vinagre_efg",6]],"Ocho maki con arroz cocido, atún orientativo, nori y aliño. No incluye salsa de soja."],
 ["sushi_philadelphia",256,8,false,[["rice",150],["sushi_sashimi_salmon",55],["cream_cheese_regular",38],["sushi_nori_efg",3],["sushi_azucar_efg",4],["sushi_vinagre_efg",6]],"Ocho piezas con queso untable tradicional genérico; marcas y contenido real varían."],
 ["sushi_nigiri_salmon",280,8,false,[["rice",190],["sushi_sashimi_salmon",80],["sushi_azucar_efg",4],["sushi_vinagre_efg",6]],"Ocho nigiri salmón sobre arroz cocido condimentado. No incluye salsa de soja."],
 ["sushi_uramaki_palta",264,8,false,[["rice",160],["sushi_sashimi_salmon",48],["avocado",48],["sushi_nori_efg",3],["sushi_azucar_efg",2],["sushi_vinagre_efg",3]],"Ocho uramaki salmón y palta; sin mayonesa ni salsas."]
];
export const REGIONAL_COMPOSITE_MODELS=Object.freeze(rows.map(([id,yieldGrams,portions,oilIncluded,ingredients,note])=>Object.freeze({
 id,yieldGrams,portions,oilIncluded,note,
 ingredients:Object.freeze(ingredients.map(([foodId,grams])=>Object.freeze({id:foodId,grams})))
})));
export const REGIONAL_COMPOSITE_COUNT=REGIONAL_COMPOSITE_MODELS.length;

export function applyRegionalCompositeModels(foods){
 const targets=new Map(foods.map(f=>[f.id,f]));
 const components=[...foods,...PROXIES];
 if(new Set(components.map(x=>x.id)).size!==components.length)throw Error("Proxy de receta solapa un alimento real");
 for(const model of REGIONAL_COMPOSITE_MODELS){
  const f=targets.get(model.id);
  if(!f||f.sourceType!=="generic_estimate"||f.validationStatus!=="generico_pendiente")
   throw Error("La receta no puede reemplazar datos previamente verificados: "+model.id);
  const r=calculateRecipeModel(model,components);
  if(Math.abs(Number(f.servingGrams)-r.portionGrams)>1e-9)
   throw Error("La porción existente no concuerda con el modelo: "+model.id);
  for(const key of ["k","p","c","f","fi"])f[key]=r.perGram[key];
  f.sourceType="recipe_estimate";
  f.validationStatus="receta_estimado";
  f.oilIncluded=model.oilIncluded;
  f.source="MODELO ORIENTATIVO SIN PESAJE NI ANÁLISIS. "+model.note+" "+
   "Ingredientes del EJEMPLO: "+r.ingredients.map(i=>i.name+" "+i.grams+" g").join("; ")+". "+
   "Peso final SUPUESTO, no medido: "+model.yieldGrams+" g; "+
   model.portions+" unidades de "+r.portionGrams+" g. "+
   "Los valores energéticos y macronutrientes proceden de la suma de ingredientes / peso final; "+
   "la base de pizza y el aliño del sushi son PROXIES, no muestras analizadas. "+
   "El sushi usa arroz ya cocido; no es arroz crudo. "+
   "No hay factores de retención por cocción ni ajustes de humedad específicos. "+
   (model.oilIncluded?"El aceite ya está incluido; no duplicarlo. ":"Las salsas y aderezos no están incluidos; registralos aparte. ")+
   "Si conocés tu preparación, pesá ingredientes y rendimiento real, y corregí los gramos consumidos.";
 }
 return foods;
}
