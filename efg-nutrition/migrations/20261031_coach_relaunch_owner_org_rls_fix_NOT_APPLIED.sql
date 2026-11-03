-- COACH-SEC-09 · corrective migration for COACH107 installs, NOT APPLIED.
-- The unqualified organization_id in the original Coach107 and Coach106
-- owner policies resolved to the inner efg_profiles row (self-comparison).
-- A transferred student could read old private intake and participation
-- receipts from the former organization unless both policies are repaired.
-- Execute ONLY after approved staging restore, role/JWT A/B regression and GO.
-- No user rows, consent records, historical intakes or grants are modified.
begin;
do $preflight$
begin
 if to_regclass('public.efg_coach_relaunch_intakes') is null
    or to_regclass('public.efg_pilot_participation_receipts') is null
    or to_regclass('public.efg_profiles') is null then
  raise exception 'COACH-SEC-09: relaunch schema missing';
 end if;
 if not exists(
  select 1 from pg_catalog.pg_policy p
  where p.polrelid='public.efg_coach_relaunch_intakes'::regclass
   and p.polname='efg_coach_relaunch_owner_select'
   and p.polcmd='r' and p.polpermissive
 ) then
  raise exception 'COACH-SEC-09: owner SELECT policy differs; manual review required';
 end if;
 if not exists(
  select 1 from pg_catalog.pg_policy p
  where p.polrelid='public.efg_pilot_participation_receipts'::regclass
   and p.polname='efg_pilot_participation_owner_read'
   and p.polcmd='r' and p.polpermissive
 ) then
  raise exception 'COACH-SEC-09: pilot receipt SELECT policy differs; manual review required';
 end if;
end
$preflight$;

alter policy efg_coach_relaunch_owner_select
 on public.efg_coach_relaunch_intakes
 using (
  student_id=(select auth.uid()) and exists (
   select 1 from public.efg_profiles p
   where p.user_id=(select auth.uid()) and p.role='student'
    and p.active is true
    and p.organization_id=efg_coach_relaunch_intakes.organization_id
  )
 );
alter policy efg_pilot_participation_owner_read
 on public.efg_pilot_participation_receipts
 using (
  student_id=(select auth.uid()) and exists (
   select 1 from public.efg_profiles p
   where p.user_id=(select auth.uid()) and p.role='student'
    and p.active is true
    and p.organization_id=efg_pilot_participation_receipts.organization_id
  )
 );
commit;

-- Required isolated postcheck: signed student JWT A with an old PRIVATE intake
-- in org A; move ONLY the synthetic profile to org B; SELECT must return 0
-- rows; restore org A and SELECT must return 1. Coach B must never see it.
