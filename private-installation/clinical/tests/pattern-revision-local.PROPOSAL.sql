-- No rows or identities needed. Pure predicate used by BOTH real SQL paths.
-- NOT EXECUTED. Run only in disposable reviewed schema after R2 definitions.
BEGIN;
DO $test$ BEGIN
 IF efg_private.clinical_pattern_matches('omnivore',1,'same-goals','general',1,'same-goals') IS DISTINCT FROM true THEN RAISE EXCEPTION 'current general rejected'; END IF;
 IF efg_private.clinical_pattern_matches('keto',2,'same-goals','general',1,'same-goals') IS DISTINCT FROM false THEN RAISE EXCEPTION 'old general survived keto intake'; END IF;
 IF efg_private.clinical_pattern_matches('keto',2,'same-goals','general',2,'same-goals') IS DISTINCT FROM false THEN RAISE EXCEPTION 'contradictory current confirmation accepted'; END IF;
 IF efg_private.clinical_pattern_matches('keto',2,'same-goals','keto',1,'same-goals') IS DISTINCT FROM false THEN RAISE EXCEPTION 'old intake confirmation reused'; END IF;
 IF efg_private.clinical_pattern_matches('keto',2,'same-goals','keto',2,'same-goals') IS DISTINCT FROM true THEN RAISE EXCEPTION 'fresh keto confirmation rejected'; END IF;
 IF efg_private.clinical_pattern_matches('omnivore',2,'same-goals','keto',2,'same-goals') IS DISTINCT FROM false THEN RAISE EXCEPTION 'contradictory keto confirmation accepted'; END IF;
 IF efg_private.clinical_pattern_matches('keto',2,'new-goals','keto',2,'same-goals') IS DISTINCT FROM false THEN RAISE EXCEPTION 'old goal confirmation reused'; END IF;
 IF efg_private.clinical_pattern_matches(NULL,2,'same-goals','general',2,'same-goals') IS DISTINCT FROM false THEN RAISE EXCEPTION 'missing pattern became general'; END IF;
END $test$;
ROLLBACK;
