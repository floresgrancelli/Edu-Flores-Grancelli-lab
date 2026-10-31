// EFG Nutrition Pro — five-meal educational guide. No network, storage, or patient data.
// Never equate this sample menu with the meals actually consumed.
export const GUIDE_MEALS=Object.freeze([
 {slot:"desayuno",label:"Desayuno",items:[["egg",110],["bread",35],["cheese",35],["milk_skim",230],["coffee_black",50]]},
 {slot:"media_manana",label:"Media mañana",items:[["yogurt",200],["apple",130],["oats_raw",30]]},
 {slot:"almuerzo",label:"Almuerzo",items:[["chicken",175],["brownrice",185],["pumpkin",200],["oil",5]]},
 {slot:"merienda",label:"Merienda",items:[["bread",35],["cheese",35],["mandarin",140]]},
 {slot:"cena",label:"Cena",items:[["fish_hake",200],["potato",230],["rocket",75],["oil",5]]}
]);
// Contextual equivalences; both white and whole-grain versions can fit all goals.
// Only the coach chooses these alternatives; the system never bans foods by goal.
export const GUIDE_SWAP_SETS=Object.freeze([
 // Options suited to breakfast; ham is optional and not a default daily recommendation.
 ["egg","egg_white","ham_cooked","turkey_breast_cooked","yogurt_greek_light","yogurt_high_protein","cottage_cheese","ricotta_light","tofu_firm","tempeh","whey_powder"],
 ["brownrice","rice","yamani_rice_cooked"],
 ["bread","bread_white","bread_rye"],
 ["chicken","pork","beef","fish_hake","turkey_breast_cooked"],
 ["fish_hake","fish_salmon","chicken","pork"],
 ["potato","sweetpotato","brownrice","rice"],
 ["yogurt","yogurt_greek_light","yogurt_high_protein"],
 ["milk_skim","milk_whole","milk_lactosefree"],
 ["cheese","ricotta_light","cottage_cheese"],
 ["pumpkin","zucchini","broccoli_cooked"],
 ["rocket","lettuce","spinach_cooked"],
 ["banana","apple","pear","mandarin"],
 ["apple","pear","mandarin","banana"],
 ["mandarin","orange","apple","pear"]
]);
export function guidedFoodAlternatives(id,catalog){
 const allowed=new Set((catalog||[]).map(f=>f.id));
 const relevant=GUIDE_SWAP_SETS.filter(group=>group.includes(id));
 const ids=[id,...relevant.flatMap(group=>group)];
 return [...new Set(ids)].filter(x=>allowed.has(x));
}
// Meal descriptions follow the food choices the coach has actually made.
export function describeGuidedMeal(meal){
 const items=meal?.items||[],ids=new Set(items.map(x=>x.id));
 const has=(...xs)=>xs.every(x=>ids.has(x));
 if(meal?.slot==="desayuno"){
  const proteins={
   egg:"huevos revueltos o a la plancha con rocío vegetal",
   egg_white:"claras revueltas con rocío vegetal",
   ham_cooked:"jamón cocido",
   turkey_breast_cooked:"pechuga de pavo cocida",
   yogurt_greek_light:"yogur griego natural 0%",
   yogurt_high_protein:"yogur natural proteico",
   cottage_cheese:"queso cottage",
   ricotta_light:"ricota magra",
   tofu_firm:"tofu firme a la plancha",
   tempeh:"tempeh a la plancha",
   whey_powder:"batido de proteína whey"
  };
  const breads={bread:"tostada integral",bread_white:"tostada de pan blanco",bread_rye:"tostada de pan de centeno"};
  const toppings={cheese:"Port Salut light",cottage_cheese:"queso cottage",ricotta_light:"ricota magra"};
  const main=items.find(x=>proteins[x.id]),bread=items.find(x=>breads[x.id]);
  const topping=items.find(x=>toppings[x.id]&&x!==main);
  const milk=items.find(x=>["milk_skim","milk_whole","milk_lactosefree"].includes(x.id));
  const parts=[];
  if(main&&bread&&["ham_cooked","turkey_breast_cooked","cottage_cheese","ricotta_light","tofu_firm","tempeh"].includes(main.id))
   parts.push(breads[bread.id]+" con "+proteins[main.id]+(topping?" y "+toppings[topping.id]:""));
  else{
   if(main)parts.push(proteins[main.id]);
   if(bread)parts.push(breads[bread.id]+(topping?" con "+toppings[topping.id]:""));
  }
  if(ids.has("coffee_black")&&milk)parts.push("café con "+(milk.id==="milk_skim"?"leche descremada":milk.id==="milk_whole"?"leche entera":"leche sin lactosa"));
  else if(ids.has("coffee_black"))parts.push("café solo");
  else if(milk)parts.push(milk.name||"leche");
  return (parts.length?parts.join(", "):"Preparación según los ingredientes seleccionados")+".";
 }
 if(meal?.slot==="media_manana"&&has("yogurt","apple"))
  return "Yogur descremado con manzana"+(ids.has("oats_raw")?", avena":"")+(ids.has("whey_powder")?" y proteína whey opcional.":".");
 if(meal?.slot==="almuerzo"&&has("chicken","brownrice","pumpkin"))
  return "Pollo a la plancha con arroz integral cocido y calabaza. Condimentar con el aceite indicado.";
 if(meal?.slot==="merienda"&&has("bread","cheese","mandarin"))
  return "Tostada integral con Port Salut light y mandarina.";
 if(meal?.slot==="cena"&&has("fish_hake","potato","rocket"))
  return "Merluza al horno con papa hervida y ensalada de rúcula; aceite indicado para condimentar.";
 return "Preparación sugerida con "+items.map(f=>String(f.name||f.id).split(" (")[0]).join(", ")+". Adaptar al gusto y la preparación.";
}
const NUTRIENTS=["k","p","c","f","fi"];
const valid=x=>typeof x==="number"&&Number.isFinite(x);
const sum=(items)=>items.reduce((acc,item)=>{for(const k of NUTRIENTS)acc[k]+=(Number(item[k])||0)*Number(item.qty||0);return acc;},{k:0,p:0,c:0,f:0,fi:0});
// Practical defaults for the example, not universal or clinical limits.
const bounds=id=>/^(oil|sunflower_oil)$/.test(id)?[2,10,1]:
 id==="egg"?[55,165,55]:
 id==="egg_white"?[70,280,10]:
 id==="ham_cooked"?[35,150,5]:
 id==="turkey_breast_cooked"?[40,160,5]:
 id==="tofu_firm"?[80,250,10]:
 id==="tempeh"?[60,180,10]:
 /^(cottage_cheese|ricotta_light)$/.test(id)?[40,220,5]:
 id==="coffee_black"?[30,80,10]:
 /^(chicken|beef|pork|fish_hake|fish_salmon|turkey_breast_cooked)$/.test(id)?[160,300,10]:
 /^(milk_skim|milk|milk_whole|milk_lactosefree)$/.test(id)?[180,350,10]:
 /^yogurt/.test(id)?[150,300,10]:
 /^(bread|bread_white|bread_rye)$/.test(id)?[20,50,5]:
 /^(cheese|ricotta_light|cottage_cheese)$/.test(id)?[20,55,5]:
 /^(apple|mandarin|banana|pear|orange)$/.test(id)?[80,220,10]:
 id==="pumpkin"?[140,300,10]:
 id==="rocket"?[40,160,5]:
 /^(brownrice|rice|yamani_rice_cooked)$/.test(id)?[100,340,10]:
 /^(potato|sweetpotato)$/.test(id)?[120,330,10]:
 id==="whey_powder"?[20,40,5]:[30,400,10];
export const guidedPortionBounds=id=>bounds(id).slice(0,2);
function source(food,qty){
 // A missing nutrient is NOT measured zero. Refuse to generate an approvable
 // guide if the selected catalog entry lacks any required value.
 if(!food||typeof food.id!=="string"||!NUTRIENTS.every(k=>valid(food[k])&&food[k]>=0))
  throw new Error("El alimento "+String(food?.name||food?.id||"sin identificar")+" tiene datos nutricionales incompletos. Revisá su ficha antes de generar la guía.");
 return {id:food.id,name:food.name,unit:food.unit||"g",qty,
  sourceType:food.sourceType||"generic_estimate",validationStatus:food.validationStatus||"generico_pendiente",
  ...Object.fromEntries(NUTRIENTS.map(k=>[k,food[k]]))};
}
export function guideTotals(plan){
 const perMeal=(plan?.meals||[]).map(m=>({slot:m.slot,label:m.label,totals:sum(m.items||[])}));
 const totals=sum((plan?.meals||[]).flatMap(m=>m.items||[]));
 return {perMeal,totals};
}
export function guideDeviation(plan,goal){
 const t=guideTotals(plan).totals,targets={k:Number(goal?.kcal??goal?.k??0)||0,p:Number(goal?.protein_g??goal?.p??0)||0,c:Number(goal?.carb_g??goal?.c??0)||0,f:Number(goal?.fat_g??goal?.f??0)||0,fi:Number(goal?.fiber_g??goal?.fi??0)||0};
 return Object.fromEntries(Object.entries(targets).map(([k,target])=>[k,{target,actual:t[k],difference:t[k]-target,percent:target>0?100*(t[k]-target)/target:null}]));
}
function score(plan,goal){
 // Fiber is part of the coach-approved target when specified; missing data never implies success.
 const diff=guideDeviation(plan,goal),w={k:2,p:4,c:3,f:3,fi:1};
 const macro=Object.entries(w).reduce((total,[k,weight])=>total+(diff[k].target>0?weight*Math.pow(diff[k].difference/diff[k].target,2):0),0);
 // Encourage a plausible five-meal distribution rather than sending huge fruit portions to snacks.
 const ratios={desayuno:.22,media_manana:.13,almuerzo:.29,merienda:.14,cena:.22};
 const split=guideTotals(plan).perMeal.reduce((n,m)=>{
  const expected=(ratios[m.slot]||.2)*Number(goal.kcal);
  return n+Math.pow((m.totals.k-expected)/expected,2);
 },0);
 return macro+0.14*split;
}
function ensureGuideGoal(goal){
 const vals=[goal?.kcal,goal?.protein_g,goal?.carb_g,goal?.fat_g].map(Number);
 if(vals.some(v=>!valid(v)||v<=0)||vals[0]<1200||vals[0]>6000)throw new Error("Primero aprobá una meta energética y de macronutrientes válida.");
}
export function generateGuidedDay(catalog,goal,{includeWhey=false}={}){
 ensureGuideGoal(goal);
 const foods=new Map((catalog||[]).map(x=>[x.id,x]));
 const meals=GUIDE_MEALS.map(m=>({
  slot:m.slot,label:m.label,
  items:m.items.filter(([id])=>foods.has(id)).map(([id,qty])=>source(foods.get(id),qty))
 }));
 if(includeWhey&&foods.has("whey_powder"))meals[1].items.push(source(foods.get("whey_powder"),30));
 // Default: two eggs (~110 g) rather than optimizing to three.
 const egg=meals[0].items.find(f=>f.id==="egg");if(egg)egg.locked=true;
 if(meals.some(m=>m.items.length<2))throw new Error("El catálogo necesita más alimentos básicos antes de generar el menú.");
 const plan={version:1,kind:"five_meal_example",meals,supplementNote:"",createdFrom:"coach_approved_goal"};
 return rebalanceGuidedDay(plan,goal);
}
export function rebalanceGuidedDay(existing,goal){
 ensureGuideGoal(goal);
 if(!existing?.meals||existing.meals.length!==5)throw new Error("Guía incompleta.");
 const plan=structuredClone(existing);
 // Optimizes QUANTITIES, not food identities. Same repertoire can serve different goals.
 // All suggested portions are bounded to keep meals practical.
 for(const m of plan.meals)for(const item of m.items){
  const [min,max]=guidedPortionBounds(item.id);
  item.qty=Math.min(max,Math.max(min,Number(item.qty)||min));
 }
 // Bounded coordinate descent: kcal + protein + carbs + fats; no artificial micro-portions.
 for(let iteration=0;iteration<240;iteration++){
  const current=score(plan,goal);let best=null,bestScore=current;
  for(let mi=0;mi<plan.meals.length;mi++)for(let ii=0;ii<plan.meals[mi].items.length;ii++){
   const item=plan.meals[mi].items[ii], [min,max,step]=bounds(item.id),original=item.qty;
   if(item.locked===true)continue;
   for(const delta of [-step,step]){
    item.qty=original+delta;
    if(item.qty<min||item.qty>max){item.qty=original;continue;}
    const candidate=score(plan,goal);
    if(candidate<bestScore-0.0000001){bestScore=candidate;best={mi,ii,qty:item.qty};}
    item.qty=original;
   }
  }
  if(!best)break;
  plan.meals[best.mi].items[best.ii].qty=best.qty;
 }
 return plan;
}
export function swapGuidedFood(existing,slot,index,newFoodId,catalog){
 const plan=structuredClone(existing),meal=plan?.meals?.find(x=>x.slot===slot);
 if(!meal||!Number.isInteger(index)||index<0||index>=meal.items.length)throw new Error("Comida inválida.");
 const old=meal.items[index],permitted=guidedFoodAlternatives(old.id,catalog);
 if(!permitted.includes(newFoodId))throw new Error("Esa alternativa no corresponde a este alimento.");
 const replacement=(catalog||[]).find(x=>x.id===newFoodId);
 if(!replacement)throw new Error("Falta la ficha de ese alimento.");
 const [min,max]=guidedPortionBounds(newFoodId);
 const breakfastProtein=GUIDE_SWAP_SETS[0];
 const equivalent=slot==="desayuno"&&breakfastProtein.includes(old.id)&&breakfastProtein.includes(newFoodId)&&old.p>0&&replacement.p>0
  ?Math.round((old.qty*old.p/replacement.p)/5)*5:old.qty;
 meal.items[index]={...source(replacement,Math.min(max,Math.max(min,equivalent))),locked:true};
 return plan;
}
export function validateGuidedDay(plan,goal){
 ensureGuideGoal(goal);
 if(plan?.version!==1||plan?.kind!=="five_meal_example"||!Array.isArray(plan.meals)||plan.meals.length!==5)throw new Error("El ejemplo debe tener exactamente cinco comidas.");
 const slots=new Set();
 for(const meal of plan.meals){
  if(!GUIDE_MEALS.some(x=>x.slot===meal.slot)||slots.has(meal.slot)||!Array.isArray(meal.items)||meal.items.length<1||meal.items.length>15)throw new Error("Revisá las comidas del ejemplo.");
  slots.add(meal.slot);
  for(const food of meal.items){
   if(typeof food.id!=="string"||food.id.length>100||!valid(food.qty)||food.qty<guidedPortionBounds(food.id)[0]||food.qty>guidedPortionBounds(food.id)[1]||NUTRIENTS.some(k=>!valid(food[k])||food[k]<0))throw new Error("Revisá los alimentos y las cantidades.");
  }
 }
 if(typeof plan.supplementNote!=="string"||plan.supplementNote.length>300)throw new Error("La nota de suplementos es demasiado larga.");
 const diff=guideDeviation(plan,goal);
 if(["k","p","c","f"].some(k=>Math.abs(diff[k].percent)>30))throw new Error("El ejemplo se aleja más del 30% de la meta. Ajustá cantidades antes de enviarlo.");
 return {totals:guideTotals(plan).totals,deviations:diff};
}
export function summarizeBaseline(logs,{todayISO=null,limit=2}={}){
 if(!Number.isInteger(limit)||limit<1||limit>7)throw new Error("Cantidad de días fuera de rango.");
 const candidates=(logs||[]).filter(d=>d&&typeof d.log_day==="string"&&(!todayISO||d.log_day<todayISO))
   .sort((a,b)=>b.log_day.localeCompare(a.log_day));let selected=[],seen=new Set();
 for(const d of candidates){
  if(seen.has(d.log_day))continue;
  const entries=Object.entries(d.meals||{}).filter(([slot,foods])=>!d.skipped?.[slot]&&Array.isArray(foods)&&foods.length>0);
  if(!entries.length)continue;
  const day=sum(entries.flatMap(([,foods])=>foods.map(food=>({...food,qty:1}))));
  selected.push({day:d.log_day,mealsRecorded:entries.length,totals:day});seen.add(d.log_day);if(selected.length>=limit)break;
 }
 if(!selected.length)return {days:[],average:null,warning:"Aún no hay días registrados suficientes para describir lo que comés."};
 const average=Object.fromEntries(NUTRIENTS.map(k=>[k,selected.reduce((n,d)=>n+d.totals[k],0)/selected.length]));
 return {days:selected,average,warning:"Registro autodeclarado de "+selected.length+" día(s): una muestra inicial, no el consumo habitual ni el gasto energético medido."};
}
