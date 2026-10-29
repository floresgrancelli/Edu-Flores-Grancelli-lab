// Shared, side-effect-free compatibility contract. OFF until catalog evidence,
// consent, server permissions and professional review are validated in staging.
// Evidence must come from a reviewed server catalog, never user-supplied claims.
import {DIET_PATTERNS} from './diet-pattern-workbench.js';
export const FOOD_COMPATIBILITY_ENABLED=false;
const exclusions={vegan:['meat','fish','shellfish','dairy','egg','honey','animal_derivative'],vegetarian:['meat','fish','shellfish','animal_derivative'],pescatarian:['meat','animal_derivative']};
const neutralPatterns=new Set(['balanced','mediterranean','flexitarian']);
const labels={neutral:'Sin restricciones excluyentes',green:'Compatible verificado',yellow:'Revisar información',red:'No compatible con tu restricción'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function classifyFood(food,{patternId='balanced',restrictions=[],inPlan=false}={}, {now=Date.now()}={}){
 if(!DIET_PATTERNS.some(p=>p.id===patternId)||!Array.isArray(restrictions))throw Error('Perfil de compatibilidad inválido');
 const active=[...new Set(restrictions)];
 if(!neutralPatterns.has(patternId))active.push('pattern:'+patternId);
 const results=[];
 for(const rule of active){
  const evidence=(food?.compatibilityEvidence||[]).filter(e=>e.rule===rule&&e.foodId===food.id&&e.status==='reviewed'&&typeof e.sourceUrl==='string'&&/^https:\/\//.test(e.sourceUrl)&&Number.isFinite(Date.parse(e.reviewedAt))&&Date.parse(e.reviewedAt)<=now&&Date.parse(e.expiresAt)>now);
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
 return '<span class="efg-food-compatibility efg-compat-'+result.color+'">'+esc(labels[result.color])+'</span>'+badge+'<ul class="efg-compat-reasons">'+result.reasons.map(r=>'<li>'+esc(r.reason)+'</li>').join('')+'</ul>';
}
