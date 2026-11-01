-- NUT-57 B2: selected core nutrition column-contract checks, SYNTHETIC PG17 only.
-- This SELECT from information_schema tests SHAPE only, not actual patient data.
-- The authoritative hosted metadata was inspected read-only separately;
-- this test cannot prove full schema, policy, function or trigger parity.
do $shape$
declare errors text;
begin
 with required(table_name,column_name,expected_type,expected_nullable) as (
  values
  ('efg_daily_logs','sports','jsonb','NO'),
  ('efg_daily_logs','skipped','jsonb','NO'),
  ('efg_daily_logs','totals','jsonb','NO'),
  ('efg_daily_logs','updated_at','timestamp with time zone','NO'),
  ('efg_weights','kg','numeric','NO'),
  ('efg_weights','created_at','timestamp with time zone','NO'),
  ('efg_weights','measured_time','time without time zone','YES'),
  ('efg_activities','exercise_minutes','integer','YES'),
  ('efg_activities','kind','text','YES'),
  ('efg_habitual_meals','name','text','NO'),
  ('efg_habitual_meals','created_at','timestamp with time zone','NO'),
  ('efg_habitual_meals','updated_at','timestamp with time zone','NO'),
  ('efg_personal_recipes','portions','integer','NO'),
  ('efg_personal_recipes','totals','jsonb','NO'),
  ('efg_personal_recipes','created_at','timestamp with time zone','NO')
 )
 select string_agg(r.table_name||'.'||r.column_name||' expected '||
  r.expected_type||' '||r.expected_nullable,', ' order by r.table_name,r.column_name)
 into errors
 from required r
 left join information_schema.columns c
  on c.table_schema='public' and c.table_name=r.table_name
    and c.column_name=r.column_name and c.data_type=r.expected_type
    and c.is_nullable=r.expected_nullable
 where c.column_name is null;

 if errors is not null then
  raise exception 'NUT57 B2 fixture column mismatch: %',errors
   using errcode='55000';
 end if;

 if exists (
  select 1 from (values ('efg_daily_logs'),('efg_weights'),
     ('efg_activities'),('efg_habitual_meals'),('efg_personal_recipes')) t(name)
  where not exists (
    select 1 from pg_catalog.pg_class c
     where c.oid=pg_catalog.to_regclass('public.'||t.name)
       and c.relrowsecurity
  )
 ) then
  raise exception 'NUT57 B2 historical nutrition tables must have RLS enabled';
 end if;

 if pg_catalog.to_regclass('public.efg_student_plan_access') is not null
    or pg_catalog.to_regclass('public.efg_student_intakes') is not null
    or pg_catalog.to_regclass('public.efg_coach_plan_drafts') is not null then
  raise exception 'NUT57 B2 preupgrade fixture is no longer pre-upgrade';
 end if;
end
$shape$;
select 'PASS NUT57 B2: 15 selected nutrition column type/nullability contracts + RLS on 5 historic tables; still synthetic and partial' as result;
