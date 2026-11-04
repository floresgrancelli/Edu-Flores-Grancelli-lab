import assert from 'node:assert/strict';
import fs from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../docs/p28-recovery/P29W_sources_candidate_NOT_APPLIED.sql');
const baseline=read('./evidence/p29w-hosted-atomic.sql');
const q=s=>"'"+s.replaceAll("'","''")+"'";
const coach='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema efg_private;
create table auth.users(id uuid primary key);insert into auth.users values('${coach}');
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
create function efg_private.coach_has_student(uuid) returns boolean language sql as $$select auth.uid()='${coach}'::uuid and $1='${student}'::uuid$$;
create table efg_private.p29_qa_release_scope(student_id uuid primary key);
create table efg_coach_relaunch_intakes(student_id uuid);create table efg_coach_plan_drafts(student_id uuid);
create table efg_coach_plan_publish_receipts(student_id uuid);`);
await db.exec(baseline);
// Guard must roll back registry and RPC when the hosted baseline differs.
await db.exec("create or replace function public.efg_publish_coach_plan_draft_atomic(p_student uuid,p_expected_revision bigint,p_request_id uuid) returns uuid language plpgsql as $$begin return null;end$$");
await assert.rejects(()=>db.exec(sql),/drift/);await db.exec('rollback');
assert.equal((await db.query("select to_regclass('efg_private.coach_pilot_reviewed_foods') v")).rows[0].v,null);
await db.exec(baseline);await db.exec(sql);
assert.equal((await db.query('select count(*) n from efg_private.coach_pilot_reviewed_foods')).rows[0].n,0);
const fixture=JSON.parse(read('./evidence/p29c-qa-guide-v1.json'));
const proposal=JSON.parse(read('../docs/p29h-review/proposal.json'));
const {applyPilotReviewedSources}=await import('../pilot/coach-reviewed-sources.js');
const rows=proposal.rows.map(r=>({id:r.foodId,name:r.proposedIdentity,unit:r.unit,
 ...Object.fromEntries(Object.entries(r.per100Unit).map(([k,v])=>[k,Math.round(v/100*1e6)/1e6])),sourceUrl:r.sourceUrl,
 sourceApprovalId:'test_'+r.foodId,scope:'pilot_real',reviewedAt:'2026-01-01T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z'}));
const guide=applyPilotReviewedSources(fixture.guide,rows);
const verified=async g=>(await db.query('select efg_private.coach_pilot_guide_foods_verified($1::jsonb) v',[JSON.stringify(g)])).rows[0].v;
assert.equal(await verified(guide),false);
for(const row of rows)await db.query(`insert into efg_private.coach_pilot_reviewed_foods
(approval_id,food_name,approval_quote,review_scope,food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at)
values($1,$2,'SYNTHETIC TEST ONLY','pilot_real',$3,'p29w-test',$4,$5,$6,$7,$8,$9,'validated_composition',$10,$1,'reviewed',$11,'2026-01-01','2099-01-01')`,
[row.sourceApprovalId,row.name,row.id,row.unit,row.k,row.p,row.c,row.f,row.fi,row.sourceUrl,coach]);
assert.equal(await verified(guide),true);
for(const patch of [{name:'Wrong preparation'},{sourceUrl:'https://example.com/other'},{sourceApprovalId:'qa_only_test'},{unit:'ml'},{k:10},{qty:1001}]){
 const g=structuredClone(guide);Object.assign(g.meals[0].items[0],patch);assert.equal(await verified(g),false);
}
for(const update of ["revoked_at=now()","expires_at='2026-02-01'","reviewed_at='2098-01-01'","evidence_status='pending'"]){
 await db.exec('begin');await db.exec('update efg_private.coach_pilot_reviewed_foods set '+update);assert.equal(await verified(guide),false);await db.exec('rollback');
}
const rpc=`select public.efg_coach_pilot_food_sources('${student}',array['apple','banana']) v`;
await assert.rejects(()=>db.exec(rpc),/Unauthorized/);
await db.exec(`select set_config('test.actor','${coach}',false);set role authenticated`);
assert.equal((await db.query(rpc)).rows[0].v.length,2);
await assert.rejects(()=>db.exec('select * from efg_private.coach_pilot_reviewed_foods'),/permission denied/);
await db.exec('reset role');
await db.exec(`insert into efg_private.p29_qa_release_scope values('${student}')`);
await assert.rejects(()=>db.exec(rpc),/QA enrollment/);
// Exercise the EXACT newly installed atomic validation branch with synthetic publication sink.
const installed=(await db.query("select pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure) d")).rows[0].d;
const block=installed.slice(installed.indexOf(' if not v_is_qa then'),installed.indexOf(' -- The private transaction marker'));
await db.exec(`create function efg_private.coach_guide_foods_verified(jsonb) returns boolean language sql as $$select false$$;
create function efg_private.coach119_reviewed_food_ids(jsonb) returns text[] language sql as $$select array['qa']::text[]$$;
create function public.test_atomic_sources(v_guide jsonb,v_is_qa boolean) returns text[] language plpgsql as $$declare v_slot_count int;v_distinct_slots int;v_food_ids text[];begin ${block} return v_food_ids;end$$;`);
guide.approvedFoodIds=[...new Set(guide.meals.flatMap(m=>m.items.map(i=>i.id)))];
const branch=async(g,qa=false)=>db.query('select test_atomic_sources($1,$2) ids',[JSON.stringify(g),qa]);
assert.equal((await branch(guide)).rows[0].ids.length,13);
await assert.rejects(()=>branch(guide,true),/not independently reviewed/);
await assert.rejects(()=>branch({...guide,approvedFoodIds:[...guide.approvedFoodIds,'extra']}),/references differ/);
await assert.rejects(()=>branch({...guide,approvedFoodIds:[...guide.approvedFoodIds,guide.approvedFoodIds[0]]}),/references differ/);
await db.exec("update efg_private.coach_pilot_reviewed_foods set revoked_at=now()");
await assert.rejects(()=>branch(guide),/not independently reviewed/);
assert.match(installed,/p29_qa_scope_required/);assert.match(installed,/for share/);
await db.close();
console.log('PASS P29W PG17 isolated: empty registry, drift rolls back all, exact IDs/units/values/preparation/source, expiry/revocation/future/pending reject, authenticated RPC scope, anon/no actor and private reads denied, QA enrollment cannot use real sources, exact atomic branch rejects missing/duplicate approved IDs. Synthetic dependencies; not hosted JWT/full publish/concurrency.');
