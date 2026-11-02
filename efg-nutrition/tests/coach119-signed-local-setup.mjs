// Assemble CURRENT candidate modules on a FRESH disposable Supabase stack.
// The guards run before any application DDL. This script never links a project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localContext} from './helpers/coach119-local.mjs';

const {sql, rpc} = localContext();
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
  '../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',
  '../migrations/20261031_coach_relaunch_owner_org_rls_fix_NOT_APPLIED.sql'
];
for (const file of files) sql(read(file));
// Reproduce the installed older sharing constraint before its exact repair.
sql('alter table public.efg_pilot_participation_receipts add constraint ' +
  'efg_pilot_participation_receipts_sharing_accepted_check check(sharing_accepted=true) not valid');
sql(read('../migrations/20261031_coach_optional_sharing_NOT_APPLIED.sql'));
// Assert that SEC09 and OPT01 have actually been applied in the correct order,
// using disposable local schemas and no existing human accounts.
for(const [table,policy] of [
 ['efg_coach_relaunch_intakes','efg_coach_relaunch_owner_select'],
 ['efg_pilot_participation_receipts','efg_pilot_participation_owner_read']
]){
 const qual=sql("select qual from pg_policies where schemaname='public' and tablename='"+table+"' and policyname='"+policy+"'");
 assert.ok(qual.includes(table+'.organization_id'),'SEC09 owner isolation missing: '+table);
}
assert.equal(sql("select to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is not null"),'t');
assert.equal(sql("select count(*) from pg_constraint where conrelid='public.efg_pilot_participation_receipts'::regclass and conname='efg_pilot_participation_receipts_sharing_accepted_check'"),'0');
// The hosted COACH114 URL check currently contains {8,1990}, which is invalid
// for regex evaluation. Recreate that exact LEGACY SHAPE on an EMPTY disposable
// local table, then exercise its already-reviewed corrective migration.
assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),'0');
const urlDef=()=>sql("select pg_get_constraintdef(oid) from pg_constraint where conrelid='efg_private.coach_reviewed_foods'::regclass and conname='coach_reviewed_foods_source_url_check'");
assert.match(urlDef(),/char_length/, 'Unexpected source migration URL check');
sql("alter table efg_private.coach_reviewed_foods drop constraint coach_reviewed_foods_source_url_check;"+
    "alter table efg_private.coach_reviewed_foods add constraint coach_reviewed_foods_source_url_check "+
    "check(source_url ~ '^https://[^[:space:]]{8,1990}$');");
assert.match(urlDef(),/\{8,1990\}/, 'Legacy hosted URL check was not reconstructed');
sql(read('../migrations/20261031_coach_reviewed_food_url_constraint_fix_NOT_APPLIED.sql'));
assert.match(urlDef(),/char_length/, 'COACH114 fix not installed');
assert.doesNotMatch(urlDef(),/\{8,1990\}/, 'Invalid regex survived COACH114 fix');
assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),'0');
// Publish remains gated. This is an installation rehearsal, never a hosted write.
sql(read('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql'));
// The actual release bundle installs COACH116 LAST. OPT01 intentionally
// redefines the older student entry RPC, so this disposable JWT integration
// must reproduce the final server behavior with flexible 2-6 meal plans.
sql(read('../migrations/20261030_coach116_legal_first_student_status.sql'));
for(const [name,required] of [
 ['public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)',
  'complete objective, age, height, weight, activity and diet before sharing'],
 ['public.efg_coach_pilot_entry_status()','flexible_meal_guide']
]){
 const definition=sql("select pg_get_functiondef('"+name+"'::regprocedure)");
 assert.ok(definition.includes(required),'CURRENT signed RPC lost invariant '+required);
}
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
