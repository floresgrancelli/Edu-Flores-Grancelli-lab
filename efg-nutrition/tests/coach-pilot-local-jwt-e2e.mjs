// COACH-PILOT-10: signed GoTrue JWTs and local PostgREST only.
// Uses synthetic IDs; never contacts hosted Supabase or modifies real Carla.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';

const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV||'','utf8')
 .split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{
  const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];
 }));
const base=env.API_URL, key=env.ANON_KEY||env.PUBLISHABLE_KEY;
assert.ok(base&&key);
const origin=new URL(base);
assert.equal(origin.protocol,'http:');
assert.ok(['127.0.0.1','localhost'].includes(origin.hostname));
assert.equal(origin.port,'54321');
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const pg={...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres'};
const quote=x=>{assert.match(x,/^[0-9a-f-]{36}$/i);return "'"+x+"'";};
function sql(query){
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c',query],{env:pg,encoding:'utf8',timeout:30000});
 assert.equal(r.status,0,(r.stderr||r.stdout||'Local SQL error').slice(0,1400));
 return r.stdout.trim();
}
async function request(path,{method='GET',token=null,body}={}){
 const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:'Bearer '+(token||key),
  'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(15000)});
 const raw=await r.text();let data=raw;try{data=raw?JSON.parse(raw):null}catch{}
 return {ok:r.ok,status:r.status,data};
}
function success(r,label){assert.equal(r.ok,true,label+' '+r.status+' '+JSON.stringify(r.data).slice(0,350));return r.data;}
function denied(r,label){assert.equal(r.ok,false,label+' should fail');}
const rpc=(name,token,body)=>request('/rest/v1/rpc/'+name,{method:'POST',token,body});
const suffix=randomBytes(5).toString('hex'),password=randomBytes(17).toString('hex')+'!Aa8';
async function signup(name){
 const user=success(await request('/auth/v1/signup',{method:'POST',body:{
  email:'pilot10-'+name+'-'+suffix+'@example.invalid',password
 }}),'GoTrue signup '+name);
 assert.ok(user.access_token&&user.user?.id);
 assert.equal(success(await request('/auth/v1/user',{token:user.access_token}),'Signed identity').id,user.user.id);
 return {id:user.user.id,email:user.user.email,token:user.access_token};
}
const u={};
for(const name of ['admin','priorCoach','carlaDemo','otherCoach','outsider']) u[name]=await signup(name);
const orgA=randomUUID(),orgB=randomUUID();
sql("insert into public.efg_organizations(id,coach_id,name,seat_limit,status,is_test) values ("+
 quote(orgA)+","+quote(u.priorCoach.id)+",'Previous fictional practice',5,'trial',true),("+
 quote(orgB)+","+quote(u.otherCoach.id)+",'Other fictional organization',5,'trial',true)");
sql("insert into public.efg_profiles(user_id,email,nickname,organization_id,role,active) values "+
 "("+quote(u.admin.id)+",'"+u.admin.email+"','EFG Admin',null,'admin',true),"+
 "("+quote(u.priorCoach.id)+",'"+u.priorCoach.email+"','Former Coach',null,'coach',true),"+
 "("+quote(u.carlaDemo.id)+",'"+u.carlaDemo.email+"','Carla DEMO',"+quote(orgA)+",'student',true),"+
 "("+quote(u.otherCoach.id)+",'"+u.otherCoach.email+"','Other Coach',null,'coach',true),"+
 "("+quote(u.outsider.id)+",'"+u.outsider.email+"','Outside Student',"+quote(orgB)+",'student',true)");
sql("insert into public.efg_consents(student_id,organization_id,accepted) values ("+
 quote(u.carlaDemo.id)+","+quote(orgA)+",true),("+quote(u.outsider.id)+","+quote(orgB)+",true)");
const day='2026-10-29';
sql("insert into public.efg_daily_logs(student_id,log_day,meals) values ("+
 quote(u.carlaDemo.id)+",'"+day+"','{\"desayuno\":[{\"id\":\"egg\",\"qty\":2}]}')");
const before=success(await request('/rest/v1/efg_daily_logs?select=student_id,meals&log_day=eq.'+day,{
 token:u.carlaDemo.token}),'Prepromotion own diary');
assert.equal(before.length,1);
assert.equal(before[0].meals.desayuno[0].qty,2);
denied(await rpc('efg_promote_existing_student_to_pilot_coach',null,{p_email:u.carlaDemo.email}),'Anonymous promotion');
denied(await rpc('efg_promote_existing_student_to_pilot_coach',u.carlaDemo.token,{p_email:u.carlaDemo.email}),'Self promotion');
denied(await rpc('efg_promote_existing_student_to_pilot_coach',u.priorCoach.token,{p_email:u.carlaDemo.email}),'Former coach promotion');
denied(await rpc('efg_promote_existing_student_to_pilot_coach',u.otherCoach.token,{p_email:u.carlaDemo.email}),'Other coach promotion');
denied(await rpc('efg_promote_existing_student_to_pilot_coach',u.admin.token,{p_email:u.outsider.email+'x'}),'Wrong confirmed email');
const pilot=success(await rpc('efg_promote_existing_student_to_pilot_coach',u.admin.token,{
 p_email:u.carlaDemo.email}),'Admin EFG promotion using signed JWT');
assert.match(pilot,/^[0-9a-f-]{36}$/i);
assert.equal(sql("select role from public.efg_profiles where user_id="+quote(u.carlaDemo.id)),'coach');
assert.equal(sql("select organization_id is null from public.efg_profiles where user_id="+quote(u.carlaDemo.id)),'t');
assert.equal(sql("select count(*) from public.efg_organizations where id="+quote(pilot)+
 " and coach_id="+quote(u.carlaDemo.id)+" and seat_limit=10 and is_test and status='trial' and license_fee_ars is null"),'1');
assert.equal(sql("select count(*) from efg_private.efg_pilot_promotions where user_id="+quote(u.carlaDemo.id)+
 " and previous_org_id="+quote(orgA)+" and pilot_org_id="+quote(pilot)+
 " and promoted_by="+quote(u.admin.id)),'1');
assert.equal(sql("select count(*) from public.efg_consents where student_id="+quote(u.carlaDemo.id)+
 " and accepted"),'1','Existing consent row preserved, never converted into new students consent');
const after=success(await request('/rest/v1/efg_daily_logs?select=student_id,meals&log_day=eq.'+day,{
 token:u.carlaDemo.token}),'Coach remains owner of historical MI DIA');
assert.equal(after.length,1);
assert.equal(after[0].meals.desayuno[0].qty,2);
const other=success(await request('/rest/v1/efg_daily_logs?select=student_id&log_day=eq.'+day,{
 token:u.outsider.token}),'Other org diary isolation');
assert.deepEqual(other,[]);
denied(await rpc('efg_promote_existing_student_to_pilot_coach',u.admin.token,{p_email:u.carlaDemo.email}),'Double promotion');
for(let i=1;i<=10;i++){
 const invited=success(await rpc('efg_invite_student',u.carlaDemo.token,{
  p_email:'piloted-'+i+'-'+suffix+'@example.invalid',p_name:'Fictional Student '+i
 }),'Invitation '+i);
 assert.match(invited,/^[0-9a-f-]{36}$/i);
}
const eleventh=await rpc('efg_invite_student',u.carlaDemo.token,{
 p_email:'piloted-11-'+suffix+'@example.invalid',p_name:'Eleventh Student'
});
denied(eleventh,'Eleventh pending invitation');
assert.equal(eleventh.data?.code,'23514');
assert.equal(sql('select count(*) from public.efg_invitations where organization_id='+quote(pilot)+
 " and claimed_by is null and revoked_at is null"),'10');
denied(await rpc('efg_invite_student',u.admin.token,{
 p_email:'admin-invite-'+suffix+'@example.invalid',p_name:'Should fail'}),'Admin cannot use coach trial seats');
assert.equal(sql("select count(*) from public.efg_invitations where organization_id="+quote(pilot)),'10');
console.log('PASS COACH-PILOT-10: GoTrue-signed local JWT admin-only promotion, same UID/diary, cross-org denial, 10 pending seats, 11th blocked. Local facsimile only; hosted/staging restore remains NO GO.');
