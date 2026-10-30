-- COACH119 CANDIDATE ONLY: ATOMIC publication for Nutrition Coach.
-- DO NOT APPLY TO HOSTED DATABASE UNTIL tested against an isolated,
-- restorable staging copy with genuine signed JWT for TWO organizations,
-- health-data consent/privacy and an approved legal+food evidence corpus.
-- Does not revoke legacy goal/guide DML until the planned cutover.
-- Release switch defaults FALSE even when this script is eventually applied.
begin;
do $coach119_preflight$
begin
 if pg_catalog.to_regclass('efg_private.coach_release_switches') is null
  or pg_catalog.to_regclass('efg_private.coach_reviewed_foods') is null
  or pg_catalog.to_regclass('public.efg_legal_documents') is null
  or pg_catalog.to_regclass('public.efg_legal_acceptances') is null
  or pg_catalog.to_regclass('public.efg_coach_plan_drafts') is null
  or pg_catalog.to_regclass('public.efg_student_plan_access') is null
  or pg_catalog.to_regprocedure('efg_private.coach_guide_foods_verified(jsonb)') is null
  or pg_catalog.to_regprocedure('efg_private.coach_has_student(uuid)') is null
  or pg_catalog.to_regprocedure('public.efg_coach_pilot_entry_status()') is null then
  raise exception 'COACH119 STOP: hosted Coach prerequisites missing' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_coach_plan_publish_receipts') is not null
  or pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is not null
  or exists(select 1 from efg_private.coach_release_switches
    where switch_key='pilot_coach_atomic_publication') then
  raise exception 'COACH119 already exists; manual review required' using errcode='55000';
 end if;
 if not exists(select 1 from pg_catalog.pg_trigger t
   where t.tgrelid='public.efg_goals'::regclass
    and t.tgname='trg_efg_notify_goal' and t.tgenabled='O')
 or not exists(select 1 from pg_catalog.pg_trigger t
   where t.tgrelid='public.efg_food_plans'::regclass
    and t.tgname='trg_efg_notify_food_guide' and t.tgenabled='O') then
  raise exception 'COACH119 STOP: expected legacy notification triggers missing' using errcode='55000';
 end if;
end $coach119_preflight$;

-- This switch is PRIVATE; no client can activate publication.
insert into efg_private.coach_release_switches(switch_key,enabled,notes)
values('pilot_coach_atomic_publication',false,
 'OFF until audited legal+clinical, food corpus, signed A/B JWT, rollback and owner GO');

create table public.efg_coach_plan_publish_receipts (
 request_id uuid primary key,
 student_id uuid not null references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 coach_id uuid not null references auth.users(id),
 draft_revision bigint not null check(draft_revision>0),
 goal_id uuid not null references public.efg_goals(id),
 published_at timestamptz not null default pg_catalog.clock_timestamp(),
 unique(student_id,draft_revision)
);
create index coach119_publication_receipts_student_idx
 on public.efg_coach_plan_publish_receipts(student_id,published_at desc);
alter table public.efg_coach_plan_publish_receipts enable row level security;
revoke all on public.efg_coach_plan_publish_receipts from public,anon,authenticated;

-- Preserve exactly the two existing legacy notifications during independent
-- legacy writes, suppressing only within this signed atomic RPC's transaction.
-- Stage with recorded pg_get_functiondef() before altering these functions.
create or replace function public.efg_notify_goal()
returns trigger language plpgsql security definer set search_path=''
as $coach119_legacy_goal$
begin
 if pg_catalog.current_setting('efg.coach_atomic_publish',true)='on'
  then return new; end if;
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
 values (new.student_id,new.approved_by,'plan_update','goal:'||new.id::text,
  'Objetivo nutricional actualizado','Tu coach aprobó un objetivo de alimentación.','home')
 on conflict(recipient_id,event_key) do nothing;
 return new;
end;
$coach119_legacy_goal$;

create or replace function public.efg_notify_food_guide()
returns trigger language plpgsql security definer set search_path=''
as $coach119_legacy_guide$
begin
 if pg_catalog.current_setting('efg.coach_atomic_publish',true)='on'
  then return new; end if;
 if tg_op='INSERT' then
  if new.guided_plan is null or new.guided_plan_approved_at is null then return new; end if;
 elsif new.guided_plan_approved_at is not distinct from old.guided_plan_approved_at then
  if new.approved_food_ids is distinct from old.approved_food_ids then
   insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
   values(new.student_id,new.coach_id,'plan_update','foods:'||new.updated_at::text,
    'Cambios en tu alimentación','Tu coach actualizó las opciones de alimentos de tu plan.','home')
   on conflict(recipient_id,event_key) do nothing;
  end if;
  return new;
 end if;
 if new.guided_plan is not null and new.guided_plan_approved_at is not null then
  insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
  values(new.student_id,new.coach_id,'guide','guide:'||new.guided_plan_approved_at::text,
   'Nueva guía de alimentación','Tu coach aprobó una guía alimentaria. Podés verla en Mi día.','home')
  on conflict(recipient_id,event_key) do nothing;
 end if;
 return new;
end;
$coach119_legacy_guide$;

create function public.efg_publish_coach_plan_draft_atomic(
 p_student uuid,p_expected_revision bigint,p_request_id uuid)
returns uuid
language plpgsql security definer set search_path=''
as $coach119_publish$
declare
 v_coach uuid:=auth.uid();
 v_org uuid;
 v_enabled boolean:=false;
 v_intake public.efg_coach_relaunch_intakes%rowtype;
 v_draft public.efg_coach_plan_drafts%rowtype;
 v_goal jsonb;
 v_guide jsonb;
 v_goal_id uuid;
 v_existing public.efg_coach_plan_publish_receipts%rowtype;
 v_food_ids text[];
 v_legal_count integer:=0;
 v_key text;
 v_value numeric;
 v_slot_count integer;
 v_distinct_slots integer;
begin
 select enabled into v_enabled from efg_private.coach_release_switches
 where switch_key='pilot_coach_atomic_publication';
 if v_enabled is distinct from true then
  raise exception 'Coach atomic publication has not been activated'
   using errcode='42501';
 end if;
 if v_coach is null or p_student is null or p_request_id is null or
  p_expected_revision is null or p_expected_revision<1 or
  not efg_private.coach_has_student(p_student) then
  raise exception 'Invalid or unauthorized Coach publication'
   using errcode='42501';
 end if;

 -- Student-scoped lock makes two devices and retries serialize.
 select a.organization_id into v_org
 from public.efg_student_plan_access a
 join public.efg_profiles p on p.user_id=a.student_id
 join public.efg_organizations o on o.id=p.organization_id
 where a.student_id=p_student and a.coach_id=v_coach
  and p.organization_id=a.organization_id and p.active and p.role='student'
  and o.coach_id=v_coach
 for update of a;
 if not found then
  raise exception 'Student is no longer assigned to this Coach'
   using errcode='42501';
 end if;

 -- The student's two unsigned-inferable pilot checkboxes and follow-up consent
 -- must still be valid. No acceptance is inferred from historical data.
 perform 1 from public.efg_pilot_participation_receipts r
 where r.student_id=p_student and r.organization_id=v_org
  and r.version='coach_pilot_2026_demo1'
  and r.acceptance_method='two_explicit_checkboxes'
  and r.participation_accepted and r.sharing_accepted
  and r.accepted_at is not null and r.revoked_at is null
 for share;
 if not found then raise exception 'Pilot participation/sharing missing or revoked'
   using errcode='42501'; end if;
 perform 1 from public.efg_consents c
 where c.student_id=p_student and c.organization_id=v_org and c.accepted
 for share;
 if not found then raise exception 'Coach follow-up consent missing or revoked'
   using errcode='42501'; end if;

 select i.* into v_intake from public.efg_coach_relaunch_intakes i
 where i.student_id=p_student and i.organization_id=v_org
  and i.completed_version='coach_major_2026_r1' and i.shared_at is not null
 for update of i;
 if not found then raise exception 'Current general intake not shared'
  using errcode='42501'; end if;

 -- ALL CURRENT text versions must be cryptographically verifiable and accepted
 -- separately by both student and Coach. Never mistake these for medical consent.
 select pg_catalog.count(*) into v_legal_count
 from public.efg_legal_documents d
 join public.efg_legal_acceptances student_rec
  on student_rec.document_id=d.id and student_rec.user_id=p_student
 join public.efg_legal_acceptances coach_rec
  on coach_rec.document_id=d.id and coach_rec.user_id=v_coach
 where d.is_current and d.published_at is not null
  and d.kind in ('terms','privacy')
  and d.sha256=pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(d.body,'UTF8')),'hex');
 if v_legal_count<>2 then
  raise exception 'Current Terms and Privacy not explicitly accepted by both parties'
   using errcode='42501'; end if;

 -- Only a matching Coach-owned draft at the latest intake revision can publish.
 select draft.* into v_draft
 from public.efg_coach_plan_drafts draft
 where draft.student_id=p_student and draft.coach_id=v_coach
  and draft.organization_id=v_org
 for update of draft;
 if not found or v_draft.source_intake_updated_at is distinct from v_intake.updated_at
  or v_draft.source_intake_revision is distinct from v_intake.revision then
  raise exception 'Draft based on old or missing intake'
   using errcode='PT409'; end if;

 -- Idempotent retries with same signed Coach/Student/revision are harmless.
 select receipt.* into v_existing from public.efg_coach_plan_publish_receipts receipt
 where receipt.request_id=p_request_id;
 if found then
  if v_existing.student_id is distinct from p_student or
    v_existing.coach_id is distinct from v_coach or
    v_existing.draft_revision is distinct from p_expected_revision then
   raise exception 'Publication key reused with different owner/revision'
    using errcode='23505'; end if;
  return v_existing.goal_id;
 end if;
 if v_draft.status<>'draft' or v_draft.draft_revision<>p_expected_revision then
  raise exception 'Draft revision no longer publishable'
   using errcode='PT409'; end if;

 v_goal:=v_draft.goal_proposal;
 v_guide:=v_draft.guide_proposal;
 if pg_catalog.jsonb_typeof(v_goal) is distinct from 'object'
  or v_goal->>'goal_type' not in ('fat_loss','recomp','muscle_gain','maintenance')
  or pg_catalog.jsonb_typeof(v_guide) is distinct from 'object'
  or v_guide->>'kind' is distinct from 'five_meal_example'
  or v_guide->>'version' is distinct from '1'
  or pg_catalog.jsonb_typeof(v_guide->'meals') is distinct from 'array'
  or pg_catalog.jsonb_array_length(v_guide->'meals')<>5 then
  raise exception 'Goal or five-meal guide missing or invalid' using errcode='22023';
 end if;
 foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
  if pg_catalog.jsonb_typeof(v_goal->v_key) is distinct from 'number' then
   raise exception 'Missing numeric goal field %',v_key using errcode='22023'; end if;
  v_value:=(v_goal->>v_key)::numeric;
  if v_value<>pg_catalog.trunc(v_value) or
   v_value < (case when v_key='kcal' then 1200 else 0 end) or
   v_value > (case v_key when 'kcal' then 10000 when 'carb_g' then 2000
      when 'fiber_g' then 150 else 1000 end) then
   raise exception 'Goal field out of range %',v_key using errcode='22023';
  end if;
 end loop;
 select count(*),count(distinct meal.value->>'slot')
  into v_slot_count,v_distinct_slots
 from pg_catalog.jsonb_array_elements(v_guide->'meals') as meal(value);
 if v_slot_count<>5 or v_distinct_slots<>5 or
  efg_private.coach_guide_foods_verified(v_guide) is distinct from true then
  raise exception 'Guide foods are not independently reviewed and current'
   using errcode='42501';
 end if;
 select pg_catalog.array_agg(distinct item.value->>'id')
 into v_food_ids
 from pg_catalog.jsonb_array_elements(v_guide->'meals') as meal(value)
 cross join lateral pg_catalog.jsonb_array_elements(meal.value->'items') as item(value);
 if v_food_ids is null or pg_catalog.cardinality(v_food_ids) not between 1 and 300 then
  raise exception 'Reviewed guide food ID list invalid' using errcode='22023'; end if;

 -- Only after every check do legacy notices suppress, for this transaction ONLY.
 perform pg_catalog.set_config('efg.coach_atomic_publish','on',true);
 insert into public.efg_goals(
  student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g,
  start_on,approved_at
 ) values(
  p_student,v_coach,v_goal->>'goal_type',
  (v_goal->>'kcal')::integer,(v_goal->>'protein_g')::integer,
  (v_goal->>'carb_g')::integer,(v_goal->>'fat_g')::integer,
  (v_goal->>'fiber_g')::integer,
  (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date,
  pg_catalog.clock_timestamp()
 ) returning id into v_goal_id;

 insert into public.efg_food_plans(
  student_id,coach_id,approved_food_ids,updated_at,
  guided_plan,guided_goal_id,guided_plan_approved_at
 ) values(
  p_student,v_coach,v_food_ids,pg_catalog.clock_timestamp(),
  v_guide,v_goal_id,pg_catalog.clock_timestamp()
 )
 on conflict(student_id) do update set
  coach_id=excluded.coach_id,approved_food_ids=excluded.approved_food_ids,
  guided_plan=excluded.guided_plan,guided_goal_id=excluded.guided_goal_id,
  guided_plan_approved_at=excluded.guided_plan_approved_at,
  updated_at=excluded.updated_at;

 update public.efg_student_plan_access
 set status='published',published_goal_id=v_goal_id,
  published_at=pg_catalog.clock_timestamp(),published_by=v_coach,
  updated_at=pg_catalog.clock_timestamp()
 where student_id=p_student and organization_id=v_org and coach_id=v_coach;
 if not found then raise exception 'Student access changed mid-publication'
  using errcode='PT409'; end if;

 insert into public.efg_notifications(
  recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student
 ) values(
  p_student,v_coach,'plan_update','coach_plan:'||v_goal_id::text,
  'Tu guía está lista','Tu coach aprobó tu nuevo objetivo y guía de alimentación.','home',p_student
 ) on conflict(recipient_id,event_key) do nothing;

 insert into public.efg_coach_plan_publish_receipts(
  request_id,student_id,organization_id,coach_id,draft_revision,goal_id
 ) values(p_request_id,p_student,v_org,v_coach,p_expected_revision,v_goal_id);

 update public.efg_coach_plan_drafts
 set status='published',updated_at=pg_catalog.clock_timestamp()
 where student_id=p_student and coach_id=v_coach and organization_id=v_org
  and draft_revision=p_expected_revision and status='draft';
 if not found then raise exception 'Concurrent draft change' using errcode='PT409'; end if;
 perform pg_catalog.set_config('efg.coach_atomic_publish','off',true);
 return v_goal_id;
end;
$coach119_publish$;

revoke all on function public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)
 from public,anon,authenticated;
grant execute on function public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)
 to authenticated;
comment on function public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid) is
 'Coach-only, guarded atomic goal+guide+access+one notice+idempotent receipt.
 Release flag OFF. HEALTH CONSENT NOT YET VALIDATED. NO RELEASE.';
commit;

-- HARD NO GO until: health consent/medical restrictions verified independently,
-- reviewed legal texts current and accepted, reviewed food data loaded by operator,
-- signed multi-org JWT, exact current schema + trigger tests, recovery drill,
-- safe legacy client migration, physical mobile UAT and explicit owner GO.
