-- COACH106 / EFG Nutrition Con-Ciencia — additive pilot-only participation receipts.
-- This is NOT a legal-document acceptance and NOT authorization to process health diagnoses.
-- No existing student, diary, goal, payment, habitual or history is modified.
-- Enable UI only after signed-JWT A/B verification and current-version readback.
do $preflight$
begin
 if to_regclass('public.efg_pilot_participation_receipts') is not null
 or to_regprocedure('public.efg_accept_pilot_participation(text,boolean,boolean)') is not null
 or to_regprocedure('public.efg_revoke_pilot_participation(text)') is not null then
  raise exception 'COACH106: participation objects already exist; review existing installation';
 end if;
 if to_regclass('public.efg_profiles') is null or to_regclass('public.efg_organizations') is null then
  raise exception 'COACH106: required existing profiles/organizations missing';
 end if;
end $preflight$;

create table public.efg_pilot_participation_receipts (
 student_id uuid not null references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 version text not null check (version='coach_pilot_2026_demo1'),
 participation_accepted boolean not null check (participation_accepted=true),
 sharing_accepted boolean not null check (sharing_accepted=true),
 acceptance_method text not null default 'two_explicit_checkboxes'
  check (acceptance_method='two_explicit_checkboxes'),
 accepted_at timestamptz not null default pg_catalog.clock_timestamp(),
 revoked_at timestamptz,
 updated_at timestamptz not null default pg_catalog.clock_timestamp(),
 primary key (student_id, version)
);
comment on table public.efg_pilot_participation_receipts is
 'Pilot participation and coach-share choices, NOT legal acceptance or sensitive-health consent.';
create index efg_pilot_participation_org_idx
 on public.efg_pilot_participation_receipts(organization_id, updated_at desc);

alter table public.efg_pilot_participation_receipts enable row level security;
revoke all on public.efg_pilot_participation_receipts from public,anon,authenticated;
grant select on public.efg_pilot_participation_receipts to authenticated;
create policy efg_pilot_participation_owner_read
 on public.efg_pilot_participation_receipts for select to authenticated using (
 student_id=(select auth.uid()) and exists (
  select 1 from public.efg_profiles p
   where p.user_id=(select auth.uid()) and p.role='student'
    and p.active and p.organization_id=efg_pilot_participation_receipts.organization_id
 )
);
-- No direct INSERT/UPDATE/DELETE rights or policies. All mutations are server-owned.

create function public.efg_accept_pilot_participation(
 p_version text, p_participation boolean, p_sharing boolean
) returns timestamptz language plpgsql volatile security definer set search_path=''
as $accept$
declare
 v_student uuid := (select auth.uid());
 v_org uuid;
 v_accepted timestamptz := pg_catalog.clock_timestamp();
begin
 if v_student is null or p_version is distinct from 'coach_pilot_2026_demo1'
    or p_participation is distinct from true or p_sharing is distinct from true then
  raise exception 'Both pilot choices require an explicit authenticated action'
    using errcode='42501';
 end if;
 select p.organization_id into v_org
  from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  where p.user_id=v_student and p.role='student' and p.active;
 if v_org is null then
  raise exception 'An active student account is required' using errcode='42501';
 end if;
 insert into public.efg_pilot_participation_receipts
  (student_id,organization_id,version,participation_accepted,sharing_accepted,
   accepted_at,revoked_at,updated_at)
 values (v_student,v_org,p_version,true,true,v_accepted,null,v_accepted)
 on conflict(student_id,version) do update set
  organization_id=excluded.organization_id,
  participation_accepted=true,sharing_accepted=true,
  acceptance_method='two_explicit_checkboxes',
  accepted_at=excluded.accepted_at,revoked_at=null,updated_at=excluded.updated_at;
 return v_accepted;
end
$accept$;
revoke execute on function public.efg_accept_pilot_participation(text,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.efg_accept_pilot_participation(text,boolean,boolean)
 to authenticated;

create function public.efg_revoke_pilot_participation(p_version text)
returns boolean language plpgsql volatile security definer set search_path=''
as $revoke$
declare
 v_student uuid := (select auth.uid());
 v_found boolean;
begin
 if v_student is null or p_version is distinct from 'coach_pilot_2026_demo1' then
  raise exception 'Valid authenticated pilot version required' using errcode='42501';
 end if;
 update public.efg_pilot_participation_receipts
 set revoked_at=pg_catalog.clock_timestamp(),updated_at=pg_catalog.clock_timestamp()
 where student_id=v_student and version=p_version and revoked_at is null;
 v_found:=found;
 return v_found;
end
$revoke$;
revoke execute on function public.efg_revoke_pilot_participation(text)
 from public,anon,authenticated;
grant execute on function public.efg_revoke_pilot_participation(text)
 to authenticated;
