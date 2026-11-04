-- P28: isolated rehearsal only. No hosted installation/flag activation authorized.
-- Additive final transactional guard: any refusal rolls back goal, guide,
-- access, history, receipt and notification already written by the atomic RPC.
begin;
do $guard$
begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null then
  raise exception 'P28 STOP: isolated marker required';
 end if;
 if (select count(*) from efg_private.nut57_isolated_staging_marker)<>1 then
  raise exception 'P28 STOP: invalid isolated marker';
 end if;
 if pg_catalog.to_regclass('efg_private.efg_coach_health_intakes') is null
  or pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null then
  raise exception 'P28 STOP: private health and atomic backend required';
 end if;
end $guard$;
insert into efg_private.coach_release_switches(switch_key,enabled,notes)
 values('pilot_health_bound_publication',false,'P28: requires validated health backend and new owner GO');
create function efg_private.p28_require_current_health_source()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare h efg_private.efg_coach_health_intakes%rowtype; source jsonb; current_status text;
begin
 if new.status<>'published' or old.status='published' then return new; end if;
 if not exists(select 1 from efg_private.coach_release_switches
  where switch_key='pilot_health_bound_publication' and enabled) then return new; end if;
 -- Same lock as submit/revoke: concurrent health edits serialize with publish.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('efg_health/'||new.student_id::text,0));
 select * into h from efg_private.efg_coach_health_intakes
  where student_id=new.student_id and organization_id=new.organization_id for share;
 if not found or h.shared_at is null or h.consent_accepted_at is null
  or auth.uid() is distinct from new.coach_id
  or not efg_private.coach_has_student(new.student_id)
  or not exists(select 1 from public.efg_consents c where c.student_id=new.student_id
    and c.organization_id=new.organization_id and c.accepted)
 then raise exception 'P28: current shared health declaration required' using errcode='42501'; end if;
 -- A retired/replaced consent document cannot authorize a new publication.
 perform 1 from efg_private.efg_coach_health_documents d where d.id=h.consent_document_id
  and d.status='published' and d.published_at<=pg_catalog.now() and d.sha256=h.consent_sha256 for share;
 if not found then raise exception 'P28: health consent document changed' using errcode='PT409'; end if;
 if exists(select 1 from pg_catalog.jsonb_each_text(h.conditions) e where e.value in ('confirmed','suspected')) then
  current_status:='declared';
 elsif h.conditions='{}'::jsonb and h.restriction_declaration->>'kind'='none_declared'
  and h.restriction_declaration->>'version'='1'
  and h.restriction_declaration->>'declared_by'=new.student_id::text
  and h.restriction_declaration->>'source_revision'=h.revision::text then
  current_status:='none_declared';
 else raise exception 'P28: empty health intake is not explicit none' using errcode='42501'; end if;
 source:=new.guide_proposal->'restrictionSource';
 if pg_catalog.jsonb_typeof(source) is distinct from 'object'
  or source->>'studentId' is distinct from new.student_id::text
  or source->>'organizationId' is distinct from new.organization_id::text
  or pg_catalog.jsonb_typeof(source->'revision') is distinct from 'number'
  or source->>'revision' is distinct from h.revision::text
  or source->>'status' is distinct from current_status then
  raise exception 'P28: guide health source changed; regenerate and review' using errcode='PT409';
 end if;
 return new;
end $fn$;
revoke all on function efg_private.p28_require_current_health_source() from public,anon,authenticated;
create trigger p28_health_source_before_publication before update of status
 on public.efg_coach_plan_drafts for each row execute function efg_private.p28_require_current_health_source();
commit;
