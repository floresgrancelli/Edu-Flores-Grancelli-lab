begin;

CREATE OR REPLACE FUNCTION efg_private.coach_diary_write_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_enabled boolean := false;
 v_role text;
 v_actor uuid;
 v_status jsonb;
begin
 select enabled into v_enabled
 from efg_private.coach_release_switches
 where switch_key='pilot_student_diary_write_gate';
 -- Preserve the existing maintenance exception; ordinary users cannot set auth.role.
 if auth.role()='service_role' then return new; end if;
 -- pg_cron runs as postgres. Match the write to an active owner's due
 -- schedule, its same-day run marker, and the exact saved meal.
 if session_user='postgres' and auth.uid() is null and exists (
  select 1 from public.efg_habitual_automation a
  join public.efg_habitual_automation_runs r on (r.user_id,r.meal)=(a.user_id,a.meal)
  join public.efg_habitual_meals h on h.id=a.habitual_id and h.student_id=a.user_id and h.meal_slot=a.meal
  join public.efg_profiles p on p.user_id=a.user_id and p.active and p.role in ('coach','admin')
  where a.user_id=new.student_id and a.enabled and r.log_day=new.log_day
    and new.log_day=(statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::date
    and extract(isodow from statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::smallint=any(a.days)
    and a.run_at=date_trunc('minute',statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::time
    and case when tg_op='INSERT' then new.meals='{}'::jsonb and new.skipped='{}'::jsonb and new.sports='[]'::jsonb
      else new.student_id=old.student_id and new.log_day=old.log_day
       and new.skipped is not distinct from old.skipped and new.sports is not distinct from old.sports
       and coalesce(old.meals->a.meal,'[]'::jsonb)='[]'::jsonb
       and new.meals->a.meal=h.items and new.meals-a.meal=old.meals-a.meal end
 ) then return new; end if;
 -- Check OLD as well: changing owner cannot escape an enrolled student's gate.
 if tg_op='UPDATE' then
  if efg_private.p29_qa_scope_required(old.student_id,'student') then v_enabled:=true; end if;
 end if;
 if efg_private.p29_qa_scope_required(new.student_id,'student') then v_enabled:=true; end if;
 -- OFF for unregistered students retains legacy behavior.
 if v_enabled is distinct from true then return new; end if;

 -- Authenticated service maintenance is independent from the student's UI.
 v_role := auth.role();
 if v_role='service_role' then return new; end if;

 v_actor := auth.uid();
 if v_actor is null or new.student_id is distinct from v_actor then
  raise exception 'Only the signed student may write this diary after pilot release'
   using errcode='42501';
 end if;
 if tg_op='UPDATE' and new.student_id is distinct from old.student_id then
  raise exception 'Diary owner cannot change' using errcode='42501';
 end if;

 -- Active professional accounts own their personal diary; student publication
 -- remains mandatory for student profiles, including dual-role students.
 if exists(select 1 from public.efg_profiles p
   where p.user_id=v_actor and p.active=true and p.role in ('coach','admin')) then
  return new;
 end if;

 -- COACH116 legal-first status reads current signed coach/org, two legal
 -- versions, two pilot consents, shared general intake and published goal+guide.
 -- No browser-provided eligibility value can bypass this check.
 v_status:=public.efg_coach_pilot_entry_status();
 if pg_catalog.jsonb_typeof(v_status) is distinct from 'object' or
    v_status->>'route' is distinct from 'ready' or
    v_status->>'can_log_meals' is distinct from 'true' then
  raise exception 'Tu coach todavía debe publicar tu objetivo y guía antes de registrar comidas'
    using errcode='42501';
 end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.efg_run_habitual_automation()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  begin
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
  exception when insufficient_privilege then
   raise warning 'Habitual automation skipped a diary write rejected by the access gate';
  end;
 end loop;
 return applied;
end;
$function$;

commit;
