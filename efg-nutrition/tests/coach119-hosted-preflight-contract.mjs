// Exact versioned preflight for a managed PostgreSQL host: no destructive SQL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./sql/coach119-hosted-readonly-preflight.sql',import.meta.url),'utf8');
const body=src.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n');
// SQL string literals can contain semicolons or the names of SQL commands.
// Mask only SINGLE-QUOTED SQL literal contents before counting statements.
const executable=body.replace(/'(?:''|[^'])*'/g,"''");
assert.match(body,/^with checks\(/im);
assert.match(body,/from checks order by phase,check_id;\s*$/);
assert.equal((executable.match(/;/g)||[]).length,1,'Exactly one read-only SELECT');
assert.doesNotMatch(executable,/\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|execute|call|do|commit|rollback)\s+(?:into|from|table|policy|function|trigger|on|database|schema|view|index)?\s*[a-z_]/i);
for(const check of ['OWNER_INTAKE_RLS_QUALIFIED','OWNER_RECEIPTS_RLS_QUALIFIED',
 'NO_AMBIGUOUS_OWNER_RLS','OPTIONAL_SHARING_CONSTRAINT_REMOVED','OPTIONAL_SHARING_HELPER_EXISTS',
 'SIGNED_SHARED_COACH_POLICY','FIXED_REVIEWED_FOOD_URL_CONSTRAINT','RELEASE_SWITCHES_DEFAULT_OFF',
 'ATOMIC_RPC_NOT_YET_INSTALLED','COACH_DRAFT_READ_POLICY_EXISTS','GOAL_NOTIFY_TRIGGER_EXISTS',
 'GUIDE_NOTIFY_TRIGGER_EXISTS','FOOD_VERIFIER_EXISTS','COACH_OWNERSHIP_HELPER_EXISTS',
 'SIGNED_ENTRY_STATUS_EXISTS','CURRENT_TERMS_AND_PRIVACY_PRESENT','SOME_REVIEWED_FOOD_EVIDENCE',
 'coach_pilot_share_active(uuid,uuid)','efg_coach_relaunch_intakes.organization_id'])
 assert.ok(src.includes(check),'Missing release check '+check);
assert.match(src,/COACH-SEC-09 -> COACH-OPT-01 -> COACH114 URL fix -> COACH119/);
assert.doesNotMatch(body,/select\s+\*/i);
console.log('PASS: COACH119 hosted preflight is one SELECT with exact RLS / sharing / food / atomic / content gates; no hosted mutations.');


// The post-install check cannot reuse the PRE-install expectation that the
// atomic RPC and receipts are absent. It must fail until they actually exist.
const after=readFileSync(new URL('./sql/coach119-postinstall-readonly-preflight.sql',import.meta.url),'utf8');
const afterBody=after.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n');
const afterExecutable=afterBody.replace(/'(?:''|[^'])*'/g,"''");
assert.match(afterBody,/^with checks\(/im);
assert.match(afterBody,/from checks order by phase,check_id;\s*$/);
assert.equal((afterExecutable.match(/;/g)||[]).length,1);
assert.doesNotMatch(afterExecutable,/\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|execute|call|do|commit|rollback)\s+(?:into|from|table|policy|function|trigger|on|database|schema|view|index)?\s*[a-z_]/i);
for(const token of [
 'COACH119_RPC_INSTALLED','COACH119_RPC_SECURITY_LOCKED',
 'COACH119_RPC_EXECUTE_LIMITED','COACH119_RECEIPTS_PRIVATE_RLS',
 'COACH119_HISTORY_PRIVATE_RLS','COACH119_TRANSACTION_MARKER_PRIVATE_RLS',
 'RELEASE_SWITCHES_ALL_OFF','OWNER_INTAKE_RLS_QUALIFIED',
 'OWNER_RECEIPTS_RLS_QUALIFIED','OPTIONAL_SHARING_HELPER_EXISTS',
 'COACH_SELECT_REQUIRES_ACTIVE_SHARE','REVIEWED_FOOD_URL_CHECK_FIXED',
 'PILOT_TERMS_AND_PRIVACY_CURRENT','ANY_CURRENT_REVIEWED_FOOD',
 'COACH119_FLEXIBLE_GUIDE_CONSTRAINT_VALIDATED',
 'COACH119_GUIDE_WRITE_GUARD_ENABLED',
 'COACH119_GUIDE_HISTORY_ARCHIVE_ENABLED',
 'COACH116_SIGNED_ENTRY_FLEXIBLE','GU06_SCOPED_COACH_RECIPE_RPC',
 'GU06_PERSONAL_RECIPES_OWNER_RLS'])
 assert.ok(afterBody.includes(token),'Missing post-install check '+token);
assert.doesNotMatch(afterBody,/select\s+\*/i);
assert.match(afterBody,/c\.convalidated[\s\S]*?flexible_meal_guide/,
 'Post-install must confirm the 2-6 meal CHECK was validated');
assert.match(afterBody,/coach119_guard_flexible_guide_write[\s\S]*?t\.tgenabled='O'/,
 'A disabled v2 write guard cannot pass hosted postflight');
assert.match(afterBody,/coach119_archive_previous_approved_guide[\s\S]*?t\.tgenabled='O'/,
 'A disabled history trigger cannot pass hosted postflight');
assert.match(afterBody,/COACH116_SIGNED_ENTRY_FLEXIBLE[\s\S]*?p\.prosecdef[\s\S]*?flexible_meal_guide/,
 'Signed student entry status must verify flexible guide support');
assert.match(afterBody,/GU06_SCOPED_COACH_RECIPE_RPC[\s\S]*?coach_pilot_share_active/,
 'Coach recipe RPC cannot bypass current sharing permission');
assert.match(afterBody,/GU06_PERSONAL_RECIPES_OWNER_RLS[\s\S]*?qual like '%auth\.uid\(\)%'/,
 'Coach recipe sharing must not widen student-owned table policies');

assert.ok(afterBody.includes("to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is not null"));
assert.ok(body.includes("to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null"));
console.log('PASS: independent PRE vs POST install SQL contracts; one READ-ONLY SELECT each, no GO inferred.');


// PILOT-FASTTRACK: the private six-migration fixture includes a separate
// health schema. That fixture is NOT the non-clinical Coach pilot release.
// Keep the normal atomic path independent from clinical declarations; never
// require users to disclose diagnoses merely to access a general food guide.
const normalSql=readFileSync(new URL('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql',import.meta.url),'utf8');
const normalExecutable=normalSql.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n');
const privateOrder=JSON.parse(readFileSync(new URL('../../private-installation/installation/installation-order.json',import.meta.url),'utf8'));
assert.equal(privateOrder.status,'PRIVATE_NOT_EXECUTED');
assert.ok(privateOrder.files.some(x=>x.includes('003_private_health_schema_NOT_APPLIED')),
 'Private installation is an extended clinical QA scenario and must not be mistaken for the pilot path');
assert.match(normalExecutable,/create function public\.efg_publish_coach_plan_draft_atomic\s*\(/i,
 'The approved release must still publish objective, guide and access atomically');
for(const forbidden of [
 'efg_coach_health_intakes','efg_coach_health_documents',
 'efg_declare_no_restrictions','guide_source_bindings'
])assert.doesNotMatch(normalExecutable,new RegExp('\\b'+forbidden+'\\b','i'),
 'General Coach pilot cannot require health/clinical binding '+forbidden);
assert.match(normalExecutable,/values\s*\(\s*'pilot_coach_atomic_publication'\s*,\s*false/i,
 'Installing normal COACH119 must keep publication OFF');
assert.match(normalExecutable,/efg_private\.coach119_reviewed_food_ids\s*\(/,
 'Normal publication must verify selected nutritional sources on the server');
const clinical=readFileSync(new URL('../pilot/gut-clinical-workbench.js',import.meta.url),'utf8');
const autogestion=readFileSync(new URL('../pilot/personal-workspace.js',import.meta.url),'utf8');
assert.match(clinical,/export const GUT_CLINICAL_INTAKE_ENABLED=false;/);
assert.match(autogestion,/export const PERSONAL_WORKSPACE_ENABLED=false;/);
const relaunch=readFileSync(new URL('../pilot/coach-relaunch-onboarding.js',import.meta.url),'utf8');
assert.match(relaunch,/export const COACH_RELAUNCH_ONBOARDING_ENABLED=false;/,
 'Do not activate onboarding before hosted checks, real pilot documents and owner GO');
console.log('PASS PILOT FASTTRACK: normal COACH119 is non-clinical and OFF; extended health/Personal remain excluded.');
