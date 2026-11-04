// Exact candidate trigger, disposable PostgreSQL only. No hosted credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.PGHOST,'127.0.0.1');
assert.equal(process.env.PGPORT,'5432');
assert.equal(process.env.PGDATABASE,'efg_p29_access');
for(const key of ['PGHOSTADDR','PGSERVICE','PGOPTIONS','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD'])assert.ok(!process.env[key]);
function sql(input){const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
assert.equal(sql('select current_database()'),'efg_p29_access');
assert.ok(sql('show server_version_num').startsWith('17'));
sql(`create schema efg_private;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create table public.efg_organizations(id uuid primary key,coach_id uuid);
-- Match the hosted profile_org_role constraint observed on 2026-11-04.
create table public.efg_profiles(user_id uuid primary key,role text not null check(role in ('student','coach','admin')),
 organization_id uuid references public.efg_organizations(id),
 constraint profile_org_role check((role='student' and organization_id is not null) or (role<>'student' and organization_id is null)));
create table public.efg_student_plan_access(student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),coach_id uuid not null,
 status text not null default 'pending' check(status in ('pending','published','paused')));
insert into efg_organizations values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into efg_profiles values('33333333-3333-4333-8333-333333333333','student','11111111-1111-4111-8111-111111111111');
insert into efg_student_plan_access values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','published');`);
const before=sql('select row_to_json(a) from efg_student_plan_access a');
sql(readFileSync(new URL('../migrations/20261104_new_student_pending_access_NOT_APPLIED.sql',import.meta.url),'utf8'));
assert.equal(sql('select row_to_json(a) from efg_student_plan_access a'),before,'Install preserves history');
sql(`insert into efg_profiles values('44444444-4444-4444-8444-444444444444','coach',null);
update efg_profiles set role='student',organization_id='11111111-1111-4111-8111-111111111111' where user_id='44444444-4444-4444-8444-444444444444';
insert into efg_profiles values('55555555-5555-4555-8555-555555555555','student','11111111-1111-4111-8111-111111111111');
insert into efg_profiles values('66666666-6666-4666-8666-666666666666','coach',null);
update efg_profiles set role=role;`);
assert.equal(sql("select count(*) from efg_student_plan_access where status='pending'"),'2');
assert.equal(sql("select row_to_json(a) from efg_student_plan_access a where status='published'"),before);
assert.equal(sql("select count(*) from efg_student_plan_access where student_id='66666666-6666-4666-8666-666666666666'"),'0');
sql(`begin;insert into efg_profiles values('77777777-7777-4777-8777-777777777777','student','11111111-1111-4111-8111-111111111111');rollback;`);
assert.equal(sql('select count(*) from efg_student_plan_access'),'3','Profile and pending row roll back together');
// Paused access, like published access, must remain byte-for-byte unchanged.
sql("update efg_student_plan_access set status='paused' where student_id='55555555-5555-4555-8555-555555555555'");
const paused=sql("select row_to_json(a) from efg_student_plan_access a where status='paused'");
sql('update efg_profiles set role=role');
assert.equal(sql("select row_to_json(a) from efg_student_plan_access a where status='paused'"),paused);
assert.equal(sql("select has_function_privilege('anon','efg_private.p29_new_student_pending_access()','EXECUTE')"),'f');
assert.equal(sql("select has_function_privilege('authenticated','efg_private.p29_new_student_pending_access()','EXECUTE')"),'f');
assert.equal(sql("select count(*) from efg_student_plan_access where status='pending' and organization_id='11111111-1111-4111-8111-111111111111' and coach_id='22222222-2222-4222-8222-222222222222'"),'1');
console.log('PASS P29 PG17: student insert, delayed assignment, repeat edits, no coach access, published/paused history unchanged, rollback, revoked direct execution, hosted role/org constraint. Synthetic only; not full hosted schema parity.');
