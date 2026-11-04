import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_PATH);
const db=new PGlite();
const coach='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222',org='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
await db.exec(`create role authenticated; create schema auth; create schema efg_private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('qa.actor',true),'')::uuid $$;
create table efg_profiles(user_id uuid,organization_id uuid,role text,active boolean);
create table efg_organizations(id uuid,coach_id uuid,status text,is_test boolean,paid_through date);
create table efg_consents(student_id uuid,organization_id uuid,accepted boolean);
create table efg_pilot_participation_receipts(student_id uuid,organization_id uuid,version text,participation_accepted boolean,sharing_accepted boolean,revoked_at timestamptz);
create table efg_student_plan_access(student_id uuid,organization_id uuid,coach_id uuid,status text);
insert into efg_profiles values('${coach}','${org}','coach',true),('${student}','${org}','student',true);
insert into efg_organizations values('${org}','${coach}','trial',true,null);
insert into efg_consents values('${student}','${org}',true);
insert into efg_pilot_participation_receipts values('${student}','${org}','coach_pilot_2026_demo1',true,true,null);
insert into efg_student_plan_access values('${student}','${org}','${coach}','published');
alter table efg_pilot_participation_receipts enable row level security;
create policy owner_receipt on efg_pilot_participation_receipts for select to authenticated using(student_id=auth.uid());
alter table efg_student_plan_access enable row level security;
grant usage on schema public,auth,efg_private to authenticated;
grant select on efg_profiles,efg_pilot_participation_receipts,efg_student_plan_access to authenticated;`);
await db.exec(readFileSync(new URL('./authorization-helpers-snapshot.sql',import.meta.url),'utf8'));
await db.exec(`create policy efg_access_coach_linked on efg_student_plan_access for select to authenticated using(coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id) and exists(select 1 from efg_pilot_participation_receipts r where r.student_id=efg_student_plan_access.student_id and r.organization_id=efg_student_plan_access.organization_id and r.version='coach_pilot_2026_demo1' and r.participation_accepted and r.sharing_accepted and r.revoked_at is null));`);
async function count(actor,table='efg_student_plan_access') {await db.exec(`set role authenticated; set qa.actor='${actor}';`);const r=await db.query(`select count(*)::int n from ${table}`);await db.exec('reset role');return r.rows[0].n;}
assert.equal(await count(coach),0,'Reproduce nested RLS hiding published access');
const before=(await db.query('select * from efg_student_plan_access')).rows;
await db.exec(readFileSync(new URL('./access_read_fix_NOT_APPLIED.sql',import.meta.url),'utf8'));
assert.equal(await count(coach),1,'Authorized coach sees published status');
assert.equal(await count(coach,'efg_pilot_participation_receipts'),0,'Receipts remain private');
assert.equal(await count(other),0,'Unrelated coach denied');
for(const [change,restore] of [
 ['update efg_consents set accepted=false','update efg_consents set accepted=true'],
 ['update efg_pilot_participation_receipts set sharing_accepted=false','update efg_pilot_participation_receipts set sharing_accepted=true'],
 ['update efg_pilot_participation_receipts set revoked_at=now()','update efg_pilot_participation_receipts set revoked_at=null'],
 [`update efg_profiles set active=false where user_id='${student}'`,`update efg_profiles set active=true where user_id='${student}'`],
 [`update efg_profiles set organization_id='${other}' where user_id='${student}'`,`update efg_profiles set organization_id='${org}' where user_id='${student}'`]
]){await db.exec(change);assert.equal(await count(coach),0,change);await db.exec(restore);}
assert.deepEqual((await db.query('select * from efg_student_plan_access')).rows,before,'No plan rows modified');
await assert.rejects(db.exec(readFileSync(new URL('./access_read_fix_NOT_APPLIED.sql',import.meta.url),'utf8')),/Access policy drift/);
console.log('PASS isolated PG17: reproduce nested RLS defect; existing helper restores linked consented coach read; receipts hidden; other coach, revoked sharing, revoked consent, inactive and transferred student denied; rows preserved; reinstall rejected. NOT APPLIED hosted.');
await db.close();
