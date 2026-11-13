import {createSelfManagementHandler} from './api.mjs';
import {createSelfManagementRepository} from './supabase-repository.mjs';
import {createPilotAccessManager} from './pilot-access.mjs';
export const SELF_LEGAL_VERSION='ncc-self-legal-20261113';
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function createHostedSelfHandler({client,catalog,ownerEmail='floresgrancelli@gmail.com',allowedOrigins}={}){
 const repository=createSelfManagementRepository(client);
 return async request=>{
  let verified=null;
  const verifyBearer=async token=>{
   const {data,error}=await client.auth.getUser(token);
   if(error||!data?.user||data.user.is_anonymous===true)return null;
   verified=data.user;return {id:verified.id};
  };
  const requireAccess=async id=>{
   const {data:p,error}=await client.from('efg_profiles').select('user_id,role,active').eq('user_id',id).maybeSingle();
   if(error)fail('unavailable');
   if(p&&(!p.active||!['admin','coach'].includes(p.role)))fail('mode_mismatch');
   // The owner can try the pilot without creating a purchase or changing roles.
   if(p?.role==='admin'&&verified?.email_confirmed_at&&verified.email?.toLowerCase()===ownerEmail)return;
   const access=await client.from('ncc_self_pilot_access').select('user_id,active,expires_at').eq('user_id',id).maybeSingle();
   if(access.error)fail('unavailable');
   if(access.data?.user_id!==id||access.data.active!==true||!Number.isFinite(Date.parse(access.data.expires_at))||Date.parse(access.data.expires_at)<=Date.now())fail('access_required');
  };
  const readLegalStatus=async id=>{
   const {data,error}=await client.from('ncc_self_legal_receipts').select('user_id,version,revoked_at').eq('user_id',id).maybeSingle();
   if(error)fail('unavailable');
   return {version:SELF_LEGAL_VERSION,accepted:data?.user_id===id&&data.version===SELF_LEGAL_VERSION&&!data.revoked_at};
  };
  return createSelfManagementHandler({enabled:true,verifyBearer,repository,readCatalog:async()=>catalog,allowedOrigins,
   requireAccess,readLegalStatus,managePilotAccess:createPilotAccessManager(client),
   requireLegalReceipt:async id=>{if(!(await readLegalStatus(id)).accepted)fail('legal_required');return SELF_LEGAL_VERSION;},
   acceptLegal:async(id,version)=>{
    if(version!==SELF_LEGAL_VERSION)fail('legal_required');
    const {error}=await client.from('ncc_self_legal_receipts').upsert({user_id:id,version,accepted_at:new Date().toISOString(),revoked_at:null});
    if(error)fail('unavailable');
   },
   consumeRate:async(id,action)=>{const {data,error}=await client.rpc('ncc_self_consume_rate',{p_user:id,p_generate:action==='generate'});if(error)fail('unavailable');if(data!==true)fail('rate_limited');},
  })(request);
 };
}
