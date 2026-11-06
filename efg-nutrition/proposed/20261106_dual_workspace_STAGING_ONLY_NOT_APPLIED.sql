-- PROPOSAL / ISOLATED SYNTHETIC REHEARSAL ONLY. NOT A PRODUCTION MIGRATION.
-- No existing RLS/helper is replaced, no EXECUTE is granted, no feature is enabled.
-- R3 executed this proposal ONLY in a disposable synthetic PostgreSQL WASM fixture.
-- It has NOT been applied to any live service, production database or real account.
-- A later approved integration must cover every read/write/claim/reactivation path.
begin;
do $guard$
begin
 if current_setting('ncc.dual_workspace_fixture',true) is distinct from 'synthetic-v1'
 or to_regclass('efg_private.ncc_dual_workspace_fixture_marker') is null then
  raise exception 'STOP: disposable synthetic fixture required' using errcode='55000';
 end if;
 if (select count(*) from efg_private.ncc_dual_workspace_fixture_marker
     where marker='synthetic-v1')<>1
 or exists(select 1 from auth.users where email is null or lower(email) not like '%@example.invalid')
 or exists(select 1 from public.efg_profiles where email is null or lower(email) not like '%@example.invalid') then
  raise exception 'STOP: fixture marker or synthetic identities invalid' using errcode='55000';
 end if;
 if to_regclass('efg_private.ncc_coach_capabilities_v1') is not null
 or to_regprocedure('public.ncc_pilot_workspace_create_v1(text,text,integer,uuid)') is not null then
  raise exception 'STOP: candidate already exists; do not overwrite' using errcode='55000';
 end if;
end $guard$;

create table efg_private.ncc_coach_capabilities_v1(
 user_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null unique references public.efg_organizations(id),
 active boolean not null default true,
 terms_version text,
 privacy_version text,
 terms_accepted_at timestamptz,
 granted_by uuid not null references public.efg_profiles(user_id),
 created_at timestamptz not null default now()
);
create table efg_private.ncc_coach_invitations_v1(
 id uuid primary key default gen_random_uuid(),
 email text not null check(email=lower(trim(email)) and email like '%@example.invalid'),
 nickname text not null check(length(trim(nickname)) between 2 and 70),
 organization_id uuid not null unique references public.efg_organizations(id),
 invited_by uuid not null references public.efg_profiles(user_id),
 claimed_by uuid references public.efg_profiles(user_id),
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index ncc_coach_pending_email_v1 on efg_private.ncc_coach_invitations_v1(email)
 where claimed_by is null and revoked_at is null;
create table efg_private.ncc_workspace_receipts_v1(
 actor_id uuid not null references public.efg_profiles(user_id),
 request_id uuid not null,
 operation text not null check(operation in ('create','seats','invite','claim','acceptTerms')),
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table efg_private.ncc_coach_capabilities_v1 enable row level security;
alter table efg_private.ncc_coach_invitations_v1 enable row level security;
alter table efg_private.ncc_workspace_receipts_v1 enable row level security;
revoke all on efg_private.ncc_coach_capabilities_v1,efg_private.ncc_coach_invitations_v1,
 efg_private.ncc_workspace_receipts_v1 from public,anon,authenticated;

create function efg_private.ncc_identity_v1() returns uuid
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not exists(select 1 from auth.users where id=v_actor and email_confirmed_at is not null)
 or exists(select 1 from public.efg_profiles where user_id=v_actor and not active) then
  raise exception 'Verified identity required' using errcode='42501';
 end if;
 return v_actor;
end $$;
create function efg_private.ncc_actor_v1() returns uuid
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_identity_v1();
begin
 if v_actor is null or not exists(select 1 from public.efg_profiles p join auth.users u on u.id=p.user_id
  where p.user_id=v_actor and p.active and u.email_confirmed_at is not null) then
  raise exception 'Active verified account required' using errcode='42501';
 end if;
 return v_actor;
end $$;
create function efg_private.ncc_existing_receipt_v1(p_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_identity_v1(); r efg_private.ncc_workspace_receipts_v1%rowtype;
begin
 if p_id is null then raise exception 'Request ID required' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||p_id::text,0));
 select * into r from efg_private.ncc_workspace_receipts_v1 where actor_id=v_actor and request_id=p_id;
 if found then
  if r.operation is distinct from p_operation or r.payload is distinct from p_payload then
   raise exception 'Idempotency conflict' using errcode='22023';
  end if;
  return r.result;
 end if;
 return null;
end $$;
create function efg_private.ncc_save_receipt_v1(p_id uuid,p_operation text,p_payload jsonb,p_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 insert into efg_private.ncc_workspace_receipts_v1(actor_id,request_id,operation,payload,result)
 values(efg_private.ncc_actor_v1(),p_id,p_operation,p_payload,p_result);
 return p_result;
end $$;
create function public.ncc_pilot_workspace_receipt_v1(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_identity_v1(); v_result jsonb;
begin
 select jsonb_build_object('operation',operation,'payload',payload,'result',result) into v_result
 from efg_private.ncc_workspace_receipts_v1 where actor_id=v_actor and request_id=p_request_id;
 return v_result;
end $$;

create function public.ncc_pilot_workspace_create_v1(p_email text,p_name text,p_seats integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_actor_v1(); v_email text:=lower(trim(p_email));
 v_name text:=trim(p_name); v_profile public.efg_profiles%rowtype; v_exists boolean;
 v_org uuid; v_payload jsonb; v_prior jsonb; v_result jsonb;
begin
 if not efg_private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if p_seats is null or p_seats not between 1 and 10000 or v_name is null or length(v_name) not between 2 and 70
 or v_name ~ '[[:cntrl:]]' or v_email is null or length(v_email)>254
 or v_email !~ '^[^[:space:]@]+@example[.]invalid$' then
  raise exception 'Invalid synthetic account or seats' using errcode='22023';
 end if;
 v_payload:=jsonb_build_object('p_email',v_email,'p_name',v_name,'p_seats',p_seats);
 v_prior:=efg_private.ncc_existing_receipt_v1(p_request_id,'create',v_payload);
 if v_prior is not null then return v_prior; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ncc-account:'||v_email,0));
 select * into v_profile from public.efg_profiles where lower(email)=v_email for update;
 v_exists:=found;
 if v_exists and (not v_profile.active or v_profile.role='admin' or not exists(
   select 1 from auth.users where id=v_profile.user_id and lower(email)=v_email and email_confirmed_at is not null)) then
  raise exception 'Target account not eligible' using errcode='42501';
 end if;
 if (v_exists and (exists(select 1 from public.efg_organizations where coach_id=v_profile.user_id)
  or exists(select 1 from efg_private.ncc_coach_capabilities_v1 where user_id=v_profile.user_id)))
 or exists(select 1 from public.efg_invitations where lower(email)=v_email and revoked_at is null)
 or exists(select 1 from efg_private.ncc_coach_invitations_v1 where email=v_email and revoked_at is null) then
  raise exception 'Already enrolled or invited' using errcode='23505';
 end if;
 insert into public.efg_organizations(name,coach_id,seat_limit,status,is_test,license_fee_ars)
 values(v_name,case when v_exists then v_profile.user_id else null end,p_seats,'trial',true,null)
 returning id into v_org;
 if v_exists then
  insert into efg_private.ncc_coach_capabilities_v1(user_id,organization_id,granted_by)
  values(v_profile.user_id,v_org,v_actor);
 else
  insert into efg_private.ncc_coach_invitations_v1(email,nickname,organization_id,invited_by)
  values(v_email,v_name,v_org,v_actor);
 end if;
 -- Intentionally NO UPDATE of efg_profiles, consents, goals, diaries or history.
 v_result:=jsonb_build_object('organization_id',v_org,'seat_limit',p_seats,
  'state',case when v_exists then 'enabled_existing' else 'pending_verified_account' end,
  'student_link_preserved',v_exists and v_profile.role='student');
 return efg_private.ncc_save_receipt_v1(p_request_id,'create',v_payload,v_result);
end $$;

create function public.ncc_pilot_workspace_claim_v1(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_identity_v1(); v_email text; v_prior jsonb;
 v_inv efg_private.ncc_coach_invitations_v1%rowtype; v_org public.efg_organizations%rowtype;
 v_profile public.efg_profiles%rowtype; v_exists boolean;
begin
 v_prior:=efg_private.ncc_existing_receipt_v1(p_request_id,'claim','{}'::jsonb);
 if v_prior is not null then return v_prior; end if;
 select lower(email) into v_email from auth.users where id=v_actor;
 if v_email is null or v_email !~ '^[^[:space:]@]+@example[.]invalid$' then
  raise exception 'Synthetic verified identity required' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ncc-account:'||v_email,0));
 select * into v_inv from efg_private.ncc_coach_invitations_v1 where email=v_email and revoked_at is null
  and (claimed_by is null or claimed_by=v_actor) order by created_at desc limit 1 for update;
 if not found then raise exception 'No matching coach invitation' using errcode='42501'; end if;
 select * into strict v_org from public.efg_organizations where id=v_inv.organization_id for update;
 if not v_org.is_test or v_org.status not in ('trial','active') or
 (v_org.coach_id is not null and v_org.coach_id<>v_actor) then
  raise exception 'Coach workspace unavailable' using errcode='42501';
 end if;
 select * into v_profile from public.efg_profiles where user_id=v_actor for update;
 v_exists:=found;
 if (v_exists and (not v_profile.active or v_profile.role='admin' or lower(v_profile.email)<>v_email))
 or exists(select 1 from public.efg_organizations where coach_id=v_actor and id<>v_org.id)
 or exists(select 1 from efg_private.ncc_coach_capabilities_v1 where user_id=v_actor and organization_id<>v_org.id)
 or exists(select 1 from efg_private.ncc_coach_capabilities_v1 where user_id=v_actor and not active) then
  raise exception 'Account not eligible for claimed workspace' using errcode='42501';
 end if;
 if not v_exists then
  insert into public.efg_profiles(user_id,email,nickname,role,organization_id)
  values(v_actor,v_email,v_inv.nickname,'coach',null);
 end if;
 -- An EXISTING student's role, organization and consent are never rewritten.
 update public.efg_organizations set coach_id=v_actor where id=v_org.id;
 insert into efg_private.ncc_coach_capabilities_v1(user_id,organization_id,granted_by)
 values(v_actor,v_org.id,v_inv.invited_by) on conflict(user_id) do nothing;
 update efg_private.ncc_coach_invitations_v1 set claimed_by=v_actor where id=v_inv.id;
 return efg_private.ncc_save_receipt_v1(p_request_id,'claim','{}'::jsonb,
  jsonb_build_object('organization_id',v_org.id,'seat_limit',v_org.seat_limit,
   'state','enabled_verified_account','student_link_preserved',v_exists and v_profile.role='student'));
end $$;

create function public.ncc_pilot_workspace_accept_terms_v1(p_org uuid,p_terms_version text,p_privacy_version text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_actor_v1(); v_prior jsonb; v_payload jsonb;
begin
 if p_terms_version is distinct from 'synthetic-terms-v1' or p_privacy_version is distinct from 'synthetic-privacy-v1' then
  raise exception 'Synthetic legal version mismatch' using errcode='22023';
 end if;
 v_payload:=jsonb_build_object('p_org',p_org,'p_terms_version',p_terms_version,'p_privacy_version',p_privacy_version);
 v_prior:=efg_private.ncc_existing_receipt_v1(p_request_id,'acceptTerms',v_payload);
 if v_prior is not null then return v_prior; end if;
 perform 1 from public.efg_organizations o join efg_private.ncc_coach_capabilities_v1 c on c.organization_id=o.id
 where o.id=p_org and o.coach_id=v_actor and o.is_test and o.status in ('trial','active') and c.user_id=v_actor and c.active
 for update of o,c;
 if not found then raise exception 'Own active pilot required' using errcode='42501'; end if;
 update efg_private.ncc_coach_capabilities_v1 set terms_version=p_terms_version,privacy_version=p_privacy_version,
  terms_accepted_at=clock_timestamp() where user_id=v_actor and organization_id=p_org;
 return efg_private.ncc_save_receipt_v1(p_request_id,'acceptTerms',v_payload,jsonb_build_object('organization_id',p_org,'legal_ready',true));
end $$;

create function public.ncc_pilot_workspace_roster_v1(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_actor_v1(); v_result jsonb;
begin
 if not exists(select 1 from public.efg_organizations o join efg_private.ncc_coach_capabilities_v1 c on c.organization_id=o.id
  where o.id=p_org and o.coach_id=v_actor and o.is_test and o.status in ('trial','active') and c.user_id=v_actor and c.active
  and c.terms_version='synthetic-terms-v1' and c.privacy_version='synthetic-privacy-v1' and c.terms_accepted_at is not null) then
  raise exception 'Own active pilot and professional terms required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'organization_id',p.organization_id,
  'nickname',p.nickname,'active',p.active,'consent_accepted',exists(select 1 from public.efg_consents c
   where c.student_id=p.user_id and c.organization_id=p_org and c.accepted)) order by p.user_id),'[]'::jsonb)
 into v_result from public.efg_profiles p where p.organization_id=p_org and p.role='student';
 return v_result;
end $$;

create function public.ncc_pilot_workspace_set_seats_v1(p_org uuid,p_seats integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_actor_v1(); v_org public.efg_organizations%rowtype;
 v_used integer; v_payload jsonb:=jsonb_build_object('p_org',p_org,'p_seats',p_seats); v_prior jsonb;
begin
 if not efg_private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if p_seats is null or p_seats not between 1 and 10000 then raise exception 'Invalid seats' using errcode='22023'; end if;
 v_prior:=efg_private.ncc_existing_receipt_v1(p_request_id,'seats',v_payload);
 if v_prior is not null then return v_prior; end if;
 select * into v_org from public.efg_organizations where id=p_org for update;
 if not found or not v_org.is_test or not (
  exists(select 1 from efg_private.ncc_coach_capabilities_v1 where organization_id=p_org) or
  exists(select 1 from efg_private.ncc_coach_invitations_v1 where organization_id=p_org and revoked_at is null)) then
  raise exception 'Candidate pilot required' using errcode='42501';
 end if;
 select (select count(*) from public.efg_profiles where organization_id=p_org and role='student' and active)
 +(select count(*) from public.efg_invitations where organization_id=p_org and role='student'
  and claimed_by is null and revoked_at is null) into v_used;
 if p_seats<v_used then raise exception 'Occupied seats exceed requested limit' using errcode='23514'; end if;
 update public.efg_organizations set seat_limit=p_seats where id=p_org;
 return efg_private.ncc_save_receipt_v1(p_request_id,'seats',v_payload,
  jsonb_build_object('organization_id',p_org,'seat_limit',p_seats));
end $$;

create function public.ncc_pilot_workspace_invite_student_v1(p_org uuid,p_email text,p_name text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_actor_v1(); v_org public.efg_organizations%rowtype;
 v_email text:=lower(trim(p_email)); v_name text:=trim(p_name); v_used integer; v_id uuid;
 v_payload jsonb; v_prior jsonb;
begin
 if v_email is null or length(v_email)>254 or v_email !~ '^[^[:space:]@]+@example[.]invalid$'
 or v_name is null or length(v_name) not between 2 and 70 or v_name ~ '[[:cntrl:]]' then
  raise exception 'Synthetic student identity required' using errcode='22023';
 end if;
 v_payload:=jsonb_build_object('p_org',p_org,'p_email',v_email,'p_name',v_name);
 v_prior:=efg_private.ncc_existing_receipt_v1(p_request_id,'invite',v_payload);
 if v_prior is not null then return v_prior; end if;
 -- Global email lock BEFORE org lock matches create and other candidate invitations.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ncc-account:'||v_email,0));
 select * into v_org from public.efg_organizations where id=p_org for update;
 if not found or v_org.coach_id is distinct from v_actor or not v_org.is_test
 or v_org.status not in ('trial','active') or not exists(
  select 1 from efg_private.ncc_coach_capabilities_v1 where organization_id=p_org and user_id=v_actor and active
  and terms_version='synthetic-terms-v1' and privacy_version='synthetic-privacy-v1' and terms_accepted_at is not null) then
  raise exception 'Wrong or inactive coach workspace' using errcode='42501';
 end if;
 if exists(select 1 from public.efg_profiles where lower(email)=v_email)
 or exists(select 1 from public.efg_invitations where lower(email)=v_email and revoked_at is null)
 or exists(select 1 from efg_private.ncc_coach_invitations_v1 where email=v_email and revoked_at is null) then
  raise exception 'Already registered or invited' using errcode='23505';
 end if;
 select (select count(*) from public.efg_profiles where organization_id=p_org and role='student' and active)
 +(select count(*) from public.efg_invitations where organization_id=p_org and role='student'
  and claimed_by is null and revoked_at is null) into v_used;
 if v_used>=v_org.seat_limit then raise exception 'Pilot seats exhausted' using errcode='23514'; end if;
 insert into public.efg_invitations(email,nickname,role,organization_id,invited_by)
 values(v_email,v_name,'student',p_org,v_actor) returning id into v_id;
 return efg_private.ncc_save_receipt_v1(p_request_id,'invite',v_payload,
  jsonb_build_object('organization_id',p_org,'invitation_id',v_id));
end $$;

create function public.ncc_dual_workspace_contexts_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=efg_private.ncc_actor_v1(); v_profile public.efg_profiles%rowtype;
 v_student jsonb; v_coaches jsonb; v_managed jsonb:='[]'::jsonb;
begin
 select * into strict v_profile from public.efg_profiles where user_id=v_actor;
 if v_profile.role='student' then
  select jsonb_build_object('organization_id',o.id,'coach_id',o.coach_id,'consent_accepted',
   exists(select 1 from public.efg_consents c where c.student_id=v_actor and c.organization_id=o.id and c.accepted))
  into v_student from public.efg_organizations o where o.id=v_profile.organization_id;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'coach_id',o.coach_id,
  'is_test',o.is_test,'status',o.status,'seat_limit',o.seat_limit,
  'legal_ready',coalesce(c.terms_version='synthetic-terms-v1' and c.privacy_version='synthetic-privacy-v1' and c.terms_accepted_at is not null,false),
  'active_students',(select count(*) from public.efg_profiles p where p.organization_id=o.id and p.role='student' and p.active),
  'pending_invitations',(select count(*) from public.efg_invitations i where i.organization_id=o.id and i.role='student'
    and i.claimed_by is null and i.revoked_at is null)) order by o.id),'[]'::jsonb)
 into v_coaches from public.efg_organizations o join efg_private.ncc_coach_capabilities_v1 c on c.organization_id=o.id
 where c.user_id=v_actor and c.active and o.coach_id=v_actor and o.is_test and o.status in ('trial','active');
 if efg_private.is_admin() then
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'coach_id',o.coach_id,
   'is_test',o.is_test,'status',o.status,'seat_limit',o.seat_limit,
   'active_students',(select count(*) from public.efg_profiles p where p.organization_id=o.id and p.role='student' and p.active),
   'pending_invitations',(select count(*) from public.efg_invitations i where i.organization_id=o.id and i.role='student'
    and i.claimed_by is null and i.revoked_at is null)) order by o.id),'[]'::jsonb)
  into v_managed from public.efg_organizations o where o.is_test and (
   exists(select 1 from efg_private.ncc_coach_capabilities_v1 c where c.organization_id=o.id) or
   exists(select 1 from efg_private.ncc_coach_invitations_v1 i where i.organization_id=o.id and i.revoked_at is null));
 end if;
 return jsonb_build_object('user_id',v_actor,'profile_role',v_profile.role,'active',v_profile.active,
  'student_context',v_student,'coach_contexts',v_coaches,'managed_coaches',v_managed);
end $$;

-- No policies/grants are installed on existing data. None of these candidate RPCs
-- are reachable by anon/authenticated. A later approval and full review are required.
revoke all on function efg_private.ncc_identity_v1() from public,anon,authenticated;
revoke all on function efg_private.ncc_actor_v1() from public,anon,authenticated;
revoke all on function efg_private.ncc_existing_receipt_v1(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function efg_private.ncc_save_receipt_v1(uuid,text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_receipt_v1(uuid) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_create_v1(text,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_claim_v1(uuid) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_accept_terms_v1(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_roster_v1(uuid) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_set_seats_v1(uuid,integer,uuid) from public,anon,authenticated;
revoke all on function public.ncc_pilot_workspace_invite_student_v1(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.ncc_dual_workspace_contexts_v1() from public,anon,authenticated;
commit;
