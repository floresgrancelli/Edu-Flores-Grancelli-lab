// Private in-memory coach draft editor; no approval, storage, auth or RPC.
import {GUIDE_MEALS,guidedPortionBounds,guideTotals} from './guided-day.js';
import {compositionVerified,evaluateGuideFood,patternConflict} from './guide-compatibility.js';
import {GUIDE_TARGET_TOLERANCE} from './adapted-guided-day.js';
const keys=['k','p','c','f','fi'];
const clone=x=>structuredClone(x);
export function reviewEditedGuide(plan,{catalog,goal,context,tolerance=GUIDE_TARGET_TOLERANCE}={}){
 const issues=[],decisions=[];
 const issue=(code,message)=>issues.push({code,message});
 if(!Array.isArray(catalog)||catalog.some(f=>!f||typeof f.id!=='string')||
  new Set(catalog.map(f=>f.id)).size!==catalog.length)
  return {readyForReview:false,totals:null,decisions,issues:[{code:'catalog',message:'Revisá el catálogo.'}],publishable:false};
 const foods=new Map(catalog.map(f=>[f.id,f]));
 const targets={k:goal?.kcal,p:goal?.protein_g,c:goal?.carb_g,f:goal?.fat_g,fi:goal?.fiber_g};
 const validGoal=keys.every(k=>typeof targets[k]==='number'&&Number.isFinite(targets[k])&&targets[k]>0)&&
  targets.k>=1200&&targets.k<=6000&&Number.isFinite(tolerance)&&tolerance>=0&&tolerance<=GUIDE_TARGET_TOLERANCE;
 if(!validGoal)issue('goal','Revisá las metas con el coach.');
 else if(Math.abs(4*targets.p+4*targets.c+9*targets.f-targets.k)/targets.k>.10)
  issue('goal_conflict','Las calorías y los macros necesitan revisión.');
 const conflict=patternConflict(goal,context?.pattern);if(conflict)issue('pattern',conflict);
 if(!plan||!Array.isArray(plan.meals)||plan.meals.length!==5||
  plan.meals.some(m=>!m||!GUIDE_MEALS.some(x=>x.slot===m.slot)||!Array.isArray(m.items)||!m.items.length)||
  new Set(plan.meals.map(m=>m.slot)).size!==5){
  issue('shape','La guía debe conservar sus cinco comidas.');
  return {readyForReview:false,totals:null,decisions,issues,publishable:false};
 }
 const normalized=clone(plan);let canTotal=true;
 for(const meal of normalized.meals){
  if(new Set(meal.items.map(i=>i?.id)).size!==meal.items.length)issue('duplicate','Evitá repetir el mismo ingrediente en una comida.');
  for(let index=0;index<meal.items.length;index++){
   const item=meal.items[index],food=foods.get(item?.id);
   const qty=item?.qty;
   if(!food||typeof qty!=='number'||!Number.isFinite(qty)||qty<=0||item.unit!==food.unit||
    !['g','ml'].includes(item.unit)){
    canTotal=false;issue('quantity_unit','Elegí un alimento, cantidad positiva y su unidad correcta.');continue;
   }
   const [min,max]=guidedPortionBounds(food.id);
   if(qty<min||qty>max)issue('bounds','La porción queda fuera del rango de la guía.');
   if(!compositionVerified(food,context?.now)){
    canTotal=false;issue('composition','Faltan datos nutricionales verificados.');
   }
   const d=evaluateGuideFood(food,{...context,goal,qty});
   decisions.push({slot:meal.slot,index,id:food.id,qty,...d,
    compositionEvidenceId:food.composition?.id||null,glutenEvidenceId:food.glutenEvidence?.id||null});
   if(!d.eligible)issue('compatibility',d.reason);
   // Never trust nutrient numbers left in an old draft or supplied by an edit.
   meal.items[index]={id:food.id,name:food.name,unit:food.unit,qty,
    ...Object.fromEntries(keys.map(k=>[k,food[k]]))};
  }
 }
 const totals=canTotal?guideTotals(normalized).totals:null;
 if(totals&&context?.pattern?.kind==='keto'&&totals.c>context.pattern.maxCarbG)
  issue('daily_pattern','La suma del día supera los hidratos acordados.');
 if(totals&&validGoal&&keys.some(k=>Math.abs(totals[k]-targets[k])/targets[k]>tolerance))
  issue('targets','La guía editada se aleja de las metas: revisá cantidades.');
 return {readyForReview:issues.length===0,totals,targets,
  perMeal:canTotal?guideTotals(normalized).perMeal:[],decisions,issues,publishable:false,
  normalizedPlan:canTotal?normalized:null};
}
export function createGuideEditor(proposal,environment){
 if(!proposal?.ok||!proposal.plan)throw Error('Primero generá un borrador.');
 const original=clone(proposal.plan);
 return {original,committed:clone(original),working:clone(original),mode:'view',
  origin:'automatic_draft',revision:0,review:reviewEditedGuide(original,environment),publishable:false};
}
export function updateGuideEditor(previous,action,environment){
 const state=clone(previous);delete state.message;
 switch(action.type){
  case 'begin':
   if(state.mode!=='editing'){state.working=clone(state.committed);state.mode='editing';}break;
  case 'replace':{
   if(state.mode!=='editing')throw Error('Abrí primero la edición.');
   const meal=state.working.meals.find(m=>m.slot===action.slot);
   if(!meal||!Number.isInteger(action.index)||action.index<0||action.index>=meal.items.length)
    throw Error('Ingrediente no encontrado.');
   // Replace by stable slot/index: repeated edits cannot append duplicate rows.
   meal.items[action.index]={id:action.id,qty:action.qty,unit:action.unit};break;
  }
  case 'cancel':state.working=clone(state.committed);state.mode='view';break;
  case 'restore':
   state.committed=clone(state.original);state.working=clone(state.original);
   state.mode='view';state.origin='automatic_draft';state.revision++;break;
  case 'refresh':break; // Revalidate latest restrictions/evidence/clock, never reuse old verdict.
  case 'save':{
   if(state.mode!=='editing')throw Error('No hay una edición abierta.');
   const review=reviewEditedGuide(state.working,environment);
   if(review.readyForReview){
    state.committed=clone(review.normalizedPlan);state.working=clone(state.committed);
    state.origin='edited_draft';state.mode='view';state.revision++;
   }else state.message='Corregí los puntos indicados antes de conservar los cambios.';
   break;
  }
  default:throw Error('Acción de borrador no reconocida.');
 }
 state.review=reviewEditedGuide(state.working,environment);
 state.publishable=false;return state;
}

