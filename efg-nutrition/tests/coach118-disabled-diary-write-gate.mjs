// COACH118 · static release protection. Hosted live status must be independently
// verified (OFF, no old diary rows lost). This is NOT a signed JWT e2e.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../migrations/20261030_coach118_diary_write_gate_disabled.sql',import.meta.url),'utf8');
for(const required of [
 'create table efg_private.coach_release_switches',
 'alter table efg_private.coach_release_switches enable row level security',
 'revoke all on efg_private.coach_release_switches from public,anon,authenticated',
 "values('pilot_student_diary_write_gate',false",
 'before insert or update on public.efg_daily_logs',
 'returns trigger language plpgsql security definer',
 'v_enabled is distinct from true then return new',
 'public.efg_coach_pilot_entry_status()',
 "v_status->>'route' is distinct from 'ready'",
 "v_status->>'can_log_meals' is distinct from 'true'",
 "v_actor is null or new.student_id is distinct from v_actor",
 "if v_role='service_role' then return new",
 'revoke all on function efg_private.coach_diary_write_gate()'
 ])assert.ok(sql.includes(required),'Missing release protection: '+required);
assert.doesNotMatch(sql,/\bupdate\s+public\.efg_daily_logs\b/i,'Never mutate real diaries in migration');
assert.doesNotMatch(sql,/\bdelete\s+from\s+public\.efg_daily_logs\b/i,'No historical diary deletion');
assert.doesNotMatch(sql,/\b(revoke|alter|drop)\s+.*(?:public\.efg_goals|public\.efg_food_plans)/i,
 'Legacy publication paths are not revoked before cutover');
assert.doesNotMatch(sql,/values\('pilot_student_diary_write_gate',true/i,
 'Old clients must remain compatible until supervised launch');
const app=readFileSync(new URL('../pilot/coach-student-journey.js',import.meta.url),'utf8');
assert.match(app,/COACH_STUDENT_JOURNEY_ENABLED=false/,'Frontend student journey must stay OFF');
const legal=readFileSync(new URL('../migrations/20261030_coach116_legal_first_student_status.sql',import.meta.url),'utf8');
assert.match(legal,/v_current_legal_count<>2/,'Readiness must require two verified legal receipts');
console.log('PASS COACH118: default-OFF private diary write gate, owner/auth/ready checks, no historic writes, no premature UI enablement.');
