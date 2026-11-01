-- COACH69 strictly disposable Supabase LOCAL stack, AFTER all legacy Coach tests.
-- Existing hosted or unmarked database MUST reject. No SQL from production.
begin;
do $isolate$
begin
 if current_database()<>'postgres'
   or pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null
   or (select count(*) from efg_private.nut57_isolated_staging_marker)<>1
   or pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is null
   or pg_catalog.to_regclass('public.efg_coach_plan_drafts') is null
 then raise exception 'COACH69 STOP: not marked disposable LOCAL stack'
 using errcode='55000'; end if;
end $isolate$;
-- Legacy draft publication was tested earlier in this same disposable job;
-- remove only its artifacts so version-aware SQL can be installed and JWT-tested.
drop function if exists public.efg_publish_coach_plan_draft(uuid,bigint,uuid);
drop table if exists public.efg_coach_plan_publish_receipts;
drop function if exists public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,bigint);
drop function if exists efg_private.coach_publication_policy_valid(uuid,jsonb,jsonb,uuid);
drop table if exists efg_private.coach_publication_scope_reviews;
drop table if exists efg_private.coach_food_pattern_reviews;
drop table if exists efg_private.coach_reviewed_foods;
drop table if exists public.efg_coach_plan_drafts;
commit;
