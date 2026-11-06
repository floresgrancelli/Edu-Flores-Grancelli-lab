// Server-owned catalog composition. No per-food independent approval is implied.
const keys=['k','p','c','f','fi'];
export function applyCoachCatalog(guide,snapshot){
 if(!/^ncc-catalog-[a-f0-9]{16}$/.test(snapshot?.version||'')||!Array.isArray(snapshot.foods))throw Error('No se pudo verificar la versión del catálogo.');
 const byId=new Map();
 for(const food of snapshot.foods){
  if(!food||typeof food.id!=='string'||byId.has(food.id)||!['g','ml'].includes(food.unit)||
   !['estimated','referenced','label'].includes(food.dataQuality)||
   keys.some(k=>typeof food[k]!=='number'||!Number.isFinite(food[k])||food[k]<0||food[k]>(k==='k'?12:1)))
   throw Error('El catálogo devolvió un alimento incompleto. El borrador se conserva.');
  byId.set(food.id,food);
 }
 const result=structuredClone(guide);let estimated=false;
 for(const meal of result.meals)for(const item of meal.items){
  const food=byId.get(item.id);
  if(!food||food.unit!==item.unit)throw Error('El alimento '+String(item.name||item.id)+' necesita actualizarse desde el catálogo. El borrador se conserva.');
  for(const key of ['sourceApprovalId','reviewedAt','expiresAt','source'])delete item[key];
  for(const key of ['name','unit',...keys,'sourceType','sourceId','sourceUrl','validationStatus','dataQuality'])item[key]=food[key]??'';
  estimated||=food.dataQuality==='estimated';
 }
 result.catalogVersion=snapshot.version;result.catalogHasEstimates=estimated;
 delete result.catalogTotals;delete result.catalogDeviations;delete result.healthContext;
 return result;
}
export async function loadCoachCatalogGuide(client,{studentId,guide,isCurrent}){
 if(!studentId||typeof isCurrent!=='function'||!isCurrent())throw Error('Cambió el alumno o el borrador.');
 const ids=[...new Set(guide.meals.flatMap(m=>m.items.map(f=>f.id)))];
 const {data,error}=await client.rpc('efg_coach_guide_catalog',{p_student:studentId,p_food_ids:ids});
 if(!isCurrent())throw Error('Cambió la sesión, la ficha o el borrador. Volvé a abrir la guía.');
 if(error)throw Error('No se pudo verificar el catálogo del servidor. Tu edición se conserva; volvé a intentar.');
 return applyCoachCatalog(guide,data);
}
