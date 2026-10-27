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
const SLOTS=["protein","carbs","vegetable","fat"];
const NUTRIENTS=["k","p","c","f"];
const EMPTY={k:0,p:0,c:0,f:0,fi:0};
function portionMax(food,position){
 const id=food?.id||"",category=food?.category||"";
 if(id==="milanesa_soy_gobinda")return 250; // Hasta dos unidades de 125 g.
 if(/oil|aceite|butter|manteca/i.test(id))return 20; // Nunca inferir grasas del nombre: "arroz sin aceite" no es aceite.
 if(/whey|creatine|protein_powder/i.test(id))return 60;
 if(category==="fat")return 55;
 if(category==="extra")return 30;
 if(category==="dessert"||category==="bakery")return 140;
 if(category==="drink")return 450;
 if(category==="recipe"||category==="prepared")return 350;
 return position>=2?240:350;
}
function portionCost(foods,grams,target){
 const total={...EMPTY};
 foods.forEach((food,i)=>{
  if(!food)return;
  for(const key of NUTRIENTS)total[key]+=sane(food[key])*grams[i];
 });
 const floor={k:160,p:18,c:25,f:8};
 let score=0;
 for(const key of NUTRIENTS){
  const deficit=(total[key]-target[key])/Math.max(target[key],floor[key]);
  score+=(key==="k"?1.5:1)*(deficit>0?2:1)*deficit*deficit;
 }
 // Preferir porciones manejables ante combinaciones nutricionalmente equivalentes.
 grams.forEach((g,i)=>{if(foods[i])score+=.009*Math.pow(g/Math.max(portionMax(foods[i],i),1),2)});
 return score;
}
function optimizePortions(items,target){
 let amounts=items.map(()=>0);
 // Búsqueda determinista por coordenadas con pasos de 5 g; nunca se sugiere
 // compensar un macronutriente con cantidades ilimitadas de otro.
 for(let pass=0;pass<6;pass++){
  for(let i=0;i<items.length;i++){
   const food=items[i];if(!food){amounts[i]=0;continue;}
   const meaningful=NUTRIENTS.some(key=>sane(food[key])>.00001);
   if(!meaningful){amounts[i]=0;continue;}
   let best=portionCost(items,amounts,target),amount=amounts[i];
   const cap=portionMax(food,i);
   const step=Number(food.servingGrams)>0&&Number(food.servingGrams)<=cap?Number(food.servingGrams):5;
   for(let g=0;g<=cap;g+=step){
    amounts[i]=g;
    const cost=portionCost(items,amounts,target);
    if(cost<best-1e-8){best=cost;amount=g;}
   }
   amounts[i]=amount;
  }
 }
 return amounts;
}
export function proposeMeal({foods,approved,slot,remaining,share=1,selections={}}){
 const catalog=allPlannerFoods(foods,approved),profiles=PREFERRED[slot]||PREFERRED.cena;
 const byId=new Map(catalog.map(f=>[f.id,f]));
 const target=Object.fromEntries(NUTRIENTS.map(key=>[key,sane(remaining?.[key])*share]));
 const chosen=SLOTS.map((category,i)=>{
  const id=selections[slot+"|"+category];
  if(id==="none"||(!id&&i>=2))return null;
  if(id&&byId.has(id))return byId.get(id);
  if(id&&!byId.has(id))return null;
  const preferred=(profiles[category]||[]).map(x=>byId.get(x)).find(Boolean);
  return preferred||catalog.find(f=>NUTRIENTS.some(key=>sane(f[key])>0))||null;
 });
 const portions=optimizePortions(chosen,target);
 const rows=SLOTS.map((category,i)=>({food:chosen[i],category,grams:portions[i],unit:chosen[i]?.unit||"g"}));
 const estimate={...EMPTY};
 rows.forEach(row=>{
  if(!row.food)return;
  for(const key of Object.keys(estimate))estimate[key]+=sane(row.food[key])*row.grams;
 });
 return {slot,rows,estimate};
}
export function makePlan({foods,approved,diary,goals,totals,dinnerOnly=false,selections={}}){
 if(!goals)return {ready:false,reason:"Para calcular porciones necesitamos primero las metas aprobadas por el coach."};
 const remaining=Object.fromEntries(["k","p","c","f","fi"].map(k=>[k,Math.max(0,sane(goals[k])-sane(totals[k]))]));
 const slots=futureSlots(diary,dinnerOnly);
 if(!slots.length)return {ready:false,remaining,reason:dinnerOnly?"La cena ya está registrada u omitida. Podés corregirla desde el diario.":"Todas las comidas posteriores ya se registraron u omitieron."};
 let left={...remaining};
 const meals=[];
 slots.forEach((slot,i)=>{
   const share=(slots.length-i===2 && slot==="merienda") ? 0.32 : 1;
   const p=proposeMeal({foods,approved,slot,remaining:left,share,selections});
   meals.push(p);
   for(const k of ["k","p","c","f","fi"])left[k]=Math.max(0,left[k]-p.estimate[k]);
 });
 return {ready:true,remaining,slots,meals,projectedLeft:left};
}
