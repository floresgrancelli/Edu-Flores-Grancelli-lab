-- COACH-PILOT-10. Execute ONLY in disposable efg_pilot_ephemeral AFTER staging SQL.
-- Use simulated claims, not actual hosted JWT. Subject to signed JWT staging QA.
create function public.efg_invite_student(p_email text,p_name text)
returns uuid language plpgsql security definer set search_path=''
as $fun$
declare v_org public.efg_organizations%rowtype;
 v_email text:=pg_catalog.lower(pg_catalog.btrim(p_email));
 v_name text:=pg_catalog.btrim(p_name);
 v_used integer;v_id uuid;
begin
 select * into v_org from public.efg_organizations
 where coach_id=auth.uid() for update;
 if not found or v_org.status not in ('trial','active','grace')
 or not (v_org.is_test or v_org.status='active')
 or not exists(select 1 from public.efg_profiles where user_id=auth.uid() and role='coach' and active) then
  raise exception 'Coach pilot permission denied' using errcode='42501';
 end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 or pg_catalog.length(v_name) not between 2 and 70 then
  raise exception 'Invalid trial invitation' using errcode='22023';
 end if;
 if exists(select 1 from public.efg_profiles where email=v_email) or
 exists(select 1 from public.efg_invitations where pg_catalog.lower(email)=v_email and revoked_at is null) then
  raise exception 'Account already invited';
 end if;
 select
 (select count(*) from public.efg_profiles where organization_id=v_org.id and role='student' and active)
 +(select count(*) from public.efg_invitations where organization_id=v_org.id and role='student'
  and claimed_by is null and revoked_at is null)
 into v_used;
 if v_used>=v_org.seat_limit then raise exception 'Alcanzaste el cupo contratado' using errcode='23514'; end if;
 insert into public.efg_invitations(email,nickname,role,organization_id,invited_by)
 values(v_email,v_name,'student',v_org.id,auth.uid())
 returning id into v_id;
 return v_id;
end $fun$;
revoke all on function public.efg_invite_student(text,text) from public,anon,authenticated;
grant execute on function public.efg_invite_student(text,text) to authenticated;

do $scenario$
declare v_uid uuid:='00000000-0000-4000-8000-000000000103';
 v_admin uuid:='00000000-0000-4000-8000-000000000101';
 v_prior uuid:='00000000-0000-4000-8000-000000000102';
 v_org uuid;
 v_blocked boolean;
 v_i integer;
begin
 perform pg_catalog.set_config('request.jwt.claim.sub',v_prior::text,false);
 if not efg_private.coach_has_student(v_uid) then
  raise exception 'Before promotion prior coach should have authorized pupil';
 end if;
 v_blocked:=false;
 begin
  perform public.efg_promote_existing_student_to_pilot_coach('carla-synthetic@example.invalid');
 exception when sqlstate '42501' then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Prior coach was able to promote a student'; end if;
 perform pg_catalog.set_config('request.jwt.claim.sub',v_uid::text,false);
 v_blocked:=false;
 begin perform public.efg_promote_existing_student_to_pilot_coach('carla-synthetic@example.invalid');
 exception when sqlstate '42501' then v_blocked:=true; end;
 if not v_blocked then raise exception 'Student promoted self'; end if;
 perform pg_catalog.set_config('request.jwt.claim.sub',v_admin::text,false);
 v_org:=public.efg_promote_existing_student_to_pilot_coach('carla-synthetic@example.invalid');
 if v_org is null then raise exception 'No pilot organization returned'; end if;
 if not exists(select 1 from public.efg_profiles p where p.user_id=v_uid and
 p.role='coach' and p.organization_id is null and p.active) then
  raise exception 'Original account not promoted correctly'; end if;
 if not exists(select 1 from public.efg_organizations where id=v_org
 and coach_id=v_uid and seat_limit=10 and is_test and status='trial' and license_fee_ars is null) then
  raise exception 'Exactly 10 free test seats and no billing expected'; end if;
 if not exists(select 1 from efg_private.efg_pilot_promotions where user_id=v_uid
 and previous_org_id='00000000-0000-4000-8000-000000000201'
 and pilot_org_id=v_org and seat_limit=10 and promoted_by=v_admin) then
  raise exception 'Private audit receipt missing';
 end if;
 if not exists(select 1 from public.efg_daily_logs where student_id=v_uid
 and log_day='2026-10-29' and payload='HISTORIC_PERSONAL_MEAL') or
 (select count(*) from public.efg_weights where student_id=v_uid)<>1 or
 (select count(*) from public.efg_personal_recipes where student_id=v_uid)<>1 or
 (select count(*) from public.efg_habitual_meals where student_id=v_uid)<>1 or
 (select count(*) from public.efg_goals where student_id=v_uid)<>1 then
  raise exception 'Historical MI DÍA data changed or was deleted'; end if;
 v_blocked:=false;
 begin perform public.efg_promote_existing_student_to_pilot_coach('carla-synthetic@example.invalid');
 exception when sqlstate '42501' then v_blocked:=true; end;
 if not v_blocked then raise exception 'Duplicate promotion accepted'; end if;
 perform pg_catalog.set_config('request.jwt.claim.sub',v_prior::text,false);
 if efg_private.coach_has_student(v_uid) then
  raise exception 'Former coach still can access promoted coach as student'; end if;
 perform pg_catalog.set_config('request.jwt.claim.sub',v_uid::text,false);
 for v_i in 1..10 loop
  perform public.efg_invite_student('pilot-student-'||v_i||'@example.invalid','Alumno ficticio '||v_i);
 end loop;
 if (select count(*) from public.efg_invitations where organization_id=v_org
 and role='student' and claimed_by is null and revoked_at is null)<>10 then
  raise exception 'Did not invite exactly 10 trial students';
 end if;
 v_blocked:=false;
 begin perform public.efg_invite_student('pilot-student-11@example.invalid','Eleventh');
 exception when sqlstate '23514' then v_blocked:=true;end;
 if not v_blocked then raise exception '11th trial invite incorrectly allowed';end if;
 if (select count(*) from public.efg_invitations where organization_id=v_org)<>10 then
  raise exception 'Exceeded pilot cap';
 end if;
 raise notice 'PASS COACH-PILOT-10: admin-only promotion; unchanged auth UID/history; old Coach denied; 10 free seats and 11th denied; never hosted.';
end $scenario$;
