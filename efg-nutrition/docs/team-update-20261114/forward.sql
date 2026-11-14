-- Team removal only: preserve auth identity, diary, messages and personal records.
-- An inactive, detached student cannot be reactivated by the former coach.
begin;
alter table public.efg_profiles drop constraint profile_org_role;
alter table public.efg_profiles add constraint profile_org_role check (
 (role='student' and (organization_id is not null or active=false)) or
 (role<>'student' and organization_id is null)
);
create or replace function public.efg_remove_student_from_team_v1(p_student uuid,p_org uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=efg_private.ncc_actor_v1();
 v_org public.efg_organizations%rowtype;
 v_student public.efg_profiles%rowtype;
begin
 if p_student is null or p_org is null or p_student=v_actor then
  raise exception 'Alumno y equipo válidos requeridos.' using errcode='42501';
 end if;
 -- Match workspace mutation lock order: organization, then target profile.
 select * into v_org from public.efg_organizations where id=p_org for update;
 if not found or v_org.coach_id is distinct from v_actor or not exists (
  select 1 from public.efg_profiles where user_id=v_actor and active
   and (role='coach' or (role='admin' and v_org.is_test))
 ) then raise exception 'Solo podés eliminar alumnos de tu propio equipo.' using errcode='42501'; end if;
 if exists(select 1 from efg_private.ncc_managed_workspaces_v1 where organization_id=p_org)
 and efg_private.ncc_managed_access_v1(p_org,v_actor,true) is not true then
  raise exception 'Acceso profesional vigente requerido.' using errcode='42501';
 end if;
 select * into v_student from public.efg_profiles where user_id=p_student for update;
 if not found or v_student.role<>'student' or v_student.organization_id is distinct from p_org then
  raise exception 'Ese alumno ya no pertenece a tu equipo.' using errcode='42501';
 end if;
 update public.efg_consents set accepted=false,email_report_opt_in=false,updated_at=clock_timestamp()
 where student_id=p_student and organization_id=p_org;
 update public.efg_student_plan_access set status='paused',updated_at=clock_timestamp()
 where student_id=p_student and organization_id=p_org;
 update public.efg_invitations set revoked_at=coalesce(revoked_at,clock_timestamp())
 where organization_id=p_org and role='student' and (claimed_by=p_student or (claimed_by is null and lower(email)=lower(v_student.email)));
 update public.efg_profiles set active=false,organization_id=null where user_id=p_student;
 return true;
end $$;
revoke all on function public.efg_remove_student_from_team_v1(uuid,uuid) from public,anon;
grant execute on function public.efg_remove_student_from_team_v1(uuid,uuid) to authenticated;
comment on function public.efg_remove_student_from_team_v1(uuid,uuid) is 'Owner-authorized permanent team unlink; never deletes a person or personal history.';
commit;
