begin;

create table public.efg_habitual_automation_runs (
 user_id uuid not null references auth.users(id) on delete cascade,
 meal text not null,
 log_day date not null,
 primary key (user_id, meal, log_day)
);
alter table public.efg_habitual_automation_runs enable row level security;
revoke all on public.efg_habitual_automation_runs from public, anon, authenticated;

create function public.efg_run_habitual_automation()
returns integer language plpgsql security definer set search_path=''
as $$
declare
 local_now timestamp := statement_timestamp() at time zone 'America/Argentina/Buenos_Aires';
 today date := local_now::date;
 rule record;
 diary public.efg_daily_logs;
 next_meals jsonb;
 next_totals jsonb;
 applied integer := 0;
begin
 if local_now::time >= time '23:59' then return 0; end if;
 for rule in
  select a.user_id,a.meal,h.items
  from public.efg_habitual_automation a
  join public.efg_habitual_meals h
   on h.id=a.habitual_id and h.student_id=a.user_id and h.meal_slot=a.meal
  join public.efg_profiles p on p.user_id=a.user_id and p.active
   and p.role in ('student','coach','admin')
  where a.enabled and extract(isodow from local_now)::smallint=any(a.days)
   and a.run_at=date_trunc('minute',local_now)::time
  order by a.user_id,a.meal
  for update of a
 loop
  if jsonb_typeof(rule.items) is distinct from 'array' then continue; end if;
  if jsonb_array_length(rule.items)=0 then continue; end if;

  insert into public.efg_habitual_automation_runs(user_id,meal,log_day)
   values(rule.user_id,rule.meal,today) on conflict do nothing;
  if not found then continue; end if;

  insert into public.efg_daily_logs(student_id,log_day)
   values(rule.user_id,today) on conflict(student_id,log_day) do nothing;
  select * into strict diary from public.efg_daily_logs
   where student_id=rule.user_id and log_day=today for update;
  if diary.skipped -> rule.meal = 'true'::jsonb or diary.skipped -> '_closed' = 'true'::jsonb then continue; end if;
  if diary.meals ? rule.meal and diary.meals -> rule.meal <> '[]'::jsonb then continue; end if;

  next_meals:=jsonb_set(diary.meals,array[rule.meal],rule.items);
  select coalesce(jsonb_object_agg(key,total),'{}'::jsonb) into next_totals
   from (
    select metric.key,coalesce(sum(case when jsonb_typeof(food.item -> metric.key)='number'
     then (food.item ->> metric.key)::numeric else 0 end),0) total
    from (values ('k'),('p'),('c'),('f'),('fi')) metric(key)
    left join lateral (
     select item from jsonb_each(next_meals) meal
     cross join lateral jsonb_array_elements(case when jsonb_typeof(meal.value)='array' then meal.value else '[]'::jsonb end) items(item)
     where meal.key not in (select key from jsonb_each(diary.skipped) where value='true'::jsonb)
     union all select value from jsonb_array_elements(diary.sports)
    ) food on true
    group by metric.key
   ) summed;
  update public.efg_daily_logs set meals=next_meals, totals=next_totals,
   updated_at=greatest(clock_timestamp(),diary.updated_at+interval '1 microsecond')
   where student_id=rule.user_id and log_day=today;
  applied:=applied+1;
 end loop;
 return applied;
end;
$$;
revoke all on function public.efg_run_habitual_automation() from public, anon, authenticated;
grant execute on function public.efg_run_habitual_automation() to service_role;

commit;
