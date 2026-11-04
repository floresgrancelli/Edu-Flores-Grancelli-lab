-- PRIVATE NOT APPLIED. Depends on clinical R2 + health %rowtype correction 47a1aefa.
-- No grants here. Two authenticated EXECUTE grants require explicit future review.
BEGIN;
CREATE FUNCTION efg_private.clinical_recipe_projection(p_recipe jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $f$
DECLARE meal jsonb;item jsonb;slots text[]:='{}';seen text[];meals jsonb:='[]';items jsonb; BEGIN
 IF jsonb_typeof(p_recipe) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_recipe) k WHERE k<>'meals')
 OR jsonb_typeof(p_recipe->'meals') IS DISTINCT FROM 'array' OR jsonb_array_length(p_recipe->'meals')<>5 THEN RAISE EXCEPTION 'Recipe projection required' USING ERRCODE='22023';END IF;
 FOR meal IN SELECT value FROM jsonb_array_elements(p_recipe->'meals') LOOP
  IF jsonb_typeof(meal) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(meal) k WHERE k NOT IN ('slot','items'))
  OR meal->>'slot' IS NULL OR meal->>'slot' NOT IN ('desayuno','media_manana','almuerzo','merienda','cena') OR meal->>'slot'=ANY(slots)
  OR jsonb_typeof(meal->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(meal->'items') NOT BETWEEN 1 AND 15 THEN RAISE EXCEPTION 'Invalid meal projection' USING ERRCODE='22023';END IF;
  slots:=array_append(slots,meal->>'slot');items:='[]';seen:='{}';
  FOR item IN SELECT value FROM jsonb_array_elements(meal->'items') LOOP
   IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(item) k WHERE k NOT IN ('id','qty','unit'))
   OR item->>'id' IS NULL OR item->>'id' !~ '^[a-zA-Z0-9_-]{1,100}$' OR item->>'id'=ANY(seen)
   OR item->>'unit' IS NULL OR item->>'unit' NOT IN ('g','ml') OR jsonb_typeof(item->'qty') IS DISTINCT FROM 'number'
   OR (item->>'qty')::numeric<=0 OR (item->>'qty')::numeric>1000 THEN RAISE EXCEPTION 'Invalid ingredient projection; no browser evidence/nutrients' USING ERRCODE='22023';END IF;
   seen:=array_append(seen,item->>'id');items:=items||jsonb_build_array(jsonb_build_object('id',item->>'id','qty',item->'qty','unit',item->>'unit'));
  END LOOP;
  meals:=meals||jsonb_build_array(jsonb_build_object('slot',meal->>'slot','items',items));
 END LOOP;
 RETURN jsonb_build_object('meals',meals);
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_recipe_projection(jsonb) FROM public,anon,authenticated;

CREATE FUNCTION efg_private.clinical_response_frame(r jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $f$
 SELECT jsonb_build_object('draft',r->'draft_revision','intake',r->'intake_revision','health',r->'health_revision','catalog',r->'catalog_digest','goal',r->'goal','declaration',r->'restriction_declaration') || CASE WHEN r->'compatibility' ? 'pattern' THEN jsonb_build_object('pattern',r->'compatibility'->'pattern') ELSE '{}'::jsonb END;
$f$;
REVOKE ALL ON FUNCTION efg_private.clinical_response_frame(jsonb) FROM public,anon,authenticated;
CREATE FUNCTION efg_private.clinical_normalize_recipe(p_student uuid,p_recipe jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $f$
DECLARE projection jsonb;meal jsonb;item jsonb;food efg_private.coach_reviewed_foods%rowtype;items jsonb;meals jsonb:='[]';allowed text[];
BEGIN
 projection:=efg_private.clinical_recipe_projection(p_recipe);
 -- Caller has already acquired clinical_lock_context and verified current envelope.
 SELECT food_ids INTO allowed FROM efg_private.guide_source_bindings WHERE student_id=p_student AND coach_id=auth.uid();
 IF allowed IS NULL THEN RAISE EXCEPTION 'Binding required' USING ERRCODE='42501';END IF;
 FOR meal IN SELECT value FROM jsonb_array_elements(projection->'meals') LOOP
  items:='[]';
  FOR item IN SELECT value FROM jsonb_array_elements(meal->'items') LOOP
   SELECT * INTO food FROM efg_private.coach_reviewed_foods WHERE food_id=item->>'id' FOR SHARE;
   IF NOT FOUND OR NOT(food.food_id=ANY(allowed)) OR food.unit IS DISTINCT FROM item->>'unit'
    OR food.expires_at<=clock_timestamp() OR efg_private.coach_food_evidence_current(food) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Current bound composition required' USING ERRCODE='PT409';END IF;
   items:=items||jsonb_build_array(jsonb_build_object('id',food.food_id,'name',coalesce(food.automatic_provenance->>'description',food.food_id),'qty',item->'qty','unit',food.unit,'k',food.k,'p',food.p,'c',food.c,'f',food.f,'fi',food.fi));
  END LOOP;
  meals:=meals||jsonb_build_array(jsonb_build_object('slot',meal->>'slot','label',CASE meal->>'slot' WHEN 'desayuno' THEN 'Desayuno' WHEN 'media_manana' THEN 'Media mañana' WHEN 'almuerzo' THEN 'Almuerzo' WHEN 'merienda' THEN 'Merienda' ELSE 'Cena' END,'items',items));
 END LOOP;
 -- No approvedFoodIds: this is a draft operation, not coach publication approval.
 RETURN jsonb_build_object('version',1,'kind','five_meal_example','meals',meals,'createdFrom','server_clinical_draft');
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_normalize_recipe(uuid,jsonb) FROM public,anon,authenticated;

CREATE FUNCTION public.efg_preview_clinical_bound_recipe(p_student uuid,p_expected jsonb,p_recipe jsonb,p_request_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE r jsonb;projection jsonb;recipe jsonb;assessment jsonb;BEGIN
 IF auth.uid() IS NULL OR NOT efg_private.coach_has_student(p_student) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL OR p_request_key !~ '^[a-zA-Z0-9_-]{1,100}$' THEN RAISE EXCEPTION 'Request key required' USING ERRCODE='22023';END IF;
 r:=public.efg_read_bound_guide(p_student); -- real authorization, consent, ordered locks, revisions
 IF p_expected IS NULL OR efg_private.clinical_response_frame(r) IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Clinical context changed' USING ERRCODE='PT409';END IF;
 projection:=efg_private.clinical_recipe_projection(p_recipe);recipe:=efg_private.clinical_normalize_recipe(p_student,projection);
 assessment:=efg_private.clinical_snapshot(p_student,recipe);
 RETURN r||jsonb_build_object('guide',recipe,'recipe_projection',projection,'request_key',p_request_key,'compatibility',assessment,'evaluated_at',clock_timestamp(),'publishable',false);
END $f$;
REVOKE ALL ON FUNCTION public.efg_preview_clinical_bound_recipe(uuid,jsonb,jsonb,text) FROM public,anon,authenticated;

CREATE FUNCTION public.efg_save_clinical_bound_recipe(p_student uuid,p_expected jsonb,p_recipe jsonb,p_request_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE preview jsonb;r jsonb;revision bigint;BEGIN
 preview:=public.efg_preview_clinical_bound_recipe(p_student,p_expected,p_recipe,p_request_key);
 IF preview->'compatibility'->>'compatibilityReady' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Unresolved clinical compatibility' USING ERRCODE='PT409';END IF;
 -- Existing bound save keeps all source/goal/five-percent checks and binds a new receipt.
 revision:=public.efg_save_bound_guide(p_student,(preview->>'draft_revision')::bigint,preview->>'catalog_digest',preview->'guide');
 r:=public.efg_read_bound_guide(p_student);
 IF (r->>'draft_revision')::bigint IS DISTINCT FROM revision OR r->'compatibility'->>'compatibilityReady' IS DISTINCT FROM 'true'
 OR r->'compatibility'->>'validUntil' IS NULL OR (r->'compatibility'->>'validUntil')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'Clinical evidence expired before save completed' USING ERRCODE='PT409';END IF;
 RETURN r||jsonb_build_object('recipe_projection',preview->'recipe_projection','request_key',p_request_key,'publishable',false);
END $f$;
REVOKE ALL ON FUNCTION public.efg_save_clinical_bound_recipe(uuid,jsonb,jsonb,text) FROM public,anon,authenticated;
COMMIT;
-- PENDING PERMISSION: authenticated EXECUTE on exactly the two public functions above.
-- No table SELECT, importer grant, publication flag or other client permission proposed.
