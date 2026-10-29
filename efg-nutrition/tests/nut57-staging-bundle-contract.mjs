// NUT-57 static integration safety contract. Synthetic/files only.
// DOES NOT certify deployability, full SQL execution or approved legal records.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {NUT57_BLOCKERS,NUT57Status,inspectNUT57Modules,buildNUT57RollbackPreview}
 from "./nut57-staging-bundle.mjs";

const expected=["intake-access","private-coach-draft","food-evidence","notification-compat","atomic-publication"];
const modules=inspectNUT57Modules(),status=NUT57Status();
assert.deepEqual(modules.map(x=>x.id),expected,"stage order and dependency graph must not drift");
assert.deepEqual(status.order,expected);
assert.equal(status.readyForRelease,false,"release must remain explicitly blocked");
assert.equal(status.mode,"STAGING_ROLLBACK_PREVIEW_ONLY");
assert.ok(status.blockers.length>=5);
assert.deepEqual(status.blockers,[...NUT57_BLOCKERS]);
assert.ok(status.blockers.some(s=>s.includes("legal")));
assert.ok(status.blockers.some(s=>s.includes("restore")));
assert.ok(status.blockers.some(s=>s.includes("PWA")));
assert.ok(modules.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
const preview=buildNUT57RollbackPreview();
const statements=preview.split(/\r?\n/).map(x=>x.trim().toUpperCase());
assert.deepEqual(statements.filter(x=>/^(BEGIN|COMMIT|ROLLBACK);$/.test(x)),
 ["BEGIN;","ROLLBACK;"],"preview contains exactly ONE transaction and mandatory rollback; no commit");
assert.ok(preview.startsWith("-- NUT-57 STAGING REVIEW. NEVER EXECUTE ON PRODUCTION."));
assert.match(preview,/SET LOCAL lock_timeout = '3s';/);
assert.match(preview,/SET LOCAL statement_timeout = '45s';/);
const guard=preview.indexOf("nut57_isolated_staging_marker");
const firstTable=preview.indexOf("create table public.efg_student_plan_access");
assert.ok(guard>0&&firstTable>guard,"preflight must reject non-staging before DDL");
assert.match(preview,/to_regclass\('public\.efg_legal_documents'\)/);
assert.match(preview,/to_regclass\('public\.efg_legal_acceptances'\)/);
for(const m of modules){
 const marker="-- NUT57 SOURCE "+m.id+" sha256="+m.sha256;
 assert.equal(preview.split(marker).length,2,"each module must appear exactly once");
 assert.ok(preview.includes("-- NUT57 END "+m.id));
 assert.ok(preview.includes(m.body.trim()),"cannot silently omit SQL source "+m.id);
}
const order=modules.map(m=>preview.indexOf("-- NUT57 SOURCE "+m.id));
assert.ok(order.every((n,i)=>i===0||n>order[i-1]),"modules must be ordered by dependencies");
assert.match(preview,/trg_efg_notify_goal/,"existing notification compatibility must remain");
assert.match(preview,/coach_publication_policy_valid/,"server-owned food/legal validator must remain");
assert.match(preview,/revoke insert,update,delete on public\.efg_goals/,"legacy goal client write denial must remain");
assert.match(preview,/revoke insert,update,delete on public\.efg_food_plans/,"legacy guide client write denial must remain");
assert.doesNotMatch(preview,/^COMMIT\s*;/im);
assert.ok(preview.trimEnd().endsWith("-- NO COMMIT. NO DATA OR SCHEMA IS INTENTIONALLY PERSISTED."));
const loc=fileURLToPath(new URL("./nut57-staging-bundle.mjs",import.meta.url));
const invalid=spawnSync(process.execPath,[loc,"--apply-production"],{encoding:"utf8",timeout:8000});
assert.equal(invalid.status,2,"unknown/apply options must be rejected");
assert.match(invalid.stderr,/only --status or --preview-sql/);
const summary=spawnSync(process.execPath,[loc,"--status"],{encoding:"utf8",timeout:8000});
assert.equal(summary.status,0);
assert.deepEqual(JSON.parse(summary.stdout).order,expected);
// No SQL execution, no access to user/hosted data, no migration history.
console.log("PASS NUT57: five historical SQL modules assembled in one ROLLBACK-only staging preview, guard before DDL, legal/restore/PWA release blockers, no production/apply action. STATIC REVIEW ONLY.");
