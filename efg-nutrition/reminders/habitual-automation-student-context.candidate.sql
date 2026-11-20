begin;

-- The signed entry point and the scheduled writer share the same eligibility checks.
CREATE OR REPLACE FUNCTION efg_private.legal_current_status_for(v_uid uuid)
 RETURNS TABLE(kind text, document_id uuid, version text, sha256 text, accepted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select doc.kind,doc.id,doc.version,doc.sha256,
  (receipt.user_id is not null) as accepted
 from public.efg_legal_documents doc
 left join public.efg_legal_acceptances receipt
  on receipt.document_id=doc.id and receipt.user_id=v_uid
 where v_uid is not null
  and doc.kind in ('terms','privacy')
  and doc.is_current and doc.published_at is not null
  and doc.sha256=pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(doc.body,'UTF8')),'hex')
 order by doc.kind;
$function$
;
revoke all on function efg_private.legal_current_status_for(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION efg_private.coach_pilot_entry_status_for(v_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_org uuid;
 v_coach uuid;
 v_receipt boolean := false;
 v_sharing boolean := false;
 v_intake public.efg_coach_relaunch_intakes%rowtype;
 v_plan public.efg_student_plan_access%rowtype;
 v_guide_goal uuid;
 v_guide_at timestamptz;
 v_guide jsonb;
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
 from efg_private.legal_current_status_for(v_uid) as doc where doc.accepted;
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
  elsif v_intake.objective is null or v_intake.age_years is null
     or v_intake.height_cm is null or v_intake.weight_kg is null
     or v_intake.activity_level is null or v_intake.dietary_pattern is null then
   v_route:='intake'; -- Incomplete or cleared intake cannot unlock daily logging.
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
    select f.guided_goal_id,f.guided_plan_approved_at,f.guided_plan
     into v_guide_goal,v_guide_at,v_guide
     from public.efg_food_plans f
     where f.student_id=v_uid and f.coach_id=v_coach;
    select exists(select 1 from public.efg_goals g
       where g.id=v_plan.published_goal_id and g.student_id=v_uid
         and g.approved_by=v_coach)
      into v_goal_ok;
    if v_goal_ok and v_guide_goal=v_plan.published_goal_id
      and v_guide_at is not null and v_guide_at>=v_intake.updated_at
      and (case
     when pg_catalog.jsonb_typeof(v_guide->'meals')='array' then (
      (v_guide->>'kind'='five_meal_example' and v_guide->>'version'='1'
        and pg_catalog.jsonb_array_length(v_guide->'meals')=5)
      or
      (v_guide->>'kind'='flexible_meal_guide' and v_guide->>'version'='2'
        and pg_catalog.jsonb_array_length(v_guide->'meals') between 2 and 6)
     ) else false
    end) then
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
$function$
;
revoke all on function efg_private.coach_pilot_entry_status_for(uuid) from public, anon, authenticated;

create or replace function public.efg_legal_current_status()
returns table(kind text, document_id uuid, version text, sha256 text, accepted boolean)
language sql stable security definer set search_path=''
as $$ select * from efg_private.legal_current_status_for(auth.uid()) $$;

create or replace function public.efg_coach_pilot_entry_status()
returns jsonb language sql stable security definer set search_path=''
as $$ select efg_private.coach_pilot_entry_status_for(auth.uid()) $$;

CREATE OR REPLACE FUNCTION efg_private.coach_diary_write_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_enabled boolean := false;
 v_role text;
 v_actor uuid;
 v_status jsonb;
begin
 select enabled into v_enabled
 from efg_private.coach_release_switches
 where switch_key='pilot_student_diary_write_gate';
 -- Preserve the existing maintenance exception; ordinary users cannot set auth.role.
 if auth.role()='service_role' then return new; end if;
 -- pg_cron runs as postgres. Match the write to an active owner's due
 -- schedule, its same-day run marker, and the exact saved meal.
 if session_user='postgres' and auth.uid() is null and exists (
  select 1 from public.efg_habitual_automation a
  join public.efg_habitual_automation_runs r on (r.user_id,r.meal)=(a.user_id,a.meal)
  join public.efg_habitual_meals h on h.id=a.habitual_id and h.student_id=a.user_id and h.meal_slot=a.meal
  join public.efg_profiles p on p.user_id=a.user_id and p.active and (p.role in ('coach','admin')
    or (p.role='student' and efg_private.coach_pilot_entry_status_for(p.user_id)->>'can_log_meals'='true'))
  where a.user_id=new.student_id and a.enabled and r.log_day=new.log_day
    and new.log_day=(statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::date
    and extract(isodow from statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::smallint=any(a.days)
    and a.run_at=date_trunc('minute',statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::time
    and case when tg_op='INSERT' then new.meals='{}'::jsonb and new.skipped='{}'::jsonb and new.sports='[]'::jsonb
      else new.student_id=old.student_id and new.log_day=old.log_day
       and new.skipped is not distinct from old.skipped and new.sports is not distinct from old.sports
       and coalesce(old.meals->a.meal,'[]'::jsonb)='[]'::jsonb
       and new.meals->a.meal=h.items and new.meals-a.meal=old.meals-a.meal end
 ) then return new; end if;
 -- Check OLD as well: changing owner cannot escape an enrolled student's gate.
 if tg_op='UPDATE' then
  if efg_private.p29_qa_scope_required(old.student_id,'student') then v_enabled:=true; end if;
 end if;
 if efg_private.p29_qa_scope_required(new.student_id,'student') then v_enabled:=true; end if;
 -- OFF for unregistered students retains legacy behavior.
 if v_enabled is distinct from true then return new; end if;

 -- Authenticated service maintenance is independent from the student's UI.
 v_role := auth.role();
 if v_role='service_role' then return new; end if;

 v_actor := auth.uid();
 if v_actor is null or new.student_id is distinct from v_actor then
  raise exception 'Only the signed student may write this diary after pilot release'
   using errcode='42501';
 end if;
 if tg_op='UPDATE' and new.student_id is distinct from old.student_id then
  raise exception 'Diary owner cannot change' using errcode='42501';
 end if;

 -- Active professional accounts own their personal diary; student publication
 -- remains mandatory for student profiles, including dual-role students.
 if exists(select 1 from public.efg_profiles p
   where p.user_id=v_actor and p.active=true and p.role in ('coach','admin')) then
  return new;
 end if;

 -- COACH116 legal-first status reads current signed coach/org, two legal
 -- versions, two pilot consents, shared general intake and published goal+guide.
 -- No browser-provided eligibility value can bypass this check.
 v_status:=public.efg_coach_pilot_entry_status();
 if pg_catalog.jsonb_typeof(v_status) is distinct from 'object' or
    v_status->>'route' is distinct from 'ready' or
    v_status->>'can_log_meals' is distinct from 'true' then
  raise exception 'Tu coach todavía debe publicar tu objetivo y guía antes de registrar comidas'
    using errcode='42501';
 end if;
 return new;
end;
$function$
;

commit;
