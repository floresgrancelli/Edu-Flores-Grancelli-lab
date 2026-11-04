CREATE OR REPLACE FUNCTION public.efg_major_release_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 -- The old JWT can be renewed without an OTP and B's existing
 -- session must not inherit A's new-login receipt. Compare each session's
 -- REAL creation time with the timestamp of the MAJOR reauth cutover.
 if v_session is not null and v_session ~*
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  v_session_uuid:=v_session::uuid;
 end if;
 if v_session_uuid is not null then
  select s.created_at into v_session_started_at from auth.sessions s
  where s.id=v_session_uuid and s.user_id=v_uid;
 end if;
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
$function$
