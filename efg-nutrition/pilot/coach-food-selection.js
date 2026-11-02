// COACH119: guide ingredient references are NOT a whitelist for the shared food catalog.
// Publishing verifies server-side composition and permissions, not medical safety.
const ID=/^[A-Za-z0-9_-]{1,100}$/;
const SLOTS=new Set(['desayuno','media_manana','almuerzo','media_tarde','merienda','cena']);
// v2 references are the ingredients in the guide, NOT the student's food
// catalog. The student's food picker always retains the complete source list.
// Legacy v1 drafts keep their old explicit-approval behavior unchanged.
export function approvedFoodGuide(guide,selectedIds=null,{knownIds=null}={}){
 const flexible=guide?.kind==="flexible_meal_guide"&&guide?.version===2;
 const legacy=guide?.kind==="five_meal_example"&&guide?.version===1;
 if(!(flexible||legacy)||!Array.isArray(guide.meals)||
  flexible&&(guide.meals.length<2||guide.meals.length>6)||
  legacy&&guide.meals.length!==5||
  new Set(guide.meals.map(m=>m?.slot)).size!==guide.meals.length||
  guide.meals.some(m=>!SLOTS.has(m?.slot)||!Array.isArray(m.items)||m.items.length<1||m.items.length>15))
  throw Error("Revisá los horarios y alimentos de la Dieta Guía.");
 if(knownIds!==null&&(!Array.isArray(knownIds)||!knownIds.every(id=>typeof id==="string"&&ID.test(id))))
  throw Error("El catálogo no tiene identificadores válidos.");
 const known=knownIds===null?null:new Set(knownIds);
 const guideIds=[];
 for(const meal of guide.meals)for(const item of meal.items){
  if(typeof item?.id!=="string"||!ID.test(item.id)||known&&!known.has(item.id))
   throw Error("La Dieta Guía contiene un alimento inexistente o inválido.");
  guideIds.push(item.id);
 }
 const uniqueGuide=[...new Set(guideIds)].sort();
 // v2 never makes a coach hand-select all existing foods.
 // An explicitly supplied reference list is accepted only if exactly the guide
 // ingredients. Extra catalog items do NOT become a student-specific whitelist.
 if(flexible){
  if(selectedIds!==null&&selectedIds!==undefined&&
    (!Array.isArray(selectedIds)||selectedIds.length!==uniqueGuide.length||
     new Set(selectedIds).size!==uniqueGuide.length||
     selectedIds.some(id=>!uniqueGuide.includes(id))))
   throw Error("Las referencias del borrador no coinciden con la guía.");
  return {...structuredClone(guide),approvedFoodIds:uniqueGuide};
 }
 // A legacy stored plan may still carry a broader historical list.
 if(!Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>300)
  throw Error("La selección anterior debe contener entre 1 y 300 alimentos.");
 const unique=new Set();
 for(const id of selectedIds){
  if(typeof id!=="string"||!ID.test(id)||known&&!known.has(id))
   throw Error("La selección contiene alimentos inexistentes o inválidos.");
  unique.add(id);
 }
 if(unique.size!==selectedIds.length)throw Error("La selección contiene alimentos duplicados.");
 if(uniqueGuide.some(id=>!unique.has(id)))throw Error("Un ingrediente de la guía no figura en la selección histórica.");
 return {...structuredClone(guide),approvedFoodIds:[...unique].sort()};
}
export function coachFoodChoicesFromDom(root){
 if(!root||typeof root.querySelectorAll!=="function")throw Error("No está disponible el selector de alimentos.");
 const all=[...root.querySelectorAll("input[data-coachfood]")];
 if(!all.length)throw Error("Abrí la selección de alimentos antes de guardar el borrador.");
 return all.filter(el=>el.checked===true).map(el=>el.dataset.coachfood);
}
