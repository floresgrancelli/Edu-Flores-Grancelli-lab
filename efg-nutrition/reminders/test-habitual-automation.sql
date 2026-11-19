create function public.test_habitual_signed_diary_gate()
returns trigger language plpgsql as $$
begin
 if auth.uid() is distinct from new.student_id then
  raise exception 'Diary owner required' using errcode='42501';
 end if;
 return new;
end $$;

create trigger test_habitual_signed_diary_gate before insert or update on public.efg_daily_logs
 for each row execute function public.test_habitual_signed_diary_gate();

do $$
declare
 local_now timestamp := statement_timestamp() at time zone 'America/Argentina/Buenos_Aires';
 day date := local_now::date;
 run_at time := date_trunc('minute',local_now)::time;
 owner uuid := '00000000-0000-4000-8000-000000000001';
 other uuid := '00000000-0000-4000-8000-000000000002';
 breakfast uuid := '10000000-0000-4000-8000-000000000001';
 lunch uuid := '10000000-0000-4000-8000-000000000002';
 snack uuid := '10000000-0000-4000-8000-000000000003';
 before_write timestamptz;
 after_write public.efg_daily_logs;
begin
 if run_at >= time '23:59' then raise exception 'Run test outside daily closure'; end if;
 insert into public.efg_profiles values(owner,true,'student'),(other,false,'student');
 insert into public.efg_habitual_meals values
  (breakfast,owner,'desayuno','[{"k":150,"p":6}]'),
  (lunch,owner,'almuerzo','[{"k":500}]'),
  (snack,owner,'media_tarde','[{"k":90}]');
 begin
  insert into public.efg_habitual_automation values(other,'desayuno',breakfast,array[1]::smallint[],run_at,true);
  raise exception 'Cross-account template accepted';
 exception when foreign_key_violation then null;
 end;
 insert into public.efg_habitual_automation
 select owner,meal,id,array[1,2,3,4,5,6,7]::smallint[],run_at,true
 from (values ('desayuno',breakfast),('almuerzo',lunch),('media_tarde',snack)) t(meal,id);
 perform set_config('request.jwt.claim.sub',owner::text,true);
 insert into public.efg_daily_logs(student_id,log_day,meals,skipped,sports)
 values(owner,day,'{"almuerzo":[{"k":400}]}','{"media_tarde":true}','[{"k":20}]')
 returning updated_at into before_write;
 perform set_config('request.jwt.claim.sub','',true);
 if public.efg_run_habitual_automation()<>1 then raise exception 'Expected one empty slot to be filled'; end if;
 if auth.uid() is not null or current_setting('ncc.guarded_diary_write',true)='on' then
  raise exception 'Scheduler identity or guard setting leaked';
 end if;
 select * into strict after_write from public.efg_daily_logs where student_id=owner and log_day=day;
 if after_write.meals is distinct from '{"desayuno":[{"k":150,"p":6}],"almuerzo":[{"k":400}]}'::jsonb
  or after_write.totals->>'k' is distinct from '570' then raise exception 'Unexpected diary merge or totals'; end if;
 perform set_config('request.jwt.claim.sub',owner::text,true);
 begin
  update public.efg_daily_logs set meals='{}' where student_id=owner and log_day=day;
  raise exception 'Legacy client overwrote an automated diary';
 exception when serialization_failure then null;
 end;
 begin
  perform public.efg_save_diary_if_current(day,before_write,'{}','[]','{}','{}');
  raise exception 'Stale client overwrote diary';
 exception when serialization_failure then null;
 end;
 perform public.efg_save_diary_if_current(day,after_write.updated_at,'{"almuerzo":[{"k":400}]}','[]','{}','{"k":400}');
 if public.efg_run_habitual_automation()<>0 then raise exception 'Recreated a user-deleted meal'; end if;
 if has_function_privilege('authenticated','public.efg_run_habitual_automation()','execute') then
  raise exception 'Authenticated user can execute scheduler';
 end if;
end $$;
