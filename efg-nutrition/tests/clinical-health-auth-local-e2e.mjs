// CLIN-GUT-03 · REAL signed GoTrue JWT through DISPOSABLE LOCAL Supabase only.
// Synthetic health consent document and fictional organizations/users, never hosted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
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
const args={p_conditions:{lactose_intolerance:'confirmed',sibo:'suspected'},p_document_id:healthDoc,
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
assert.equal(own.conditions.sibo,'suspected');
assert.equal(own.sibo_phase,'none','SIBO alone cannot enable FODMAP restriction');
assert.equal(own.shared_with_coach,false);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Coach cannot read unshared clinical data'),null);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachB.token,{p_student:u.studentA.id}),'Other org cannot read clinical data'),null);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.studentB.token,{p_student:u.studentA.id}),'Other student cannot read clinical data'),null);
bad(await request('/rest/v1/efg_coach_health_intakes?select=*',{token:u.studentA.token}),'Private clinical table must be absent from public Data API');
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_expected_revision:1,p_conditions:{unreviewed_condition:'confirmed'}}),'Unsupported health flag');
bad(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_expected_revision:0,p_share_with_coach:true}),'Old clinical revision');
assert.equal(Number(good(await rpc('efg_submit_coach_health_intake',u.studentA.token,{...args,p_expected_revision:1,p_share_with_coach:true}),'Explicit separate coach clinical share')),2);
const coachA=good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Linked coach reads expressly shared condition');
assert.equal(coachA.shared_with_coach,true);
assert.equal(coachA.conditions.lactose_intolerance,'confirmed');
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachB.token,{p_student:u.studentA.id}),'Other org after share'),null);
sql('update public.efg_consents set accepted=false where student_id='+quote(u.studentA.id));
assert.equal(good(await rpc('efg_get_coach_health_intake',u.coachA.token,{p_student:u.studentA.id}),'Revoked Coach consent blocks clinical access'),null);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.studentA.token,{p_student:u.studentA.id}),'Student retains private self read').revision,2);
bad(await rpc('efg_revoke_coach_health_intake',u.studentA.token,{p_expected_revision:1}),'Stale revocation');
assert.equal(good(await rpc('efg_revoke_coach_health_intake',u.studentA.token,{p_expected_revision:2}),'Owner erases health data'),true);
assert.equal(good(await rpc('efg_get_coach_health_intake',u.studentA.token,{p_student:u.studentA.id}),'Owner no longer sees deleted condition'),null);
assert.equal(Number(sql('select count(*) from efg_private.efg_coach_health_intakes where student_id='+quote(u.studentA.id))),0);
bad(await rpc('efg_revoke_coach_health_intake',u.coachA.token,{p_expected_revision:2}),'Coach cannot erase student conditions');
console.log('PASS CLIN-GUT-03 REAL LOCAL JWT: 2 organizations, 4 GoTrue identities, terms/privacy + distinct health document, explicit processing/share, no anon or private API, revision conflicts, independent consent revocation and physical data deletion. NO hosted authorization or clinical sign-off.');
