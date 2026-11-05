-- Sharing restrictions is optional. Private/absent is UNKNOWN, never NONE.
create or replace function efg_private.guide_health_context(p_student uuid,p_org uuid,p_coach uuid,p_guide jsonb)
returns jsonb language plpgsql set search_path='' as $fn$
declare h efg_private.efg_coach_health_intakes%rowtype; source jsonb:=p_guide->'restrictionSource'; current_status text;
begin
 if auth.uid() is null or auth.uid() is distinct from p_coach or not efg_private.coach_has_student(p_student)
  or not exists(select 1 from public.efg_consents c where c.student_id=p_student and c.organization_id=p_org and c.accepted) then
  raise exception 'Unauthorized guide health scope' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('efg_health/'||p_student::text,0));
 select * into h from efg_private.efg_coach_health_intakes where student_id=p_student and organization_id=p_org for share;
 if not found or h.shared_at is null or h.consent_accepted_at is null then
  if source is not null and source<>'null'::jsonb then
   raise exception 'P28: guide health source changed; regenerate and review' using errcode='PT409'; end if;
  return jsonb_build_object('status','unknown');
 end if;
 perform 1 from efg_private.efg_coach_health_documents d where d.id=h.consent_document_id
  and d.status='published' and d.published_at<=now() and d.sha256=h.consent_sha256 for share;
 if not found then raise exception 'P28: health consent document changed' using errcode='PT409'; end if;
 if exists(select 1 from jsonb_each_text(h.conditions) e where e.value in ('confirmed','suspected')) then current_status:='declared';
 elsif h.conditions='{}'::jsonb and h.restriction_declaration->>'kind'='none_declared'
  and h.restriction_declaration->>'version'='1' and h.restriction_declaration->>'declared_by'=p_student::text
  and h.restriction_declaration->>'source_revision'=h.revision::text then current_status:='none_declared';
 else raise exception 'P28: empty health intake is not explicit none' using errcode='42501'; end if;
 if jsonb_typeof(source) is distinct from 'object' or source->>'studentId' is distinct from p_student::text
  or source->>'organizationId' is distinct from p_org::text or jsonb_typeof(source->'revision') is distinct from 'number'
  or source->>'revision' is distinct from h.revision::text or source->>'status' is distinct from current_status then
  raise exception 'P28: guide health source changed; regenerate and review' using errcode='PT409'; end if;
 return jsonb_build_object('status',current_status,'revision',h.revision);
end $fn$;
revoke all on function efg_private.guide_health_context(uuid,uuid,uuid,jsonb) from public,anon,authenticated;

create or replace function efg_private.p28_require_current_health_source()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.status<>'published' or old.status='published' then return new; end if;
 if not efg_private.p29_qa_scope_required(new.student_id,'coach') then
  if not exists(select 1 from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication' and enabled) then return new; end if;
 end if;
 perform efg_private.guide_health_context(new.student_id,new.organization_id,new.coach_id,new.guide_proposal);
 return new;
end $fn$;
