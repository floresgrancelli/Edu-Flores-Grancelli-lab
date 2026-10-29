-- EFG NUTRITION PRO · STAGING-ONLY DESIGN, 29/10/2026.
-- NOT A MIGRATION; DO NOT EXECUTE ON PRODUCTION. NEVER ENABLE THIS FEATURE DIRECTLY.
-- Depends on reviewed, staged 20261029_coach_intake_plan_access_DRAFT.sql.
-- This file implements DRAFT SAVING ONLY; it intentionally contains NO publish RPC.
-- Publication needs clinical/food/role/legality gates and a separate atomic RPC.
-- Staging must first have a demonstrably restorable backup and JWT A/B tests.
begin;

do $efg_preflight$
begin
  if pg_catalog.to_regclass('public.efg_student_intakes') is null
     or pg_catalog.to_regclass('public.efg_student_plan_access') is null then
    raise exception 'STAGING ONLY: prerequisite intake/access tables are missing';
  end if;
end
$efg_preflight$;

create table public.efg_coach_plan_drafts (
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 coach_id uuid not null references auth.users(id),
 source_intake_updated_at timestamptz not null,
 goal_proposal jsonb not null,
 guide_proposal jsonb,
 draft_revision bigint not null default 1 check (draft_revision > 0),
 status text not null default 'draft' check(status='draft'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint efg_coach_draft_goal_shape check (
   pg_catalog.jsonb_typeof(goal_proposal)='object'
   and pg_catalog.octet_length(goal_proposal::text) <= 8000
 ),
 constraint efg_coach_draft_guide_shape check (
   guide_proposal is null or (
     pg_catalog.jsonb_typeof(guide_proposal)='object'
     and pg_catalog.octet_length(guide_proposal::text) <= 30000
   )
 )
);
create index efg_coach_plan_drafts_coach_idx
 on public.efg_coach_plan_drafts(coach_id,updated_at desc);

alter table public.efg_coach_plan_drafts enable row level security;
revoke all on public.efg_coach_plan_drafts from public,anon,authenticated;
grant select on public.efg_coach_plan_drafts to authenticated;

-- No direct INSERT/UPDATE/DELETE policies or GRANTs: all editing must go via
-- authenticated, server-owned RPC. A draft must NEVER be readable by a student.
-- Current authorization is checked again on every read; consent revoked => hidden.
create policy coach_draft_read_own on public.efg_coach_plan_drafts
 for select to authenticated using (
  coach_id=(select auth.uid())
  and efg_private.coach_has_student(student_id)
  and exists (
   select 1 from public.efg_student_intakes intake
   where intake.student_id=efg_coach_plan_drafts.student_id
     and intake.organization_id=efg_coach_plan_drafts.organization_id
     and intake.shared_at is not null
  )
 );

create function public.efg_save_coach_plan_draft(
 p_student uuid,
 p_goal jsonb,
 p_guide jsonb,
 p_intake_updated_at timestamptz,
 p_expected_revision bigint default null
) returns bigint
language plpgsql
security definer
set search_path=''
as $efg_body$
declare
 v_coach uuid := auth.uid();
 v_organization uuid;
 v_updated timestamptz;
 v_revision bigint;
 v_key text;
 v_number numeric;
begin
 -- Never trust student or coach IDs supplied by the browser for authorization.
 if v_coach is null or p_student is null
   or not efg_private.coach_has_student(p_student) then
  raise exception 'Not authorized to save this student draft'
    using errcode='42501';
 end if;

 -- Lock the actual intake row before verifying sharing/version. This prevents
 -- simultaneous modifications while saving; publication must recheck separately.
 select intake.organization_id,intake.updated_at
 into v_organization,v_updated
 from public.efg_student_intakes intake
 join public.efg_profiles profile on profile.user_id=intake.student_id
 join public.efg_organizations org on org.id=profile.organization_id
 where intake.student_id=p_student
   and profile.active
   and profile.role='student'
   and intake.organization_id=profile.organization_id
   and org.coach_id=v_coach
   and intake.shared_at is not null
 for update of intake;
 if not found or p_intake_updated_at is null
   or v_updated is distinct from p_intake_updated_at then
  raise exception 'Intake not shared or changed; reopen the student intake'
   using errcode='42501';
 end if;

 if pg_catalog.jsonb_typeof(p_goal) is distinct from 'object'
   or pg_catalog.octet_length(p_goal::text)>8000
   or (p_goal->>'goal_type') not in ('fat_loss','recomp','muscle_gain')
   then raise exception 'Invalid nutrition goal proposal';
 end if;
 foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
   if pg_catalog.jsonb_typeof(p_goal->v_key) is distinct from 'number' then
     raise exception 'Missing/invalid numeric goal field: %',v_key;
   end if;
   v_number := (p_goal->>v_key)::numeric;
   if v_number < 0 or v_number > case v_key
     when 'kcal' then 10000 when 'fiber_g' then 150 when 'carb_g' then 2000
     else 1000 end then
     raise exception 'Goal field outside allowed bounds: %',v_key;
   end if;
 end loop;
 if (p_goal->>'kcal')::numeric < 1200 then
  raise exception 'Kcal below supported estimation range';
 end if;
 if p_guide is not null and (
  pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
  or pg_catalog.octet_length(p_guide::text)>30000
 ) then
   raise exception 'Invalid guide draft';
 end if;

 -- Versioned optimistic concurrency. A null expected revision only creates a
 -- fresh draft; it does not overwrite another coach tab or a previous save.
 if p_expected_revision is null then
   insert into public.efg_coach_plan_drafts(
     student_id,organization_id,coach_id,source_intake_updated_at,
     goal_proposal,guide_proposal
   ) values(p_student,v_organization,v_coach,p_intake_updated_at,p_goal,p_guide)
   on conflict (student_id) do nothing
   returning draft_revision into v_revision;
 else
   if p_expected_revision<1 then
     raise exception 'Invalid expected revision';
   end if;
   update public.efg_coach_plan_drafts
   set goal_proposal=p_goal,
       guide_proposal=p_guide,
       source_intake_updated_at=p_intake_updated_at,
       updated_at=now(),
       draft_revision=draft_revision+1
   where student_id=p_student
     and organization_id=v_organization
     and coach_id=v_coach
     and draft_revision=p_expected_revision
     and status='draft'
   returning draft_revision into v_revision;
 end if;
 if v_revision is null then
   raise exception 'Draft already exists or version changed; reload before editing'
    using errcode='40001';
 end if;
 return v_revision;
end
$efg_body$;

-- PostgreSQL gives new functions PUBLIC EXECUTE by default; revoke explicitly.
revoke all on function public.efg_save_coach_plan_draft(
 uuid,jsonb,jsonb,timestamptz,bigint) from public,anon,authenticated;
grant execute on function public.efg_save_coach_plan_draft(
 uuid,jsonb,jsonb,timestamptz,bigint) to authenticated;
commit;

-- REQUIRED BEFORE STAGING SIGN-OFF:
-- * Server-owned updated_at trigger on efg_student_intakes; current UI submits
--   a client timestamp. Migrate to server-owned revision, prevent forged versions.
-- * Token/session gate and current legal acceptance; none enforced here.
-- * Test authenticated Coach A/B, revoked sharing, historical/new student, and
--   direct REST writes (denied) with real JWTs in isolated staging.
-- * Verify malformed JSON and concurrent saves. Validate this SQL against real
--   PostgreSQL before checking it off; no runtime SQL test has been performed.
-- * Publication MUST NOT use this function alone. A separate audited RPC must
--   atomically write goal + guide + access pointer + idempotent notification,
--   with source-catalog restrictions checked server-side.
