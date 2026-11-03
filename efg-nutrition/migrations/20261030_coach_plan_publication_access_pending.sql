-- COACH109 — additive access ledger for versioned Coach pilot publication.
-- Does not change legacy efg_goals, efg_food_plans, efg_daily_logs, or old API.
-- Existing and new students must complete the new onboarding before becoming
-- ready in the FUTURE pilot UI; current live UI must remain unchanged (flag OFF).
do $access_preflight$
begin
 if to_regclass('public.efg_student_plan_access') is not null then
  raise exception 'COACH109: access table exists, review prior installation';
 end if;
 if to_regclass('public.efg_coach_plan_drafts') is null
  or to_regclass('public.efg_coach_relaunch_intakes') is null
  or to_regclass('public.efg_pilot_participation_receipts') is null then
  raise exception 'COACH109: versioned pilot backend prerequisites missing';
 end if;
 if exists (
  select 1 from public.efg_profiles p
  left join public.efg_organizations o on o.id=p.organization_id
  where p.role='student' and (o.id is null or o.coach_id is null)
 ) then
  raise exception 'COACH109: student without organization/coach; do not infer recipient';
 end if;
end $access_preflight$;
create table public.efg_student_plan_access(
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 coach_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','published','paused')),
 published_goal_id uuid references public.efg_goals(id),
 published_at timestamptz,
 published_by uuid references auth.users(id),
 updated_at timestamptz not null default pg_catalog.clock_timestamp(),
 constraint efg_access_publish_consistent check(
  (status='published' and published_goal_id is not null and published_at is not null and published_by is not null)
  or (status<>'published')
 )
);
create index efg_plan_access_coach_idx on public.efg_student_plan_access(coach_id,status);
-- Only the NEW access ledger is initialized. A legacy goal must never count
-- as newly published and cannot unlock the COACH100 journey.
insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status)
select p.user_id,p.organization_id,o.coach_id,'pending'
from public.efg_profiles p
join public.efg_organizations o on o.id=p.organization_id
where p.role='student' and o.coach_id is not null;
alter table public.efg_student_plan_access enable row level security;
revoke all on public.efg_student_plan_access from public,anon,authenticated;
grant select on public.efg_student_plan_access to authenticated;
create policy efg_access_student_own on public.efg_student_plan_access
 for select to authenticated using(
  student_id=(select auth.uid()) and exists (
   select 1 from public.efg_profiles p
   where p.user_id=efg_student_plan_access.student_id
    and p.organization_id=efg_student_plan_access.organization_id and p.role='student'
  )
 );
create policy efg_access_coach_linked on public.efg_student_plan_access
 for select to authenticated using (
  coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id)
  and exists (
   select 1 from public.efg_pilot_participation_receipts r
   where r.student_id=efg_student_plan_access.student_id
    and r.organization_id=efg_student_plan_access.organization_id
    and r.version='coach_pilot_2026_demo1'
    and r.participation_accepted and r.sharing_accepted and r.revoked_at is null
  )
 );
-- No direct DML and no legacy trigger is installed. Future atomic publish RPC
-- will upsert this ledger within the same transaction as goal and five-meal guide.
