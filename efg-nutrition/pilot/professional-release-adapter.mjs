import {createReleaseJournal} from './professional-release-journal.mjs?v=ncc-dual-role-release-r4-20261107';
export const PROFESSIONAL_RELEASE_ENABLED = false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=x=>typeof x==='string'&&UUID.test(x);
const fail=code=>{throw Object.assign(new Error(code),{code});};
const columns='id,student_id,coach_id,sender_id,body,created_at,read_at';
const stamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT/.test(x)&&Number.isFinite(Date.parse(x));
const clone=x=>structuredClone(x);
async function result(query) { const r=await query; if(!r||r.error)fail('SDK_REJECTED'); return r.data; }
function origin(value) {
 let u;try{u=new URL(value);}catch{fail('INVALID_BACKEND');}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.port||u.hostname==='localhost'||u.hostname.endsWith('.invalid')||/^\[|^[\d.]+$/.test(u.hostname))fail('INVALID_BACKEND');
 return u.origin;
}
function sessionId(token) {
 try {const part=token.split('.')[1];const p=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));if(valid(p.session_id))return p.session_id;}catch{}
 fail('SESSION_BINDING_REQUIRED');
}
export function createProfessionalReleaseAdapter({sdk,config,enabled=PROFESSIONAL_RELEASE_ENABLED,journal=createReleaseJournal(),crypto=globalThis.crypto}={}) {
 const backendOrigin=config?.backendOrigin, explicitReleaseConfiguration=config?.explicitReleaseConfiguration;
 let epoch=0, navigation=0, selected=null;
 const invalidate=()=>{epoch++;navigation++;selected=null;};
 let subscription=null,disposed=false;
 function gate(){if(disposed)fail('DISPOSED');if(enabled!==true||explicitReleaseConfiguration!==true)fail('FEATURE_DISABLED');if(typeof sdk?.auth?.onAuthStateChange!=='function')fail('AUTH_OBSERVER_REQUIRED');const expected=origin(backendOrigin);if(origin(sdk?.supabaseUrl)!==expected)fail('BACKEND_MISMATCH');if(!subscription)subscription=sdk.auth.onAuthStateChange(event=>{if(event!=='INITIAL_SESSION')invalidate();});return expected;}
 const digest=async body=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),x=>x.toString(16).padStart(2,'0')).join('');
 function check(e,n){gate();if(e!==epoch||n!==navigation)fail('STALE_CONTEXT');}
 async function identity(e,n) {
  check(e,n);const s=await result(sdk.auth.getSession());check(e,n);
  const token=s?.session?.access_token;if(typeof token!=='string')fail('LOGIN_REQUIRED');
  const u=await result(sdk.auth.getUser(token));check(e,n);if(!valid(u?.user?.id))fail('LOGIN_REQUIRED');
  const latest=await result(sdk.auth.getSession());check(e,n);if(latest?.session?.access_token!==token)fail('STALE_AUTH');
  return {userId:u.user.id,sessionId:sessionId(token)};
 }
 const same=(a,b)=>a.userId===b.userId&&a.sessionId===b.sessionId;
 async function authority(e,n,expected,organizationId) {
  const who=await identity(e,n);if(expected&&!same(who,expected))fail('STALE_AUTH');
  const profile=await result(sdk.from('efg_profiles').select('*').eq('user_id',who.userId).single());check(e,n);
  if(profile?.user_id!==who.userId||profile.active!==true||!['student','coach','admin'].includes(profile.role))fail('PROFILE_REQUIRED');
  const contexts=await result(sdk.rpc('ncc_dual_workspace_contexts_v1',{}));check(e,n);
  if(contexts?.user_id!==who.userId||contexts.active!==true||contexts.profile_role!==profile.role||!Array.isArray(contexts.coach_contexts))fail('INVALID_CONTEXTS');
  if(profile.role==='student'){
   const c=contexts.student_context;
   if(!valid(c?.organization_id)||!valid(c.coach_id)||typeof c.consent_accepted!=='boolean'||profile.organization_id!==c.organization_id||('coach_id'in profile&&profile.coach_id!==c.coach_id)||('consent_accepted'in profile&&profile.consent_accepted!==c.consent_accepted))fail('STUDENT_CONTEXT_MISMATCH');
   if(organizationId===profile.organization_id)fail('DENIED');
  }else if(contexts.student_context!==null)fail('INVALID_CONTEXTS');
  if(contexts.coach_contexts.some(c=>!valid(c?.id)||c.coach_id!==who.userId||typeof c.name!=='string'||typeof c.is_test!=='boolean'||typeof c.legal_ready!=='boolean'||!['trial','active'].includes(c.status)||![c.seat_limit,c.active_students,c.pending_invitations].every(v=>Number.isSafeInteger(v)&&v>=0)||c.active_students+c.pending_invitations>c.seat_limit))fail('INVALID_CONTEXTS');
  const own=contexts.coach_contexts.filter(c=>valid(c?.id)&&c.coach_id===who.userId&&c.legal_ready===true&&['trial','active'].includes(c.status));
  if(new Set(own.map(c=>c.id)).size!==own.length)fail('INVALID_CONTEXTS');
  if(organizationId&&!own.some(c=>c.id===organizationId))fail('DENIED');
  const after=await identity(e,n);if(!same(who,after))fail('STALE_AUTH');
  return {who,profile,contexts,own};
 }
 async function roster(s,e,n) {
  const rows=await result(sdk.rpc('ncc_pilot_workspace_roster_v1',{p_org:s.organizationId}));check(e,n);
  if(!Array.isArray(rows)||new Set(rows.map(r=>r?.user_id)).size!==rows.length||rows.some(r=>!valid(r?.user_id)||r.user_id===s.userId||r.organization_id!==s.organizationId||typeof r.nickname!=='string'||r.nickname.length>70||typeof r.active!=='boolean'||typeof r.consent_accepted!=='boolean'))fail('INVALID_ROSTER');return rows;
 }
 async function student(s,id,e,n){if(!valid(id)||(await roster(s,e,n)).every(r=>r.user_id!==id||!r.active||!r.consent_accepted))fail('STUDENT_REQUIRED');}
 function messages(rows,s,id){if(!Array.isArray(rows)||rows.length>200||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!valid(r?.id)||r.student_id!==id||r.coach_id!==s.userId||![id,s.userId].includes(r.sender_id)||typeof r.body!=='string'||!r.body.trim()||Array.from(r.body).length>2000||!stamp(r.created_at)||!(r.read_at===null||stamp(r.read_at))))fail('INVALID_MESSAGES');return rows;}
 const pair=(q,s,id)=>q.eq('student_id',id).eq('coach_id',s.userId);
 async function bootstrap(){gate();const e=epoch,n=navigation;return clone(await authority(e,n));}
 async function selectOrganization(id){gate();selected=null;const e=epoch,n=++navigation;if(!valid(id))fail('INVALID_WORKSPACE');const a=await authority(e,n,null,id);check(e,n);selected={...a.who,organizationId:id};return clone(selected);}
 async function perform(action,input={}) {
  let reserved=false;
  try {
   if(action==='setAlias')fail('ALIAS_RELEASE_READ_ONLY');
   const backend=gate(),s=clone(selected),args=clone(input),e=epoch,n=navigation;if(!s)fail('WORKSPACE_REQUIRED');
   if(!['workspace','recipes','messages','sendMessage','markRead','reconcileMessage','pendingMutations'].includes(action))fail('UNKNOWN_ACTION');
   await authority(e,n,s,s.organizationId);
   const id=action==='recipes'?args.p_student:args.student_id;
   if(['recipes','messages','sendMessage','markRead','reconcileMessage','pendingMutations'].includes(action))await student(s,id,e,n);
   let data,record=null;
   // Locks span sessions: reload/logout never discards an uncertain operation.
   const namespace=JSON.stringify([backend,s.userId,s.organizationId]);
   if(['sendMessage','markRead'].includes(action)){
    if(action==='sendMessage'&&(!valid(args.id)||typeof args.body!=='string'||!args.body.trim()||args.body!==args.body.trim()||Array.from(args.body).length>2000))fail('INVALID_MESSAGE');
    if(action==='markRead'&&(!Array.isArray(args.ids)||!args.ids.length||args.ids.length>200||!args.ids.every(valid)||new Set(args.ids).size!==args.ids.length))fail('INVALID_MESSAGE');
    const d=await digest(action==='sendMessage'?args.body:JSON.stringify([...args.ids].sort()));check(e,n);
    const key=JSON.stringify([namespace,action,id]);
    record={claimId:crypto.randomUUID(),key,namespace,operation:action,id:action==='sendMessage'?args.id:'',studentId:id??'',senderId:s.userId,digest:d};
    reserved=await journal.reserve(record);if(!reserved)fail('OPERATION_ALREADY_RECORDED');check(e,n);
    // Revalidation after durable reservation. Any later failure remains uncertain, even before dispatch.
    await authority(e,n,s,s.organizationId);await student(s,id,e,n);
   }
   check(e,n);if(!same(s,await identity(e,n)))fail('STALE_AUTH');
   if(action==='workspace'){
    const organization=await result(sdk.from('efg_organizations').select('id,coach_id,payment_alias').eq('id',s.organizationId).eq('coach_id',s.userId).single());check(e,n);
    if(organization?.id!==s.organizationId||organization.coach_id!==s.userId||!(organization.payment_alias===null||typeof organization.payment_alias==='string'&&Array.from(organization.payment_alias).length<=100))fail('INVALID_WORKSPACE');data={organization,students:await roster(s,e,n)};
   }else if(action==='pendingMutations'){
    data=[];
    for(const operation of ['sendMessage','markRead']){
     const key=JSON.stringify([namespace,operation,id]);
     const pending=await journal.get(key);check(e,n);
     if(pending===null)continue;
     const allowed=['claimId','key','namespace','operation','id','studentId','senderId','digest','state'];
     if(!pending||Object.keys(pending).some(k=>!allowed.includes(k))||!valid(pending.claimId)||pending.key!==key||pending.namespace!==namespace||pending.operation!==operation||pending.studentId!==id||pending.senderId!==s.userId||typeof pending.digest!=='string'||!/^[0-9a-f]{64}$/.test(pending.digest)||!['uncertain','confirmed'].includes(pending.state)||(operation==='sendMessage'?!valid(pending.id):pending.id!==''))fail('INVALID_JOURNAL_RECORD');
     if(pending.state==='uncertain')data.push({operation,id:pending.id,state:'uncertain'});
    }
   }else if(action==='recipes'){
    data=await result(sdk.rpc('efg_coach_shared_student_recipes',{p_student:id}));if(!Array.isArray(data)||data.length>30||data.some(r=>!valid(r?.id)||r.student_id!==id||r.organization_id!==s.organizationId))fail('INVALID_RECIPES');
   }else if(action==='sendMessage'){
    data=await result(sdk.from('efg_messages').insert({id:args.id,student_id:id,coach_id:s.userId,sender_id:s.userId,body:args.body}).select(columns).single());messages([data],s,id);if(data.id!==args.id||data.sender_id!==s.userId||data.body!==args.body)fail('INVALID_RECEIPT');
   }else if(action==='markRead'){
    const date=new Date().toISOString();data=await result(pair(sdk.from('efg_messages').update({read_at:date}),s,id).eq('sender_id',id).is('read_at',null).in('id',args.ids).select(columns));messages(data,s,id);if(data.some(r=>!args.ids.includes(r.id)||r.sender_id!==id||r.read_at!==date))fail('INVALID_RECEIPT');
   }else if(action==='messages')data=messages(await result(pair(sdk.from('efg_messages').select(columns),s,id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(200)),s,id);
   else {
    if(!valid(args.id))fail('INVALID_MESSAGE');const key=JSON.stringify([namespace,'sendMessage',id]);record=await journal.get(key);check(e,n);
    if(!record||record.key!==key||!['uncertain','confirmed'].includes(record.state)||!/^[0-9a-f]{64}$/.test(record.digest)||record.operation!=='sendMessage'||record.namespace!==namespace||record.id!==args.id||record.studentId!==id||record.senderId!==s.userId)fail('INVALID_JOURNAL_RECORD');
    data=await result(pair(sdk.from('efg_messages').select(columns),s,id).eq('id',args.id).maybeSingle());
    if(data===null)fail('UNRESOLVED');messages([data],s,id);if(data.id!==args.id||data.sender_id!==s.userId||await digest(data.body)!==record.digest)fail('UNRESOLVED');
   }
   check(e,n);await authority(e,n,s,s.organizationId);if(['recipes','messages','sendMessage','markRead','reconcileMessage','pendingMutations'].includes(action))await student(s,id,e,n);check(e,n);
   if(!same(s,await identity(e,n)))fail('STALE_AUTH');
   if(record){if(!await journal.settle(record))fail('JOURNAL_FAILED');check(e,n);}
   return {data:clone(data)};
  }catch(error){throw Object.assign(new Error(error?.code||error?.message||'RELEASE_FAILED'),{code:error?.code||'RELEASE_FAILED',outcome:reserved||action==='reconcileMessage'?'uncertain':'not_applied'});}
 }

 // Existing R53 server method infers one owned managed destination, locks it and
 // rechecks authorization. Never derive an alias destination from the student profile.
 async function paymentAliasPending(){
  const backend=gate(),s=clone(selected),e=epoch,n=navigation;if(!s)fail('WORKSPACE_REQUIRED');
  await authority(e,n,s,s.organizationId);const namespace=JSON.stringify([backend,s.userId,s.organizationId]);
  const r=await journal.get(JSON.stringify([namespace,'saveAlias',s.organizationId]));check(e,n);
  if(r&&(r.namespace!==namespace||r.operation!=='saveAlias'||r.studentId!==s.organizationId||r.senderId!==s.userId))fail('INVALID_JOURNAL_RECORD');
  return r?.state==='uncertain';
 }
 async function setPaymentAlias(input){
  let reserved=false;
  try{
   const backend=gate(),s=clone(selected),e=epoch,n=navigation;if(!s)fail('WORKSPACE_REQUIRED');
   if(typeof input!=='string'||input!==input.trim()||input.length<3||input.length>100||/[\x00-\x1f\x7f]/.test(input))fail('INVALID_ALIAS');
   await authority(e,n,s,s.organizationId);const namespace=JSON.stringify([backend,s.userId,s.organizationId]);
   const record={claimId:crypto.randomUUID(),key:JSON.stringify([namespace,'saveAlias',s.organizationId]),namespace,operation:'saveAlias',id:crypto.randomUUID(),studentId:s.organizationId,senderId:s.userId,digest:await digest(input)};check(e,n);
   reserved=await journal.reserve(record);if(!reserved)fail('OPERATION_ALREADY_RECORDED');check(e,n);
   await authority(e,n,s,s.organizationId);
   const changed=await result(sdk.rpc('efg_set_coach_alias',{p_alias:input}));check(e,n);
   if(changed!==true)fail('INVALID_ALIAS_RECEIPT');await authority(e,n,s,s.organizationId);
   const after=await result(sdk.from('efg_organizations').select('id,coach_id,payment_alias').eq('id',s.organizationId).eq('coach_id',s.userId).single());check(e,n);
   if(after?.id!==s.organizationId||after.coach_id!==s.userId||after.payment_alias!==input)fail('INVALID_ALIAS_RECEIPT');
   await authority(e,n,s,s.organizationId);if(!await journal.settle(record))fail('JOURNAL_FAILED');check(e,n);return clone(after);
  }catch(error){throw Object.assign(new Error(error?.code||error?.message||'ALIAS_FAILED'),{code:error?.code||'ALIAS_FAILED',outcome:reserved||error?.code==='OPERATION_ALREADY_RECORDED'?'uncertain':'not_applied'});}
 }

 // Reuse existing coach modules through a student/org-bound SDK view. The original
 // profile is returned unchanged; capability authorization remains server-owned.
 async function studentClient(id) {
  gate();const s=clone(selected),e=epoch,n=navigation;if(!s)fail('WORKSPACE_REQUIRED');
  const verify=async()=>{check(e,n);await authority(e,n,s,s.organizationId);await student(s,id,e,n);check(e,n);};
  await verify();
  const scope=Object.freeze({...s,studentId:id,backendOrigin:origin(backendOrigin)});
  const rules={
   efg_consents:{student_id:id,organization_id:s.organizationId},
   efg_coach_relaunch_intakes:{student_id:id,organization_id:s.organizationId},
   efg_student_plan_access:{student_id:id,organization_id:s.organizationId,coach_id:s.userId},
   efg_coach_plan_drafts:{student_id:id,organization_id:s.organizationId,coach_id:s.userId},
   efg_daily_logs:{student_id:id},efg_weights:{student_id:id},efg_activities:{student_id:id},efg_goals:{student_id:id},
   efg_food_plans:{student_id:id,coach_id:s.userId},efg_weekly_reports:{student_id:id,coach_id:s.userId},
   efg_period_reports:{student_id:id,coach_id:s.userId},
   efg_payments:{payer_id:id,recipient_id:s.userId,payment_kind:'student_coach'}
  };
  const methods=new Set(['select','eq','in','not','is','gte','lte','order','limit','single','maybeSingle','gt','range']);
  const sameFields=(row,filters)=>row&&Object.entries(filters).every(([key,value])=>row[key]===value);
  function from(table){
   check(e,n);if(!Object.hasOwn(rules,table))fail('COACH_TABLE_NOT_ALLOWED');
   let query=sdk.from(table),written=false;
   const filters=rules[table],q=new Proxy({}, {get(_target,key){
    if(key==='then')return (resolve,reject)=>(async()=>{
     await verify();const response=await query;check(e,n);await verify();
     if(!response||response.error)return response;
     const data=response.data,rows=data===null?[]:Array.isArray(data)?data:[data];
     if(rows.some(row=>!sameFields(row,filters)))fail('STUDENT_DATA_MISMATCH');
     await verify();return {data:clone(data),error:null};
    })().then(resolve,reject);
    if(key==='insert')return input=>{
     check(e,n);
     if(!['efg_weekly_reports','efg_period_reports'].includes(table)||written||!input||Array.isArray(input)||
      !valid(input.id)||input.student_id!==id||input.coach_id!==s.userId||
      (table==='efg_weekly_reports'?typeof input.week_ending!=='string'||!/^\d{4}-\d\d-\d\d$/.test(input.week_ending):!['period_from','period_to'].every(k=>typeof input[k]==='string'&&/^\d{4}-\d\d-\d\d$/.test(input[k])))||
      typeof input.report_text!=='string'||input.report_text.length>300000||
      Object.keys(input).some(k=>!['id','student_id','coach_id',...(table==='efg_period_reports'?['period_from','period_to']:['week_ending']),'report_text'].includes(k)))fail('COACH_WRITE_NOT_ALLOWED');
     written=true;query=query.insert(clone(input));return q;
    };
    if(!methods.has(key))return undefined;
    return (...args)=>{
     check(e,n);
     if(key==='select'){
      if(typeof args[0]!=='string')fail('INVALID_SELECT');
      const columns=args[0].split(',').map(x=>x.trim());
      if(!columns.includes('*'))args[0]=[...new Set([...columns,...Object.keys(filters)])].join(',');
      query=query.select(...args);for(const [column,value]of Object.entries(filters))query=query.eq(column,value);
     }else query=query[key](...args);
     return q;
    };
   }});
   return q;
  }
  async function rpc(name,input){
   const args=clone(input);check(e,n);
   const signatures={
    efg_get_coach_health_intake:['p_student'],efg_coach_guide_catalog:['p_student','p_food_ids'],
    efg_save_coach_plan_draft:['p_student','p_goal','p_guide','p_intake_updated_at','p_expected_revision','p_intake_revision'],
    efg_publish_coach_plan_draft_atomic:['p_student','p_expected_revision','p_request_id'],
    ncc_professional_plan_receipt_v1:['p_org','p_student','p_request_id']
   };
   const keys=signatures[name];
   if(!keys||args?.p_student!==id||Object.keys(args).length!==keys.length||keys.some(k=>!Object.hasOwn(args,k)))fail('COACH_RPC_NOT_ALLOWED');
   if(name==='ncc_professional_plan_receipt_v1'&&(args.p_org!==s.organizationId||!valid(args.p_request_id)))fail('COACH_RPC_NOT_ALLOWED');
   if(name==='efg_coach_guide_catalog'&&(!Array.isArray(args.p_food_ids)||args.p_food_ids.length>90||args.p_food_ids.some(x=>typeof x!=='string'||x.length>100)))fail('INVALID_FOOD_IDS');
   if(name==='efg_publish_coach_plan_draft_atomic'&&(!valid(args.p_request_id)||!Number.isSafeInteger(args.p_expected_revision)||args.p_expected_revision<1))fail('INVALID_PUBLICATION');
   await verify();const response=await sdk.rpc(name,args);check(e,n);await verify();
   return clone(response);
  }
  async function payment(idPayment,status){
   if(!valid(idPayment)||!['approved','rejected'].includes(status))fail('INVALID_PAYMENT');
   const before=await result(from('efg_payments').select('*').eq('id',idPayment).single());
   if(before?.id!==idPayment||before.status!=='pending')fail('PAYMENT_NOT_PENDING');
   await verify();const changed=await result(sdk.rpc('efg_confirm_payment',{p_payment:idPayment,p_status:status}));check(e,n);
   if(changed!==true)fail('INVALID_PAYMENT_RECEIPT');
   const after=await result(from('efg_payments').select('*').eq('id',idPayment).single());
   if(after?.id!==idPayment||after.status!==status||!stamp(after.reviewed_at))fail('INVALID_PAYMENT_RECEIPT');
   await verify();return clone(after);
  }
  async function receiptUrl(idPayment){
   if(!valid(idPayment))fail('INVALID_PAYMENT');
   const payment=await result(from('efg_payments').select('*').eq('id',idPayment).single());
   if(payment.id!==idPayment||typeof payment.receipt_path!=='string'||!payment.receipt_path||payment.receipt_path.includes('..'))fail('INVALID_PAYMENT');
   await verify();const signed=await result(sdk.storage.from('efg-receipts').createSignedUrl(payment.receipt_path,60));check(e,n);
   const url=new URL(signed?.signedUrl);
   if(url.origin!==scope.backendOrigin||!url.pathname.startsWith('/storage/v1/object/sign/efg-receipts/'))fail('INVALID_RECEIPT_URL');
   await verify();return url.href;
  }
  return Object.freeze({scope,isCurrent(){try{check(e,n);return true;}catch{return false;}},verify,
   sdk:Object.freeze({from,rpc,auth:Object.freeze({async getUser(){await verify();return {data:{user:{id:s.userId}},error:null};}})}),payment,receiptUrl});
 }
 return Object.freeze({bootstrap,selectOrganization,perform,studentClient,setPaymentAlias,paymentAliasPending,invalidate,dispose(){disposed=true;invalidate();subscription?.data?.subscription?.unsubscribe?.();}});
}
