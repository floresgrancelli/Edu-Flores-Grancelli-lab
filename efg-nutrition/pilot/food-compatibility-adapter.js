// COACH101 — READ-ONLY reviewed food compatibility data from protected Supabase table.
// No medical conclusions, no localStorage, no user-submitted food evidence.
// Table is RLS SELECT reviewed-only and writable solely by private operator.
import {classifyFood,renderFoodCompatibility} from './food-compatibility.js';
const CODE=/^[A-Za-z0-9_-]{1,100}$/;
const RULE=/^[A-Za-z0-9:_-]{3,100}$/;
export const COACH101_TRAFFIC_LIGHT_REVISION='pilot_2026_evidence_v1';
export function profilePatternForCompatibility(pattern){
 const known=new Set(['balanced','mediterranean','vegan','vegetarian','pescatarian','flexitarian','dash','portfolio','low_carb','keto']);
 return pattern==='omnivore'?'balanced':known.has(pattern)?pattern:'balanced';
}
export function reviewedRowsToCatalogEvidence(rows){
 if(!Array.isArray(rows))throw Error('No se obtuvo un catálogo válido.');
 return rows.filter(r=>r&&CODE.test(r.food_id)&&RULE.test(r.rule)&&r.status==='reviewed'
  &&typeof r.source_url==='string'&&r.source_url.startsWith('https://')
  &&typeof r.catalog_review_id==='string'&&typeof r.catalog_version==='string')
 .map(r=>({
  foodId:r.food_id,rule:r.rule,status:r.status,catalogReviewId:r.catalog_review_id,
  catalogVersion:r.catalog_version,sourceKind:r.source_kind,sourceUrl:r.source_url,
  ingredientClasses:Array.isArray(r.ingredient_classes)?r.ingredient_classes:[],
  completeIngredients:r.complete_ingredients===true,
  reviewedAt:r.reviewed_at,expiresAt:r.expires_at
 }));
}
export async function loadReviewedFoodEvidence(sb,{foodIds,patterns}={}){
 if(typeof sb?.from!=='function'||!Array.isArray(foodIds)||!Array.isArray(patterns))
  throw Error('La consulta de compatibilidad no está disponible.');
 const ids=[...new Set(foodIds)].filter(x=>typeof x==='string'&&CODE.test(x)).slice(0,1000);
 const rules=[...new Set(patterns.map(x=>'pattern:'+profilePatternForCompatibility(x)))];
 if(!ids.length||!rules.length||rules.every(x=>x==='pattern:balanced'))return [];
 const rows=[];
 for(let i=0;i<ids.length;i+=70){
  const r=await sb.from('efg_food_compatibility_evidence')
   .select('food_id,rule,status,catalog_review_id,catalog_version,source_kind,source_url,ingredient_classes,complete_ingredients,reviewed_at,expires_at')
   .in('food_id',ids.slice(i,i+70)).in('rule',rules).eq('status','reviewed').limit(500);
  if(r.error)throw Error('No se pudieron consultar las revisiones de alimentos.');
  if(!Array.isArray(r.data))throw Error('Catálogo alimentario no verificable.');
  rows.push(...r.data);
 }
 return reviewedRowsToCatalogEvidence(rows);
}
export function describeTrafficLight(food,{pattern='balanced',restrictions=[],inPlan=false,evidence=[]}={}){
 const result=classifyFood(food,{patternId:profilePatternForCompatibility(pattern),restrictions,inPlan},{catalogEvidence:evidence});
 // A signal without an active rule remains neutral even if the food is calorie-dense.
 const symbol={neutral:'',green:'🟢',yellow:'🟡',red:'🔴'}[result.color]??'';
 return {color:result.color,symbol,short:result.label,details:renderFoodCompatibility(result),
  canRecord:result.canRecord,verified:result.color==='green'||result.color==='red'};
}
