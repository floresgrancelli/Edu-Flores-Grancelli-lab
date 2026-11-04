-- After an authorized installation only. Metadata and aggregate empty-state checks.
select 'private_tables_rls_no_browser_access' as check_id,
 count(*)=3 and bool_and(c.relrowsecurity
 and not has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE')
 and not has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')) as passed
from pg_class c where c.oid in (
 to_regclass('efg_private.efg_coach_health_documents'),
 to_regclass('efg_private.efg_coach_health_intakes'),
 to_regclass('efg_private.efg_coach_health_revocations'))
union all
select 'five_narrow_rpc_permissions', count(*)=5 and bool_and(p.prosecdef
 and p.proconfig @> array['search_path=""']::text[]
 and not has_function_privilege('anon',p.oid,'EXECUTE')
 and has_function_privilege('authenticated',p.oid,'EXECUTE'))
from pg_proc p where p.oid in (
 to_regprocedure('public.efg_current_coach_health_document()'),
 to_regprocedure('public.efg_get_coach_health_intake(uuid)'),
 to_regprocedure('public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)'),
 to_regprocedure('public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)'),
 to_regprocedure('public.efg_revoke_coach_health_intake(integer)'))
union all
select 'guard_private', count(*)=1 and bool_and(p.prosecdef
 and p.proconfig @> array['search_path=""']::text[]
 and not has_function_privilege('anon',p.oid,'EXECUTE')
 and not has_function_privilege('authenticated',p.oid,'EXECUTE'))
from pg_proc p where p.oid=to_regprocedure('efg_private.p28_require_current_health_source()')
union all
select 'trigger_installed',exists(select 1 from pg_trigger where
 tgrelid=to_regclass('public.efg_coach_plan_drafts')
 and tgname='p28_health_source_before_publication' and tgenabled='O'
 and tgfoid=to_regprocedure('efg_private.p28_require_current_health_source()'))
union all
select 'switch_off',exists(select 1 from efg_private.coach_release_switches
 where switch_key='pilot_health_bound_publication' and enabled=false)
union all
select 'all_release_switches_off',not exists(select 1 from efg_private.coach_release_switches where enabled is distinct from false)
union all
select 'no_documents_or_declarations_seeded',
 not exists(select 1 from efg_private.efg_coach_health_documents)
 and not exists(select 1 from efg_private.efg_coach_health_intakes)
 and not exists(select 1 from efg_private.efg_coach_health_revocations);
