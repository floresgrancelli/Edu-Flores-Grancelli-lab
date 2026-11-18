begin;

create function public.efg_guard_automated_diary_update()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid()=old.student_id
    and current_setting('ncc.guarded_diary_write',true) is distinct from 'on'
    and (exists(select 1 from public.efg_habitual_automation a where a.user_id=old.student_id and a.enabled)
      or exists(select 1 from public.efg_habitual_automation_runs r where r.user_id=old.student_id and r.log_day=old.log_day)) then
  raise exception using errcode='40001',
   message='Actualizá la aplicación antes de guardar en un diario con carga automática.';
 end if;
 return new;
end;
$$;
revoke all on function public.efg_guard_automated_diary_update() from public, anon, authenticated;
create trigger efg_guard_automated_diary_update
 before update on public.efg_daily_logs
 for each row execute function public.efg_guard_automated_diary_update();

commit;
