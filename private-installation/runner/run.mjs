import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {localContext,yes,denied} from './local-context.mjs';
import {reviewedDependencies} from './prerequisites.mjs';
import {attestDatabase} from './isolation.mjs';
import {q,rowSnapshot,aclSnapshot,verifyObserved} from './snapshot.mjs';
import {capturePermissions,verifyPermissions} from './acl-contract.mjs';
import {negativePublicationCases,secondPublicationCase} from './additional-cases.mjs';
import {verifyLegacyCutover} from './legacy-cutover-tests.mjs';
import {officialInput,installOfficialFixture} from './official-import.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const deps=reviewedDependencies(import.meta.url); // STOP before any DB access if unavailable.
const {sql,rpc,request,asClient}=localContext();const identity=attestDatabase(sql);
assert.equal(sql('select count(*) from auth.users'),'0');
assert.equal(sql("select to_regclass('public.efg_profiles') is null"),'t');
const out='artifacts/incremental-install';mkdirSync(out,{recursive:true});
const result={status:'RUNNING',sha:process.env.GITHUB_SHA,groups:[],limits:['Synthetic support profiles/organizations; not a complete hosted restore','No browser or physical UAT','Legacy client writes closed in disposable cutover only; hosted unchanged; administrative deletion requires separate reviewed operation'],restored:false};
const record=x=>result.groups.push(x);
const tables=['public.efg_coach_relaunch_intakes','public.efg_pilot_participation_receipts','public.efg_consents','public.efg_goals','public.efg_food_plans','public.efg_student_plan_access','public.efg_notifications','public.efg_coach_plan_drafts','public.efg_legal_documents','public.efg_legal_acceptances','public.efg_sunday_rewards','efg_private.coach_reviewed_foods','efg_private.coach_release_switches'];
let baselineReady=false,installed=false;
try{
 const baseline=read('runner/baseline-generated.sql');
 for(const dep of deps)assert.ok(baseline.includes(dep.definition.trim()),'Exact dependency body must be generated');
 sql(baseline);
 for(const dep of deps){
  const got=JSON.parse(sql(`select jsonb_build_object('md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,'proconfig',p.proconfig,'prosecdef',p.prosecdef) from pg_proc p where p.oid=${q(dep.signature)}::regprocedure`));
  assert.equal(got.md5,dep.md5);assert.equal(got.owner,dep.owner);assert.deepEqual([...got.acl].sort(),[...dep.acl].sort());assert.deepEqual(got.proconfig,dep.proconfig);assert.equal(got.prosecdef,dep.prosecdef);
 }
 baselineReady=true;
 const metadata=JSON.parse(read('evidence/hosted-metadata-20261101-2212.json'));
 verifyObserved(sql,metadata);record('baseline observed columns/constraints/function digests');
 const exactTypes=JSON.parse(read('runner/confirmed-types.json'));
 for(const c of exactTypes.columns){const actual=JSON.parse(sql(`select jsonb_build_object('type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) from pg_attribute a where a.attrelid=${q(c.schema_name+'.'+c.table_name)}::regclass and a.attname=${q(c.column_name)} and a.attnum>0 and not a.attisdropped`));assert.deepEqual(actual,{type:c.exact_type,not_null:c.not_null});}
 record('ten confirmed exact types and nullability');
 writeFileSync(out+'/acl-before.json',JSON.stringify(aclSnapshot(sql),null,2));
 const input=officialInput(),goal={...input.goal,goal_type:'maintenance'};
 const password=randomBytes(24).toString('hex')+'!Aa9',suffix=randomBytes(6).toString('hex'),users={};
 for(const label of ['coachA','coachB','studentA','studentB']){
  const u=yes(await request('/auth/v1/signup',{method:'POST',body:{email:`install-${label}-${suffix}@example.invalid`,password}}),'local signup');
  assert.ok(u.access_token&&u.user.id);assert.equal(yes(await request('/auth/v1/user',{token:u.access_token}),'signed user').id,u.user.id);
  users[label]={id:u.user.id,email:u.user.email,token:u.access_token};
 }
 const orgs={A:randomUUID(),B:randomUUID()};
 for(const side of ['A','B']){const c=users['coach'+side],s=users['student'+side];
  sql(`insert into public.efg_organizations(id,coach_id,name,is_test) values(${q(orgs[side])},${q(c.id)},'FICTIONAL incremental',true);
   insert into public.efg_profiles(user_id,email,nickname,role,active,organization_id) values
   (${q(c.id)},${q(c.email)},'Test coach','coach',true,null),(${q(s.id)},${q(s.email)},'Test student','student',true,${q(orgs[side])});
   insert into public.efg_consents(student_id,organization_id,accepted) values(${q(s.id)},${q(orgs[side])},true);
   insert into public.efg_student_plan_access(student_id,organization_id,coach_id) values(${q(s.id)},${q(orgs[side])},${q(c.id)});`);
 }
 const text='FICTIONAL LOCAL CONSENT, NOT A DOCUMENT FOR PEOPLE. '.repeat(10);
 sql(`insert into public.efg_legal_documents(kind,version,body,sha256,is_current,published_at) select kind,'isolated_install_v1',${q(text)},encode(sha256(convert_to(${q(text)},'UTF8')),'hex'),true,now() from unnest(array['terms','privacy']) kind; notify pgrst,'reload schema';`);
 for(let n=0;n<40;n++){const r=await rpc('efg_legal_current_status',users.studentA.token);if(r.ok)break;assert.equal(r.data?.code,'PGRST202');await new Promise(r=>setTimeout(r,250));}
 for(const u of Object.values(users)){const docs=yes(await rpc('efg_legal_current_status',u.token),'legal read');
  yes(await rpc('efg_accept_current_legal',u.token,{p_terms_id:docs.find(x=>x.kind==='terms').document_id,p_privacy_id:docs.find(x=>x.kind==='privacy').document_id,p_terms_checked:true,p_privacy_checked:true}),'explicit local acceptance');}
 const intake=(revision,share)=>({p_completed_version:'coach_major_2026_r1',p_expected_revision:revision,p_share_with_coach:share,p_payload:{objective:'maintenance',age_years:40,height_cm:175,weight_kg:80,activity_level:'moderate',dietary_pattern:'omnivore',eating_window:'regular',preferred_foods:'banana',disliked_foods:'apple',notes:''}});
 const receipt=(side,sharing)=>rpc('efg_accept_pilot_participation',users['student'+side].token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:sharing});
 // Legacy B rows are genuinely created through the installed historical RPC/JWT.
 yes(await receipt('B',true),'legacy participation');
 assert.equal(yes(await rpc('efg_submit_coach_relaunch_intake',users.studentB.token,intake(0,true)),'legacy intake'),1);
 const oldIntake=yes(await request('/rest/v1/efg_coach_relaunch_intakes?student_id=eq.'+users.studentB.id,{token:users.studentB.token}),'own legacy intake')[0];
 yes(await rpc('efg_save_coach_plan_draft',users.coachB.token,{p_student:users.studentB.id,p_goal:goal,p_guide:null,p_intake_updated_at:oldIntake.updated_at,p_intake_revision:1,p_expected_revision:null}),'legacy draft');
 const oldGoal=randomUUID();yes(await request('/rest/v1/efg_goals',{method:'POST',token:users.coachB.token,body:{id:oldGoal,student_id:users.studentB.id,approved_by:users.coachB.id,...goal}}),'legacy goal JWT');
 const originalRows=rowSnapshot(sql,tables);
 const permissionsBefore=capturePermissions(sql);
 for(const file of JSON.parse(read('installation/installation-order.json')).files){
  attestDatabase(sql);sql(read('installation/'+file));record('applied '+file);
 }
 installed=true;
 assert.deepEqual(rowSnapshot(sql,tables.filter(x=>x!=='efg_private.coach_release_switches')),Object.fromEntries(Object.entries(originalRows).filter(([k])=>k!=='efg_private.coach_release_switches')),'All legacy rows unchanged by installation');
 assert.equal(sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication'"),'f');
 const permissionsAfter=verifyPermissions(sql,permissionsBefore);
 writeFileSync(out+'/acl-six-migrations-before-cutover-contract.json',JSON.stringify({before:permissionsBefore,after:permissionsAfter,verified:true},null,2));
 writeFileSync(out+'/acl-after-six-migrations-before-cutover.json',JSON.stringify(aclSnapshot(sql),null,2));record('complete new-route ACL contract; existing ACL/defaults/column grants unchanged');record('legacy records/receipts preserved across six COMMITs; publication OFF');
 for(const t of ['efg_private.nutrition_import_policies','efg_private.guide_source_bindings','efg_private.efg_coach_health_intakes','public.efg_coach_plan_publish_receipts'])assert.equal(sql(`select has_table_privilege('authenticated',${q(t)},'SELECT,INSERT,UPDATE,DELETE')`),'f');
 await verifyLegacyCutover({sql,request,rpc,users,goal,readCutover:()=>read('installation/proposed/legacy-write-cutover.PROPOSAL.sql'),record,onPermissions:cutoverAcl=>{
  writeFileSync(out+'/acl-after-cutover.json',JSON.stringify(cutoverAcl.after,null,2));
  writeFileSync(out+'/acl-cutover-contract.json',JSON.stringify(cutoverAcl,null,2));
 }});
 sql("notify pgrst,'reload schema'");
 for(let n=0;n<40;n++){const r=await rpc('efg_read_bound_guide',undefined,{p_student:users.studentA.id});if(r.data?.code==='42501')break;assert.equal(r.data?.code,'PGRST202');await new Promise(r=>setTimeout(r,250));}
 denied(await rpc('efg_read_bound_guide',undefined,{p_student:users.studentA.id}),'anonymous real RPC',['42501']);
 // Exercise the actual installed CHECK expression without changing source rows.
 const urlCheck=sql("select pg_get_expr(conbin,conrelid) from pg_constraint where conrelid='efg_private.coach_reviewed_foods'::regclass and conname='coach_reviewed_foods_source_url_check'");
 for(const [url,expected] of [['https://'+'a'.repeat(8),true],['https://'+'a'.repeat(1990),true],['https://'+'a'.repeat(7),false],['https://'+'a'.repeat(1991),false],['http://'+'a'.repeat(9),false],['https://abcd efgh',false]]){
  assert.equal(sql('select '+urlCheck.replaceAll('source_url',q(url))),expected?'t':'f','Source URL boundary/HTTPS/whitespace');
 }
 record('source URL CHECK boundaries, HTTPS and whitespace preserved');
 const ids=installOfficialFixture(sql,input);
 // Identity guard includes Docker network IP. Never demand server loopback when
 // libpq loopback forwards to a verified Docker network address.
 const nonce=randomBytes(20).toString('hex');
 sql(`create table efg_private.installation_runner_identity(run_id text,system_identifier text,server_addr text,nonce text); alter table efg_private.installation_runner_identity enable row level security; revoke all on efg_private.installation_runner_identity from public,anon,authenticated; insert into efg_private.installation_runner_identity values(${q(process.env.GITHUB_RUN_ID)},${q(identity.system)},${q(identity.addr)},${q(nonce)});`);
 attestDatabase(sql);
 let anchor=read('installation/tests/manifest-anchor-local.sql');
 const start=anchor.indexOf(" IF current_setting('efg.test_disposable_installation'");const end=anchor.indexOf(' SELECT food.* INTO original',start);assert.ok(start>0&&end>start);
 anchor=anchor.slice(0,start)+` IF NOT EXISTS(select 1 from efg_private.installation_runner_identity r where r.run_id=${q(process.env.GITHUB_RUN_ID)} and r.system_identifier=(select system_identifier::text from pg_control_system()) and r.server_addr=host(inet_server_addr()) and r.nonce=current_setting('efg.test_runner_nonce',true)) THEN RAISE EXCEPTION 'Attested disposable DB required'; END IF;\n`+anchor.slice(end);
 const sourceBefore=rowSnapshot(sql,['efg_private.coach_reviewed_foods','efg_private.nutrition_import_policies']);
 sql(`set efg.test_runner_nonce=${q(nonce)};\n`+anchor);assert.deepEqual(rowSnapshot(sql,Object.keys(sourceBefore)),sourceBefore);record('seven manifest assertions and SQL rollback');
 yes(await receipt('A',false),'explicit private participation');assert.equal(yes(await rpc('efg_submit_coach_relaunch_intake',users.studentA.token,intake(0,false)),'private intake'),1);
 const readIntake=token=>request('/rest/v1/efg_coach_relaunch_intakes?student_id=eq.'+users.studentA.id,{token});
 assert.equal(yes(await readIntake(users.studentA.token),'private own').length,1);assert.equal(yes(await readIntake(users.coachA.token),'private coach').length,0);assert.equal(yes(await readIntake(users.coachB.token),'private B').length,0);
 yes(await receipt('A',true),'explicit share receipt');assert.equal(yes(await rpc('efg_submit_coach_relaunch_intake',users.studentA.token,intake(1,true)),'share intake'),2);record('private initial intake then explicit sharing');
 const doc=randomUUID(),digest=sql(`select encode(sha256(convert_to(${q(text)},'UTF8')),'hex')`);
 sql(`insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at) values(${q(doc)},'isolated_install_v1',${q(digest)},${q(text)},'published',now());`);
 const declare=revision=>rpc('efg_declare_no_restrictions',users.studentA.token,{p_document:doc,p_sha256:digest,p_expected_revision:revision,p_processing_consent:true,p_share_with_coach:true});
 assert.equal(yes(await declare(0),'explicit none'),1);
 const prep={p_student:users.studentA.id,p_goal:goal,p_intake_revision:2,p_health_revision:1,p_preferred:['banana'],p_disliked:['apple'],p_food_ids:ids,p_expected_draft:null};
 const mutationTables=[...tables,'efg_private.guide_source_bindings','efg_private.efg_coach_health_intakes','efg_private.efg_coach_health_revocations','efg_private.efg_coach_health_documents','public.efg_coach_plan_publish_receipts','efg_private.coach_guide_history','efg_private.coach119_atomic_transactions'];
 const noMutation=async(call,label,codes)=>{const before=rowSnapshot(sql,mutationTables);denied(await call(),label,codes);assert.deepEqual(rowSnapshot(sql,mutationTables),before,label+' no mutation');};
 await noMutation(()=>rpc('efg_prepare_bound_guide',users.coachB.token,prep),'foreign coach',['42501']);
 assert.equal(yes(await rpc('efg_prepare_bound_guide',users.coachA.token,prep),'prepare'),1);
 const app=path=>pathToFileURL(process.cwd()+'/efg-nutrition/pilot/'+path).href;
 const {createPersistedGuideProvider}=await import(app('persisted-guide-provider.js'));
 const {proposeAdaptedGuide}=await import(app('adapted-guided-day.js'));
 const coach=users.coachA,s=users.studentA;
 const scope={userId:coach.id,profileId:coach.id,role:'coach',active:true,sessionId:JSON.parse(Buffer.from(coach.token.split('.')[1],'base64url')).session_id,studentId:s.id,organizationId:orgs.A,ownerId:coach.id,studentActive:true,studentOrganizationId:orgs.A,consent:true,consentStudentId:s.id,consentOrganizationId:orgs.A,sourceEpoch:1};
 const provider=createPersistedGuideProvider({client:asClient(coach),readScope:()=>scope,template:input.template});
 const context=await provider.load(),proposal=proposeAdaptedGuide(context);assert.equal(proposal.ok,true);assert.ok(proposal.plan.meals.every(m=>m.items.every(i=>i.id!=='apple')));
 const guide={...proposal.plan,approvedFoodIds:ids.filter(x=>x!=='apple')};
 const saved=await provider.save(guide);assert.equal(saved.row.draft_revision,2);
 const publish=(token,id=randomUUID(),rev=2)=>rpc('efg_publish_coach_plan_draft_atomic',token,{p_student:s.id,p_expected_revision:rev,p_request_id:id});
 await noMutation(()=>publish(coach.token),'switch OFF',['42501']);
 sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_coach_atomic_publication'");
 await noMutation(()=>publish(users.coachB.token),'foreign publish',['42501']);await noMutation(()=>publish(coach.token,randomUUID(),1),'stale revision',['PT409']);
 for(const label of await negativePublicationCases({sql,rpc,coach,otherCoach:users.coachB,student:s,doc,text,digest,tables:mutationTables,noMutation}))record(label);
 // Test a late failure after goal/guide/access/notification work, before receipt.
 sql("create function efg_private.installation_fail_receipt() returns trigger language plpgsql as $$begin raise exception 'LOCAL_INJECTED_FINAL_FAILURE' using errcode='P0001'; end$$; revoke all on function efg_private.installation_fail_receipt() from public,anon,authenticated; create trigger installation_fail_receipt before insert on public.efg_coach_plan_publish_receipts for each row execute function efg_private.installation_fail_receipt();");
 try{await noMutation(()=>publish(coach.token),'injected final failure',['P0001']);}finally{sql('drop trigger installation_fail_receipt on public.efg_coach_plan_publish_receipts; drop function efg_private.installation_fail_receipt();');}
 record('late publication failure rolls back all affected tables');
 const concurrent=await Promise.all([publish(coach.token),publish(coach.token)]);
 assert.equal(concurrent.filter(x=>x.ok).length,1);denied(concurrent.find(x=>!x.ok),'concurrent loser',['PT409']);
 const published=concurrent.find(x=>x.ok).data;
 const rec=JSON.parse(sql(`select to_jsonb(r) from public.efg_coach_plan_publish_receipts r where student_id=${q(s.id)}`));
 const afterPublish=rowSnapshot(sql,mutationTables);assert.equal(yes(await publish(coach.token,rec.request_id),'idempotent retry'),published);assert.deepEqual(rowSnapshot(sql,mutationTables),afterPublish);
 assert.equal(sql(`select count(*) from public.efg_notifications where recipient_id=${q(s.id)} and event_key like 'coach_plan:%'`),'1');
 assert.equal(sql('select count(*) from efg_private.coach119_atomic_transactions'),'0');
 const studentGoals=yes(await request('/rest/v1/efg_goals?id=eq.'+published,{token:s.token}),'student goal read');assert.equal(studentGoals.length,1);
 assert.equal(yes(await request('/rest/v1/efg_food_plans?student_id=eq.'+s.id,{token:s.token}),'student guide').length,1);
 assert.equal(yes(await request('/rest/v1/efg_food_plans?student_id=eq.'+s.id,{token:users.studentB.token}),'other student').length,0);
 assert.equal(yes(await rpc('efg_coach_pilot_entry_status',s.token),'student entry').route,'ready');record('concurrent single publication, student JWT read, one notice, idempotence');
 const second=await secondPublicationCase({sql,rpc,request,yes,coach,student:s,prep,provider,guide,firstReceipt:rec,firstGoal:published,tables:mutationTables});record('second publication archives first guide and retains both receipts; retry has no mutation');
 // Revocation is now tested against a valid fresh review draft, not published status.
 yes(await rpc('efg_revoke_coach_health_intake',s.token,{p_expected_revision:1}),'revoke');
 await noMutation(()=>rpc('efg_read_bound_guide',coach.token,{p_student:s.id}),'revoked read',['PT409']);
 await noMutation(()=>publish(coach.token,randomUUID(),second.nextRevision),'revoked new publication',['PT409','42501']);
 yes(await receipt('A',false),'withdraw sharing');await noMutation(()=>publish(coach.token,rec.request_id),'withdrawn sharing blocks replay',['42501']);record('revocation and sharing withdrawal');
 // The legacy B row/receipts/draft must still match, not be erased by A operations.
 for(const t of ['public.efg_goals','public.efg_coach_plan_drafts','public.efg_coach_relaunch_intakes','public.efg_pilot_participation_receipts']){
  const before=JSON.parse(originalRows[t]).filter(x=>x.student_id===users.studentB.id);
  const after=JSON.parse(rowSnapshot(sql,[t])[t]).filter(x=>x.student_id===users.studentB.id);assert.deepEqual(after,before);
 }
 record('legacy B goal/draft/intake/receipt retained');
 if(process.env.EFG_QA_CLINICAL_COMPATIBILITY==='1')await (await import('./clinical-cases.mjs')).clinicalCases({sql,rpc,request,users,orgs,goal,guide,ids,doc,digest,intake,mutationTables,record,out});
 result.status='PASS';
}catch(e){result.status='FAIL';result.error={name:e.name,message:String(e.message).replace(/eyJ[A-Za-z0-9_.-]+/g,'[REDACTED]').slice(0,1600)};throw e;
}finally{
 try{if(installed){sql("update efg_private.coach_release_switches set enabled=false where switch_key='pilot_coach_atomic_publication'");assert.equal(sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication'"),'f');assert.equal(sql('select count(*) from efg_private.coach119_atomic_transactions'),'0');result.restored=true;}}catch(e){result.status='FAIL_RESTORE';result.restored=false;throw e;}finally{
 writeFileSync(out+'/result.json',JSON.stringify(result,null,2));}
}
