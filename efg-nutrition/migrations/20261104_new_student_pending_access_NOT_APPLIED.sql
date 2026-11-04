-- P29: candidate only; validate on disposable PostgreSQL before hosted install.
-- Creates pending access for future students, never publishes or rewrites history.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
create function efg_private.p29_new_student_pending_access() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_coach uuid;
begin
 if new.role is distinct from 'student' or new.organization_id is null then return new; end if;
 select o.coach_id into v_coach from public.efg_organizations o where o.id=new.organization_id;
 if v_coach is null then return new; end if;
 insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status)
 values(new.user_id,new.organization_id,v_coach,'pending')
 on conflict(student_id) do nothing;
 -- An existing published/paused record must not be reset by profile edits.
 -- Organization reassignment remains subject to the existing server checks.
 return new;
end $$;
revoke all on function efg_private.p29_new_student_pending_access() from public,anon,authenticated;
create trigger p29_student_pending_access
after insert or update of role,organization_id on public.efg_profiles
for each row execute function efg_private.p29_new_student_pending_access();
commit;
