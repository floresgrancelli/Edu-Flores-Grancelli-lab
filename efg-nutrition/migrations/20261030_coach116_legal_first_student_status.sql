-- COACH116: legal-first fail-closed server gate for hosted pilot entry.
-- COACH115 creates current versioned document receipts, no documents published
-- until reviewed. Existing legacy client and historic data are UNCHANGED.
-- COACH_STUDENT_JOURNEY_ENABLED remains false until atomic publish, health
-- consent handling and direct diary write gate are independently validated.
do $coach116$
begin
 if pg_catalog.to_regprocedure('public.efg_coach_pilot_entry_status()') is null or
 pg_catalog.to_regprocedure('public.efg_legal_current_status()') is null then
  raise exception 'COACH116 missing hosted status/legal prerequisites';
 end if;
end $coach116$;

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
   and r.participation_accepted=true and r.sharing_accepted=true
   and r.accepted_at is not null and r.revoked_at is null
 ) into v_receipt;
 if not v_receipt then
  v_route:='participation';
 else
  select exists(select 1 from public.efg_consents c
    where c.student_id=v_uid and c.organization_id=v_org and c.accepted=true)
    into v_follow_up;
  select i.* into v_intake from public.efg_coach_relaunch_intakes i
   where i.student_id=v_uid and i.organization_id=v_org
     and i.completed_version='coach_major_2026_r1';
  if not found or v_intake.shared_at is null or not v_follow_up then
   v_route:='intake';
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
  'general_intake_shared',v_intake.shared_at is not null and v_follow_up,
  'legal_current_accepted',true,
  'requires_separate_health_consent',true
 );
end;
$entry$;

revoke all on function public.efg_coach_pilot_entry_status()
 from public,anon,authenticated;
grant execute on function public.efg_coach_pilot_entry_status()
 to authenticated;
comment on function public.efg_coach_pilot_entry_status() is
 'Read-only signed Coach pilot entry. Requires 2 current separately accepted legal documents before participation/intake/ready; medical consent and diary DML are separate.';
