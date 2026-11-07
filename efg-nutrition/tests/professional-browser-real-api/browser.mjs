import {createIndexedDBJournalDriver,createProfessionalMutationJournal,digestProfessionalPayload} from '/candidate/professional-mutation-journal.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {createProfessionalMutationGuard,createProfessionalScreens,professionalScreenScope} from '/candidate/professional-screens-candidate.mjs';
import {createProfessionalContextualTransport} from '/candidate/professional-screens-transport.mjs';
import {validatePublicConfig,requireThat,UUID,metadataOnly} from '/harness/policy.mjs';
import {createLossFetch} from '/harness/loss-fetch.mjs';
let config,sdk,journal,driver,wire,session=null,workspace=null,screens=null,originalProfile=null,epoch=0;
let status='NOT_INITIALIZED';
const nativeFetch=globalThis.fetch.bind(globalThis);
const output=document.querySelector('#status');
const safeCodes=new Set(['LOGIN_REQUIRED','DENIED','OUTCOME_UNCERTAIN','WORKSPACE_REQUIRED','STUDENT_REQUIRED','INVALID_RECEIPT','JOURNAL_UNAVAILABLE','SDK_VERSION_MISMATCH','LOSS_ALREADY_ARMED','RESPONSE_LOST_AFTER_CONSUMPTION','STALE_CONTEXT','OPERATION_PENDING','42501']);
const code=e=>safeCodes.has(e?.code)?e.code:'OPERATION_REJECTED';
function paint(){output.textContent=status;document.querySelector('#reconcile').disabled=!screens;document.querySelector('#cancel').disabled=!screens;}
const result=async fn=>{try{const value=await fn();paint();return {ok:true,value};}catch(e){status=code(e);paint();return {ok:false,code:status};}};
const checked=r=>{if(r?.error||!r?.data)throw Object.assign(new Error('SDK_REJECTED'),{code:'LOGIN_REQUIRED'});return r.data;};
const records=async()=>{const rows=await driver.transaction(s=>structuredClone(s.records));metadataOnly(rows);return rows;};
function clearSession(){epoch++;screens?.dispose();screens=null;session=null;workspace=null;originalProfile=null;status='SIGNED_OUT';paint();}
async function loadSdk(c) {
  requireThat(c.sdk.format==='esm','SDK_FORMAT_REQUIRED');
  const mod=await import(c.sdk.path);
  requireThat(typeof mod.createClient==='function'&&mod.sdkVersion==='2.118.0','SDK_EXPORT_REQUIRED');
  return mod;
}
const api={
  initialize:(c,anonKey)=>result(async()=>{
    requireThat(!sdk&&!config,'ALREADY_INITIALIZED');validatePublicConfig(c);
    requireThat(location.origin===c.frontendOrigin&&location.search===''&&location.hash==='','ORIGIN_MISMATCH');
    requireThat(typeof anonKey==='string'&&anonKey.length>0,'API_KEY_REQUIRED');
    config=structuredClone(c);
    driver=createIndexedDBJournalDriver({name:c.dbName});
    journal=createProfessionalMutationJournal({enabled:true,syntheticEnvironment:()=>true,backendNamespace:c.backendOrigin,driver});
    wire=createLossFetch({nativeFetch,backendOrigin:c.backendOrigin,readReservations:()=>journal.list({userId:session?.userId,organizationId:workspace?.view.professional.id}),digest:digestProfessionalPayload});
    const published=await loadSdk(c);
    sdk=published.createClient(c.backendOrigin,anonKey,{db:{retry:false},global:{fetch:wire.fetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    // A session is never restored from IndexedDB, profile data or selected scope.
    requireThat((await sdk.auth.getSession()).data.session===null,'AUTH_RESTORE_REJECTED');
    sdk.auth.onAuthStateChange(event=>{
      if(session&&event!=='INITIAL_SESSION') {
        if(event==='SIGNED_OUT')clearSession();
        else {session.epoch=++epoch;screens?.dispose();screens=null;workspace=null;status='REAUTHENTICATION_REQUIRED';}
      }
    });
    status='SIGNED_OUT';return {signedIn:false};
  }),
  authenticate:credentials=>result(async()=>{
    requireThat(sdk&&!session,'EXPLICIT_LOGIN_REQUIRED');
    requireThat(/^[-A-Za-z0-9._+]+@example\.invalid$/i.test(credentials?.email||'')&&typeof credentials.password==='string','SYNTHETIC_AUTH_REQUIRED');
    try {
    const signed=checked(await sdk.auth.signInWithPassword(credentials));credentials=null;
    const {user}=checked(await sdk.auth.getUser(signed.session.access_token));requireThat(UUID.test(user.id),'LOGIN_REQUIRED');
    // The SDK used real Auth getUser through local Supabase Kong for this token.
    // Claims below identify context only; they do not replace server verification.
    const segment=signed.session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims=JSON.parse(atob(segment.padEnd(Math.ceil(segment.length/4)*4,'=')));
    requireThat(claims.sub===user.id&&UUID.test(claims.session_id),'LOGIN_REQUIRED');
    session={userId:user.id,sessionId:claims.session_id,epoch:++epoch};status='AUTHENTICATED';
    return {signedIn:true,userId:user.id,sessionId:session.sessionId};
    } catch(error) {clearSession();sdk=null;throw error;} finally {credentials=null;}
  }),
  enterProfessional:(organizationId,studentId)=>result(async()=>{
    requireThat(session&&UUID.test(organizationId)&&UUID.test(studentId),'LOGIN_REQUIRED');
    const user=checked(await sdk.auth.getUser()).user;requireThat(user.id===session.userId,'LOGIN_REQUIRED');
    const context=checked(await sdk.rpc('ncc_dual_workspace_contexts_v1',{}));
    const profile=checked(await sdk.from('efg_profiles').select('user_id,role,organization_id,active').eq('user_id',user.id).single());
    requireThat(context.user_id===user.id&&context.active===true&&profile.user_id===user.id&&profile.role===context.profile_role&&profile.active===true,'DENIED');
    const candidates=context.coach_contexts?.filter(o=>o.id===organizationId);
    requireThat(candidates?.length===1,'DENIED');
    if(profile.role==='student')requireThat(context.student_context?.organization_id===profile.organization_id,'DENIED');
    originalProfile=JSON.stringify(profile);
    workspace={navigationEpoch:(workspace?.navigationEpoch||0)+1,view:{originalProfile:Object.freeze(profile),originalOrganization:profile.role==='student'?{id:profile.organization_id}:null,professional:candidates[0],selected:'coach:'+organizationId,professionalState:'candidate_roster'}};
    // Host view is a minimal mapping of authenticated reads, not an authorization source.
    // Exact transport reauthorizes every operation before and after its SQL request.
    const transport=createProfessionalContextualTransport({sdk,readContext:()=>professionalScreenScope(session,workspace),enabled:true,executionEnabled:true,environment:()=> 'localhost',backendUrl:config.backendOrigin});
    screens=createProfessionalScreens({enabled:true,reconciliationEnabled:true,syntheticEnvironment:()=>true,transport,mutationGuard:createProfessionalMutationGuard({journal}),readSession:()=>session,readWorkspace:()=>workspace});
    await screens.open();screens.selectStudent(studentId);status='WORKSPACE_READY';return api.inspect();
  }),
  armLoss:target=>result(async()=>{requireThat(screens,'WORKSPACE_REQUIRED');wire.arm(target);return true;}),
  send:body=>result(async()=>{requireThat(screens,'WORKSPACE_REQUIRED');screens.setDraft('message',body);await screens.sendMessage();return {sent:true};}),
  setAlias:alias=>result(async()=>{requireThat(screens,'WORKSPACE_REQUIRED');screens.setDraft('alias',alias);await screens.setAlias();return {saved:true};}),
  markRead:()=>result(async()=>{requireThat(screens,'WORKSPACE_REQUIRED');await screens.loadMessages();await screens.markRead();return {read:true};}),
  reconcile:()=>result(async()=>{requireThat(screens,'WORKSPACE_REQUIRED');const r=await screens.reconcileMessage();return {status:r.status,...(r.reason?{reason:r.reason}:{}),...(r.message?{operationId:r.message.id}:{})};}),
  cancel:()=>result(async()=>{screens.cancelDrafts();return true;}),
  logout:()=>result(async()=>{try{const r=await sdk.auth.signOut({scope:'local'});if(r.error)throw new Error('SIGNOUT_REJECTED');}finally{clearSession();}return true;}),
  inspect:()=>{
    let s=null;try{s=screens?.snapshot();}catch{}
    return {status,signedIn:!!session,dbName:config?.dbName??null,backendOrigin:config?.backendOrigin??null,
      workspaceReady:s?.status==='ready',uncertain:s?.uncertain??true,recovery:s?.recovery??[],
      originalProfileUnchanged:!workspace||JSON.stringify(workspace.view.originalProfile)===originalProfile,
      wire:wire?.stats()??null};
  },
  auditStorage:()=>result(async()=>({records:await records(),localStorageEntries:localStorage.length,sessionStorageEntries:sessionStorage.length})),
};
Object.defineProperty(globalThis,'nccBridge',{value:Object.freeze(api),writable:false});
document.querySelector('#reconcile').addEventListener('click',()=>api.reconcile());
document.querySelector('#cancel').addEventListener('click',()=>api.cancel());
paint();
