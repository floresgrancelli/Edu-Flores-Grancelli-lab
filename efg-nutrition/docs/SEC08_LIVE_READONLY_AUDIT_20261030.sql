-- SEC-08 · NON-MUTATING hosted security inventory. Read only: no DDL/DML.
-- Run only with an authorized read-only SQL session. Never returns user or payment rows.
with rpc as (
 select p.oid,p.proname name,pg_get_function_identity_arguments(p.oid) args,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as signed_can_execute,
  exists(select 1 from unnest(coalesce(p.proconfig,array[]::text[])) x
    where x in ('search_path=""','search_path=')) as locked_path,
  pg_get_functiondef(p.oid) as definition
 from pg_catalog.pg_proc p
 join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
   and p.proname like 'efg_%'
), exposed as (
 select * from rpc where signed_can_execute
), service_tables as (
 select n.nspname||'.'||c.relname as tablename,
  c.relrowsecurity as rls,
  has_table_privilege('anon',c.oid,'SELECT') or
   has_table_privilege('anon',c.oid,'INSERT') or
   has_table_privilege('anon',c.oid,'UPDATE') or
   has_table_privilege('anon',c.oid,'DELETE') as anon_access,
  has_table_privilege('authenticated',c.oid,'SELECT') or
   has_table_privilege('authenticated',c.oid,'INSERT') or
   has_table_privilege('authenticated',c.oid,'UPDATE') or
   has_table_privilege('authenticated',c.oid,'DELETE') as signed_access
 from pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where (n.nspname,c.relname) in (
  ('efg_private','daily_mail_jobs'),
  ('public','efg_daily_email_deliveries'))
), required_objects as (
 select 'relaunch_intake' component,
  pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is not null installed
 union all select 'versioned_coach_draft',
  pg_catalog.to_regclass('public.efg_coach_plan_drafts') is not null
 union all select 'versioned_legal_documents',
  pg_catalog.to_regclass('public.efg_legal_documents') is not null
 union all select 'versioned_atomic_receipts',
  pg_catalog.to_regclass('public.efg_coach_plan_publish_receipts') is not null
 union all select 'relaunch_intake_rpc',
  pg_catalog.to_regprocedure('public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)') is not null
 union all select 'versioned_draft_rpc',
  pg_catalog.to_regprocedure('public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)') is not null
 union all select 'atomic_publish_rpc',
  pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft(uuid,bigint,uuid)') is not null
)
select
 (select count(*) from exposed)::int as signed_definer_rpc_count,
 (select count(*) from rpc where anon_can_execute)::int as anon_definer_rpc_count,
 (select count(*) from exposed where not locked_path)::int as exposed_unlocked_search_path_count,
 (select coalesce(jsonb_agg(name order by name),'[]'::jsonb) from exposed) as signed_definer_rpc_names,
 (select coalesce(jsonb_agg(name order by name),'[]'::jsonb)
  from exposed where not (
   definition ilike '%efg_private.is_admin()%'
   or definition ilike '%auth.uid()%')) as human_review_without_literal_role_check,
 (select count(*)::int from service_tables
  where not rls or anon_access or signed_access) as service_table_exposure_count,
 (select coalesce(jsonb_agg(component order by component),'[]'::jsonb)
  from required_objects where not installed) as missing_relaunch_components,
 'Read-only metadata. Role checks and hosted migration still need independent JWT and restore tests.' audit_scope;
