-- P28F prepared additive installation. Requires owner authorization for hosted execution.
-- No documents, identities, historical changes or enabled flags. One transaction.
-- Project intended: cyjvddhimbsfipjfctsl; operator must verify tool project_id.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $p28_preflight$
declare failures text;
begin
 select string_agg(check_id,', ') into failures from (select check_id,passed from (values
 ('public.efg_profiles.user_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_profiles') and a.attname='user_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_profiles.organization_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_profiles') and a.attname='organization_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_profiles.role',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_profiles') and a.attname='role' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='text'))),
 ('public.efg_profiles.active',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_profiles') and a.attname='active' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='boolean'))),
 ('public.efg_organizations.id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_organizations') and a.attname='id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_consents.student_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_consents') and a.attname='student_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_consents.organization_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_consents') and a.attname='organization_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_consents.accepted',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_consents') and a.attname='accepted' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='boolean'))),
 ('public.efg_coach_plan_drafts.student_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and a.attname='student_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_coach_plan_drafts.organization_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and a.attname='organization_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_coach_plan_drafts.coach_id',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and a.attname='coach_id' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='uuid'))),
 ('public.efg_coach_plan_drafts.guide_proposal',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and a.attname='guide_proposal' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='jsonb'))),
 ('public.efg_coach_plan_drafts.status',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and a.attname='status' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='text'))),
 ('efg_private.coach_release_switches.switch_key',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('efg_private.coach_release_switches') and a.attname='switch_key' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='text'))),
 ('efg_private.coach_release_switches.enabled',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('efg_private.coach_release_switches') and a.attname='enabled' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='boolean'))),
 ('efg_private.coach_release_switches.notes',(exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('efg_private.coach_release_switches') and a.attname='notes' and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)='text'))),
 ('auth.uid()',(exists(select 1 from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('auth.uid()') and pg_catalog.pg_get_function_result(p.oid)='uuid'))),
 ('efg_private.coach_has_student(uuid)',(exists(select 1 from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('efg_private.coach_has_student(uuid)') and pg_catalog.pg_get_function_result(p.oid)='boolean'))),
 ('public.efg_legal_current_status()',(exists(select 1 from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('public.efg_legal_current_status()') and pg_catalog.pg_get_function_result(p.oid)='TABLE(kind text, document_id uuid, version text, sha256 text, accepted boolean)'))),
 ('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)',(exists(select 1 from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') and pg_catalog.pg_get_function_result(p.oid)='uuid'))),
 ('absent efg_private.efg_coach_health_documents',(pg_catalog.to_regclass('efg_private.efg_coach_health_documents') is null)),
 ('absent efg_private.efg_coach_health_intakes',(pg_catalog.to_regclass('efg_private.efg_coach_health_intakes') is null)),
 ('absent efg_private.efg_coach_health_revocations',(pg_catalog.to_regclass('efg_private.efg_coach_health_revocations') is null)),
 ('absent public.efg_current_coach_health_document()',(pg_catalog.to_regprocedure('public.efg_current_coach_health_document()') is null)),
 ('absent public.efg_get_coach_health_intake(uuid)',(pg_catalog.to_regprocedure('public.efg_get_coach_health_intake(uuid)') is null)),
 ('absent public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)',(pg_catalog.to_regprocedure('public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)') is null)),
 ('absent public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)',(pg_catalog.to_regprocedure('public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)') is null)),
 ('absent public.efg_revoke_coach_health_intake(integer)',(pg_catalog.to_regprocedure('public.efg_revoke_coach_health_intake(integer)') is null)),
 ('absent efg_private.p28_require_current_health_source()',(pg_catalog.to_regprocedure('efg_private.p28_require_current_health_source()') is null)),
 ('no draft trigger',(not exists(select 1 from pg_catalog.pg_trigger where tgrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and not tgisinternal))),
 ('switch insert defaults',(not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('efg_private.coach_release_switches') and a.attnum>0 and not a.attisdropped and a.attnotnull and a.attname not in ('switch_key','enabled','notes') and not a.atthasdef and a.attidentity='' and a.attgenerated=''))),
 ('release switches OFF',(not exists(select 1 from efg_private.coach_release_switches where enabled is distinct from false))),
 ('publication switch exists',(exists(select 1 from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication' and enabled=false))),
 ('new health switch absent',(not exists(select 1 from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication')))
) as checks(check_id,passed) order by check_id) c where passed is distinct from true;
 if failures is not null then raise exception 'P28 INSTALL STOP: %',failures using errcode='55000'; end if;
end $p28_preflight$;
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
 -- JSON object keys limited to the eight optional self-reported condition codes below.
 conditions jsonb not null check(pg_catalog.jsonb_typeof(conditions)='object'),
 -- Explicit owner declaration; empty conditions alone remain unknown.
 restriction_declaration jsonb,
 constraint efg_health_explicit_none_signed check(
  restriction_declaration is null or (
   pg_catalog.jsonb_typeof(restriction_declaration)='object'
   and restriction_declaration->>'kind'='none_declared'
   and restriction_declaration->>'version'='1'
   and restriction_declaration->>'declared_by'=student_id::text
   and restriction_declaration->>'source_revision'=revision::text
   and conditions='{}'::jsonb
  )
 ),
 sibo_phase text not null check(sibo_phase in ('none','short_trial','reintroduction','personalized')),
 shared_at timestamptz
);
create index efg_health_shared_coach_idx
 on efg_private.efg_coach_health_intakes(organization_id,shared_at) where shared_at is not null;
-- Nonclinical anti-replay marker; no diagnoses, sharing status, or document text.
-- A revocation must not allow an old in-flight request to recreate sensitive data.
create table efg_private.efg_coach_health_revocations(
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 last_revision integer not null check(last_revision between 1 and 100000),
 revoked_at timestamptz not null default pg_catalog.now()
);
alter table efg_private.efg_coach_health_revocations enable row level security;
revoke all on efg_private.efg_coach_health_revocations from public,anon,authenticated;
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
 -- Only the eight optional declaration codes; never accept arbitrary diagnoses or text.
 if (select count(*) from pg_catalog.jsonb_object_keys(p_conditions))>8 then
  raise exception 'Unexpected conditions' using errcode='22023';
 end if;
 for v_key in select pg_catalog.jsonb_object_keys(p_conditions) loop
  if v_key not in ('lactose_intolerance','sibo','diabetes','celiac',
   'food_allergy','hypertension','dyslipidemia','fatty_liver') or
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
 if v_current is null then
  select last_revision into v_current from efg_private.efg_coach_health_revocations
   where student_id=v_uid for update;
 end if;
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
 conditions=excluded.conditions,restriction_declaration=null,
 sibo_phase=excluded.sibo_phase,shared_at=excluded.shared_at
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

-- Empty conditions do NOT mean "none". Save a separately confirmed owner-
-- signed negative statement with the same transaction and CAS revision as the
-- private health intake. No real documents or accounts are seeded by this SQL.
create function public.efg_declare_no_restrictions(
 p_document uuid,p_sha256 text,p_expected_revision integer,
 p_processing_consent boolean,p_share_with_coach boolean
) returns integer language plpgsql security definer set search_path=''
as $none$
declare v_uid uuid := (select auth.uid()); v_next integer; v_written integer;
begin
 if v_uid is null or p_processing_consent is distinct from true
  or p_share_with_coach is null then
  raise exception 'Explicit health processing and coach-sharing choice required'
   using errcode='42501';
 end if;
 -- Delegate legal-doc, health-doc, profile/org, consent, and revision checks.
 v_next:=public.efg_submit_coach_health_intake(
  '{}'::jsonb,p_document,p_sha256,p_expected_revision,
  p_processing_consent,p_share_with_coach);
 update efg_private.efg_coach_health_intakes h
 set restriction_declaration=pg_catalog.jsonb_build_object(
  'kind','none_declared','version',1,
  'declared_by',v_uid,'source_revision',v_next,
  'confirmed_at',pg_catalog.clock_timestamp()
 )
 where h.student_id=v_uid and h.revision=v_next and h.conditions='{}'::jsonb
 returning h.revision into v_written;
 if v_written is distinct from v_next then
  raise exception 'Explicit negative declaration was not saved'
   using errcode='PT409';
 end if;
 return v_written;
end $none$;
revoke all on function public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)
 to authenticated;

create function public.efg_get_coach_health_intake(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare v_uid uuid := (select auth.uid()); v_row record; v_owner boolean; v_coach boolean;
 v_rev integer; v_followup boolean;
begin
 if v_uid is null or p_student is null then return null; end if;
 select h.student_id,h.organization_id,h.conditions,h.restriction_declaration,h.sibo_phase,
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
 -- A separate follow-up grant is not inferred from general legal acceptance.
 v_followup=exists(select 1 from public.efg_consents c
   where c.student_id=p_student and c.organization_id=v_row.organization_id
   and c.accepted=true);
 -- A coach may read ONLY after both the independent health share and follow-up.
 v_coach=(v_row.shared_at is not null and
  efg_private.coach_has_student(p_student) and v_followup);
 if not v_owner and not v_coach then return null; end if;
 -- Bind the response to the CURRENT signed viewer/organization. The Coach
 -- UI fails closed if any field is missing or a session changes mid-read.
 return pg_catalog.jsonb_build_object('student_id',v_row.student_id,
  'organization_id',v_row.organization_id,'viewer_id',v_uid,
  'processing_consent',v_row.consent_accepted_at is not null,
  'followup_consent',v_followup,
  'revision',v_row.revision,'conditions',v_row.conditions,
  'restriction_declaration',v_row.restriction_declaration,
  'sibo_phase',v_row.sibo_phase,'shared_with_coach',v_row.shared_at is not null,
  'revised_at',v_row.revised_at,'document_id',v_row.consent_document_id);
end $f$;
revoke all on function public.efg_get_coach_health_intake(uuid) from public,anon,authenticated;
grant execute on function public.efg_get_coach_health_intake(uuid) to authenticated;

create function public.efg_revoke_coach_health_intake(p_expected_revision integer)
returns boolean language plpgsql security definer set search_path=''
as $f$
declare v_uid uuid := (select auth.uid()); v_deleted uuid; v_current integer;
begin
 if v_uid is null or p_expected_revision is null or p_expected_revision<1 then
  raise exception 'Authorized explicit revision required' using errcode='42501';
 end if;
 -- Erase clinical conditions and share privilege together. No residual diagnoses
 -- in client-accessible audit history, daily logs or general-intake notes.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'efg_health/'||v_uid::text,0));
 select revision into v_current from efg_private.efg_coach_health_intakes
  where student_id=v_uid for update;
 if v_current is distinct from p_expected_revision then
  raise exception 'Health data revision conflict' using errcode='PT409';
 end if;
 delete from efg_private.efg_coach_health_intakes
 where student_id=v_uid and revision=p_expected_revision
 returning student_id into v_deleted;
 if v_deleted is null then
  raise exception 'Health data revision conflict' using errcode='PT409';
 end if;
 -- Keep only a revision counter; eliminates replay of older consent requests.
 insert into efg_private.efg_coach_health_revocations(student_id,last_revision,revoked_at)
 values(v_uid,p_expected_revision+1,pg_catalog.now())
 on conflict(student_id) do update set
 last_revision=excluded.last_revision,revoked_at=excluded.revoked_at;
 return true;
end $f$;
revoke all on function public.efg_revoke_coach_health_intake(integer) from public,anon,authenticated;
grant execute on function public.efg_revoke_coach_health_intake(integer) to authenticated;
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
-- Enforce safe initial state before committing the additive installation.
do $p28_post$
begin
 if exists(select 1 from efg_private.efg_coach_health_documents)
 or exists(select 1 from efg_private.efg_coach_health_intakes)
 or exists(select 1 from efg_private.efg_coach_health_revocations)
 or (select enabled from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication') is distinct from false then
  raise exception 'P28 INSTALL STOP: initial state not empty and OFF';
 end if;
end $p28_post$;
notify pgrst, 'reload schema';
commit;
