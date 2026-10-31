-- COACH68 NEGATIVE AND POSITIVE simulated-JWT claim tests, PG17 ROLLBACK ONLY.
-- Fictitious identities from NUT57 preupgrade fixture, not real users.
-- Must execute after all six versioned SQL modules, INSIDE the same transaction.
DO $coach68_behavior$
DECLARE
  v_src timestamptz;
  v_draft bigint;
  v_goal jsonb:='{"goal_type":"maintenance","kcal":2100,"protein_g":140,"carb_g":230,"fat_g":70,"fiber_g":28}'::jsonb;
BEGIN
 IF current_database()<>'efg_nut57_restored' THEN
   RAISE EXCEPTION 'COACH68 STOP: not the designated disposable PG17 restore';
 END IF;
 -- One fictitious authorized Coach / student, no real diagnosis data.
 INSERT INTO public.efg_coach_relaunch_intakes
  (student_id,organization_id,completed_version,revision,objective,dietary_pattern,shared_at,updated_at)
 VALUES
  ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
   'coach_major_2026_r1',1,'maintenance','omnivore',pg_catalog.now(),
   '2026-10-30T10:00:00+00');
 SELECT updated_at INTO v_src FROM public.efg_coach_relaunch_intakes
  WHERE student_id='22222222-2222-4222-8222-222222222222';
 PERFORM pg_catalog.set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 -- Coach A cannot act on student B in a different organization.
 BEGIN
  PERFORM public.efg_save_coach_plan_draft(
   '44444444-4444-4444-8444-444444444444',v_goal,null,v_src,1,null);
  RAISE EXCEPTION 'COACH68 FAIL: cross-organization save succeeded';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 -- A time-matching but stale/forged source revision must fail.
 BEGIN
  PERFORM public.efg_save_coach_plan_draft(
   '22222222-2222-4222-8222-222222222222',v_goal,null,v_src,0,null);
  RAISE EXCEPTION 'COACH68 FAIL: revision zero saved';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 -- The current, explicitly shared version may save a PRIVATE Coach draft.
 SELECT public.efg_save_coach_plan_draft(
  '22222222-2222-4222-8222-222222222222',v_goal,null,v_src,1,null)
 INTO v_draft;
 IF v_draft<>1 OR NOT EXISTS(
  SELECT 1 FROM public.efg_coach_plan_drafts
  WHERE student_id='22222222-2222-4222-8222-222222222222'
   AND source_intake_revision=1 AND status='draft') THEN
   RAISE EXCEPTION 'COACH68 FAIL: valid revision not bound to saved draft';
 END IF;
 -- Another edit to the same version must invalidate the source revision
 -- even if the timestamp were coincidentally identical.
 UPDATE public.efg_coach_relaunch_intakes SET revision=2
 WHERE student_id='22222222-2222-4222-8222-222222222222';
 BEGIN
  PERFORM public.efg_save_coach_plan_draft(
   '22222222-2222-4222-8222-222222222222',v_goal,null,v_src,1,1);
  RAISE EXCEPTION 'COACH68 FAIL: stale intake revision saved';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 -- Taking away the student's share also denies a previously authorized Coach.
 UPDATE public.efg_coach_relaunch_intakes SET shared_at=null
 WHERE student_id='22222222-2222-4222-8222-222222222222';
 BEGIN
  PERFORM public.efg_save_coach_plan_draft(
   '22222222-2222-4222-8222-222222222222',v_goal,null,v_src,2,1);
  RAISE EXCEPTION 'COACH68 FAIL: revoked share accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 IF (SELECT count(*) FROM public.efg_goals)<>1
   OR (SELECT count(*) FROM public.efg_daily_logs)<>1
   OR (SELECT count(*) FROM public.efg_notifications)<>1 THEN
  RAISE EXCEPTION 'COACH68 FAIL: fake historical data unexpectedly changed';
 END IF;
 RAISE NOTICE 'PASS COACH68 SIMULATED CLAIMS: cross-org, invalid source, valid private save, stale revision and share revoke. ROLLBACK follows.';
END $coach68_behavior$;
