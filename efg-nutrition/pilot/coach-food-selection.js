// REL-ALL/COACH119 — the five-meal example is not the whole approved catalog.
// The Coach explicitly selects available foods; the protected publication RPC
// verifies every selected ID against reviewed evidence before it grants access.
// Never derive "medical safety" from this selection or from calories.
const ID=/^[A-Za-z0-9_-]{1,100}$/;
export function approvedFoodGuide(guide,selectedIds,{knownIds=null}={}){
 if(!guide||guide.kind!=="five_meal_example"||!Array.isArray(guide.meals))
  throw Error("Prepará primero la guía de cinco comidas.");
 if(!Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>300)
  throw Error("Seleccioná los alimentos que el alumno podrá utilizar (máximo 300).");
 const known=knownIds===null?null:new Set(knownIds);
 const unique=new Set();
 for(const id of selectedIds){
  if(typeof id!=="string"||!ID.test(id)||known&&!known.has(id))
   throw Error("La selección contiene alimentos inexistentes o inválidos.");
  unique.add(id);
 }
 if(unique.size!==selectedIds.length)
  throw Error("La selección de alimentos contiene duplicados.");
 const guideFoodIds=new Set();
 for(const meal of guide.meals){
  if(!Array.isArray(meal.items))throw Error("Revisá los alimentos de la guía.");
  for(const item of meal.items){
   if(typeof item?.id!=="string"||!ID.test(item.id))throw Error("Alimento de guía inválido.");
   guideFoodIds.add(item.id);
  }
 }
 for(const id of guideFoodIds)if(!unique.has(id))
  throw Error("El alimento "+id+" está en la guía pero no está seleccionado para el alumno.");
 const result=structuredClone(guide);
 result.approvedFoodIds=[...unique].sort();
 return result;
}
export function coachFoodChoicesFromDom(root){
 if(!root||typeof root.querySelectorAll!=="function")throw Error("No está disponible el selector de alimentos.");
 const all=[...root.querySelectorAll("input[data-coachfood]")];
 if(!all.length)throw Error("Abrí la selección de alimentos antes de guardar el borrador.");
 return all.filter(el=>el.checked===true).map(el=>el.dataset.coachfood);
}
