// COACH-OPT-03: signed GoTrue JWT test on disposable Supabase ONLY.
// Tests that changing a receipt to sharing=false immediately revokes Coach
// SELECT on an already shared intake, without deleting the student's history.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const envText=readFileSync(process.env.EFG_LOCAL_STATUS_ENV||'','utf8');
const env=Object.fromEntries(envText.split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{
 const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];
}));
const url=env.API_URL,key=env.ANON_KEY||env.PUBLISHABLE_KEY;
assert.ok(url&&key,'Missing disposable Supabase status');
const parsed=new URL(url);
assert.equal(parsed.protocol,'http:');
assert.ok(['localhost','127.0.0.1'].includes(parsed.hostname));
assert.equal(parsed.port,'54321');
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const pg={...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres'};
function sql(query){
 const p=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c',query],{env:pg,encoding:'utf8',timeout:30000});
 assert.equal(p.status,0,(p.stderr||p.stdout||'local SQL failure').slice(0,750));
 return p.stdout.trim();
}
const qid=id=>{assert.match(id,/^[0-9a-f-]{36}$/i);return "'"+id+"'";};
async function request(path,{method='GET',token,body}={}){
 const r=await fetch(url+path,{method,headers:{apikey:key,'Content-Type':'application/json',
  Authorization:'Bearer '+(token||key)},body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(15000)});
 const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}
 return {ok:r.ok,status:r.status,data};
}
function yes(r,label){assert.equal(r.ok,true,label+': '+r.status+' '+JSON.stringify(r.data).slice(0,400));return r.data}
const rpc=(name,token,body)=>request('/rest/v1/rpc/'+name,{method:'POST',token,body});
const suffix=randomBytes(5).toString('hex'),password=randomBytes(16).toString('hex')+'!Ab3';
async function signup(role){
 const x=yes(await request('/auth/v1/signup',{method:'POST',body:{
  email:'coach-opt-03-'+role+'-'+suffix+'@example.invalid',password
 }}),role+' signup');
 assert.ok(x.access_token&&x.user?.id);
 return {id:x.user.id,token:x.access_token,email:x.user.email};
}
const coach=await signup('coach'),student=await signup('student'),outsider=await signup('outsider');
const org=randomUUID(),otherOrg=randomUUID();
sql('insert into public.efg_organizations(id,coach_id,name) values ('+
 qid(org)+','+qid(coach.id)+",'COACH OPT 03 synthetic'),("+
 qid(otherOrg)+','+qid(outsider.id)+",'COACH OPT 03 other')");
sql('insert into public.efg_profiles(user_id,email,nickname,role,organization_id) values ('+
 qid(coach.id)+",'"+coach.email+"','Coach OPT','coach',null),("+
 qid(student.id)+",'"+student.email+"','Student OPT','student',"+qid(org)+'),('+
 qid(outsider.id)+",'"+outsider.email+"','Other Coach','coach',null)");
sql('insert into public.efg_consents(student_id,organization_id,accepted) values ('+
 qid(student.id)+','+qid(org)+',true)');
const docs=yes(await rpc('efg_legal_current_status',student.token,{}),'legal status');
assert.equal(docs.length,2);
yes(await rpc('efg_accept_legal_documents',student.token,{
 p_document_ids:docs.map(d=>d.document_id)
}),'accept two separate synthetic documents');
const read=token=>request('/rest/v1/efg_coach_relaunch_intakes?select=student_id,revision,shared_at,completed_version',{token});
const receipt=async sharing=>yes(await rpc('efg_accept_pilot_participation',student.token,{
 p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:sharing
}),'independent pilot receipt '+sharing);
await receipt(true);
const body={p_completed_version:'coach_major_2026_r1',
 p_payload:{objective:'recomp',age_years:41,height_cm:174,weight_kg:80,
  activity_level:'moderate',dietary_pattern:'omnivore',notes:''},
 p_expected_revision:0,p_share_with_coach:true};
assert.equal(Number(yes(await rpc('efg_submit_coach_relaunch_intake',student.token,body),
 'initial explicit shared intake')),1);
// Local-only diagnostics distinguish missing receipt/consent from an RLS
// helper/role problem without logging user information or access tokens.
const localEvidence=sql('select (i.shared_at is not null)::text||\'|\'||coalesce(r.sharing_accepted::text,\'null\')||\'|\'||coalesce(c.accepted::text,\'null\')||\'|\'||(o.coach_id='+qid(coach.id)+')::text from public.efg_coach_relaunch_intakes i join public.efg_pilot_participation_receipts r on r.student_id=i.student_id and r.organization_id=i.organization_id join public.efg_consents c on c.student_id=i.student_id and c.organization_id=i.organization_id join public.efg_organizations o on o.id=i.organization_id where i.student_id='+qid(student.id));
assert.equal(localEvidence,'true|true|true|true','Local row, receipt, consent and coach relationship must be intact');
const firstCoachRead=yes(await read(coach.token),'coach initially sees shared intake');
assert.equal(firstCoachRead.length,1,'Coach RLS denied a shared row despite local consent/receipt: '+localEvidence);
assert.deepEqual(yes(await read(outsider.token),'other coach cannot read'),[]);
const before=sql('select revision::text||\'|\'||coalesce(shared_at::text,\'NULL\') from public.efg_coach_relaunch_intakes where student_id='+qid(student.id));
await receipt(false);
assert.deepEqual(yes(await read(coach.token),'opt-out instantly hides prior shared row'),[]);
const privateStatus=yes(await rpc('efg_coach_pilot_entry_status',student.token,{}),'private route after opt-out');
assert.equal(privateStatus.route,'private');
assert.equal(privateStatus.general_intake_shared,false);
assert.equal(privateStatus.can_log_meals,false);
assert.equal(yes(await read(student.token),'owner retains row').length,1);
assert.equal(sql('select revision::text||\'|\'||coalesce(shared_at::text,\'NULL\') from public.efg_coach_relaunch_intakes where student_id='+qid(student.id)),before,
 'Receipt opt-out must not silently mutate the saved intake or historical revision');
await receipt(true);
assert.equal(yes(await read(coach.token),'explicit re-opt-in restores policy visibility').length,1);
assert.equal(yes(await rpc('efg_revoke_pilot_participation',student.token,{
 p_version:'coach_pilot_2026_demo1'
}),'revoke participation'),true);
assert.deepEqual(yes(await read(coach.token),'revoked participation denies coach SELECT'),[]);
assert.equal(yes(await read(student.token),'owner still owns intake').length,1);
console.log('PASS COACH-OPT-03: signed local JWT opt-out immediately denies Coach SELECT; own revision/history retained. No hosted writes.');
