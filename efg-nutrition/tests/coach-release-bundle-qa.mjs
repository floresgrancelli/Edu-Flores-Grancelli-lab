// Exercise the real eight-module transaction on a restored, FICTIONAL PG17 DB.
// This is not evidence of a production backup, full Supabase restore or physical UAT.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {buildCoachReleaseBundle,COACH_RELEASE_DATABASE} from '../scripts/coach-release-bundle.mjs';

assert.equal(process.env.GITHUB_ACTIONS,'true','Disposable CI only');
assert.equal(process.env.PGHOST,'127.0.0.1');
assert.equal(process.env.PGPORT,'5432');
assert.equal(process.env.PGDATABASE,COACH_RELEASE_DATABASE);
for(const key of ['PGHOSTADDR','PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR','PGOPTIONS',
 'SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD']) assert.ok(!process.env[key],key+' prohibited');
const [phase,evidencePath]=process.argv.slice(2);
assert.ok(['failure','install','restored'].includes(phase));
assert.ok(evidencePath?.startsWith(process.env.RUNNER_TEMP+'/'),'Evidence stays in CI temporary directory');
const run=statement=>spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{
 input:statement,encoding:'utf8',timeout:90000,maxBuffer:4*1024*1024
});
function sql(statement){
 const r=run(statement);assert.equal(r.status,0,(r.stderr||'psql failed').slice(-1800));
 return r.stdout.trim();
}
assert.equal(sql('select current_database()'),COACH_RELEASE_DATABASE);
assert.match(sql('show server_version_num'),/^17\d{4}$/);
const historySql=readFileSync(new URL('./sql/nut57-synthetic-history-fingerprint.sql',import.meta.url),'utf8');
// Capture metadata as well as rows: rollback must restore grants, triggers and RLS.
const schemaSql=`select md5(jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,
   pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proacl::text)
   order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','efg_private','auth') and p.prokind='f'),
 'tables',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text)
   order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname in ('public','efg_private','auth') and c.relkind='r'),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname)
   from pg_policies p where schemaname in ('public','efg_private','auth')),
 'triggers',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled)
   order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal
   and n.nspname in ('public','efg_private','auth'))
 )::text);`;
const snapshot=()=>({history:sql(historySql),schema:sql(schemaSql)});
const absent=()=>assert.equal(sql(`select count(*) from pg_tables where schemaname='public'
 and tablename in ('efg_legal_documents','efg_legal_acceptances','efg_student_plan_access',
 'efg_student_intakes','efg_coach_relaunch_intakes','efg_coach_plan_drafts',
 'efg_coach_plan_publish_receipts','efg_science_intro_receipts')`),'0');
const bundle=buildCoachReleaseBundle();
assert.deepEqual(bundle.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^(BEGIN|COMMIT|ROLLBACK);$/.test(x)),['BEGIN;','COMMIT;']);

if(phase==='failure'){
 absent();
 const before=snapshot();
 writeFileSync(evidencePath,JSON.stringify(before),{mode:0o600});
 // Fail after ALL eight modules, including their DDL, grants and backfill.
 const failed=run(bundle.replace(/\nCOMMIT;\s*$/,
  "\nDO $fail$ BEGIN RAISE EXCEPTION 'COACH_RELEASE_INJECTED_FAILURE'; END $fail$;\nCOMMIT;\n"));
 assert.notEqual(failed.status,0);
 assert.match(failed.stderr,/COACH_RELEASE_INJECTED_FAILURE/);
 absent();assert.deepEqual(snapshot(),before,'Failure must undo ALL schema/ACL/history changes');
 console.log('PASS COACH RELEASE: injected failure rolls back all eight modules, ACLs and historical rows.');
}else if(phase==='install'){
 const before=JSON.parse(readFileSync(evidencePath,'utf8'));
 assert.deepEqual(snapshot(),before);
 sql(bundle);
 // This read is a different connection, proving COMMIT, not an in-transaction preview.
 assert.equal(sql(`select count(*) from public.efg_student_plan_access where status='published'`),'2');
 assert.equal(sql(`select count(*) from public.efg_legal_documents`),'0');
 assert.equal(sql(`select count(*) from public.efg_legal_acceptances`),'0');
 for(const table of ['efg_legal_acceptances','efg_coach_relaunch_intakes','efg_coach_plan_drafts',
  'efg_coach_plan_publish_receipts','efg_science_intro_receipts','efg_goals','efg_food_plans']){
  assert.equal(sql(`select has_table_privilege('authenticated','public.${table}','INSERT,UPDATE,DELETE')`),'f');
 }
 assert.equal(sql(`select has_function_privilege('authenticated','public.efg_publish_coach_plan(uuid,uuid)','EXECUTE')`),'f');
 const studentA='22222222-2222-4222-8222-222222222222';
 const studentB='44444444-4444-4444-8444-444444444444';
 const asStudent=(id,body)=>`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${id}'; ${body}; COMMIT;`;
 // The legacy intake remains reachable through REST. Its organization predicate
 // must compare the submitted row, not resolve both sides to the profile column.
 const foreignIntake=run(asStudent(studentA,`insert into public.efg_student_intakes(student_id,organization_id)
  values ('${studentA}','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2')`));
 assert.notEqual(foreignIntake.status,0,'Student A must not assign their intake to organization B');
 assert.match(foreignIntake.stderr,/row-level security/);
 sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${studentA}';
  insert into public.efg_student_intakes(student_id,organization_id)
  values ('${studentA}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'); ROLLBACK;`);
 assert.equal(sql(asStudent(studentA,"select public.efg_ack_science_intro('con_ciencia_2026_r1','completed')")),'t');
 const receipt=sql(`select to_jsonb(t)::text from public.efg_science_intro_receipts t`);
 assert.equal(sql(asStudent(studentA,"select public.efg_ack_science_intro('con_ciencia_2026_r1','skipped')")),'t');
 assert.equal(sql(`select to_jsonb(t)::text from public.efg_science_intro_receipts t`),receipt,'Retry must preserve original action/time');
 assert.equal(sql(asStudent(studentB,'select count(*) from public.efg_science_intro_receipts')),'0','B cannot read A receipt');
 assert.equal(sql(historySql),before.history,'Installation and welcome must preserve legacy history');
 // A second apply must refuse existing objects, never overwrite their rows.
 const installed=snapshot(),duplicate=run(bundle);
 assert.notEqual(duplicate.status,0);
 assert.match(duplicate.stderr,/existing legal tables/);
 assert.deepEqual(snapshot(),installed);
 assert.equal(sql(`select to_jsonb(t)::text from public.efg_science_intro_receipts t`),receipt);
 console.log('PASS COACH RELEASE: committed fresh eight-module install, historical access, no fabricated consent, RLS receipts/idempotence, legacy writes revoked and duplicate install rejected.');
}else{
 absent();assert.deepEqual(snapshot(),JSON.parse(readFileSync(evidencePath,'utf8')),
  'Restored preupgrade dump must recover history AND original function/table ACLs, triggers and RLS');
 console.log('PASS COACH RELEASE: preupgrade pg_dump restored exact fixture history and original ACL/trigger/RLS metadata. NOT a production recovery.');
}
