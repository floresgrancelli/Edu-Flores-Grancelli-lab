// A user-saved routine is a template, never an automatic consumption record.
export const SUPPLEMENT_ROUTINE_KEY='_supplementRoutineV1';
const moments=new Set(['desayuno','media_manana','almuerzo','media_tarde','merienda','cena','otro','pre','during','post','morning','afternoon','other']);
export function readSupplementRoutine(value,catalog){
 if(!value||value.version!==1||!Number.isFinite(Date.parse(value.savedAt))||!Array.isArray(value.items)||value.items.length>100)return null;
 const byId=new Map(catalog.map(x=>[x.id,x]));
 const items=[];
 for(const entry of value.items){
  const item=byId.get(entry?.id),qty=Number(entry?.qty);
  if(!item||entry.unit!==item.unit||!Number.isFinite(qty)||qty<=0||qty>100000||!moments.has(entry.when))return null;
  items.push({id:item.id,qty,unit:item.unit,when:entry.when});
 }
 return {version:1,savedAt:value.savedAt,items};
}
export function snapshotSupplementRoutine(entries,catalog,savedAt=new Date().toISOString()){
 if(!entries.length)throw Error('Primero registrá los suplementos que consumiste hoy.');
 const result=readSupplementRoutine({version:1,savedAt,items:entries},catalog);
 if(!result)throw Error('Revisá las cantidades y los suplementos antes de guardar tu habitual.');
 return result;
}
export function planUsualSupplements(routine,entries,catalog){
 const valid=readSupplementRoutine(routine,catalog);
 if(!valid?.items.length)throw Error('Primero guardá tu suplementación habitual.');
 // Existing consumption of the same product at the same moment is preserved,
 // even if its quantity differs. Multiple routine doses are matched by count.
 const counts=new Map();
 for(const e of entries){const key=JSON.stringify([e.id,e.when]);counts.set(key,(counts.get(key)||0)+1);}
 const missing=[];let skipped=0;
 for(const item of valid.items){const key=JSON.stringify([item.id,item.when]),n=counts.get(key)||0;if(n){counts.set(key,n-1);skipped++;}else missing.push({...item});}
 return {missing,skipped};
}
export function newestSupplementRoutine(logs,catalog){
 const candidates=logs.map(log=>readSupplementRoutine(log?.skipped?.[SUPPLEMENT_ROUTINE_KEY],catalog)).filter(Boolean);
 return candidates.sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt))[0]||null;
}
