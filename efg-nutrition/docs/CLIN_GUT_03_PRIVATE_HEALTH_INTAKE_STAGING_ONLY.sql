-- CLIN-GUT-03 | ISOLATED STAGING ONLY. NEVER APPLY TO HOSTED PRODUCTION.
-- Private clinical declarations, distinct from general coach intake and legal docs.
-- Zero clinical consent documents are seeded here. No current document => no saves.
-- This is not a medical diagnosis or automatic permission to publish food guides.
begin;
do $safe$
begin
 if pg_catalog.current_database() not in ('postgres','efg_nut57_restored','efg_nut57_before','efg_nutrition_ephemeral')
 or pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null
 or (select count(*) from efg_private.nut57_isolated_staging_marker) <> 1 then
  raise exception 'CLIN-GUT-03 STOP: only isolated fixture database' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_profiles') is null
 or pg_catalog.to_regclass('public.efg_consents') is null
 or pg_catalog.to_regprocedure('efg_private.coach_has_student(uuid)') is null
 or pg_catalog.to_regprocedure('public.efg_legal_current_status()') is null then
  raise exception 'CLIN-GUT-03 STOP: missing exact Coach and legal prerequisites' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('efg_private.efg_coach_health_intakes') is not null
 or pg_catalog.to_regprocedure('public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)') is not null then
  raise exception 'CLIN-GUT-03 STOP: refuse overwrite' using errcode='55000';
 end if;
end $safe$;

create table efg_private.efg_coach_health_documents(
 id uuid primary key,
 version text not null unique check(version ~ '^[a-z0-9_]{5,80}$'),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 content_text text not null check(pg_catalog.char_length(content_text) between 100 and 12000),
 status text not null check(status in ('draft','published','retired')),
 published_at timestamptz,
 check(status <> 'published' or published_at is not null)
);
create unique index efg_health_current_doc_unique
 on efg_private.efg_coach_health_documents(status) where status='published';
revoke all on efg_private.efg_coach_health_documents from public, anon, authenticated;

create table efg_private.efg_coach_health_intakes(
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 consent_document_id uuid not null references efg_private.efg_coach_health_documents(id),
 consent_sha256 text not null check(consent_sha256 ~ '^[a-f0-9]{64}$'),
 consent_accepted_at timestamptz not null,
 revised_at timestamptz not null default pg_catalog.now(),
 revision integer not null check(revision between 1 and 100000),
 -- JSON object keys LIMITED below to lactose_intolerance and sibo, status of each.
 conditions jsonb not null check(pg_catalog.jsonb_typeof(conditions)='object'),
 sibo_phase text not null check(sibo_phase in ('none','short_trial','reintroduction','personalized')),
 shared_at timestamptz
);
create index efg_health_shared_coach_idx
 on efg_private.efg_coach_health_intakes(organization_id,shared_at) where shared_at is not null;
alter table efg_private.efg_coach_health_intakes enable row level security;
alter table efg_private.efg_coach_health_documents enable row level security;
revoke all on efg_private.efg_coach_health_intakes from public,anon,authenticated;
-- Do NOT grant schema USAGE or table privileges to browser roles.
-- No direct SQL API over private health rows. All access through narrow RPCs.

create function public.efg_current_coach_health_document()
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare v_doc record;
begin
 if (select auth.uid()) is null then
  raise exception 'Signed-in student required' using errcode='42501';
 end if;
 select id,version,sha256,content_text into v_doc
 from efg_private.efg_coach_health_documents
 where status='published' and published_at<=pg_catalog.now();
 if not found then return null; end if;
 return pg_catalog.jsonb_build_object('id',v_doc.id,'version',v_doc.version,
  'sha256',v_doc.sha256,'content',v_doc.content_text);
end $f$;
revoke all on function public.efg_current_coach_health_document() from public,anon,authenticated;
grant execute on function public.efg_current_coach_health_document() to authenticated;

create function public.efg_submit_coach_health_intake(
 p_conditions jsonb,p_document_id uuid,p_document_sha256 text,
 p_expected_revision integer,p_processing_consent boolean,p_share_with_coach boolean
) returns integer language plpgsql security definer set search_path=''
as $f$
declare
 v_uid uuid := (select auth.uid());
 v_org uuid;
 v_document record;
 v_key text;
 v_current integer;
 v_new integer;
 v_shared timestamptz;
 v_legal boolean;
 v_condition jsonb;
 v_phase text;
begin
 if v_uid is null or p_processing_consent is distinct from true or p_share_with_coach is null then
  raise exception 'Explicit health-data processing consent is required' using errcode='42501';
 end if;
 if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>99999
  or pg_catalog.jsonb_typeof(p_conditions) is distinct from 'object'
  or p_document_id is null or p_document_sha256 is null then
  raise exception 'Invalid private health intake request' using errcode='22023';
 end if;
 -- Only two reviewed condition code families; never accept arbitrary diagnoses or text.
 if pg_catalog.jsonb_object_length(p_conditions)>2 then
  raise exception 'Unexpected conditions' using errcode='22023';
 end if;
 for v_key in select pg_catalog.jsonb_object_keys(p_conditions) loop
  if v_key not in ('lactose_intolerance','sibo') or
   pg_catalog.jsonb_typeof(p_conditions->v_key) is distinct from 'string' or
   p_conditions->>v_key not in ('suspected','confirmed','not_reported') then
   raise exception 'Unsupported condition or status' using errcode='22023';
  end if;
 end loop;
 -- The client cannot imply clinical approval; SIBO phase is stored as 'none'
 -- until a distinct professionally-reviewed stage supports a supervised course.
 v_phase:='none';
 select p.organization_id into v_org from public.efg_profiles p
 where p.user_id=v_uid and p.role='student' and p.active and p.organization_id is not null;
 if v_org is null then
  raise exception 'Active Coach student identity required' using errcode='42501';
 end if;
 select count(*)=2 and coalesce(pg_catalog.bool_and(accepted),false) into v_legal
 from public.efg_legal_current_status();
 if not coalesce(v_legal,false) then
  raise exception 'Current terms and privacy must be explicitly accepted' using errcode='42501';
 end if;
 select id,sha256 into v_document from efg_private.efg_coach_health_documents
 where status='published' and published_at<=pg_catalog.now()
  and id=p_document_id and sha256=p_document_sha256;
 if not found then
  raise exception 'Current separate health consent document required' using errcode='42501';
 end if;
 if p_share_with_coach then
  if not exists(select 1 from public.efg_consents c where c.student_id=v_uid
    and c.organization_id=v_org and c.accepted=true) then
   raise exception 'Separate coach follow-up consent required' using errcode='42501';
  end if;
  v_shared:=pg_catalog.now();
 else v_shared:=null;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'efg_health/'||v_uid::text,0));
 select revision into v_current from efg_private.efg_coach_health_intakes
 where student_id=v_uid for update;
 if coalesce(v_current,0)<>p_expected_revision then
  raise exception 'Health data revision conflict' using errcode='PT409';
 end if;
 insert into efg_private.efg_coach_health_intakes(
 student_id,organization_id,consent_document_id,consent_sha256,
 consent_accepted_at,revised_at,revision,conditions,sibo_phase,shared_at)
 values(v_uid,v_org,v_document.id,v_document.sha256,
 pg_catalog.now(),pg_catalog.now(),p_expected_revision+1,p_conditions,v_phase,v_shared)
 on conflict(student_id) do update set
 organization_id=excluded.organization_id,
 consent_document_id=excluded.consent_document_id,
 consent_sha256=excluded.consent_sha256,
 consent_accepted_at=excluded.consent_accepted_at,
 revised_at=excluded.revised_at,revision=excluded.revision,
 conditions=excluded.conditions,sibo_phase=excluded.sibo_phase,shared_at=excluded.shared_at
 where efg_coach_health_intakes.revision=p_expected_revision
 returning revision into v_new;
 if v_new is null then
  raise exception 'Health data revision conflict' using errcode='PT409';
 end if;
 return v_new;
end $f$;
revoke all on function public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)
 to authenticated;

create function public.efg_get_coach_health_intake(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare v_uid uuid := (select auth.uid()); v_row record; v_owner boolean; v_coach boolean;
begin
 if v_uid is null or p_student is null then return null; end if;
 select h.student_id,h.organization_id,h.conditions,h.sibo_phase,
  h.consent_document_id,h.revision,h.shared_at,h.revised_at
 into v_row from efg_private.efg_coach_health_intakes h
 join public.efg_profiles p on p.user_id=h.student_id
  and p.organization_id=h.organization_id and p.active and p.role='student'
 where h.student_id=p_student;
 if not found then return null; end if;
 v_owner=(v_uid=p_student);
 -- Valid follow-up AND explicit independent health-data share must BOTH hold.
 v_coach=(v_row.shared_at is not null and
  efg_private.coach_has_student(p_student) and exists(
   select 1 from public.efg_consents c where c.student_id=p_student
   and c.organization_id=v_row.organization_id and c.accepted=true));
 if not v_owner and not v_coach then return null; end if;
 return pg_catalog.jsonb_build_object('student_id',v_row.student_id,
  'revision',v_row.revision,'conditions',v_row.conditions,
  'sibo_phase',v_row.sibo_phase,'shared_with_coach',v_row.shared_at is not null,
  'revised_at',v_row.revised_at,'document_id',v_row.consent_document_id);
end $f$;
revoke all on function public.efg_get_coach_health_intake(uuid) from public,anon,authenticated;
grant execute on function public.efg_get_coach_health_intake(uuid) to authenticated;

create function public.efg_revoke_coach_health_intake(p_expected_revision integer)
returns boolean language plpgsql security definer set search_path=''
as $f$
declare v_uid uuid := (select auth.uid()); v_deleted uuid;
begin
 if v_uid is null or p_expected_revision is null or p_expected_revision<1 then
  raise exception 'Authorized explicit revision required' using errcode='42501';
 end if;
 -- Erase clinical conditions and share privilege together. No residual diagnoses
 -- in client-accessible audit history, daily logs or general-intake notes.
 delete from efg_private.efg_coach_health_intakes
 where student_id=v_uid and revision=p_expected_revision
 returning student_id into v_deleted;
 if v_deleted is null then
  raise exception 'Health data revision conflict' using errcode='PT409';
 end if;
 return true;
end $f$;
revoke all on function public.efg_revoke_coach_health_intake(integer) from public,anon,authenticated;
grant execute on function public.efg_revoke_coach_health_intake(integer) to authenticated;
commit;
-- A local synthetic document may be added ONLY by an isolated test using postgres.
-- No production health consent text is approved or seeded by this script.
