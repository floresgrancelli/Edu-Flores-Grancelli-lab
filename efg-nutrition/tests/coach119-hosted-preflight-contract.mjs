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
 'PILOT_TERMS_AND_PRIVACY_CURRENT','ANY_CURRENT_REVIEWED_FOOD'])
 assert.ok(afterBody.includes(token),'Missing post-install check '+token);
assert.doesNotMatch(afterBody,/select\s+\*/i);
assert.ok(afterBody.includes("to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is not null"));
assert.ok(body.includes("to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null"));
console.log('PASS: independent PRE vs POST install SQL contracts; one READ-ONLY SELECT each, no GO inferred.');
