// Shared, side-effect-free compatibility contract. OFF until catalog evidence,
// consent, server permissions and professional review are validated in staging.
// Evidence must come from a reviewed server catalog, never user-supplied claims.
// The frontend cannot authenticate provenance: backend must supply/catalog-authorize
// catalogEvidence separately from editable food/diary payloads. Feature remains OFF.
import {DIET_PATTERNS} from './diet-pattern-workbench.js';
export const FOOD_COMPATIBILITY_ENABLED=false;
const exclusions={vegan:['meat','fish','shellfish','dairy','egg','honey','animal_derivative'],vegetarian:['meat','fish','shellfish','animal_derivative'],pescatarian:['meat','animal_derivative']};
const neutralPatterns=new Set(['balanced','mediterranean','flexitarian']);
const labels={neutral:'Sin restricciones excluyentes',green:'Compatible verificado',yellow:'Revisar información',red:'No compatible con tu restricción'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function classifyFood(food,{patternId='balanced',restrictions=[],inPlan=false}={}, {now=Date.now(),catalogEvidence=[]}={}){
 if(!DIET_PATTERNS.some(p=>p.id===patternId)||!Array.isArray(restrictions)||
    restrictions.some(r=>typeof r!=='string'||r.length>100||!r.trim())||
    !Array.isArray(catalogEvidence))throw Error('Perfil de compatibilidad inválido');
 const active=[...new Set([...restrictions,...(neutralPatterns.has(patternId)?[]:['pattern:'+patternId])])];
 const results=[];
 for(const rule of active){
  // Never consume food.compatibilityEvidence: a diary/food object can be edited.
  // These entries must be provided by a server-controlled vetted catalog adapter.
  const evidence=catalogEvidence.filter(e=>e&&typeof food?.id==='string'&&food.id.length>0&&
    e.rule===rule&&e.foodId===food.id&&e.status==='reviewed'&&
    typeof e.catalogReviewId==='string'&&/^[A-Za-z0-9_-]{8,120}$/.test(e.catalogReviewId)&&
    typeof e.catalogVersion==='string'&&/^[A-Za-z0-9._-]{3,60}$/.test(e.catalogVersion)&&
    ['manufacturer_label','official_product','validated_composition'].includes(e.sourceKind)&&
    typeof e.sourceUrl==='string'&&/^https:\/\//.test(e.sourceUrl)&&
    Number.isFinite(Date.parse(e.reviewedAt))&&Date.parse(e.reviewedAt)<=now&&
    Number.isFinite(Date.parse(e.expiresAt))&&Date.parse(e.expiresAt)>now);
  // Clinical restrictions remain unknown until a professionally reviewed rule
  // registry supports them. Never infer allergy/gluten safety from food names.
  const pattern=rule.startsWith('pattern:')?rule.slice(8):null;
  const denied=exclusions[pattern];
  if(!denied){results.push({rule,color:'yellow',reason:'Requiere información y revisión individual; no se infieren prohibiciones.',sources:[]});continue;}
  const valid=evidence.filter(e=>Array.isArray(e.ingredientClasses)&&e.ingredientClasses.every(c=>['plant','meat','fish','shellfish','dairy','egg','honey','animal_derivative','mineral','microbial'].includes(c)));
  const incompatible=valid.find(e=>e.ingredientClasses.some(c=>denied.includes(c)));
  const complete=valid.find(e=>e.completeIngredients===true&&e.ingredientClasses.length>0);
  results.push({rule,color:incompatible?'red':complete?'green':'yellow',reason:incompatible?'Ingrediente incompatible documentado.':complete?'Ingredientes completos revisados para este patrón.':'Ingredientes incompletos, desconocidos o evidencia vencida.',sources:[...new Set(valid.map(e=>e.sourceUrl))]});
 }
 const color=!results.length?'neutral':results.some(r=>r.color==='red')?'red':results.some(r=>r.color==='yellow')?'yellow':'green';
 return {color,label:labels[color],reasons:results,inPlan:inPlan===true,canRecord:true};
}
export function renderFoodCompatibility(result){
 const badge=result.inPlan?'<span class="efg-in-plan">Incluido en mi plan</span>':'';
 if(result.color==='neutral')return badge;
 if(!labels[result.color])throw Error('Clasificación inválida');
 return '<span class="efg-food-compatibility efg-compat-'+result.color+'">'+esc(labels[result.color])+'</span>'+badge+
  '<ul class="efg-compat-reasons">'+(result.reasons||[]).map(r=>{
   const sources=Array.isArray(r.sources)?[...new Set(r.sources)].filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)).slice(0,3):[];
   return '<li>'+esc(r.reason)+
    (sources.length?'<span class="efg-compat-sources">'+sources.map((url,i)=>
      ' <a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir fuente '+(i+1)+' de compatibilidad">Fuente '+(i+1)+'</a>').join('')+'</span>':'')+'</li>';
  }).join('')+'</ul>';
}
