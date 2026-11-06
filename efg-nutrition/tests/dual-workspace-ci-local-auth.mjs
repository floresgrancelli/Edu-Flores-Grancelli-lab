// ONLY a fresh unlinked Supabase CLI stack on numeric loopback.
// Real local GoTrue JWT/PostgREST, but synthetic schema, users and test-only RLS.
// No production parity, hosted policy, real consent or UI integration claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {bootstrapSql,fixtureRlsSql,fixtureGrantsSql,candidateEndpoints} from './dual-workspace-ci-fixture.mjs';
import {parseLocalStatus,requireDisposableEnvironment} from './dual-workspace-ci-guards.mjs';

requireDisposableEnvironment(process.env);
assert.ok(process.env.NCC_LOCAL_STATUS_ENV,'Local CLI status file required');
const {base,key}=parseLocalStatus(readFileSync(process.env.NCC_LOCAL_STATUS_ENV,'utf8'));
// Never inherit arbitrary PostgreSQL targets, service files or startup settings.
const pgEnv={PATH:process.env.PATH,LANG:'C.UTF-8',PGHOST:'127.0.0.1',PGPORT:'54322',
 PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres',PGCONNECT_TIMEOUT:'5',
 PGOPTIONS:'-c statement_timeout=15000 -c lock_timeout=12000'};
const psqlArgs=['-X','-q','-A','-t','-v','ON_ERROR_STOP=1'];
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
const uuid=value=>{assert.match(value,/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);return literal(value);};
function sql(query){
 const result=spawnSync('psql',psqlArgs,{input:query,env:pgEnv,encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
 if(result.status!==0)throw new Error('Local synthetic SQL failed: '+(result.stderr||result.error?.message||'unknown').slice(0,800));
 return result.stdout.trim();
}
function psqlSession(query,applicationName,keepOpen=false){
 const process=spawn('psql',psqlArgs,{env:{...pgEnv,PGAPPNAME:applicationName},stdio:['pipe','pipe','pipe']});
 let out='',err='',settled=false;
 const done=new Promise((resolve,reject)=>{
  process.stdout.on('data',chunk=>{out+=chunk;});process.stderr.on('data',chunk=>{err+=chunk;});
  process.on('error',reject);process.on('close',code=>{settled=true;resolve({code,out,err});});
 });
 done.catch(()=>{});
 const timer=setTimeout(()=>process.kill('SIGKILL'),25000);done.finally(()=>clearTimeout(timer)).catch(()=>{});
 process.stdin.on('error',()=>{});process.stdin.write(query+'\n');if(!keepOpen)process.stdin.end();
 return {done,process,output:()=>out,isSettled:()=>settled};
}
async function until(predicate,label){
 for(let i=0;i<70;i++){if(await predicate())return;await delay(100);}
 throw new Error('Timed out: '+label);
}
async function call(path,{method='GET',token,body}={}){
 assert.match(path,/^\/(auth|rest)\/v1\//);
 const response=await fetch(base+path,{method,redirect:'error',
  headers:{apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 let data=null;const text=await response.text();try{data=text?JSON.parse(text):null;}catch{data=null;}
 return {ok:response.ok,status:response.status,data};
}
// Do not print response bodies from Auth: they can contain ephemeral tokens.
const ok=(result,label)=>{assert.equal(result.ok,true,label+' HTTP '+result.status);return result.data;};
const denied=(result,label)=>assert.equal(result.ok,false,label+' unexpectedly permitted');
const rpc=(name,user,body)=>call('/rest/v1/rpc/'+name,{method:'POST',token:user?.token,body});
const suffix=randomBytes(5).toString('hex');
async function signup(name){
 const email=`dual-${name}-${suffix}@example.invalid`,password=randomBytes(28).toString('base64url')+'!aA2';
 const session=ok(await call('/auth/v1/signup',{method:'POST',body:{email,password}}),'Local signup '+name);
 assert.ok(session.access_token&&session.user?.id,'Local auto-confirmed synthetic signup required');
 const user=ok(await call('/auth/v1/user',{token:session.access_token}),'GoTrue user '+name);
 assert.equal(user.id,session.user.id);assert.equal(user.email,email);
 return {id:user.id,email,token:session.access_token};
}
assert.equal(sql('select count(*) from auth.users;'),'0','Must start with ZERO Auth users');
assert.equal(sql("select to_regclass('public.efg_profiles') is null;"),'t','Must start with EMPTY application schema');
sql(bootstrapSql);
const users={};for(const name of ['admin','mentor','learner','other','pupil','foreign'])users[name]=await signup(name);
const original='00000000-0000-4000-8000-000000000101',foreignOrg='00000000-0000-4000-8000-000000000102';
sql(`insert into efg_organizations(id,name,coach_id,seat_limit,status,is_test) values
 (${uuid(original)},'Original DEMO',${uuid(users.mentor.id)},10,'trial',true),
 (${uuid(foreignOrg)},'Foreign DEMO',${uuid(users.other.id)},10,'trial',true);`);
for(const [name,role,org] of [['admin','admin',null],['mentor','coach',null],['learner','student',original],['other','coach',null],['foreign','student',foreignOrg]]){
 const u=users[name];sql(`insert into efg_profiles(user_id,email,nickname,role,organization_id) values
 (${uuid(u.id)},${literal(u.email)},${literal(name+' DEMO')},${literal(role)},${org?uuid(org):'null'});`);
}
sql(`insert into efg_consents values(${uuid(users.learner.id)},${uuid(original)},true),(${uuid(users.foreign.id)},${uuid(foreignOrg)},true);
 insert into efg_daily_logs values(${uuid(users.learner.id)},'SYNTHETIC PERSONAL HISTORY'),(${uuid(users.foreign.id)},'SYNTHETIC FOREIGN HISTORY');`);
const originalBefore=sql(`select row_to_json(p) from efg_profiles p where user_id=${uuid(users.learner.id)};`);
const migration=readFileSync(new URL('../proposed/20261106_dual_workspace_STAGING_ONLY_NOT_APPLIED.sql',import.meta.url),'utf8');
sql("set ncc.dual_workspace_fixture='synthetic-v1';\n"+migration);
for(const endpoint of candidateEndpoints)for(const role of ['anon','authenticated']){
 assert.equal(sql(`select has_function_privilege(${literal(role)},${literal('public.'+endpoint)},'EXECUTE');`),'f','Proposal must remain ungranted before test overlay');
}
console.log('PASS proposal keeps all candidate RPCs ungranted before TEST-ONLY overlay.');
sql(fixtureRlsSql+fixtureGrantsSql+"\nnotify pgrst,'reload schema';");
await until(async()=>{
 const result=await rpc('ncc_dual_workspace_contexts_v1',users.admin,{});
 return result.ok;
},'PostgREST schema refresh');
const created=ok(await rpc('ncc_pilot_workspace_create_v1',users.admin,{p_email:users.learner.email,p_name:'Dual Coach DEMO',p_seats:2,p_request_id:randomUUID()}),'Admin adds second workspace');
const org=created.organization_id;assert.equal(created.student_link_preserved,true);
assert.equal(sql(`select row_to_json(p) from efg_profiles p where user_id=${uuid(users.learner.id)};`),originalBefore);
assert.equal(sql(`select accepted from efg_consents where student_id=${uuid(users.learner.id)};`),'t');
denied(await rpc('ncc_pilot_workspace_roster_v1',users.learner,{p_org:org}),'No professional terms');
ok(await rpc('ncc_pilot_workspace_accept_terms_v1',users.learner,{p_org:org,p_terms_version:'synthetic-terms-v1',p_privacy_version:'synthetic-privacy-v1',p_request_id:randomUUID()}),'Fictitious professional acceptance');
sql(`insert into efg_profiles(user_id,email,nickname,role,organization_id) values
 (${uuid(users.pupil.id)},${literal(users.pupil.email)},'Pupil DEMO','student',${uuid(org)});
 insert into efg_consents values(${uuid(users.pupil.id)},${uuid(org)},true);
 insert into efg_daily_logs values(${uuid(users.pupil.id)},'SYNTHETIC PROFESSIONAL HISTORY');`);
const read=user=>call('/rest/v1/efg_daily_logs?select=student_id&order=student_id',{token:user.token});
const reads=async user=>ok(await read(user),'RLS read').map(row=>row.student_id).sort();
assert.deepEqual(await reads(users.learner),[users.learner.id,users.pupil.id].sort());
assert.deepEqual(await reads(users.mentor),[users.learner.id]);
assert.deepEqual(await reads(users.other),[users.foreign.id]);
assert.deepEqual(await reads(users.admin),[]);
assert.deepEqual(await reads(users.pupil),[users.pupil.id]);
const contexts=ok(await rpc('ncc_dual_workspace_contexts_v1',users.learner,{}),'Dual contexts');
assert.equal(contexts.profile_role,'student');assert.equal(contexts.student_context.organization_id,original);
assert.equal(contexts.coach_contexts[0].id,org);
denied(await rpc('ncc_pilot_workspace_roster_v1',users.other,{p_org:org}),'Foreign coach roster');
denied(await rpc('ncc_pilot_workspace_set_seats_v1',users.learner,{p_org:org,p_seats:10,p_request_id:randomUUID()}),'Student cannot elevate capacity');
denied(await rpc('ncc_dual_workspace_contexts_v1',null,{}),'Anon cannot query workspace');
denied(await call('/rest/v1/efg_profiles?user_id=eq.'+users.learner.id,{method:'PATCH',token:users.learner.token,body:{role:'admin'}}),'Cannot promote own profile');
const tampered=users.learner.token.split('.');tampered[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(tampered[1],'base64url')),sub:users.admin.id})).toString('base64url');
denied(await call('/rest/v1/rpc/ncc_dual_workspace_contexts_v1',{method:'POST',token:tampered.join('.'),body:{}}),'Tampered signed JWT');
console.log('PASS local GoTrue/PostgREST signed JWT: A/B RLS, original relationship, roles, anonymous and tampered-token denial.');

// PSQL sessions below intentionally set local claims for transaction mechanics.
// JWT validation evidence is the real HTTP/PostgREST tests above, not this bridge.
const actorSql=`select set_config('request.jwt.claim.sub',${uuid(users.learner.id)},true);
 select set_config('request.jwt.claims',${literal(JSON.stringify({sub:users.learner.id,role:'authenticated'}))},true);set local role authenticated;`;
const inviteSql=(email,id)=>`select ncc_pilot_workspace_invite_student_v1(${uuid(org)},${literal(email)},'Pupil DEMO',${uuid(id)});`;
async function contended(firstCall,secondCall,expectSuccess){
 const first=psqlSession(`begin;${actorSql}${firstCall}select 'NCC_BACKEND:'||pg_backend_pid();select 'NCC_READY';`,'ncc_dual_holder',true);
 let second;
 try{
  await until(()=>{assert.equal(first.isSettled(),false,'Holder exited before lock');return first.output().includes('NCC_READY');},'first transaction lock');
  const holder=Number(first.output().match(/NCC_BACKEND:(\d+)/)?.[1]);assert.ok(holder>0);
  second=psqlSession(`begin;${actorSql}${secondCall}commit;`,'ncc_dual_contender');
  await until(()=>sql("select count(*) from pg_stat_activity where application_name='ncc_dual_contender' and wait_event_type='Lock';")==='1','second backend demonstrably waits on lock');
  const contender=Number(sql("select pid from pg_stat_activity where application_name='ncc_dual_contender';"));
  assert.notEqual(contender,holder,'Two distinct PostgreSQL backends');
  first.process.stdin.end('commit;\n');
  const [a,b]=await Promise.all([first.done,second.done]);assert.equal(a.code,0,'First transaction commits');
  assert.equal(b.code===0,expectSuccess,'Contender outcome');
  return {a,b};
 }finally{
  if(!first.isSettled())first.process.kill('SIGTERM');
  if(second&&!second.isSettled())second.process.kill('SIGTERM');
 }
}
const race=await contended(inviteSql(`seat-a-${suffix}@example.invalid`,randomUUID()),inviteSql(`seat-b-${suffix}@example.invalid`,randomUUID()),false);
assert.match(race.b.err,/Pilot seats exhausted/);
assert.equal(sql(`select count(*) from efg_invitations where organization_id=${uuid(org)};`),'1');
assert.equal(sql(`select count(*) from efg_private.ncc_workspace_receipts_v1 where actor_id=${uuid(users.learner.id)} and operation='invite';`),'1');
ok(await rpc('ncc_pilot_workspace_set_seats_v1',users.admin,{p_org:org,p_seats:4,p_request_id:randomUUID()}),'Admin raises fixture capacity');
const sameId=randomUUID(),sameCall=inviteSql(`retry-${suffix}@example.invalid`,sameId);
const duplicate=await contended(sameCall,sameCall,true);
const jsonResult=out=>{
 const values=out.split('\n').filter(line=>line.trim().startsWith('{')).map(line=>JSON.parse(line));
 const result=values.find(value=>value.invitation_id&&value.organization_id);
 assert.ok(result,'Expected invitation RPC result, not the synthetic claims row');return result;
};
assert.deepEqual(jsonResult(duplicate.a.out),jsonResult(duplicate.b.out));
assert.equal(sql(`select count(*) from efg_private.ncc_workspace_receipts_v1 where actor_id=${uuid(users.learner.id)} and request_id=${uuid(sameId)};`),'1');
assert.equal(sql(`select count(*) from efg_invitations where organization_id=${uuid(org)};`),'2');
console.log('PASS PostgreSQL multisesion: observed lock wait on distinct backends; last seat atomic; concurrent duplicate has one invitation and one receipt.');

sql(`update efg_consents set accepted=false where student_id=${uuid(users.pupil.id)};`);
assert.deepEqual(await reads(users.learner),[users.learner.id]);
sql(`update efg_consents set accepted=true where student_id=${uuid(users.pupil.id)};
 update efg_private.ncc_coach_capabilities_v1 set active=false where user_id=${uuid(users.learner.id)};`);
assert.deepEqual(await reads(users.learner),[users.learner.id]);
assert.deepEqual(await reads(users.mentor),[users.learner.id]);
denied(await rpc('ncc_pilot_workspace_roster_v1',users.learner,{p_org:org}),'Revoked capability blocks roster');
sql(`update efg_profiles set active=false where user_id=${uuid(users.learner.id)};`);
assert.deepEqual(await reads(users.learner),[]);
console.log('PASS local signed JWT/RLS revocation: consent, professional capability, inactive identity; original coach relationship preserved.');
console.log('LIMIT: test-only schema/RLS and synthetic users. No hosted authorization, full-app integration, OTP/email delivery, production deployment or physical devices.');
