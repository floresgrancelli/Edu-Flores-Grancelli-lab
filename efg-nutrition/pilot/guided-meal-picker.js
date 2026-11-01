// Guided diary selection for MAIN meals only. No database migration or nutrient override.
// A mixed prepared plate is registered ONCE and contributes all P/HC/G/kcal via the
// existing catalog or saved recipe, never as a protein-only or carb-only item.
export const GUIDED_MEAL_SLOTS=Object.freeze(["desayuno","almuerzo","cena"]);
export const GUIDED_MEAL_GROUPS=Object.freeze([
 {id:"protein",title:"🥚 Proteínas",hint:"Elegí una fuente de proteína. También aporta los otros nutrientes que tenga."},
 {id:"carb",title:"🍞 Hidratos de carbono",hint:"Elegí pan, arroz, frutas, papas u otros hidratos."},
 {id:"prepared",title:"🍕 Plato preparado",hint:"Pizza, sushi, tarta, empanadas: cada porción suma TODOS sus nutrientes."},
 {id:"other",title:"🥗 Verduras y otros",hint:"Verduras, grasas agregadas, bebidas y otros alimentos. Sin bloquear opciones."}
]);
const MIXED=/(tarta|empanad|sushi|pizza|s[áa]ndwich|sandwich|wrap|milanesa|hamburgues|guiso|quiche|tortilla de|pastel de)/i;
export const isGuidedMealSlot=slot=>GUIDED_MEAL_SLOTS.includes(slot);
export function guidedMealGroupFor(food,category){
 const key=String(food?.name||"")+" "+String(food?.id||"");
 if(MIXED.test(key)||category==="prepared"||category==="recipe")return "prepared";
 if(["protein","dairy","plant","legumes"].includes(category))return "protein";
 if(["carb","fruit","bakery"].includes(category))return "carb";
 return "other";
}
export function guidedMealTotals(entries){
 return (Array.isArray(entries)?entries:[]).reduce((t,item)=>{
  for(const k of ["k","p","c","f","fi"]){const n=Number(item?.[k]);if(Number.isFinite(n))t[k]+=n;}
  return t;
 },{k:0,p:0,c:0,f:0,fi:0});
}
export function guidedMealMarks(skipped,slot){
 const raw=skipped?._guidedComponents?.[slot];
 return {protein:raw?.protein===true,carb:raw?.carb===true};
}
