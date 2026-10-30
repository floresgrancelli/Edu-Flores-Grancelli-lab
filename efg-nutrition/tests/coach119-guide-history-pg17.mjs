// COACH119: REAL PostgreSQL-17 behavioral regression on fully synthetic data.
// Runs exclusively in disposable GitHub Actions database, never Supabase hosted.
// Unlike static inspection, this executes the exact archive schema and trigger
// extracted from the candidate SQL and verifies history, rollback, and privacy.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.PGHOST,'127.0.0.1');
assert.equal(process.env.PGPORT,'5432');
assert.equal(process.env.PGDATABASE,'efg_coach119_history');
for(const key of ['PGHOSTADDR','PGSERVICE','PGOPTIONS','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD'])
 assert.ok(!process.env[key],key+' forbidden in disposable QA');
function exec(sql,expectedSuccess=true){
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{
  input:sql,encoding:'utf8',timeout:30000,maxBuffer:1024*1024
 });
 if(expectedSuccess)assert.equal(r.status,0,(r.stderr||'Postgres error').slice(-1500));
 else assert.notEqual(r.status,0,'A required deny operation unexpectedly succeeded');
 return (r.stdout||'').trim();
}
assert.equal(exec('select current_database()'),'efg_coach119_history');
assert.ok(exec('show server_version_num').startsWith('17'), 'PostgreSQL 17 required');
const source=readFileSync(new URL('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql',import.meta.url),'utf8');
const start=source.indexOf('create table efg_private.coach_guide_history');
const end=source.indexOf('-- Preserve exactly the two existing legacy notifications',start);
assert.ok(start>0&&end>start,'Exact COACH119 ledger/trigger section not found');
const actualArchiveSQL=source.slice(start,end);
assert.ok(actualArchiveSQL.includes('create trigger coach119_archive_previous_approved_guide'));
const foodFunctionStart=source.indexOf('create function efg_private.coach119_reviewed_food_ids');
const foodFunctionEnd=source.indexOf('create function public.efg_publish_coach_plan_draft_atomic',foodFunctionStart);
assert.ok(foodFunctionStart>0&&foodFunctionEnd>foodFunctionStart,'Actual candidate selected-food validator missing');
const exactFoodFunction=source.slice(foodFunctionStart,foodFunctionEnd);
const student='11111111-1111-4111-8111-111111111111';
const coach='22222222-2222-4222-8222-222222222222';
const goal='33333333-3333-4333-8333-333333333333';
exec(`do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then
  create role authenticated nologin;
 end if;
 if not exists(select 1 from pg_roles where rolname='anon') then
  create role anon nologin;
 end if;
end $roles$;
create schema auth;
create schema efg_private;
create table auth.users(id uuid primary key);
create table public.efg_profiles(user_id uuid primary key);
create table public.efg_goals(id uuid primary key);
create table public.efg_food_plans(
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 coach_id uuid not null references auth.users(id),
 approved_food_ids text[] not null,
 guided_plan jsonb,
 guided_goal_id uuid references public.efg_goals(id),
 guided_plan_approved_at timestamptz,
 updated_at timestamptz not null default now()
);
insert into auth.users(id) values ('${coach}');
insert into public.efg_profiles(user_id) values ('${student}');
insert into public.efg_goals(id) values ('${goal}');
`);
exec(actualArchiveSQL);
// Test exact SQL selected-catalog validator on new + existing synthetic students.
exec(`create table efg_private.coach_reviewed_foods(
 food_id text not null, evidence_status text not null,
 reviewed_by uuid,reviewed_at timestamptz,expires_at timestamptz,source_url text
);
insert into efg_private.coach_reviewed_foods values
 ('food-a','reviewed','${coach}',now()-interval '1 day',now()+interval '1 year','https://example.org/a'),
 ('food-b','reviewed','${coach}',now()-interval '1 day',now()+interval '1 year','https://example.org/b'),
 ('food-c','reviewed','${coach}',now()-interval '1 day',now()+interval '1 year','https://example.org/c'),
 ('expired','reviewed','${coach}',now()-interval '2 days',now()-interval '1 day','https://example.org/expired');
`);
exec(exactFoodFunction);
assert.equal(exec("select has_function_privilege('anon','efg_private.coach119_reviewed_food_ids(jsonb)','EXECUTE')"),'f');
assert.equal(exec("select has_function_privilege('authenticated','efg_private.coach119_reviewed_food_ids(jsonb)','EXECUTE')"),'f');
const guideSlots=['desayuno','media_manana','almuerzo','merienda','cena'];
const fixtureGuide=(approvedFoodIds,guideFoodId='food-a')=>JSON.stringify({
 kind:'five_meal_example',version:1,approvedFoodIds,
 meals:guideSlots.map(slot=>({slot,items:[{id:guideFoodId}]}))
});
const checked=(ids,ingredient='food-a')=>
 "select array_to_string(efg_private.coach119_reviewed_food_ids('"+
 fixtureGuide(ids,ingredient)+"'::jsonb),',')";
assert.equal(exec(checked(['food-a','food-b','food-c'])),'food-a,food-b,food-c');
for(const bad of [
 checked(['food-a','unreviewed']),
 checked(['food-a','expired']),
 checked(['food-a','food-a']),
 checked(['food-b']),
 checked([]),
 checked(['food-a','food-b'],'food-not-selected'),
 "select efg_private.coach119_reviewed_food_ids('"+
 JSON.stringify({kind:'five_meal_example',version:1,meals:[]})+"'::jsonb)"
])exec(bad,false);
const newStudent='55555555-5555-4555-8555-555555555555';
exec(`insert into public.efg_profiles(user_id) values ('${newStudent}');
insert into public.efg_food_plans(
 student_id,coach_id,approved_food_ids,guided_plan,guided_goal_id,guided_plan_approved_at
) values (
 '${newStudent}','${coach}',
 efg_private.coach119_reviewed_food_ids('${fixtureGuide(['food-a','food-b','food-c'])}'::jsonb),
 '{"version":"new-student"}'::jsonb,'${goal}',now()
)`);
assert.equal(exec("select cardinality(approved_food_ids) from public.efg_food_plans where student_id='"+newStudent+"'"),'3',
 'A new student must receive all explicitly Coach-approved reviewed foods, not only one guide ingredient');
assert.equal(exec("select count(*) from efg_private.coach_guide_history where student_id='"+newStudent+"'"),'0');
exec(`delete from public.efg_profiles where user_id='${newStudent}'`);

exec(`insert into public.efg_food_plans(
 student_id,coach_id,approved_food_ids,guided_plan,guided_goal_id,guided_plan_approved_at
) values (
 '${student}','${coach}',array['food-a'],'{"version":"A"}'::jsonb,
 '${goal}','2026-10-30T09:00:00Z'
)`);
assert.equal(exec('select count(*) from efg_private.coach_guide_history'),'0');
exec(`update public.efg_food_plans set guided_plan='{"version":"B"}'::jsonb,
 guided_plan_approved_at='2026-10-30T10:00:00Z' where student_id='${student}'`);
assert.equal(exec('select count(*) from efg_private.coach_guide_history'),'1');
assert.equal(exec("select guided_plan->>'version' from efg_private.coach_guide_history"),'A');
exec(`update public.efg_food_plans set approved_food_ids=array['food-b']
 where student_id='${student}'`);
assert.equal(exec("select string_agg(guided_plan->>'version',',' order by id) from efg_private.coach_guide_history"),'A,B');
exec(`update public.efg_food_plans set approved_food_ids=array['food-b']
 where student_id='${student}'`);
assert.equal(exec('select count(*) from efg_private.coach_guide_history'),'2',
 'No-op update must not duplicate history');
// Exercise the EXACT ON CONFLICT clause from the COACH119 hosted candidate.
// Existing Coach approvals MUST NOT collapse to the few foods in a new guide.
const upsertMatch=source.match(/on conflict\(student_id\) do update set[\s\S]*?updated_at=excluded\.updated_at;/);
assert.ok(upsertMatch,'Exact candidate upsert clause unavailable');
exec(`insert into public.efg_food_plans(
 student_id,coach_id,approved_food_ids,guided_plan,guided_goal_id,
 guided_plan_approved_at,updated_at
) values(
 '${student}','${coach}',array['food-c'],'{"version":"C"}'::jsonb,
 '${goal}','2026-10-30T11:00:00Z',now()
)
${upsertMatch[0]}`);
assert.equal(exec("select array_to_string(approved_food_ids,',') from public.efg_food_plans"),
 'food-b,food-c','Coach-approved old foods and verified guide items must both survive');
assert.equal(exec("select guided_plan->>'version' from public.efg_food_plans"),'C');
assert.equal(exec('select count(*) from efg_private.coach_guide_history'),'3',
 'Prior approved guide must archive when a new atomic guide publishes');
const tx=exec(`begin;
 update public.efg_food_plans set guided_plan='{"version":"D"}'::jsonb
 where student_id='${student}';
 select count(*) from efg_private.coach_guide_history;
 rollback;`);
assert.match(tx,/4/,'Update must archive inside the transaction');
assert.equal(exec('select count(*) from efg_private.coach_guide_history'),'3',
 'Rollback must also roll back the archive');
assert.equal(exec("select guided_plan->>'version' from public.efg_food_plans"),'C');
exec("set role authenticated; select * from efg_private.coach_guide_history;",false);
assert.equal(exec("select has_table_privilege('authenticated','efg_private.coach_guide_history','SELECT')"),'f');
assert.equal(exec("select has_table_privilege('anon','efg_private.coach_guide_history','SELECT')"),'f');
exec(`delete from public.efg_profiles where user_id='${student}'`);
assert.equal(exec('select count(*) from efg_private.coach_guide_history'),'0',
 'Approved deletion of student must remove private historic rows as well');
console.log('PASS COACH119 REAL PG17: new-student full catalog + reviewed/expired/missing/duplicate denials, approved guide archive, food changes, no duplicates, rollback, anon/auth deny, authorized student deletion; ONLY synthetic fixtures.');
