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
 return {id:data.user.id,token:data.access_token,email:data.user.email};
}
const users={};
for(const role of ["coachA","coachB","studentA","studentB","reviewer"])users[role]=await signup(role);
const orgA="10000000-0000-4000-8000-000000000001";
const orgB="10000000-0000-4000-8000-000000000002";
const seed=[
 "insert into public.efg_organizations(id,coach_id,name) values ("+uuid(orgA)+","+uuid(users.coachA.id)+",'Fictional Org A'),("+uuid(orgB)+","+uuid(users.coachB.id)+",'Fictional Org B')",
 "insert into public.efg_profiles(user_id,email,nickname,organization_id,role) values "+
  "("+uuid(users.coachA.id)+",'"+users.coachA.email+"','Coach A',null,'coach'),"+
  "("+uuid(users.coachB.id)+",'"+users.coachB.email+"','Coach B',null,'coach'),"+
  "("+uuid(users.studentA.id)+",'"+users.studentA.email+"','Student A',"+uuid(orgA)+",'student'),"+
  "("+uuid(users.studentB.id)+",'"+users.studentB.email+"','Student B',"+uuid(orgB)+",'student')",
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
const duplicate=await rpc("efg_save_coach_plan_draft",users.coachA.token,payload);
denied(duplicate,"Null expected revision cannot overwrite existing draft");
assert.equal(duplicate.status,409,"Optimistic conflict must not be a retryable 40001");
assert.equal(duplicate.data?.code,"PT409");
const second=ok(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:1}),"Correct revision updates private draft");
assert.equal(Number(second),2);
const stale=await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:1});
denied(stale,"Concurrent stale revision must fail");
assert.equal(stale.status,409);
assert.equal(stale.data?.code,"PT409");
sql("update public.efg_consents set accepted=false where student_id="+uuid(users.studentA.id));
const hidden=ok(await call(path,{token:users.coachA.token}),"Revocation must invalidate owner draft visibility");
assert.deepEqual(hidden,[]);
denied(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:2}),"Revoked Coach tracking must block saving");
assert.equal(sql("select count(*) from public.efg_goals"),"0");

// NUT-54 positive atomic publication uses EXPLICITLY FICTITIOUS evidence/legal fixtures.
// This proves transaction mechanics under signed LOCAL Auth; it does NOT validate a food,
// allergy, diet, law, clinical decision or a real person's informed legal acceptance.
sql("update public.efg_consents set accepted=true where student_id="+uuid(users.studentA.id));
const termsId=randomUUID(),privacyId=randomUUID();
const fixtureSQL=[
 "insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at) values "+
  "('tofu_firm','synthetic_nut54','g',0.8,0.1,0.03,0.04,0.02,'validated_composition','https://example.org/testing-only-evidence','fakeTofuEvidence54','reviewed',"+uuid(users.reviewer.id)+",now()-interval '1 day',now()+interval '2 days')",
 "insert into efg_private.coach_food_pattern_reviews(food_id,dietary_pattern,verdict,catalog_version,evidence_id,reviewed_by,reviewed_at,expires_at) values "+
  "('tofu_firm','vegetarian','allowed','synthetic_nut54','fakeTofuEvidence54',"+uuid(users.reviewer.id)+",now()-interval '1 day',now()+interval '2 days')",
 "insert into efg_private.coach_publication_scope_reviews(student_id,organization_id,coach_id,intake_updated_at,status,reviewed_by,reviewed_at) "+
  "select student_id,organization_id,"+uuid(users.coachA.id)+",updated_at,'general_guidance_reviewed',"+uuid(users.reviewer.id)+",now() "+
  "from public.efg_student_intakes where student_id="+uuid(users.studentA.id),
 "insert into public.efg_legal_documents(id,kind,version,content,sha256,locale,published_at,effective_at,status) "+
  "select x.id::uuid,x.kind,'synthetic-1',x.body,encode(sha256(convert_to(x.body,'UTF8')),'hex'),"+
  "'es-AR',now()-interval '2 days',now()-interval '1 day','published' from (values "+
  "("+uuid(termsId)+",'terms',repeat('SYNTHETIC TERMS ONLY; NOT LEGAL ADVICE. ',5)),"+
  "("+uuid(privacyId)+",'privacy',repeat('SYNTHETIC PRIVACY POLICY; NOT LEGAL CONTENT. ',5))"+
  ") as x(id,kind,body)"
].join(";\n")+";";
sql(fixtureSQL);
// LEG-07: REAL signed GoTrue JWT / PostgREST / RLS on the LOCAL Supabase stack.
// The text, users and dietary review remain fictional. No remote credentials.
const legalStatus=token=>rpc("efg_legal_current_status",token,{});
const acceptLegal=(token,ids)=>rpc("efg_accept_legal_documents",token,{p_document_ids:ids});
const docIds=[termsId,privacyId];
for(const role of ["coachA","studentA","studentB"]){
 const entries=ok(await legalStatus(users[role].token),"LEGAL current status for "+role);
 assert.equal(entries.length,2,"Both current fixture documents must be visible");
 assert.ok(entries.every(x=>x.accepted===false),"New account must have NO automatic acceptance");
}
denied(await legalStatus(null),"Anonymous legal status must be rejected");
denied(await acceptLegal(null,docIds),"Anonymous legal acceptance must be rejected");
denied(await acceptLegal(users.coachA.token,[termsId]),"Partial selection is not consent for both current texts");
denied(await acceptLegal(users.coachA.token,[termsId,termsId]),"Duplicate legal ids must be rejected");
denied(await acceptLegal(users.coachA.token,[randomUUID(),privacyId]),"Unknown document cannot be accepted");
denied(await rpc("efg_accept_legal_documents",users.coachA.token,
 {p_document_ids:docIds,p_user_id:users.studentA.id}),"Browser cannot choose who accepts");
denied(await call("/rest/v1/efg_legal_acceptances",{
 method:"POST",token:users.coachA.token,
 body:{user_id:users.studentA.id,document_id:termsId,document_hash_sha256:"a".repeat(64),
  version:"synthetic-1",kind:"terms",acceptance_method:"explicit_checkbox",
  accepted_at:"2000-01-01T00:00:00Z"}
}),"Direct REST spoofed legal acceptance must be blocked");
const firstAccept=ok(await acceptLegal(users.coachA.token,docIds),"Coach explicitly accepts legal fixtures via signed JWT");
assert.equal(Number(firstAccept),2);
assert.ok(ok(await legalStatus(users.coachA.token),"Coach legal status after accept").every(x=>x.accepted));
const retry=ok(await acceptLegal(users.coachA.token,[]),"Idempotent legal acceptance retry");
assert.equal(Number(retry),0);
const bView=ok(await call("/rest/v1/efg_legal_acceptances?select=user_id,document_id",{token:users.coachB.token}),"Coach B legal records");
assert.deepEqual(bView,[],"Coach B must not see legal records of Coach A");
const studentView=ok(await call("/rest/v1/efg_legal_acceptances?select=user_id,document_id",{token:users.studentA.token}),"Student A records before accepting");
assert.deepEqual(studentView,[],"Student cannot see Coach A's records");
assert.equal(Number(ok(await acceptLegal(users.studentA.token,docIds),"Student A explicitly accepts via signed JWT")),2);
assert.ok(ok(await legalStatus(users.studentA.token),"Student A legal status").every(x=>x.accepted));
assert.ok(ok(await legalStatus(users.studentB.token),"Student B legal status").every(x=>!x.accepted),
 "Consent of A cannot bind B, even in a different organization");
assert.equal(sql("select count(*) from public.efg_legal_acceptances"),"4","Exactly four explicit acceptance events; no synthetic backfill");
const requestId=randomUUID(),pubPayload={p_student:users.studentA.id,p_expected_revision:2,p_request_id:requestId};
const publishedGoal=ok(await rpc("efg_publish_coach_plan_draft",users.coachA.token,pubPayload),"Coach A publishes five-meal plan atomically with synthetic evidence");
assert.match(publishedGoal,/^[0-9a-f-]{36}$/i);
const replayGoal=ok(await rpc("efg_publish_coach_plan_draft",users.coachA.token,pubPayload),"Same idempotency key must return same goal ID");
assert.equal(replayGoal,publishedGoal);
denied(await rpc("efg_publish_coach_plan_draft",users.coachB.token,pubPayload),"Coach B cannot replay A's publication");
denied(await rpc("efg_publish_coach_plan_draft",users.studentA.token,pubPayload),"Student cannot replay Coach publication");
assert.equal(sql("select count(*) from public.efg_goals"),"1","Exactly one new goal");
assert.equal(sql("select count(*) from public.efg_food_plans where guided_plan is not null"),"1","Exactly one guide");
assert.equal(sql("select count(*) from public.efg_notifications"),"1","Exactly one message");
assert.equal(sql("select count(*) from public.efg_coach_plan_publish_receipts"),"1","Exactly one durable receipt");
assert.equal(sql("select count(*) from public.efg_student_plan_access a join public.efg_food_plans p on p.student_id=a.student_id where a.student_id="+uuid(users.studentA.id)+" and a.status='published' and a.published_goal_id=p.guided_goal_id and p.guided_plan_approved_at is not null"),"1","Goal+guide+access must agree");
// NUT-59: an ALREADY OPEN legacy PWA still sends independent REST writes.
// After the atomic version is live, a stale coach tab must NEVER split the
// published goal/guide or duplicate notifications. No user data is involved.
const oldGoal={
 student_id:users.studentA.id,approved_by:users.coachA.id,
 goal_type:"maintenance",kcal:2500,protein_g:100,carb_g:320,fat_g:90,fiber_g:25
};
denied(await call("/rest/v1/efg_goals",{
 method:"POST",token:users.coachA.token,body:oldGoal
}),"Legacy pre-upgrade Coach POST goal after atomic publish must fail closed");
denied(await call("/rest/v1/efg_food_plans?student_id=eq."+users.studentA.id,{
 method:"PATCH",token:users.coachA.token,body:{approved_food_ids:["egg"]}
}),"Legacy pre-upgrade Coach PATCH guide after atomic publish must fail closed");
denied(await call("/rest/v1/efg_food_plans",{
 method:"POST",token:users.coachA.token,
 body:{student_id:users.studentA.id,coach_id:users.coachA.id,approved_food_ids:["egg"]}
}),"Legacy pre-upgrade Coach POST guide after atomic publish must fail closed");
const ownGoals=ok(await call("/rest/v1/efg_goals?select=id,student_id,kcal&student_id=eq."+users.studentA.id,{
 token:users.coachA.token
}),"Current Coach still reads published goal after legacy write denial");
assert.equal(ownGoals.length,1);
assert.equal(ownGoals[0].id,publishedGoal);
assert.equal(ownGoals[0].kcal,goal.kcal);
const studentGoals=ok(await call("/rest/v1/efg_goals?select=id,student_id&student_id=eq."+users.studentA.id,{
 token:users.studentA.token
}),"Student still reads published goal while stale Coach PWA is blocked");
assert.equal(studentGoals.length,1);
const crossOrgGoals=ok(await call("/rest/v1/efg_goals?select=id,student_id&student_id=eq."+users.studentA.id,{
 token:users.coachB.token
}),"Other organization goal read checks RLS");
assert.deepEqual(crossOrgGoals,[],"Coach of another organization must not see A's goal");
const activeGuide=ok(await call("/rest/v1/efg_food_plans?select=student_id,guided_goal_id,approved_food_ids&student_id=eq."+users.studentA.id,{
 token:users.studentA.token
}),"Student can still read published guide after old Coach attempts");
assert.equal(activeGuide.length,1);
assert.equal(activeGuide[0].guided_goal_id,publishedGoal);
assert.deepEqual(activeGuide[0].approved_food_ids,["tofu_firm"]);
assert.equal(sql("select count(*) from public.efg_goals"),"1",
 "Old PWA cannot create a second goal or overwrite the active one");
assert.equal(sql("select count(*) from public.efg_notifications"),"1",
 "Old PWA failed requests cannot generate a second notification");
assert.equal(sql("select count(*) from public.efg_coach_plan_publish_receipts"),"1",
 "Legacy writes cannot invent or duplicate atomic receipts");

// NUT-59: an OLD Student PWA may continue saving day-to-day meals.
// A goal/guide grant revocation must not accidentally revoke diary access.
const logDate="2026-10-30";
const diaryBase="/rest/v1/efg_daily_logs";
const studentLog={student_id:users.studentA.id,log_day:logDate,
 meals:{desayuno:[{id:"egg",qty:2,unit:"units"}]},sports:[],skipped:{},totals:{}};
ok(await call(diaryBase,{method:"POST",token:users.studentA.token,body:studentLog}),
 "Legacy Student may still record own breakfast after Coach atomic publication");
const diaryA=ok(await call(diaryBase+"?select=student_id,log_day,meals&log_day=eq."+logDate,{
 token:users.studentA.token
}),"Student reads own historical-style diary via signed JWT");
assert.equal(diaryA.length,1);
assert.equal(diaryA[0].student_id,users.studentA.id);
assert.equal(diaryA[0].meals.desayuno[0].qty,2);
const diaryB=ok(await call(diaryBase+"?select=student_id,log_day,meals&log_day=eq."+logDate,{
 token:users.studentB.token
}),"Other organization cannot read Student A diary");
assert.deepEqual(diaryB,[]);
denied(await call(diaryBase,{method:"POST",token:users.studentB.token,
 body:{...studentLog,log_day:"2026-10-31"}}),
 "Student B cannot impersonate A when writing meals through legacy PWA");
// PostgREST may return 204 for a zero-row RLS UPDATE: enforce data integrity,
// not an assumed HTTP error.
const crossOrgPatch=await call(diaryBase+"?student_id=eq."+users.studentA.id+"&log_day=eq."+logDate,{
 method:"PATCH",token:users.studentB.token,body:{meals:{desayuno:[{id:"egg",qty:99}]}}
});
assert.ok(crossOrgPatch.status===204||crossOrgPatch.status===200||!crossOrgPatch.ok,
 "Cross-org update must be denied by RLS or have zero visible rows");
const unchangedLog=ok(await call(diaryBase+"?select=meals&log_day=eq."+logDate,{
 token:users.studentA.token
}),"RLS must leave Student A diary unchanged after attempted cross-org PATCH");
assert.equal(unchangedLog.length,1);
assert.equal(unchangedLog[0].meals.desayuno[0].qty,2,
 "Cross-org PATCH must never change another Student's diary");
ok(await call(diaryBase+"?student_id=eq."+users.studentA.id+"&log_day=eq."+logDate,{
 method:"PATCH",token:users.studentA.token,body:{meals:{desayuno:[{id:"egg",qty:3,unit:"units"}]}}
}),"Legacy Student may correct own breakfast");
const diaryAfter=ok(await call(diaryBase+"?select=student_id,meals&log_day=eq."+logDate,{
 token:users.studentA.token
}),"Own diary remains readable after stale PWA edits");
assert.equal(diaryAfter.length,1);
assert.equal(diaryAfter[0].meals.desayuno[0].qty,3);
assert.equal(sql("select count(*) from public.efg_daily_logs"),"1",
 "Student cross-org spoofing cannot insert or duplicate a diary");
assert.equal(sql("select count(*) from public.efg_goals"),"1",
 "Diary writes cannot create a new Coach goal");
assert.equal(sql("select count(*) from public.efg_notifications"),"1",
 "Diary writes cannot create a duplicate plan alert");
const reopened=ok(await rpc("efg_save_coach_plan_draft",users.coachA.token,{...payload,p_expected_revision:2}),"Published plan can be reopened privately");
assert.equal(Number(reopened),3,"New draft revision 3, old published plan remains active");
assert.equal(sql("select count(*) from public.efg_goals"),"1","Reopening may not modify active goal");
sql("update public.efg_consents set accepted=false where student_id="+uuid(users.studentA.id));
denied(await rpc("efg_publish_coach_plan_draft",users.coachA.token,{p_student:users.studentA.id,p_expected_revision:3,p_request_id:randomUUID()}),"Revoked consent must deny reopened revision");
assert.equal(sql("select count(*) from public.efg_goals"),"1","Failed publication cannot append goals");
assert.equal(sql("select count(*) from public.efg_notifications"),"1","Failed publication cannot create notification");
assert.equal(sql("select count(*) from public.efg_coach_plan_publish_receipts"),"1","Failed publication cannot create receipt");
// LEG-07: publishing a NEW fictitious Terms version must not reaccept it
// for existing identities. Their unchanged Privacy history is preserved.
const nextTermsId=randomUUID();
sql("update public.efg_legal_documents set status='retired',retired_at=now() where id="+uuid(termsId));
sql("insert into public.efg_legal_documents(id,kind,version,content,sha256,locale,published_at,effective_at,status) "+
 "select "+uuid(nextTermsId)+",'terms','synthetic-2',x.body,"+
 "encode(sha256(convert_to(x.body,'UTF8')),'hex'),'es-AR',now(),now(),'published' "+
 "from (select repeat('SECOND SYNTHETIC TERMS VERSION ONLY. ',5) as body) x");
sql("notify pgrst,'reload schema';");
const renewed=ok(await legalStatus(users.coachA.token),"Fresh Terms version legal status");
assert.equal(renewed.length,2);
assert.equal(renewed.find(x=>x.kind==="terms").accepted,false,"New Terms must not be autoconfirmed");
assert.equal(renewed.find(x=>x.kind==="privacy").accepted,true,"Existing privacy acknowledgment remains valid");
denied(await acceptLegal(users.coachA.token,[termsId]),"Cannot accept retired Terms through signed RPC");
assert.equal(Number(ok(await acceptLegal(users.coachA.token,[nextTermsId]),"Reaccept only updated Terms")),1);
assert.ok(ok(await legalStatus(users.coachA.token),"Terms reaccept status").every(x=>x.accepted));
assert.equal(sql("select count(*) from public.efg_legal_acceptances"),"5","Never overwrite historical legal acceptance");
assert.equal(ok(await legalStatus(users.studentA.token),"Student A must reaccept terms").find(x=>x.kind==="terms").accepted,false);
assert.equal(ok(await legalStatus(users.studentB.token),"Student B remains unaccepted").filter(x=>x.accepted).length,0);
console.log("PASS NUT-53/NUT-54 LOCAL AUTH: signed GoTrue JWT role isolation; private draft CAS 409; synthetic five-meal goal+guide+access+notification+receipt atomic publication, replay idempotence, old-plan preservation, revoked-consent rollback. Food and legal documents FICTITIOUS, but legal acceptance tested via signed local GoTrue JWT and RLS. No production, no medical/legal sign-off.");
