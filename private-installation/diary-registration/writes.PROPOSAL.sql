-- ONLY attested disposable runner. Existing table/SELECT policy retained.
DO $guard$ BEGIN
 IF current_user<>'postgres' OR current_setting('efg.qa.diary_write',true) IS DISTINCT FROM 'attested_incremental'
 OR to_regclass('public.efg_daily_logs') IS NULL
 OR to_regclass('efg_private.coach_release_switches') IS NULL
 OR to_regprocedure('public.efg_coach_pilot_entry_status()') IS NULL
 OR to_regprocedure('efg_private.coach_diary_write_gate()') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.efg_daily_logs'::regclass AND tgname='efg_coach_diary_release_gate')
 OR EXISTS(SELECT 1 FROM efg_private.coach_release_switches WHERE switch_key='pilot_student_diary_write_gate')
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='efg_daily_logs' AND cmd<>'SELECT')
 THEN RAISE EXCEPTION 'Unexpected diary baseline; stop and inspect'; END IF;
END $guard$;
GRANT INSERT,UPDATE ON public.efg_daily_logs TO authenticated;
CREATE POLICY diary_fixture_insert ON public.efg_daily_logs FOR INSERT TO authenticated WITH CHECK(student_id=(SELECT auth.uid()));
CREATE POLICY diary_fixture_update ON public.efg_daily_logs FOR UPDATE TO authenticated USING(student_id=(SELECT auth.uid())) WITH CHECK(student_id=(SELECT auth.uid()));
INSERT INTO efg_private.coach_release_switches(switch_key,enabled,notes)
VALUES('pilot_student_diary_write_gate',true,'TEST_ONLY disposable diary write exercise');
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

