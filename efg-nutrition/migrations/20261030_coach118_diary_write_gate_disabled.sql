-- COACH118: staged, default-OFF server diary write gate for the major release.
-- Actual production student journeys are not switched until legal, verified food
-- composition, atomic coach publication, backup and two-organization real JWT QA.
-- This migration does not touch rows, goals, menus, receipts or existing RLS.
do $coach118_preflight$
begin
 if pg_catalog.to_regprocedure('public.efg_coach_pilot_entry_status()') is null
   or pg_catalog.to_regclass('public.efg_daily_logs') is null
   or pg_catalog.to_regnamespace('efg_private') is null then
  raise exception 'COACH118 prerequisites missing' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('efg_private.coach_release_switches') is not null
   or pg_catalog.to_regprocedure('efg_private.coach_diary_write_gate()') is not null
   or exists(select 1 from pg_catalog.pg_trigger where
    tgrelid='public.efg_daily_logs'::regclass and tgname='efg_coach_diary_release_gate') then
  raise exception 'COACH118 already present; inspect before migration' using errcode='55000';
 end if;
end $coach118_preflight$;

create table efg_private.coach_release_switches (
 switch_key text primary key check(switch_key ~ '^[a-z][a-z0-9_]{5,90}$'),
 enabled boolean not null default false,
 updated_at timestamptz not null default pg_catalog.now(),
 notes text not null default ''
);
alter table efg_private.coach_release_switches enable row level security;
revoke all on efg_private.coach_release_switches from public,anon,authenticated;
insert into efg_private.coach_release_switches(switch_key,enabled,notes)
 values('pilot_student_diary_write_gate',false,
 'OFF until atomic goal + 5-meal guide, legal/health consent and real JWT release go');

create function efg_private.coach_diary_write_gate()
returns trigger language plpgsql security definer set search_path=''
as $coach118_write$
declare
 v_enabled boolean := false;
 v_role text;
 v_actor uuid;
 v_status jsonb;
begin
 select enabled into v_enabled
 from efg_private.coach_release_switches
 where switch_key='pilot_student_diary_write_gate';
 -- OFF: preserve legacy PWA diary writes byte-for-byte.
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
$coach118_write$;
revoke all on function efg_private.coach_diary_write_gate()
 from public,anon,authenticated;

create trigger efg_coach_diary_release_gate
 before insert or update on public.efg_daily_logs
 for each row execute function efg_private.coach_diary_write_gate();

comment on table efg_private.coach_release_switches is
 'PRIVATE coach release switches. Student diary gate MUST stay disabled until
 legal docs reviewed, atomic server publish installed, clinical permissions and
 signed multi-org rollback tests pass. No browser DML.';
comment on function efg_private.coach_diary_write_gate() is
 'Default-OFF server gate for all NEW diary inserts/updates after COACH cutover.
 Reads signed owner and current published goal+guide; not a consent substitute.';
