-- NUT-57 B3: selected trigger/constraint shape from read-only HOSTED METADATA.
-- Execute only on disposable synthetic PostgreSQL 17, NEVER against hosted DB.
-- This is NOT a full pg_catalog/RLS/security-definer parity attestation.
do $nut57_deps$
declare missing text;
begin
 with expected(table_name,trigger_name,timing,operation) as (
  values
   ('efg_consents','efg_consent_identity_immutable','BEFORE','UPDATE'),
   ('efg_food_plans','efg_food_plan_lock_owner','BEFORE','UPDATE'),
   ('efg_food_plans','efg_verify_guide_goal','BEFORE','INSERT'),
   ('efg_food_plans','efg_verify_guide_goal','BEFORE','UPDATE'),
   ('efg_food_plans','trg_efg_notify_food_guide','AFTER','INSERT'),
   ('efg_food_plans','trg_efg_notify_food_guide','AFTER','UPDATE'),
   ('efg_goals','trg_efg_notify_goal','AFTER','INSERT')
 )
 select string_agg(x.table_name||'.'||x.trigger_name||'/'||x.operation,', ' order by x.table_name,x.trigger_name,x.operation)
 into missing
 from expected x
 where not exists (
  select 1 from information_schema.triggers t
  where t.trigger_schema='public' and t.event_object_table=x.table_name
    and t.trigger_name=x.trigger_name and t.action_timing=x.timing
    and t.event_manipulation=x.operation
 );
 if missing is not null then
  raise exception 'NUT57 B3 missing historical trigger contract: %',missing
    using errcode='55000';
 end if;

 with expected(table_name,constraint_name) as (
  values
  ('efg_daily_logs','meals_object'),
  ('efg_daily_logs','sports_array'),
  ('efg_food_plans','approved_food_ids_limit'),
  ('efg_food_plans','efg_guided_plan_shape'),
  ('efg_profiles','profile_org_role')
 )
 select string_agg(x.table_name||'.'||x.constraint_name,', ' order by x.table_name,x.constraint_name)
 into missing
 from expected x where not exists (
  select 1 from information_schema.table_constraints c
  where c.table_schema='public' and c.table_name=x.table_name
    and c.constraint_name=x.constraint_name and c.constraint_type='CHECK'
 );
 if missing is not null then
  raise exception 'NUT57 B3 missing historical check constraints: %',missing
    using errcode='55000';
 end if;
end
$nut57_deps$;
select 'PASS NUT57 B3: 7 trigger/event contracts + 5 named checks in partial synthetic fixture, not a full hosted schema parity claim' as synthetic_dependency_result;
