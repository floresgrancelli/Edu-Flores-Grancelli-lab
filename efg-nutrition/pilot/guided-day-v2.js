// Nutrición Con-Ciencia — automatic six-slot *orientative* guide for the coach.
// This module does not read or store health data. The caller must supply a CURRENT,
// consented and server-authorized profile; this is not a medical decision engine.
// The existing food catalog is reused in full, never filtered for a student's diary.
import {GUIDE_MEALS,rebalanceGuidedDay,guideDeviation,guidedPortionBounds} from './guided-day.js?v=ncc-micro-restaurants-r1-20261114';

import {normalizeGuidedCountableQuantity} from "./guided-countable-portions.js?v=ncc-micro-restaurants-r1-20261114";

export const SIX_GUIDE_SLOTS=Object.freeze([
 ['desayuno','Desayuno'],['media_manana','Media mañana'],
 ['almuerzo','Almuerzo'],['media_tarde','Media tarde'],
 ['merienda','Merienda'],['cena','Cena']
]);
const slotIds=new Set(SIX_GUIDE_SLOTS.map(x=>x[0]));
export const FLEXIBLE_GUIDE_KIND='flexible_meal_guide';
const required=['k','p','c','f','fi'];
const isNum=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const groupSets=Object.freeze({
  breakfastProtein:['egg','egg_white','tofu_firm','tempeh','yogurt_greek_light','cheese','turkey_breast_cooked'],
  protein:['chicken','fish_hake','egg','tofu_firm','tempeh','soy_textured_hydrated','lentils_cooked','chickpeas_cooked','beans_black'],
  carb:['brownrice','rice','potato','sweetpotato','banana','apple','pear','corn_cooked','quinoa_cooked','bread_glutenfree','rice_cakes'],
  snackProtein:['yogurt','yogurt_greek_light','egg','egg_white','tofu_firm','tempeh','chickpeas_cooked','walnuts'],
  fat:['oil','avocado','walnuts','almonds','chia','sunflower_oil'],
  produce:['pumpkin','rocket','spinach_cooked','zucchini','lettuce','tomato','apple','banana','pear','mandarin','strawberry']
});
const glutenNames=/\b(pan|tostadas?|trigo|centeno|cebada|cusc[uú]s|s[eé]itan|pastas? comunes|fideos? comunes)\b/i;
const wheatIds=new Set(['bread','bread_white','bread_rye','toast_whole','tortilla_wheat','pasta','pasta_raw','protein_pasta','pasta_dry','couscous_cooked','bulgur_cooked','barley_cooked','seitan_cooked']);
const lactoseIds=new Set(['milk','milk_skim','milk_whole','cheese','yogurt','yogurt_greek','yogurt_greek_light','yogurt_high_protein','ricotta_light','ricotta_whole','cottage_cheese','cream_cheese_light']);
const animalIds=new Set(['egg','egg_white','egg_boiled','chicken','beef','pork','fish_hake','fish_salmon','milk','milk_skim','milk_whole','milk_lactosefree','cheese','yogurt','yogurt_greek_light','yogurt_high_protein','whey_powder','honey','turkey_breast_cooked']);
const fishIds=new Set(['fish_hake','fish_salmon','fish_sardines','fish_mackerel','tuna','fish_shrimp','mussels_cooked']);
const meatAndFishIds=new Set(['chicken','beef','pork','turkey_breast_cooked','ham_cooked','chicken_breast_raw','lean_ground_beef',...fishIds]);
const dairyNames=/\b(leche|yogur|queso|ricota|l[aá]cteo|crema|whey)\b/i;
const highCarbIds=new Set(['bread','bread_white','bread_rye','toast_whole','rice','brownrice','pasta','potato','sweetpotato','oats_raw','banana','apple','mandarin','quince','milk_skim','corn_cooked']);
const naturallySimple=new Set(['egg','egg_white','banana','apple','pear','mandarin','orange','strawberry','rice','brownrice','potato','sweetpotato','pumpkin','rocket','oil','avocado','chicken','fish_hake','tofu_firm','broccoli_cooked','zucchini']);
const plainName=x=>String(x?.name||'').toLocaleLowerCase('es-AR');
function normalizeProfile(raw={}){
 if(raw.restrictions!==undefined&&!Array.isArray(raw.restrictions))throw Error('Restricciones alimentarias inválidas.');
 const restrictionStatus=raw.restrictionStatus??'unspecified';
 if(!['unknown','declared','none_declared','unspecified'].includes(restrictionStatus))throw Error('Estado de declaración inválido.');
 const restrictions=[...new Set((raw.restrictions||[]).filter(x=>typeof x==='string').map(x=>x.toLowerCase().trim()))];
 const pattern=String(raw.patternId||raw.dietaryPattern||raw.pattern||'balanced').toLowerCase();
 const fasting=String(raw.windowId||raw.fasting||'regular');
 const disliked=[...new Set((raw.dislikedIds||raw.disliked||[]).filter(x=>typeof x==='string'))];
 if(restrictions.length>16||!['balanced','omnivore','mediterranean','flexitarian','vegetarian','vegan','pescatarian','keto','low_carb','dash','portfolio'].includes(pattern)||
  !['regular','12_12','14_10','16_8'].includes(fasting)||disliked.length>100)
  throw Error('Perfil alimentario inválido.');
 return {restrictions,pattern,fasting,disliked,restrictionStatus};
}
export function guideFoodSignal(food,raw={}){
 const profile=normalizeProfile(raw),id=food?.id||'',name=plainName(food);
 if(!id)return {status:'review',reason:'Alimento no identificado'};
 const restricted=profile.restrictions;
 const isCeliac=restricted.some(x=>['celiac','celiaco','celiaquia','gluten','gluten_free'].includes(x));
 const lactose=restricted.some(x=>['lactose_intolerance','lactose'].includes(x));
 if(profile.disliked.includes(id))return {status:'avoid',reason:'No elegido por el alumno'};
 if(isCeliac&&(wheatIds.has(id)||glutenNames.test(name)&&!(/sin gluten|gluten free|sin tacc/.test(name))))
  return {status:'avoid',reason:'Contiene cereal con gluten en su presentación común'};
 if(lactose&&(lactoseIds.has(id)||dairyNames.test(name)&&!(/sin lactosa|deslactosad/.test(name))))
  return {status:'avoid',reason:'Contiene lácteo convencional en su presentación común'};
 const vegan=profile.pattern==='vegan',vegetarian=profile.pattern==='vegetarian';
 if(vegan&&(animalIds.has(id)||fishIds.has(id)||/^(meat|fish|shellfish|dairy|egg)$/.test(food?.category||'')))
  return {status:'avoid',reason:'No corresponde al patrón vegano'};
 if(vegetarian&&(meatAndFishIds.has(id)||/^(meat|fish|shellfish)$/.test(food?.category||'')))
  return {status:'avoid',reason:'No corresponde al patrón vegetariano'};
 if((vegan||vegetarian)&&/(pollo|pescado|carne|cerdo|jam[oó]n|at[uú]n|merluza)/.test(name))
  return {status:'avoid',reason:'Ingrediente de carne o pescado evidente'};
 if(profile.pattern==='keto'&&highCarbIds.has(id))
  return {status:'avoid',reason:'No se usa como alimento base de esta guía baja en hidratos'};
 if(restricted.includes('food_allergy'))return {status:'review',reason:'Revisar alérgeno específico e ingredientes'};
 if(restricted.some(x=>!['celiac','celiaco','celiaquia','gluten','gluten_free','lactose_intolerance','lactose'].includes(x)))
  return {status:'review',reason:'Otra restricción requiere revisión del coach'};
 if(food.recipeIngredients||id.startsWith('fit-recipe:')||id.startsWith('custom-recipe:'))return {status:'review',reason:'Revisar ingredientes completos de la receta'};
 if(isCeliac&&!naturallySimple.has(id))return {status:'review',reason:'Verificar etiqueta, preparación y contaminación cruzada'};
 if(lactose&&dairyNames.test(name))return {status:'review',reason:'Verificar rótulo y tolerancia individual'};
 if(profile.restrictionStatus==='unknown')return {status:'review',reason:'Restricciones sin verificar: no se puede asumir ausencia de alergias'};
 return {status:'possible',reason:'Propuesta general; considerar preparación y preferencias'};
}
const roleOf=(id,slot)=>{
 if(['oil','sunflower_oil','avocado','walnuts','almonds','chia'].includes(id))return 'fat';
 if(['rocket','pumpkin','spinach_cooked','zucchini','lettuce','tomato'].includes(id))return 'produce';
 if(['brownrice','rice','bread','bread_white','potato','sweetpotato','oats_raw','banana','apple','mandarin','pear','corn_cooked','bread_glutenfree'].includes(id))return 'carb';
 return ['desayuno'].includes(slot)?'breakfastProtein':['media_manana','media_tarde','merienda'].includes(slot)?'snackProtein':'protein';
};
function fallbackOrder(food,slot,profile){
 const role=roleOf(food.id,slot);
 if(profile.pattern==='vegan'){
  if(role==='breakfastProtein')return ['tofu_firm','tempeh','chickpeas_cooked','walnuts'];
  if(role==='snackProtein')return ['walnuts','tempeh','chickpeas_cooked','tofu_firm'];
  if(role==='protein')return slot==='cena'
   ?['tempeh','tofu_firm','chickpeas_cooked','lentils_cooked']
   :['soy_textured_hydrated','tofu_firm','tempeh','chickpeas_cooked','lentils_cooked'];
 }
 if(profile.pattern==='keto'){
  if(role==='carb')return ['almuerzo','cena'].includes(slot)
   ?['zucchini','broccoli_cooked','rocket','avocado','strawberry']
   :['strawberry','avocado','broccoli_cooked','rocket','zucchini'];
  if(role==='protein'||role==='snackProtein')return ['egg','chicken','fish_hake','tofu_firm'];
  if(role==='fat')return ['avocado','oil','walnuts'];
 }
 if(profile.restrictions.some(x=>['celiac','celiaco','celiaquia','gluten','gluten_free'].includes(x))&&role==='carb')
  return ['banana','apple','brownrice','rice','potato','corn_cooked','quinoa_cooked'];
 if(profile.restrictions.some(x=>['lactose_intolerance','lactose'].includes(x))&&['snackProtein','breakfastProtein'].includes(role))
  return ['egg','egg_white','tofu_firm','walnuts','tempeh'];
 return groupSets[role]||groupSets.carb;
}
const ensureSource=(food,qty)=>{
 if(!food||typeof food.id!=='string'||!required.every(k=>isNum(food[k])))
  throw Error('El alimento '+String(food?.id||food?.name||'desconocido')+' tiene datos nutricionales incompletos. Revisá su ficha antes de generar la guía.');
 return {id:food.id,name:food.name||food.id,unit:food.unit||'g',qty,
  sourceType:food.sourceType||'generic_estimate',validationStatus:food.validationStatus||'generico_pendiente',
  ...Object.fromEntries(required.map(k=>[k,food[k]]))};
};
const templates=Object.freeze([
 ...GUIDE_MEALS.slice(0,3),
 {slot:'media_tarde',label:'Media tarde',items:[['yogurt',150],['banana',85],['cheese',25]]},
 ...GUIDE_MEALS.slice(3)
]);
function initialSlots(profile){
 if(profile.fasting==='16_8')return new Set(['almuerzo','media_tarde','merienda','cena']);
 if(profile.fasting==='14_10')return new Set(['media_manana','almuerzo','media_tarde','merienda','cena']);
 return new Set(SIX_GUIDE_SLOTS.map(x=>x[0]));
}
export function generateFlexibleGuidedDay(catalog,goal,options={}){
 const profile=normalizeProfile(options),available=new Map((catalog||[]).filter(x=>typeof x?.id==='string').map(x=>[x.id,x]));
 if(!Number.isFinite(goal?.kcal)||goal.kcal<1200||!['protein_g','carb_g','fat_g'].every(k=>Number.isFinite(goal?.[k])&&goal[k]>=0))
  throw Error('Primero calculá y revisá las metas de energía y macronutrientes.');
 if(!available.size)throw Error('No hay alimentos disponibles.');
 if(profile.restrictions.includes('food_allergy')&&!options.allergenDetailsConfirmed)
  throw Error('Revisá primero qué alérgeno declaró el alumno antes de generar la guía automática.');
 const active=initialSlots(profile),meals=[],notices=[];
 if(profile.restrictionStatus==='unknown')notices.push('Restricciones sin verificar: no presupongas ausencia de celiaquía, intolerancias o alergias.');
 if(Array.isArray(options.restrictionReviewNotes))notices.push(...options.restrictionReviewNotes.filter(x=>typeof x==='string'&&x.length<=220));
 for(const template of templates){
  if(!active.has(template.slot))continue;
  const used=new Set(),items=[];
  for(const [baseId,qty] of template.items){
   let food=available.get(baseId),signal=guideFoodSignal(food,profile);
   if(!food||signal.status==='avoid'||signal.status==='review'){
    const choices=fallbackOrder({id:baseId},template.slot,profile);
    const options=choices.map(id=>available.get(id)).filter(f=>f&&!used.has(f.id));
    // With unknown medical status every otherwise compatible food is amber.
    // Still offer a vegan/other pattern swap as an UNAPPROVED coach draft;
    // never keep a known-incompatible base merely because the alternative
    // requires review. Do not arbitrarily replace a usable amber base.
    const choose=options.find(f=>guideFoodSignal(f,profile).status==='possible')||
      (profile.restrictionStatus==='unknown'&&(!food||signal.status==='avoid')
        ?options.find(f=>guideFoodSignal(f,profile).status==='review'):null);
    if(choose){food=choose;signal=guideFoodSignal(food,profile);}
   }
   if(!food||used.has(food.id)||signal.status==='avoid')continue;
   if(signal.status==='review'&&profile.restrictionStatus!=='unknown')notices.push(template.label+': revisar '+food.name+' ('+signal.reason+').');
   const [min,max]=guidedPortionBounds(food.id);
   const grams=Math.min(max,Math.max(min,qty));
   items.push(ensureSource(food,grams));used.add(food.id);
  }
  // An uncertain profile is better surfaced to the coach than falsely approved.
  if(!items.length)throw Error('No se pudo formar '+template.label+' con este perfil; revisión del coach requerida.');
  meals.push({slot:template.slot,label:template.label,items});
 }
 if(options.includeWhey&&available.has('whey_powder')&&active.has('media_manana')){
  const whey=available.get('whey_powder');
  if(guideFoodSignal(whey,profile).status==='possible'&&
    !meals.find(m=>m.slot==='media_manana').items.some(x=>x.id==='whey_powder'))
   meals.find(m=>m.slot==='media_manana').items.push(ensureSource(whey,30));
 }
 if(profile.pattern==='keto'&&goal.carb_g>Number(options.maxKetoCarbs??100))
  notices.push('El objetivo de hidratos es alto para el patrón keto declarado. El coach debe revisarlo.');
 const plan={version:2,kind:FLEXIBLE_GUIDE_KIND,windowId:profile.fasting,meals,supplementNote:'',
  createdFrom:'coach_approved_goal',profileReviewNotes:[...new Set(notices)].slice(0,25)};
 // Capture at generation, never overwrite from a newer declaration at save.
 // Edits/rebalance clone this source; the server must revalidate it on publish.
 if(options.restrictionSource){
  const s=options.restrictionSource,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(!uuid.test(s.studentId||'')||!uuid.test(s.organizationId||'')||
   !Number.isSafeInteger(s.revision)||s.revision<1||!['declared','none_declared'].includes(s.status))
   throw Error('La declaración de restricciones no tiene una revisión verificable.');
  plan.restrictionSource={studentId:s.studentId,organizationId:s.organizationId,revision:s.revision,status:s.status};
 }
 return fitGeneratedComposition(plan,goal,available,profile);
}
// Generation may choose another compatible food; editing an existing guide
// continues to rebalance quantities only, preserving the coach's choices.
// Use the same strict daily tolerance for composition selection and quantity
// repair. A 5% selection gate can stop at a repertoire that cannot meet 2%.
function fitGeneratedComposition(plan,goal,available,profile){
 const loss=p=>Object.values(guideDeviation(p,goal)).reduce((sum,d)=>sum+
  (d.target>0?Math.max(0,Math.abs(d.percent)-1.99)**2:0),0);
 let current=rebalanceGuidedDay(plan,goal,{targetTolerance:.0199,wholeUnitSearch:false}),currentLoss=loss(current);
 // One bounded repair opportunity per possible meal, rather than stopping
 // after three changes when whole-unit choices need additional compensation.
 for(let pass=0;pass<6&&currentLoss>0;pass++){
  let best=null,bestLoss=currentLoss;
  candidateSearch: for(let mi=0;mi<current.meals.length;mi++){
   const meal=current.meals[mi],used=new Set(meal.items.map(x=>x.id));
   for(let ii=0;ii<meal.items.length;ii++){
    const prior=meal.items[ii];if(prior.locked||prior.recipeComponent)continue;
    const choices=groupSets[roleOf(prior.id,meal.slot)]||[];
    for(const id of choices){
     const food=available.get(id);
     if(!food||used.has(id)||guideFoodSignal(food,profile).status!=='possible')continue;
     const next=structuredClone(current),[min,max]=guidedPortionBounds(id);
     next.meals[mi].items[ii]=ensureSource(food,Math.max(min,Math.min(max,prior.qty)));
     const candidate=rebalanceGuidedDay(next,goal,{targetTolerance:.0199,wholeUnitSearch:false}),candidateLoss=loss(candidate);
     if(candidateLoss<bestLoss-1e-8){
      best=candidate;bestLoss=candidateLoss;
      // Zero violation is already optimal; later candidates cannot improve it.
      if(bestLoss===0)break candidateSearch;
     }
    }
   }
  }
  if(!best)break;
  current=best;currentLoss=bestLoss;
 }
 // Final quantity-only repair: prioritize all daily targets, including fiber,
 // over meal-share preferences. Preserve the selected foods and whole counts.
 return rebalanceGuidedDay(current,goal,{targetTolerance:.0199});
}
function assertFlexible(plan){
 if(plan?.kind!==FLEXIBLE_GUIDE_KIND||plan?.version!==2||!Array.isArray(plan.meals)||
   plan.meals.length<2||plan.meals.length>6||new Set(plan.meals.map(x=>x.slot)).size!==plan.meals.length||
   plan.meals.some(x=>!slotIds.has(x.slot)||!Array.isArray(x.items)||x.items.length<1))
  throw Error('La Dieta Guía debe conservar al menos dos comidas distintas.');
}
export function removeFlexibleMeal(existing,slot,goal){
 assertFlexible(existing);
 if(!slotIds.has(slot)||!existing.meals.some(x=>x.slot===slot)||existing.meals.length<=2)
  throw Error('Dejá al menos dos horarios en la Dieta Guía.');
 const next=structuredClone(existing);
 next.meals=next.meals.filter(m=>m.slot!==slot);
 return rebalanceGuidedDay(next,goal);
}
export function removeFlexibleFood(existing,slot,index,goal){
 assertFlexible(existing);
 const next=structuredClone(existing),meal=next.meals.find(m=>m.slot===slot);
 if(!meal||!Number.isInteger(index)||index<0||index>=meal.items.length||meal.items.length<=1)
  throw Error('La comida debe contener al menos un alimento.');
 meal.items.splice(index,1);
 // Removal must repair daily targets, not optimize meal distribution alone.
 return rebalanceGuidedDay(next,goal,{targetTolerance:.0149});
}
export function addFlexibleFood(existing,slot,food,catalog,goal){
 assertFlexible(existing);
 const next=structuredClone(existing),meal=next.meals.find(m=>m.slot===slot);
 const found=(catalog||[]).find(x=>x.id===food?.id);
 if(!meal||!found||meal.items.length>=15||meal.items.some(x=>x.id===found.id))
  throw Error('Revisá el alimento elegido; ya existe o no está disponible.');
 const [min,max]=guidedPortionBounds(found.id);
 const item=ensureSource(found,Math.max(min,Math.min(max,Number(food.qty)||min)));
 item.qty=normalizeGuidedCountableQuantity(item);
 meal.items.push({...item,locked:true});
 return rebalanceGuidedDay(next,goal);
}
export function replaceFlexibleFood(existing,slot,index,newFood,catalog,goal){
 assertFlexible(existing);
 const next=structuredClone(existing),meal=next.meals.find(m=>m.slot===slot),found=(catalog||[]).find(x=>x.id===newFood?.id);
 if(!meal||!found||!Number.isInteger(index)||index<0||index>=meal.items.length||
  meal.items.some((x,j)=>j!==index&&x.id===found.id))throw Error('Alternativa no disponible o duplicada.');
 const [min,max]=guidedPortionBounds(found.id),prior=meal.items[index];
 const item=ensureSource(found,Math.max(min,Math.min(max,newFood.qty??prior.qty)));
 item.qty=normalizeGuidedCountableQuantity(item);
 meal.items[index]={...item,locked:true};
 return rebalanceGuidedDay(next,goal);
}
