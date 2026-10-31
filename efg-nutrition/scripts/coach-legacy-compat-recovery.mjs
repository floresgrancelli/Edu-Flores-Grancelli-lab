// COACH86 · ISOLATED FALLBACK REHEARSAL ONLY. NEVER A PRODUCTION COMMAND.
// Restores ONLY the authenticated table DML grants observed on 30-Oct-2026,
// while disabling new Coach draft/publish RPCs and leaving legacy RPC blocked.
// This is NOT a full DB/Auth/Storage restoration or a complete rollback.
// The old UI must already be restored, and legal/security review is required
// before a real contingency. Does not weaken any table RLS policy.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {COACH_RELEASE_DATABASE} from './coach-release-bundle.mjs';

export function buildCoachLegacyCompatibilityRecoverySQL(){
 return [
 '-- COACH86: isolated fallback exercise. NOT PRODUCTION-READY.',
 '-- Restores original legacy DML only; preserves all data, tables and RLS.',
 '-- The new atomic publication MUST be disabled while legacy writes return.',
 'BEGIN;',
 "SET LOCAL lock_timeout='3s';",
 "SET LOCAL statement_timeout='45s';",
 `DO $coach86_guard$
 BEGIN
  IF current_database()<>'${COACH_RELEASE_DATABASE}'
   OR current_setting('server_version_num')::integer/10000<>17
   OR to_regclass('efg_private.nut57_isolated_staging_marker') IS NULL
   OR to_regclass('public.efg_coach_plan_publish_receipts') IS NULL
   OR to_regprocedure('public.efg_publish_coach_plan_draft(uuid,bigint,uuid)') IS NULL
   OR to_regprocedure('public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)') IS NULL THEN
   RAISE EXCEPTION 'COACH86 STOP: only pre-tested isolated post-upgrade PG17 copy is permitted';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.efg_goals'::regclass)
   OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.efg_food_plans'::regclass) THEN
    RAISE EXCEPTION 'COACH86 STOP: owner access RLS is required';
  END IF;
 END $coach86_guard$;`,
 'REVOKE EXECUTE ON FUNCTION public.efg_publish_coach_plan_draft(uuid,bigint,uuid) FROM PUBLIC,anon,authenticated;',
 'REVOKE EXECUTE ON FUNCTION public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint) FROM PUBLIC,anon,authenticated;',
 // The staged old publication RPC is not in the verified live baseline, and
 // restoring its EXECUTE would create an unreviewed bypass of atomic approval.
 'REVOKE EXECUTE ON FUNCTION public.efg_publish_coach_plan(uuid,uuid) FROM PUBLIC,anon,authenticated;',
 'GRANT INSERT,UPDATE,DELETE ON TABLE public.efg_goals TO authenticated;',
 'GRANT INSERT,UPDATE,DELETE ON TABLE public.efg_food_plans TO authenticated;',
 `DO $coach86_assert$
 BEGIN
  IF has_function_privilege('authenticated','public.efg_publish_coach_plan_draft(uuid,bigint,uuid)','EXECUTE')
   OR has_function_privilege('authenticated','public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)','EXECUTE')
   OR has_function_privilege('authenticated','public.efg_publish_coach_plan(uuid,uuid)','EXECUTE')
   OR has_table_privilege('anon','public.efg_goals','INSERT')
   OR has_table_privilege('anon','public.efg_food_plans','INSERT')
   OR NOT has_table_privilege('authenticated','public.efg_goals','INSERT,UPDATE,DELETE')
   OR NOT has_table_privilege('authenticated','public.efg_food_plans','INSERT,UPDATE,DELETE') THEN
   RAISE EXCEPTION 'COACH86 STOP: unsafe or incomplete isolated legacy grant recovery';
  END IF;
 END $coach86_assert$;`,
 'COMMIT;',''
 ].join('\n');
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 if(process.argv.length!==3||process.argv[2]!=='--isolated-rehearsal-sql'){
  console.error('COACH86: generates SQL only for an isolated PG17 rehearsal database. No production mode.');
  process.exitCode=2;
 }else process.stdout.write(buildCoachLegacyCompatibilityRecoverySQL());
}
