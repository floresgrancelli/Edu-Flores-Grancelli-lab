// PRIVATE fresh disposable runner ONLY. Four new fictional GoTrue users, never hosted.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {localContext,literal as q,yes,denied} from './helpers/coach119-local.mjs';
import {importNine,compositionEvidenceId} from './persisted-guide-nine-import.mjs';
import {createPersistedGuideProvider} from '../pilot/persisted-guide-provider.js';
import {compositionVerified} from '../pilot/guide-compatibility.js';
import {proposeAdaptedGuide} from '../pilot/adapted-guided-day.js';
import {createGuideEditor,updateGuideEditor} from '../pilot/adapted-guide-editor.js';
if(process.argv.includes('--pilot-scope-regression')){
 await runPilotScopeRegression();
}else if(process.argv.includes('--provider-regression')){
 await runProviderRegression();
}else{
assert.equal(process.env.EFG_QA_PERSISTED_GUIDE,'1');
if(process.env.EFG_QA_GUIDE_RECOVERY==='1')assert.notEqual(process.env.EFG_QA_PERSISTED_UI,'1','Recovery negatives require the non-browser suite');
assert.match(process.env.GITHUB_RUN_ID||'',/^\d+$/);
const {sql,request,rpc,asClient}=localContext();
assert.equal(sql('select count(*) from auth.users'),'0','Fresh CURRENT setup only');
assert.equal(sql('select count(*) from efg_private.coach_release_switches where enabled'),'0');
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
sql(read('../docs/CLIN_GUT_03_PRIVATE_HEALTH_INTAKE_STAGING_ONLY.sql'));
sql(read('../docs/CLIN_GUT_03_SCOPE_RESPONSE_LOCAL_OPT_IN.sql'));
const official=importNine(sql);
assert.equal(sql("select has_table_privilege('authenticated','efg_private.coach_reviewed_foods','SELECT')"),'f');
sql(read('./sql/persisted-guide-local-overlay.sql'));
if(process.env.EFG_QA_BOUND_PUBLICATION==='1'){assert.equal(process.env.EFG_QA_PERSISTED_UI,'1');sql(read('./sql/bound-publication-local-overlay.sql'));}
// Wait for exact RPC in PostgREST; missing function must never count as permission PASS.
let ready=false;for(let i=0;i<30;i++){
 const r=await rpc('efg_read_bound_guide',undefined,{p_student:randomUUID()});
 if(r.data?.code==='42501'){ready=true;break;}await new Promise(r=>setTimeout(r,200));
}assert.ok(ready,'RPC cache not ready');
const suffix=randomBytes(5).toString('hex'),password=randomBytes(20).toString('hex')+'!Ab3',users={};
for(const label of ['coachA','coachB','studentA','studentB']){
 const r=yes(await request('/auth/v1/signup',{method:'POST',body:{email:`persist-${label}-${suffix}@example.invalid`,password}}),'signup');
 assert.ok(r.access_token&&r.user.id);assert.equal(yes(await request('/auth/v1/user',{token:r.access_token}),'signed identity').id,r.user.id);
 users[label]={id:r.user.id,email:r.user.email,token:r.access_token};
}
const orgs={A:randomUUID(),B:randomUUID()};
for(const side of ['A','B']){
 const coach=users['coach'+side],student=users['student'+side],org=orgs[side];
 sql(`insert into public.efg_organizations(id,coach_id,name,is_test) values(${q(org)},${q(coach.id)},'PRIVATE guide fixture',true);
 insert into public.efg_profiles(user_id,email,nickname,role,active,organization_id) values
 (${q(coach.id)},${q(coach.email)},'Fictional coach','coach',true,null),
 (${q(student.id)},${q(student.email)},'Fictional student','student',true,${q(org)});
 insert into public.efg_consents(student_id,organization_id,accepted) values(${q(student.id)},${q(org)},true);`);
}
const legal='SYNTHETIC LOCAL CONSENT NOT FOR PEOPLE. '.repeat(8);
sql(`insert into public.efg_legal_documents(kind,version,body,sha256,is_current,published_at)
 select kind,'synthetic_persist_v1',${q(legal)},encode(sha256(convert_to(${q(legal)},'UTF8')),'hex'),true,now() from unnest(array['terms','privacy']) kind;`);
const doc=randomUUID(),digest='b'.repeat(64);
sql(`insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at)
 values(${q(doc)},'synthetic_persist_v1',${q(digest)},${q(legal)},'published',now());`);
for(const user of Object.values(users)){
 const docs=yes(await rpc('efg_legal_current_status',user.token),'documents');
 yes(await rpc('efg_accept_current_legal',user.token,{p_terms_id:docs.find(d=>d.kind==='terms').document_id,
 p_privacy_id:docs.find(d=>d.kind==='privacy').document_id,p_terms_checked:true,p_privacy_checked:true}),'accept');
}
const intake={p_completed_version:'coach_major_2026_r1',p_payload:{objective:'maintenance',age_years:40,height_cm:175,weight_kg:80,
 activity_level:'moderate',dietary_pattern:'omnivore',eating_window:'regular',preferred_foods:'banana',disliked_foods:'apple',notes:''},
 p_expected_revision:0,p_share_with_coach:true};
const prep=side=>({p_student:users['student'+side].id,p_goal:official.goal,p_intake_revision:1,p_health_revision:2,
 p_preferred:['banana'],p_disliked:['apple'],p_food_ids:official.ids,p_expected_draft:null});
for(const side of ['A','B']){
 const student=users['student'+side],coach=users['coach'+side];
 yes(await rpc('efg_accept_pilot_participation',student.token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:true}),'pilot receipt');
 assert.equal(yes(await rpc('efg_submit_coach_relaunch_intake',student.token,intake),'persist general'),1);
 assert.equal(yes(await rpc('efg_submit_coach_health_intake',student.token,{p_conditions:{},p_document_id:doc,p_document_sha256:digest,
 p_expected_revision:0,p_processing_consent:true,p_share_with_coach:true}),'empty health not declaration'),1);
 denied(await rpc('efg_prepare_bound_guide',coach.token,{...prep(side),p_health_revision:1}),'empty health cannot imply none');
 denied(await rpc('efg_declare_no_restrictions',student.token,{p_document:doc,p_sha256:digest,p_expected_revision:1,p_processing_consent:false,p_share_with_coach:true}),'explicit processing checkbox required');
 assert.equal(yes(await rpc('efg_declare_no_restrictions',student.token,{p_document:doc,p_sha256:digest,p_expected_revision:1,p_processing_consent:true,p_share_with_coach:true}),'explicit declaration'),2);
 const declaration=JSON.parse(sql(`select restriction_declaration from efg_private.efg_coach_health_intakes where student_id=${q(student.id)}`));
 assert.equal(declaration.declared_by,student.id);assert.equal(declaration.source_revision,2);assert.ok(Date.parse(declaration.confirmed_at)<=Date.now());
 assert.equal(yes(await rpc('efg_prepare_bound_guide',coach.token,prep(side)),'persist goal and source bindings'),1);
}
if(process.env.EFG_QA_PERSISTED_UI==='1'){
 const {runPersistedCoachBrowser}=await import('./persisted-coach-browser-private.mjs');
 if(process.env.EFG_QA_BOUND_PUBLICATION==='1'){
  for(const side of ['A','B']){
   const student=users['student'+side],coach=users['coach'+side];
   sql(`insert into public.efg_student_plan_access(student_id,organization_id,coach_id) values(${q(student.id)},${q(orgs[side])},${q(coach.id)}) on conflict(student_id) do nothing;
    insert into efg_private.bound_publication_local_gate(student_id,coach_id,organization_id) values(${q(student.id)},${q(coach.id)},${q(orgs[side])});`);
   yes(await rpc('efg_ack_science_intro',student.token,{p_version:'con_ciencia_2026_r1',p_action:'completed'}),'education receipt');
  }
  sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_student_diary_write_gate'");
 }
 try{await runPersistedCoachBrowser({users,orgs,official,request,rpc,password,sql});}
 finally{if(process.env.EFG_QA_BOUND_PUBLICATION==='1')sql(read('./sql/bound-publication-local-restore.sql'));}
}else{
const ownB=yes(await rpc('efg_read_bound_guide',users.coachB.token,{p_student:users.studentB.id}),'B own persisted context');assert.equal(ownB.organization_id,orgs.B);
denied(await rpc('efg_read_bound_guide',undefined,{p_student:users.studentA.id}),'anonymous');
denied(await rpc('efg_read_bound_guide',users.coachB.token,{p_student:users.studentA.id}),'foreign organization');
denied(await rpc('efg_prepare_bound_guide',users.coachA.token,{...prep('A'),p_expected_draft:1,p_intake_revision:99}),'stale intake');
denied(await rpc('efg_prepare_bound_guide',users.studentA.token,prep('A')),'student cannot confirm coach references');
const badWrite=await request('/rest/v1/efg_coach_plan_drafts?student_id=eq.'+users.studentA.id,{method:'PATCH',token:users.coachA.token,body:{goal_proposal:{kcal:9999}}});
denied(badWrite,'direct draft mutation');
let scope={userId:users.coachA.id,sessionId:JSON.parse(Buffer.from(users.coachA.token.split('.')[1],'base64url')).session_id,studentId:users.studentA.id,organizationId:orgs.A,profileId:users.coachA.id,role:'coach',active:true,ownerId:users.coachA.id,studentActive:true,studentOrganizationId:orgs.A,consent:true,consentStudentId:users.studentA.id,consentOrganizationId:orgs.A,sourceEpoch:1};
const client=asClient(users.coachA),provider=createPersistedGuideProvider({client,readScope:()=>scope,template:official.template});
const input=await provider.load();assert.equal(input.row.declaration.declared_by,users.studentA.id);assert.equal(input.row.declaration.source_revision,2);
assert.equal(input.persisted,true);assert.equal(input.synthetic,undefined);
assert.equal(input.row.general.revision,input.row.intake_revision);assert.equal(input.row.general.disliked_foods,'apple');
assert.deepEqual(input.goal,official.goal); // This same persisted goal feeds both UI summary and generator.
assert.ok(input.catalog.every(f=>compositionVerified(f,input.context.now)),'Persisted decimal composition must retain exact evaluator identity');
const proposed=proposeAdaptedGuide(input);assert.equal(proposed.ok,true,JSON.stringify({code:proposed.code,message:proposed.message}));assert.equal(proposed.plan.meals.length,5);
assert.ok(proposed.plan.meals.every(m=>m.items.every(x=>x.id!=='apple')));
const env={catalog:input.catalog,goal:input.goal,context:input.context};
let edit=createGuideEditor(proposed,env);edit=updateGuideEditor(edit,{type:'begin'},env);
const item=edit.working.meals[0].items[0];edit=updateGuideEditor(edit,{type:'replace',slot:edit.working.meals[0].slot,index:0,id:item.id,qty:item.qty+1,unit:item.unit},env);
assert.equal(edit.review.readyForReview,true);edit=updateGuideEditor(edit,{type:'save'},env);
const saved=await provider.save(edit.committed);assert.equal(saved.row.draft_revision,2);assert.deepEqual(saved.row.guide,edit.committed);
assert.deepEqual(saved.goal,input.goal);assert.equal(saved.publishable,false);
if(process.env.EFG_QA_GUIDE_RECOVERY==='1'){
 assert.notEqual(process.env.EFG_QA_PERSISTED_UI,'1','Recovery negatives use the existing non-browser fixture');
 const {runBoundRecoveryNegatives}=await import('./sdk-entry-bound-recovery-private.mjs');
 await runBoundRecoveryNegatives({sql,request,rpc,users,orgs,official,intake,prep});
}

const getDraft=token=>request('/rest/v1/efg_coach_plan_drafts?student_id=eq.'+users.studentA.id,{token});
assert.equal(yes(await getDraft(users.coachA.token),'RLS readback').length,1);
assert.equal(yes(await getDraft(users.coachB.token),'foreign RLS').length,0);
denied(await rpc('efg_save_bound_guide',users.coachA.token,{p_student:users.studentA.id,p_expected_draft:1,p_catalog_digest:saved.row.catalog_digest,p_guide:edit.committed}),'stale save');
const altered=structuredClone(edit.committed);altered.meals[0].items[0].k+=1;
denied(await rpc('efg_save_bound_guide',users.coachA.token,{p_student:users.studentA.id,p_expected_draft:2,p_catalog_digest:saved.row.catalog_digest,p_guide:altered}),'adulterated composition');
denied(await request('/rest/v1/coach_reviewed_foods?select=*',{token:users.coachA.token}),'no global catalog SELECT',['42501','PGRST205']);
denied(await rpc('efg_publish_coach_plan_draft_atomic',users.coachA.token,{p_student:users.studentA.id,p_expected_revision:2,p_request_id:randomUUID()}),'valid bound draft still not publishable');
const originalProvenance=sql("select automatic_provenance from efg_private.coach_reviewed_foods where food_id='banana'");
sql("update efg_private.coach_reviewed_foods set automatic_provenance=jsonb_set(automatic_provenance,'{recordId}','\"wrong\"') where food_id='banana'");
await assert.rejects(()=>provider.load(),/SOURCE_DENIED/);
sql(`update efg_private.coach_reviewed_foods set automatic_provenance=${q(originalProvenance)}::jsonb where food_id='banana'`);
// Delay an actual authorized HTTP response; never fabricate authorization data.
let release,started;const began=new Promise(r=>started=r);
const delayed={...client,rpc:async(...args)=>{const value=await client.rpc(...args);if(args[0]==='efg_read_bound_guide'){started();await new Promise(r=>release=r);}return value;}};
const slow=createPersistedGuideProvider({client:delayed,readScope:()=>scope,template:official.template});
const loading=slow.load();await began;scope={...scope,studentId:users.studentB.id,organizationId:orgs.B};slow.invalidate();release();
await assert.rejects(loading,/STALE_RESPONSE/);scope={...scope,studentId:users.studentA.id,organizationId:orgs.A};
assert.equal(yes(await rpc('efg_revoke_coach_health_intake',users.studentA.token,{p_expected_revision:2}),'revoke'),true);
await assert.rejects(()=>provider.load(),/SOURCE_DENIED/);assert.equal(yes(await getDraft(users.coachA.token),'revoked draft hidden').length,0);
denied(await rpc('efg_declare_no_restrictions',users.studentA.token,{p_document:doc,p_sha256:digest,p_expected_revision:2,p_processing_consent:true,p_share_with_coach:true}),'revoked replay');
denied(await rpc('efg_publish_coach_plan_draft_atomic',users.coachA.token,{p_student:users.studentA.id,p_expected_revision:2,p_request_id:randomUUID()}),'publication remains blocked');
yes(await rpc('efg_accept_pilot_participation',users.studentB.token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:false}),'B revokes sharing');
denied(await rpc('efg_read_bound_guide',users.coachB.token,{p_student:users.studentB.id}),'B sharing revocation');
}
assert.equal(sql('select count(*) from public.efg_goals'),process.env.EFG_QA_BOUND_PUBLICATION==='1'?'2':'0');
assert.equal(sql('select count(*) from efg_private.coach_release_switches where enabled'),'0');
console.log(process.env.EFG_QA_BOUND_PUBLICATION==='1'?'PASS bound COACH119 local publication UI/learner HTTP/rollback (see result.json)':process.env.EFG_QA_PERSISTED_UI==='1'?'PASS persisted UI HTTP/DB readback (see result.json)': 'PASS persisted nine-food guide: signed A/B declarations, source-bound persisted goal/preferences, five meals, edit/save/readback, RLS/revocation/stale/tamper negatives; publish OFF. Disposable fixtures only.');

}
// Unit-only regression: no localContext(), SQL, JWT creation, network, or server.
async function runProviderRegression(){
 const schema=readFileSync(new URL('../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',import.meta.url),'utf8');
 const check=schema.match(/evidence_id text not null unique check\(evidence_id ~ '([^']+)'\)/);
 assert.ok(check,'Actual evidence_id CHECK must be located');
 const databasePattern=new RegExp(check[1]);
 const raw='sha256:'+ 'a'.repeat(64),evidence=compositionEvidenceId(raw);
 assert.match(evidence,databasePattern);
 assert.equal(evidence,'sha256_'+ 'a'.repeat(64));
 assert.equal(raw,'sha256:'+ 'a'.repeat(64),'Original provenance.rawDigest stays exact');
 assert.doesNotMatch(raw,databasePattern,'Regression must reproduce original CHECK failure');
 for(const bad of ['sha256:short','sha256:'+ 'G'.repeat(64),'sha256_'+ 'a'.repeat(64)])
  assert.throws(()=>compositionEvidenceId(bad));
 for(const change of ['student','session','invalidate','unchanged']){
  let scope={userId:'coach-a',profileId:'coach-a',sessionId:'session-a',studentId:'student-a',organizationId:'org-a',
   role:'coach',active:true,ownerId:'coach-a',studentActive:true,studentOrganizationId:'org-a',
   consent:true,consentStudentId:'student-a',consentOrganizationId:'org-a',sourceEpoch:1};
  let authCalls=0,writes=0,releaseAuth,authStarted,rpcCalls=0,revision=1;
  const started=new Promise(resolve=>{authStarted=resolve;});
  const row=()=>({viewer_id:'coach-a',session_id:'session-a',student_id:'student-a',organization_id:'org-a',
   intake_revision:1,health_revision:1,draft_revision:revision,catalog_digest:'unit-only-digest',
   restriction_declaration:'none_declared',publishable:false,evaluated_at:'2026-11-01T00:00:00Z',
   foods:[{id:'unit-yogurt',unit:'g',k:.59,p:.1019,c:.036,f:.0039,fi:0,
    validated_at:'2026-10-31T23:59:00Z',expires_at:'2026-11-01T01:00:00Z',
    provenance:{foodId:'unit-yogurt',unit:'g',provider:'usda_fdc',test_only:false,description:'UNIT ONLY',preparation:'as_sold',
     sourceUrl:'https://api.nal.usda.gov/fdc/v1/food/170894',rawDigest:'sha256:'+ 'a'.repeat(64),
     perUnit:{k:.59,p:10.19/100,c:3.6/100,f:.39/100,fi:0}}}],goal:{kcal:2100},preferred_ids:[],disliked_ids:[]});
  const client={auth:{getUser:async()=>{
   authCalls++;
   // load=1; save's revalidation load=2; actual write's Auth=3.
   if(authCalls===3){authStarted();await new Promise(resolve=>{releaseAuth=resolve;});}
   return {data:{user:{id:'coach-a'}},error:null};
  }},rpc:async(name,args)=>{
   rpcCalls++;
   if(name==='efg_get_coach_health_intake')return {data:{viewer_id:'coach-a',student_id:'student-a',organization_id:'org-a',
    processing_consent:true,followup_consent:true,shared_with_coach:true,revision:1},error:null};
   if(name==='efg_read_bound_guide')return {data:row(),error:null};
   assert.equal(name,'efg_save_bound_guide');writes++;assert.equal(args.p_student,'student-a');
   return {data:++revision,error:null};
  }};
  const provider=createPersistedGuideProvider({client,readScope:()=>scope,template:[]});
  const loaded=await provider.load();
  assert.ok(compositionVerified(loaded.catalog[0],loaded.context.now));
  assert.equal(loaded.catalog[0].composition.perUnit.p,.1019);
  assert.equal(loaded.catalog[0].composition.sourcePerUnit.p,10.19/100);
  const saving=provider.save({kind:'UNIT_ONLY_NOT_A_REAL_PLAN'});
  let timeout;
  try{await Promise.race([started,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Write Auth wait not reached')),2000);})]);}
  finally{clearTimeout(timeout);}
  const callsBeforeRelease=rpcCalls;
  if(change==='student')scope={...scope,studentId:'student-b',consentStudentId:'student-b'};
  if(change==='session')scope={...scope,sessionId:'session-b'};
  if(change==='invalidate')provider.invalidate();
  releaseAuth();
  if(change==='unchanged'){
   assert.equal((await saving).row.draft_revision,2);assert.equal(writes,1,'Stable Auth must not disable saving');
  }else{
   await assert.rejects(saving,/STALE_CONTEXT/);
   assert.equal(writes,0,'Stale Auth must prevent write initiation, not just discard its response');
   assert.equal(rpcCalls,callsBeforeRelease,'No RPC may begin after the stale Auth await');
  }
 }
 console.log('PASS private unit regressions: evidence_id CHECK and raw digest preservation; student/session/generation change during Auth blocks RPC initiation; unchanged scope writes once. No SQL or hosted claim.');
}

// Extract production functions verbatim into a temporary ESM module; no eval/Function or V8 bypass.
async function runPilotScopeRegression(){
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const pilot=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 const begin='// PERSISTED_COACH_SCOPE_BEGIN',end='// PERSISTED_COACH_SCOPE_END';
 assert.equal(pilot.split(begin).length,2);assert.equal(pilot.split(end).length,2);
 const extracted=pilot.slice(pilot.indexOf(begin),pilot.indexOf(end));
 const authStart=pilot.indexOf('function handleAuthStateChange(event,session){');
 const authEnd=pilot.indexOf('// Never auto-reload',authStart);assert.ok(authStart>0&&authEnd>authStart);
 const directory=mkdtempSync(join(tmpdir(),'ncc-real-pilot-scope-'));
 try{
  const modulePath=join(directory,'scope.mjs');
  writeFileSync(modulePath,`let state,coachPersistedGuideSource=null;let closes=0;
const coachAdaptedWorkspace={close(){closes++;coachPersistedGuideSource?.invalidate();}};
const refresh=()=>{throw Error('Unexpected refresh branch');};
const resetPrivateSession=()=>{coachAdaptedWorkspace.close();state.session=null;};const loginView=()=>{};
${extracted}\n${pilot.slice(authStart,authEnd)}
export {adaptedCoachScope,coachSessionIdentity,setCoachSessionIdentity,handleAuthStateChange};
export const attach=(s,p)=>{state=s;coachPersistedGuideSource=p;};export const closeCount=()=>closes;
`);
  const real=await import(pathToFileURL(modulePath));
  const sid='11111111-1111-4111-8111-111111111111',sid2='22222222-2222-4222-8222-222222222222';
  const user={id:'coach-a'};
  const session=(id,sub=user.id)=>({user,access_token:'header.'+Buffer.from(JSON.stringify({sub,session_id:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature'});
  const state={session:null,profile:{user_id:user.id,role:'coach',active:true},org:{id:'org-a',coach_id:user.id},
   roster:[{user_id:'student-a',active:true,organization_id:'org-a'},{user_id:'student-b',active:true,organization_id:'org-a'}],selectedStudent:'student-a',
   consent:{accepted:true,student_id:'student-a',organization_id:'org-a'},coachIntakeForms:{'student-a':{revision:1,updated_at:'r1',shared_at:'shared'}},coachIntakeAccess:{}};
  real.attach(state,null);real.setCoachSessionIdentity(session(sid),user);
  let reads=0,auth=0,release,entered,hold=false;
  const client={auth:{getUser:async()=>{auth++;if(hold){entered();await new Promise(r=>release=r);}return {data:{user},error:null};}},rpc:async name=>{
   reads++;
   if(name==='efg_get_coach_health_intake')return {data:{viewer_id:user.id,student_id:state.selectedStudent,organization_id:'org-a',revision:1,processing_consent:true,followup_consent:true,shared_with_coach:true},error:null};
   assert.equal(name,'efg_read_bound_guide');return {data:{viewer_id:user.id,session_id:state.session.session_id,student_id:state.selectedStudent,organization_id:'org-a',
    health_revision:1,intake_revision:1,draft_revision:1,catalog_digest:'unit-digest',restriction_declaration:'none_declared',publishable:false,
    evaluated_at:new Date().toISOString(),foods:[],goal:{kcal:2100},preferred_ids:[],disliked_ids:[]},error:null};
  }};
  const provider=createPersistedGuideProvider({client,readScope:real.adaptedCoachScope,template:[]});real.attach(state,provider);
  const scope=real.adaptedCoachScope();assert.ok(Number.isSafeInteger(scope.sourceEpoch)&&scope.sourceEpoch>0);
  assert.equal((await provider.load()).persisted,true);assert.equal(reads,2,'Real pilot scope must reach health and bound RPC');assert.equal(auth,1);
  assert.equal(real.adaptedCoachScope().sourceEpoch,scope.sourceEpoch,'Unchanged scope stays stable');
  const count=real.closeCount();real.handleAuthStateChange('TOKEN_REFRESHED',session(sid));
  assert.equal(state.session.session_id,sid);assert.equal(real.closeCount(),count,'Same JWT session refresh preserves context');
  real.handleAuthStateChange('SIGNED_IN',session(sid2));assert.equal(state.session.session_id,sid2);assert.ok(real.closeCount()>count);
  assert.ok(real.adaptedCoachScope().sourceEpoch>scope.sourceEpoch);assert.equal(Object.hasOwn(state.session,'access_token'),false);
  assert.equal(real.coachSessionIdentity(session(sid,'other-user'),user),null);assert.equal(real.coachSessionIdentity({...session(sid),access_token:'broken'},user),null);
  // Actual pilot revision fingerprint changes during Auth: no bound-data RPC may begin.
  const started=new Promise(r=>entered=r);hold=true;const pending=provider.load();await started;
  const before=reads;state.coachIntakeForms['student-a']={revision:2,updated_at:'r2',shared_at:'shared'};release();
  await assert.rejects(pending,/STALE_CONTEXT/);assert.equal(reads,before);hold=false;
  const epoch=real.adaptedCoachScope().sourceEpoch;state.selectedStudent='student-b';state.consent.student_id='student-b';
  assert.ok(real.adaptedCoachScope().sourceEpoch>epoch);
  assert.equal((await provider.load()).row.student_id,'student-b');
  const beforeDenied=reads;state.consent.accepted=false;await assert.rejects(()=>provider.load(),/SOURCE_DENIED/);assert.equal(reads,beforeDenied);
  console.log('PASS real pilot scope/provider regression: positive epoch, real health gate reached, stable refresh, new session invalidation, revision change during Auth blocks RPC, student switch and consent denial. Unit transport only; not HTTP/UI execution.');
 }finally{rmSync(directory,{recursive:true,force:true});}
}
