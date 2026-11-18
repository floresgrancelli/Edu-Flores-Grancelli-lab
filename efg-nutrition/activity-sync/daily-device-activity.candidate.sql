begin;

create table public.efg_daily_device_activity (
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_day date not null,
 source text not null check (source in ('health_connect','apple_health')),
 measured_at timestamptz not null,
 steps integer check (steps >= 0),
 distance_m numeric check (distance_m >= 0 and distance_m < 10000000),
 active_kcal numeric check (active_kcal >= 0 and active_kcal < 100000),
 primary key (user_id, activity_day),
 check (steps is not null or distance_m is not null or active_kcal is not null),
 check (activity_day = (measured_at at time zone 'America/Argentina/Buenos_Aires')::date)
);
alter table public.efg_daily_device_activity enable row level security;
create policy device_activity_owner on public.efg_daily_device_activity
 for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.efg_daily_device_activity from public, anon, authenticated;
grant select on public.efg_daily_device_activity to authenticated;

create function public.efg_sync_device_activity(
 p_expected_owner uuid, p_source text, p_measured_at timestamptz, p_steps integer, p_distance_m numeric, p_active_kcal numeric
) returns public.efg_daily_device_activity
language plpgsql security definer set search_path=''
as $$
declare
 owner_id uuid:=auth.uid();
 day_key date:=(p_measured_at at time zone 'America/Argentina/Buenos_Aires')::date;
 result public.efg_daily_device_activity;
begin
 if owner_id is null or owner_id is distinct from p_expected_owner then
  raise exception using errcode='42501',message='Sesión requerida';
 end if;
 if p_measured_at is null or p_measured_at>statement_timestamp()+interval '5 minutes'
  or day_key is distinct from (statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::date then
  raise exception using errcode='22023',message='La medición debe corresponder al día vigente de Argentina';
 end if;
 insert into public.efg_daily_device_activity as existing
  (user_id,activity_day,source,measured_at,steps,distance_m,active_kcal)
 values(owner_id,day_key,p_source,p_measured_at,p_steps,p_distance_m,p_active_kcal)
 on conflict(user_id,activity_day) do update set source=excluded.source,measured_at=excluded.measured_at,
  steps=excluded.steps,distance_m=excluded.distance_m,active_kcal=excluded.active_kcal
 where existing.measured_at<excluded.measured_at
 returning * into result;
 if result.user_id is null then
  select * into strict result from public.efg_daily_device_activity
   where user_id=owner_id and activity_day=day_key;
 end if;
 return result;
end;
$$;
revoke all on function public.efg_sync_device_activity(uuid,text,timestamptz,integer,numeric,numeric)
 from public,anon,authenticated;
grant execute on function public.efg_sync_device_activity(uuid,text,timestamptz,integer,numeric,numeric)
 to authenticated;

commit;
