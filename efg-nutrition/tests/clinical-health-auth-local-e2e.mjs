// CLIN-GUT-03 · REAL signed GoTrue JWT through DISPOSABLE LOCAL Supabase only.
// Synthetic health consent document and fictional organizations/users, never hosted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
const providerContract=process.env.EFG_QA_PROVIDER_CONTRACT==='1';
if(providerContract)assert.equal(process.env.GITHUB_ACTIONS,'true','V5 requires actual authorized runner');
const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV||'', 'utf8')
 .split(/\r?\n/).filter(s=>s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const api=env.API_URL,key=env.ANON_KEY||env.PUBLISHABLE_KEY;
assert.ok(api&&key);
const url=new URL(api);
assert.equal(url.protocol,'http:');
assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
assert.equal(url.port,'54321');
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const pg={...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres'};
function sql(q){
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c',q],{env:pg,encoding:'utf8',timeout:30000});
 assert.equal(r.status,0,(r.stderr||r.stdout||'Local PG error').slice(0,1300));
 return r.stdout.trim();
}
const quote=x=>{assert.match(x,/^[0-9a-f-]{36}$/i);return "'"+x+"'";};
async function request(path,{method='GET',token=null,body}={}){
 const r=await fetch(api+path,{method,headers:{apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json'},
 body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const raw=await r.text();let data=raw;try{data=raw?JSON.parse(raw):null}catch{}
 return {ok:r.ok,status:r.status,data};
}
const good=(r,label)=>{assert.equal(r.ok,true,label+': HTTP '+r.status+' '+JSON.stringify(r.data).slice(0,460));return r.data;};
const bad=(r,label)=>{assert.equal(r.ok,false,label+' unexpectedly succeeded');return r;};
const rpc=(name,token,body={})=>request('/rest/v1/rpc/'+name,{method:'POST',token,body});
const postfix=randomBytes(5).toString('hex'),password=randomBytes(15).toString('hex')+'!Aa82';
async function signup(label){
 const res=good(await request('/auth/v1/signup',{method:'POST',body:{
  email:'gut03-'+label+'-'+postfix+'@example.invalid',password
 }}),'GoTrue signup '+label);
 assert.ok(res.access_token&&res.user?.id);
 assert.equal(good(await request('/auth/v1/user',{token:res.access_token}),'Signed user').id,res.user.id);
 return {id:res.user.id,token:res.access_token,email:res.user.email};
}
const u={};
for(const label of ['coachA','coachB','studentA','studentB'])u[label]=await signup(label);
const orgA=randomUUID(),orgB=randomUUID();
sql('insert into public.efg_organizations(id,coach_id,name) values ('+
 quote(orgA)+','+quote(u.coachA.id)+',\'Clinical Fixture A\'),('+
 quote(orgB)+','+quote(u.coachB.id)+',\'Clinical Fixture B\')');
sql('insert into public.efg_profiles(user_id,email,nickname,organization_id,role,active) values '+
 '('+quote(u.coachA.id)+',\''+u.coachA.email+'\',\'Coach Gut A\',null,\'coach\',true),'+
 '('+quote(u.coachB.id)+',\''+u.coachB.email+'\',\'Coach Gut B\',null,\'coach\',true),'+
 '('+quote(u.studentA.id)+',\''+u.studentA.email+'\',\'Student Gut A\','+quote(orgA)+',\'student\',true),'+
 '('+quote(u.studentB.id)+',\''+u.studentB.email+'\',\'Student Gut B\','+quote(orgB)+',\'student\',true)');
sql('insert into public.efg_consents(student_id,organization_id,accepted) values ('+
 quote(u.studentA.id)+','+quote(orgA)+',true),('+
 quote(u.studentB.id)+','+quote(orgB)+',true)');
assert.equal(good(await rpc('efg_current_coach_health_document',u.studentA.token),'No current consent document'),null);
const docIDs=sql("select string_agg(id::text,',') from public.efg_legal_documents "+
 "where status='published' and kind in ('terms','privacy') and locale='es-AR'").split(',');
assert.equal(docIDs.length,2);
good(await rpc('efg_accept_legal_documents',u.studentA.token,{p_document_ids:docIDs}),'Accept current general terms and privacy');
const healthDoc=randomUUID(),hash='a'.repeat(64);
const args={p_conditions:{lactose_intolerance:'confirmed',sibo:'suspected',diabetes:'not_reported',celiac:'suspected',food_allergy:'not_reported',hypertension:'confirmed',dyslipidemia:'confirmed',fatty_liver:'suspected'},p_document_id:healthDoc,
 p_document_sha256:hash,p_expected_revision:0,p_processing_consent:true,p_share_with_coach:false};
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,args),'No approved current separate health document');
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_processing_consent:false}),'No processing consent');
bad(await rpc('efg_submit_coach_health_intake',null,args),'Anonymous cannot save');
bad(await rpc('efg_submit_coach_health_intake',u.coachA.token,args),'Coach cannot impersonate student');
sql("insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at) values ("+
 quote(healthDoc)+",'synthetic_health_v1','"+hash+"','"+ 'SYNTHETIC CONSENT FOR CI ONLY '.repeat(5) +
 "','published',now())");
const published=good(await rpc('efg_current_coach_health_document',u.studentA.token),'Read synthetic current separate consent');
assert.equal(published.id,healthDoc);
assert.equal(published.sha256,hash);
assert.equal(Number(good(await rpc('efg_submit_coach_health_intake',u.studentA.token,args),'Private health consent')),1);
const own=good(await rpc('efg_get_coach_health_intake',u.studentA.token,{p_student:u.studentA.id}),'Student reads own');
assert.deepEqual(own.conditions,args.p_conditions,'All eight optional codes survive private signed readback');
assert.equal(own.conditions.sibo,'suspected');
assert.equal(own.sibo_phase,'none','SIBO alone cannot enable FODMAP restriction');
assert.equal(own.shared_with_coach,false);
if(providerContract){
 assert.equal(own.organization_id,orgA);assert.equal(own.viewer_id,u.studentA.id);
 assert.equal(own.processing_consent,true);assert.equal(own.followup_consent,true);
 const denied=bad(await rpc('efg_get_coach_health_intake',null,{p_student:u.studentA.id}),'Anonymous lacks EXECUTE');
 assert.ok([401,403].includes(denied.status),'Expected HTTP authorization denial');
 assert.equal(denied.data.code,'42501','Expected PostgreSQL insufficient_privilege');
}
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Coach cannot read unshared clinical data'),null);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachB.token,{p_student:u.studentA.id}),'Other org cannot read clinical data'),null);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.studentB.token,{p_student:u.studentA.id}),'Other student cannot read clinical data'),null);
bad(await request('/rest/v1/efg_coach_health_intakes?select=*',{token:u.studentA.token}),'Private clinical table must be absent from public Data API');
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_expected_revision:1,p_conditions:{unreviewed_condition:'confirmed'}}),'Unsupported health flag');
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_expected_revision:0,p_share_with_coach:true}),'Old clinical revision');
assert.equal(Number(good(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_expected_revision:1,p_share_with_coach:true}),'Explicit separate coach clinical share')),2);
const coachA=good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Linked coach reads expressly shared condition');
assert.equal(coachA.shared_with_coach,true);
if(providerContract){
 assert.equal(coachA.organization_id,orgA);assert.equal(coachA.viewer_id,u.coachA.id);
 assert.equal(coachA.processing_consent,true);assert.equal(coachA.followup_consent,true);
 assert.equal(coachA.revision,2);
}
assert.equal(coachA.conditions.lactose_intolerance,'confirmed');
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachB.token,{p_student:u.studentA.id}),'Other org after share'),null);
sql('update public.efg_consents set accepted=false where student_id='+quote(u.studentA.id));
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Revoked Coach consent blocks clinical access'),null);
const retained=good(await rpc('efg_get_coach_health_intake',u.studentA.token,{p_student:u.studentA.id}),'Student retains private self read');
assert.equal(retained.revision,2);if(providerContract)assert.equal(retained.followup_consent,false);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachB.token,{p_student:u.studentA.id}),'Other org after revocation'),null);
bad(await rpc('efg_revoke_coach_health_intake',u.studentA.token,{p_expected_revision:1}),'Stale revocation');
assert.equal(good(await rpc('efg_revoke_coach_health_intake',u.studentA.token,{p_expected_revision:2}),'Owner erases health data'),true);
const erased=good(await rpc('efg_get_coach_health_intake',u.studentA.token,{p_student:u.studentA.id}),'Owner sees only nonclinical erasure marker');
assert.equal(erased.revoked,true);
assert.equal(erased.revision,3);
assert.deepEqual(erased.conditions,{});
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Coach cannot read erasure marker'),null);
assert.equal(Number(sql('select count(*) from efg_private.efg_coach_health_intakes where student_id='+quote(u.studentA.id))),0);
assert.equal(Number(sql('select last_revision from efg_private.efg_coach_health_revocations where student_id='+quote(u.studentA.id))),3);
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,args),'Stale consent cannot resurrect erased diagnoses');
assert.equal(Number(good(await rpc('efg_submit_coach_health_intake',u.studentA.token,{
 ...args,p_expected_revision:3,p_share_with_coach:false
}),'Fresh distinct processing consent may explicitly re-register')),4);
assert.equal(good(await rpc('efg_revoke_coach_health_intake',u.studentA.token,{p_expected_revision:4}),'Revoke newly registered data'),true);
assert.equal(Number(sql('select count(*) from efg_private.efg_coach_health_intakes where student_id='+quote(u.studentA.id))),0);
assert.equal(Number(sql('select last_revision from efg_private.efg_coach_health_revocations where student_id='+quote(u.studentA.id))),5);
bad(await rpc('efg_revoke_coach_health_intake',u.coachA.token,{p_expected_revision:4}),'Coach cannot erase student conditions');
console.log('PASS CLIN-GUT-03 REAL LOCAL JWT: 2 organizations, 4 GoTrue identities, terms/privacy + distinct health document, explicit processing/share, no anon or private API, revision conflicts, independent consent revocation and physical data deletion. NO hosted authorization or clinical sign-off.');

if(providerContract)console.log('PASS V5 private scope RPC: server org/viewer/consents, anon401-or-403/42501, orgB and revocation; local synthetic only.');
