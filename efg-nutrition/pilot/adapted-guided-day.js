// Private educational proposal. Reuses existing portion optimizer, never publishes.
import {GUIDE_MEALS,rebalanceGuidedDay,guideTotals,guidedPortionBounds} from './guided-day.js';
import {evaluateGuideFood,patternConflict} from './guide-compatibility.js';
const nutrients=['k','p','c','f','fi'];
const fail=(code,message)=>({ok:false,code,message,plan:null,requiresCoachReview:true});
export function proposeAdaptedGuide({catalog,template,goal,context,preferredIds=[],tolerance=.10}={}){
 if(!goal||![goal.kcal,goal.protein_g,goal.carb_g,goal.fat_g,goal.fiber_g].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0)||
  goal.kcal<1200||goal.kcal>6000||!Number.isFinite(tolerance)||tolerance<0||tolerance>.10)
  return fail('invalid_goal','Revisá las metas con el coach.');
 const macroEnergy=4*goal.protein_g+4*goal.carb_g+9*goal.fat_g;
 if(Math.abs(macroEnergy-goal.kcal)/goal.kcal>.10)
  return fail('goal_conflict','Las calorías y los macros necesitan revisión del coach.');
 const conflict=patternConflict(goal,context?.pattern);
 if(conflict)return fail('pattern_conflict',conflict);
 if(!Array.isArray(catalog)||!catalog.every(x=>x&&typeof x.id==='string')||!Array.isArray(preferredIds)||
  new Set(catalog.map(x=>x.id)).size!==catalog.length||
  !Array.isArray(template)||template.length!==5||
  !template.every(m=>m&&typeof m.slot==='string')||
  new Set(template.map(m=>m.slot)).size!==5||template.some(m=>!GUIDE_MEALS.some(x=>x.slot===m.slot)||!Array.isArray(m.groups)||!m.groups.length))
  return fail('invalid_template','Revisá la plantilla del patrón.');
 const foods=new Map(catalog.map(x=>[x.id,x])),chosen=[];
 for(const meal of template){
  const items=[];
  for(const group of meal.groups){
   if(!group||!Array.isArray(group.ids)||!Number.isFinite(group.qty)||group.qty<=0)
    return fail('invalid_template','Falta una porción inicial válida.');
   const candidates=group.ids.map(id=>foods.get(id)).filter(Boolean)
    .filter(f=>evaluateGuideFood(f,{...context,goal,qty:group.qty}).eligible)
    .sort((a,b)=>Number(preferredIds.includes(b.id))-Number(preferredIds.includes(a.id)));
   const f=candidates.find(f=>!items.some(x=>x.id===f.id));
   if(!f)return fail('no_candidates','Faltan opciones compatibles: revisá la propuesta con el coach.');
   items.push({id:f.id,name:f.name,unit:f.unit,qty:group.qty,
    ...Object.fromEntries(nutrients.map(k=>[k,f[k]]))});
  }
  chosen.push({slot:meal.slot,label:meal.label,items});
 }
 let plan;
 try{plan=rebalanceGuidedDay({version:1,kind:'five_meal_example',meals:chosen,
  supplementNote:'',createdFrom:'private_adapted_proposal'},goal);}
 catch{return fail('invalid_goal','No se pudo ajustar esta propuesta. Revisala con el coach.');}
 const decisions=[];
 for(const meal of plan.meals)for(const item of meal.items){
  const assessment=evaluateGuideFood(foods.get(item.id),{...context,goal,qty:item.qty});
  const [min,max]=guidedPortionBounds(item.id);
  if(!assessment.eligible||item.qty<min||item.qty>max)
   return fail('portion_conflict','El ajuste dejó una porción incompatible. Revisá la propuesta.');
  decisions.push({slot:meal.slot,id:item.id,qty:item.qty,...assessment,
   compositionEvidenceId:foods.get(item.id).composition.id,
   glutenEvidenceId:foods.get(item.id).glutenEvidence?.id||null});
 }
 const totals=guideTotals(plan).totals;
 if(context?.pattern?.kind==='keto'&&totals.c>context.pattern.maxCarbG)
  return fail('daily_pattern_conflict','La suma del día supera los hidratos acordados. Revisá el plan.');
 const targets={k:goal.kcal,p:goal.protein_g,c:goal.carb_g,f:goal.fat_g,fi:goal.fiber_g};
 if(nutrients.some(k=>Math.abs(totals[k]-targets[k])/targets[k]>tolerance))
  return fail('no_solution_found','No encontramos una combinación cercana a tus metas. El coach debe ajustarla.');
 return {ok:true,plan,totals,decisions,goal:structuredClone(goal),requiresCoachReview:true,
  publishable:false,notice:'Propuesta educativa: pendiente de revisión del coach.'};
}
