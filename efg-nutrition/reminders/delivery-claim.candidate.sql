begin;

create table public.efg_meal_reminder_deliveries (
 user_id uuid not null,
 endpoint text not null,
 log_day date not null,
 meal text not null check (meal in ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')),
 primary key (user_id, endpoint, log_day, meal),
 foreign key (user_id, endpoint)
  references public.efg_meal_reminder_devices(user_id, endpoint) on delete cascade
);
alter table public.efg_meal_reminder_deliveries enable row level security;
revoke all on public.efg_meal_reminder_deliveries from public, anon, authenticated;
grant select, insert, delete on public.efg_meal_reminder_deliveries to service_role;

create function public.efg_claim_meal_reminder(
 p_user uuid, p_endpoint text, p_day date, p_meal text
) returns boolean
language sql security invoker set search_path = ''
as $$
 with claimed as (
  insert into public.efg_meal_reminder_deliveries (user_id, endpoint, log_day, meal)
  select p_user, p_endpoint, p_day, p_meal
  where exists (
   select 1 from public.efg_meal_reminder_devices
   where user_id = p_user and endpoint = p_endpoint
  )
  and exists (
   select 1 from public.efg_meal_reminder_preferences
   where user_id = p_user and meal = p_meal and enabled
  )
  and not exists (
   select 1 from public.efg_daily_logs as diary
   where diary.student_id = p_user and diary.log_day = p_day
    and (case when jsonb_typeof(diary.meals -> p_meal) = 'array'
          then jsonb_array_length(diary.meals -> p_meal) > 0
          else false end
      or diary.skipped -> p_meal = 'true'::jsonb)
  )
  on conflict do nothing returning 1
 )
 select exists (select 1 from claimed);
$$;
revoke all on function public.efg_claim_meal_reminder(uuid,text,date,text) from public, anon, authenticated;
grant execute on function public.efg_claim_meal_reminder(uuid,text,date,text) to service_role;

commit;
