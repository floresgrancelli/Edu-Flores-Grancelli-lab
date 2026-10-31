// COACH106 — real Supabase participation receipts adapter (OFF until E2E).
// No legal-document acceptance, sensitive-health collection or localStorage.
import {PILOT_PARTICIPATION_VERSION} from './pilot-participation-demo.js';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
async function signedUser(sb){
 if(typeof sb?.auth?.getUser!=='function')throw Error('Falta verificar la sesión.');
 const {data,error}=await sb.auth.getUser();
 if(error||!uuid(data?.user?.id))throw Error('Sesión autenticada no verificada.');
 return data.user.id;
}
async function receiptReadback(sb,userId,{expectedOrganizationId=null}={}){
 const r=await sb.from('efg_pilot_participation_receipts')
  .select('student_id,organization_id,version,participation_accepted,sharing_accepted,acceptance_method,accepted_at,revoked_at,updated_at')
  .eq('student_id',userId).eq('version',PILOT_PARTICIPATION_VERSION).maybeSingle();
 if(r.error)throw Error('No pudimos verificar las decisiones guardadas.');
 if(r.data&&r.data.student_id!==userId)throw Error('La autorización corresponde a otra cuenta.');
 if(expectedOrganizationId!==null&&(!uuid(expectedOrganizationId)||
  r.data&&r.data.organization_id!==expectedOrganizationId))
  throw Error('La autorización corresponde a otra organización.');
 return r.data||null;
}
const complete=(r,userId)=>r?.student_id===userId&&
 r.version===PILOT_PARTICIPATION_VERSION&&
 r.acceptance_method==='two_explicit_checkboxes'&&
 r.participation_accepted===true&&r.sharing_accepted===true&&
 r.revoked_at===null&&typeof r.accepted_at==='string'&&
 Number.isFinite(Date.parse(r.accepted_at));
export async function loadPilotParticipationReceipt(sb,{expectedOrganizationId=null}={}){
 const userId=await signedUser(sb);
 const receipt=await receiptReadback(sb,userId,{expectedOrganizationId});
 return {userId,receipt,participation:receipt?{
  user_id:userId,version:receipt.version,
  participation_accepted:complete(receipt,userId),
  sharing_accepted:complete(receipt,userId),
  accepted_at:receipt.accepted_at,revoked_at:receipt.revoked_at
 }:null,accepted:complete(receipt,userId)};
}
export async function acceptPilotParticipation(sb,choice,{explicitSubmit=false}={}){
 if(explicitSubmit!==true||choice?.version!==PILOT_PARTICIPATION_VERSION||
   choice.participationRequested!==true||choice.sharingRequested!==true||
   choice.legalAcceptance!==false||choice.persisted!==false)
  throw Error('Las dos autorizaciones requieren clic explícito.');
 const userId=await signedUser(sb);
 const r=await sb.rpc('efg_accept_pilot_participation',{
  p_version:PILOT_PARTICIPATION_VERSION,p_participation:true,p_sharing:true
 });
 if(r.error||!Number.isFinite(Date.parse(r.data)))
  throw Error('No fue posible guardar las autorizaciones del piloto.');
 const receipt=await receiptReadback(sb,userId);
 if(!complete(receipt,userId))
  throw Error('El servidor no confirmó las dos autorizaciones.');
 return {userId,receipt,accepted:true,legalAcceptance:false,healthConsent:false};
}
export async function revokePilotParticipation(sb,{explicitSubmit=false}={}){
 if(explicitSubmit!==true)throw Error('La revocación requiere confirmación expresa.');
 const userId=await signedUser(sb);
 const r=await sb.rpc('efg_revoke_pilot_participation',{
  p_version:PILOT_PARTICIPATION_VERSION
 });
 if(r.error)throw Error('No fue posible retirar el permiso.');
 const receipt=await receiptReadback(sb,userId);
 if(complete(receipt,userId)||r.data===true&&!receipt?.revoked_at)
  throw Error('La revocación no fue confirmada por el servidor.');
 return {userId,revoked:r.data===true,accepted:false};
}
