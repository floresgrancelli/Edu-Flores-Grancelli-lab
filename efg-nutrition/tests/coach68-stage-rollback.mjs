// COACH-68 · ROLLBACK-ONLY staging compiler, no credentials and no apply/COMMIT mode.
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const modules=[
 ["intake-access","../migrations/20261029_coach_intake_plan_access_DRAFT.sql","create table public.efg_student_plan_access"],
 ["relaunch-intake","../docs/COACH_RELAUNCH_REONBOARDING_STAGING_ONLY.sql","create table public.efg_coach_relaunch_intakes"],
 ["versioned-draft","../docs/COACH68_VERSIONED_DRAFT_STAGING_ONLY.sql","source_intake_revision integer not null"],
 ["versioned-policy","../docs/COACH68_VERSIONED_POLICY_STAGING_ONLY.sql","intake_revision integer not null"],
 ["notification-compat","../docs/NUT56_LEGACY_NOTIFICATION_COMPAT_STAGING_ONLY.sql","drop trigger trg_efg_notify_goal"],
 ["versioned-publish","../docs/COACH68_VERSIONED_ATOMIC_PUBLISH_STAGING_ONLY.sql","v_draft.source_intake_revision"]
];
export function buildCoach68RollbackPreview(){
 const bodies=modules.map(([id,path,anchor])=>{
  const text=readFileSync(new URL(path,import.meta.url),"utf8");
  if(!text.includes(anchor))throw Error("COACH68 STOP missing anchor "+id);
  const tx=text.split(/\r?\n/).map(x=>x.trim().toLowerCase()).filter(x=>/^(begin|commit|rollback)\s*;$/.test(x));
  if(JSON.stringify(tx)!==JSON.stringify(["begin;","commit;"]))
   throw Error("COACH68 STOP unexpected transaction in "+id+": "+tx);
  if(/(^|\n)\s*\\(?:connect|i|include|copy|!)/i.test(text)||
   /\b(?:truncate\s+table|drop\s+schema|delete\s+from\s+auth\.users)\b/i.test(text))
   throw Error("COACH68 STOP forbidden destructive/meta command "+id);
  if(id.startsWith("versioned-")&&(
   !text.includes("coach_major_2026_r1")||
   /\b(?:from|join|update|into|on)\s+public\.efg_student_intakes\b/i.test(text)))
   throw Error("COACH68 STOP versioned SQL uses legacy intake "+id);
  return {id,body:text.replace(/^\s*begin;\s*$/im,"").replace(/^\s*commit;\s*$/im,"").trim()};
 });
 const behavior=readFileSync(new URL("./sql/coach68-versioned-behavior.sql",import.meta.url),"utf8");
 if(!behavior.includes("PASS COACH68 SIMULATED CLAIMS")||/^(?:\s*BEGIN|\s*COMMIT|\s*ROLLBACK)\s*;/im.test(behavior))
  throw Error("COACH68 STOP: invalid simulated-claims rollback companion.");
 return [
  "-- COACH68 VERSIONED release preview. SYNTHETIC ISOLATED PG17 ONLY.",
  "-- Release GO, legal and clinical signoff, hosted parity and mobile QA are absent.",
  "BEGIN;","SET LOCAL lock_timeout='3s';","SET LOCAL statement_timeout='60s';",
  "DO $coa68$ BEGIN IF pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') IS NULL",
  " THEN RAISE EXCEPTION 'COACH68 STOP: isolation marker absent' USING ERRCODE='55000'; END IF; END $coa68$;",
  ...bodies.flatMap(x=>["-- COACH68 MODULE "+x.id,x.body,"-- COACH68 END "+x.id]),
  "-- COACH68 synthetic simulated-claim behavior inside ROLLBACK",behavior,
  "DO $assert68$ BEGIN",
  "IF pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') IS NULL",
  " OR pg_catalog.to_regclass('public.efg_coach_plan_drafts') IS NULL",
  " OR pg_catalog.to_regclass('public.efg_coach_plan_publish_receipts') IS NULL",
  " OR pg_catalog.to_regclass('efg_private.coach_publication_scope_reviews') IS NULL",
  " OR pg_catalog.to_regprocedure('public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)') IS NULL",
  " OR pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft(uuid,bigint,uuid)') IS NULL",
  " THEN RAISE EXCEPTION 'COACH68 STOP: missing version-aware SQL objects'; END IF;",
  "IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute",
  " WHERE attrelid='public.efg_coach_plan_drafts'::regclass",
  " AND attname='source_intake_revision' AND NOT attisdropped)",
  " THEN RAISE EXCEPTION 'COACH68 STOP: missing revision column'; END IF;",
  "RAISE NOTICE 'PASS COACH68 INSIDE TRANSACTION: versioned SQL compiled in disposable PostgreSQL';",
  "END $assert68$;",
  "ROLLBACK;","-- Nothing was persisted."
 ].join("\n\n")+"\n";
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 if(process.argv[2]==="--preview-sql")process.stdout.write(buildCoach68RollbackPreview());
 else{process.stderr.write("COACH68: only --preview-sql, always ROLLBACK.\n");process.exitCode=2;}
}
