-- EFG Nutrition Pro: additive metadata for the coach-approved five-meal educational guide.
-- No existing goals, logs, consent or recipes are changed by this migration.
ALTER TABLE public.efg_food_plans
 ADD COLUMN IF NOT EXISTS guided_plan jsonb,
 ADD COLUMN IF NOT EXISTS guided_goal_id uuid REFERENCES public.efg_goals(id),
 ADD COLUMN IF NOT EXISTS guided_plan_approved_at timestamptz;
ALTER TABLE public.efg_food_plans
 ADD CONSTRAINT efg_guided_plan_shape CHECK (
  guided_plan IS NULL OR (
   jsonb_typeof(guided_plan)='object'
   AND guided_plan->>'kind'='five_meal_example'
   AND jsonb_typeof(guided_plan->'meals')='array'
   AND jsonb_array_length(guided_plan->'meals')=5
   AND octet_length(guided_plan::text)<30000
   AND guided_goal_id IS NOT NULL
   AND guided_plan_approved_at IS NOT NULL
  )
 );
-- A goal ID must belong to the same student's approved-goal history.
CREATE OR REPLACE FUNCTION efg_private.verify_guide_goal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NEW.guided_plan IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.efg_goals g WHERE g.id=NEW.guided_goal_id
     AND g.student_id=NEW.student_id AND g.approved_by=NEW.coach_id
 ) THEN RAISE EXCEPTION 'Guide goal must belong to this student and coach'; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS efg_verify_guide_goal ON public.efg_food_plans;
CREATE TRIGGER efg_verify_guide_goal BEFORE INSERT OR UPDATE
 ON public.efg_food_plans FOR EACH ROW EXECUTE FUNCTION efg_private.verify_guide_goal();
