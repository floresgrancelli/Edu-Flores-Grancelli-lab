// NUT-57 B3 | CI-ONLY synthetic fixture transformation, NOT a release migration.
// Reads SQL from standard input and writes SQL to standard output. No DB/network.
// The ordinary NUT57 bundle remains ROLLBACK-only; this CI-only test verifies
// that a COMMITTED change can be fully discarded by restoring a preupgrade dump.
// Never run or export this SQL outside GitHub Actions disposable PostgreSQL 17.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

assert.equal(process.env.GITHUB_ACTIONS,"true","CI only");
assert.equal(process.env.PGHOST,"127.0.0.1","local PostgreSQL only");
assert.equal(process.env.PGDATABASE,"efg_nut57_postcommit","dedicated synthetic fixture only");
assert.equal(process.env.NUT57_SYNTHETIC_RESTORE_TEST,"true","explicit fixture-only gate");
const source=readFileSync(0,"utf8");
const tx=source.split(/\r?\n/).map(s=>s.trim().toUpperCase())
 .filter(s=>/^(BEGIN|COMMIT|ROLLBACK);$/.test(s));
assert.deepEqual(tx,["BEGIN;","ROLLBACK;"],"exactly one BEGIN and one ROLLBACK");
for(const name of ["intake-access","private-coach-draft","food-evidence",
 "notification-compat","atomic-publication"]){
 assert.ok(source.includes("-- NUT57 SOURCE "+name+" sha256="),"missing source "+name);
 assert.ok(source.includes("-- NUT57 END "+name),"missing end "+name);
}
assert.ok(source.includes("efg_private.nut57_isolated_staging_marker"),
 "isolated marker preflight is mandatory");
assert.ok(source.includes("NUT57 STOP: not an approved isolated staging database"),
 "isolation error must remain");
assert.ok(!/\b(?:DROP\s+DATABASE|COPY\s+.*PROGRAM|\\connect|\\copy)\b/i.test(source));
const marker="\nROLLBACK;\n";
assert.equal(source.split(marker).length,2,"unique ROLLBACK at end");
const suffix="-- NO COMMIT. NO DATA OR SCHEMA IS INTENTIONALLY PERSISTED.";
assert.ok(source.trimEnd().endsWith(suffix));
const onlyCI=source.replace(marker,"\nCOMMIT;\n")
 .replace(suffix,"-- CI SYNTHETIC TEST ONLY: COMMIT then DESTROY AND RESTORE this disposable database.");
assert.ok(onlyCI.startsWith("-- NUT-57 STAGING REVIEW."));
process.stdout.write(
 "-- NUT-57 B3: EPHEMERAL CI TEST ONLY. Not a deployable migration.\n"+
 "-- Database efg_nut57_postcommit is destroyed in this same CI job.\n"+
 onlyCI);
