-- COACH-OPT-01 · corrective candidate migration, NEVER AUTO-APPLY.
-- The hosted COACH106 baseline currently constrains sharing_accepted=true.
-- This change separates voluntary participation from optional coach sharing.
-- Preserve all rows, plans, consent history and active release flags.
-- Requires isolated faithful restore, SEC-09 owner RLS repair, JWT A/B and explicit GO.
-- NOT a health-data consent, not approval of terms or clinical restrictions.
begin;
do $preflight$
begin
 if pg_catalog.to_regclass('public.efg_pilot_participation_receipts') is null
    or pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is null
    or pg_catalog.to_regprocedure('public.efg_accept_pilot_participation(text,boolean,boolean)') is null
    or pg_catalog.to_regprocedure('public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)') is null
    or pg_catalog.to_regprocedure('public.efg_coach_pilot_entry_status()') is null then
  raise exception 'COACH-OPT-01: expected installed backend missing; abort';
 end if;
 if not exists (
   select 1 from pg_catalog.pg_policy p
   where p.polrelid='public.efg_coach_relaunch_intakes'::regclass
     and p.polname='efg_coach_relaunch_shared_coach_select'
     and p.polcmd='r' and p.polpermissive
 ) then raise exception 'COACH-OPT-01: shared Coach SELECT policy missing; manual review'; end if;
 if not exists(
   select 1 from pg_catalog.pg_constraint
   where conrelid='public.efg_pilot_participation_receipts'::regclass
     and conname='efg_pilot_participation_receipts_sharing_accepted_check'
     and contype='c'
 ) then raise exception 'COACH-OPT-01: expected legacy sharing CHECK absent; manual review'; end if;
 -- Security repair must be applied FIRST. Do not loosen opt-in if old
 -- organization-ambiguous owner RLS remains installed.
 if not exists(
   select 1 from pg_catalog.pg_policies
   where schemaname='public' and tablename='efg_coach_relaunch_intakes'
     and policyname='efg_coach_relaunch_owner_select'
     and qual like '%efg_coach_relaunch_intakes.organization_id%'
 ) or not exists(
   select 1 from pg_catalog.pg_policies
   where schemaname='public' and tablename='efg_pilot_participation_receipts'
     and policyname='efg_pilot_participation_owner_read'
     and qual like '%efg_pilot_participation_receipts.organization_id%'
 ) then raise exception 'COACH-OPT-01: qualified owner policies not confirmed'; end if;
 if exists(
   select 1 from pg_catalog.pg_policies
   where (schemaname,tablename,policyname) in (
    ('public','efg_coach_relaunch_intakes','efg_coach_relaunch_owner_select'),
    ('public','efg_pilot_participation_receipts','efg_pilot_participation_owner_read')
   ) and qual like '%p.organization_id = p.organization_id%'
 ) then raise exception 'COACH-OPT-01: COACH-SEC-09 RLS repair required first'; end if;
end
$preflight$;
alter table public.efg_pilot_participation_receipts
 drop constraint efg_pilot_participation_receipts_sharing_accepted_check;

-- SECURITY DEFINER boolean: receipt rows remain owner-only under RLS.
-- The caller must be the student's current authorized Coach, and the
-- student must remain active in the SAME organization as the intake row.
create or replace function efg_private.coach_pilot_share_active(
 p_student uuid,p_org uuid
) returns boolean language plpgsql stable security definer set search_path=''
as $share$
begin
 return (select efg_private.coach_has_student(p_student) and exists(
  select 1 from public.efg_pilot_participation_receipts r
  join public.efg_profiles p on p.user_id=r.student_id
  join public.efg_consents c on c.student_id=r.student_id
    and c.organization_id=r.organization_id and c.accepted=true
  where r.student_id=p_student and r.organization_id=p_org
   and p.organization_id=p_org and p.role='student' and p.active
   and r.version='coach_pilot_2026_demo1'
   and r.participation_accepted and r.sharing_accepted is true
   and r.revoked_at is null
 ));
end
$share$;
revoke all on function efg_private.coach_pilot_share_active(uuid,uuid)
 from public,anon,authenticated;
grant execute on function efg_private.coach_pilot_share_active(uuid,uuid)
 to authenticated;

-- A previously shared row must become unreadable to the Coach immediately
-- when the student updates the independent receipt to sharing_accepted=false,
-- even if shared_at has not yet been cleared by an intake edit.
alter policy efg_coach_relaunch_shared_coach_select
 on public.efg_coach_relaunch_intakes
 using (
  shared_at is not null and efg_private.coach_pilot_share_active(student_id,organization_id)

 );


create or replace function public.efg_accept_pilot_participation(
 p_version text, p_participation boolean, p_sharing boolean
) returns timestamptz language plpgsql volatile security definer set search_path=''
as $accept$
declare
 v_student uuid := (select auth.uid());
 v_org uuid;
 v_accepted timestamptz := pg_catalog.clock_timestamp();
begin
 if v_student is null or p_version is distinct from 'coach_pilot_2026_demo1'
    or p_participation is distinct from true or p_sharing is null then
  raise exception 'Pilot participation requires an explicit sharing decision'
    using errcode='42501';
 end if;
 select p.organization_id into v_org
  from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  where p.user_id=v_student and p.role='student' and p.active;
 if v_org is null then
  raise exception 'An active student account is required' using errcode='42501';
 end if;
 insert into public.efg_pilot_participation_receipts
  (student_id,organization_id,version,participation_accepted,sharing_accepted,
   accepted_at,revoked_at,updated_at)
 values (v_student,v_org,p_version,true,p_sharing,v_accepted,null,v_accepted)
 on conflict(student_id,version) do update set
  organization_id=excluded.organization_id,
  participation_accepted=true,sharing_accepted=excluded.sharing_accepted,
  acceptance_method='two_explicit_checkboxes',
  accepted_at=excluded.accepted_at,revoked_at=null,updated_at=excluded.updated_at;
 return v_accepted;
end
$accept$;

create or replace function public.efg_submit_coach_relaunch_intake(
 p_completed_version text,p_payload jsonb,p_expected_revision integer,p_share_with_coach boolean
) returns integer
language plpgsql security definer set search_path='' as $body$
declare
 v_uid uuid := (select auth.uid());
 v_org uuid;
 v_revision integer;
 v_new_revision integer;
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
 select p.organization_id into v_org from public.efg_profiles p
  where p.user_id=v_uid and p.role='student' and p.active is true
  and p.organization_id is not null;
 if v_org is null then raise exception 'Active Coach student required' using errcode='42501'; end if;
 -- Participation is required; sharing is a separate OPTIONAL choice checked only when requested.
 if not exists(
  select 1 from public.efg_pilot_participation_receipts r
  where r.student_id=v_uid and r.organization_id=v_org
   and r.version='coach_pilot_2026_demo1' and r.participation_accepted
   and r.revoked_at is null
 ) then
  raise exception 'Current pilot participation required'
   using errcode='42501';
 end if;
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
   select 1 from public.efg_pilot_participation_receipts r
   where r.student_id=v_uid and r.organization_id=v_org
     and r.version='coach_pilot_2026_demo1'
     and r.participation_accepted and r.sharing_accepted and r.revoked_at is null
  ) then
   raise exception 'Separate pilot coach-sharing permission required'
     using errcode='42501';
  end if;
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

create or replace function public.efg_coach_pilot_entry_status()
returns jsonb
language plpgsql stable security definer
set search_path=''
as $entry$
declare
 v_uid uuid := auth.uid();
 v_org uuid;
 v_coach uuid;
 v_receipt boolean := false;
 v_sharing boolean := false;
 v_intake public.efg_coach_relaunch_intakes%rowtype;
 v_plan public.efg_student_plan_access%rowtype;
 v_guide_goal uuid;
 v_guide_at timestamptz;
 v_goal_ok boolean := false;
 v_follow_up boolean := false;
 v_route text := 'verify';
 v_current_legal_count integer := 0;
begin
 -- This routine reads only rows belonging to auth.uid(); never take a
 -- student, coach or organization id as a browser-supplied parameter.
 if v_uid is null then
  return pg_catalog.jsonb_build_object('route','verify','can_log_meals',false);
 end if;
 select p.organization_id,o.coach_id into v_org,v_coach
 from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=v_uid and p.role='student' and p.active=true
   and o.coach_id is not null;
 if v_org is null or v_coach is null then
  return pg_catalog.jsonb_build_object('route','verify','can_log_meals',false);
 end if;
 -- Legal readiness is server-owned, not a browser-side checklist.
 -- An absent/unreviewed/replaced terms or privacy document blocks ALL routes,
 -- including already published student goals, without erasing historic data.
 select count(*) into v_current_legal_count
 from public.efg_legal_current_status() as doc where doc.accepted;
 if v_current_legal_count<>2 then
  return pg_catalog.jsonb_build_object(
    'route','legal','can_log_meals',false,
    'required_intake_version','coach_major_2026_r1',
    'required_pilot_version','coach_pilot_2026_demo1',
    'participation_confirmed',false,'general_intake_shared',false,
    'legal_current_accepted',false,
    'requires_separate_health_consent',true
  );
 end if;
 select exists(
  select 1 from public.efg_pilot_participation_receipts r
  where r.student_id=v_uid and r.organization_id=v_org
   and r.version='coach_pilot_2026_demo1'
   and r.acceptance_method='two_explicit_checkboxes'
   and r.participation_accepted=true
   and r.accepted_at is not null and r.revoked_at is null
 ) into v_receipt;
 if not v_receipt then
  v_route:='participation';
 else
  -- A prior shared intake never authorizes current coach access after
  -- the independent pilot sharing receipt is changed to FALSE.
  select exists(
   select 1 from public.efg_pilot_participation_receipts r
   where r.student_id=v_uid and r.organization_id=v_org
     and r.version='coach_pilot_2026_demo1'
     and r.participation_accepted and r.sharing_accepted
     and r.revoked_at is null
  ) into v_sharing;
  select exists(select 1 from public.efg_consents c
    where c.student_id=v_uid and c.organization_id=v_org and c.accepted=true)
    into v_follow_up;
  select i.* into v_intake from public.efg_coach_relaunch_intakes i
   where i.student_id=v_uid and i.organization_id=v_org
     and i.completed_version='coach_major_2026_r1';
  if not found then
   v_route:='intake';
  elsif v_intake.shared_at is null or not v_follow_up or not v_sharing then
   v_route:='private'; -- Own current intake saved, without coach sharing.
  else
   v_route:='review';
   select a.* into v_plan from public.efg_student_plan_access a
    where a.student_id=v_uid and a.organization_id=v_org
      and a.coach_id=v_coach;
   if found and v_plan.status='published'
     and v_plan.published_goal_id is not null
     and v_plan.published_at >= v_intake.updated_at
     and v_plan.published_by=v_coach then
    select f.guided_goal_id,f.guided_plan_approved_at
     into v_guide_goal,v_guide_at
     from public.efg_food_plans f
     where f.student_id=v_uid and f.coach_id=v_coach;
    select exists(select 1 from public.efg_goals g
       where g.id=v_plan.published_goal_id and g.student_id=v_uid
         and g.approved_by=v_coach)
      into v_goal_ok;
    if v_goal_ok and v_guide_goal=v_plan.published_goal_id
      and v_guide_at is not null and v_guide_at>=v_intake.updated_at
      and pg_catalog.jsonb_typeof((
       select f.guided_plan from public.efg_food_plans f
       where f.student_id=v_uid and f.coach_id=v_coach
      )->'meals')='array'
      and pg_catalog.jsonb_array_length((
       select f.guided_plan from public.efg_food_plans f
       where f.student_id=v_uid and f.coach_id=v_coach
      )->'meals')=5 then
      v_route:='ready';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'route',v_route,'can_log_meals',v_route='ready',
  'required_intake_version','coach_major_2026_r1',
  'required_pilot_version','coach_pilot_2026_demo1',
  'participation_confirmed',v_receipt,
  'general_intake_shared',v_intake.shared_at is not null and v_follow_up and v_sharing,
  'legal_current_accepted',true,
  'requires_separate_health_consent',true
 );
end;
$entry$;

-- The three function replacements are atomic with the constraint update.
-- Existing true receipts stay true; a new explicit false is allowed and
-- never permits coach SELECT unless the student independently opts in.
commit;
-- Run signed JWT local/staging: false receipt, private revision, no coach read;
-- true receipt + follow-up permission + shared revision; revoke; org transfer;
-- existing published plans and old diary history remain unchanged.
