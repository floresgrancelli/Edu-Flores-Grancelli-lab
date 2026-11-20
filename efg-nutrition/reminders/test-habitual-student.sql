create trigger coach_diary_write_gate before insert or update on public.efg_daily_logs
for each row execute function efg_private.coach_diary_write_gate();

do $$
declare
 local_now timestamp := statement_timestamp() at time zone 'America/Argentina/Buenos_Aires';
 day date := local_now::date;
 student uuid := '00000000-0000-4000-8000-000000000003';
 other uuid := '00000000-0000-4000-8000-000000000004';
 organization uuid := '10000000-0000-4000-8000-000000000003';
 coach uuid := '10000000-0000-4000-8000-000000000004';
 goal uuid := '20000000-0000-4000-8000-000000000003';
 expected jsonb := '[{"k":150,"p":6}]';
 diary public.efg_daily_logs;
begin
 if local_now::time >= time '23:59' then raise exception 'Run outside daily closure'; end if;
 -- Isolate this scenario from the preceding fixture's schedules.
 update public.efg_habitual_automation set enabled=false;
 insert into auth.users values (student),(other);
 insert into public.efg_organizations values (organization,coach);
 insert into public.efg_profiles values (student,true,'student',organization),(other,true,'student',organization);
 insert into public.efg_legal_documents
 select kind,id,'v1',encode(sha256(convert_to(kind,'UTF8')),'hex'),true,now(),kind
 from (values ('terms','30000000-0000-4000-8000-000000000003'::uuid),
              ('privacy','30000000-0000-4000-8000-000000000004'::uuid)) docs(kind,id);
 insert into public.efg_legal_acceptances select student,id from public.efg_legal_documents;
 insert into public.efg_pilot_participation_receipts
 values (student,organization,'coach_pilot_2026_demo1','two_explicit_checkboxes',true,true,now(),null);
 insert into public.efg_coach_relaunch_intakes
 values (student,organization,'coach_major_2026_r1','maintain',35,170,70,'light','omnivore',now(),now());
 insert into public.efg_consents values (student,organization,true);
 insert into public.efg_student_plan_access values (student,organization,coach,'published',goal,now(),coach);
 insert into public.efg_goals values (goal,student,coach);
 insert into public.efg_food_plans
 values (student,coach,goal,now(),'{"kind":"flexible_meal_guide","version":2,"meals":[{},{}]}');
 insert into public.efg_habitual_meals values (student,student,'desayuno',expected),(other,other,'desayuno',expected);
 insert into public.efg_habitual_automation
 select id,'desayuno',id,array[1,2,3,4,5,6,7]::smallint[],date_trunc('minute',local_now)::time,true
 from (values(student),(other)) users(id);

 perform set_config('request.jwt.claim.sub',student::text,true);
 if public.efg_coach_pilot_entry_status()->>'route' is distinct from 'ready' then
  raise exception 'Signed student lost eligibility';
 end if;
 perform set_config('request.jwt.claim.sub','',true);
 if public.efg_run_habitual_automation()<>1 then raise exception 'Expected only the eligible student'; end if;
 select * into strict diary from public.efg_daily_logs where student_id=student and log_day=day;
 if diary.meals->'desayuno' is distinct from expected or diary.totals->>'k' is distinct from '150'
  or diary.totals->>'p' is distinct from '6' then raise exception 'Saved meal or nutrients differ'; end if;
 if exists(select 1 from public.efg_daily_logs where student_id=other)
  or exists(select 1 from public.efg_habitual_automation_runs where user_id=other)
  then raise exception 'Ineligible student received an automated record'; end if;
 if public.efg_run_habitual_automation()<>0 then raise exception 'Duplicate automatic meal'; end if;
 -- A rule already saved must respect later changes in participation.
 insert into public.efg_habitual_meals values (goal,student,'almuerzo','[{"k":400,"p":30}]');
 insert into public.efg_habitual_automation
 values (student,'almuerzo',goal,array[1,2,3,4,5,6,7]::smallint[],date_trunc('minute',local_now)::time,true);
 update public.efg_pilot_participation_receipts set sharing_accepted=false where student_id=student;
 if public.efg_run_habitual_automation()<>0
  or exists(select 1 from public.efg_habitual_automation_runs where user_id=student and meal='almuerzo')
  then raise exception 'Cron ignored revoked sharing or consumed the invalid run'; end if;
 update public.efg_pilot_participation_receipts set sharing_accepted=true where student_id=student;
 if public.efg_run_habitual_automation()<>1 then raise exception 'Restored eligibility did not allow the pending meal'; end if;
 select * into strict diary from public.efg_daily_logs where student_id=student and log_day=day;
 if diary.meals->'desayuno' is distinct from expected or diary.totals->>'k' is distinct from '550'
  or diary.totals->>'p' is distinct from '36' then raise exception 'Cron replaced an existing slot or changed its totals'; end if;
 if has_function_privilege('authenticated','efg_private.coach_pilot_entry_status_for(uuid)','execute')
  or has_function_privilege('anon','efg_private.legal_current_status_for(uuid)','execute')
  then raise exception 'Private eligibility function is exposed'; end if;
end $$;
