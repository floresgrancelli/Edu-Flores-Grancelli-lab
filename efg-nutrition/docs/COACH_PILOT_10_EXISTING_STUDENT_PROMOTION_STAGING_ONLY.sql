-- COACH-PILOT-10 (STAGING ONLY). NEVER APPLY TO HOSTED PRODUCTION.
-- Upgrade an EXISTING active student to pilot coach WITHOUT deleting user/history.
-- EFG admin must confirm explicit account email, retain same auth UID, own MI DÍA.
begin;
do $safe$
begin
 if pg_catalog.current_database() not in
  ('postgres','efg_nut57_restored','efg_nut57_before','efg_nutrition_ephemeral','efg_pilot_ephemeral')
  or pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null then
  raise exception 'PILOT-10 STOP: isolated staging only' using errcode='55000';
 end if;
 if (select count(*) from efg_private.nut57_isolated_staging_marker)<>1 then
  raise exception 'PILOT-10 STOP: invalid isolation marker' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_organizations') is null
  or pg_catalog.to_regclass('public.efg_profiles') is null
  or pg_catalog.to_regclass('public.efg_invitations') is null
  or pg_catalog.to_regprocedure('efg_private.is_admin()') is null then
  raise exception 'PILOT-10 STOP: missing real Coach prerequisites' using errcode='55000';
 end if;
 if pg_catalog.to_regprocedure('public.efg_promote_existing_student_to_pilot_coach(text)') is not null
  or pg_catalog.to_regclass('efg_private.efg_pilot_promotions') is not null then
  raise exception 'PILOT-10 STOP: existing object; never overwrite' using errcode='55000';
 end if;
end $safe$;
create table efg_private.efg_pilot_promotions(
 user_id uuid primary key references public.efg_profiles(user_id),
 previous_org_id uuid not null references public.efg_organizations(id),
 pilot_org_id uuid not null unique references public.efg_organizations(id),
 promoted_by uuid not null references auth.users(id),
 promoted_at timestamptz not null default pg_catalog.now(),
 seat_limit integer not null check(seat_limit=10)
);
alter table efg_private.efg_pilot_promotions enable row level security;
revoke all on efg_private.efg_pilot_promotions from public,anon,authenticated;

create function public.efg_promote_existing_student_to_pilot_coach(p_email text)
returns uuid language plpgsql security definer set search_path=''
as $body$
declare v_admin uuid := (select auth.uid());
 v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
 v_user public.efg_profiles%rowtype;
 v_org uuid;
begin
 if not efg_private.is_admin() or v_admin is null then
  raise exception 'Only active EFG admin can promote' using errcode='42501';
 end if;
 if v_email is null or pg_catalog.length(v_email)<5 or
  v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
  raise exception 'Valid existing account email required' using errcode='22023';
 end if;
 select * into v_user from public.efg_profiles p
 where pg_catalog.lower(p.email)=v_email for update;
 if not found or not v_user.active or v_user.role<>'student'
  or v_user.organization_id is null or v_user.user_id=v_admin then
  raise exception 'Target must be existing active student' using errcode='42501';
 end if;
 if not exists(select 1 from auth.users a where a.id=v_user.user_id
  and pg_catalog.lower(a.email)=v_email and a.email_confirmed_at is not null) then
  raise exception 'Confirmed account identity required' using errcode='42501';
 end if;
 if exists(select 1 from public.efg_organizations o where o.coach_id=v_user.user_id)
  or exists(select 1 from efg_private.efg_pilot_promotions a where a.user_id=v_user.user_id) then
  raise exception 'Target already owns an organization' using errcode='23505';
 end if;
 -- Single transaction. Their own diary, weights, recipes, past goals and
 -- messages remain attached to the SAME auth UID; do not DELETE or reassign them.
 insert into public.efg_organizations(name,coach_id,seat_limit,status,is_test,license_fee_ars)
 values('Piloto EFG · '||v_user.nickname,v_user.user_id,10,'trial',true,null)
 returning id into v_org;
 update public.efg_profiles set role='coach',organization_id=null
 where user_id=v_user.user_id and role='student' and active=true;
 if not found then raise exception 'Role changed concurrently' using errcode='PT409'; end if;
 insert into efg_private.efg_pilot_promotions(
  user_id,previous_org_id,pilot_org_id,promoted_by,seat_limit)
 values(v_user.user_id,v_user.organization_id,v_org,v_admin,10);
 return v_org;
end $body$;
revoke all on function public.efg_promote_existing_student_to_pilot_coach(text)
 from public,anon,authenticated;
grant execute on function public.efg_promote_existing_student_to_pilot_coach(text) to authenticated;
commit;
-- TESTS ONLY. No standalone approval to merge, promote real accounts or publish.
