-- V5 opt-in overlay ONLY after the existing clinical bootstrap in disposable local QA.
-- No grants, new tables, documents, users or production authorization.
begin;
do $guard$
begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null then
  raise exception 'V5 STOP: isolated marker required';
 end if;
 if (select count(*) from efg_private.nut57_isolated_staging_marker)<>1 then
  raise exception 'V5 STOP: isolated marker invalid';
 end if;
 if pg_catalog.to_regprocedure('public.efg_get_coach_health_intake(uuid)') is null
  or pg_catalog.to_regclass('efg_private.efg_coach_health_intakes') is null then
  raise exception 'V5 STOP: original clinical bootstrap required';
 end if;
 if exists(select 1 from efg_private.efg_coach_health_intakes)
  or exists(select 1 from efg_private.efg_coach_health_documents)
  or exists(select 1 from efg_private.efg_coach_health_revocations) then
  raise exception 'V5 STOP: clinical tables must be empty before synthetic test';
 end if;
end $guard$;
create or replace function public.efg_get_coach_health_intake(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare v_uid uuid := (select auth.uid()); v_row record; v_owner boolean; v_coach boolean;
 v_rev integer; v_followup boolean;
begin
 if v_uid is null or p_student is null then return null; end if;
 select h.student_id,h.organization_id,h.conditions,h.sibo_phase,
  h.consent_document_id,h.consent_accepted_at,h.revision,h.shared_at,h.revised_at
 into v_row from efg_private.efg_coach_health_intakes h
 join public.efg_profiles p on p.user_id=h.student_id
  and p.organization_id=h.organization_id and p.active and p.role='student'
 where h.student_id=p_student;
 if not found then
  -- After deletion the student sees ONLY a nonclinical revision marker to
  -- consent again safely; no coach or foreign student can see this marker.
  if v_uid=p_student then
   select last_revision into v_rev from efg_private.efg_coach_health_revocations
    where student_id=v_uid;
   if v_rev is not null then
    return pg_catalog.jsonb_build_object('revision',v_rev,'revoked',true,'conditions','{}'::jsonb);
   end if;
  end if;
  return null;
 end if;
 v_owner=(v_uid=p_student);
 -- Valid follow-up AND explicit independent health-data share must BOTH hold.
 v_followup=exists(select 1 from public.efg_consents c where c.student_id=p_student
  and c.organization_id=v_row.organization_id and c.accepted=true);
 v_coach=(v_row.shared_at is not null and
  efg_private.coach_has_student(p_student) and v_followup);
 if not v_owner and not v_coach then return null; end if;
 return pg_catalog.jsonb_build_object('student_id',v_row.student_id,
  'organization_id',v_row.organization_id,'viewer_id',v_uid,
  'processing_consent',v_row.consent_accepted_at is not null,
  'followup_consent',v_followup,
  'revision',v_row.revision,'conditions',v_row.conditions,
  'sibo_phase',v_row.sibo_phase,'shared_with_coach',v_row.shared_at is not null,
  'revised_at',v_row.revised_at,'document_id',v_row.consent_document_id);
end $f$;
commit;
