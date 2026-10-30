// BRAND77B real GoTrue-signed JWT against disposable LOCAL Supabase only.
// No hosted project URL, real user or medical intake.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {randomBytes} from "node:crypto";
const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV||"","utf8")
 .split(/\r?\n/).filter(x=>x.includes("=")).map(x=>{const i=x.indexOf("=");return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}));
const base=env.API_URL,key=env.ANON_KEY||env.PUBLISHABLE_KEY;
assert.ok(base&&key);
const u=new URL(base);assert.equal(u.protocol,"http:");assert.equal(u.hostname,"127.0.0.1");assert.equal(u.port,"54321");
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const pg={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGUSER:"postgres",PGPASSWORD:"postgres",PGDATABASE:"postgres"};
const sql=q=>{
 const r=spawnSync("psql",["-X","-Atq","-v","ON_ERROR_STOP=1","-c",q],{env:pg,encoding:"utf8",timeout:30000});
 assert.equal(r.status,0,(r.stderr||r.stdout).slice(0,750));return r.stdout.trim();
};
const quote=id=>{assert.match(id,/^[a-f0-9-]{36}$/i);return "'"+id+"'"};
async function request(path,{method="GET",token=null,body}={}){
 const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:"Bearer "+(token||key),
  "Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const t=await r.text();let data=t;try{data=t?JSON.parse(t):null}catch{}
 return {ok:r.ok,status:r.status,data};
}
const good=(r,label)=>{assert.equal(r.ok,true,label+" HTTP "+r.status+" "+JSON.stringify(r.data).slice(0,260));return r.data};
const bad=(r,label)=>assert.equal(r.ok,false,label+" unexpectedly succeeded");
const nonce=randomBytes(4).toString("hex"),pw=randomBytes(16).toString("hex")+"!Ab6";
async function signup(role){
 const email="brand77-"+role+"-"+nonce+"@example.invalid";
 const a=good(await request("/auth/v1/signup",{method:"POST",body:{email,password:pw}}),"GoTrue signup "+role);
 assert.equal(a.access_token?.split(".").length,3);
 assert.equal(good(await request("/auth/v1/user",{token:a.access_token}),"JWT identity").id,a.user.id);
 return {id:a.user.id,token:a.access_token,email};
}
const people={};for(const role of ["studentA","studentB","coach","admin"])people[role]=await signup(role);
for(const role of Object.keys(people)){
 const person=people[role];
 const appRole=role.startsWith("student")?"student":role;
 sql("insert into public.efg_profiles(user_id,email,nickname,role,organization_id) values("+
  quote(person.id)+",'"+person.email+"','BRAND77 "+role+"','"+appRole+"',null)");
}
const version="con_ciencia_2026_r1";
const read=person=>request("/rest/v1/efg_science_intro_receipts?select=user_id,version,seen_at,action",{token:person?.token});
const rpc=(person,action,ver=version)=>request("/rest/v1/rpc/efg_ack_science_intro",{method:"POST",token:person?.token,body:{p_version:ver,p_action:action}});
bad(await rpc(null,"completed"),"anon RPC");
bad(await rpc(people.admin,"completed"),"admin must not receive education intro");
bad(await rpc(people.studentA,"opened"),"only explicit completed/skipped");
bad(await rpc(people.studentA,"completed","forged_version"),"only approved intro revision");
assert.deepEqual(good(await read(people.studentA),"student initial read"),[]);
assert.equal(good(await rpc(people.studentA,"completed"),"student completes"),true);
const studentData=good(await read(people.studentA),"student receipt");
assert.equal(studentData.length,1);assert.equal(studentData[0].user_id,people.studentA.id);
assert.equal(studentData[0].version,version);assert.equal(studentData[0].action,"completed");
assert.ok(!Number.isNaN(Date.parse(studentData[0].seen_at)));
assert.deepEqual(good(await read(people.studentB),"other student cannot see receipt"),[]);
assert.deepEqual(good(await read(people.coach),"coach cannot see student receipt"),[]);
assert.deepEqual(good(await read(people.admin),"admin cannot read student receipt"),[]);
assert.equal(good(await rpc(people.studentA,"skipped"),"idempotent repeat"),true);
assert.equal(good(await read(people.studentA),"original retained")[0].action,"completed");
assert.equal(good(await rpc(people.studentB,"skipped"),"student B skips"),true);
assert.equal(good(await rpc(people.coach,"completed"),"coach completes"),true);
const coachRows=good(await read(people.coach),"coach own");
assert.equal(coachRows.length,1);assert.equal(coachRows[0].action,"completed");
bad(await request("/rest/v1/efg_science_intro_receipts",{method:"POST",token:people.studentA.token,body:{user_id:people.studentB.id,version,action:"completed"}}),"direct client insert");
bad(await request("/rest/v1/efg_science_intro_receipts?user_id=eq."+people.studentA.id,{method:"DELETE",token:people.studentA.token}),"direct client delete");
sql("update public.efg_profiles set active=false where user_id="+quote(people.studentB.id));
bad(await rpc(people.studentB,"completed"),"inactive profile denied");
assert.equal(Number(sql("select count(*) from public.efg_science_intro_receipts")),3);
console.log("PASS BRAND77B local signed JWT: student A/B, coach, admin/anon, single-view receipt, cross-user RLS, idempotency and no direct writes. LOCAL ONLY.");
