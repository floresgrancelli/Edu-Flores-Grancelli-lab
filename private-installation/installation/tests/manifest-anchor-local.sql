-- NOT EXECUTED. Only in the separately authorized disposable runner after 002
-- and the reviewed official fixture import. Never creates a policy or source.
-- Caller sets: SET efg.test_disposable_installation='on'; on that local DB only.
BEGIN;
DO $test$
DECLARE f efg_private.coach_reviewed_foods%rowtype; original efg_private.coach_reviewed_foods%rowtype;
 p jsonb; policy_key text; original_manifest jsonb; tests integer:=0;
BEGIN
 IF current_setting('efg.test_disposable_installation',true) IS DISTINCT FROM 'on'
  OR inet_server_addr() IS NOT NULL AND NOT (inet_server_addr()<<inet '127.0.0.0/8' OR inet_server_addr()=inet '::1')
 THEN RAISE EXCEPTION 'Disposable loopback runner opt-in required'; END IF;
 SELECT food.* INTO original FROM efg_private.coach_reviewed_foods food
 WHERE food.evidence_status='automated_validated' AND efg_private.coach_food_evidence_current(food)
 ORDER BY food.food_id LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Expected imported official positive fixture, no synthetic fallback'; END IF;
 policy_key:=original.automatic_provenance->>'policyVersion';
 SELECT manifest INTO original_manifest FROM efg_private.nutrition_import_policies
 WHERE policy_version=policy_key FOR UPDATE;
 -- Positive unchanged imported row; existing expired or TEST_ONLY rows are not selected.
 IF efg_private.coach_food_evidence_current(original) IS DISTINCT FROM true THEN RAISE EXCEPTION 'positive'; END IF;
 tests:=tests+1;
 -- Joint food+provenance alteration used to pass despite unchanged official manifest.
 f:=original; f.k:=f.k+1;
 f.automatic_provenance:=jsonb_set(f.automatic_provenance,'{perUnit,k}',to_jsonb(f.k));
 IF efg_private.coach_food_evidence_current(f) IS DISTINCT FROM false THEN RAISE EXCEPTION 'joint alteration accepted'; END IF;
 tests:=tests+1;
 f:=original; f.p:=f.p+1;
 IF efg_private.coach_food_evidence_current(f) IS DISTINCT FROM false THEN RAISE EXCEPTION 'food alteration accepted'; END IF;
 tests:=tests+1;
 f:=original; f.automatic_provenance:=jsonb_set(f.automatic_provenance,'{perUnit,c}',to_jsonb(f.c+1));
 IF efg_private.coach_food_evidence_current(f) IS DISTINCT FROM false THEN RAISE EXCEPTION 'provenance alteration accepted'; END IF;
 tests:=tests+1;
 UPDATE efg_private.nutrition_import_policies
 SET manifest=jsonb_set(original_manifest,ARRAY[original.food_id,'perUnit'],'{}'::jsonb)
 WHERE policy_version=policy_key;
 IF efg_private.coach_food_evidence_current(original) IS DISTINCT FROM false THEN RAISE EXCEPTION 'missing manifest nutrients accepted'; END IF;
 tests:=tests+1;
 UPDATE efg_private.nutrition_import_policies
 SET manifest=jsonb_set(original_manifest,ARRAY[original.food_id,'perUnit','fi'],'"0"'::jsonb)
 WHERE policy_version=policy_key;
 IF efg_private.coach_food_evidence_current(original) IS DISTINCT FROM false THEN RAISE EXCEPTION 'string nutrient accepted'; END IF;
 tests:=tests+1;
 UPDATE efg_private.nutrition_import_policies SET manifest=original_manifest WHERE policy_version=policy_key;
 IF efg_private.coach_food_evidence_current(original) IS DISTINCT FROM true THEN RAISE EXCEPTION 'restore positive failed'; END IF;
 tests:=tests+1;
 RAISE NOTICE 'manifest-anchor: % assertions completed (local only)',tests;
END $test$;
ROLLBACK;
