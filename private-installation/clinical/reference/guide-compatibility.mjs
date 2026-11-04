// Private candidate: pure evaluation. No network, persistence, diagnosis or approval.
const keys=['k','p','c','f','fi'];
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const preparations=new Set(['raw','cooked','fresh_unseasoned','packaged','breaded','as_sold']);
const identifier=x=>typeof x==='string'&&x.trim().length>0;
function sameIdentity(food,e){
 return !!(food&&e&&identifier(food.id)&&e.foodId===food.id&&
  preparations.has(food.preparation)&&e.preparation===food.preparation&&
  (food.productId===undefined||food.productId===null||identifier(food.productId))&&
  (e.productId===undefined||e.productId===null||identifier(e.productId))&&
  (food.productId||null)===(e.productId||null)&&
  (food.preparation!=='packaged'||identifier(food.productId)));
}
const result=(color,reason,eligible=false,conditions=[])=>({color,reason,eligible,conditions});
function current(e,now){
 return !!(e&&e.status==='verified'&&typeof e.id==='string'&&e.id&&
  typeof e.url==='string'&&e.url.startsWith('https://')&&
  Number.isFinite(now)&&Date.parse(e.observedAt)<=now&&Date.parse(e.expiresAt)>now);
}
export function compositionVerified(food,now){
 const e=food?.composition;
 return !!(food&&['g','ml'].includes(food.unit)&&keys.every(k=>finite(food[k]))&&
  current(e,now)&&sameIdentity(food,e)&&e.unit===food.unit&&
  keys.every(k=>e.perUnit?.[k]===food[k]));
}
export function patternConflict(goal,pattern){
 if(!pattern||pattern.kind==='general')return null;
 if(pattern.kind!=='keto')return 'Patrón aún no soportado.';
 // Explicit coach budget, not a universal medical definition of keto.
 if(pattern.coachConfirmed!==true||!finite(pattern.maxCarbG)||pattern.maxCarbG===0)
  return 'El coach debe confirmar el límite de hidratos del patrón.';
 if(!finite(goal?.carb_g)||goal.carb_g>pattern.maxCarbG)
  return 'Las metas no coinciden con el patrón: revisalas con el coach.';
 return null;
}
export function evaluateGuideFood(food,{restrictions=[],dislikedIds=[],pattern={kind:'general'},
 goal,qty,now}={}){
 if(!food||!pattern||typeof pattern!=='object'||!Array.isArray(restrictions)||!Array.isArray(dislikedIds))return result('yellow','Falta información.');
 const reasons=[],conditions=[];let incompatible=false,unknown=false;
 if(dislikedIds.includes(food.id))return result('neutral','No elegido por gusto.');
 for(const restriction of new Set(restrictions)){
  if(restriction==='lactose_intolerance'){
   // Intolerance is not milk-protein allergy. No universal tolerated dose is
   // inferred, and 'cheese'/'dairy' categories do not determine a verdict.
   const e=food.lactoseEvidence;
   if(!current(e,now)||!sameIdentity(food,e)||!Array.isArray(e.conditions)||!e.conditions.length||
    !e.conditions.every(c=>typeof c==='string'&&c.trim())){
    unknown=true;reasons.push('Falta verificar lactosa e ingredientes.');continue;
   }
   if(e.verdict==='lactose_free'&&e.basis==='verified_product'&&identifier(food.productId)&&e.productId===food.productId){
    conditions.push(...e.conditions);continue;
   }
   // Contains/reduced/low lactose require an individualized quantity/tolerance
   // decision; yellow cannot enter the automatic guide as validated.
   unknown=true;reasons.push('Revisar cantidad y tolerancia; no es una prohibición general.');continue;
  }
  if(restriction!=='gluten'){unknown=true;reasons.push('Restricción aún no soportada.');continue;}
  const e=food.glutenEvidence;
  if(!current(e,now)||!sameIdentity(food,e)){unknown=true;reasons.push('Revisá ingredientes y preparación.');continue;}
  if(e.verdict==='contains'){incompatible=true;reasons.push('Contiene gluten.');continue;}
  // Preparation is part of the identity evaluated; a generic meat name is insufficient.
  if(e.verdict!=='compatible'||!['fresh_unseasoned','verified_product'].includes(e.basis)||
    food.preparation!==e.preparation||!Array.isArray(e.conditions)||!e.conditions.length||
    !e.conditions.every(c=>typeof c==='string'&&c.trim())||
    (e.basis==='fresh_unseasoned'&&food.preparation!=='fresh_unseasoned')||
    (e.basis==='verified_product'&&(!food.productId||e.productId!==food.productId))){
   unknown=true;reasons.push('Preparado: revisá ingredientes.');continue;
  }
  conditions.push(...e.conditions);
 }
 if(incompatible)return result('red',reasons.join(' '),false,conditions);
 if(!compositionVerified(food,now)){unknown=true;reasons.push('Datos nutricionales por verificar.');}
 const conflict=patternConflict(goal,pattern);
 if(conflict){unknown=true;reasons.push(conflict);}
 if(pattern.kind==='keto'&&!conflict){
  if(!finite(qty)||qty<=0){unknown=true;reasons.push('Falta definir la porción.');}
  else if(food.c*qty>pattern.maxCarbG){
   return result('red','Esta porción supera los hidratos del patrón.',false,conditions);
  }else conditions.push('La suma del día debe respetar los hidratos acordados.');
 }
 if(unknown)return result('yellow',[...new Set(reasons)].join(' '),false,conditions);
 return result(restrictions.length||pattern.kind==='keto'?'green':'neutral',
  restrictions.length?'Compatible bajo estas condiciones.':'Compatible con la propuesta.',true,conditions);
}

