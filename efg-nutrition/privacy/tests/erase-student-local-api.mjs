// REAL local GoTrue, PostgREST and Storage APIs. Disposable CI stack only.
// No hosted Supabase credentials, production records, external SMTP or paid resources.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {eraseStudentAccount} from '../backend/erase-student.mjs';
assert.equal(process.env.NCC_ERASURE_LOCAL_ONLY,'1');
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.ok(!process.env.SUPABASE_ACCESS_TOKEN&&!process.env.SUPABASE_DB_PASSWORD);
assert.equal(process.env.PGHOST,'127.0.0.1');assert.equal(process.env.PGPORT,'54322');
const status=Object.fromEntries(readFileSync(process.env.NCC_ERASURE_LOCAL_STATUS,'utf8').split(/\r?\n/)
 .filter(x=>x.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const base=status.API_URL,anon=status.ANON_KEY,secret=status.SERVICE_ROLE_KEY;
const parsed=new URL(base);assert.ok(['127.0.0.1','localhost'].includes(parsed.hostname));assert.equal(parsed.port,'54321');assert.ok(anon&&secret);
function sql(command){
 const r=spawnSync('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',command],{encoding:'utf8'});
 if(r.status!==0)throw Error('Local QA SQL failed: '+r.stderr);return r.stdout.trim();
}
const q=x=>"'"+String(x).replace(/'/g,"''")+"'";
assert.equal(sql("select count(*) from auth.users"),'0','Must start with a fresh disposable stack');
async function call(path,{method='GET',body,token=secret,key=token===secret?secret:anon,raw}={}){
 const headers={apikey:key,Authorization:'Bearer '+token};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(raw!==undefined)headers['Content-Type']='text/plain';
 if(method==='POST'&&path.startsWith('/rest/'))headers.Prefer='return=representation';
 const r=await fetch(base+path,{method,headers,body:raw??(body===undefined?undefined:JSON.stringify(body)),signal:AbortSignal.timeout(25000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {ok:r.ok,status:r.status,data};
}
function yes(r,label){assert.ok(r.ok,label+' (HTTP '+r.status+')');return r.data;}
function sdkResult(r,user=false){return r.ok?{data:user?{user:r.data.user||r.data}:r.data,error:null}:{data:null,error:{status:r.status,code:r.data?.code||r.data?.error_code}};}
const service={
 async rpc(name,args){return sdkResult(await call('/rest/v1/rpc/'+name,{method:'POST',body:args}));},
 auth:{admin:{
  async updateUserById(id,body){return sdkResult(await call('/auth/v1/admin/users/'+id,{method:'PUT',body}),true);},
  async deleteUser(id,soft){return sdkResult(await call('/auth/v1/admin/users/'+id,{method:'DELETE',body:{should_soft_delete:soft}}),true);},
  async getUserById(id){return sdkResult(await call('/auth/v1/admin/users/'+id),true);}
 }},
 storage:{from(bucket){return {async remove(prefixes){return sdkResult(await call('/storage/v1/object/'+bucket,{method:'DELETE',body:{prefixes}}));}};}}
};
const password=randomBytes(24).toString('hex')+'!Qa7',suffix=randomBytes(5).toString('hex');
async function identity(label){
 const email='erasure-'+label+'-'+suffix+'@example.test';
 const created=yes(await call('/auth/v1/admin/users',{method:'POST',body:{email,password,email_confirm:true}}),'Create fictional local identity');
 const user=created.user||created;
 const auth=yes(await call('/auth/v1/token?grant_type=password',{method:'POST',token:anon,key:anon,body:{email,password}}),'Obtain real local signed JWT');
 assert.equal(auth.user.id,user.id);assert.ok(auth.access_token.split('.').length===3);
 return {id:user.id,email,token:auth.access_token};
}
const a=await identity('a'),b=await identity('b'),coach=await identity('coach');
const org=randomUUID(),legal=randomUUID();
function seed(table,attrs){sql('select qa.seed('+q(table)+','+q(JSON.stringify(attrs))+'::jsonb)');}
seed('efg_organizations',{id:org,coach_id:coach.id});
for(const user of [a,b,coach])seed('efg_profiles',{user_id:user.id,email:user.email,role:user===coach?'coach':'student',organization_id:org});
seed('efg_legal_documents',{id:legal});
const snapshot=JSON.parse(readFileSync(new URL('../../docs/play-store/deletion-metadata-20261113.json',import.meta.url),'utf8'));
const scope=yes(await call('/rest/v1/rpc/ncc_student_erasure_scopes',{method:'POST',body:{}}),'Read service-only scope');
for(const user of [a,b]){
 const goal=randomUUID();seed('efg_goals',{id:goal,student_id:user.id,approved_by:coach.id});
 for(const table of Object.keys(scope).filter(t=>!['efg_profiles','efg_goals','efg_notifications','efg_invitations','efg_organizations','efg_payments'].includes(t))){
  const attrs={};
  for(const fk of snapshot.foreign_keys.filter(f=>f.source_table===table)){
   const column=fk.definition.split('(')[1].split(')')[0];
   attrs[column]=fk.target_table==='efg_profiles'?user.id:fk.target_table==='auth.users'?(column==='user_id'||column==='student_id'?user.id:coach.id):fk.target_table==='efg_organizations'?org:fk.target_table==='efg_goals'?goal:legal;
  }
  seed(table,attrs);
 }
 seed('efg_invitations',{email:user.email,claimed_by:user.id,invited_by:coach.id,organization_id:org});
 seed('efg_notifications',{recipient_id:coach.id,actor_id:coach.id,target_student:user.id});
}
yes(await call('/storage/v1/bucket',{method:'POST',body:{id:'ncc-erasure-test',name:'ncc-erasure-test',public:false}}),'Create local private bucket');
async function upload(user,name='sample.txt'){
 return call('/storage/v1/object/ncc-erasure-test/'+user.id+'/'+name,{method:'POST',token:user.token,raw:new TextEncoder().encode('fictional local erasure file')});
}
yes(await upload(a),'Upload target file through real Storage API');yes(await upload(b),'Upload control file through real Storage API');
assert.equal(sql('select count(*) from storage.objects where owner_id='+q(a.id)),'1');
assert.equal((await call('/rest/v1/ncc_account_deletion_requests',{method:'POST',token:b.token,body:{user_id:a.id,source:'privacy_web'}})).ok,false,'B must not request deletion of A');
const requestRows=yes(await call('/rest/v1/ncc_account_deletion_requests?select=id',{method:'POST',token:a.token,body:{user_id:a.id,source:'privacy_web'}}),'Target initiates own request using real JWT');
const requestId=requestRows[0].id;
assert.equal((await call('/rest/v1/rpc/ncc_prepare_student_erasure',{method:'POST',token:b.token,body:{p_request_id:requestId}})).ok,false,'Browser must not invoke service deletion');
yes(await call('/rest/v1/rpc/ncc_prepare_student_erasure',{method:'POST',body:{p_request_id:requestId}}),'Prepare verified service operation');
assert.equal((await upload(a,'during-processing.txt')).ok,false,'Old A JWT must not add files while processing');
yes(await upload(b,'control-during-processing.txt'),'Control account remains writable');
assert.equal((await call('/rest/v1/efg_daily_logs',{method:'POST',token:a.token,body:{student_id:a.id}})).ok,false,'Old A JWT must not add diary rows');
const result=await eraseStudentAccount(service,{requestId});assert.equal(result.accountRemoved,true);
assert.equal((await call('/auth/v1/admin/users/'+a.id)).status,404,'Real Auth user is gone');
assert.equal(sql('select count(*) from storage.objects where owner_id='+q(a.id)),'0');
assert.equal(sql('select count(*) from public.efg_profiles where user_id='+q(a.id)),'0');
assert.equal(sql('select count(*) from public.ncc_account_deletion_requests where user_id='+q(a.id)),'0');
assert.equal((await call('/storage/v1/object/authenticated/ncc-erasure-test/'+a.id+'/sample.txt')).ok,false,'Deleted file is no longer downloadable');
assert.equal((await upload(a,'after-auth-delete.txt')).ok,false,'Old signed JWT must not recreate files after Auth deletion');
assert.equal((await call('/rest/v1/efg_daily_logs',{method:'POST',token:a.token,body:{student_id:a.id}})).ok,false,'Old JWT must not recreate personal rows');
yes(await call('/auth/v1/user',{token:b.token}),'Other student still authenticates');
yes(await call('/auth/v1/user',{token:coach.token}),'Coach still authenticates');
yes(await call('/storage/v1/object/authenticated/ncc-erasure-test/'+b.id+'/sample.txt'),'Other student file remains downloadable');
yes(await upload(b,'after-target-delete.txt'),'Other student can still upload');
assert.equal(sql('select count(*) from public.efg_messages where student_id='+q(b.id)),'1');
assert.equal(sql('select count(*) from public.efg_organizations where coach_id='+q(coach.id)),'1');
console.log('PASS: real LOCAL Auth + Storage + PostgREST deletion; target removed; old JWT cannot recreate files/data; control student and coach preserved. No hosted access, no external email, no production records.');
