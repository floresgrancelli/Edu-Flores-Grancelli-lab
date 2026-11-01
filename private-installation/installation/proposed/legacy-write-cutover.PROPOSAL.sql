-- PRIVATE REVIEW DRAFT. Run ONLY after reviewed 001..006, in disposable CI first.
-- No data deletion, no SELECT/RLS/history changes, no new client grants.
BEGIN;
DO $preflight$ BEGIN
 IF to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') IS NULL
 OR to_regprocedure('efg_private.guide_binding_current(uuid)') IS NULL
 OR to_regclass('efg_private.coach119_atomic_transactions') IS NULL
 OR (SELECT enabled FROM efg_private.coach_release_switches
     WHERE switch_key='pilot_coach_atomic_publication') IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Reviewed 001..006 and publication OFF required';
 END IF;
END $preflight$;
-- Table grants AND any column grants must be closed. SELECT remains untouched.
DO $revoke$ DECLARE tab text; cols text; BEGIN
 FOREACH tab IN ARRAY ARRAY['efg_goals','efg_food_plans','efg_student_plan_access','efg_coach_plan_drafts'] LOOP
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON TABLE public.%I FROM public,anon,authenticated',tab);
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute
   WHERE attrelid=format('public.%I',tab)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.%I FROM public,anon,authenticated',cols,cols,cols,tab);
 END LOOP;
END $revoke$;
-- Retain the implementation for internal SECURITY DEFINER callers. Its public
-- legacy entry can replace a draft without a source binding, so close EXECUTE.
REVOKE EXECUTE ON FUNCTION public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)
 FROM public,anon,authenticated;
CREATE FUNCTION efg_private.require_coach119_publication_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $guard$
DECLARE student uuid; actor uuid; BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published records require controlled retention operation' USING ERRCODE='42501'; END IF;
 -- Provisioning may create pending access, never a published access grant.
 IF TG_TABLE_NAME='efg_student_plan_access' AND TG_OP='INSERT' THEN
  IF NEW.status='pending' AND NEW.published_goal_id IS NULL AND NEW.published_at IS NULL AND NEW.published_by IS NULL THEN RETURN NEW; END IF;
 END IF;
 student:=NEW.student_id;
 IF TG_TABLE_NAME='efg_goals' THEN actor:=NEW.approved_by; ELSE actor:=NEW.coach_id; END IF;
 IF TG_OP='UPDATE' AND OLD.student_id IS DISTINCT FROM student THEN
  RAISE EXCEPTION 'Publication identity cannot change' USING ERRCODE='42501';
 END IF;
 IF auth.uid() IS NULL OR actor IS DISTINCT FROM auth.uid()
 OR current_setting('efg.coach_atomic_publish',true) IS DISTINCT FROM 'on'
 OR NOT EXISTS(SELECT 1 FROM efg_private.coach119_atomic_transactions t
   JOIN efg_private.guide_source_bindings b ON b.student_id=t.student_id AND b.coach_id=t.coach_id AND b.draft_revision=t.draft_revision
   WHERE t.txid=txid_current() AND t.student_id=student AND t.coach_id=auth.uid())
 OR efg_private.guide_binding_current(student) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Only reviewed COACH119 transaction may publish' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION efg_private.require_coach119_publication_write() FROM public,anon,authenticated;
CREATE TRIGGER coach119_only_goal_write BEFORE INSERT OR UPDATE OR DELETE ON public.efg_goals
 FOR EACH ROW EXECUTE FUNCTION efg_private.require_coach119_publication_write();
CREATE TRIGGER coach119_only_guide_write BEFORE INSERT OR UPDATE OR DELETE ON public.efg_food_plans
 FOR EACH ROW EXECUTE FUNCTION efg_private.require_coach119_publication_write();
CREATE TRIGGER coach119_only_access_write BEFORE INSERT OR UPDATE OR DELETE ON public.efg_student_plan_access
 FOR EACH ROW EXECUTE FUNCTION efg_private.require_coach119_publication_write();
COMMIT;
