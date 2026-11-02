-- Invoked only by attested install.mjs finally, after row restoration.
DROP TRIGGER efg_coach_diary_release_gate ON public.efg_daily_logs;
DROP FUNCTION efg_private.coach_diary_write_gate();
DROP POLICY diary_fixture_insert ON public.efg_daily_logs;
DROP POLICY diary_fixture_update ON public.efg_daily_logs;
REVOKE INSERT,UPDATE ON public.efg_daily_logs FROM authenticated;
DELETE FROM efg_private.coach_release_switches WHERE switch_key='pilot_student_diary_write_gate';
