-- NCC WALK-02 · Optional walking session context, NOT APPLIED to hosted.
-- Additive extension of the existing ONE-row-per-student/day activity summary.
-- No updates to historical rows, ownership, RLS policies, or grants.
-- Data are optional approximations; heart rate is context, not a clinical assertion.
begin;
do $walk_preflight$
begin
 if to_regclass('public.efg_activities') is null then
  raise exception 'NCC WALK-02: activity table missing';
 end if;
 if exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='efg_activities'
   and column_name in ('walking_distance_km','walking_duration_minutes','walking_avg_heart_rate_bpm'))
 then raise exception 'NCC WALK-02: columns already exist; do not repeat'; end if;
end $walk_preflight$;

alter table public.efg_activities
 add column walking_distance_km numeric(6,2),
 add column walking_duration_minutes integer,
 add column walking_avg_heart_rate_bpm integer,
 add constraint efg_walk_distance_valid check(walking_distance_km is null or walking_distance_km between 0.01 and 100),
 add constraint efg_walk_minutes_valid check(walking_duration_minutes is null or walking_duration_minutes between 1 and 1440),
 add constraint efg_walk_hr_valid check(walking_avg_heart_rate_bpm is null or walking_avg_heart_rate_bpm between 35 and 220);

comment on column public.efg_activities.walking_distance_km is 'Optional measured/reported km by student, not inferred from daily steps.';
comment on column public.efg_activities.walking_duration_minutes is 'Optional minutes walked, separate from exercise_minutes (other exercise).';
comment on column public.efg_activities.walking_avg_heart_rate_bpm is 'Optional self-reported average bpm for walking. Does not change energy estimate. Do not treat as medical data for decision support.';
commit;
