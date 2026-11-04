// Exact candidate trigger, disposable PostgreSQL only. No hosted credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.PGHOST,'127.0.0.1');
assert.equal(process.env.PGDATABASE,'efg_p29_access');
for(const key of ['PGHOSTADDR','PGSERVICE','PGOPTIONS','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD'])assert.ok(!process.env[key]);
function sql(input){const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
assert.ok(sql('show server_version_num').startsWith('17'));
sql(`create schema efg_private;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create table public.efg_organizations(id uuid primary key,coach_id uuid);
create table public.efg_profiles(user_id uuid primary key,role text,organization_id uuid);
create table public.efg_student_plan_access(student_id uuid primary key,organization_id uuid,coach_id uuid,status text);
insert into efg_organizations values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into efg_profiles values('33333333-3333-4333-8333-333333333333','student','11111111-1111-4111-8111-111111111111');
insert into efg_student_plan_access values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','published');`);
const before=sql('select row_to_json(a) from efg_student_plan_access a');
sql(readFileSync(new URL('../migrations/20261104_new_student_pending_access_NOT_APPLIED.sql',import.meta.url),'utf8'));
assert.equal(sql('select row_to_json(a) from efg_student_plan_access a'),before,'Install preserves history');
sql(`insert into efg_profiles values('44444444-4444-4444-8444-444444444444','student',null);
update efg_profiles set organization_id='11111111-1111-4111-8111-111111111111' where user_id='44444444-4444-4444-8444-444444444444';
insert into efg_profiles values('55555555-5555-4555-8555-555555555555','student','11111111-1111-4111-8111-111111111111');
insert into efg_profiles values('66666666-6666-4666-8666-666666666666','coach','11111111-1111-4111-8111-111111111111');
update efg_profiles set role=role;`);
assert.equal(sql("select count(*) from efg_student_plan_access where status='pending'"),'2');
assert.equal(sql("select row_to_json(a) from efg_student_plan_access a where status='published'"),before);
assert.equal(sql("select count(*) from efg_student_plan_access where student_id='66666666-6666-4666-8666-666666666666'"),'0');
sql(`begin;insert into efg_profiles values('77777777-7777-4777-8777-777777777777','student','11111111-1111-4111-8111-111111111111');rollback;`);
assert.equal(sql('select count(*) from efg_student_plan_access'),'3','Profile and pending row roll back together');
console.log('PASS P29 PG17: student insert, delayed assignment, repeat edits, no coach access, published history unchanged, rollback. Synthetic only.');
