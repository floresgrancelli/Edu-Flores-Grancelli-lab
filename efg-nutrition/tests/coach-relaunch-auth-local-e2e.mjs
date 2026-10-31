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
 return {id:r.user.id,token:r.access_token,email:r.user.email};
}
const people={};
for(const role of ["coachA","coachB","studentA","studentB"])people[role]=await sign(role);
const orgA=randomUUID(),orgB=randomUUID();
sql("insert into public.efg_organizations(id,coach_id,name) values ("+
 uuid(orgA)+","+uuid(people.coachA.id)+",'Synthetic Relaunch A'),("+uuid(orgB)+","+uuid(people.coachB.id)+",'Synthetic Relaunch B')");
sql("insert into public.efg_profiles(user_id,email,nickname,role,organization_id) values ("+
 uuid(people.coachA.id)+",'"+people.coachA.email+"','Relaunch Coach A','coach',null),"+
 "("+uuid(people.coachB.id)+",'"+people.coachB.email+"','Relaunch Coach B','coach',null),"+
 "("+uuid(people.studentA.id)+",'"+people.studentA.email+"','Relaunch Student A','student',"+uuid(orgA)+"),"+
 "("+uuid(people.studentB.id)+",'"+people.studentB.email+"','Relaunch Student B','student',"+uuid(orgB)+")");
sql("insert into public.efg_consents(student_id,organization_id,accepted) values ("+
 uuid(people.studentA.id)+","+uuid(orgA)+",false),"+
 "("+uuid(people.studentB.id)+","+uuid(orgB)+",true)");
// The real pilot has a legacy intake; mirror that historical row in this
// disposable fixture so the privacy-clear assertion checks preservation.
sql("insert into public.efg_student_intakes(student_id,organization_id,dietary_pattern,shared_at) values ("+
 uuid(people.studentA.id)+","+uuid(orgA)+",'vegetarian',null)");
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

// COACH-SEC-09: a formerly linked student must not read an org A intake
// after moving to org B. The old owner policy used an ambiguous inner-column
// comparison and would have returned the stale private row.
sql("update public.efg_profiles set organization_id="+uuid(orgB)+
 " where user_id="+uuid(people.studentA.id));
assert.deepEqual(yes(await read(people.studentA.token),
 "Transferred student cannot read private intake from former organization"),[]);
assert.deepEqual(yes(await read(people.coachB.token),
 "New organization coach cannot inherit former private intake"),[]);
sql("update public.efg_profiles set organization_id="+uuid(orgA)+
 " where user_id="+uuid(people.studentA.id));
assert.equal(yes(await read(people.studentA.token),
 "Returning to original organization restores access to unchanged intake").length,1);

sql("update public.efg_profiles set active=false where user_id="+uuid(people.studentA.id));
assert.deepEqual(yes(await read(people.studentA.token),
 "Inactive student cannot read formerly owned private intake"),[]);
sql("update public.efg_profiles set active=true where user_id="+uuid(people.studentA.id));
assert.equal(yes(await read(people.studentA.token),
 "Reactivated owner can read same untouched private intake").length,1);


no(await request("/rest/v1/efg_coach_relaunch_intakes",{method:"POST",token:people.studentA.token,
 body:{student_id:people.studentA.id,organization_id:orgA,completed_version:version,revision:999}}),
 "Owner cannot bypass RPC through REST writes");
const conflict=await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,body);
no(conflict,"Repeat expected 0 must conflict");
assert.equal(conflict.status,409,"Stale submissions return HTTP 409, not an implicit retry.");
no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,{...body,p_expected_revision:1,p_share_with_coach:true}),
 "Unaccepted follow-up may not share even when legal accepted");
// Identity/organization of an existing consent is immutable in the Coach schema.
 // Cross-organization access is tested via signed tokens from both Coach A and B.
sql("update public.efg_consents set accepted=true where student_id="+uuid(people.studentA.id));
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
// COACH-65: the same versioned endpoint updates and clears optional general fields.
const edited={...body,p_expected_revision:3,
 p_payload:{...body.p_payload,weight_kg:79.9,notes:"Horario nuevo"},
 p_share_with_coach:false};
assert.equal(Number(yes(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,edited),
 "Student edits OWN current-version intake")),4);
const afterEdit=yes(await request(
 "/rest/v1/efg_coach_relaunch_intakes?select=revision,weight_kg,notes,shared_at,completed_version",
 {token:people.studentA.token}),"Read edited owner fields");
assert.equal(afterEdit[0].weight_kg,79.9);
assert.equal(afterEdit[0].revision,4);
assert.equal(afterEdit[0].shared_at,null);
assert.deepEqual(yes(await read(people.coachA.token),"Coach cannot read private edited intake"),[]);
no(await request("/rest/v1/efg_coach_relaunch_intakes?student_id=eq."+people.studentA.id,{
 method:"DELETE",token:people.studentA.token}),"Direct REST delete of current marker must be denied.");
const clearedPayload={objective:null,age_years:null,height_cm:null,weight_kg:null,
 activity_level:null,dietary_pattern:null,preferred_foods:"",disliked_foods:"",
 meal_routine:"",notes:""};
assert.equal(Number(yes(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,{
 p_completed_version:version,p_payload:clearedPayload,
 p_expected_revision:4,p_share_with_coach:false
}),"Owner clears voluntary intake while retaining completion version")),5);
const afterClear=yes(await request(
 "/rest/v1/efg_coach_relaunch_intakes?select=revision,weight_kg,objective,notes,shared_at,completed_version",
 {token:people.studentA.token}),"Read erased current-version general fields");
assert.equal(afterClear.length,1);
assert.equal(afterClear[0].revision,5);
assert.equal(afterClear[0].completed_version,version);
assert.equal(afterClear[0].weight_kg,null);
assert.equal(afterClear[0].objective,null);
assert.equal(afterClear[0].notes,"");
assert.equal(afterClear[0].shared_at,null);
assert.equal(sql("select dietary_pattern from public.efg_student_intakes where student_id="+uuid(people.studentA.id)),
 "vegetarian","Old Coach intake history must not be cleared by new-version erasure.");
no(await rpc("efg_submit_coach_relaunch_intake",people.studentA.token,{
 ...edited,p_expected_revision:4}),"Stale revision cannot undo the data clearing.");
sql("update public.efg_consents set accepted=false where student_id="+uuid(people.studentA.id));
assert.deepEqual(yes(await read(people.coachA.token),"Revoked Coach consent hides shared records"),[]);
assert.equal(sql("select count(*) from public.efg_goals"),beforeGoals,"Historical goals unchanged");
assert.equal(sql("select count(*) from public.efg_daily_logs"),beforeLogs,"Historical food logs unchanged");
assert.equal(sql("select count(*) from public.efg_coach_relaunch_intakes where student_id="+uuid(people.studentA.id)), "1");
console.log("PASS COACH-RELAUNCH LOCAL GoTrue JWT: Terms-first, prior intake ignored, owner vs Coach A/B, private/share/revoke, RLS direct-write denial, revision CAS and preserved history. Fixtures only; no hosted database.");
