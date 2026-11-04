// Read-only, RAM-only projection of the student's own consented declaration.
// This is a UI annotation, never permission to publish a plan or record food.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODES=new Set(['celiac','lactose_intolerance','food_allergy','sibo','diabetes','hypertension','dyslipidemia','fatty_liver']);
export const unknownFoodRestrictions=()=>({status:'unknown',restrictions:['health_status_unknown'],revision:null});
export function readStudentFoodRestrictions(row,{userId,organizationId,now=Date.now()}={}){
 if(!UUID.test(userId||'')||!UUID.test(organizationId||'')||
  row?.student_id!==userId||row?.viewer_id!==userId||row?.organization_id!==organizationId||
  row?.processing_consent!==true||row?.revoked===true||
  !Number.isSafeInteger(row?.revision)||row.revision<1||
  !row.conditions||typeof row.conditions!=='object'||Array.isArray(row.conditions))return unknownFoodRestrictions();
 const entries=Object.entries(row.conditions);
 if(entries.some(([k,v])=>!CODES.has(k)||!['confirmed','suspected','not_reported'].includes(v)))return unknownFoodRestrictions();
 const active=entries.filter(([,v])=>v!=='not_reported').map(([k])=>k).sort();
 if(active.length)return {status:'declared',restrictions:active,revision:row.revision};
 const d=row.restriction_declaration;
 if(entries.length===0&&d?.kind==='none_declared'&&d.version===1&&d.declared_by===userId&&
  d.source_revision===row.revision&&Number.isFinite(Date.parse(d.confirmed_at))&&Date.parse(d.confirmed_at)<=now)
  return {status:'none_declared',restrictions:[],revision:row.revision};
 return unknownFoodRestrictions();
}
export function createStudentFoodRestrictionReader({sb,readContext,enabled=false}){
 let generation=0,snapshot=null;
 const key=c=>JSON.stringify([c?.userId,c?.organizationId,c?.epoch,c?.intakeRevision,c?.allowed]);
 const valid=c=>enabled&&c?.allowed===true&&UUID.test(c.userId||'')&&UUID.test(c.organizationId||'');
 function invalidate(){generation++;snapshot=null;}
 function current(){
  const c=readContext();
  return snapshot&&valid(c)&&snapshot.key===key(c)?structuredClone(snapshot.value):unknownFoodRestrictions();
 }
 async function refresh(){
  invalidate();const token=generation,c=readContext(),scope=key(c);
  if(!valid(c))return current();
  const unchanged=()=>token===generation&&scope===key(readContext())&&valid(readContext());
  try{
   const u=await sb.auth.getUser();
   if(!unchanged()||u.error||u.data?.user?.id!==c.userId)return current();
   const r=await sb.rpc('efg_get_coach_health_intake',{p_student:c.userId});
   if(!unchanged()||r.error)return current();
   snapshot={key:scope,value:readStudentFoodRestrictions(r.data,c)};
  }catch{ /* unavailable is unknown, never an implicit negative declaration */ }
  return current();
 }
 return {refresh,current,invalidate};
}
