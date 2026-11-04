// Install the existing Coach modules together on an isolated PostgreSQL 17 copy.
// No production mode, credentials, legal text, food approvals or feature activation.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const COACH_RELEASE_DATABASE='efg_coach_release_rehearsal';
export const COACH_RELEASE_MODULES=Object.freeze([
 ['legal','docs/LEGAL_VERSIONED_ACCEPTANCE_STAGING_SQL_20261029.sql'],
 ['access','migrations/20261029_coach_intake_plan_access_DRAFT.sql'],
 ['intake','docs/COACH_RELAUNCH_REONBOARDING_STAGING_ONLY.sql'],
 ['draft','docs/COACH68_VERSIONED_DRAFT_STAGING_ONLY.sql'],
 ['policy','docs/COACH68_VERSIONED_POLICY_STAGING_ONLY.sql'],
 ['notifications','docs/NUT56_LEGACY_NOTIFICATION_COMPAT_STAGING_ONLY.sql'],
 ['publish','docs/COACH68_VERSIONED_ATOMIC_PUBLISH_STAGING_ONLY.sql'],
 ['welcome','docs/BRAND77B_SCIENCE_WELCOME_STAGING_ONLY.sql']
]);

export function coachReleaseSources(){
 return COACH_RELEASE_MODULES.map(([id,path])=>{
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const controls=source.split(/\r?\n/).map(s=>s.trim().toUpperCase())
   .filter(s=>/^(BEGIN|COMMIT|ROLLBACK);$/.test(s));
  if(JSON.stringify(controls)!==JSON.stringify(['BEGIN;','COMMIT;']))
   throw Error('Unexpected transaction boundaries in '+path);
  if(/^\s*\\/m.test(source)||/\b(?:drop\s+(?:schema|database)|truncate|delete\s+from\s+auth\.users)\b/i.test(source))
   throw Error('Unexpected destructive command in '+path);
  return {id,path,sha256:createHash('sha256').update(source).digest('hex'),
   body:source.replace(/^\s*begin;\s*$/im,'').replace(/^\s*commit;\s*$/im,'').trim()};
 });
}

export function buildCoachReleaseBundle(){
 const modules=coachReleaseSources();
 return [
  '-- COACH RELEASE: isolated installation only; never use on hosted production.',
  '-- All eight source modules commit together. No seeded approvals or user acceptances.',
  'BEGIN;',
  "SET LOCAL lock_timeout='3s';",
  "SET LOCAL statement_timeout='60s';",
  `DO $release_preflight$ BEGIN
   IF current_database()<>'${COACH_RELEASE_DATABASE}'
      OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'COACH RELEASE STOP: dedicated isolated PG17 database required';
   END IF;
   IF to_regclass('efg_private.nut57_isolated_staging_marker') IS NULL THEN
    RAISE EXCEPTION 'COACH RELEASE STOP: isolated marker missing';
   END IF;
   IF (SELECT count(*) FROM efg_private.nut57_isolated_staging_marker)<>1 THEN
    RAISE EXCEPTION 'COACH RELEASE STOP: invalid isolated marker';
   END IF;
  END $release_preflight$;`,
  ...modules.flatMap(m=>['-- SOURCE '+m.path+' SHA256 '+m.sha256,m.body]),
  `DO $release_postflight$
  DECLARE object_name text;
  BEGIN
   FOREACH object_name IN ARRAY ARRAY[
    'efg_legal_documents','efg_legal_acceptances','efg_student_plan_access',
    'efg_student_intakes','efg_coach_relaunch_intakes','efg_coach_plan_drafts',
    'efg_coach_plan_publish_receipts','efg_science_intro_receipts'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=object_name AND c.relrowsecurity) THEN
     RAISE EXCEPTION 'COACH RELEASE STOP: table absent or RLS disabled: %',object_name;
    END IF;
   END LOOP;
   IF to_regprocedure('public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)') IS NULL
      OR to_regprocedure('public.efg_publish_coach_plan_draft(uuid,bigint,uuid)') IS NULL
      OR to_regprocedure('public.efg_ack_science_intro(text,text)') IS NULL THEN
    RAISE EXCEPTION 'COACH RELEASE STOP: versioned RPC missing';
   END IF;
  END $release_postflight$;`,
  'COMMIT;',''
 ].join('\n\n');
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 if(process.argv.length!==3||process.argv[2]!=='--isolated-sql'){
  console.error('Usage: node coach-release-bundle.mjs --isolated-sql (PG17 isolated copy ONLY)');
  process.exitCode=2;
 }else process.stdout.write(buildCoachReleaseBundle());
}
