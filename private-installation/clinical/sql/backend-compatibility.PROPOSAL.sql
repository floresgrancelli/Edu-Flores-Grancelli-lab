-- PRIVATE, NOT APPLIED. After clinical-provider.PROPOSAL.sql. No new grants.
-- All persisted compatibility decisions execute inside existing PostgreSQL.
BEGIN;
ALTER TABLE efg_private.clinical_source_versions ADD COLUMN normalized_text text;
-- Empty registry only: never backfill an attestation from an untrusted record.
DO $p$ BEGIN IF EXISTS(SELECT 1 FROM efg_private.clinical_source_versions) THEN
 RAISE EXCEPTION 'Review original normalized capture text before altering nonempty registry'; END IF; END $p$;
ALTER TABLE efg_private.clinical_source_versions ALTER COLUMN normalized_text SET NOT NULL;
CREATE UNIQUE INDEX clinical_source_one_active ON efg_private.clinical_source_versions((normalized_record->>'foodId'),(normalized_record->>'restriction')) WHERE manifest->>'active'='true';
CREATE TABLE efg_private.clinical_pattern_reviews(
 student_id uuid PRIMARY KEY REFERENCES public.efg_profiles(user_id),coach_id uuid NOT NULL,
 organization_id uuid NOT NULL,intake_revision integer NOT NULL CHECK(intake_revision>0),goal_digest text NOT NULL,kind text NOT NULL CHECK(kind IN ('general','keto')),
 max_carb_g numeric,revision bigint NOT NULL,confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((kind='general' AND max_carb_g IS NULL) OR (kind='keto' AND max_carb_g>0 AND max_carb_g<2000))
);
ALTER TABLE efg_private.clinical_pattern_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON efg_private.clinical_pattern_reviews FROM PUBLIC,anon,authenticated;
CREATE FUNCTION efg_private.clinical_pattern_matches(p_dietary text,p_intake integer,p_goal text,p_kind text,p_review_intake integer,p_review_goal text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $f$
 SELECT coalesce(p_intake>0 AND p_review_intake=p_intake AND p_goal=p_review_goal
 AND p_kind=CASE p_dietary WHEN 'omnivore' THEN 'general' WHEN 'keto' THEN 'keto' ELSE NULL END,false);
$f$;
REVOKE ALL ON FUNCTION efg_private.clinical_pattern_matches(text,integer,text,text,integer,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION efg_private.clinical_confirm_pattern(p_student uuid,p_expected_draft bigint,p_kind text,p_max_carb numeric)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE d record; i record; r bigint;
BEGIN
 IF auth.uid() IS NULL OR NOT efg_private.coach_has_student(p_student) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 PERFORM efg_private.clinical_lock_context(p_student);
 SELECT * INTO i FROM public.efg_coach_relaunch_intakes WHERE student_id=p_student FOR UPDATE;
 PERFORM 1 FROM efg_private.efg_coach_health_intakes WHERE student_id=p_student FOR UPDATE;
 SELECT * INTO d FROM public.efg_coach_plan_drafts WHERE student_id=p_student FOR UPDATE;
 IF d.coach_id IS DISTINCT FROM auth.uid() OR d.status IS DISTINCT FROM 'draft' OR d.draft_revision IS DISTINCT FROM p_expected_draft
 OR d.organization_id IS DISTINCT FROM i.organization_id OR i.shared_at IS NULL
 OR NOT efg_private.coach_pilot_share_active(p_student,d.organization_id) THEN RAISE EXCEPTION 'Stale context' USING ERRCODE='PT409'; END IF;
 IF efg_private.clinical_pattern_matches(i.dietary_pattern,i.revision,md5(d.goal_proposal::text),p_kind,i.revision,md5(d.goal_proposal::text)) IS DISTINCT FROM true
 OR p_kind IS NULL OR p_kind NOT IN ('general','keto') OR (p_kind='keto' AND (p_max_carb IS NULL OR p_max_carb<=0 OR p_max_carb>=2000
 OR (d.goal_proposal->>'carb_g')::numeric>p_max_carb)) OR (p_kind='general' AND p_max_carb IS NOT NULL)
 THEN RAISE EXCEPTION 'Pattern conflicts with saved goals' USING ERRCODE='22023'; END IF;
 INSERT INTO efg_private.clinical_pattern_reviews VALUES(p_student,auth.uid(),d.organization_id,i.revision,md5(d.goal_proposal::text),p_kind,p_max_carb,1,clock_timestamp())
 ON CONFLICT(student_id) DO UPDATE SET coach_id=excluded.coach_id,organization_id=excluded.organization_id,intake_revision=excluded.intake_revision,goal_digest=excluded.goal_digest,
 kind=excluded.kind,max_carb_g=excluded.max_carb_g,revision=clinical_pattern_reviews.revision+1,confirmed_at=clock_timestamp() RETURNING revision INTO r;
 DELETE FROM efg_private.clinical_compatibility_receipts WHERE student_id=p_student;
 RETURN r;
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_confirm_pattern(uuid,bigint,text,numeric) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION efg_private.clinical_declaration_supported(h efg_private.efg_coach_health_intakes)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $f$
 SELECT CASE WHEN h.conditions='{}'::jsonb THEN
 h.restriction_declaration->>'kind'='none_declared' AND h.restriction_declaration->>'declared_by'=h.student_id::text
 AND h.restriction_declaration->>'source_revision'=h.revision::text
 ELSE jsonb_typeof(h.conditions)='object'
 AND EXISTS(SELECT 1 FROM jsonb_each_text(h.conditions) e WHERE e.value IN ('suspected','confirmed'))
 AND NOT EXISTS(SELECT 1 FROM jsonb_each_text(h.conditions) e WHERE e.key NOT IN ('celiac','lactose_intolerance') OR e.value NOT IN ('suspected','confirmed','not_reported')) END;
$f$;
REVOKE ALL ON FUNCTION efg_private.clinical_declaration_supported(efg_private.efg_coach_health_intakes) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION efg_private.clinical_snapshot(p_student uuid,p_recipe jsonb DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE ctx jsonb; recipe jsonb; pattern record; item jsonb; food efg_private.coach_reviewed_foods%rowtype;
 src record; m jsonb; e jsonb; restriction text; restrictions text[]; decisions jsonb:='[]'; conditions jsonb; ids jsonb;
 color text; reason text; eligible boolean; unknown boolean; red boolean; qty numeric; total_carb numeric:=0;
 deadline timestamptz:='infinity'; wall timestamptz; match_count integer; clinical_key text; source_rows jsonb; catalog jsonb;
 goal_digest text; pattern_json jsonb; fingerprint text; all_ready boolean:=true;
BEGIN
 ctx:=efg_private.clinical_provider_context(p_student);recipe:=coalesce(p_recipe,ctx->'plan');
 IF NOT efg_private.clinical_declaration_supported((SELECT h FROM efg_private.efg_coach_health_intakes h WHERE h.student_id=p_student))
 THEN RAISE EXCEPTION 'Explicit supported declaration required' USING ERRCODE='42501'; END IF;
 IF recipe IS NULL OR recipe='null'::jsonb THEN RETURN jsonb_build_object('state','needs_recipe','compatibilityReady',false,'publishable',false); END IF;
 IF jsonb_typeof(recipe->'meals') IS DISTINCT FROM 'array' OR jsonb_array_length(recipe->'meals') NOT BETWEEN 1 AND 5
 THEN RAISE EXCEPTION 'Invalid recipe' USING ERRCODE='22023'; END IF;
 SELECT coalesce(array_agg(CASE key WHEN 'celiac' THEN 'gluten' ELSE key END ORDER BY key),'{}') INTO restrictions
 FROM jsonb_each_text(ctx->'conditions') WHERE value IN ('confirmed','suspected');
 SELECT * INTO pattern FROM efg_private.clinical_pattern_reviews WHERE student_id=p_student FOR SHARE;
 IF FOUND THEN
  IF pattern.coach_id IS DISTINCT FROM auth.uid() OR pattern.organization_id::text IS DISTINCT FROM ctx->>'organizationId'
  OR efg_private.clinical_pattern_matches(ctx->>'dietaryPattern',(ctx->>'intakeRevision')::integer,md5((ctx->'goal')::text),pattern.kind,pattern.intake_revision,pattern.goal_digest) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Reconfirm pattern for current goals' USING ERRCODE='PT409'; END IF;
  pattern_json:=jsonb_build_object('kind',pattern.kind,'coachConfirmed',true,'maxCarbG',pattern.max_carb_g,'revision',pattern.revision,'intakeRevision',pattern.intake_revision);
 ELSE
  IF ctx->>'dietaryPattern'='keto' THEN RAISE EXCEPTION 'Coach pattern confirmation required' USING ERRCODE='PT409'; END IF;
  pattern_json:=jsonb_build_object('kind','general','revision',0);
 END IF;
 -- Private evidence/catalog tables are locked by context. Locks do not freeze TTL.
 wall:=clock_timestamp();
 FOR item IN SELECT x FROM jsonb_array_elements(recipe->'meals') meal,LATERAL jsonb_array_elements(meal->'items') x LOOP
  IF jsonb_typeof(item->'qty') IS DISTINCT FROM 'number' OR (item->>'qty')::numeric<=0 OR (item->>'qty')::numeric>10000
  OR item->>'unit' NOT IN ('g','ml') OR item->>'unit' IS NULL OR item->>'id' IS NULL THEN RAISE EXCEPTION 'Invalid portion/unit' USING ERRCODE='22023'; END IF;
  qty:=(item->>'qty')::numeric;conditions:='[]';ids:='[]';unknown:=false;red:=false;color:='yellow';reason:='Falta información verificable.';
  SELECT * INTO food FROM efg_private.coach_reviewed_foods WHERE food_id=item->>'id';
  IF NOT FOUND OR food.unit IS DISTINCT FROM item->>'unit' OR food.expires_at IS NULL OR food.expires_at<=wall
  OR NOT efg_private.coach_food_evidence_current(food) THEN unknown:=true;
  ELSE
   deadline:=least(deadline,food.expires_at);total_carb:=total_carb+food.c*qty;
   FOREACH restriction IN ARRAY restrictions LOOP
    SELECT count(*) INTO match_count FROM efg_private.clinical_source_versions s WHERE s.normalized_record->>'foodId'=food.food_id AND s.normalized_record->>'restriction'=restriction AND s.manifest->>'active'='true';
    IF match_count<>1 THEN unknown:=true;CONTINUE; END IF;
    SELECT * INTO src FROM efg_private.clinical_source_versions s WHERE s.normalized_record->>'foodId'=food.food_id AND s.normalized_record->>'restriction'=restriction AND s.manifest->>'active'='true';
    m:=src.manifest;e:=src.normalized_record;
    -- Digests anchor originals to protected server-import manifest, not browser flags.
    IF m->>'environment' IS DISTINCT FROM 'production' OR m->>'active' IS DISTINCT FROM 'true'
     OR coalesce(m->>'sourceVersion','')='' OR coalesce(m->>'pipelineVersion','')=''
     OR m->>'rawDigest' IS DISTINCT FROM encode(sha256(convert_to(src.original_text,'UTF8')),'hex')
     OR m->>'normalizedDigest' IS DISTINCT FROM encode(sha256(convert_to(src.normalized_text,'UTF8')),'hex')
     OR src.normalized_text::jsonb IS DISTINCT FROM e
     OR (m->>'capturedAt')::timestamptz IS NULL OR (m->>'capturedAt')::timestamptz>wall
     OR (m->>'reviewAfter')::timestamptz IS NULL OR (m->>'reviewAfter')::timestamptz<=wall
     OR e->>'preparation' IS NULL OR e->>'preparation' NOT IN ('raw','cooked','fresh_unseasoned','packaged','breaded','as_sold')
     OR e->>'preparation' IS DISTINCT FROM food.automatic_provenance->>'preparation'
     OR e->>'productId' IS DISTINCT FROM food.automatic_provenance->>'productId'
     OR e->>'unit' IS DISTINCT FROM food.unit OR e->>'id' IS NULL
     OR (e->>'minQty')::numeric IS NULL OR (e->>'maxQty')::numeric IS NULL
     OR qty<(e->>'minQty')::numeric OR qty>(e->>'maxQty')::numeric
     OR jsonb_typeof(e->'conditions') IS DISTINCT FROM 'array' OR jsonb_array_length(e->'conditions')=0
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(e->'conditions') c WHERE jsonb_typeof(c)<>'string' OR btrim(c#>>'{}')='')
    THEN unknown:=true;CONTINUE; END IF;
    IF restriction='lactose_intolerance' THEN unknown:=true;CONTINUE; END IF;
    IF (e->>'basis'='verified_product' AND e->>'verdict'='compatible' AND coalesce(e->>'productId','')<>''
      AND coalesce(e->>'rnpa','')<>'' AND e->>'listingStatus'='Vigente'
      AND m->>'captureMethod'='official_product_capture' AND m->>'sourceUrl' ~ '^https://listadoalg[.]anmat[.]gob[.]ar/')
     OR (e->>'basis'='fresh_unseasoned' AND e->>'verdict'='compatible' AND e->>'preparation'='fresh_unseasoned'
      AND e->>'productId' IS NULL AND e->>'singleIngredient'='true' AND m->>'captureMethod'='official_general_rule'
      AND m->>'sourceUrl' ~ '^https://(www[.]argentina[.]gob[.]ar|www[.]niddk[.]nih[.]gov)/') THEN
      conditions:=conditions||(e->'conditions');
    ELSIF e->>'basis'='documented_ingredient' AND e->>'verdict'='contains' AND m->>'captureMethod'='official_general_rule'
      AND m->>'sourceUrl' ~ '^https://(www[.]argentina[.]gob[.]ar|www[.]niddk[.]nih[.]gov)/' THEN red:=true;
    ELSE unknown:=true;CONTINUE; END IF;
    ids:=ids||jsonb_build_array(e->>'id');deadline:=least(deadline,(m->>'reviewAfter')::timestamptz);
   END LOOP;
  END IF;
  IF pattern_json->>'kind'='keto' AND (ctx->'goal'->>'carb_g')::numeric>(pattern_json->>'maxCarbG')::numeric THEN unknown:=true;END IF;
  eligible:=NOT unknown AND NOT red;
  IF red THEN color:='red';reason:='Contiene gluten.';
  ELSIF unknown THEN color:='yellow';reason:='Revisar evidencia, ingredientes, preparación o patrón.';
  ELSE color:=CASE WHEN cardinality(restrictions)>0 OR pattern_json->>'kind'='keto' THEN 'green' ELSE 'neutral' END;reason:=CASE WHEN cardinality(restrictions)>0 THEN 'Compatible bajo estas condiciones.' ELSE 'Compatible con la propuesta.' END;END IF;
  IF pattern_json->>'kind'='keto' AND (ctx->'goal'->>'carb_g')::numeric<=(pattern_json->>'maxCarbG')::numeric
   AND food.c*qty<=(pattern_json->>'maxCarbG')::numeric THEN
   conditions:=conditions||jsonb_build_array('La suma del día debe respetar los hidratos acordados.');
  END IF;
  -- Same priority as common evaluator: known gluten incompatibility wins;
  -- otherwise a concrete portion exceeding a confirmed keto budget is red.
  IF NOT red AND pattern_json->>'kind'='keto' AND (ctx->'goal'->>'carb_g')::numeric<=(pattern_json->>'maxCarbG')::numeric
   AND food.c*qty>(pattern_json->>'maxCarbG')::numeric THEN
   color:='red';reason:='Esta porción supera los hidratos del patrón.';eligible:=false;
  END IF;
  IF (ctx->'dislikedIds') ? (item->>'id') THEN color:='neutral';reason:='No elegido por gusto.';eligible:=false;END IF;
  decisions:=decisions||jsonb_build_array(jsonb_build_object('foodId',item->>'id','qty',qty,'unit',item->>'unit','color',color,'reason',reason,'eligible',eligible,'conditions',conditions,'evidenceIds',ids));
  all_ready:=all_ready AND eligible;
 END LOOP;
 IF jsonb_array_length(decisions)=0 THEN RAISE EXCEPTION 'Empty recipe' USING ERRCODE='22023'; END IF;
 IF pattern_json->>'kind'='keto' AND total_carb>(pattern_json->>'maxCarbG')::numeric THEN all_ready:=false;END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') INTO source_rows FROM efg_private.clinical_source_versions s
 WHERE s.normalized_record->>'foodId' IN(SELECT d->>'foodId' FROM jsonb_array_elements(decisions) d);
 SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.food_id),'[]') INTO catalog FROM efg_private.coach_reviewed_foods f
 WHERE f.food_id IN(SELECT d->>'foodId' FROM jsonb_array_elements(decisions) d);
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('context',ctx-'now'-'pattern','recipe',recipe,'pattern',pattern_json,'catalog',catalog,'sources',source_rows)::text,'UTF8')),'hex');
 IF deadline<=clock_timestamp() THEN RAISE EXCEPTION 'Evidence expired during evaluation' USING ERRCODE='PT409'; END IF;
 RETURN jsonb_build_object('binding',fingerprint,'decisions',decisions,'compatibilityReady',all_ready,'publishable',false,
 'validUntil',CASE WHEN deadline='infinity'::timestamptz THEN NULL ELSE deadline END,'pattern',pattern_json,
 'draftRevision',ctx->'draftRevision','studentId',p_student,'actorId',auth.uid(),'organizationId',ctx->>'organizationId');
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_snapshot(uuid,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION efg_private.clinical_bind_saved(p_student uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE r jsonb;BEGIN
 r:=efg_private.clinical_snapshot(p_student);
 IF r->>'binding' IS NULL THEN RETURN r;END IF;
 INSERT INTO efg_private.clinical_compatibility_receipts(student_id,coach_id,organization_id,draft_revision,binding,result)
 VALUES(p_student,auth.uid(),(r->>'organizationId')::uuid,(r->>'draftRevision')::bigint,r->>'binding',r)
 ON CONFLICT(student_id) DO UPDATE SET coach_id=excluded.coach_id,organization_id=excluded.organization_id,draft_revision=excluded.draft_revision,binding=excluded.binding,result=excluded.result,evaluated_at=clock_timestamp();
 RETURN r;
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_bind_saved(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION efg_private.clinical_assert_publication(p_student uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE r jsonb;s record;BEGIN
 r:=efg_private.clinical_snapshot(p_student);
 SELECT * INTO s FROM efg_private.clinical_compatibility_receipts WHERE student_id=p_student FOR SHARE;
 IF NOT FOUND OR s.coach_id IS DISTINCT FROM auth.uid() OR s.binding IS DISTINCT FROM r->>'binding'
 OR r->>'compatibilityReady' IS DISTINCT FROM 'true' OR r->>'validUntil' IS NULL
 OR (r->>'validUntil')::timestamptz<=clock_timestamp() THEN
 RAISE EXCEPTION 'Clinical review stale, unresolved or expired' USING ERRCODE='PT409';END IF;
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_assert_publication(uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
-- Final wall-clock guard after all writes, before returning from COACH119.
-- Any exception rolls back goals, guide, notice, receipt and status together.
BEGIN;
CREATE FUNCTION efg_private.clinical_assert_final_deadline(p_student uuid,p_revision bigint) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE r record;d record;BEGIN
 SELECT * INTO d FROM public.efg_coach_plan_drafts WHERE student_id=p_student;
 SELECT * INTO r FROM efg_private.clinical_compatibility_receipts WHERE student_id=p_student;
 IF auth.uid() IS NULL OR d.coach_id IS DISTINCT FROM auth.uid() OR r.coach_id IS DISTINCT FROM auth.uid()
 OR d.organization_id IS DISTINCT FROM r.organization_id OR d.draft_revision IS DISTINCT FROM p_revision
 OR r.draft_revision IS DISTINCT FROM p_revision OR r.result->>'compatibilityReady' IS DISTINCT FROM 'true'
 OR r.result->>'validUntil' IS NULL OR (r.result->>'validUntil')::timestamptz<=clock_timestamp()
 THEN RAISE EXCEPTION 'Evidence expired before publication completed' USING ERRCODE='PT409';END IF;
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_assert_final_deadline(uuid,bigint) FROM PUBLIC,anon,authenticated;
COMMIT;
