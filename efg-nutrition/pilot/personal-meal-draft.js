// NUT-60 · Meal-entry draft for future Personal mode.
// Pure, isolated, OFF. No backend writes, authentication changes or clinical recommendations.
// Reuses the same group labels as Coach/Student while keeping Personal storage separate.
import {GUIDED_MEAL_GROUPS,guidedMealGroupFor,isGuidedMealSlot} from "./guided-meal-picker.js";
import {PERSONAL_MEALS} from "./personal-workspace.js";
export const PERSONAL_MEAL_EDIT_ENABLED=false;
const SLOTS=new Set(PERSONAL_MEALS.map(s=>s.id));
const nutrientKeys=["k","p","c","f","fi"];
const safe=(n)=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
const one=n=>Math.round((n+Number.EPSILON)*10)/10;
function validDate(day){
 if(typeof day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const d=new Date(day+"T12:00:00Z");
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===day;
}
function ownedDraft(draft){
 if(!draft||draft.draftOnly!==true||!validDate(draft.day)||!SLOTS.has(draft.slot)||
  !Array.isArray(draft.items)||draft.items.length>30||
  !draft.skipped||typeof draft.skipped.protein!=="boolean"||
  typeof draft.skipped.carb!=="boolean")throw Error("Borrador de comida no válido.");
}
function foodFrom(catalog,id){
 if(!Array.isArray(catalog)||typeof id!=="string"||!id||
  catalog.filter(x=>x?.id===id).length!==1)
  throw Error("Elegí un alimento único y disponible en el catálogo.");
 const food=catalog.find(x=>x.id===id);
 if(food.unit!=="g"&&food.unit!=="ml"||!nutrientKeys.every(k=>safe(food[k])))
  throw Error("La ficha nutricional no contiene valores utilizables.");
 return food;
}
const group=food=>guidedMealGroupFor(food,food.category);
export function newPersonalMealDraft({day,slot}={}){
 if(!validDate(day)||!SLOTS.has(slot))throw Error("Seleccioná una comida y fecha válidas.");
 return {draftOnly:true,day,slot,items:[],skipped:{protein:false,carb:false}};
}
export function draftPersonalMealAdd(draft,catalog,{foodId,quantity}={}){
 ownedDraft(draft);
 const food=foodFrom(catalog,foodId);
 if(!safe(quantity)||quantity<=0||quantity>3000||!Number.isInteger(quantity*10))
  throw Error("Ingresá una porción positiva de hasta 3000 g/ml con un decimal.");
 if(draft.items.some(x=>x.foodId===foodId))
  throw Error("Este alimento ya figura: modificá su cantidad en lugar de registrarlo dos veces.");
 if(draft.items.length>=30)throw Error("Alcanzaste el límite de ingredientes de esta comida.");
 const assigned=isGuidedMealSlot(draft.slot)?group(food):"free";
 if((assigned==="protein"||assigned==="carb")&&draft.skipped[assigned])
  throw Error("Volvé a activar ese grupo antes de agregar un alimento.");
 const next=structuredClone(draft);
 next.items.push({foodId,quantity,group:assigned});
 return next;
}
export function draftPersonalMealChange(draft,catalog,{foodId,quantity}={}){
 ownedDraft(draft);
 foodFrom(catalog,foodId);
 if(!draft.items.some(x=>x.foodId===foodId))throw Error("Ese alimento no figura en la comida.");
 const next=structuredClone(draft);
 next.items=next.items.filter(x=>x.foodId!==foodId);
 if(quantity===0)return next;
 return draftPersonalMealAdd(next,catalog,{foodId,quantity});
}
export function draftPersonalMealOmit(draft,catalog,component,omit=true){
 ownedDraft(draft);
 if(!isGuidedMealSlot(draft.slot)||!["protein","carb"].includes(component))
  throw Error("Omitir proteínas o hidratos se ofrece solo en comidas principales.");
 if(typeof omit!=="boolean")throw Error("Opción de omitir inválida.");
 if(omit&&draft.items.some(item=>group(foodFrom(catalog,item.foodId))===component))
  throw Error("Quitá primero las fuentes dedicadas de ese grupo.");
 const next=structuredClone(draft);
 next.skipped[component]=omit;
 return next;
}
export function previewPersonalMeal(draft,catalog){
 ownedDraft(draft);
 const totals=Object.fromEntries(nutrientKeys.map(k=>[k,0]));
 const ids=new Set();
 const entries=draft.items.map(item=>{
  const food=foodFrom(catalog,item.foodId);
  if(ids.has(item.foodId))throw Error("No se pueden contar dos veces alimentos duplicados.");
  ids.add(item.foodId);
  if(!safe(item.quantity)||item.quantity<=0||item.quantity>3000)
   throw Error("Porción incorrecta.");
  const assigned=isGuidedMealSlot(draft.slot)?group(food):"free";
  if(assigned!==item.group)throw Error("La categoría cambió: actualizá tu borrador.");
  if(draft.skipped[assigned])throw Error("No se puede omitir y seleccionar el mismo grupo.");
  const nutrients=Object.fromEntries(nutrientKeys.map(k=>{
   const amount=food[k]*item.quantity;
   if(!safe(amount))throw Error("No se pudo calcular la cantidad.");
   totals[k]+=amount;
   return [k,one(amount)];
  }));
  return {foodId:food.id,name:food.name,quantity:item.quantity,unit:food.unit,group:assigned,nutrients};
 });
 for(const key of nutrientKeys)totals[key]=one(totals[key]);
 return {draftOnly:true,day:draft.day,slot:draft.slot,entries,skipped:{...draft.skipped},
  groups:isGuidedMealSlot(draft.slot)?GUIDED_MEAL_GROUPS.map(({id,title,hint})=>({
   id,title,hint,items:entries.filter(x=>x.group===id),omitted:!!draft.skipped[id]
  })):null,
  totals,note:"Borrador orientativo en memoria. No registrado ni aprobado clínicamente."};
}
