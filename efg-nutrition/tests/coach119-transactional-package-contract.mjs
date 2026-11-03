// Static-only CI gate. No Supabase connections, no SQL execution or secrets.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {buildPilotCoach119Transaction,RELEASE_SOURCES} from '../tools/prepare-pilot-coach119-release.mjs';
const pack=buildPilotCoach119Transaction();
assert.deepEqual(pack.blocks,['SEC09','OPT01','FOOD_URL','COACH119','COACH116','GU06']);
assert.equal(RELEASE_SOURCES.length,6);
assert.match(pack.sha256,/^[a-f0-9]{64}$/);
assert.match(pack.sql,/^begin;$/m);
assert.equal((pack.sql.match(/^begin;\s*$/gm)||[]).length,1);
assert.equal((pack.sql.match(/^commit;\s*$/gm)||[]).length,1);
assert.ok(pack.sql.indexOf('BEGIN AUDITED SOURCE SEC09')<pack.sql.indexOf('BEGIN AUDITED SOURCE OPT01'));
assert.ok(pack.sql.indexOf('BEGIN AUDITED SOURCE OPT01')<pack.sql.indexOf('BEGIN AUDITED SOURCE FOOD_URL'));
assert.ok(pack.sql.indexOf('BEGIN AUDITED SOURCE FOOD_URL')<pack.sql.indexOf('BEGIN AUDITED SOURCE COACH119'));
assert.ok(pack.sql.indexOf('BEGIN AUDITED SOURCE COACH119')<pack.sql.indexOf('BEGIN AUDITED SOURCE COACH116'));
assert.ok(pack.sql.indexOf('BEGIN AUDITED SOURCE COACH116')<pack.sql.indexOf('BEGIN AUDITED SOURCE GU06'));
assert.match(pack.sql,/create function public\.efg_coach_shared_student_recipes\(p_student uuid\)/);
assert.match(pack.sql,/NCC_ABORT: GU06 owner recipe RLS or scoped Coach RPC not verified/);
assert.match(pack.sql,/v_legal_count<>2/,
 'Both Coach and student must accept current independently versioned notices');
assert.match(pack.sql,/pg_catalog\.has_table_privilege\('anon','public\.efg_personal_recipes','SELECT'\)/,
 'Anonymous table access must not be granted');
assert.match(pack.sql,/v_guide->>'kind'='flexible_meal_guide'/);
assert.match(pack.sql,/v_intake\.age_years is null/);
assert.match(pack.sql,/NCC_ABORT: signed student entry must support complete intake/);
assert.match(pack.sql,/NCC_ABORT: release flags must remain OFF/);
assert.match(pack.sql,/if p_share_with_coach and \([\s\S]*?p_payload->>'age_years' is null/,
 'Final OPT01 server RPC must refuse missing required intake data');
assert.match(pack.sql,/NCC: complete objective, age, height, weight, activity and diet before sharing/);
assert.match(pack.sql,/values\s*\(\s*'pilot_coach_atomic_publication'\s*,\s*false/i);
assert.doesNotMatch(pack.sql,/[\n\r]\s*\\(?:i|copy|include)\b/i);
const check=JSON.parse(execFileSync(process.execPath,['efg-nutrition/tools/prepare-pilot-coach119-release.mjs','--check'],{encoding:'utf8'}));
assert.equal(check.status,'PREPARED_NOT_APPLIED');
assert.equal(check.sha256,pack.sha256);
assert.equal(check.transactions,1);
assert.equal(check.productionWrites,0);
assert.equal(check.flagsEnabled,0);
assert.throws(()=>execFileSync(process.execPath,['efg-nutrition/tools/prepare-pilot-coach119-release.mjs','--emit'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}),/Command failed/);
const emitted=execFileSync(process.execPath,['efg-nutrition/tools/prepare-pilot-coach119-release.mjs','--emit','--ack=PREPARE_ONLY_NOT_GO'],{encoding:'utf8'});
assert.equal(emitted,pack.sql);

// NCC P25C: protect the narrow hosted remediation against accidental drift.
// STATIC ONLY: never execute this candidate against a live Supabase instance.
const sourceVerifier=readFileSync(new URL('../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',import.meta.url),'utf8');
const canonicalVerifier=sourceVerifier.match(/create function efg_private\.coach_guide_foods_verified\(p_guide jsonb\)\n[\s\S]*?\n\$verify\$;/)?.[0];
assert.ok(canonicalVerifier,'COACH114 canonical verifier unavailable');
const v2Candidate=readFileSync(new URL('../docs/NCC_P25_HOSTED_V2_NUTRITION_VERIFIER_NOT_APPLIED.sql',import.meta.url),'utf8');
assert.ok(v2Candidate.includes(canonicalVerifier.replace(/^create function/,'create or replace function')),
 'P25C candidate must reuse exact PG17-tested nutrient validation, not relax selected-food checks');
assert.equal((v2Candidate.match(/^begin;$/gm)||[]).length,1);
assert.equal((v2Candidate.match(/^commit;$/gm)||[]).length,1);
assert.match(v2Candidate,/NCC_P25C_ABORT: unexpected or already-upgraded verifier/);
assert.match(v2Candidate,/NCC_P25C_ABORT: pilot switches must remain OFF/);
assert.match(v2Candidate,/revoke all on function efg_private\.coach_guide_foods_verified\(jsonb\)/);
const postflight=readFileSync(new URL('./sql/coach119-postinstall-readonly-preflight.sql',import.meta.url),'utf8');
assert.match(postflight,/COACH119_NUTRITION_SOURCE_VERIFIER_FLEXIBLE_V2/);
assert.equal((postflight.match(/COACH119_NUTRITION_SOURCE_VERIFIER_FLEXIBLE_V2/g)||[]).length,1);
console.log('PASS P25C candidate-only source verifier parity and hosted drift gate. No server calls or approvals.');
console.log('PASS: 6 SHA-pinned audited SQL candidates -> one transaction, NO deployment, switches OFF, manual GO required.');
