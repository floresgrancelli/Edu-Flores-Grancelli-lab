-- NUT-56 disposable local pg_catalog gate after applying STAGING-only scripts.
-- This verifies selected production-like constraints/triggers + atomic cutover.
-- Does NOT certify the exact hosted database, data, extensions, RLS or schemas.
do $assert$
declare
 cols int;
 triggers_enabled int;
begin
 select count(*) into cols
 from pg_catalog.pg_attribute a
 where a.attrelid='public.efg_profiles'::regclass and a.attname in ('email','nickname')
   and a.attnotnull and not a.attisdropped;
 if cols <> 2 then raise exception 'NUT56 missing product profile NOT NULL constraints'; end if;
 select count(*) into cols
 from pg_catalog.pg_attribute a
 where a.attrelid='public.efg_organizations'::regclass and a.attname='name'
   and a.attnotnull and not a.attisdropped;
 if cols <> 1 then raise exception 'NUT56 missing required org name'; end if;
 select count(*) into cols
 from pg_catalog.pg_attribute a
 where a.attrelid='public.efg_goals'::regclass and a.attname in
 ('estimation_method','activity_factor','protein_per_kg','fat_per_kg')
   and not a.attisdropped;
 if cols <> 4 then raise exception 'NUT56 missing historical scientific goal columns'; end if;
 select count(*) into triggers_enabled from pg_catalog.pg_trigger t
 where t.tgrelid in ('public.efg_food_plans'::regclass,
                       'public.efg_goals'::regclass)
   and t.tgname in ('efg_verify_guide_goal','efg_food_plan_lock_owner',
                    'trg_efg_notify_goal','trg_efg_notify_food_guide')
   and t.tgenabled='O';
 if triggers_enabled<>4 then raise exception 'NUT56 expected 4 active production-like goal/guide triggers'; end if;
 if pg_catalog.pg_get_triggerdef((select t.oid from pg_catalog.pg_trigger t
     where t.tgrelid='public.efg_goals'::regclass
       and t.tgname='trg_efg_notify_goal'),true) not like '%WHEN%'
    or pg_catalog.pg_get_triggerdef((select t.oid from pg_catalog.pg_trigger t
     where t.tgrelid='public.efg_food_plans'::regclass
       and t.tgname='trg_efg_notify_food_guide'),true) not like '%WHEN%' then
    raise exception 'NUT56 legacy notification compatibility guard missing';
 end if;
 if pg_catalog.has_table_privilege('authenticated','public.efg_goals','INSERT')
    or pg_catalog.has_table_privilege('authenticated','public.efg_food_plans','INSERT') then
   raise exception 'NUT56 old direct-client write permissions must be revoked after cutover';
 end if;
 if pg_catalog.strpos(
   pg_catalog.pg_get_functiondef('public.efg_publish_coach_plan_draft(uuid,bigint,uuid)'::regprocedure),
   'efg.coach_atomic_publish')=0 then
   raise exception 'NUT56 atomic publication RPC missing transaction-local notification marker';
 end if;
end $assert$;
