// NCC GU-06 · expand recipe portions into canonical food ingredients.
// No persistence, RLS bypass, diary write or claim of nutrition approval.
// Each ingredient remains subject to source review in COACH119.
import {rebalanceGuidedDay} from './guided-day.js?v=ncc-pilot-3a40474052be-android-r8';
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x);
const nutrients=['k','p','c','f','fi'];
export const recipeIngredientLimits=item=>item?.recipeComponent===true?[0.01,1000]:null;
export function addCoachRecipeServing(draft,slot,recipe,servings,catalog,goal,{
 authorizedStudentId=null,authorizedScopedRecipeRead=false,replaceIndex=null
}={}){
 if(draft?.kind!=='flexible_meal_guide'||draft.version!==2||
    !Array.isArray(draft.meals)||draft.meals.length<2||draft.meals.length>6)
  throw Error('Primero prepará una Dieta Guía flexible.');
 const isFit=typeof recipe?.id==='string'&&/^fit-recipe:[A-Za-z0-9_-]{1,100}$/.test(recipe.id);
 const isOwn=typeof recipe?.id==='string'&&/^custom-recipe:[0-9a-f-]{36}$/i.test(recipe.id);
 if((!isFit&&!isOwn)||(isFit&&recipe.privateRecipe===true)||(isOwn&&recipe.privateRecipe!==true))
  throw Error('La receta no corresponde a la biblioteca disponible.');
 if(isOwn&&(recipe.pendingLocal===true||authorizedScopedRecipeRead!==true||
    !UUID.test(authorizedStudentId||'')||recipe.ownerStudentId!==authorizedStudentId))
  throw Error('La receta personal necesita un permiso y lectura firmada del alumno vinculado.');
 if(!Number.isFinite(servings)||servings<0.5||servings>4||!Number.isInteger(servings*2)||
    !Number.isInteger(recipe.recipeBatchPortions)||recipe.recipeBatchPortions<1||recipe.recipeBatchPortions>50||
    !Array.isArray(recipe.recipeIngredients)||recipe.recipeIngredients.length<1||recipe.recipeIngredients.length>15)
  throw Error('Elegí entre media y cuatro porciones de una receta válida.');
 const next=structuredClone(draft),meal=next.meals.find(m=>m.slot===slot);
 if(!meal||!Array.isArray(meal.items)||meal.items.length<1||meal.items.length>15)
  throw Error('El horario seleccionado no existe.');
 // The coach may replace one item with a recipe using the SAME full picker.
 // Remove it only on the cloned draft, then expand canonical components;
 // overlapping ingredients are counted exactly once, never added on top of
 // the food the coach explicitly chose to replace.
 if(replaceIndex!==null){
  if(!Number.isInteger(replaceIndex)||replaceIndex<0||replaceIndex>=meal.items.length)
   throw Error('Elegí un alimento válido para reemplazar con la receta.');
  meal.items.splice(replaceIndex,1);
 }
 const canonical=new Map((catalog||[]).filter(f=>validId(f?.id)).map(f=>[f.id,f]));
 const parts=new Map();
 for(const x of recipe.recipeIngredients){
  if(!validId(x?.foodId)||!Number.isFinite(x?.grams)||x.grams<=0||x.grams>5000||
    !canonical.has(x.foodId))throw Error('Ingrediente desconocido o cantidad inválida en la receta.');
  parts.set(x.foodId,(parts.get(x.foodId)||0)+x.grams);
 }
 const uniqueNew=[...parts.keys()].filter(id=>!meal.items.some(item=>item.id===id));
 if(meal.items.length+uniqueNew.length>15)
  throw Error('La comida supera quince ingredientes; quitá alguno antes de agregar la receta.');
 for(const [foodId,fullBatchQty] of parts){
  const food=canonical.get(foodId);
  if(!['g','ml'].includes(food.unit)||nutrients.some(k=>typeof food[k]!=='number'||!Number.isFinite(food[k])||food[k]<0))
   throw Error('El ingrediente no tiene unidad o valores nutricionales completos.');
  const addQty=Math.round(fullBatchQty*servings/recipe.recipeBatchPortions*1000)/1000;
  const existing=meal.items.find(x=>x.id===foodId);
  const qty=Math.round(((existing?.qty||0)+addQty)*1000)/1000;
  if(addQty<0.01||qty>1000)throw Error('La porción de receta excede los límites por ingrediente.');
  if(existing){
   if(existing.unit!==food.unit||nutrients.some(k=>existing[k]!==food[k]))
    throw Error('El ingrediente de la receta no coincide con la ficha ya elegida.');
   existing.qty=qty;existing.locked=true;existing.recipeComponent=true;
   existing.recipeLabel='Incluye una porción de receta';
  }else meal.items.push({id:food.id,name:food.name,unit:food.unit,qty,locked:true,
   recipeComponent:true,recipeLabel:'De '+recipe.name,
   sourceType:food.sourceType||'generic_estimate',
   validationStatus:food.validationStatus||'generico_pendiente',
   ...Object.fromEntries(nutrients.map(k=>[k,food[k]]))});
 }
 // The original draft is untouched. Optimization may rebalance other foods,
 // NEVER the locked recipe ingredients.
 // The published plan contains only real catalog IDs, no fake recipe ID with ":".
 return rebalanceGuidedDay(next,goal);
}
