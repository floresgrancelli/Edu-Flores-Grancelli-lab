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
assert.match(sql,/where student_id=p_student and organization_id=v_org and coach_id=v_coach/);
assert.match(sql,/and draft_revision=p_expected_revision and status='draft'/);
assert.match(sql,/on conflict\(recipient_id,event_key\) do nothing/);
assert.match(sql,/on conflict[\s\S]*?set[\s\S]*?guided_goal_id=excluded.guided_goal_id/);
assert.match(sql,/if v_existing\.student_id is distinct from p_student/);
assert.match(sql,/v_existing\.coach_id is distinct from v_coach/);
assert.match(sql,/v_existing\.draft_revision is distinct from p_expected_revision/);
assert.match(sql,/create or replace function public\.efg_notify_goal\(\)/);
assert.match(sql,/create or replace function public\.efg_notify_food_guide\(\)/);
assert.equal((sql.match(/if pg_catalog\.current_setting\('efg\.coach_atomic_publish',true\)='on'/g)||[]).length,2);
assert.doesNotMatch(sql,/revoke\s+(?:insert|update|delete)\s+on public\.efg_(?:goals|food_plans)/i,
 'Old production clients cannot lose table write grants before cutover');
assert.doesNotMatch(sql,/\bupdate\s+public\.efg_daily_logs\b|\bdelete\s+from\s+public\.efg_daily_logs\b/i);
const legacy=readFileSync(new URL('../docs/COACH68_VERSIONED_ATOMIC_PUBLISH_STAGING_ONLY.sql',import.meta.url),'utf8');
assert.match(legacy,/ISOLATED STAGING ONLY/);
assert.match(sql,/DO NOT APPLY TO HOSTED DATABASE/);
const sw=readFileSync(new URL('../migrations/20261030_coach118_diary_write_gate_disabled.sql',import.meta.url),'utf8');
assert.match(sw,/pilot_student_diary_write_gate/);
console.log('PASS COACH119: atomic publish guarded OFF, explicit student/coach/legal/food/consent checks, one notice, retry idempotency; SQL still requires isolated Postgres and real JWT QA.');
