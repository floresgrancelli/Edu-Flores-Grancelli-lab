-- COACH121 UX35: bind the exceptional major reauth to a server-approved,
-- already published PWA build. No manifests activated or users signed out.
-- Consistency with the existing pure major-release-reauth-client.js contract.
do $p$ begin
 if pg_catalog.to_regclass('efg_private.major_release_manifests') is null
 or pg_catalog.to_regprocedure('public.efg_major_release_status()') is null
 then raise exception 'COACH121 requires COACH120'; end if;
 if exists(select 1 from efg_private.major_release_manifests where active)
 then raise exception 'COACH121 STOP: review active campaign before update'; end if;
end $p$;
alter table efg_private.major_release_manifests
 add column build text not null default 'unconfigured'
 constraint coach121_major_build_valid
 check(build='unconfigured' or build ~ '^[0-9A-Za-z._-]{6,80}$');
alter table efg_private.major_release_manifests
 add constraint coach121_no_unverified_live_build
 check(not active or build<>'unconfigured');

create or replace function public.efg_major_release_status()
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
 select signed_session_id into v_old_session
 from efg_private.major_release_receipts r
 where r.user_id=v_uid and r.release_id=v_release.release_id
   and r.event_kind='reauth_notice_acknowledged';
 -- The old JWT session cannot count as a new OTP login. Missing signed
 -- session IDs fail closed rather than silently calling old tokens reauthorized.
 if v_old_session is null or v_session is null
    or v_old_session=v_session then
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
 'Current major only. REAUTH requires signed published build; 2 current legal documents and changed JWT session id before WhatsNew. NO active campaign by default.';
