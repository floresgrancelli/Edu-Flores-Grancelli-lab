-- COACH-PILOT-10 JWT local overlay. NEVER RUN ON HOSTED SUPABASE.
-- It exercises the candidate promotion with REAL GoTrue-signed LOCAL JWTs.
-- Invite RPC is a LOCAL facsimile of the inspected hosted contract, not a hosted deployment.
begin;
do $guard$
begin
 if current_database()<>'postgres'
  or to_regclass('efg_private.nut57_isolated_staging_marker') is null
  or (select count(*) from efg_private.nut57_isolated_staging_marker)<>1 then
  raise exception 'COACH-PILOT JWT overlay requires marker in disposable Supabase local';
 end if;
 if to_regclass('public.efg_invitations') is not null
   or to_regprocedure('public.efg_invite_student(text,text)') is not null
   or to_regprocedure('efg_private.is_admin()') is not null then
  raise exception 'COACH-PILOT JWT overlay refuses to replace existing objects';
 end if;
end $guard$;

create table public.efg_invitations(
 id uuid primary key default gen_random_uuid(),
 email text not null, nickname text not null,
 role text not null check(role in ('student','coach')),
 organization_id uuid not null references public.efg_organizations(id),
 invited_by uuid not null references auth.users(id),
 claimed_by uuid references auth.users(id),
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.efg_invitations enable row level security;
revoke all on public.efg_invitations from public,anon,authenticated;

create function efg_private.is_admin() returns boolean
language sql stable security definer set search_path=''
as $f$
 select exists(select 1 from public.efg_profiles p
  where p.user_id=auth.uid() and p.role='admin' and p.active)
$f$;

-- LOCAL facsimile: lock owning organization; count active students + pending
-- invitations. The hosted function must be retested on a faithful restore.
create function public.efg_invite_student(p_email text,p_name text)
returns uuid language plpgsql security definer set search_path=''
as $f$
declare v_org public.efg_organizations%rowtype;
 v_email text:=pg_catalog.lower(pg_catalog.btrim(p_email));
 v_name text:=pg_catalog.btrim(p_name);
 v_taken integer; v_id uuid;
begin
 select * into v_org from public.efg_organizations
 where coach_id=auth.uid() for update;
 if not found or v_org.status not in ('trial','active','grace')
  or not (v_org.is_test or (v_org.status='active' and
    v_org.paid_through >= (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date))
  or not exists(select 1 from public.efg_profiles
    where user_id=auth.uid() and role='coach' and active) then
   raise exception 'Coach unauthorized' using errcode='42501';
 end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
   or pg_catalog.length(v_name) not between 2 and 70 then
   raise exception 'Invalid invitation' using errcode='22023';
 end if;
 if exists(select 1 from public.efg_profiles where email=v_email)
  or exists(select 1 from public.efg_invitations
   where pg_catalog.lower(email)=v_email and revoked_at is null) then
   raise exception 'Already registered or invited';
 end if;
 select (select count(*) from public.efg_profiles
         where organization_id=v_org.id and role='student' and active)
       +(select count(*) from public.efg_invitations
         where organization_id=v_org.id and role='student'
          and claimed_by is null and revoked_at is null)
 into v_taken;
 if v_taken>=v_org.seat_limit then
  raise exception 'Pilot seats exhausted' using errcode='23514';
 end if;
 insert into public.efg_invitations(email,nickname,role,organization_id,invited_by)
 values(v_email,v_name,'student',v_org.id,auth.uid()) returning id into v_id;
 return v_id;
end $f$;
revoke all on function public.efg_invite_student(text,text) from public,anon,authenticated;
grant execute on function public.efg_invite_student(text,text) to authenticated;
commit;
