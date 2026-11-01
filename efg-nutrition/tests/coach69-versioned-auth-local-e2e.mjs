// COACH-69 · real GoTrue signed JWT through LOCAL PostgREST only.
// Fictional users, synthetic food/legal evidence. NO clinical clearance / hosted DB.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {randomBytes,randomUUID} from "node:crypto";
const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV||"","utf8")
 .split(/\r?\n/).filter(x=>x.includes("=")).map(x=>{const i=x.indexOf("=");return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}));
const url=env.API_URL,key=env.ANON_KEY||env.PUBLISHABLE_KEY;
assert.ok(url&&key);
const u=new URL(url);
assert.equal(u.protocol,"http:");
assert.ok(["127.0.0.1","localhost"].includes(u.hostname));
assert.equal(u.port,"54321");
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const pg={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGUSER:"postgres",PGPASSWORD:"postgres",PGDATABASE:"postgres"};
function sql(statement){
 const r=spawnSync("psql",["-X","-Atq","-v","ON_ERROR_STOP=1","-c",statement],{
  env:pg,encoding:"utf8",timeout:30000});
 assert.equal(r.status,0,(r.stderr||r.stdout||"Local SQL error").slice(0,1100));
 return r.stdout.trim();
}
const quote=x=>{assert.match(x,/^[0-9a-f-]{36}$/i);return "'"+x+"'"};
async function request(path,{method="GET",token=null,body}={}){
 const r=await fetch(url+path,{method,headers:{apikey:key,
  Authorization:"Bearer "+(token||key),"Content-Type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const s=await r.text();let data=s;try{data=s?JSON.parse(s):null}catch{}
 return {ok:r.ok,status:r.status,data};
}
const good=(r,label)=>{assert.equal(r.ok,true,label+" HTTP "+r.status+" "+JSON.stringify(r.data).slice(0,550));return r.data};
const bad=(r,label)=>{assert.equal(r.ok,false,label+" unexpectedly succeeded: "+JSON.stringify(r.data).slice(0,200));return r};
const rpc=(name,token,body)=>request("/rest/v1/rpc/"+name,{method:"POST",token,body});
const suffix=randomBytes(5).toString("hex"),pw=randomBytes(16).toString("hex")+"!Ab5";
async function signup(role){
 const res=good(await request("/auth/v1/signup",{method:"POST",body:{
  email:"coach69-"+role+"-"+suffix+"@example.invalid",password:pw}}),"GoTrue "+role);
 assert.ok(res.access_token&&res.user?.id);
 assert.equal(res.access_token.split(".").length,3);
 assert.equal(good(await request("/auth/v1/user",{token:res.access_token}),"signed identity").id,res.user.id);
 return {id:res.user.id,token:res.access_token,email:res.user.email};
}
const users={};for(const x of ["coachA","coachB","studentA","studentB","reviewer"])users[x]=await signup(x);
const orgA=randomUUID(),orgB=randomUUID();
sql("insert into public.efg_organizations(id,coach_id,name) values ("+
 quote(orgA)+","+quote(users.coachA.id)+",'Synthetic Coach69 A'),("+quote(orgB)+","+
 quote(users.coachB.id)+",'Synthetic Coach69 B')");
sql("insert into public.efg_profiles(user_id,email,nickname,role,organization_id) values ("+
 quote(users.coachA.id)+",'"+users.coachA.email+"','Coach69 A','coach',null),("+
 quote(users.coachB.id)+",'"+users.coachB.email+"','Coach69 B','coach',null),("+
 quote(users.studentA.id)+",'"+users.studentA.email+"','Student69 A','student',"+quote(orgA)+"),("+
 quote(users.studentB.id)+",'"+users.studentB.email+"','Student69 B','student',"+quote(orgB)+")");
sql("insert into public.efg_consents(student_id,organization_id,accepted) values ("+
 quote(users.studentA.id)+","+quote(orgA)+",true),("+quote(users.studentB.id)+","+quote(orgB)+",true)");
sql("insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status) values ("+
 quote(users.studentA.id)+","+quote(orgA)+","+quote(users.coachA.id)+",'pending'),("+
 quote(users.studentB.id)+","+quote(orgB)+","+quote(users.coachB.id)+",'pending')");
const legacyCount=Number(sql("select count(*) from public.efg_goals"));
const previousNoticeCount=Number(sql("select count(*) from public.efg_notifications"));
const docIds=sql("select string_agg(id::text,',') from public.efg_legal_documents where status='published' and kind in ('terms','privacy') and locale='es-AR'").split(",");
assert.equal(docIds.length,2,"Published legal FIXTURE must already be in local DB");
const legal=token=>rpc("efg_legal_current_status",token,{});
const accept=token=>rpc("efg_accept_legal_documents",token,{p_document_ids:docIds});
bad(await rpc("efg_submit_coach_relaunch_intake",users.coachA.token,{
 p_completed_version:"coach_major_2026_r1",p_payload:{objective:"maintenance"},
 p_expected_revision:0,p_share_with_coach:false}),"Coach cannot impersonate student");
assert.ok(good(await legal(users.studentA.token),"legal before").every(x=>x.accepted===false));
good(await accept(users.studentA.token),"student explicitly accepts current legal docs");
good(await rpc("efg_accept_pilot_participation",users.studentA.token,{
 p_version:"coach_pilot_2026_demo1",p_participation:true,p_sharing:true
}),"student separately accepts pilot sharing before Coach draft");
const intakePayload={p_completed_version:"coach_major_2026_r1",
 p_payload:{objective:"maintenance",dietary_pattern:"vegetarian",age_years:40,
  height_cm:172,weight_kg:80.2,activity_level:"moderate",preferred_foods:"Legumbres"},
 p_expected_revision:0,p_share_with_coach:true};
assert.equal(Number(good(await rpc("efg_submit_coach_relaunch_intake",
 users.studentA.token,intakePayload),"student chooses to share")),1);
const sharedIntake=good(await request("/rest/v1/efg_coach_relaunch_intakes?select=revision,shared_at",{token:users.coachA.token}),"Coach sees consented current intake");
assert.ok(sharedIntake.some(x=>x.revision===1&&x.shared_at),"Coach SELECT requires current independent sharing receipt");
const intake=sql("select updated_at from public.efg_coach_relaunch_intakes where student_id="+quote(users.studentA.id));
assert.ok(intake.includes("2026")||intake.includes("2027"));
const goal={goal_type:"maintenance",kcal:2000,protein_g:120,carb_g:250,fat_g:70,fiber_g:30};
const slots=["desayuno","media_manana","almuerzo","merienda","cena"];
const guide={kind:"five_meal_example",version:1,meals:slots.map(slot=>({
 slot,items:[{id:"tofu_69",unit:"g",qty:100,k:.8,p:.1,c:.03,f:.04,fi:.02}]}))};
const draft={p_student:users.studentA.id,p_goal:goal,p_guide:guide,
 p_intake_updated_at:intake,p_intake_revision:1,p_expected_revision:null};
bad(await rpc("efg_save_coach_plan_draft",null,draft),"anon");
bad(await rpc("efg_save_coach_plan_draft",users.studentA.token,draft),"student");
bad(await rpc("efg_save_coach_plan_draft",users.coachB.token,draft),"cross-org");
bad(await rpc("efg_save_coach_plan_draft",users.coachA.token,{
 ...draft,p_intake_revision:0}),"forged old revision");
assert.equal(Number(good(await rpc("efg_save_coach_plan_draft",users.coachA.token,draft),
 "coach saves private current version")),1);
const privateView=good(await request("/rest/v1/efg_coach_plan_drafts?select=draft_revision,source_intake_revision",{token:users.coachA.token}),"Coach draft read");
assert.ok(privateView.some(x=>x.source_intake_revision===1));
assert.deepEqual(good(await request("/rest/v1/efg_coach_plan_drafts?select=draft_revision",{token:users.studentA.token}),"student must not read draft"),[]);
assert.deepEqual(good(await request("/rest/v1/efg_coach_plan_drafts?select=draft_revision",{token:users.coachB.token}),"B cannot read A draft"),[]);
const pub=()=>rpc("efg_publish_coach_plan_draft",users.coachA.token,
 {p_student:users.studentA.id,p_expected_revision:1,p_request_id:randomUUID()});
bad(await pub(),"Cannot publish without food review and coach legal acceptance");
assert.equal(Number(sql("select count(*) from public.efg_goals")),legacyCount,"Failed publication preserves all existing approved goals");
const receiptBefore=Number(sql("select count(*) from public.efg_coach_plan_publish_receipts"));
sql("insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at) values "+
 "('tofu_69','synthetic_coach69','g',0.8,0.1,0.03,0.04,0.02,'validated_composition','https://example.org/not-clinical','FakeFoodEvidence69','reviewed',"+
 quote(users.reviewer.id)+",now()-interval '1 day',now()+interval '2 days')");
sql("insert into efg_private.coach_food_pattern_reviews(food_id,dietary_pattern,verdict,catalog_version,evidence_id,reviewed_by,reviewed_at,expires_at) values "+
 "('tofu_69','vegetarian','allowed','synthetic_coach69','FakeFoodEvidence69',"+quote(users.reviewer.id)+
 ",now()-interval '1 day',now()+interval '2 days')");
sql("insert into efg_private.coach_publication_scope_reviews(student_id,organization_id,coach_id,intake_updated_at,intake_completed_version,intake_revision,status,reviewed_by,reviewed_at) values ("+
 quote(users.studentA.id)+","+quote(orgA)+","+quote(users.coachA.id)+",'"+intake+"','coach_major_2026_r1',1,'general_guidance_reviewed',"+
 quote(users.reviewer.id)+",now())");
bad(await pub(),"Coach has not accepted terms yet");
good(await accept(users.coachA.token),"Coach explicitly accepts TWO current documents");
bad(await rpc("efg_publish_coach_plan_draft",users.studentA.token,{
 p_student:users.studentA.id,p_expected_revision:1,p_request_id:randomUUID()}),"Student may not approve plan");
bad(await rpc("efg_publish_coach_plan_draft",users.coachB.token,{
 p_student:users.studentA.id,p_expected_revision:1,p_request_id:randomUUID()}),"Other Coach may not publish");
const keyOnce=randomUUID();
const toPublish={p_student:users.studentA.id,p_expected_revision:1,p_request_id:keyOnce};
// Two actual concurrent HTTP requests with the SAME idempotency key must
// serialize at the server row lock, publish once, and return the same goal.
const simultaneous=await Promise.all([
 rpc("efg_publish_coach_plan_draft",users.coachA.token,toPublish),
 rpc("efg_publish_coach_plan_draft",users.coachA.token,toPublish)
]);
const goalId=good(simultaneous[0],"Concurrent approval A").toLowerCase();
assert.match(goalId,/^[0-9a-f-]{36}$/i);
assert.equal(good(simultaneous[1],"Concurrent approval B").toLowerCase(),goalId);
assert.equal(good(await rpc("efg_publish_coach_plan_draft",users.coachA.token,toPublish),
 "Idempotency exact key"),goalId);
assert.equal(Number(sql("select count(*) from public.efg_goals")),legacyCount+1);
assert.equal(Number(sql("select count(*) from public.efg_coach_plan_publish_receipts")),receiptBefore+1);
assert.equal(Number(sql("select count(*) from public.efg_notifications")),previousNoticeCount+1);
assert.equal(sql("select status from public.efg_student_plan_access where student_id="+quote(users.studentA.id)),"published");
assert.equal(sql("select guided_goal_id from public.efg_food_plans where student_id="+quote(users.studentA.id)),goalId);
bad(await rpc("efg_publish_coach_plan_draft",users.coachB.token,toPublish),"Cross-organization key replay denied");
bad(await request("/rest/v1/efg_goals",{method:"POST",token:users.coachA.token,
 body:{student_id:users.studentA.id,approved_by:users.coachA.id,goal_type:"maintenance",
 kcal:1800,protein_g:120,carb_g:180,fat_g:70,fiber_g:25}}),"Old direct goal write denied");
bad(await request("/rest/v1/efg_food_plans?student_id=eq."+users.studentA.id,{method:"PATCH",
 token:users.coachA.token,body:{approved_food_ids:["unverified"]}}),"Old PWA guide write denied");
// COACH-RELEASE-REV-02: real signed LOCAL JWT edit, still shared and legal
// approved. A new intake revision invalidates the old publication draft even
// if the previous goal/guide remain visible in the student's history.
const retainedHistoryGoal=goalId;
const editShared={...intakePayload,p_expected_revision:1,p_share_with_coach:true,
 p_payload:{...intakePayload.p_payload,preferred_foods:"Legumbres, arroz"}};
assert.equal(Number(good(await rpc("efg_submit_coach_relaunch_intake",
 users.studentA.token,editShared),"Student edits same-version shared intake")),2);
const secondIntake=sql("select updated_at from public.efg_coach_relaunch_intakes where student_id="+quote(users.studentA.id));
assert.ok(secondIntake.includes("2026")||secondIntake.includes("2027"));
bad(await rpc("efg_publish_coach_plan_draft",users.coachA.token,{
 p_student:users.studentA.id,p_expected_revision:1,p_request_id:randomUUID()}),
 "Old published draft cannot be approved a second time on revised intake");
bad(await rpc("efg_save_coach_plan_draft",users.coachA.token,{
 ...draft,p_expected_revision:1}),
 "Old timestamp and old intake revision cannot overwrite a revised shared intake");
assert.equal(Number(good(await rpc("efg_save_coach_plan_draft",users.coachA.token,{
 ...draft,p_intake_updated_at:secondIntake,p_intake_revision:2,p_expected_revision:1}),
 "Coach reopens fresh private draft after student update")),2);
const renewedDraft=good(await request(
 "/rest/v1/efg_coach_plan_drafts?select=draft_revision,source_intake_revision,status",
 {token:users.coachA.token}),"Read new source revision from RLS");
assert.ok(renewedDraft.some(x=>x.draft_revision===2&&
 x.source_intake_revision===2&&x.status==="draft"));
bad(await rpc("efg_publish_coach_plan_draft",users.coachA.token,{
 p_student:users.studentA.id,p_expected_revision:2,p_request_id:randomUUID()}),
 "New draft cannot bypass old food/legal publication-scope review tied to revision one");
assert.equal(sql("select guided_goal_id from public.efg_food_plans where student_id="+quote(users.studentA.id)),
 retainedHistoryGoal,"Student keeps prior published plan until next approval");
assert.equal(Number(sql("select count(*) from public.efg_goals")),legacyCount+1,
 "Revised intake/draft must never publish an unreviewed second goal");
assert.equal(Number(sql("select count(*) from public.efg_coach_plan_publish_receipts")),receiptBefore+1);
assert.equal(Number(sql("select count(*) from public.efg_notifications")),previousNoticeCount+1);

// Revoke personal sharing, then verify even idempotent replay cannot bypass the current permission check.
const edit={...editShared,p_expected_revision:2,p_share_with_coach:false};
assert.equal(Number(good(await rpc("efg_submit_coach_relaunch_intake",users.studentA.token,edit),
 "Student revokes sharing after publication")),3);
bad(await rpc("efg_publish_coach_plan_draft",users.coachA.token,toPublish),
 "Revoked share denies replay before idempotent receipt");
bad(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...draft,
 p_expected_revision:1}),"Revoked share denies draft edits");
assert.deepEqual(good(await request("/rest/v1/efg_coach_plan_drafts?select=draft_revision",{token:users.coachA.token}),"Revoked Coach loses draft RLS"),[]);
assert.equal(Number(sql("select count(*) from public.efg_goals")),legacyCount+1);
assert.equal(Number(sql("select count(*) from public.efg_notifications")),previousNoticeCount+1);
console.log("PASS COACH69: signed LOCAL GoTrue JWT, 2 organizations, student new-version intake, revision-bound private Coach draft, both explicit legal consents, fake nutrition evidence, atomic publish exactly once, denied legacy writes, revised shared intake stale draft, reviewed scope on revision two and revocation, without changing historic records. NOT production parity/clinical approval.");
