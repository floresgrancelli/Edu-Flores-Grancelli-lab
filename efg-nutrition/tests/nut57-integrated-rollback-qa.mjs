// NUT-57 · DETERMINISTIC SQL OUTPUT ONLY. NEVER connects to a database.
// This is NOT a production migration generator: output has no COMMIT and
// always ends with ROLLBACK. Tests run it on isolated synthetic PG17 only.
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import {buildNUT57RollbackPreview,NUT57Status} from "./nut57-staging-bundle.mjs";

const assertions=readFileSync(fileURLToPath(new URL("./sql/nut57-rollback-assertions.sql",import.meta.url)),"utf8");
const terminal="\n\nROLLBACK;\n\n-- NO COMMIT. NO DATA OR SCHEMA IS INTENTIONALLY PERSISTED.\n";
const transactionStatements=s=>s.split(/\r?\n/).map(line=>line.trim().toUpperCase())
  .filter(line=>/^(BEGIN|COMMIT|ROLLBACK);$/.test(line));

export function buildIntegratedStagingPreview(mode="assert"){
 if(!["assert","inject-failure"].includes(mode))throw Error("Unsupported synthetic QA mode");
 const base=buildNUT57RollbackPreview();
 assert.equal(base.split(terminal).length,2,"NUT57 preview must end once in mandatory ROLLBACK");
 assert.equal(transactionStatements(base).join(","),"BEGIN;,ROLLBACK;");
 assert.ok(base.includes("-- NUT57 END atomic-publication"));
 assert.ok(!/\b(?:COMMIT|END TRANSACTION)\s*;/im.test(assertions));
 assert.ok(!/(^|\n)\s*\\(?:connect|i|include|copy|!)/i.test(assertions));
 const injected=mode==="inject-failure"
   ? "\nDO $forced_rollback$ BEGIN RAISE EXCEPTION 'NUT57 SYNTHETIC INJECTED FAILURE'; END $forced_rollback$;\n"
   : "";
 const source=base.replace(terminal,"\n\n"+assertions.trim()+"\n"+injected+terminal);
 assert.equal(transactionStatements(source).join(","),"BEGIN;,ROLLBACK;");
 assert.ok(source.indexOf("nut57_isolated_staging_marker")<source.indexOf("-- NUT57 SOURCE intake-access"));
 assert.ok(source.indexOf("-- NUT57 END atomic-publication")<source.indexOf("$nut57_inside$"));
 assert.ok(source.trimEnd().endsWith("-- NO COMMIT. NO DATA OR SCHEMA IS INTENTIONALLY PERSISTED."));
 assert.equal(NUT57Status().readyForRelease,false);
 return source;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 if(process.argv[2]==="--assert-preview-sql")process.stdout.write(buildIntegratedStagingPreview("assert"));
 else if(process.argv[2]==="--inject-failure-sql")process.stdout.write(buildIntegratedStagingPreview("inject-failure"));
 else{
  process.stderr.write("NUT57: only --assert-preview-sql or --inject-failure-sql; STAGING and ROLLBACK always.\n");
  process.exitCode=2;
 }
}
