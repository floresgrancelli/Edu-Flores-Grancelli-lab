// EFG Nutrition Pro — ejemplos auditables de recetas regionales, NO recetas pesadas.
// Metodología FAO/INFOODS: sumar aportes de ingredientes, dividir por peso final.
// Aquí ingredientes y rendimientos finales son SUPUESTOS ILUSTRATIVOS. Hasta pesar
// una preparación real, no presentar valores como análisis validado ni rótulo.
// Se usan ingredientes de la biblioteca existente, con su estado de fuente propio.
const MODELS=[
 {
  id:"tarta_atun_horno",yieldGrams:960,portions:6,
  ingredients:[["tapa_tarta",380],["tuna",320],["onion",200],["egg_boiled",100],["oil",20]],
  note:"Dos tapas de masa (peso orientativo), atún al natural escurrido, cebolla, huevo duro y aceite."
 },
 {
  id:"tarta_atun_light",yieldGrams:930,portions:6,
  ingredients:[["tapa_tarta",220],["tuna",420],["onion",180],["egg_boiled",100],["oil",10]],
  note:"Una sola tapa inferior; sin tapa superior. Atún escurrido, cebolla, huevo y aceite."
 },
 {
  id:"tarta_verdura_espinaca",yieldGrams:960,portions:6,
  ingredients:[["tapa_tarta",350],["spinach_cooked",300],["ricotta_light",180],["mozzarella",90],["egg_boiled",100],["oil",15]],
  note:"Espinaca cocida y escurrida, ricota, mozzarella, huevo, masa y aceite."
 },
 {
  id:"tarta_jamon_queso",yieldGrams:990,portions:6,
  ingredients:[["tapa_tarta",370],["ham_cooked",260],["mozzarella",260],["egg_boiled",110],["oil",12]],
  note:"Jamón cocido, mozzarella, huevo, masa y aceite."
 }
];
export const RECIPE_MODELS=Object.freeze(MODELS.map(m=>Object.freeze({
 ...m,ingredients:Object.freeze(m.ingredients.map(([id,grams])=>Object.freeze({id,grams})))
})));
export const RECIPE_MODEL_COUNT=RECIPE_MODELS.length;
const KEYS=["k","p","c","f","fi"];
export function calculateRecipeModel(model,foods){
 const index=new Map(foods.map(f=>[f.id,f]));
 if(!Number.isFinite(model.yieldGrams)||model.yieldGrams<=0||
    !Number.isInteger(model.portions)||model.portions<1)throw Error("Rendimiento o porciones inválidos");
 const totals=Object.fromEntries(KEYS.map(k=>[k,0]));
 const ingredients=model.ingredients.map(({id,grams})=>{
  const ingredient=index.get(id);
  if(!ingredient||!Number.isFinite(grams)||grams<=0||ingredient.unit!=="g")
   throw Error("Falta un ingrediente válido para receta: "+id);
  for(const k of KEYS){
   const value=Number(ingredient[k]);
   if(!Number.isFinite(value)||value<0)throw Error("Macro inválido en "+id+"/"+k);
   totals[k]+=value*grams;
  }
  return {id,grams,name:ingredient.name,sourceType:ingredient.sourceType};
 });
 return {
  totals,ingredients,
  perGram:Object.fromEntries(KEYS.map(k=>[k,totals[k]/model.yieldGrams])),
  yieldGrams:model.yieldGrams,
  portionGrams:model.yieldGrams/model.portions
 };
}
export function applyRecipeModels(foods){
 const byId=new Map(foods.map(f=>[f.id,f]));
 for(const model of RECIPE_MODELS){
  const target=byId.get(model.id);
  if(!target||target.sourceType!=="generic_estimate"||target.validationStatus!=="generico_pendiente")
   throw Error("No se puede modificar otra categoría de procedencia: "+model.id);
  const result=calculateRecipeModel(model,foods);
  // La porción sigue siendo aproximada y conserva el gramaje del catálogo actual.
  if(target.servingGrams&&Math.abs(target.servingGrams-result.portionGrams)>0.00001)
   throw Error("Rendimiento distinto del gramaje por porción existente: "+model.id);
  for(const k of KEYS)target[k]=result.perGram[k];
  target.sourceType="recipe_estimate";
  target.validationStatus="receta_estimado";
  target.oilIncluded=true;
  target.source="MODELO ILUSTRATIVO DE RECETA, NO VERIFICADO POR PESAJE. "+
   model.note+" Ingredientes de referencia (gramos por tarta): "+
   result.ingredients.map(x=>x.name+" "+x.grams+" g").join("; ")+
   ". Peso final al horno SUPUESTO, no medido: "+model.yieldGrams+" g. "+
   "Rinde "+model.portions+" porciones estimadas de "+result.portionGrams+" g. "+
   "Macros: suma de los valores orientativos del catálogo EFG por ingrediente / peso final supuesto; "+
   "no se aplicaron factores de retención específicos por cocción. "+
   "El aceite ya está incluido en este ejemplo: no duplicarlo. "+
   "La masa, marca, humedad perdida, relleno y aceite real pueden cambiar significativamente el resultado. "+
   "Para mayor precisión, pesá todos los ingredientes y el peso final cocido de tu receta propia.";
 }
 return foods;
}
