-- NCC COACH119 · hosted READ-ONLY preflight · 02/11/2026
-- Single SELECT only; no personal rows, data writes, staging creation or flags.
-- Order for approved isolated restore: COACH-SEC-09 -> COACH-OPT-01 -> COACH114 URL fix -> COACH119.
-- This verifies dependency presence, NEVER release approval or restored backup parity.
with checks(phase,check_id,passed,explanation) as (
 values
 ('01_SEC09'::text,'OWNER_INTAKE_RLS_QUALIFIED'::text,(exists(select 1 from pg_policies where schemaname='public' and tablename='efg_coach_relaunch_intakes' and policyname='efg_coach_relaunch_owner_select' and qual like '%efg_coach_relaunch_intakes.organization_id%'))::boolean,'SEC-09 owner intake policy must be staged first'::text),
 ('01_SEC09'::text,'OWNER_RECEIPTS_RLS_QUALIFIED'::text,(exists(select 1 from pg_policies where schemaname='public' and tablename='efg_pilot_participation_receipts' and policyname='efg_pilot_participation_owner_read' and qual like '%efg_pilot_participation_receipts.organization_id%'))::boolean,'SEC-09 owner receipt policy must be staged first'::text),
 ('01_SEC09'::text,'NO_AMBIGUOUS_OWNER_RLS'::text,(not exists(select 1 from pg_policies where (schemaname,tablename,policyname) in (('public','efg_coach_relaunch_intakes','efg_coach_relaunch_owner_select'),('public','efg_pilot_participation_receipts','efg_pilot_participation_owner_read')) and qual like '%p.organization_id = p.organization_id%'))::boolean,'Reject tautological organization comparison'::text),
 ('02_OPT01'::text,'OPTIONAL_SHARING_CONSTRAINT_REMOVED'::text,(not exists(select 1 from pg_constraint where conrelid=to_regclass('public.efg_pilot_participation_receipts') and conname='efg_pilot_participation_receipts_sharing_accepted_check'))::boolean,'Optional sharing change only after SEC09'::text),
 ('02_OPT01'::text,'OPTIONAL_SHARING_HELPER_EXISTS'::text,(to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is not null)::boolean,'Signed helper required before COACH119'::text),
 ('02_OPT01'::text,'SIGNED_SHARED_COACH_POLICY'::text,(exists(select 1 from pg_policies where schemaname='public' and tablename='efg_coach_relaunch_intakes' and policyname='efg_coach_relaunch_shared_coach_select' and qual like '%coach_pilot_share_active%'))::boolean,'Coach reads must stop on sharing opt-out'::text),
 ('03_FOOD_URL'::text,'FIXED_REVIEWED_FOOD_URL_CONSTRAINT'::text,(exists(select 1 from pg_constraint where conrelid=to_regclass('efg_private.coach_reviewed_foods') and conname='coach_reviewed_foods_source_url_check' and pg_get_constraintdef(oid) like '%char_length%' and pg_get_constraintdef(oid) not like '%{8,1990}%'))::boolean,'Fix invalid URL regex before approved catalog ingestion'::text),
 ('04_COACH119'::text,'RELEASE_SWITCHES_DEFAULT_OFF'::text,(not exists(select 1 from efg_private.coach_release_switches where enabled))::boolean,'Release flags must remain OFF before GO'::text),
 ('04_COACH119'::text,'ATOMIC_RPC_NOT_YET_INSTALLED'::text,(to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null)::boolean,'Safe current state; NOT proof of release readiness'::text),
 ('04_COACH119'::text,'ATOMIC_RECEIPTS_NOT_YET_INSTALLED'::text,(to_regclass('public.efg_coach_plan_publish_receipts') is null)::boolean,'Safe current state; NOT proof of release readiness'::text),
 ('04_COACH119'::text,'COACH_DRAFT_READ_POLICY_EXISTS'::text,(exists(select 1 from pg_policies where schemaname='public' and tablename='efg_coach_plan_drafts' and policyname='coach_draft_read_own'))::boolean,'COACH119 tightens the existing draft policy'::text),
 ('04_COACH119'::text,'GOAL_NOTIFY_TRIGGER_EXISTS'::text,(exists(select 1 from pg_trigger where tgrelid=to_regclass('public.efg_goals') and tgname='trg_efg_notify_goal' and tgenabled='O'))::boolean,'Keep legacy goal notices'::text),
 ('04_COACH119'::text,'GUIDE_NOTIFY_TRIGGER_EXISTS'::text,(exists(select 1 from pg_trigger where tgrelid=to_regclass('public.efg_food_plans') and tgname='trg_efg_notify_food_guide' and tgenabled='O'))::boolean,'Keep legacy guide notices'::text),
 ('04_COACH119'::text,'FOOD_VERIFIER_EXISTS'::text,(to_regprocedure('efg_private.coach_guide_foods_verified(jsonb)') is not null)::boolean,'Food corpus must be reviewed separately'::text),
 ('04_COACH119'::text,'COACH_OWNERSHIP_HELPER_EXISTS'::text,(to_regprocedure('efg_private.coach_has_student(uuid)') is not null)::boolean,'Coach scoping remains mandatory'::text),
 ('04_COACH119'::text,'SIGNED_ENTRY_STATUS_EXISTS'::text,(to_regprocedure('public.efg_coach_pilot_entry_status()') is not null)::boolean,'Student route remains server-owned'::text),
 ('05_GO_CONTENT'::text,'CURRENT_TERMS_AND_PRIVACY_PRESENT'::text,((select count(distinct kind)=2 from public.efg_legal_documents where is_current and published_at is not null and kind in ('terms','privacy') and sha256 ~ '^[a-f0-9]{64}$' and char_length(body)>=300 and body !~* 'BORRADOR[[:space:]]+INTERNO' and body !~* 'NO[[:space:]]+PUBLICAR' and position('[PENDIENTE' in body)=0))::boolean,'Still requires human validation of pilot owner/contact'::text),
 ('05_GO_CONTENT'::text,'SOME_REVIEWED_FOOD_EVIDENCE'::text,(exists(select 1 from efg_private.coach_reviewed_foods where evidence_status='reviewed' and reviewed_by is not null and reviewed_at is not null and expires_at>now()))::boolean,'Existence is NOT coverage of full selected catalog'::text)
)
select phase,check_id,passed,
  case when passed then 'VERIFIED_PRESENT_OR_SAFE_DEFAULT' else 'MISSING_OR_NOT_READY' end as status,
  explanation
from checks order by phase,check_id;
