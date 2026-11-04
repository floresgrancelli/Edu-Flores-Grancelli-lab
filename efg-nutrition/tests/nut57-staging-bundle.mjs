// NUT-57 | STAGING REVIEW ONLY. Never a deployment or executable release migration.
// Fail closed. This builder deliberately has NO commit/apply mode, SQL credentials,
// network access, production URL, or ability to alter a database.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const MODULES=Object.freeze([
 {id:"intake-access",path:"../migrations/20261029_coach_intake_plan_access_DRAFT.sql",anchor:"create table public.efg_student_plan_access"},
 {id:"private-coach-draft",path:"../docs/COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql",anchor:"create table public.efg_coach_plan_drafts"},
 {id:"food-evidence",path:"../docs/COACH_PUBLICATION_EVIDENCE_POLICY_STAGING_SQL_20261029.sql",anchor:"create table efg_private.coach_reviewed_foods"},
 {id:"notification-compat",path:"../docs/NUT56_LEGACY_NOTIFICATION_COMPAT_STAGING_ONLY.sql",anchor:"drop trigger trg_efg_notify_goal"},
 {id:"atomic-publication",path:"../docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql",anchor:"create table public.efg_coach_plan_publish_receipts"}
]);

// Explicit release blockers. This is an honest checklist, not a substitute
// for expert review / evidence, and must not be silently cleared by unit tests.
export const NUT57_BLOCKERS=Object.freeze([
 "Final versioned legal documents/acceptance backend with audited, owner-only RPC and RLS is not installed/reviewed",
 "Independent clinical/dietary food evidence and restrictions are not approved for public use",
 "Full production-shape schema parity, existing students/clients, OTP/PWA session compatibility are unverified",
 "Full-system staging backup, restore and failure-injection rollback are not demonstrated",
 "Owner approval plus physical iPhone/Android/MacBook UAT are outstanding"
]);

const root=here=>fileURLToPath(new URL(here,import.meta.url));
const topLevelStatements=sql=>sql.split(/\r?\n/).map(x=>x.trim().toLowerCase())
 .filter(x=>/^(begin|commit|rollback)\s*;$/.test(x));

export function inspectNUT57Modules(){
 return MODULES.map(m=>{
  const content=readFileSync(root(m.path),"utf8");
  if(!content.includes(m.anchor))throw Error("NUT57 source drift: missing "+m.anchor+" in "+m.id);
  const tx=topLevelStatements(content);
  if(JSON.stringify(tx)!==JSON.stringify(["begin;","commit;"]))
   throw Error("NUT57 source drift: "+m.id+" requires one outer BEGIN/COMMIT; got "+tx.join(","));
  if(/(^|\n)\s*\\(?:connect|i|include|copy|!)/i.test(content))
   throw Error("NUT57 source drift: psql include, shell or connection meta-command forbidden");
  if(/\b(?:drop\s+schema\s+(?:public|auth)|truncate\s+table|delete\s+from\s+auth\.users)\b/i.test(content))
   throw Error("NUT57 source drift: potentially destructive SQL not approved in "+m.id);
  const body=content.replace(/^\s*begin;[ \t]*\r?\n/im,"")
   .replace(/^\s*commit;[ \t]*(?=\r?$)/im,"");
  if(topLevelStatements(body).length)
   throw Error("NUT57 source drift: nested transaction control in "+m.id);
  return {id:m.id,path:m.path,sha256:createHash("sha256").update(content).digest("hex"),body};
 });
}

// The generated SQL is an intentionally NON-PERSISTENT REVIEW PREVIEW.
// It ends in ROLLBACK unconditionally, even if all statements succeed.
// It requires a marker provisioned in a fully isolated/restorable test DB.
// There is intentionally no option anywhere to produce COMMIT.
export function buildNUT57RollbackPreview(){
 const modules=inspectNUT57Modules();
 const preflight=`DO $nut57_preflight$
BEGIN
 IF pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') IS NULL THEN
  RAISE EXCEPTION 'NUT57 STOP: not an approved isolated staging database' USING ERRCODE='55000';
 END IF;
 IF pg_catalog.to_regclass('public.efg_legal_documents') IS NULL
    OR pg_catalog.to_regclass('public.efg_legal_acceptances') IS NULL THEN
  RAISE EXCEPTION 'NUT57 STOP: versioned legal schema not installed' USING ERRCODE='55000';
 END IF;
 IF pg_catalog.to_regclass('public.efg_profiles') IS NULL
    OR pg_catalog.to_regclass('public.efg_goals') IS NULL
    OR pg_catalog.to_regclass('public.efg_food_plans') IS NULL
    OR pg_catalog.to_regclass('public.efg_consents') IS NULL THEN
  RAISE EXCEPTION 'NUT57 STOP: required existing schema not available' USING ERRCODE='55000';
 END IF;
END
$nut57_preflight$;`;
 return [
  "-- NUT-57 STAGING REVIEW. NEVER EXECUTE ON PRODUCTION.",
  "-- DRY-RUN ONLY: single transaction ALWAYS ROLLBACK. Not a release migration.",
  "-- Legality, food evidence, schema parity, client compatibility and backup restore: NOT SIGNED OFF.",
  "BEGIN;",
  "SET LOCAL lock_timeout = '3s';",
  "SET LOCAL statement_timeout = '45s';",
  preflight,
  ...modules.flatMap(m=>[
   "-- NUT57 SOURCE "+m.id+" sha256="+m.sha256,
   m.body.trim(),
   "-- NUT57 END "+m.id
  ]),
  "ROLLBACK;",
  "-- NO COMMIT. NO DATA OR SCHEMA IS INTENTIONALLY PERSISTED."
 ].join("\n\n")+"\n";
}
export function NUT57Status(){
 const parts=inspectNUT57Modules();
 return {
  mode:"STAGING_ROLLBACK_PREVIEW_ONLY",readyForRelease:false,
  order:parts.map(m=>m.id),sourceSha256:parts.map(m=>({id:m.id,sha256:m.sha256})),
  blockers:[...NUT57_BLOCKERS],
  legalBackendSource:"ABSENT: versioned legal backend still draft design",
  stagingFullRestore:"NOT VERIFIED",oldPwaSessions:"NOT VERIFIED"
 };
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const arg=process.argv[2];
 if(arg==="--preview-sql")process.stdout.write(buildNUT57RollbackPreview());
 else if(arg==="--status")process.stdout.write(JSON.stringify(NUT57Status(),null,2)+"\n");
 else{
  process.stderr.write("NUT57: only --status or --preview-sql (ROLLBACK only). NEVER a production deploy.\n");
  process.exitCode=2;
 }
}
