// Exact versioned preflight for a managed PostgreSQL host: no destructive SQL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./sql/coach119-hosted-readonly-preflight.sql',import.meta.url),'utf8');
const body=src.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n');
assert.match(body,/^with checks\(/im);
assert.match(body,/from checks order by phase,check_id;\s*$/);
assert.equal((body.match(/;/g)||[]).length,1,'Exactly one read-only SELECT');
assert.doesNotMatch(body,/\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|execute|call|do|commit|rollback)\s+(?:into|from|table|policy|function|trigger|on|database|schema|view|index)?\s*[a-z_]/i);
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
