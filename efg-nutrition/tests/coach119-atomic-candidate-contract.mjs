// COACH119 static release contract. DOES NOT CLAIM actual PostgreSQL execution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql',import.meta.url),'utf8');
for(const part of [
 'create table public.efg_coach_plan_publish_receipts',
 'create function public.efg_publish_coach_plan_draft_atomic(',
 "values('pilot_coach_atomic_publication',false",
 'v_enabled is distinct from true',
 'efg_private.coach_has_student(p_student)',
 'for update of a',
 'for update of i',
 'for update of draft',
 'efg_pilot_participation_receipts',
 'efg_consents',
 'efg_legal_documents',
 'efg_legal_acceptances',
 "doc", // common substring; actual statements below enforced
 'v_legal_count<>2',
 'efg_private.coach_guide_foods_verified(v_guide)',
 'insert into public.efg_goals',
 'insert into public.efg_food_plans',
 'update public.efg_student_plan_access',
 'insert into public.efg_notifications',
 'insert into public.efg_coach_plan_publish_receipts',
 'update public.efg_coach_plan_drafts',
 "pg_catalog.set_config('efg.coach_atomic_publish','on',true)",
 "pg_catalog.set_config('efg.coach_atomic_publish','off',true)",
 'return v_goal_id',
 'grant execute on function public.efg_publish_coach_plan_draft_atomic',
 'from public,anon,authenticated'
])assert.ok(sql.includes(part),'Missing atomic candidate invariant: '+part);
assert.match(sql,/comment on function public\.efg_publish_coach_plan_draft_atomic/);
assert.match(sql,/on conflict\(student_id\) do update/);
assert.match(sql,/create function efg_private\.coach119_reviewed_food_ids\(p_guide jsonb\)/);
assert.match(sql,/v_food_ids:=efg_private\.coach119_reviewed_food_ids\(v_guide\)/);
assert.match(sql,/food\.evidence_status='reviewed'/);
assert.match(sql,/food\.expires_at>pg_catalog\.now\(\)/);
assert.match(sql,/if v_verified<>v_count/);
assert.match(sql,/if v_item->>'id' is null or not\(v_item->>'id'=any\(v_selected\)\)/);
assert.match(sql,/revoke all on function efg_private\.coach119_reviewed_food_ids\(jsonb\)/);
assert.doesNotMatch(sql,/select pg_catalog\.array_agg\(distinct item\.value->>'id'\)\s+into v_food_ids/,
 "New students cannot receive only the ingredients of the five-meal example");

// New Coach-approvedFoodIds is a FULL explicit reviewed catalog, not merely
// the five guide ingredients. Carrying forward old IDs without re-review
// would silently preserve expired/unreviewed choices across an intake change.
assert.match(sql,/approved_food_ids=excluded\.approved_food_ids/,
 'Atomic publication must replace old approvals with the full newly reviewed Coach selection');
assert.doesNotMatch(sql,/public\.efg_food_plans\.approved_food_ids\s*\|\|\s*excluded\.approved_food_ids/,
 'Never implicitly union stale legacy food approvals into a new plan');

assert.match(sql,/where student_id=p_student and organization_id=v_org and coach_id=v_coach/);
assert.match(sql,/and draft_revision=p_expected_revision and status='draft'/);
assert.match(sql,/on conflict\(recipient_id,event_key\) do nothing/);
assert.match(sql,/on conflict[\s\S]*?set[\s\S]*?guided_goal_id=excluded.guided_goal_id/);
assert.match(sql,/if v_existing\.student_id is distinct from p_student/);
assert.match(sql,/v_existing\.coach_id is distinct from v_coach/);
assert.match(sql,/v_existing\.organization_id is distinct from v_org/,
 'An idempotency receipt cannot be replayed across a changed organization');
assert.match(sql,/select pg_catalog\.count\(distinct d\.kind\) into v_legal_count/,
 'Two Terms documents must never substitute for Terms AND Privacy');
assert.doesNotMatch(sql,/select pg_catalog\.count\(\*\) into v_legal_count/,
 'Counting accepted rows instead of distinct document kinds permits legal bypass');
assert.match(sql,/v_existing\.draft_revision is distinct from p_expected_revision/);
assert.match(sql,/create or replace function public\.efg_notify_goal\(\)/);
assert.match(sql,/create or replace function public\.efg_notify_food_guide\(\)/);
assert.equal((sql.match(/if efg_private\.coach119_is_atomic_transaction\(\)/g)||[]).length,2);
assert.match(sql,/where txid=pg_catalog\.txid_current\(\) and coach_id=auth\.uid\(\)/);
assert.match(sql,/revoke all on efg_private\.coach119_atomic_transactions from public,anon,authenticated/);
assert.match(sql,/delete from efg_private\.coach119_atomic_transactions\s+where txid=pg_catalog\.txid_current\(\) and coach_id=v_coach/);
assert.doesNotMatch(sql,/if pg_catalog\.current_setting\('efg\.coach_atomic_publish',true\)='on'/,
 'A client-settable GUC alone must never suppress notifications');
assert.doesNotMatch(sql,/revoke\s+(?:insert|update|delete)\s+on public\.efg_(?:goals|food_plans)/i,
 'Old production clients cannot lose table write grants before cutover');
assert.doesNotMatch(sql,/\bupdate\s+public\.efg_daily_logs\b|\bdelete\s+from\s+public\.efg_daily_logs\b/i);
const legacy=readFileSync(new URL('../docs/COACH68_VERSIONED_ATOMIC_PUBLISH_STAGING_ONLY.sql',import.meta.url),'utf8');
assert.match(legacy,/ISOLATED STAGING ONLY/);
assert.match(sql,/DO NOT APPLY TO HOSTED DATABASE/);
const sw=readFileSync(new URL('../migrations/20261030_coach118_diary_write_gate_disabled.sql',import.meta.url),'utf8');
assert.match(sw,/pilot_student_diary_write_gate/);
// Regression: publishing a replacement must not erase the previous approved
// five-meal guide. The archive trigger participates in the SAME transaction.
const createHistory=sql.indexOf('create table efg_private.coach_guide_history');
const archiveTrigger=sql.indexOf('create trigger coach119_archive_previous_approved_guide');
const atomicUpsert=sql.indexOf('on conflict(student_id) do update');
assert.ok(createHistory>0 && archiveTrigger>createHistory && atomicUpsert>archiveTrigger,
 'History schema/trigger must be installed before replacing a published guide');
for(const guard of [
 'old.guided_plan is not null and old.guided_plan_approved_at is not null',
 'new.guided_plan is distinct from old.guided_plan',
 'new.approved_food_ids is distinct from old.approved_food_ids',
 'old.student_id,old.coach_id,old.guided_goal_id,old.guided_plan',
 'alter table efg_private.coach_guide_history enable row level security',
 'revoke all on efg_private.coach_guide_history from public,anon,authenticated',
 "before update of guided_plan,guided_goal_id,guided_plan_approved_at,approved_food_ids"
])assert.ok(sql.includes(guard),'Coach guide-history invariant missing: '+guard);
assert.match(sql,/create function efg_private\.coach119_archive_replaced_guide\(\)[\s\S]*?security definer set search_path=''/);
assert.doesNotMatch(sql,/delete\s+from\s+efg_private\.coach_guide_history/i);

// COACH119 / requirement 02-03: exercise the ACTUAL food list restriction.
const pilotSource=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const foodFilterStart=pilotSource.indexOf('function allowedFoods(){');
const foodFilterEnd=pilotSource.indexOf('// El sushi se muestra por piezas;',foodFilterStart);
assert.ok(foodFilterStart>=0&&foodFilterEnd>foodFilterStart,'Student food filter must exist');
const catalogFixture=['egg','sushi_maki_salmon','pizza_muzzarella','rice'].map(id=>({id}));
const allowedFor=(role,foodPlan)=>new Function('state','foods',
 pilotSource.slice(foodFilterStart,foodFilterEnd)+';return allowedFoods();')
 ({profile:{role},foodPlan},catalogFixture);
const wholeCatalog=catalogFixture.map(f=>f.id);
assert.deepEqual(allowedFor('student',{approved_food_ids:['sushi_maki_salmon','egg','egg','invalid_food']}),
 ['sushi_maki_salmon','egg'],'Explicit Coach list must control the student catalog');
assert.deepEqual(allowedFor('student',{approved_food_ids:[]}),[],
 'Explicit empty list must not fall back to the full catalog');
assert.deepEqual(allowedFor('student',null),wholeCatalog,'Keep legacy student catalog');
assert.deepEqual(allowedFor('student',{approved_food_ids:null}),wholeCatalog,'Keep legacy unmigrated plans');
assert.deepEqual(allowedFor('coach',{approved_food_ids:['egg']}),wholeCatalog,'Coach personal log is independent');
assert.deepEqual(allowedFor('admin',{approved_food_ids:[]}),wholeCatalog,'Admin personal log is independent');
console.log('PASS COACH119 02-03: real student catalog filter respects Coach-approved full food set.');

console.log('PASS COACH119: atomic publish guarded OFF, explicit student/coach/legal/food/consent checks, one notice, retry idempotency; SQL still requires isolated Postgres and real JWT QA.');
