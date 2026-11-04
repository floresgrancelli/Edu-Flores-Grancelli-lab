// Invoked by p29-qa-scope-pglite.mjs. Exact hosted functions, synthetic dependencies.
import assert from 'node:assert/strict';
import {installSql} from '../scripts/p29-qa-scope-bundle.mjs';
import {readFileSync} from 'node:fs';
export async function testConsumers(db,{student,coach,org,other}) {
 const run=s=>db.exec(s);
 const defs=JSON.parse(readFileSync(new URL('./evidence/p29f-hosted-function-baseline.json',import.meta.url)));
 const patch=readFileSync(new URL('../migrations/20261104_qa_scope_consumers_NOT_APPLIED.sql',import.meta.url),'utf8');
 await run(`create function auth.role() returns text language sql as $$select coalesce(nullif(current_setting('test.role',true),''),'authenticated')$$;
 create table efg_private.coach_release_switches(switch_key text primary key,enabled boolean);
 insert into efg_private.coach_release_switches values('pilot_coach_atomic_publication',false),('pilot_health_bound_publication',false),('pilot_student_diary_write_gate',false);
 create table efg_coach_relaunch_intakes(student_id uuid);
 create table efg_coach_plan_publish_receipts(student_id uuid);
 create table efg_coach_plan_drafts(student_id uuid,organization_id uuid,coach_id uuid,status text,guide_proposal jsonb);
 create table efg_private.efg_coach_health_intakes(student_id uuid,organization_id uuid,shared_at timestamptz,consent_accepted_at timestamptz);
 create table efg_consents(student_id uuid,organization_id uuid,accepted boolean);
 create function efg_private.coach_has_student(uuid) returns boolean language sql as $$select false$$;
 create function efg_coach_pilot_entry_status() returns jsonb language sql as $$select case when current_setting('test.ready',true)='yes' then '{"route":"ready","can_log_meals":true}'::jsonb else '{"route":"verify","can_log_meals":false}'::jsonb end$$;
 create table efg_daily_logs(id integer,student_id uuid);`);
 for(const f of defs) await run(f.definition);
 // Registry must be empty at installation; keep the existing test enrollment for later.
 await run('create temp table enrollment as table efg_private.p29_qa_release_scope;drop function efg_private.p29_qa_scope_required(uuid,text);drop table efg_private.p29_qa_release_scope;');
 // Deliberate drift must fail and roll back any earlier function replacement.
 const before=(await db.query("select pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure) d")).rows[0].d;
 await run('begin');
 await run("create or replace function efg_private.coach_diary_write_gate() returns trigger language plpgsql as $$begin return new;end$$");
 await assert.rejects(()=>run(installSql),/Diary function drift/);await run('rollback');
 assert.equal((await db.query("select to_regclass('efg_private.p29_qa_release_scope') v")).rows[0].v,null,'Whole bundle rollback removes registry');
 assert.equal((await db.query("select pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure) d")).rows[0].d,before);
 await run(installSql);
 await run(`insert into efg_private.p29_qa_release_scope select * from enrollment;
 create trigger health before update on efg_coach_plan_drafts for each row execute function efg_private.p28_require_current_health_source();
 create trigger diary before insert or update on efg_daily_logs for each row execute function efg_private.coach_diary_write_gate();
 insert into efg_coach_plan_drafts values('${student}','${org}','${coach}','draft','{}'),('${other}','${org}','${coach}','draft','{}');`);
 const publish=id=>run(`select efg_publish_coach_plan_draft_atomic('${id}',1,'55555555-5555-4555-8555-555555555555')`);
 await assert.rejects(()=>publish(other),/has not been activated/);
 await assert.rejects(()=>publish(student),/Invalid or unauthorized Coach publication/);
 await assert.rejects(()=>run(`update efg_coach_plan_drafts set status='published' where student_id='${student}'`),/current shared health declaration required/);
 await run(`update efg_coach_plan_drafts set status='published' where student_id='${other}'`);
 await run(`select set_config('test.actor','${student}',false)`);
 await assert.rejects(()=>run(`insert into efg_daily_logs values(1,'${student}')`),/todavía debe publicar/);
 await run(`select set_config('test.ready','yes',false);insert into efg_daily_logs values(1,'${student}')`);
 await assert.rejects(()=>run(`update efg_daily_logs set student_id='${other}' where id=1`),/Only the signed student/);
 await run(`select set_config('test.actor','${other}',false)`);
 await assert.rejects(()=>run(`insert into efg_daily_logs values(2,'${student}')`),/signed actor invalid/);
 await run(`select set_config('test.ready','no',false);insert into efg_daily_logs values(3,'${other}')`);
 await run(`select set_config('test.actor','${student}',false);update efg_private.p29_qa_release_scope set revoked_at=clock_timestamp()`);
 await assert.rejects(()=>run(`insert into efg_daily_logs values(4,'${student}')`),/expired or revoked/);
 assert.equal((await db.query('select count(*) n from efg_daily_logs')).rows[0].n,2);
 assert.equal((await db.query('select count(*) n from efg_private.coach_release_switches where enabled')).rows[0].n,0);
 const changed=(await db.query("select pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure) d")).rows[0].d;
 assert.equal(changed.replace("\n if efg_private.p29_qa_scope_required(p_student,'coach') then v_enabled:=true; end if;",''),before,'All preexisting atomic validations remain byte-for-byte intact');
 console.log('PASS P29F integrated consumers: exact hosted function hashes, drift rollback, scoped atomic entry, health mandatory, diary ready gate, owner change/foreign actor/revocation denied, non-QA legacy unchanged, globals OFF. Synthetic dependencies, not full publication/JWT/concurrency.');
}
