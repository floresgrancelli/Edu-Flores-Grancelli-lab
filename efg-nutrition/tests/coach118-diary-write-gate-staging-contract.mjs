import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/COACH118_DIARY_WRITE_GATE_STAGING_ONLY.sql',import.meta.url),'utf8');
for(const s of ['STAGING ONLY','efg_private.nut57_isolated_staging_marker',
 'raise exception \'COACH118 STOP','student_daily_logs','enabled boolean not null default false',
 "values('student_daily_logs',false)",'enable row level security',
 'revoke all on efg_private.coach_release_write_gates from public,anon,authenticated',
 'before insert or update on public.efg_daily_logs',
 'auth.uid()','public.efg_coach_pilot_entry_status()',
 "v_state->>'route' is distinct from 'ready'",
 "v_state->>'legal_current_accepted' is distinct from 'true'",
 'security definer set search_path=\'\''])
 assert.ok(sql.includes(s),'Missing secure release write gate: '+s);
assert.doesNotMatch(sql,/update\s+efg_private\.coach_release_write_gates\s+set\s+enabled\s*=\s*true/i,
 'The release flag MUST remain disabled; cutover requires separate go');
assert.doesNotMatch(sql,/revoke\s+(?:all|select|insert|update)\s+on\s+public\.efg_daily_logs/i,
 'Never revoke legacy prod diary writes before approved cutover');
assert.match(sql,/return new;/,'Disabled gate preserves legacy writes.');
assert.match(sql,/raise exception 'Complete legal, pilot sharing, Coach plan publication before registering food'/);
console.log('PASS COACH118: staging marker, signed Server status, default-OFF daily diary write enforcement; no hosted changes, cutover gated.');
