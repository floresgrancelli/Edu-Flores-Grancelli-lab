// Candidate transport behind two OFF gates. No SDK construction, credentials, fetch, deployment or grants.
// Execution requires an explicit fixture or exact loopback SDK URL; hosted targets are rejected.
export const PROFESSIONAL_TRANSPORT_ENABLED = false;
export const PROFESSIONAL_BACKEND_EXECUTION_ENABLED = false;
export const CONTEXTUAL_SCREEN_TRANSPORT = 'NCC_PROFESSIONAL_SCREENS_CONTEXTUAL_V1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId=x=>typeof x==='string'&&UUID.test(x);
const fail=(code)=>{throw Object.assign(new Error(code),{code});};
const fields=['userId','sessionId','sessionEpoch','organizationId','navigationEpoch'];
const same=(a,b)=>fields.every(k=>a?.[k]===b?.[k]);
const columns='id,student_id,coach_id,sender_id,body,created_at,read_at';
const writes=new Set(['setAlias','sendMessage','markRead']);
const timestamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT/.test(x)&&Number.isFinite(Date.parse(x));
const result=async query=>{const response=await query;if(!response||response.error)throw Object.assign(new Error('SDK operation rejected'),{code:response?.error?.code||'SDK_ERROR'});return response.data;};
function roster(rows,s) {
 if(!Array.isArray(rows))fail('INVALID_ROSTER');const seen=new Set();
 for(const r of rows){if(!validId(r?.user_id)||seen.has(r.user_id)||r.user_id===s.userId||r.organization_id!==s.organizationId||typeof r.nickname!=='string'||r.nickname.length>70||typeof r.active!=='boolean'||typeof r.consent_accepted!=='boolean')fail('INVALID_ROSTER');seen.add(r.user_id);}return rows;
}
function messages(rows,s,student){
 if(!Array.isArray(rows)||rows.length>200)fail('INVALID_MESSAGES');const seen=new Set();
 for(const r of rows){if(!validId(r?.id)||seen.has(r.id)||r.student_id!==student||r.coach_id!==s.userId||![student,s.userId].includes(r.sender_id)||typeof r.body!=='string'||!r.body.trim()||Array.from(r.body).length>2000||!timestamp(r.created_at)||!(r.read_at===null||timestamp(r.read_at)))fail('INVALID_MESSAGES');seen.add(r.id);}return rows;
}
export function createProfessionalContextualTransport({sdk,readContext,enabled=PROFESSIONAL_TRANSPORT_ENABLED,executionEnabled=PROFESSIONAL_BACKEND_EXECUTION_ENABLED,environment=()=>null,fixtureSdk=false,backendUrl=null,now=()=>new Date().toISOString()}={}) {
 function current(s){
  if(enabled!==true||executionEnabled!==true)fail('FEATURE_DISABLED');
  // Only explicit in-memory fixture or exact loopback SDK target. Never infer backend from browser origin.
  if(environment()==='fixture'){if(fixtureSdk!==true)fail('FIXTURE_ONLY');}
  else if(environment()==='localhost'){
   let target,actual;try{target=new URL(backendUrl);actual=new URL(sdk?.supabaseUrl);}catch{fail('LOCAL_BACKEND_REQUIRED');}
   if(!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||!['http:','https:'].includes(target.protocol)||target.username||target.password||target.search||target.hash||target.pathname!=='/'||actual.href!==target.href)fail('LOCAL_BACKEND_REQUIRED');
  }else fail('FIXTURE_ONLY');
  if(!validId(s?.userId)||!validId(s.organizationId)||typeof s.sessionId!=='string'||!s.sessionId||!Number.isSafeInteger(s.sessionEpoch)||s.sessionEpoch<0||!Number.isSafeInteger(s.navigationEpoch)||s.navigationEpoch<0)fail('INVALID_CONTEXT');
  if(!same(readContext?.(),s))fail('STALE_CONTEXT');
 }
 async function checked(query,s){current(s);const data=await result(query());current(s);return data;}
 async function authorize(s){
  current(s);const a=await sdk.auth.getUser();current(s);
  if(a?.error||a?.data?.user?.id!==s.userId||!/^[-A-Za-z0-9._+]+@(?:[A-Za-z0-9-]+\.)+invalid$/i.test(a?.data?.user?.email||''))fail('LOGIN_REQUIRED');
  const c=await checked(()=>sdk.rpc('ncc_dual_workspace_contexts_v1',{}),s);
  if(c?.user_id!==s.userId||c.active!==true||!['student','coach'].includes(c.profile_role)||!Array.isArray(c.coach_contexts))fail('DENIED');
  const own=c.coach_contexts.filter(o=>o?.id===s.organizationId);
  if(own.length!==1||own[0].coach_id!==s.userId||own[0].is_test!==true||!['trial','active'].includes(own[0].status)||own[0].legal_ready!==true)fail('DENIED');
  // Read-only context contains no cryptographic signature. Trust only authenticated SDK RPC, never metadata.
  if(c.profile_role==='student'&&(!validId(c.student_context?.organization_id)||c.student_context.organization_id===s.organizationId))fail('DENIED');
 }
 async function students(s){return roster(await checked(()=>sdk.rpc('ncc_pilot_workspace_roster_v1',{p_org:s.organizationId}),s),s);}
 async function studentAccess(s,id){if(!validId(id)||id===s.userId)fail('STUDENT_REQUIRED');if(!(await students(s)).some(r=>r.user_id===id&&r.active&&r.consent_accepted))fail('STUDENT_REQUIRED');}
 function pair(query,s,id){return query.eq('student_id',id).eq('coach_id',s.userId);}
 async function perform(action,input,scope){
  let dispatched=false;const s=structuredClone(scope),args=structuredClone(input);
  try{
   current(s);if(!['workspace','recipes','messages',...writes].includes(action))fail('UNKNOWN_ACTION');
   await authorize(s);let data;const id=action==='recipes'?args?.p_student:args?.student_id;
   if(['recipes','messages','sendMessage','markRead'].includes(action)){
    if(action!=='recipes'&&args?.coach_id!==s.userId)fail('INVALID_CONTEXT');await studentAccess(s,id);
   }
   if(action==='workspace'){
    const organization=await checked(()=>sdk.from('efg_organizations').select('id,coach_id,payment_alias').eq('id',s.organizationId).eq('coach_id',s.userId).single(),s);
    if(organization?.id!==s.organizationId||organization.coach_id!==s.userId||!(organization.payment_alias===null||typeof organization.payment_alias==='string'&&Array.from(organization.payment_alias).length<=100))fail('INVALID_WORKSPACE');
    data={organization,students:await students(s)};
   }else if(action==='setAlias'){
    if(typeof args?.p_alias!=='string'||args.p_alias!==args.p_alias.trim()||Array.from(args.p_alias).length<3||Array.from(args.p_alias).length>100)fail('INVALID_ALIAS');
    data=await checked(()=>{dispatched=true;return sdk.rpc('efg_set_coach_alias',{p_alias:args.p_alias});},s);
    if(typeof data!=='boolean')fail('INVALID_RECEIPT');
   }else if(action==='recipes'){
    data=await checked(()=>sdk.rpc('efg_coach_shared_student_recipes',{p_student:id}),s);
    if(!Array.isArray(data)||data.length>30||data.some(r=>!validId(r?.id)||r.student_id!==id||r.organization_id!==s.organizationId))fail('INVALID_RECIPES');
    // Preserve exact RPC array. Presentation validates ingredient/totals details; do not synthesize recipe rows.
   }else if(action==='messages'){
    data=messages(await checked(()=>pair(sdk.from('efg_messages').select(columns),s,id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(200),s),s,id);
   }else if(action==='sendMessage'){
    if(args.sender_id!==s.userId||typeof args.body!=='string'||!args.body.trim()||args.body!==args.body.trim()||Array.from(args.body).length>2000)fail('INVALID_MESSAGE');
    data=await checked(()=>{dispatched=true;return sdk.from('efg_messages').insert({student_id:id,coach_id:s.userId,sender_id:s.userId,body:args.body}).select(columns).single();},s);
    messages([data],s,id);if(data.sender_id!==s.userId||data.body!==args.body)fail('INVALID_RECEIPT');
   }else{
    if(!Array.isArray(args.ids)||!args.ids.length||args.ids.length>200||!args.ids.every(validId)||new Set(args.ids).size!==args.ids.length)fail('INVALID_MESSAGE');
    const date=now();if(!timestamp(date))fail('INVALID_TIMESTAMP');
    data=await checked(()=>{dispatched=true;return pair(sdk.from('efg_messages').update({read_at:date}),s,id).eq('sender_id',id).is('read_at',null).in('id',args.ids).select(columns);},s);
    messages(data,s,id);if(data.some(r=>!args.ids.includes(r.id)||r.sender_id!==id||!timestamp(r.read_at)))fail('INVALID_RECEIPT');
   }
   await authorize(s);
   if(['recipes','messages','sendMessage','markRead'].includes(action))await studentAccess(s,id);
   current(s);return {data:structuredClone(data)};
  }catch(error){throw Object.assign(new Error(error?.message||'Transport failed'),{code:error?.code||'TRANSPORT_ERROR',outcome:dispatched?'uncertain':'not_applied'});}
 }
 return Object.freeze({kind:CONTEXTUAL_SCREEN_TRANSPORT,perform});
}
