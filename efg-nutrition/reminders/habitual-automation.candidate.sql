begin;

-- Opt-in configuration. A deleted habitual cancels its rule.
alter table public.efg_habitual_meals
 add constraint efg_habitual_meals_owner_slot_id_key unique (student_id, meal_slot, id);

create table public.efg_habitual_automation (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 meal text not null check (meal in ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')),
 habitual_id uuid not null,
 days smallint[] not null check (cardinality(days) between 1 and 7
  and array_position(days,null) is null and days <@ array[1,2,3,4,5,6,7]::smallint[]),
 run_at time(0) not null check (run_at < time '23:59' and extract(second from run_at)=0),
 enabled boolean not null default false,
 primary key (user_id, meal),
 foreign key (user_id, meal, habitual_id)
  references public.efg_habitual_meals(student_id, meal_slot, id) on delete cascade
);
alter table public.efg_habitual_automation enable row level security;
create policy habitual_automation_owner on public.efg_habitual_automation
 for all to authenticated using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));
revoke all on public.efg_habitual_automation from public, anon, authenticated;
grant select,insert,update,delete on public.efg_habitual_automation to authenticated;
grant select on public.efg_habitual_automation to service_role;

-- An earlier client snapshot cannot overwrite a concurrently changed diary.
-- Clients must pass the row's server timestamp, or NULL if no row was loaded.
create function public.efg_save_diary_if_current(
 p_day date, p_expected timestamptz, p_meals jsonb, p_sports jsonb, p_skipped jsonb, p_totals jsonb
) returns public.efg_daily_logs
language plpgsql security invoker set search_path=''
as $$
declare
 owner_id uuid := auth.uid();
 local_now timestamp := clock_timestamp() at time zone 'America/Argentina/Buenos_Aires';
 saved public.efg_daily_logs;
begin
 if owner_id is null or p_day is distinct from local_now::date or local_now::time >= time '23:59' then
  raise exception using errcode='42501', message='Diario fuera del día vigente';
 end if;
 if p_expected is null then
  insert into public.efg_daily_logs(student_id,log_day,meals,sports,skipped,totals)
   values(owner_id,p_day,p_meals,p_sports,p_skipped,p_totals)
   on conflict(student_id,log_day) do nothing returning * into saved;
 else
  update public.efg_daily_logs set meals=p_meals,sports=p_sports,skipped=p_skipped,totals=p_totals,
   updated_at=greatest(clock_timestamp(),p_expected+interval '1 microsecond')
   where student_id=owner_id and log_day=p_day and updated_at=p_expected
   returning * into saved;
 end if;
 if saved.student_id is null then
  raise exception using errcode='40001', message='El diario cambió. Actualizá Mi Día antes de guardar.';
 end if;
 return saved;
end;
$$;
revoke all on function public.efg_save_diary_if_current(date,timestamptz,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.efg_save_diary_if_current(date,timestamptz,jsonb,jsonb,jsonb,jsonb) to authenticated;
commit;
