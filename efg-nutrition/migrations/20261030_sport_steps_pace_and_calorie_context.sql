-- SPORT-STEP-02 additive, backwards-compatible PWA activity improvement.
-- Historical activity rows and their exercise minutes remain unchanged.
-- Values are user-supplied context for CLIENT-ONLY APPROXIMATIONS:
-- walking_pace from selected flat-ground speed (2024 Compendium),
-- walking_height_cm estimates step length; walking_weight_kg for NET kcal.
-- Not a diagnosis, medical record, prescribed goal or diet/TDEE adjustment.
do $sport_step_preflight$
begin
 if pg_catalog.to_regclass('public.efg_activities') is null then
  raise exception 'SPORT-STEP: activities table missing';
 end if;
 if exists(select 1 from information_schema.columns
   where table_schema='public' and table_name='efg_activities'
     and column_name in ('walking_pace','walking_height_cm','walking_weight_kg')) then
  raise exception 'SPORT-STEP: one or more columns already exist; review before migration';
 end if;
end $sport_step_preflight$;

alter table public.efg_activities
 add column walking_pace text,
 add column walking_height_cm numeric(5,1),
 add column walking_weight_kg numeric(5,1),
 add constraint efg_activity_walking_pace_valid
  check (walking_pace is null or walking_pace in ('slow','moderate','brisk')),
 add constraint efg_activity_walking_height_valid
  check (walking_height_cm is null or walking_height_cm between 100 and 250),
 add constraint efg_activity_walking_weight_valid
  check (walking_weight_kg is null or walking_weight_kg between 20 and 400);

comment on column public.efg_activities.walking_pace is
 'Selected walking speed category; legacy NULL means unknown pace. Never infer METs for legacy rows.';
comment on column public.efg_activities.walking_height_cm is
 'Optional user height snapshot for rough step length (height*0.415); NULL fallback 70cm approximate.';
comment on column public.efg_activities.walking_weight_kg is
 'Optional user weight snapshot for optional net/active calorie estimate; NULL means do not show calories.';
-- Existing RLS policies and table ownership/grants retained unmodified.
