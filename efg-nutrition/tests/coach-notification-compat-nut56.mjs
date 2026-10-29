// NUT-56: verify pre-existing production-style notification triggers still
// notify for legacy *database* operations outside the atomic RPC. LOCAL ONLY.
// This script runs after the NUT-53/54 signed-JWT tests and NUT-55 local restore.
// Direct REST writes remain revoked: this privileged SQL is synthetic trigger QA.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined,"Hosted management credentials forbidden");
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined,"Hosted DB credentials forbidden");
const settings=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV||"","utf8")
 .split(/\r?\n/).filter(s=>s.includes("=")).map(s=>{
  const idx=s.indexOf("=");return [s.slice(0,idx),s.slice(idx+1).trim().replace(/^['"]|['"]$/g,"")];
 }));
const url=new URL(settings.API_URL||"");
assert.equal(url.protocol,"http:");assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"54321");
const pgEnv={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGUSER:"postgres",PGPASSWORD:"postgres",PGDATABASE:"postgres"};
function sql(query){
 const r=spawnSync("psql",["-X","-A","-t","-v","ON_ERROR_STOP=1","-c",query],{env:pgEnv,encoding:"utf8",timeout:25000});
 if(r.status!==0)throw Error("LOCAL SQL FAILED "+String(r.stderr||r.stdout).slice(0,1400));
 return r.stdout.trim();
}
function quoteUUID(v){assert.match(v,/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);return "'"+v+"'";}
const coach=sql("select user_id from public.efg_profiles where nickname='Coach B' and role='coach'");
const student=sql("select user_id from public.efg_profiles where nickname='Student B' and role='student'");
const c=quoteUUID(coach),st=quoteUUID(student);
assert.equal(sql("select count(*) from public.efg_notifications where recipient_id="+st),"0",
 "Student B must begin with no notifications");
assert.equal(sql("select count(*) from public.efg_notifications"),"1",
 "Atomic publish should create exactly ONE unified student A notification");
const insertGoal=sql("begin;select pg_catalog.set_config('request.jwt.claim.sub',"+c+",true);"+
 "insert into public.efg_goals(student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g)"+
 " values("+st+","+c+",'maintenance',2000,120,250,70,30) returning id;commit;");
const ids=insertGoal.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig)||[];
assert.equal(ids.length,1,"Expected single synthetic goal ID");
const goal=quoteUUID(ids[0]);
assert.equal(sql("select count(*) from public.efg_notifications where recipient_id="+st+" and event_key like 'goal:%'"),"1",
 "Old goal trigger must still notify outside atomic RPC");
const guide={kind:"five_meal_example",version:1,meals:["desayuno","media_manana","almuerzo","merienda","cena"]
 .map(slot=>({slot,items:[{id:"tofu_firm",unit:"g",qty:100,k:.8,p:.1,c:.03,f:.04,fi:.02}]}))};
sql("begin;select pg_catalog.set_config('request.jwt.claim.sub',"+c+",true);"+
 "insert into public.efg_food_plans(student_id,coach_id,approved_food_ids,guided_plan,guided_goal_id,guided_plan_approved_at)"+
 " values("+st+","+c+",array['tofu_firm'],'"+JSON.stringify(guide)+"'::jsonb,"+goal+",pg_catalog.clock_timestamp());commit;");
assert.equal(sql("select count(*) from public.efg_notifications where recipient_id="+st+" and event_key like 'guide:%'"),"1",
 "Old guide trigger must still notify outside atomic RPC");
assert.equal(sql("select count(*) from public.efg_notifications"),"3",
 "One unified atomic notice + two traditional notifications from synthetic independent writes");
assert.equal(sql("select count(*) from public.efg_coach_plan_publish_receipts"),"1",
 "Legacy trigger check must not publish or duplicate atomic receipts");
assert.equal(sql("select count(*) from public.efg_goals"),"2",
 "One active Coach A goal + one independent Coach B fixture goal");
assert.equal(sql("select count(*) from public.efg_food_plans where guided_plan is not null"),"2");
console.log("PASS NUT-56: Atomic publication emits exactly one unified notice even with legacy triggers; independent legacy goal/guide operations still create their two original alerts. All fixtures local/fictitious; direct old-client writes remain revoked and production untouched.");
