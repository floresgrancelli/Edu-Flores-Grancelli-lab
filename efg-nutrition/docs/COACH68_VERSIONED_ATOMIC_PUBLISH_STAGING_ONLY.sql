-- COACH68 VERSION-AWARE CANDIDATE. ISOLATED STAGING ONLY. NO HOSTED DB.
-- Do not activate: legal/clinical approval, full JWT and PITR still required.
-- EFG Nutrition Pro · STAGING-ONLY transaction design · 29 Oct 2026.
-- NOT a deployed migration; DO NOT EXECUTE ON PRODUCTION.
-- PRE-REQUISITES: reviewed intake/access SQL + draft SQL + legal versioned
-- acceptances + server-owned food/medical policy validation function.
-- This script FAILS before any schema change unless every dependency exists.
-- RUN ONLY on a disposable/restorable staging with real JWT coach A/B tests.
begin;
do $coach68_isolation$ begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null
 or pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is null then
 raise exception 'COACH68 STOP: marker or versioned intake missing in isolated stage' using errcode='55000'; end if;
end $coach68_isolation$;
do $efg_preflight$
begin
  if pg_catalog.to_regclass('public.efg_coach_plan_drafts') is null
    or pg_catalog.to_regclass('public.efg_student_plan_access') is null
    or pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is null
    or pg_catalog.to_regclass('public.efg_legal_acceptances') is null
    or pg_catalog.to_regclass('public.efg_notifications') is null
    or pg_catalog.to_regclass('public.efg_goals') is null
    or pg_catalog.to_regclass('public.efg_food_plans') is null
    or pg_catalog.to_regprocedure(
      'efg_private.coach_publication_policy_valid(uuid,jsonb,jsonb,uuid)'
    ) is null then
    raise exception 'NOT READY: missing staging schema, versioned legal consent or server-owned food/medical validator'
      using errcode='55000';
  end if;
  -- The two pre-existing production notification triggers MUST first be made
  -- compatible or a single atomic publish generates three notices.
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid='public.efg_goals'::regclass
      and t.tgname='trg_efg_notify_goal' and t.tgenabled='O'
      and pg_catalog.strpos(pg_catalog.pg_get_triggerdef(t.oid,true),'efg.coach_atomic_publish')>0
  ) or not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid='public.efg_food_plans'::regclass
      and t.tgname='trg_efg_notify_food_guide' and t.tgenabled='O'
      and pg_catalog.strpos(pg_catalog.pg_get_triggerdef(t.oid,true),'efg.coach_atomic_publish')>0
  ) then
    raise exception 'NOT READY: NUT56 legacy notification trigger compatibility is required'
      using errcode='55000';
  end if;
end $efg_preflight$;

-- A durable receipt makes retries idempotent even after a coach starts a
-- new revision. A student cannot read receipts. Unique revision blocks re-use.
create table public.efg_coach_plan_publish_receipts (
  request_id uuid primary key,
  student_id uuid not null references public.efg_profiles(user_id) on delete cascade,
  organization_id uuid not null references public.efg_organizations(id),
  coach_id uuid not null references auth.users(id),
  draft_revision bigint not null check (draft_revision>0),
  goal_id uuid not null references public.efg_goals(id),
  published_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique(student_id,draft_revision)
);
create index efg_coach_receipts_student_idx on public.efg_coach_plan_publish_receipts(student_id,published_at desc);
alter table public.efg_coach_plan_publish_receipts enable row level security;
revoke all on public.efg_coach_plan_publish_receipts from public,anon,authenticated;
-- Recipients never access receipts directly: use the RPC return value only.

-- IMPORTANT: revoke the old RPC that published a previously inserted goal:
-- clients must not be allowed to bypass atomic publication.
revoke execute on function public.efg_publish_coach_plan(uuid,uuid)
  from public,anon,authenticated;
-- The table-level client writes could also publish prematurely. This MUST be
-- exercised with genuine JWT in staging; existing Coach editing paths will
-- be unavailable until the new UI uses draft-save + this RPC.
revoke insert,update,delete on public.efg_goals from public,anon,authenticated;
revoke insert,update,delete on public.efg_food_plans from public,anon,authenticated;

create function public.efg_publish_coach_plan_draft(
  p_student uuid,
  p_expected_revision bigint,
  p_request_id uuid
) returns uuid
language plpgsql
security definer
set search_path=''
as $efg_publish$
declare
  v_coach uuid := auth.uid();
  v_org uuid;
  v_intake_updated timestamptz;
  v_intake_revision integer;
  v_draft public.efg_coach_plan_drafts%rowtype;
  v_goal jsonb;
  v_guide jsonb;
  v_existing_goal uuid;
  v_existing_student uuid;
  v_existing_coach uuid;
  v_existing_revision bigint;
  v_food_ids text[];
  v_slots int;
  v_distinct_slots int;
  v_bad_slots int;
  v_goal_id uuid;
  v_key text;
  v_value numeric;
begin
  if v_coach is null or p_student is null or p_request_id is null
    or p_expected_revision is null or p_expected_revision<1
    or not efg_private.coach_has_student(p_student) then
    raise exception 'Not authorized to publish this student plan'
      using errcode='42501';
  end if;

  -- This lock serializes publication for the same student across tabs/devices.
  select access.organization_id into v_org
  from public.efg_student_plan_access access
  join public.efg_profiles student on student.user_id=access.student_id
  join public.efg_organizations org on org.id=student.organization_id
  where access.student_id=p_student and access.coach_id=v_coach
    and access.organization_id=student.organization_id
    and student.role='student' and student.active
    and org.coach_id=v_coach
  for update of access;
  if not found then
    raise exception 'Missing or unauthorized student plan access row'
      using errcode='42501';
  end if;

  -- Lock consent for duration of approval. Revocation afterward must wait.
  perform 1 from public.efg_consents consent
  where consent.student_id=p_student and consent.organization_id=v_org
    and consent.accepted
  for share;
  if not found then
    raise exception 'Coach follow-up consent missing or revoked'
      using errcode='42501';
  end if;

  -- Lock current intake and assert permission/organization. Student-owned
  -- updated_at is overwritten by a server trigger in the preceding draft SQL.
  select intake.updated_at,intake.revision into v_intake_updated,v_intake_revision
  from public.efg_coach_relaunch_intakes intake
  where intake.student_id=p_student
    and intake.organization_id=v_org
    and intake.completed_version='coach_major_2026_r1'
    and intake.shared_at is not null
  for update;
  if not found then
    raise exception 'Intake not shared with this coach'
      using errcode='42501';
  end if;

  -- Idempotent same-key retries return the same goal, without notifying twice.
  -- A key may never be reused for a different student/revision/coach.
  select receipt.goal_id,receipt.student_id,receipt.coach_id,receipt.draft_revision
  into v_existing_goal,v_existing_student,v_existing_coach,v_existing_revision
  from public.efg_coach_plan_publish_receipts receipt
  where receipt.request_id=p_request_id;
  if found then
    if v_existing_student is distinct from p_student
       or v_existing_coach is distinct from v_coach
       or v_existing_revision is distinct from p_expected_revision then
      raise exception 'Publication request identifier already used'
        using errcode='23505';
    end if;
    return v_existing_goal;
  end if;

  select draft.* into v_draft
  from public.efg_coach_plan_drafts draft
  where draft.student_id=p_student and draft.organization_id=v_org
    and draft.coach_id=v_coach
  for update;
  if not found or v_draft.draft_revision is distinct from p_expected_revision
    or v_draft.status is distinct from 'draft'
    or v_draft.source_intake_updated_at is distinct from v_intake_updated
    or v_draft.source_intake_revision is distinct from v_intake_revision then
    raise exception 'Draft is missing, changed, already published or based on an old intake'
      using errcode='PT409';
  end if;

  v_goal := v_draft.goal_proposal;
  v_guide := v_draft.guide_proposal;
  if pg_catalog.jsonb_typeof(v_goal) is distinct from 'object'
    or (v_goal->>'goal_type') not in ('fat_loss','recomp','muscle_gain','maintenance')
    or pg_catalog.jsonb_typeof(v_guide) is distinct from 'object'
    or v_guide->>'kind' is distinct from 'five_meal_example'
    or v_guide->>'version' is distinct from '1'
    or pg_catalog.jsonb_typeof(v_guide->'meals') is distinct from 'array' then
    raise exception 'Incomplete goal or invalid five-meal guide';
  end if;

  -- Never trust browser-supplied macros without strict server-side bounds.
  foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
    if pg_catalog.jsonb_typeof(v_goal->v_key) is distinct from 'number' then
      raise exception 'Missing numeric goal field: %',v_key;
    end if;
    v_value := (v_goal->>v_key)::numeric;
    if v_value != pg_catalog.trunc(v_value)
      or v_value<(case when v_key='kcal' then 1200 else 0 end)
      or v_value>(case v_key
        when 'kcal' then 10000 when 'carb_g' then 2000
        when 'fiber_g' then 150 else 1000 end) then
      raise exception 'Goal field invalid or out of range: %',v_key;
    end if;
  end loop;

  select count(*),count(distinct m.meal->>'slot'),
    count(*) filter(where m.meal->>'slot' not in
      ('desayuno','media_manana','almuerzo','merienda','cena'))
    into v_slots,v_distinct_slots,v_bad_slots
  from pg_catalog.jsonb_array_elements(v_guide->'meals') as m(meal);
  if v_slots<>5 or v_distinct_slots<>5 or v_bad_slots<>0 then
    raise exception 'Five distinct supported meal slots required';
  end if;

  -- This separate, reviewed, NON-BROWSER validator MUST compare every item
  -- ID, quantity and nutrients against a server-owned food source, apply
  -- dietary restrictions/uncertainty, and confirm current versioned legal
  -- acceptance plus permitted pattern. No permissive placeholder is created.
  -- Without that validator this file cannot even pass preflight above.
  if efg_private.coach_publication_policy_valid(
    p_student,v_goal,v_guide,v_coach) is distinct from true then
    raise exception 'Food evidence, dietary restrictions or legal acceptance not satisfied'
      using errcode='42501';
  end if;

  select pg_catalog.array_agg(distinct i.item->>'id')
  into v_food_ids
  from pg_catalog.jsonb_array_elements(v_guide->'meals') as m(meal)
  cross join lateral pg_catalog.jsonb_array_elements(m.meal->'items') as i(item);
  if v_food_ids is null or pg_catalog.cardinality(v_food_ids) not between 1 and 300
    or pg_catalog.array_position(v_food_ids,null) is not null then
    raise exception 'Food list invalid';
  end if;

  -- The existing production goal/guide triggers would each create a notice.
  -- NUT-56 STAGING companion updates their WHEN conditions so ONLY this
  -- explicitly unified publication notice is emitted by this transaction.
  -- Transaction-local setting; NOT authorization. Legacy operations outside
  -- this RPC still create their existing notifications.
  perform pg_catalog.set_config('efg.coach_atomic_publish','on',true);

  -- All writes below occur in ONE PostgreSQL function invocation/transaction.
  -- An exception at any step rolls back goal, guide, access, notification
  -- and receipt. The goal appears latest only when the entire call commits.
  insert into public.efg_goals(
    student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g,
    start_on,approved_at
  ) values (
    p_student,v_coach,v_goal->>'goal_type',
    (v_goal->>'kcal')::integer,(v_goal->>'protein_g')::integer,
    (v_goal->>'carb_g')::integer,(v_goal->>'fat_g')::integer,
    (v_goal->>'fiber_g')::integer,
    (now() at time zone 'America/Argentina/Buenos_Aires')::date,
    pg_catalog.clock_timestamp()
  ) returning id into v_goal_id;

  insert into public.efg_food_plans(
    student_id,coach_id,approved_food_ids,updated_at,
    guided_plan,guided_goal_id,guided_plan_approved_at
  ) values (
    p_student,v_coach,v_food_ids,pg_catalog.clock_timestamp(),
    v_guide,v_goal_id,pg_catalog.clock_timestamp()
  )
  on conflict(student_id) do update
  set coach_id=excluded.coach_id,
      approved_food_ids=excluded.approved_food_ids,
      guided_plan=excluded.guided_plan,
      guided_goal_id=excluded.guided_goal_id,
      guided_plan_approved_at=excluded.guided_plan_approved_at,
      updated_at=excluded.updated_at;

  update public.efg_student_plan_access
  set status='published',published_goal_id=v_goal_id,
    published_at=pg_catalog.clock_timestamp(),published_by=v_coach,
    updated_at=pg_catalog.clock_timestamp()
  where student_id=p_student and organization_id=v_org and coach_id=v_coach;
  if not found then raise exception 'Plan access record unexpectedly changed'; end if;

  insert into public.efg_notifications(
    recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student
  ) values(
    p_student,v_coach,'plan_update','coach_plan_'||v_goal_id::text,
    'Tu guía está lista','Tu coach aprobó tu nueva guía de alimentación.','home',p_student
  ) on conflict(recipient_id,event_key) do nothing;

  insert into public.efg_coach_plan_publish_receipts(
    request_id,student_id,organization_id,coach_id,draft_revision,goal_id
  ) values(p_request_id,p_student,v_org,v_coach,p_expected_revision,v_goal_id);

  update public.efg_coach_plan_drafts
  set status='published',updated_at=pg_catalog.clock_timestamp()
  where student_id=p_student and organization_id=v_org
    and coach_id=v_coach and draft_revision=p_expected_revision
    and status='draft';
  if not found then raise exception 'Draft state changed before commit'; end if;

  return v_goal_id;
end;
$efg_publish$;

revoke all on function public.efg_publish_coach_plan_draft(uuid,bigint,uuid)
  from public,anon,authenticated;
grant execute on function public.efg_publish_coach_plan_draft(uuid,bigint,uuid)
  to authenticated;
commit;

-- REQUIRED BEFORE ANY DEPLOY:
-- 1. Implement AND INDEPENDENTLY AUDIT the referenced
--    efg_private.coach_publication_policy_valid(uuid,jsonb,jsonb,uuid).
--    It must NOT be a permissive stub. Validate labelling/source and health
--    compatibility from server-owned evidence, legal acceptance, permissions.
-- 2. Run a REAL PostgreSQL parse/schema application on disposable staging.
-- 3. JWT A/B organizations, student, unauthorized coach, revoked consent,
--    intake edits, concurrent revisions, duplicate/reused keys and rollback.
-- 4. Validate guide-update approval trigger compatibility in staging.
-- 5. Review old clients and move all manual goal/guide edits to the new
--    draft flow. Direct client INSERT/UPDATE/DELETE deliberately revoked.
-- 6. Confirm no external notifications are delivered from staging.
-- 7. Confirm restore/backup, clinical+legal review and owner GO. NO GO today.
