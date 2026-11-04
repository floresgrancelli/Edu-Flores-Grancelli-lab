-- COACH120 / UX-35: major-release communications and per-user receipts.
-- ADDITIVE, NO ACTIVE RELEASES, NO USERS SIGNED OUT, NO LEGAL ACCEPTED.
-- Minor app builds never create notices and no browser can activate a release.
do $coach120$
begin
 if pg_catalog.to_regclass('efg_private.major_release_manifests') is not null
 or pg_catalog.to_regclass('efg_private.major_release_receipts') is not null
 or pg_catalog.to_regprocedure('public.efg_major_release_status()') is not null
 or pg_catalog.to_regprocedure('public.efg_major_release_ack(text,text,boolean)') is not null
 then raise exception 'COACH120 already installed; do not repeat'; end if;
 if pg_catalog.to_regprocedure('public.efg_legal_current_status()') is null then
  raise exception 'COACH120 requires versioned legal documents' using errcode='55000';
 end if;
end $coach120$;

create table efg_private.major_release_manifests(
 release_id text primary key check(release_id ~ '^[a-z][a-z0-9_]{6,60}$'),
 version text not null check(version ~ '^[0-9a-zA-Z._-]{2,35}$'),
 title text not null check(pg_catalog.char_length(title) between 10 and 120),
 highlights jsonb not null check(
  pg_catalog.jsonb_typeof(highlights)='array'
  and pg_catalog.jsonb_array_length(highlights) between 1 and 8),
 phase text not null check(phase in ('preview','reauth_required','live')),
 active boolean not null default false,
 current_release boolean not null default false,
 roles text[] not null default array['student','coach','admin','personal']::text[],
 activated_at timestamptz,
 created_at timestamptz not null default pg_catalog.now(),
 check(not active or (current_release and activated_at is not null))
);
create unique index coach120_one_current_release
 on efg_private.major_release_manifests(current_release)
 where current_release;
alter table efg_private.major_release_manifests enable row level security;
revoke all on efg_private.major_release_manifests from public,anon,authenticated;

create table efg_private.major_release_receipts(
 release_id text not null references efg_private.major_release_manifests(release_id),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_kind text not null check(event_kind in
  ('announcement_preview_read','reauth_notice_acknowledged','whats_new_seen')),
 signed_session_id text,
 recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
 primary key(release_id,user_id,event_kind)
);
create index coach120_receipts_user
 on efg_private.major_release_receipts(user_id,recorded_at desc);
alter table efg_private.major_release_receipts enable row level security;
revoke all on efg_private.major_release_receipts from public,anon,authenticated;

-- Returns only the signed user's own release state. The browser is NEVER
-- trusted to supply a phase, identity, permission or legal acceptance.
create function public.efg_major_release_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $major_status$
declare
 v_uid uuid:=auth.uid();
 v_role text;
 v_session text:=auth.jwt()->>'session_id';
 v_release efg_private.major_release_manifests%rowtype;
 v_old_session text;
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
  and v_role=any(roles);
 if not found then return '{"phase":"none"}'::jsonb; end if;
 select exists(select 1 from efg_private.major_release_receipts r
  where r.user_id=v_uid and r.release_id=v_release.release_id
   and r.event_kind='announcement_preview_read') into v_preview_read;
 if v_release.phase='preview' then
  if v_preview_read then return '{"phase":"none"}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('phase','preview','id',v_release.release_id,
    'version',v_release.version,'title',v_release.title,
    'highlights',v_release.highlights,'roles',v_release.roles);
 end if;
 select signed_session_id into v_old_session
 from efg_private.major_release_receipts r
 where r.user_id=v_uid and r.release_id=v_release.release_id
   and r.event_kind='reauth_notice_acknowledged';
 -- The old JWT session cannot count as a new OTP login. Missing signed
 -- session IDs fail closed rather than silently calling old tokens reauthorized.
 if v_old_session is null or v_session is null
    or v_old_session=v_session then
  return pg_catalog.jsonb_build_object('phase','reauth_required','id',v_release.release_id,
    'version',v_release.version,'title',v_release.title,
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
   'version',v_release.version,'title',v_release.title,
   'highlights',v_release.highlights,'roles',v_release.roles);
end;
$major_status$;
revoke all on function public.efg_major_release_status()
 from public,anon,authenticated;
grant execute on function public.efg_major_release_status() to authenticated;

create function public.efg_major_release_ack(
 p_release text,p_event_kind text,p_explicit_click boolean)
returns boolean language plpgsql security definer set search_path=''
as $major_ack$
declare
 v_uid uuid:=auth.uid();
 v_role text;
 v_session text:=auth.jwt()->>'session_id';
 v_manifest efg_private.major_release_manifests%rowtype;
 v_status jsonb;
begin
 if v_uid is null or p_explicit_click is distinct from true
   or p_release is null or p_event_kind not in
   ('announcement_preview_read','reauth_notice_acknowledged','whats_new_seen') then
  raise exception 'Explicit authenticated release action required'
   using errcode='42501';
 end if;
 select role into v_role from public.efg_profiles
 where user_id=v_uid and active;
 select * into v_manifest from efg_private.major_release_manifests
 where release_id=p_release and active and current_release
  and activated_at<=pg_catalog.now() and v_role=any(roles)
 for share;
 if not found then
  raise exception 'No approved current major release' using errcode='42501';
 end if;
 v_status:=public.efg_major_release_status();
 if v_status->>'phase' is distinct from
  (case p_event_kind
    when 'announcement_preview_read' then 'preview'
    when 'reauth_notice_acknowledged' then 'reauth_required'
    else 'live' end) then
  raise exception 'Current release state not eligible for this event'
   using errcode='42501';
 end if;
 if p_event_kind='reauth_notice_acknowledged'
  and (v_session is null or pg_catalog.length(v_session)<8) then
  raise exception 'Cannot verify the current signed session before reauth'
   using errcode='42501';
 end if;
 insert into efg_private.major_release_receipts(
  release_id,user_id,event_kind,signed_session_id)
 values(p_release,v_uid,p_event_kind,
  case when p_event_kind='reauth_notice_acknowledged' then v_session else null end)
 on conflict(release_id,user_id,event_kind) do nothing;
 return true;
end;
$major_ack$;
revoke all on function public.efg_major_release_ack(text,text,boolean)
 from public,anon,authenticated;
grant execute on function public.efg_major_release_ack(text,text,boolean)
 to authenticated;
comment on function public.efg_major_release_status() is
 'Server-owned major release banner per signed user. No active manifest = no notices. Reauth requires different signed session id and separate current legal receipts.';
comment on function public.efg_major_release_ack(text,text,boolean) is
 'Explicit acknowledgement only, NOT legal consent or logout. No browser write to private release tables.';
-- Intentionally NO manifest seeded; admins must approve/activate this one-time
-- exceptional relaunch. Ordinary updates never create an active manifest.
