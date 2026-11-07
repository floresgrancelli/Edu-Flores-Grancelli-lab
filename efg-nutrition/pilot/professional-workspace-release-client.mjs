import {createProfessionalReleaseAdapter, PROFESSIONAL_RELEASE_ENABLED} from './professional-release-adapter.mjs?v=ncc-dual-role-release-r2-20261107';
import {createReleaseJournal} from './professional-release-journal.mjs?v=ncc-dual-role-release-r2-20261107';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const fail=code=>{throw Object.assign(new Error(code),{code});};
const RPC={create:'ncc_pilot_workspace_create_v1',seats:'ncc_pilot_workspace_set_seats_v1',invite:'ncc_pilot_workspace_invite_student_v1'};
const payload=(kind,input)=>{
 if(kind==='create'||kind==='invite'){
  if(typeof input.email!=='string'||input.email!==input.email.trim().toLowerCase()||input.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||typeof input.name!=='string'||input.name!==input.name.trim()||input.name.length<2||input.name.length>70||/[\x00-\x1f\x7f]/.test(input.name))fail('INVALID_ACCOUNT');
 }
 if(kind==='create'||kind==='seats')if(!Number.isSafeInteger(input.seats)||input.seats<1||input.seats>10000)fail('INVALID_SEATS');
 if(kind!=='create'&&!uuid(input.organizationId))fail('INVALID_WORKSPACE');
 if(kind==='create')return {p_email:input.email,p_name:input.name,p_seats:input.seats};
 if(kind==='seats')return {p_org:input.organizationId,p_seats:input.seats};
 if(kind==='invite')return {p_org:input.organizationId,p_email:input.email,p_name:input.name};
 fail('UNKNOWN_ACTION');
};
// Uses the existing server request mutex/receipt table and existing release journal.
// No profile creation, promotion, legacy claim, OTP, or permission change is issued here.
export function createProfessionalWorkspaceReleaseClient({sdk,config,enabled=PROFESSIONAL_RELEASE_ENABLED,journal,crypto=globalThis.crypto}={}){
 let storage=journal,reader=null,disposed=false,epoch=0,subscription=null;
 const backend=enabled===true?config?.backendOrigin:undefined;
 const durable=()=>storage||=createReleaseJournal();
 const guard=()=>{if(disposed)fail('DISPOSED');if(enabled!==true||config?.explicitReleaseConfiguration!==true)fail('FEATURE_DISABLED');
  if(typeof sdk?.auth?.onAuthStateChange!=='function')fail('AUTH_OBSERVER_REQUIRED');
  subscription||=sdk.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION'){epoch++;reader?.invalidate();}});
  return reader||=createProfessionalReleaseAdapter({sdk,config:{backendOrigin:backend,explicitReleaseConfiguration:true},enabled:true,journal:{}});
 };
 const check=t=>{guard();if(t!==epoch)fail('STALE_CONTEXT');};
 const hash=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x))),b=>b.toString(16).padStart(2,'0')).join('');
 async function authorize(kind,args,t,expected){
  const s=await guard().bootstrap();check(t);
  if(expected&&(s.who.userId!==expected.userId||s.who.sessionId!==expected.sessionId))fail('STALE_AUTH');
  if(kind==='create'||kind==='seats'){
   if(s.profile.role!=='admin')fail('ADMIN_REQUIRED');
   if(kind==='seats'&&(!Array.isArray(s.contexts.managed_coaches)||s.contexts.managed_coaches.filter(o=>o.id===args.p_org&&Number.isSafeInteger(o.seat_limit)&&Number.isSafeInteger(o.active_students)&&Number.isSafeInteger(o.pending_invitations)).length!==1))fail('DENIED');
  }else if(!s.own.some(o=>o.id===args.p_org))fail('PROFESSIONAL_TERMS_REQUIRED');
  return s;
 }
 const lane=(who,kind,args)=>{
  const organizationId=kind==='create'?who.userId:args.p_org;
  const namespace=JSON.stringify([backend,who.userId,organizationId]);
  return {namespace,key:JSON.stringify([namespace,kind]),studentId:organizationId};
 };
 async function receipt(record,args,who,kind,t,direct=null){
  const r=await sdk.rpc('ncc_pilot_workspace_receipt_v1',{p_request_id:record.id});check(t);
  if(!r||r.error)fail('RECEIPT_UNAVAILABLE');
  const value=r.data;
  if(!exact(value,['operation','payload','result'])||value.operation!==kind)fail('UNRESOLVED');
  // JSONB order is not meaningful. Rebuild its payload in the validated operation's order.
  if(!exact(value.payload,Object.keys(args))||Object.keys(args).some(k=>value.payload[k]!==args[k])||await hash(JSON.stringify(args))!==record.digest)fail('INVALID_RECEIPT');
  const result=value.result;
  if(!uuid(result?.organization_id)||(kind!=='create'&&result.organization_id!==args.p_org)||
   (kind==='invite'?!exact(result,['organization_id','invitation_id'])||!uuid(result.invitation_id):
    !Number.isSafeInteger(result.seat_limit)||result.seat_limit!==args.p_seats||kind==='seats'&&!exact(result,['organization_id','seat_limit']))||
   kind==='create'&&(!exact(result,['organization_id','seat_limit','state','student_link_preserved'])||!['enabled_existing','pending_verified_account'].includes(result.state)||typeof result.student_link_preserved!=='boolean'))fail('INVALID_RECEIPT');
  if(direct!==null&&(!exact(direct,Object.keys(result))||Object.keys(result).some(k=>direct[k]!==result[k])))fail('INVALID_RECEIPT');
  await authorize(kind,args,t,who);check(t);
  if(!await durable().settle(record))fail('JOURNAL_FAILED');check(t);
  return structuredClone(result);
 }
 async function mutate(kind,input){
  guard();const t=epoch,args=payload(kind,structuredClone(input)),s=await authorize(kind,args,t),scope=lane(s.who,kind,args);
  let reserved=false;
  try{
   const record={...scope,claimId:crypto.randomUUID(),operation:kind,id:crypto.randomUUID(),senderId:s.who.userId,digest:await hash(JSON.stringify(args))};check(t);
   reserved=await durable().reserve(record);if(!reserved)fail('OPERATION_ALREADY_RECORDED');check(t);
   await authorize(kind,args,t,s.who);check(t);
   const r=await sdk.rpc(RPC[kind],{...args,p_request_id:record.id});check(t);
   if(!r||r.error)fail(r?.error?.code||'WORKSPACE_REQUEST_FAILED');
   const confirmed=await receipt(record,args,s.who,kind,t,r.data);
   return confirmed;
  }catch(e){throw Object.assign(new Error(e.code||e.message),{code:e.code||'WORKSPACE_REQUEST_FAILED',outcome:reserved||e.code==='OPERATION_ALREADY_RECORDED'?'uncertain':'not_applied'});}
 }
 async function reconcile(kind,input){
  guard();const t=epoch,args=payload(kind,structuredClone(input)),s=await authorize(kind,args,t),scope=lane(s.who,kind,args);
  const record=await durable().get(scope.key);check(t);
  if(!record||record.namespace!==scope.namespace||record.senderId!==s.who.userId||record.studentId!==scope.studentId||record.operation!==kind||!uuid(record.id))fail('NO_PENDING_OPERATION');
  return receipt(record,args,s.who,kind,t);
 }
 return Object.freeze({bootstrap:()=>guard().bootstrap(),mutate,reconcile,invalidate(){epoch++;reader?.invalidate();},dispose(){disposed=true;epoch++;reader?.dispose();subscription?.data?.subscription?.unsubscribe?.();}});
}
