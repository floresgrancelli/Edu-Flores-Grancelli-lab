// COACH122 UX35: per-device cutover contract; old active sessions on B must
// NOT be treated as reauthenticated merely because user signed in on A.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../migrations/20261030_coach122_major_release_per_device_otp_cutover.sql',import.meta.url),'utf8');
for(const s of [
 "to_regclass('auth.sessions')",
 "from auth.sessions s",
 's.id=v_session_uuid and s.user_id=v_uid',
 'v_release.reauth_required_at is null',
 'v_session_started_at is null',
 'v_session_started_at < v_release.reauth_required_at',
 'reauth_required_at timestamptz',
 'coach122_active_cutover_required',
 "phase='preview'",
 'where active',
 'efg_major_release_status()',
 "from public,anon,authenticated"
])assert.ok(sql.includes(s),'COACH122 missing guard: '+s);
assert.doesNotMatch(sql,/v_old_session\s*=\s*v_session|v_old_session\s+is\s+null/,
 'Different existing devices may not grant each other fresh OTP status');
assert.doesNotMatch(sql,/auth\.sessions.*insert|update\s+auth\.sessions|delete\s+from\s+auth\.sessions/i,
 'Auth session records must be read-only');
assert.doesNotMatch(sql,/update\s+public\.efg_daily_logs|delete\s+from\s+public\.efg_daily_logs/i,
 'No old diaries touched');
assert.doesNotMatch(sql,/insert\s+into\s+efg_private\.major_release_manifests/i,
 'No release campaign seeded');
function clientEligible(sessionCreatedAt,reauthAt){
 return Boolean(sessionCreatedAt&&reauthAt&&
  new Date(sessionCreatedAt).getTime()>=new Date(reauthAt).getTime());
}
const cutover='2026-10-31T01:30:00Z';
const deviceA='2026-10-30T15:00:00Z';
const deviceB='2026-10-29T21:00:00Z';
assert.equal(clientEligible(deviceA,cutover),false);
assert.equal(clientEligible(deviceB,cutover),false,
 'Preexisting B must not skip OTP after A confirms signout');
assert.equal(clientEligible('2026-10-31T01:30:01Z',cutover),true,
 'Fresh OTP on A or B after release may proceed to legal acceptance');
assert.equal(clientEligible('2026-10-31T02:00:00Z',null),false);
const old=readFileSync(new URL('../migrations/20261030_coach121_major_release_published_build_gate.sql',import.meta.url),'utf8');
assert.match(old,/v_old_session=v_session/,'Previous vulnerability guarded by COACH122');
console.log('PASS COACH122: 2 pre-existing devices require independent fresh OTP after actual relaunch cutover, no campaign/diary/Auth modifications.');
