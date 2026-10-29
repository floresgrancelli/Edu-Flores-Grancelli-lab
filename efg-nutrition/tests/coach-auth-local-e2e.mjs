// NUT-53 - AUTH REAL IN SUPABASE LOCAL ONLY. No hosted project, no data from production.
// GoTrue issues real signed JWTs. PostgreSQL fixtures and evidence are synthetic.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {randomBytes,randomUUID} from "node:crypto";

const raw=readFileSync(process.env.EFG_LOCAL_STATUS_ENV||"", "utf8");
const settings={};
for(const line of raw.split(/\r?\n/)){
 const index=line.indexOf("=");
 if(index>0)settings[line.slice(0,index)]=line.slice(index+1).trim().replace(/^['"]|['"]$/g,"");
}
const base=settings.API_URL, key=settings.ANON_KEY||settings.PUBLISHABLE_KEY;
assert.ok(base&&key,"Supabase CLI must provide the local API and key");
const origin=new URL(base);
assert.equal(origin.protocol,"http:","Only local HTTP may be contacted by this QA");
assert.ok(["127.0.0.1","localhost"].includes(origin.hostname),"External Supabase API is forbidden");
assert.equal(origin.port,"54321","Expected unlinked local Supabase API");
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined,"Hosted management access must not be configured");
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined,"Hosted database credential must not be configured");
const pgEnv={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGUSER:"postgres",PGPASSWORD:"postgres",PGDATABASE:"postgres"};
const uuid=v=>{assert.match(v,/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);return "'"+v+"'";};
function sql(query){
 const r=spawnSync("psql",["-X","-A","-t","-v","ON_ERROR_STOP=1","-c",query],{env:pgEnv,encoding:"utf8",timeout:30000});
 if(r.status!==0)throw Error("Local SQL fixture failure: "+(r.stderr||r.stdout||"unknown").slice(0,1500));
 return r.stdout.trim();
}
async function call(path,{method="GET",token=null,body}={}){
 const headers={apikey:key,"Content-Type":"application/json"};
 if(token)headers.Authorization="Bearer "+token;
 else headers.Authorization="Bearer "+key;
 const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const text=await r.text();
 let data=text;
 try{data=text?JSON.parse(text):null;}catch(_){}
 return {ok:r.ok,status:r.status,data};
}
const ok=(r,label)=>{assert.equal(r.ok,true,label+" status="+r.status+" body="+JSON.stringify(r.data).slice(0,300));return r.data;};
const denied=(r,label)=>assert.equal(r.ok,false,label+" unexpectedly succeeded: "+JSON.stringify(r.data).slice(0,300));
const suffix=randomBytes(5).toString("hex"),password=randomBytes(25).toString("hex")+"!Aa2";
async function signup(role){
 const r=await call("/auth/v1/signup",{method:"POST",body:{email:"nut53-"+role+"-"+suffix+"@example.invalid",password}});
 const data=ok(r,"Local Auth signup for "+role);
 assert.ok(data.access_token&&data.user?.id,"Must receive signed JWT and real Auth user; check local email confirmations");
 assert.equal(data.access_token.split(".").length,3);
 const user=ok(await call("/auth/v1/user",{token:data.access_token}),"GoTrue /user for "+role);
 assert.equal(user.id,data.user.id,"Signed token must identify the created GoTrue user");
 return {id:data.user.id,token:data.access_token};
}
const users={};
for(const role of ["coachA","coachB","studentA","studentB","reviewer"])users[role]=await signup(role);
const orgA="10000000-0000-4000-8000-000000000001";
const orgB="10000000-0000-4000-8000-000000000002";
const seed=[
 "insert into public.efg_organizations(id,coach_id) values ("+uuid(orgA)+","+uuid(users.coachA.id)+"),("+uuid(orgB)+","+uuid(users.coachB.id)+")",
 "insert into public.efg_profiles(user_id,organization_id,role) values "+
  "("+uuid(users.coachA.id)+",null,'coach'),("+uuid(users.coachB.id)+",null,'coach'),"+
  "("+uuid(users.studentA.id)+","+uuid(orgA)+",'student'),("+uuid(users.studentB.id)+","+uuid(orgB)+",'student')",
 "insert into public.efg_consents(student_id,organization_id,accepted) values "+
  "("+uuid(users.studentA.id)+","+uuid(orgA)+",true),("+uuid(users.studentB.id)+","+uuid(orgB)+",true)",
 "insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status) values "+
  "("+uuid(users.studentA.id)+","+uuid(orgA)+","+uuid(users.coachA.id)+",'pending'),"+
  "("+uuid(users.studentB.id)+","+uuid(orgB)+","+uuid(users.coachB.id)+",'pending')",
 "insert into public.efg_student_intakes(student_id,organization_id,dietary_pattern,shared_at) values "+
  "("+uuid(users.studentA.id)+","+uuid(orgA)+",'vegetarian',now()),"+
  "("+uuid(users.studentB.id)+","+uuid(orgB)+",'omnivore',now())"
].join(";\n")+";";
sql(seed);
sql("notify pgrst,'reload schema';");
await new Promise(r=>setTimeout(r,1700));
const stamp=sql("select updated_at from public.efg_student_intakes where student_id="+uuid(users.studentA.id));
const goal={goal_type:"maintenance",kcal:2000,protein_g:120,carb_g:250,fat_g:70,fiber_g:30};
const slots=["desayuno","media_manana","almuerzo","merienda","cena"];
const guide={kind:"five_meal_example",version:1,meals:slots.map(slot=>({slot,items:[{id:"tofu_firm",unit:"g",qty:100,k:.8,p:.1,c:.03,f:.04,fi:.02}]}))};
const payload={p_student:users.studentA.id,p_goal:goal,p_guide:guide,p_intake_updated_at:stamp,p_expected_revision:null};
const rpc=(name,token,body)=>call("/rest/v1/rpc/"+name,{method:"POST",token,body});
const save=ok(await rpc("efg_save_coach_plan_draft",users.coachA.token,payload),"Coach A saves own draft with signed token");
assert.equal(Number(save),1,"Expected private revision 1");
denied(await rpc("efg_save_coach_plan_draft",users.coachB.token,payload),"Coach B must not modify A");
denied(await rpc("efg_save_coach_plan_draft",users.studentA.token,payload),"Student must not save Coach draft");
denied(await rpc("efg_save_coach_plan_draft",null,payload),"Anon must not save Coach draft");
const badJwt=await call("/rest/v1/rpc/efg_save_coach_plan_draft",{method:"POST",token:users.coachA.token.slice(0,-7)+"invalid",body:payload});
denied(badJwt,"Invalid JWT must not pass authorization");
const path="/rest/v1/efg_coach_plan_drafts?select=student_id,draft_revision,status";
const owner=ok(await call(path,{token:users.coachA.token}),"Coach A own draft read");
assert.equal(owner.length,1);
assert.equal(owner[0].student_id,users.studentA.id);
assert.equal(owner[0].draft_revision,1);
const other=ok(await call(path,{token:users.coachB.token}),"Coach B draft query");
assert.deepEqual(other,[],"Cross-organization draft row must be RLS-invisible");
const student=ok(await call(path,{token:users.studentA.token}),"Student draft query");
assert.deepEqual(student,[],"Student must not see private Coach draft");
denied(await call("/rest/v1/efg_goals",{method:"POST",token:users.coachA.token,body:{student_id:users.studentA.id,approved_by:users.coachA.id,goal_type:"maintenance",kcal:2000,protein_g:120,carb_g:250,fat_g:70,fiber_g:30}}),"Direct goal insert");
denied(await call("/rest/v1/efg_food_plans",{method:"POST",token:users.coachA.token,body:{student_id:users.studentA.id,coach_id:users.coachA.id,approved_food_ids:["tofu_firm"]}}),"Direct guide insert");
denied(await rpc("efg_publish_coach_plan",users.coachA.token,{p_student:users.studentA.id,p_goal_id:randomUUID()}),"Legacy publish endpoint");
denied(await rpc("efg_publish_coach_plan_draft",users.coachA.token,{p_student:users.studentA.id,p_expected_revision:1,p_request_id:randomUUID()}),"No food/legal evidence must fail closed");
assert.equal(sql("select count(*) from public.efg_goals"),"0","Failure cannot publish an active goal");
assert.equal(sql("select count(*) from public.efg_notifications"),"0","Failure cannot notify");
assert.equal(sql("select count(*) from public.efg_coach_plan_publish_receipts"),"0","Failure cannot create a receipt");
denied(await rpc("efg_save_coach_plan_draft",users.coachA.token,payload),"Null expected revision cannot overwrite existing draft");
const second=ok(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:1}),"Correct revision updates private draft");
assert.equal(Number(second),2);
denied(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:1}),"Concurrent stale revision must fail");
sql("update public.efg_consents set accepted=false where student_id="+uuid(users.studentA.id));
const hidden=ok(await call(path,{token:users.coachA.token}),"Revocation must invalidate owner draft visibility");
assert.deepEqual(hidden,[]);
denied(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:2}),"Revoked Coach tracking must block saving");
assert.equal(sql("select count(*) from public.efg_goals"),"0");
console.log("PASS NUT-53 LOCAL AUTH: signed GoTrue JWTs verified, Coach A/B and student separation, RLS read, unauthorized RPC denial, no premature goal, fail-closed legal, revision CAS and revocation. DATA/FIXTURES SYNTHETIC; no production/clinical/legal approval.");
