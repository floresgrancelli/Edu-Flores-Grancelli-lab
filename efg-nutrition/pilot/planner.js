// EFG Nutrition - motor de planificación orientativa para alimentos pesados.
// No prescribe tratamiento; solo estima porciones en función del balance restante.
export const FOOD_GROUPS = {
  protein:["chicken","beef","pork","tuna","egg","yogurt","cheese","fish_hake","fish_salmon","fish_sardines","fish_mackerel","fish_cod","fish_shrimp","tuna_fresh","chicken_breast_raw","chicken_thigh_cooked","turkey_breast_cooked","lean_ground_beef","sirloin_cooked","beef_tenderloin","pork_chop","ham_cooked","tofu_firm","tempeh","milanesa_soy_gobinda","egg_white","egg_boiled","yogurt_greek","yogurt_greek_light","ricotta_light","cottage_cheese","whey_powder","seitan_cooked","soy_textured_hydrated","soy_beans_cooked","veal_cutlet_cooked","ground_beef_regular","chicken_liver_cooked","squid_cooked","mussels_cooked","anchovies_canned","ricotta_whole","yogurt_high_protein"],
  carbs:["brownrice","rice","potato","sweetpotato","pasta","protein_pasta","bread","banana","oats_raw","oatmeal_cooked","bread_white","bread_rye","toast_whole","rice_cakes","tortilla_wheat","quinoa_cooked","couscous_cooked","bulgur_cooked","polenta_cooked","corn_cooked","potato_baked","sweetpotato_baked","lentils_cooked","chickpeas_cooked","beans_black","beans_white","beans_red","peas_cooked","fruit_salad_basic","apple","pear","orange","mandarin","kiwi","strawberry","blueberry","grapes","watermelon","melon","peach","plum","pineapple","mango","grapefruit","quinoa_dry","brown_rice_dry","yamani_rice_cooked","barley_cooked","millet_cooked","buckwheat_cooked","bread_glutenfree","toast_glutenfree","oat_flour","chickpea_flour","prunes","fig_fresh","cherries","papaya","apricot","persimmon","pomegranate"],
  vegetable:["rocket","pumpkin","tomato","tomato_cherry","cucumber","lettuce","carrot_raw","carrot_cooked","broccoli_cooked","zucchini","spinach_cooked","onion","bellpepper","asparagus","cabbage","cauliflower","greenbeans","beets","eggplant","mushrooms","celery","leek","scallion","kale","watercress","radish","artichoke_cooked","turnip_cooked"],
  fat:["oil","avocado","sunflower_oil","canola_oil","butter","peanut_butter","peanuts","walnuts","almonds","cashews","pistachios","mixed_nuts","chia","flaxseed","sesame","olives","hazelnuts","pecans","brazil_nuts","macadamia_nuts","pumpkin_seeds","sunflower_seeds","coconut_oil"]
};
export const FOOD_DEFAULTS = ["egg","bread","milk","cheese","quince","cake","yogurt","chicken","beef","pork","tuna","brownrice","rice","potato","sweetpotato","pasta","protein_pasta","banana","rocket","pumpkin","oil","avocado","walnuts","almonds","peanuts","cashews","pistachios","mixed_nuts","coffee_black","coffee_decaf","coffee_milk","coffee_cortado","tea_plain","tea_green","tea_milk","herbal_tea","chamomile_tea","mint_tea","tilo_tea","cedron_tea","mate_plain","mate_cocido","mate_cocido_milk"];
export const MEAL_ORDER=["desayuno","media_manana","almuerzo","media_tarde","merienda","cena"];
const PREFERRED={
 cena:{protein:["chicken","pork","beef","tuna","milanesa_soy_gobinda","egg"],carbs:["potato","sweetpotato","brownrice","rice","pasta","protein_pasta","bread"],vegetable:["rocket","pumpkin"],fat:["oil","avocado"]},
 merienda:{protein:["yogurt","egg","cheese"],carbs:["bread","banana","sweetpotato"],vegetable:[],fat:[]},
 media_tarde:{protein:["yogurt","egg"],carbs:["bread","banana"],vegetable:[],fat:[]},
 almuerzo:{protein:["chicken","beef","tuna"],carbs:["brownrice","potato","rice","pasta"],vegetable:["rocket","pumpkin"],fat:["oil","avocado"]}
};
const MATCH={protein:"p",carbs:"c",fat:"f",vegetable:"k"};
const CAPS={
 cena:{protein:260,carbs:400,vegetable:200,fat:18},
 merienda:{protein:250,carbs:150,vegetable:120,fat:12},
 media_tarde:{protein:200,carbs:140,vegetable:120,fat:10},
 almuerzo:{protein:250,carbs:350,vegetable:200,fat:17}
};
const sane=x=>Math.max(0,Number.isFinite(Number(x))?Number(x):0);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function groupFor(id){return Object.keys(FOOD_GROUPS).find(group=>FOOD_GROUPS[group].includes(id))||null;}
export function optionsFor(foods,approved,category){
 const allowed=new Set(Array.isArray(approved)&&approved.length?approved:FOOD_DEFAULTS);
 return (FOOD_GROUPS[category]||[]).filter(id=>allowed.has(id)).map(id=>foods.find(f=>f.id===id)).filter(Boolean);
}
export function futureSlots(diary,dinnerOnly){
 if(dinnerOnly)return (diary?.skipped||{}).cena?[]:["cena"];
 const meals=diary?.meals||{},skipped=diary?.skipped||{};
 let last=-1;
 MEAL_ORDER.forEach((slot,i)=>{if((meals[slot]||[]).length>0&&!skipped[slot])last=i;});
 const future=MEAL_ORDER.filter((slot,i)=>i>last&&!skipped[slot]&&!(meals[slot]||[]).length);
 // Sugerir merienda + cena, evitando exigir además "media tarde".
 if(future.includes("cena"))return (future.includes("merienda")?["merienda","cena"]:["cena"]);
 return future.slice(0,2);
}
// No existe una lista nutricional reducida: todos los alimentos del catálogo son elegibles.
// En la interfaz se ordenan por los mismos grupos que al registrar comidas.
export function allPlannerFoods(foods,approved){
 const permitted=new Set(Array.isArray(approved)&&approved.length?approved:foods.map(f=>f.id));
 return foods.filter(f=>permitted.has(f.id));
}
// Prioridad fija: proteína -> hidratos -> calorías. La grasa siempre se cuenta
// pero nunca fuerza a añadir aceite u otro alimento para cerrar una cifra.
const SLOTS=["protein","carbs","vegetable","fat"];
const NUTRIENTS=["k","p","c","f","fi"];
const EMPTY={k:0,p:0,c:0,f:0,fi:0};
function portionMax(food,slot="cena"){
 const id=food?.id||"",category=food?.category||"";
 const snack=slot==="merienda"||slot==="media_tarde";
 // Merienda: porciones orientativas plausibles; cualquier déficit pasa a la cena.
 if(/^(egg|egg_boiled|egg_fried|huevo_frito)/.test(id))return snack?100:150;
 if(id==="milanesa_soy_gobinda")return snack?125:250;
 if(/oil|aceite|butter|manteca/i.test(id))return snack?10:20;
 if(/whey|creatine|protein_powder/i.test(id))return snack?30:60;
 if(snack){
  if(id.startsWith("yogurt")||/kefir/i.test(id))return 200;
  if(/bread|toast|pan_|^pan$|tortilla_wheat|rice_cakes/.test(id))return 100;
  if(category==="dairy")return 150;
  if(category==="fruit")return 250;
  if(category==="fat")return 30;
  if(category==="extra")return 25;
  if(category==="drink")return 300;
  if(category==="recipe"||category==="dessert"||category==="bakery")return 130;
  if(category==="prepared"||category==="protein"||category==="plant")return 200;
  return 200;
 }
 if(category==="fat")return 55;
 if(category==="extra")return 30;
 if(category==="dessert"||category==="bakery")return 140;
 if(category==="drink")return 450;
 if(category==="recipe"||category==="prepared")return 350;
 return 400;
}
function suggestedStep(food,slot="cena"){
 if(food?.id==="egg"||food?.id==="egg_boiled"||/^huevo_frito/.test(food?.id||""))return 50;
 const serving=Number(food?.servingGrams);
 if(Number.isFinite(serving)&&serving>0&&serving<=portionMax(food,slot))return serving;
 return 5;
}
function minPracticalPortion(food,slot){
 if(!food)return 0;
 if(slot!=="merienda"&&slot!=="media_tarde")return suggestedStep(food,slot);
 const id=food.id||"",cat=food.category||"",step=suggestedStep(food,slot);
 if(id.startsWith("yogurt")||/kefir/i.test(id))return 90;
 if(/whey|protein_powder/.test(id))return step;
 if(/bread|toast|pan_|^pan$|tortilla_wheat|rice_cakes/.test(id))return 20;
 if(cat==="fruit"||cat==="vegetable")return 60;
 if(cat==="dairy")return 30;
 if(cat==="fat")return 10;
 if(cat==="drink")return 120;
 if(cat==="recipe"||cat==="prepared"||cat==="bakery")return 35;
 return step;
}
function recommendedPortion(food,needed,unitTarget,slot="cena",energyRoom=Infinity){
 const nutrient=Number(food?.[unitTarget])||0;
 const step=food?suggestedStep(food,slot):5;
 if(!food)return {grams:0,neededGrams:0,capped:false,reason:"No agregar"};
 if(!(nutrient>0)||!(needed>0))return {grams:0,neededGrams:0,capped:false,
   reason:nutrient<=0?"Este alimento no aporta "+(unitTarget==="p"?"proteínas":unitTarget==="c"?"hidratos":"calorías")+".":"Ese objetivo ya está cubierto."};
 const neededGrams=needed/nutrient;
 const max=portionMax(food,slot);
 const kcal=Number(food.k)||0;
 const energyLimited=(slot==="merienda"||slot==="media_tarde")&&kcal>0;
 const energyCap=energyLimited?Math.floor(Math.max(0,energyRoom)/(kcal*step))*step:max;
 const cap=Math.min(max,energyCap);
 const min=minPracticalPortion(food,slot);
 if(cap<min||neededGrams<min*.5){
  return {grams:0,neededGrams,capped:true,
   reason:cap<min?"La porción mínima razonable excedería las calorías reservadas para esta comida; pasa a la cena.":"Queda muy poco por cubrir aquí; lo reservamos para la cena."};
 }
 const target=Math.round(neededGrams/step)*step;
 const grams=Math.min(cap,Math.max(min,target));
 return {grams,neededGrams,capped:neededGrams>grams+step/2,reason:null};
}
export function proposeMeal({foods,approved,slot,remaining,share=1,selections={}}){
 const catalog=allPlannerFoods(foods,approved),profile=PREFERRED[slot]||PREFERRED.cena;
 const lookup=new Map(catalog.map(f=>[f.id,f]));
 const target=Object.fromEntries(NUTRIENTS.map(n=>[n,sane(remaining?.[n])*share]));
 const chosen=SLOTS.map((category,i)=>{
  const id=selections[slot+"|"+category];
  if(id==="none"||(!id&&i>=2))return null;
  if(id&&lookup.has(id))return lookup.get(id);
  if(id&&!lookup.has(id))return null;
  return (profile[category]||[]).map(x=>lookup.get(x)).find(Boolean)||catalog[0]||null;
 });
 const total={...EMPTY};
 const rows=[];
 for(let i=0;i<SLOTS.length;i++){
  const category=SLOTS[i],food=chosen[i],nutrient=i===0?"p":i===1?"c":"k";
  const missing=Math.max(0,target[nutrient]-total[nutrient]);
  const portion=recommendedPortion(food,missing,nutrient,slot,Math.max(0,target.k-total.k));
  const row={food,category,unit:food?.unit||"g",grams:portion.grams,
   neededGrams:portion.neededGrams,capped:portion.capped,
   targetNutrient:nutrient,reason:portion.reason};
  rows.push(row);
  if(food)for(const key of NUTRIENTS)total[key]+=sane(food[key])*portion.grams;
 }
 return {slot,rows,estimate:total,target,priority:["p","c","k"]};
}
export function makePlan({foods,approved,diary,goals,totals,dinnerOnly=false,selections={}}){
 if(!goals)return {ready:false,reason:"Para calcular porciones necesitamos primero las metas aprobadas por el coach."};
 const remaining=Object.fromEntries(["k","p","c","f","fi"].map(k=>[k,Math.max(0,sane(goals[k])-sane(totals[k]))]));
 const slots=futureSlots(diary,dinnerOnly);
 if(!slots.length)return {ready:false,remaining,reason:dinnerOnly?"La cena ya está registrada u omitida. Podés corregirla desde el diario.":"Todas las comidas posteriores ya se registraron u omitieron."};
 let left={...remaining};
 const split=slots.length===2&&slots[0]==="merienda"&&slots[1]==="cena";
 const baseline=split?Object.fromEntries(Object.keys(remaining).map(k=>[k,remaining[k]/3])):null;
 const meals=[];
 slots.forEach((slot,i)=>{
  // Exactamente 1/3 de cada macro y calorías a merienda, 2/3 de base a cena.
  // Lo que no se pueda cubrir con porciones razonables se traslada a cena.
  const share=split&&i===0?1/3:1;
  const p=proposeMeal({foods,approved,slot,remaining:left,share,selections});
  p.split=split?(i===0?"snack-third":"dinner-two-thirds"):null;
  p.baselineTarget=split&&i===0?{...baseline}:split&&i===1?
    Object.fromEntries(Object.keys(remaining).map(k=>[k,remaining[k]*2/3])):null;
  if(split&&i===1){
   p.carriedFromSnack=Object.fromEntries(Object.keys(remaining).map(k=>[k,Math.max(0,baseline[k]-(meals[0]?.estimate[k]||0))]));
  }
  meals.push(p);
  for(const k of ["k","p","c","f","fi"])left[k]=Math.max(0,left[k]-p.estimate[k]);
 });
 return {ready:true,remaining,slots,meals,projectedLeft:left,split:split?"one-third-two-thirds":null};
}


// Resumen energético para mostrar objetivo, porciones elegidas y faltantes.
// Admite gramajes modificados antes de registrar y reasigna en pantalla a
// la cena las kcal no cubiertas por la merienda, sin guardar datos.
export function plannerEnergyBreakdown(plan,gramOverrides={}){
 if(!plan?.ready||!Array.isArray(plan.meals))return [];
 const balance=sane(plan.remaining?.k);
 const two=plan.split==="one-third-two-thirds"&&plan.meals.length===2;
 let snackChosen=0;
 return plan.meals.map((meal,index)=>{
  const selected=meal.rows.reduce((total,row)=>{
   if(!row.food)return total;
   const key=meal.slot+"|"+row.category;
   const raw=Object.prototype.hasOwnProperty.call(gramOverrides,key)?Number(gramOverrides[key]):Number(row.grams);
   const grams=Number.isFinite(raw)&&raw>=0?raw:0;
   return total+sane(row.food.k)*grams;
  },0);
  const baseline=two?(index===0?balance/3:balance*2/3):sane(meal.target?.k??balance);
  const goal=two&&index===1?Math.max(0,balance-snackChosen):baseline;
  const carry=two&&index===1?balance/3-snackChosen:0;
  const result={
   slot:meal.slot,target:goal,baseline,suggested:sane(meal.estimate?.k),
   selected,remaining:Math.max(0,goal-selected),exceeded:Math.max(0,selected-goal),
   transfer:carry
  };
  if(index===0&&two)snackChosen=selected;
  return result;
 });
}
