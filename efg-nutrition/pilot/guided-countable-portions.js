// Explicit whole-food guide rules, not a guess from names or household labels.
// The catalog remains the only source of grams per unit. Slices, scoops and
// recipe portions may legitimately be fractional and are not opted in here.
import {FOOD_UNIT_PORTIONS} from './food-catalog.js?v=ncc-pilot-3a40474052be-catalog-android-r9';
const wholeFoods=Object.freeze({egg:Object.freeze({minUnits:1,maxUnits:3})});
export function guidedCountablePortion(id){
 if(!Object.hasOwn(wholeFoods,id))return null;
 const rule=wholeFoods[id];
 const grams=FOOD_UNIT_PORTIONS[id]?.grams;
 if(!Number.isFinite(grams)||grams<=0)throw Error('Falta la equivalencia de la unidad contable.');
 return {grams,min:rule.minUnits*grams,max:rule.maxUnits*grams};
}
export function normalizeGuidedCountableQuantity(item){
 if(item?.recipeComponent===true)return item.qty;
 const rule=guidedCountablePortion(item?.id);if(!rule)return item.qty;
 if(item.unit&&item.unit!=='g')throw Error('La unidad del alimento contable no coincide con su ficha en gramos.');
 const qty=Number(item.qty);
 if(!Number.isFinite(qty))throw Error('La cantidad del alimento contable es inválida.');
 const normalized=Math.max(rule.min,Math.min(rule.max,Math.round(qty/rule.grams)*rule.grams));
 if(item.locked===true&&Math.abs(normalized-qty)>1e-8)
  throw Error('La cantidad fijada de '+String(item.name||item.id)+' necesita unidades enteras. Revisala antes de recalcular; no se modificó automáticamente.');
 return normalized;
}
