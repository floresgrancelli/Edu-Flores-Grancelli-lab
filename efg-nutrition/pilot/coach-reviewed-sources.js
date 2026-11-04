// Real pilot references come only from the scoped server registry, never the QA bundle.
const keys=['k','p','c','f','fi'];
export function applyPilotReviewedSources(guide,rows,{now=Date.now()}={}){
 if(!Array.isArray(rows)||!Number.isFinite(now))throw Error('Respuesta de fuentes inválida.');
 const map=new Map();
 for(const row of rows){
  if(!row||map.has(row.id)||row.scope!=='pilot_real'||!row.sourceApprovalId||
   !row.name||!/^https:\/\//.test(row.sourceUrl)||
   !Number.isFinite(Date.parse(row.reviewedAt))||Date.parse(row.reviewedAt)>now||
   !Number.isFinite(Date.parse(row.expiresAt))||Date.parse(row.expiresAt)<=now||
   keys.some(k=>typeof row[k]!=='number'||!Number.isFinite(row[k])||row[k]<0||row[k]>(k==='k'?12:1)))
   throw Error('Referencia no vigente o incompleta. Volvé a consultar las fuentes.');
  map.set(row.id,row);
 }
 const missing=[...new Set(guide.meals.flatMap(m=>m.items).filter(x=>!map.has(x.id)||map.get(x.id).unit!==x.unit).map(x=>x.name||x.id))];
 if(missing.length)throw Error('Falta revisión para publicar estos ingredientes: '+missing.join(', ')+'. El catálogo y el borrador se conservan.');
 const copy=structuredClone(guide);
 for(const meal of copy.meals)for(const item of meal.items){
  const row=map.get(item.id);
  for(const k of keys)item[k]=row[k];
  item.name=row.name;item.sourceUrl=row.sourceUrl;item.sourceApprovalId=row.sourceApprovalId;
  item.sourceType=row.sourceType||'validated_composition';item.validationStatus='reviewed_pilot';
 }
 return copy;
}
export async function loadPilotReviewedGuide(client,{studentId,guide,isCurrent}){
 if(!studentId||typeof isCurrent!=='function'||!isCurrent())throw Error('Cambió el alumno o el borrador.');
 const ids=[...new Set(guide.meals.flatMap(m=>m.items.map(x=>x.id)))];
 const {data,error}=await client.rpc('efg_coach_pilot_food_sources',{p_student:studentId,p_food_ids:ids});
 if(!isCurrent())throw Error('Cambió la sesión, la ficha o el borrador. Volvé a abrir la guía.');
 if(error)throw Error('No se pudieron consultar las referencias aprobadas del piloto. El borrador se conserva.');
 return applyPilotReviewedSources(guide,data);
}
