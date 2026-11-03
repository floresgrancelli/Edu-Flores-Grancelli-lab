// Rehearse the EXACT six-source release TRANSACTION on a fresh disposable
// Supabase stack. Never connects to or links an external project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localContext} from './helpers/coach119-local.mjs';
import {buildPilotCoach119Transaction,RELEASE_SOURCES} from '../tools/prepare-pilot-coach119-release.mjs';

const {sql, sqlExpectFailure, rpc} = localContext();
assert.equal(sql("select to_regclass('public.efg_profiles') is null"), 't', 'Fresh stack required');
assert.equal(sql('select count(*) from auth.users'), '0', 'No existing accounts permitted');
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const files = [
  './sql/coach-auth-local-bootstrap.sql',
  './sql/nut56-prodshape-local-overlay.sql',
  './sql/coach119-signed-current-overlay.sql',
  '../migrations/20261030_coach_pilot_participation_server_receipts.sql',
  '../migrations/20261030_coach_relaunch_general_pilot_intake.sql',
  '../migrations/20261030_coach_versioned_private_plan_drafts.sql',
  '../migrations/20261030_coach115_versioned_legal_documents_receipts.sql',
  '../migrations/20261030_coach_pilot_student_entry_status.sql',
  '../migrations/20261030_coach116_legal_first_student_status.sql',
  '../migrations/20261030_coach118_diary_write_gate_disabled.sql',
  '../migrations/20261030_coach_reviewed_guide_nutrition_source.sql'
];
for (const file of files) sql(read(file));
// Reconstruct LEGACY hosted prerequisites BEFORE the proposed cutover;
// never pre-apply SEC09, OPT01, FOOD_URL, COACH119, COACH116-final or GU06.
sql('alter table public.efg_pilot_participation_receipts add constraint ' +
  'efg_pilot_participation_receipts_sharing_accepted_check check(sharing_accepted=true) not valid');
assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),'0');
const urlDef=()=>sql("select pg_get_constraintdef(oid) from pg_constraint where conrelid='efg_private.coach_reviewed_foods'::regclass and conname='coach_reviewed_foods_source_url_check'");
assert.match(urlDef(),/char_length/, 'Unexpected baseline reviewed-food check');
sql("alter table efg_private.coach_reviewed_foods drop constraint coach_reviewed_foods_source_url_check;"+
    "alter table efg_private.coach_reviewed_foods add constraint coach_reviewed_foods_source_url_check "+
    "check(source_url ~ '^https://[^[:space:]]{8,1990}$');");
assert.match(urlDef(),/\{8,1990\}/, 'Legacy URL check not reconstructed');
// GU06 expects an owner-only table on the observed host. Mirror its RLS/ACL
// BEFORE the bundle so the transaction verifies this prerequisite.
sql(read('./sql/coach119-personal-recipes-hostedshape-local.sql'));

const ownerPolicies=[
 ['efg_coach_relaunch_intakes','efg_coach_relaunch_owner_select'],
 ['efg_pilot_participation_receipts','efg_pilot_participation_owner_read']
];
const ownerQual=()=>ownerPolicies.map(([table,policy])=>
 sql("select qual from pg_policies where schemaname='public' and tablename='"+table+"' and policyname='"+policy+"'"));
const ownerBefore=ownerQual();
assert.equal(sql("select to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null"),'t');
assert.equal(sql("select to_regprocedure('public.efg_coach_shared_student_recipes(uuid)') is null"),'t');

// Rehearse the exact SHA-pinned six-source transaction. Inject an error
// IMMEDIATELY BEFORE COMMIT: earlier RLS, trigger and DDL changes must roll
// back as a unit. This runs against disposable PG17 only.
const candidate=buildPilotCoach119Transaction();
assert.deepEqual(candidate.blocks,['SEC09','OPT01','FOOD_URL','COACH119','COACH116','GU06']);
assert.equal(RELEASE_SOURCES.length,6);
assert.match(candidate.sha256,/^[a-f0-9]{64}$/);
const aborted=candidate.sql.replace(/\ncommit;\s*$/,
  "\ndo $ncc_local_abort$ begin raise exception 'NCC_LOCAL_ROLLBACK_EXPECTED'; end $ncc_local_abort$;\ncommit;\n");
assert.notEqual(aborted,candidate.sql,'Cannot inject pre-commit failure');
sqlExpectFailure(aborted,'NCC_LOCAL_ROLLBACK_EXPECTED');
assert.deepEqual(ownerQual(),ownerBefore,'SEC09 policy survived a failed transaction');
assert.equal(sql("select count(*) from pg_constraint where conrelid='public.efg_pilot_participation_receipts'::regclass and conname='efg_pilot_participation_receipts_sharing_accepted_check'"),'1');
assert.match(urlDef(),/\{8,1990\}/, 'FOOD_URL fix survived a failed transaction');
assert.equal(sql("select to_regclass('public.efg_coach_plan_publish_receipts') is null"),'t');
assert.equal(sql("select to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null"),'t');
assert.equal(sql("select to_regprocedure('public.efg_coach_shared_student_recipes(uuid)') is null"),'t');
assert.equal(sql("select count(*) from efg_private.coach_release_switches where enabled"),'0');

// Now install EXACTLY the emitted operator SQL on the local, empty stack.
sql(candidate.sql);
for(const [table,policy] of ownerPolicies){
 const qual=sql("select qual from pg_policies where schemaname='public' and tablename='"+table+"' and policyname='"+policy+"'");
 assert.ok(qual.includes(table+'.organization_id'),'SEC09 owner isolation missing: '+table);
}
assert.equal(sql("select to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is not null"),'t');
assert.equal(sql("select count(*) from pg_constraint where conrelid='public.efg_pilot_participation_receipts'::regclass and conname='efg_pilot_participation_receipts_sharing_accepted_check'"),'0');
assert.match(urlDef(),/char_length/, 'FOOD_URL corrective constraint missing');
assert.doesNotMatch(urlDef(),/\{8,1990\}/, 'Broken FOOD_URL regex survived cutover');
assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),'0');
// A second one-time installation must fail closed without corrupting the
// first cutover; this is NOT advertised as a re-runnable migration.
sqlExpectFailure(candidate.sql,'COACH-OPT-01: expected legacy sharing CHECK absent');
assert.equal(sql("select count(*) from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication' and enabled=false"),'1');
console.log('PASS exact six-source SQL transaction: pre-COMMIT rollback, one successful install and repeat-install denial; SHA256 '+candidate.sha256);

assert.equal(sql("select relrowsecurity from pg_class where oid='public.efg_personal_recipes'::regclass"),'t');
assert.equal(sql("select count(*) from pg_policies where tablename='efg_personal_recipes' and cmd='SELECT'"),'1',
 'Recipe table must keep precisely one owner SELECT policy (no Coach table read)');
for(const [name,required] of [
 ['public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)',
  'complete objective, age, height, weight, activity and diet before sharing'],
 ['public.efg_coach_pilot_entry_status()','flexible_meal_guide'],
 ['public.efg_coach_shared_student_recipes(uuid)','v_legal_count<>2']
]){
 const definition=sql("select pg_get_functiondef('"+name+"'::regprocedure)");
 assert.ok(definition.includes(required),'CURRENT signed RPC lost invariant '+required);
}
// Execute the same POST-install SELECT used for hosted diagnosis against the
// actual six-source LOCAL installation. It must prove all structural gates,
// while the intentionally unseeded pilot notices/food approvals stay NOT READY.
// This is PostgreSQL execution on disposable fixtures, not a hosted GO.
const postflight=sql(read('./sql/coach119-postinstall-readonly-preflight.sql'));
const structuralChecks=new Map(),contentChecks=new Map();
for(const record of postflight.split('\n').filter(Boolean)){
 const fields=record.split('|');
 assert.equal(fields.length,5,'Malformed postinstall result: '+record.slice(0,120));
 const [phase,id,passed,status]=fields;
 assert.match(id,/^[A-Z0-9_]+$/);
 const group=phase==='05_CONTENT'?contentChecks:structuralChecks;
 assert.ok(!structuralChecks.has(id)&&!contentChecks.has(id),'Duplicate postinstall check: '+id);
 group.set(id,{passed,status});
}
assert.equal(structuralChecks.size,22,'Structural post-install matrix must have exactly 22 gates');
assert.equal(contentChecks.size,2,'Pilot notice and selected-food gates stay independent');
for(const [id,result] of structuralChecks){
 assert.equal(result.passed,'t','LOCAL postinstall FAILED: '+id);
 assert.equal(result.status,'PRESENT_OR_SAFE_DEFAULT','Unexpected postinstall status '+id);
}
for(const id of ['PILOT_TERMS_AND_PRIVACY_CURRENT','ANY_CURRENT_REVIEWED_FOOD']){
 const result=contentChecks.get(id);
 assert.ok(result,'Missing independently blocked content gate: '+id);
 assert.equal(result.passed,'f','Unapproved local pilot content must stay absent: '+id);
 assert.equal(result.status,'NOT_INSTALLED_OR_NOT_READY');
}
console.log('PASS CURRENT PG17 postinstall SELECT: 22 structural gates PASS, 2 deliberately absent content gates; server flags OFF, not hosted.');

sql(read('../docs/BRAND77B_SCIENCE_WELCOME_STAGING_ONLY.sql'));
if(process.env.EFG_QA_SDK_ENTRY==='1'){
 sql(read('./sql/coach119-browser-current-overlay.sql'));
 sql(read('../migrations/etapas12_habituales.sql'));
 sql(read('../migrations/etapas12_informes_semanales.sql'));
}
assert.equal(sql('select count(*) from public.efg_legal_documents'), '0');
assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'), '0');
assert.equal(sql('select count(*) from efg_private.coach_release_switches where enabled'), '0');
sql("notify pgrst, 'reload schema'");
// Check that the actual RPC exists in PostgREST, while anonymous access is denied.
let ready = false;
for (let attempt = 0; attempt < 20; attempt++) {
  const response = await rpc('efg_coach_pilot_entry_status');
  if (response.data?.code === '42501') { ready = true; break; }
  await new Promise(resolve => setTimeout(resolve, 250));
}
assert.ok(ready, 'Current signed entry RPC absent from PostgREST schema cache');
console.log('PASS COACH119 setup: fresh LOCAL PG17/GoTrue, exact candidate modules, real helper conditions, legal/food corpus empty and release switches OFF. Not a production restore.');
