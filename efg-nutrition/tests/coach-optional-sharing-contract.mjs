// COACH-OPT-01: static review of the NOT_APPLIED migration. No hosted writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const sql=read('migrations/20261031_coach_optional_sharing_NOT_APPLIED.sql');
const receipt=read('migrations/20261030_coach_pilot_participation_server_receipts.sql');
const intake=read('migrations/20261030_coach_relaunch_general_pilot_intake.sql');
const isolatedIntake=read('docs/COACH_RELAUNCH_REONBOARDING_STAGING_ONLY.sql');
const entry=read('migrations/20261030_coach116_legal_first_student_status.sql');
const ui=read('pilot/pilot-participation-demo.js');
const app=read('pilot/pilot.js');
const status=read('pilot/coach-pilot-entry-client.js');
assert.match(sql,/^begin;/m);
assert.match(sql,/^commit;/m);
assert.match(sql,/COACH-SEC-09 RLS repair required first/);
assert.match(sql,/qualified owner policies not confirmed/);
assert.match(sql,/drop constraint efg_pilot_participation_receipts_sharing_accepted_check/);
assert.equal((sql.match(/create or replace function public\.efg_(?:accept_pilot_participation|submit_coach_relaunch_intake|coach_pilot_entry_status)\(/g)||[]).length,3);
// A receipt can be revoked independently after a shared intake was saved.
assert.match(sql,/alter policy efg_coach_relaunch_shared_coach_select/);
const sharedPolicy=sql.slice(sql.indexOf('alter policy efg_coach_relaunch_shared_coach_select'),sql.indexOf('create or replace function public.efg_accept_pilot_participation'));
const baseSharedPolicy=intake.slice(intake.indexOf('create policy efg_coach_relaunch_shared_coach_select'),intake.indexOf('-- No direct PostgREST'));
const isolatedSharedPolicy=isolatedIntake.slice(isolatedIntake.indexOf('create policy efg_coach_relaunch_shared_coach_select'),isolatedIntake.indexOf('-- No direct PostgREST'));
for(const [name,source,policy] of [['corrective',sql,sharedPolicy],['hosted baseline',intake,baseSharedPolicy],['isolated staging',isolatedIntake,isolatedSharedPolicy]]){
 assert.match(policy,/efg_private\.coach_pilot_share_active\(student_id,organization_id\)/,name+': RLS must use privileged boolean helper');
 assert.doesNotMatch(policy,/select 1 from public\.efg_pilot_participation_receipts/,name+': Coach cannot SELECT owner-only receipts directly');
 assert.match(source,/create or replace function efg_private\.coach_pilot_share_active\(/,name);
 assert.match(source,/efg_private\.coach_has_student\(p_student\)/,name);
 assert.match(source,/r\.sharing_accepted is true/,name);
 assert.match(source,/p\.organization_id=p_org and p\.role='student' and p\.active/,name);
}
assert.match(sql,/p_sharing is null/);
assert.match(sql,/Separate pilot coach-sharing permission required/);
assert.match(sql,/v_route:='private'/);
assert.match(sql,/v_intake\.shared_at is not null and v_follow_up and v_sharing/);
assert.doesNotMatch(sql,/\b(delete from|truncate|drop table|alter table public\.efg_(?:goals|daily_logs|food_plans))\b/i);
assert.match(receipt,/sharing_accepted boolean not null,/);
assert.doesNotMatch(receipt,/sharing_accepted boolean not null check/);
assert.match(intake,/r\.participation_accepted and r\.sharing_accepted and r\.revoked_at is null/);
// A false sharing receipt must allow an owner-only intake. The first
// participation guard must never demand sharing; the later share=true guard must.
for(const [name,source] of [['base intake migration',intake],['corrective migration',sql]]){
 const start=source.indexOf('-- Participation is required; sharing is a separate OPTIONAL choice checked only when requested.');
 const end=source.indexOf('-- Reject unknown and sensitive keys',start);
 assert.ok(start>=0&&end>start,name+': participation guard not found');
 const guard=source.slice(start,end);
 assert.match(guard,/r\.participation_accepted\s+and r\.revoked_at is null/,name);
 assert.doesNotMatch(guard,/r\.sharing_accepted/,name+': private intake would be blocked');
 assert.match(source.slice(end),/if p_share_with_coach then[\s\S]*?r\.sharing_accepted/,name+': sharing requires explicit receipt');
}

assert.match(entry,/not v_sharing/);
assert.match(ui,/sharingRequested:share\.checked/);
assert.match(status,/route==='private'/);
assert.match(app,/pilot\?\.route==="private"/);
assert.doesNotMatch(app,/Para continuar compartí la ficha con el coach/);
assert.match(read('pilot/coach-student-journey.js'),/COACH_STUDENT_JOURNEY_ENABLED=false/);
assert.match(read('pilot/coach-relaunch-onboarding.js'),/COACH_RELAUNCH_ONBOARDING_ENABLED=false/);
console.log('PASS COACH-OPT-01: voluntary private intake, revocation-aware signed status, guarded corrective migration OFF. SQL not applied.');
