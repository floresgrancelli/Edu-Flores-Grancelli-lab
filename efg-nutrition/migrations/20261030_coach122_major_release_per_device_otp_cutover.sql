-- COACH122: per-device major reauthentication cutover. The old COACH121
-- implementation compared the current JWT session_id with one OTHER device's
-- receipt; a previously logged-in second device could bypass OTP.
-- Change is additive and inert while there are zero active releases.
-- Strict preflight blocks edits to any LIVE campaign.
do $coach122$
begin
 if pg_catalog.to_regclass('efg_private.major_release_manifests') is null
 or pg_catalog.to_regprocedure('public.efg_major_release_status()') is null
 or pg_catalog.to_regclass('auth.sessions') is null then
  raise exception 'COACH122 prerequisites missing' using errcode='55000';
 end if;
 if exists(select 1 from efg_private.major_release_manifests where active)
 then raise exception 'COACH122 requires zero active release campaigns'
  using errcode='55000';
 end if;
 if exists(select 1 from information_schema.columns
  where table_schema='efg_private' and table_name='major_release_manifests'
   and column_name='reauth_required_at') then
  raise exception 'COACH122 already installed' using errcode='55000';
 end if;
end $coach122$;
alter table efg_private.major_release_manifests
 add column reauth_required_at timestamptz;
alter table efg_private.major_release_manifests
 add constraint coach122_active_cutover_required
 check (not active or phase='preview' or reauth_required_at is not null);
alter table efg_private.major_release_manifests
 add constraint coach122_reauth_cutover_after_preview
 check (reauth_required_at is null or
   (activated_at is not null and reauth_required_at>=activated_at));
-- Important: set reauth_required_at to the REAL server release instant,
-- atomically with the approved phase change. Never use the earlier preview
-- activated_at as the OTP cutoff. Existing sessions from preview remain OLD.

create or replace function public.efg_major_release_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $major_status$
declare
 v_uid uuid:=auth.uid();
 v_role text;
 v_session text:=auth.jwt()->>'session_id';
 v_release efg_private.major_release_manifests%rowtype;
 v_session_uuid uuid;
 v_session_started_at timestamptz;
 v_preview_read boolean:=false;
 v_whatsnew_seen boolean:=false;
 v_legal_count integer:=0;
begin
 if v_uid is null then return '{"phase":"none"}'::jsonb; end if;
 select role into v_role from public.efg_profiles
 where user_id=v_uid and active;
 if v_role is null then return '{"phase":"none"}'::jsonb; end if;
 select * into v_release from efg_private.major_release_manifests
 where active and current_release and activated_at<=pg_catalog.now()
  and build<>'unconfigured'
  and v_role=any(roles);
 if not found then return '{"phase":"none"}'::jsonb; end if;
 select exists(select 1 from efg_private.major_release_receipts r
  where r.user_id=v_uid and r.release_id=v_release.release_id
   and r.event_kind='announcement_preview_read') into v_preview_read;
 if v_release.phase='preview' then
  if v_preview_read then return '{"phase":"none"}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('phase','preview','id',v_release.release_id,
    'version',v_release.version,'build',v_release.build,'published',
    (v_release.phase in ('reauth_required','live')),'title',v_release.title,
    'highlights',v_release.highlights,'roles',v_release.roles);
 end if;
 -- Session identity must be verified against Auth's actual creation time,
 -- not merely different from the session of ANOTHER device. This prevents
 -- an older second device from bypassing the major re-login after device A
 -- signs out. JWT refreshes keep the same session ID and cannot count as OTP.
 if v_session is not null and v_session ~*
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
  return pg_catalog.jsonb_build_object('phase','reauth_required','id',v_release.release_id,
    'version',v_release.version,'build',v_release.build,'published',
    (v_release.phase in ('reauth_required','live')),'title',v_release.title,
    'highlights',v_release.highlights,'roles',v_release.roles);
 end if;
 -- Reauthentication alone does not sign legal documents or health consents.
 select count(*) into v_legal_count
 from public.efg_legal_current_status() as d where d.accepted;
 if v_legal_count<>2 then
  return pg_catalog.jsonb_build_object('phase','legal','id',v_release.release_id);
 end if;
 if v_release.phase<>'live' then
  return '{"phase":"none"}'::jsonb;
 end if;
 select exists(select 1 from efg_private.major_release_receipts r
  where r.user_id=v_uid and r.release_id=v_release.release_id
   and r.event_kind='whats_new_seen') into v_whatsnew_seen;
 if v_whatsnew_seen then return '{"phase":"none"}'::jsonb; end if;
 return pg_catalog.jsonb_build_object('phase','live','id',v_release.release_id,
   'version',v_release.version,'build',v_release.build,'published',
    (v_release.phase in ('reauth_required','live')),'title',v_release.title,
   'highlights',v_release.highlights,'roles',v_release.roles);
end;
$major_status$;
 then
  v_session_uuid:=v_session::uuid;
 end if;
 if v_session_uuid is not null then
  select s.created_at into v_session_started_at
  from auth.sessions s
  where s.id=v_session_uuid and s.user_id=v_uid;
 end if;
 -- Fail closed for unknown/malformed session or unset cutover.
 if v_release.reauth_required_at is null or v_session_started_at is null
    or v_session_started_at < v_release.reauth_required_at then
  return pg_catalog.jsonb_build_object('phase','reauth_required','id',v_release.release_id,
    'version',v_release.version,'build',v_release.build,'published',
    (v_release.phase in ('reauth_required','live')),'title',v_release.title,
    'highlights',v_release.highlights,'roles',v_release.roles);
 end if;
 -- Reauthentication alone does not sign legal documents or health consents.
 select count(*) into v_legal_count
 from public.efg_legal_current_status() as d where d.accepted;
 if v_legal_count<>2 then
  return pg_catalog.jsonb_build_object('phase','legal','id',v_release.release_id);
 end if;
 if v_release.phase<>'live' then
  return '{"phase":"none"}'::jsonb;
 end if;
 select exists(select 1 from efg_private.major_release_receipts r
  where r.user_id=v_uid and r.release_id=v_release.release_id
   and r.event_kind='whats_new_seen') into v_whatsnew_seen;
 if v_whatsnew_seen then return '{"phase":"none"}'::jsonb; end if;
 return pg_catalog.jsonb_build_object('phase','live','id',v_release.release_id,
   'version',v_release.version,'build',v_release.build,'published',
    (v_release.phase in ('reauth_required','live')),'title',v_release.title,
   'highlights',v_release.highlights,'roles',v_release.roles);
end;
$major_status$;

revoke all on function public.efg_major_release_status()
 from public,anon,authenticated;
grant execute on function public.efg_major_release_status() to authenticated;
comment on function public.efg_major_release_status() is
 'Major release per-device: auth.sessions.created_at must be at/after approved reauth_required_at; older sessions in ANY device must reenter via OTP. Preview still non-logout; no campaigns active by default.';
