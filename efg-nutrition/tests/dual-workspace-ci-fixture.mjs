// TEST-ONLY schema/policies for a fresh disposable local database.
// This is deliberately NOT a hosted RLS migration or schema-parity claim.
export const bootstrapSql = `
create schema efg_private;
 create table public.efg_organizations(id uuid primary key default gen_random_uuid(),name text not null,coach_id uuid references auth.users(id),
   seat_limit integer not null check(seat_limit between 1 and 10000),status text not null,is_test boolean not null,license_fee_ars numeric);
 create table public.efg_profiles(user_id uuid primary key references auth.users(id),email text not null unique,nickname text not null,
   role text not null check(role in ('admin','coach','student')),active boolean not null default true,
   organization_id uuid references efg_organizations(id),
   constraint profile_org_role check((role='student' and organization_id is not null) or (role<>'student' and organization_id is null)));
 create table public.efg_invitations(id uuid primary key default gen_random_uuid(),email text not null,nickname text not null,role text not null,
   organization_id uuid references efg_organizations(id),invited_by uuid references auth.users(id),claimed_by uuid references auth.users(id),revoked_at timestamptz);
 create table public.efg_consents(student_id uuid primary key references efg_profiles(user_id),organization_id uuid references efg_organizations(id),accepted boolean not null);
 create table public.efg_daily_logs(student_id uuid references efg_profiles(user_id),body text not null);
 create function efg_private.is_admin() returns boolean language sql stable as $$select exists(select 1 from public.efg_profiles where user_id=auth.uid() and role='admin' and active)$$;
 create table efg_private.ncc_dual_workspace_fixture_marker(marker text primary key);
 insert into efg_private.ncc_dual_workspace_fixture_marker values('synthetic-v1');


revoke all on all tables in schema public from public,anon,authenticated;
`;
export const fixtureRlsSql = `
 create function efg_private.ncc_fixture_read_student_v1(p_student uuid) returns boolean
 language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.efg_profiles actor where actor.user_id=auth.uid() and actor.active
   and (p_student=actor.user_id or exists(
    select 1 from public.efg_profiles student join public.efg_organizations o on o.id=student.organization_id
    join public.efg_consents consent on consent.student_id=student.user_id and consent.organization_id=o.id
    where student.user_id=p_student and student.role='student' and student.active and consent.accepted
    and o.coach_id=actor.user_id and o.is_test and o.status in ('trial','active')
    and (actor.role='coach' or exists(select 1 from efg_private.ncc_coach_capabilities_v1 cap
     where cap.user_id=actor.user_id and cap.organization_id=o.id and cap.active
     and cap.terms_version='synthetic-terms-v1' and cap.privacy_version='synthetic-privacy-v1' and cap.terms_accepted_at is not null))
   )))
 $$;
 revoke all on function efg_private.ncc_fixture_read_student_v1(uuid) from public,anon;
 grant usage on schema public,efg_private to authenticated;
 grant execute on function efg_private.ncc_fixture_read_student_v1(uuid) to authenticated;
 alter table public.efg_daily_logs enable row level security;
 grant select on public.efg_daily_logs to authenticated;
 create policy ncc_fixture_private_read on public.efg_daily_logs for select to authenticated
  using(efg_private.ncc_fixture_read_student_v1(student_id));

`;
export const candidateEndpoints = [
  "ncc_pilot_workspace_create_v1(text,text,integer,uuid)",
  "ncc_pilot_workspace_claim_v1(uuid)",
  "ncc_pilot_workspace_set_seats_v1(uuid,integer,uuid)",
  "ncc_pilot_workspace_invite_student_v1(uuid,text,text,uuid)",
  "ncc_pilot_workspace_accept_terms_v1(uuid,text,text,uuid)",
  "ncc_pilot_workspace_roster_v1(uuid)",
  "ncc_dual_workspace_contexts_v1()",
  "ncc_pilot_workspace_receipt_v1(uuid)"
];
export const fixtureGrantsSql = candidateEndpoints.map(name =>
  'grant execute on function public.'+name+' to authenticated;').join('\n');
