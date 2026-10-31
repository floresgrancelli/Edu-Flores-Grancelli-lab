-- COACH-RELAUNCH · STAGING ONLY / NEVER RUN ON HOSTED PRODUCTION.
-- Versioned voluntary general intake for returning Coach students.
-- Existing efg_student_intakes/goals/day logs/habitual/payments/messages remain untouched.
-- NO medical diagnoses are stored until legal and clinical review authorizes a separate schema.
begin;

do $preflight$
begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null then
  raise exception 'COACH-RELAUNCH STOP: isolated staging marker missing' using errcode='55000';
 end if;
 if (select count(*) from efg_private.nut57_isolated_staging_marker)<>1 then
  raise exception 'COACH-RELAUNCH STOP: invalid isolated staging marker' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_profiles') is null
  or pg_catalog.to_regclass('public.efg_organizations') is null
  or pg_catalog.to_regclass('public.efg_consents') is null
  or pg_catalog.to_regclass('public.efg_student_intakes') is null
  or pg_catalog.to_regprocedure('public.efg_legal_current_status()') is null
  or pg_catalog.to_regprocedure('efg_private.coach_has_student(uuid)') is null then
  raise exception 'COACH-RELAUNCH STOP: Coach/Legal preconditions missing' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is not null
  or pg_catalog.to_regprocedure('public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)') is not null then
  raise exception 'COACH-RELAUNCH STOP: target already exists; never overwrite' using errcode='55000';
 end if;
end
$preflight$;

create table public.efg_coach_relaunch_intakes (
 student_id uuid not null references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 completed_version text not null
  check(completed_version ~ '^[a-z0-9_]{5,80}$'),
 revision integer not null default 1 check (revision between 1 and 100000),
 objective text check(objective is null or objective in
   ('fat_loss','recomp','muscle_gain','maintenance','general')),
 age_years integer check(age_years between 18 and 100),
 height_cm numeric(5,1) check(height_cm between 100 and 250),
 weight_kg numeric(5,1) check(weight_kg between 20 and 400),
 activity_level text check(activity_level is null or activity_level in ('low','light','moderate','high')),
 dietary_pattern text check(dietary_pattern is null or dietary_pattern in
  ('omnivore','mediterranean','dash','vegetarian','vegan','pescatarian','flexitarian','portfolio','low_carb','keto','other')),
 eating_window text not null default 'regular' check(eating_window in ('regular','12_12','14_10','16_8')),
 preferred_foods text not null default '' check(char_length(preferred_foods)<=400),
 disliked_foods text not null default '' check(char_length(disliked_foods)<=400),
 meal_routine text not null default '' check(char_length(meal_routine)<=400),
 notes text not null default '' check(char_length(notes)<=1000),
 shared_at timestamptz,
 completed_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(student_id,completed_version)
);
create index efg_coach_relaunch_shared_idx
 on public.efg_coach_relaunch_intakes(organization_id,updated_at desc)
 where shared_at is not null;

alter table public.efg_coach_relaunch_intakes enable row level security;
revoke all on public.efg_coach_relaunch_intakes from public,anon,authenticated;
-- SELECT is owner-scoped; a linked coach sees ONLY explicitly shared drafts
-- while the separate student/coaching relationship remains authorized.
grant select on public.efg_coach_relaunch_intakes to authenticated;
create policy efg_coach_relaunch_owner_select on public.efg_coach_relaunch_intakes
 for select to authenticated using (
  student_id=(select auth.uid()) and exists (
   select 1 from public.efg_profiles p
   where p.user_id=(select auth.uid()) and p.role='student'
    and p.active is true
    and p.organization_id=efg_coach_relaunch_intakes.organization_id
  )
 );
create policy efg_coach_relaunch_shared_coach_select on public.efg_coach_relaunch_intakes
 for select to authenticated using (
  shared_at is not null and efg_private.coach_has_student(student_id)
  and exists (
   select 1 from public.efg_consents c
   where c.student_id=efg_coach_relaunch_intakes.student_id
    and c.organization_id=efg_coach_relaunch_intakes.organization_id and c.accepted=true
  )
  and exists (
   select 1 from public.efg_pilot_participation_receipts r
   where r.student_id=efg_coach_relaunch_intakes.student_id
    and r.organization_id=efg_coach_relaunch_intakes.organization_id
    and r.version='coach_pilot_2026_demo1' and r.participation_accepted
    and r.sharing_accepted is true and r.revoked_at is null
  )
 );
-- No direct PostgREST INSERT/UPDATE/DELETE grant and NO write RLS policies.
-- Use the limited transactional RPC below. It is NOT a clinical intake endpoint.

create function public.efg_submit_coach_relaunch_intake(
 p_completed_version text,p_payload jsonb,p_expected_revision integer,p_share_with_coach boolean
) returns integer
language plpgsql security definer set search_path='' as $body$
declare
 v_uid uuid := (select auth.uid());
 v_org uuid;
 v_revision integer;
 v_new_revision integer;
 v_legal boolean;
 v_allowed text[] := array[
  'objective','age_years','height_cm','weight_kg','activity_level',
  'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes'
 ];
 v_field text;
 v_text text;
 v_shared timestamptz;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_completed_version is distinct from 'coach_major_2026_r1' then
  raise exception 'Unsupported Coach relaunch revision' using errcode='22023';
 end if;
 if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>99999
  or p_share_with_coach is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object' then
  raise exception 'Invalid intake revision/payload/permission' using errcode='22023';
 end if;
 -- Both legal documents must be CURRENT and accepted; OTP does not imply acceptance.
 select count(*)=2 and coalesce(bool_and(z.accepted),false)
  into v_legal from public.efg_legal_current_status() z;
 if not coalesce(v_legal,false) then
  raise exception 'Current terms and privacy must be explicitly accepted'
   using errcode='42501';
 end if;
 select p.organization_id into v_org from public.efg_profiles p
  where p.user_id=v_uid and p.role='student' and p.active is true
  and p.organization_id is not null;
 if v_org is null then raise exception 'Active Coach student required' using errcode='42501'; end if;
 -- Reject unknown and sensitive keys even if a future browser has extra fields.
 for v_field in select pg_catalog.jsonb_object_keys(p_payload) loop
  if not (v_field=any(v_allowed)) then
   raise exception 'Unsupported or sensitive intake field: %',v_field using errcode='22023';
  end if;
 end loop;
 foreach v_field in array v_allowed loop
  if p_payload ? v_field and p_payload->v_field <> 'null'::jsonb then
   if v_field in ('age_years','height_cm','weight_kg') then
    if pg_catalog.jsonb_typeof(p_payload->v_field)<>'number' then
     raise exception 'Numeric intake field type mismatch' using errcode='22023';
    end if;
   elsif pg_catalog.jsonb_typeof(p_payload->v_field)<>'string' then
    raise exception 'Text intake field type mismatch' using errcode='22023';
   end if;
  end if;
 end loop;
 if nullif(p_payload->>'objective','') is not null and
    (p_payload->>'objective') not in ('fat_loss','recomp','muscle_gain','maintenance','general')
  then raise exception 'Invalid objective' using errcode='22023'; end if;
 if nullif(p_payload->>'activity_level','') is not null and
    (p_payload->>'activity_level') not in ('low','light','moderate','high')
  then raise exception 'Invalid activity' using errcode='22023'; end if;
 if nullif(p_payload->>'dietary_pattern','') is not null and
    (p_payload->>'dietary_pattern') not in ('omnivore','mediterranean','dash','vegetarian','vegan','pescatarian','flexitarian','portfolio','low_carb','keto','other')
  then raise exception 'Invalid dietary pattern' using errcode='22023'; end if;
 if nullif(p_payload->>'eating_window','') is not null
    and (p_payload->>'eating_window') not in ('regular','12_12','14_10','16_8')
  then raise exception 'Invalid eating window' using errcode='22023'; end if;
 foreach v_field in array array['preferred_foods','disliked_foods','meal_routine','notes'] loop
  v_text:=coalesce(p_payload->>v_field,'');
  if pg_catalog.char_length(v_text)>(case when v_field='notes' then 1000 else 400 end) then
   raise exception 'Intake free-text too long' using errcode='22023';
  end if;
 end loop;
 if p_payload ? 'age_years' and p_payload->>'age_years' is not null then
  if (p_payload->>'age_years')::numeric not between 18 and 100 or
   (p_payload->>'age_years')::numeric<>pg_catalog.trunc((p_payload->>'age_years')::numeric) then
   raise exception 'Invalid age' using errcode='22023'; end if;
 end if;
 if p_payload ? 'height_cm' and p_payload->>'height_cm' is not null and
   (p_payload->>'height_cm')::numeric not between 100 and 250 then
  raise exception 'Invalid height' using errcode='22023'; end if;
 if p_payload ? 'weight_kg' and p_payload->>'weight_kg' is not null and
   (p_payload->>'weight_kg')::numeric not between 20 and 400 then
  raise exception 'Invalid weight' using errcode='22023'; end if;
 -- A consenting Coach cannot be inferred from an invitation or an existing plan.
 if p_share_with_coach then
  if not exists(
   select 1 from public.efg_consents c
   where c.student_id=v_uid and c.organization_id=v_org and c.accepted=true
  ) then
   raise exception 'Coach follow-up permission required before sharing intake'
    using errcode='42501';
  end if;
  v_shared:=pg_catalog.now();
 else
  v_shared:=null;
 end if;
 -- Serialize concurrent first submissions and check the expected revision.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  v_uid::text||'/'||p_completed_version,0));
 select revision into v_revision from public.efg_coach_relaunch_intakes
  where student_id=v_uid and completed_version=p_completed_version for update;
 if coalesce(v_revision,0)<>p_expected_revision then
  raise exception 'Intake revision conflict; reload before retry' using errcode='PT409';
 end if;
 insert into public.efg_coach_relaunch_intakes(
  student_id,organization_id,completed_version,revision,
  objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,eating_window,
  preferred_foods,disliked_foods,meal_routine,notes,shared_at,completed_at,updated_at
 ) values(
  v_uid,v_org,p_completed_version,p_expected_revision+1,
  nullif(p_payload->>'objective',''),
  nullif(p_payload->>'age_years','')::integer,
  nullif(p_payload->>'height_cm','')::numeric,
  nullif(p_payload->>'weight_kg','')::numeric,
  nullif(p_payload->>'activity_level',''),
  nullif(p_payload->>'dietary_pattern',''),
  coalesce(nullif(p_payload->>'eating_window',''),'regular'),
  coalesce(p_payload->>'preferred_foods',''),
  coalesce(p_payload->>'disliked_foods',''),
  coalesce(p_payload->>'meal_routine',''),
  coalesce(p_payload->>'notes',''),
  v_shared,pg_catalog.now(),pg_catalog.now()
 )
 on conflict(student_id,completed_version) do update set
  revision=excluded.revision,
  objective=excluded.objective,age_years=excluded.age_years,
  height_cm=excluded.height_cm,weight_kg=excluded.weight_kg,
  activity_level=excluded.activity_level,dietary_pattern=excluded.dietary_pattern,eating_window=excluded.eating_window,
  preferred_foods=excluded.preferred_foods,disliked_foods=excluded.disliked_foods,
  meal_routine=excluded.meal_routine,notes=excluded.notes,
  shared_at=excluded.shared_at,updated_at=excluded.updated_at
 where efg_coach_relaunch_intakes.revision=p_expected_revision
 returning revision into v_new_revision;
 if v_new_revision is null then
  raise exception 'Intake revision conflict' using errcode='PT409';
 end if;
 return v_new_revision;
end
$body$;
revoke all on function public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)
 from public,anon,authenticated;
grant execute on function public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)
 to authenticated;

commit;
-- IMPORTANT: requires local signed-JWT tests for student A/B, coach A/B, revoked
-- consent, legal versions, duplicate submit, suspended profiles, and real restore.
-- Never mark this SQL as applied or legally/clinically approved.
