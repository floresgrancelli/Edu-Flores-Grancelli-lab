-- COACH119 POST-INSTALL · read-only schema and minimum pilot content checks.
-- Unlike the PRE-install 18-check report, this expects the atomic RPC and receipts
-- TO EXIST. All switches must REMAIN OFF until explicit owner GO.
-- DO NOT infer a hosted GO from these metadata checks. Follow with JWT A/B,
-- scoped selected-food coverage, real OTP smoke and explicit owner GO.
-- Integral restore and expanded physical UAT are postponed until POST-GO.
-- Safe to run on an uninstalled managed DB: missing objects report false.
with checks(phase,check_id,passed,explanation) as (
 values
 ('01_SEC09'::text,'OWNER_INTAKE_RLS_QUALIFIED'::text,
   exists(select 1 from pg_policies where schemaname='public'
    and tablename='efg_coach_relaunch_intakes'
    and policyname='efg_coach_relaunch_owner_select'
    and qual like '%efg_coach_relaunch_intakes.organization_id%'),
   'Owner intake policy binds the row organization'::text),
 ('01_SEC09','OWNER_RECEIPTS_RLS_QUALIFIED',
   exists(select 1 from pg_policies where schemaname='public'
    and tablename='efg_pilot_participation_receipts'
    and policyname='efg_pilot_participation_owner_read'
    and qual like '%efg_pilot_participation_receipts.organization_id%'),
   'Receipt owner policy binds the row organization'),
 ('01_SEC09','NO_AMBIGUOUS_OWNER_RLS',
   not exists(select 1 from pg_policies where
    (schemaname,tablename,policyname) in (
     ('public','efg_coach_relaunch_intakes','efg_coach_relaunch_owner_select'),
     ('public','efg_pilot_participation_receipts','efg_pilot_participation_owner_read'))
    and qual like '%p.organization_id = p.organization_id%'),
   'Organization self-comparison must be absent'),
 ('02_OPT01','OPTIONAL_SHARING_CONSTRAINT_REMOVED',
   not exists(select 1 from pg_constraint where
    conrelid=to_regclass('public.efg_pilot_participation_receipts')
    and conname='efg_pilot_participation_receipts_sharing_accepted_check'),
   'Participation independent of coach sharing'),
 ('02_OPT01','OPTIONAL_SHARING_HELPER_EXISTS',
   to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is not null,
   'Revocable sharing helper installed'),
 ('02_OPT01','COACH_SELECT_REQUIRES_ACTIVE_SHARE',
   exists(select 1 from pg_policies where schemaname='public'
    and tablename='efg_coach_relaunch_intakes'
    and policyname='efg_coach_relaunch_shared_coach_select'
    and qual like '%coach_pilot_share_active%'),
   'Coach cannot read an unshared intake'),
 ('03_SOURCE','REVIEWED_FOOD_URL_CHECK_FIXED',
   exists(select 1 from pg_constraint where
    conrelid=to_regclass('efg_private.coach_reviewed_foods')
    and conname='coach_reviewed_foods_source_url_check'
    and pg_get_constraintdef(oid) like '%char_length%'
    and pg_get_constraintdef(oid) not like '%{8,1990}%'),
   'Food source URL length and HTTPS check fixed'),
 ('04_ATOMIC','COACH119_RPC_INSTALLED',
   to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is not null,
   'Atomic publication endpoint installed but not enabled'),
 ('04_ATOMIC','COACH119_RPC_SECURITY_LOCKED',
   exists(select 1 from pg_proc where
    oid=to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)')
    and prosecdef
    and proconfig @> array['search_path=""']::text[]),
   'Security definer restricted to empty search_path'),
 ('04_ATOMIC','COACH119_RPC_EXECUTE_LIMITED',
   exists(select 1 from pg_proc p where
    p.oid=to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)')
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and has_function_privilege('authenticated',p.oid,'EXECUTE')),
   'No anonymous publication permission'),
 ('04_ATOMIC','COACH119_RECEIPTS_PRIVATE_RLS',
   exists(select 1 from pg_class t where
    t.oid=to_regclass('public.efg_coach_plan_publish_receipts')
    and t.relrowsecurity
    and not has_table_privilege('anon',t.oid,'SELECT')),
   'Receipt table RLS and no anonymous read'),
 ('04_ATOMIC','COACH119_HISTORY_PRIVATE_RLS',
   exists(select 1 from pg_class where
    oid=to_regclass('efg_private.coach_guide_history') and relrowsecurity),
   'Previous published guides remain private'),
 ('04_ATOMIC','COACH119_TRANSACTION_MARKER_PRIVATE_RLS',
   exists(select 1 from pg_class where
    oid=to_regclass('efg_private.coach119_atomic_transactions') and relrowsecurity),
   'Signed atomic marker never public'),
 ('04_ATOMIC','RELEASE_SWITCHES_ALL_OFF',
   not exists(select 1 from efg_private.coach_release_switches where enabled)
   and exists(select 1 from efg_private.coach_release_switches
    where switch_key='pilot_coach_atomic_publication' and enabled is false),
   'All release switches must remain OFF even after install'),
 ('04_ATOMIC','COACH119_FLEXIBLE_GUIDE_CONSTRAINT_VALIDATED',
   exists(select 1 from pg_catalog.pg_constraint c
    where c.conrelid=pg_catalog.to_regclass('public.efg_food_plans')
     and c.conname='efg_guided_plan_shape' and c.contype='c' and c.convalidated
     and pg_catalog.strpos(pg_catalog.pg_get_constraintdef(c.oid),'five_meal_example')>0
     and pg_catalog.strpos(pg_catalog.pg_get_constraintdef(c.oid),'flexible_meal_guide')>0
     and pg_catalog.strpos(pg_catalog.pg_get_constraintdef(c.oid),'jsonb_array_length')>0),
   'Validated constraint retains legacy five and accepts flexible v2 guide'),
 ('04_ATOMIC','COACH119_GUIDE_WRITE_GUARD_ENABLED',
   exists(select 1 from pg_catalog.pg_trigger t
    where t.tgrelid=pg_catalog.to_regclass('public.efg_food_plans')
     and t.tgname='coach119_guard_flexible_guide_write'
     and t.tgenabled='O' and not t.tgisinternal),
   'V2 guide changes require the signed atomic transaction marker'),
 ('04_ATOMIC','COACH119_GUIDE_HISTORY_ARCHIVE_ENABLED',
   exists(select 1 from pg_catalog.pg_trigger t
    where t.tgrelid=pg_catalog.to_regclass('public.efg_food_plans')
     and t.tgname='coach119_archive_previous_approved_guide'
     and t.tgenabled='O' and not t.tgisinternal),
   'Replacing an approved guide must archive its previous revision'),
 ('04_ATOMIC','COACH116_SIGNED_ENTRY_FLEXIBLE',
   exists(select 1 from pg_catalog.pg_proc p
    where p.oid=pg_catalog.to_regprocedure('public.efg_coach_pilot_entry_status()')
     and p.prosecdef and p.proconfig @> array['search_path=""']::text[]
     and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
     and pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
     and pg_catalog.strpos(pg_catalog.pg_get_functiondef(p.oid),'flexible_meal_guide')>0
     and pg_catalog.strpos(pg_catalog.pg_get_functiondef(p.oid),'v_intake.age_years is null')>0),
   'Server-owned intake status requires six core fields and accepts 2-6 meals'),
 ('04_ATOMIC','COACH_DRAFT_READ_SCOPED',
   exists(select 1 from pg_policies where schemaname='public'
    and tablename='efg_coach_plan_drafts' and policyname='coach_draft_read_own'
    and qual like '%coach_pilot_share_active%'),
   'Coach draft read requires current share'),
 ('04_ATOMIC','LEGACY_NOTIFICATION_TRIGGERS_PRESENT',
   exists(select 1 from pg_trigger where tgrelid=to_regclass('public.efg_goals')
    and tgname='trg_efg_notify_goal' and tgenabled='O')
   and exists(select 1 from pg_trigger where tgrelid=to_regclass('public.efg_food_plans')
    and tgname='trg_efg_notify_food_guide' and tgenabled='O'),
   'Do not silently remove existing plan notification triggers'),
 ('04_GU06','GU06_SCOPED_COACH_RECIPE_RPC',
   exists(select 1 from pg_catalog.pg_proc p
    where p.oid=pg_catalog.to_regprocedure('public.efg_coach_shared_student_recipes(uuid)')
     and p.prosecdef and p.proconfig @> array['search_path=""']::text[]
     and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
     and pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
     and pg_catalog.strpos(pg_catalog.pg_get_functiondef(p.oid),'coach_pilot_share_active')>0
     and pg_catalog.strpos(pg_catalog.pg_get_functiondef(p.oid),'efg_legal_documents')>0),
   'Student recipes available to the bound Coach only with current sharing/legal receipts'),
 ('04_GU06','GU06_PERSONAL_RECIPES_OWNER_RLS',
   exists(select 1 from pg_catalog.pg_class t
    where t.oid=pg_catalog.to_regclass('public.efg_personal_recipes')
     and t.relrowsecurity and not pg_catalog.has_table_privilege('anon',t.oid,'SELECT'))
   and (select count(*) from pg_catalog.pg_policies
    where schemaname='public' and tablename='efg_personal_recipes' and cmd='SELECT')=1
   and exists(select 1 from pg_catalog.pg_policies
    where schemaname='public' and tablename='efg_personal_recipes'
     and policyname='Alumno lee sus recetas' and cmd='SELECT'
     and qual like '%student_id%' and qual like '%auth.uid()%'),
   'Original student-owned recipe RLS must remain intact without Coach table grants'),
 ('05_CONTENT','PILOT_TERMS_AND_PRIVACY_CURRENT',
   (select count(distinct kind)=2 from public.efg_legal_documents
    where is_current and published_at is not null
    and kind in ('terms','privacy') and sha256 ~ '^[a-f0-9]{64}$'
    and char_length(body)>=300
    and body !~* 'BORRADOR[[:space:]]+INTERNO'
    and body !~* 'NO[[:space:]]+PUBLICAR'
    and position('[PENDIENTE' in body)=0),
   'Two simple versioned pilot notices still require signed read/acceptance E2E'),
 ('05_CONTENT','ANY_CURRENT_REVIEWED_FOOD',
   exists(select 1 from efg_private.coach_reviewed_foods
    where evidence_status='reviewed' and reviewed_by is not null
    and reviewed_at is not null and reviewed_at<=now() and expires_at>now()),
   'Only existence; MUST verify every food selected for each Coach guide')
)
select phase,check_id,passed,
 case when passed then 'PRESENT_OR_SAFE_DEFAULT'
      else 'NOT_INSTALLED_OR_NOT_READY' end as status,
 explanation
from checks order by phase,check_id;
