// Disposable PostgreSQL17 verification of the additive WALK-02 schema.
// Uses the CI postgres:17 service ONLY; never connects to Supabase hosted.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
function sql(query,{expectFailure=false}={}){
 assert.equal(process.env.GITHUB_ACTIONS,'true','Never run this against an operator database');
 assert.equal(process.env.PGHOST,'127.0.0.1');
 assert.equal(process.env.PGPORT,'5432');
 assert.equal(process.env.PGDATABASE,'postgres');
 assert.equal(process.env.PGUSER,'postgres');
 assert.equal(process.env.PGPASSWORD,'local_qa_only');
 assert.ok(!process.env.SUPABASE_ACCESS_TOKEN,'No hosted token permitted');
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:20000});
 if(expectFailure){assert.notEqual(r.status,0,'Constraint must refuse unsafe value');return r.stderr||'';}
 assert.equal(r.status,0,(r.stderr||'SQL error').slice(-650));return r.stdout.trim();
}
assert.ok(sql('show server_version_num').startsWith('17'),'Must test PostgreSQL 17');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const snapshotColumns='student_id,activity_day,steps,exercise_minutes,kind,walking_pace,walking_height_cm,walking_weight_kg';
sql(`create table public.efg_activities (
 student_id uuid not null,activity_day date not null,
 steps integer,exercise_minutes integer,kind text,walking_pace text,
 walking_height_cm numeric(5,1),walking_weight_kg numeric(5,1),
 primary key(student_id,activity_day));
 alter table public.efg_activities enable row level security;
 create policy activity_own_select on public.efg_activities for select
 using(student_id=current_setting('app.current_user',true)::uuid);
 create policy activity_own_update on public.efg_activities for update
 using(student_id=current_setting('app.current_user',true)::uuid)
 with check(student_id=current_setting('app.current_user',true)::uuid);
 insert into public.efg_activities(student_id,activity_day,steps,exercise_minutes,kind,walking_pace,walking_height_cm,walking_weight_kg)
 values('${uid}','2026-11-01',8000,30,'Caminata','moderate',174.0,80.0);`);
const before=sql(`select row_to_json(x)::text from (select ${snapshotColumns} from public.efg_activities) x`);
const beforePolicies=sql(`select md5(string_agg(to_jsonb(p)::text,'|' order by policyname)) from pg_policies p where schemaname='public' and tablename='efg_activities'`);
const beforeRls=sql("select relrowsecurity from pg_class where oid='public.efg_activities'::regclass");
const migration=readFileSync('efg-nutrition/docs/NCC_WALKING_V2_STAGING_ONLY.sql','utf8');
assert.equal((migration.match(/^begin;$/gm)||[]).length,1);
assert.equal((migration.match(/^commit;$/gm)||[]).length,1);
sql(migration);
const after=sql(`select row_to_json(x)::text from (select ${snapshotColumns} from public.efg_activities) x`);
assert.equal(after,before,'Legacy data must be exactly preserved');
assert.equal(sql(`select count(*) from public.efg_activities where walking_distance_km is null and walking_duration_minutes is null and walking_avg_heart_rate_bpm is null`),'1');
assert.equal(sql(`select md5(string_agg(to_jsonb(p)::text,'|' order by policyname)) from pg_policies p where schemaname='public' and tablename='efg_activities'`),beforePolicies,'RLS policy drift');
assert.equal(sql("select relrowsecurity from pg_class where oid='public.efg_activities'::regclass"),beforeRls,'RLS disabled');
sql(`update public.efg_activities set walking_distance_km=5,walking_duration_minutes=60,walking_avg_heart_rate_bpm=118
 where student_id='${uid}';`);
assert.equal(sql(`select concat(walking_distance_km,'/',walking_duration_minutes,'/',walking_avg_heart_rate_bpm)
 from public.efg_activities where student_id='${uid}'`),'5.00/60/118');
const bad=[
 'update public.efg_activities set walking_distance_km=-1',
 'update public.efg_activities set walking_distance_km=101',
 'update public.efg_activities set walking_duration_minutes=0',
 'update public.efg_activities set walking_duration_minutes=1441',
 'update public.efg_activities set walking_avg_heart_rate_bpm=25',
 'update public.efg_activities set walking_avg_heart_rate_bpm=240'
];
for(const q of bad)assert.match(sql(q+';', {expectFailure:true}),/violates check constraint/);
assert.equal(sql(`select count(*) from public.efg_activities where walking_distance_km=5 and walking_duration_minutes=60 and walking_avg_heart_rate_bpm=118`),'1','Rejected writes must not mutate valid row');
assert.match(sql(migration,{expectFailure:true}),/columns already exist|already exists/,'Re-applying must stop instead of altering data');
console.log('PASS WALK-02 PG17: optional columns, legacy data and RLS unchanged, exact 3-field readback, 6 invalid values rejected, repeat migration stops.');
