-- COACH118 · STAGING ONLY, deliberate stop on hosted production.
-- The read-only COACH111/116 readiness RPC is NOT a write boundary.
-- This companion trigger protects INSERT/UPDATE of a student diary while
-- Coach major relaunch is ON, including direct REST calls to legacy tables.
-- DO NOT apply to public Supabase before actual atomic goal+guide publication,
-- two-org JWT tests, legal docs, backup/rollback and cutover readiness.
begin;
do $coach118_staging$
begin
 -- HOSTED COACH118 exists as a separate default-OFF release switch and trigger.
 -- Never apply this older STAGING-ONLY candidate over that migration: it would
 -- create a SECOND BEFORE trigger and a conflicting enablement switch.
 if pg_catalog.to_regclass('efg_private.coach_release_switches') is not null
   or pg_catalog.to_regprocedure('efg_private.coach_diary_write_gate()') is not null then
  raise exception 'COACH118 STOP: hosted-safe gate installed; do not install duplicate staging gate'
   using errcode='55000';
 end if;
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null then
  raise exception 'COACH118 STOP: disposable staging marker missing'
   using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_student_plan_access') is null
 or pg_catalog.to_regprocedure('public.efg_coach_pilot_entry_status()') is null then
  raise exception 'COACH118 STOP: server plan ledger or signed readiness RPC missing'
   using errcode='55000';
 end if;
end $coach118_staging$;

create table efg_private.coach_release_write_gates(
 name text primary key check(name='student_daily_logs'),
 enabled boolean not null default false,
 changed_at timestamptz not null default pg_catalog.now()
);
insert into efg_private.coach_release_write_gates(name,enabled)
values('student_daily_logs',false);
revoke all on efg_private.coach_release_write_gates from public,anon,authenticated;
alter table efg_private.coach_release_write_gates enable row level security;

create function efg_private.coach_enforce_diary_write()
returns trigger language plpgsql security definer set search_path=''
as $enforce$
declare
 v_enabled boolean := false;
 v_state jsonb;
begin
 -- No more restrictive than today's PWA until the approved release cutover.
 select enabled into v_enabled
 from efg_private.coach_release_write_gates
 where name='student_daily_logs';
 if v_enabled is distinct from true then
  return new;
 end if;
 if auth.uid() is null or new.student_id is distinct from auth.uid() then
  raise exception 'Diary write identity not verified' using errcode='42501';
 end if;
 v_state:=public.efg_coach_pilot_entry_status();
 if v_state->>'route' is distinct from 'ready'
  or v_state->>'can_log_meals' is distinct from 'true'
  or v_state->>'legal_current_accepted' is distinct from 'true' then
  raise exception 'Complete legal, pilot sharing, Coach plan publication before registering food'
   using errcode='42501';
 end if;
 return new;
end;
$enforce$;
revoke all on function efg_private.coach_enforce_diary_write()
 from public,anon,authenticated;

create trigger trg_efg_major_diary_write_gate
 before insert or update on public.efg_daily_logs
 for each row execute function efg_private.coach_enforce_diary_write();

-- Before approving cutover, separately verify:
-- * 2 isolated organizations and real auth JWT
-- * legacy historical SELECT/diaries unchanged
-- * direct REST insert/update denied for pending/unauthorized students
-- * valid published 5-meal guide and legal receipt permits writes
-- * no signing flag can be edited by clients
-- * idempotent atomic plan publishing, and one notification only
-- Keep disabled while the release/rollback is not independently approved.
commit;
