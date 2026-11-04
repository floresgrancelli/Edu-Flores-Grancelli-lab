-- PRIVATE PROPOSAL based on metadata 2026-11-01 22:12 UTC. NOT EXECUTED.
BEGIN;
DO $check$ BEGIN
 IF (SELECT qual FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='efg_coach_relaunch_intakes' AND policyname='efg_coach_relaunch_owner_select') IS DISTINCT FROM '((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.role = ''student''::text) AND p.active AND (p.organization_id = p.organization_id)))))' THEN
  RAISE EXCEPTION 'Policy changed since reviewed metadata: efg_coach_relaunch_owner_select';
 END IF;
END $check$;
ALTER POLICY efg_coach_relaunch_owner_select ON public.efg_coach_relaunch_intakes USING (
 student_id=(SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.efg_profiles p WHERE p.user_id=(SELECT auth.uid())
   AND p.role='student' AND p.active AND p.organization_id=efg_coach_relaunch_intakes.organization_id
 ));
DO $check$ BEGIN
 IF (SELECT qual FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='efg_pilot_participation_receipts' AND policyname='efg_pilot_participation_owner_read') IS DISTINCT FROM '((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.role = ''student''::text) AND p.active AND (p.organization_id = p.organization_id)))))' THEN
  RAISE EXCEPTION 'Policy changed since reviewed metadata: efg_pilot_participation_owner_read';
 END IF;
END $check$;
ALTER POLICY efg_pilot_participation_owner_read ON public.efg_pilot_participation_receipts USING (
 student_id=(SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.efg_profiles p WHERE p.user_id=(SELECT auth.uid())
   AND p.role='student' AND p.active AND p.organization_id=efg_pilot_participation_receipts.organization_id
 ));
COMMIT;
