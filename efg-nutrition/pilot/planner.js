// EFG Nutrition - motor de planificación orientativa para alimentos pesados.
// No prescribe tratamiento; solo estima porciones en función del balance restante.
export const FOOD_GROUPS = {
  protein:["chicken","beef","pork","tuna","egg","yogurt","cheese"],
  carbs:["brownrice","rice","potato","sweetpotato","pasta","protein_pasta","bread","banana"],
  vegetable:["rocket","pumpkin"],
  fat:["oil","avocado"]
};
export const FOOD_DEFAULTS = ["egg","bread","milk","cheese","quince","cake","yogurt","chicken","beef","pork","tuna","brownrice","rice","potato","sweetpotato","pasta","protein_pasta","banana","rocket","pumpkin","oil","avocado"];
export const MEAL_ORDER=["desayuno","media_manana","almuerzo","media_tarde","merienda","cena"];
const PREFERRED={
 cena:{protein:["chicken","pork","beef","tuna","egg"],carbs:["potato","sweetpotato","brownrice","rice","pasta","protein_pasta","bread"],vegetable:["rocket","pumpkin"],fat:["oil","avocado"]},
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
export function equivalentPortion(a,grams,b,category){
 let nutrient=MATCH[category]||"c";
 if(!a||!b||a[nutrient]<=0||b[nutrient]<=0||grams<=0)return null;
 return {grams:Math.round(grams*a[nutrient]/b[nutrient]),nutrient,estimated:true};
}
export function futureSlots(diary,dinnerOnly){
 if(dinnerOnly)return (diary?.skipped||{}).cena||diary?.meals?.cena?.length?[]:["cena"];
 const meals=diary?.meals||{},skipped=diary?.skipped||{};
 let last=-1;
 MEAL_ORDER.forEach((slot,i)=>{if((meals[slot]||[]).length>0&&!skipped[slot])last=i;});
 const future=MEAL_ORDER.filter((slot,i)=>i>last&&!skipped[slot]&&!(meals[slot]||[]).length);
 // Sugerir merienda + cena, evitando exigir además "media tarde".
 if(future.includes("cena"))return (future.includes("merienda")?["merienda","cena"]:["cena"]);
 return future.slice(0,2);
}
export function proposeMeal({foods,approved,slot,remaining,share=1,selections={}}){
 const profile=PREFERRED[slot]||PREFERRED.cena,caps=CAPS[slot]||CAPS.cena;
 const remainingGoal=Object.fromEntries(["k","p","c","f"].map(k=>[k,sane(remaining?.[k])*share]));
 const rows=[];
 for(const category of ["protein","carbs","vegetable","fat"]){
  let possibles=optionsFor(foods,approved,category);
  if(!possibles.length)continue;
  const id=selections[slot+"_"+category];
  let chosen=possibles.find(f=>f.id===id)||profile[category].map(pid=>possibles.find(f=>f.id===pid)).find(Boolean)||possibles[0];
  const key=MATCH[category];
  let want=remainingGoal[key];
  let cap=caps[category];
  let quantity;
  if(category==="vegetable")quantity=slot==="cena"||slot==="almuerzo"?120:0;
  else if(category==="fat")quantity=clamp(Math.round(want/Math.max(chosen.f,.01)*.6),0,cap);
  else quantity=clamp(Math.round(want/Math.max(chosen[key],.01)),0,cap);
  if(quantity<1)continue;
  rows.push({food:chosen,category,grams:quantity,unit:chosen.unit||"g"});
  for(const k of ["k","p","c","f"])remainingGoal[k]=Math.max(0,remainingGoal[k]-sane(chosen[k])*quantity);
 }
 const estimate=rows.reduce((a,row)=>{
  for(const key of ["k","p","c","f","fi"])a[key]+=(row.food[key]||0)*row.grams;
  return a;
 },{k:0,p:0,c:0,f:0,fi:0});
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
   const share=(slots.length-i===2 && slot==="merienda")?.32:1;
   const p=proposeMeal({foods,approved,slot,remaining:left,share,selections});
   meals.push(p);
   for(const k of ["k","p","c","f","fi"])left[k]=Math.max(0,left[k]-p.estimate[k]);
 });
 return {ready:true,remaining,slots,meals,projectedLeft:left};
}
