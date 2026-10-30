// COACH-RELAUNCH · isolated LOCAL Supabase signed JWT test. Never hosted.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomBytes,randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
const raw=readFileSync(process.env.EFG_LOCAL_STATUS_ENV||"","utf8");
const env=Object.fromEntries(raw.split(/\r?\n/).filter(x=>x.includes("=")).map(x=>{
 const k=x.indexOf("=");return [x.slice(0,k),x.slice(k+1).trim().replace(/^['"]|['"]$/g,"")];
}));
const url=env.API_URL,key=env.ANON_KEY||env.PUBLISHABLE_KEY;
assert.ok(url&&key);
const parsed=new URL(url);
assert.equal(parsed.protocol,"http:");
assert.ok(["localhost","127.0.0.1"].includes(parsed.hostname));
assert.equal(parsed.port,"54321");
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const pg={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGUSER:"postgres",PGPASSWORD:"postgres",PGDATABASE:"postgres"};
function sql(q){
 const p=spawnSync("psql",["-X","-Atq","-v","ON_ERROR_STOP=1","-c",q],{env:pg,encoding:"utf8",timeout:30000});
 assert.equal(p.status,0,(p.stderr||p.stdout||"local SQL failure").slice(0,750));
 return p.stdout.trim();
}
const uuid=x=>{assert.match(x,/^[0-9a-f-]{36}$/i);return "'"+x+"'";};
async function request(path,{method="GET",token,body}={}){
 const r=await fetch(url+path,{method,headers:{apikey:key,"Content-Type":"application/json",
  Authorization:"Bearer "+(token||key)},body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(15000)});
 const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}
 return {ok:r.ok,status:r.status,data};
}
function yes(r,label){assert.equal(r.ok,true,label+" "+r.status+" "+JSON.stringify(r.data).slice(0,250));return r.data}
function no(r,label){assert.equal(r.ok,false,label+" unexpectedly succeeded: "+JSON.stringify(r.data).slice(0,250));}
const rpc=(name,token,data)=>request("/rest/v1/rpc/"+name,{method:"POST",token,body:data});
const suffix=randomBytes(5).toString("hex"),pw=randomBytes(18).toString("hex")+"!Ab3";
async function sign(name){
 const r=yes(await request("/auth/v1/signup",{method:"POST",
  body:{email:"coach-relaunch-"+name+"-"+suffix+"@example.invalid",password:pw}}),name+" signup");
 assert.ok(r.access_token&&r.user?.id);
 return {id:r.user.id,token:r.access_token};
}
const people={};
for(const role of ["coachA","coachB","studentA","studentB"])people[role]=await sign(role);
const orgA=randomUUID(),orgB=randomUUID();
sql("insert into public.efg_organizations(id,coach_id) values ("+
 uuid(orgA)+","+uuid(people.coachA.id)+"),("+uuid(orgB)+","+uuid(people.coachB.id)+")");
sql("insert into public.efg_profiles(user_id,role,organization_id) values ("+
 uuid(people.coachA.id)+",'coach',null),("+uuid(people.coachB.id)+",'coach',null),"+
 "("+uuid(people.studentA.id)+",'student',"+uuid(orgA)+"),"+
 "("+uuid(people.studentB.id)+",'student',"+uuid(orgB)+")");
sql("insert into public.efg_consents(student_id,organization_id,accepted) values ("+
 uuid(people.studentA.id)+","+uuid(orgA)+",false),"+
 "("+uuid(people.studentB.id)+","+uuid(orgB)+",true)");
const version="coach_major_2026_r1";
const body={p_completed_version:version,p_payload:{objective:"recomp",age_years:41,height_cm:174,
 weight_kg:80.5,activity_level:"moderate",dietary_pattern:"vegetarian",
 preferred_foods:"Arroz y legumbres",disliked_foods:"",meal_routine:"",notes:""},
 p_expected_revision:0,p_share_with_coach:false};
const read=(token)=>request("/rest/v1/efg_coach_relaunch_intakes?select=student_id,organization_id,completed_version,revision,objective,shared_at",{token});
const beforeGoals=sql("select count(*) from public.efg_goals");
const beforeLogs=sql("select count(*) from public.efg_daily_logs");
no(await rpc("efg_submit_coach_relaunch_intake",null,body),"Anonymous cannot save new Coach intake");
no(await rpc("efg_submit_coach_relaunch_intake",people.coachA.token,body),"Coach cannot save for student");
no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,body),"Terms not accepted");
const termStatus=yes(await rpc("efg_legal_current_status",people.studentA.token,{}),"Current legal");
assert.equal(termStatus.length,2);
assert.ok(termStatus.every(x=>!x.accepted));
const documents=termStatus.map(x=>x.document_id);
assert.ok(documents.every(x=>typeof x==="string"));
yes(await rpc("efg_accept_legal_documents",people.studentA.token,{p_document_ids:documents}),"Explicit legal acceptance");
assert.ok(yes(await rpc("efg_legal_current_status",people.studentA.token,{}),"After legal").every(x=>x.accepted));
assert.equal((await read(people.studentA.token)).data.length,0,"Old intake cannot become current revision automatically");
assert.equal(Number(yes(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,body),"private general intake")),1);
const owner=yes(await read(people.studentA.token),"Student owns own relaunch version");
assert.equal(owner.length,1);
assert.equal(owner[0].revision,1);
assert.equal(owner[0].completed_version,version);
assert.equal(owner[0].shared_at,null);
assert.deepEqual(yes(await read(people.coachA.token),"No coach reading private intake"),[]);
assert.deepEqual(yes(await read(people.coachB.token),"Other organization never reads"),[]);
assert.deepEqual(yes(await read(people.studentB.token),"Other student never reads"),[]);
no(await request("/rest/v1/efg_coach_relaunch_intakes",{method:"POST",token:people.studentA.token,
 body:{student_id:people.studentA.id,organization_id:orgA,completed_version:version,revision:999}}),
 "Owner cannot bypass RPC through REST writes");
const conflict=await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,body);
no(conflict,"Repeat expected 0 must conflict");
assert.equal(conflict.status,409,"Stale submissions return HTTP 409, not an implicit retry.");
no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,{...body,p_expected_revision:1,p_share_with_coach:true}),
 "Unaccepted follow-up may not share even when legal accepted");
sql("update public.efg_consents set organization_id="+uuid(orgB)+",accepted=true where student_id="+uuid(people.studentA.id));
no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,
 {...body,p_expected_revision:1,p_share_with_coach:true}),
 "A consent row for another organization cannot authorize sharing.");
sql("update public.efg_consents set organization_id="+uuid(orgA)+",accepted=true where student_id="+uuid(people.studentA.id));
assert.equal(Number(yes(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,
 {...body,p_expected_revision:1,p_share_with_coach:true}),"Explicit share once consented")),2);
assert.equal(yes(await read(people.coachA.token),"Coach sees explicitly shared copy").length,1);
assert.deepEqual(yes(await read(people.coachB.token),"Other Coach B is not allowed"),[]);
no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,{...body,
 p_expected_revision:1,p_share_with_coach:true}),"CAS rejects stale revision");
assert.equal(Number(yes(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,
 {...body,p_expected_revision:2,p_share_with_coach:false}),"Student revokes sharing")),3);
assert.deepEqual(yes(await read(people.coachA.token),"Coach cannot read after revocation"),[]);
assert.equal(yes(await read(people.studentA.token),"Owner retains private copy")[0].shared_at,null);
for(const data of [
 {...body,p_expected_revision:3,p_payload:{health_flags:["celiac"]}},
 {...body,p_expected_revision:3,p_payload:{allergy_details:"maní"}},
 {...body,p_expected_revision:3,p_payload:{...body.p_payload,notes:"x".repeat(1001)}},
 {...body,p_expected_revision:3,p_payload:{...body.p_payload,age_years:17}},
 {...body,p_expected_revision:3,p_payload:{...body.p_payload,age_years:"41"}},
 {...body,p_expected_revision:3,p_payload:{...body.p_payload,dietary_pattern:"dangerous"}},
 {...body,p_completed_version:"coach_old_2026",p_expected_revision:3},
 {...body,p_expected_revision:3,p_share_with_coach:null}
])no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,data),"Reject invalid/sensitive/stale-input");
sql("update public.efg_consents set accepted=false where student_id="+uuid(people.studentA.id));
assert.deepEqual(yes(await read(people.coachA.token),"Revoked Coach consent hides shared records"),[]);
assert.equal(sql("select count(*) from public.efg_goals"),beforeGoals,"Historical goals unchanged");
assert.equal(sql("select count(*) from public.efg_daily_logs"),beforeLogs,"Historical food logs unchanged");
assert.equal(sql("select count(*) from public.efg_coach_relaunch_intakes where student_id="+uuid(people.studentA.id)), "1");
console.log("PASS COACH-RELAUNCH LOCAL GoTrue JWT: Terms-first, prior intake ignored, owner vs Coach A/B, private/share/revoke, RLS direct-write denial, revision CAS and preserved history. Fixtures only; no hosted database.");
