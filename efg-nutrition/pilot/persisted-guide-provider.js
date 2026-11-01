// Authenticated transport only. Not wired into pilot.js; no synthetic:true bypass.
import {createCoachHealthResponseProvider} from './coach-health-response-provider.js';
export function createPersistedGuideProvider({client,readScope,template}){
 let generation=0,accepted=null;
 const key=s=>s&&JSON.stringify([s.userId,s.sessionId,s.studentId,s.organizationId,s.sourceEpoch]);
 const health=createCoachHealthResponseProvider({readScope,readHealth:async({studentId})=>{
  const r=await client.rpc('efg_get_coach_health_intake',{p_student:studentId});if(r.error)throw Error('HEALTH_DENIED');return r.data;
 }});
 const invalidate=()=>{generation++;accepted=null;health.invalidate();};
 async function call(name,args){
  const ticket=generation,s=structuredClone(readScope()),before=key(s);
  if(!s?.userId||!s.sessionId||!s.studentId||!s.organizationId)throw Error('NO_SESSION');
  const {data:user,error:authError}=await client.auth.getUser();
  if(authError||user?.user?.id!==s.userId)throw Error('NO_SESSION');
  // Auth is asynchronous: never start an RPC (especially a write) for stale scope.
  if(ticket!==generation||key(readScope())!==before)throw Error('STALE_CONTEXT');
  const response=await client.rpc(name,{p_student:s.studentId,...args});
  if(ticket!==generation||key(readScope())!==before)throw Error('STALE_RESPONSE');
  if(response.error)throw Object.assign(Error('SOURCE_DENIED'),{cause:response.error});
  return {row:response.data,scope:s};
 }
 async function load(){
  const healthResponse=await health.read();if(healthResponse.status!=='available')throw Error('SOURCE_DENIED');
  const {row:r,scope:s}=await call('efg_read_bound_guide',{});
  if(r.viewer_id!==s.userId||r.session_id!==s.sessionId||r.student_id!==s.studentId||r.organization_id!==s.organizationId||
   healthResponse.data.student_id!==r.student_id||healthResponse.data.organization_id!==r.organization_id||
   healthResponse.data.viewer_id!==r.viewer_id||healthResponse.data.revision!==r.health_revision||r.restriction_declaration!=='none_declared'||r.publishable!==false)throw Error('SCOPE_OR_DECLARATION');
  const now=Date.parse(r.evaluated_at);if(!Number.isFinite(now))throw Error('CLOCK_MISSING');
  const catalog=r.foods.map(f=>{const p=f.provenance;
   if(p.foodId!==f.id||p.unit!==f.unit||p.provider!=='usda_fdc'||p.test_only!==false)throw Error('EVIDENCE_MISMATCH');
   // PostgreSQL persists numeric(10,6). Match that exact representation without discarding source precision.
   const persistedPerUnit=Object.fromEntries(['k','p','c','f','fi'].map(k=>{
    const raw=p.perUnit?.[k];
    if(typeof raw!=='number'||!Number.isFinite(raw)||typeof f[k]!=='number'||Number(raw.toFixed(6))!==f[k])throw Error('EVIDENCE_MISMATCH');
    return [k,f[k]];
   }));
   return {id:f.id,name:p.description,preparation:p.preparation,unit:f.unit,k:f.k,p:f.p,c:f.c,f:f.f,fi:f.fi,
    composition:{status:'verified',id:p.rawDigest,url:p.sourceUrl,foodId:f.id,productId:null,preparation:p.preparation,
     unit:f.unit,perUnit:persistedPerUnit,sourcePerUnit:p.perUnit,normalization:'POSTGRES_NUMERIC_10_6',observedAt:f.validated_at,expiresAt:f.expires_at,reviewedBy:null},glutenEvidence:null};
  });
  accepted={key:key(s),revision:r.draft_revision,digest:r.catalog_digest,intake:r.intake_revision,health:r.health_revision};
  return {persisted:true,publishable:false,catalog,template:structuredClone(template),goal:r.goal,
   preferredIds:r.preferred_ids,context:{now,restrictions:[],dislikedIds:r.disliked_ids,pattern:{kind:'general'}},row:r};
 }
 async function save(plan){
  const previous=accepted;if(!previous||previous.key!==key(readScope()))throw Error('STALE_CONTEXT');
  await load(); // Fresh server authorization, source revisions and expiry before mutation.
  if(previous.revision!==accepted.revision||previous.digest!==accepted.digest||previous.intake!==accepted.intake||previous.health!==accepted.health)
   throw Error('STALE_CONTEXT');
  const {row:revision}=await call('efg_save_bound_guide',{p_expected_draft:previous.revision,p_catalog_digest:previous.digest,p_guide:plan});
  const readback=await load();if(readback.row.draft_revision!==revision)throw Error('READBACK_CONFLICT');
  return readback;
 }
 return {load,save,invalidate};
}
