-- PRIVATE incremental proposal; no source rows, policy decisions, grants or gates activated.
-- Run only after separate review/authorization. Existing manual review remains valid.
BEGIN;
DO $precondition$ BEGIN
 IF to_regclass('efg_private.coach_reviewed_foods') IS NULL
  OR to_regclass('efg_private.nutrition_import_policies') IS NOT NULL
  OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='efg_private'
    AND table_name='coach_reviewed_foods' AND column_name='automatic_provenance') THEN
  RAISE EXCEPTION 'Schema differs from reviewed 2026-11-01 22:12 snapshot';
 END IF;
 IF has_table_privilege('anon','efg_private.coach_reviewed_foods','INSERT,UPDATE,DELETE')
  OR has_table_privilege('authenticated','efg_private.coach_reviewed_foods','INSERT,UPDATE,DELETE') THEN
  RAISE EXCEPTION 'Automatic provenance cannot be client writable';
 END IF;
END $precondition$;
-- PostgreSQL ARE bounds cannot exceed 255. Preserve the observed HTTPS,
-- no-whitespace and 8..1990 suffix contract using an explicit length check.
DO $url_precondition$ BEGIN
 IF (SELECT pg_get_constraintdef(oid) FROM pg_constraint
     WHERE conrelid='efg_private.coach_reviewed_foods'::regclass
       AND conname='coach_reviewed_foods_source_url_check') IS DISTINCT FROM
    $expected$CHECK ((source_url ~ '^https://[^[:space:]]{8,1990}$'::text))$expected$ THEN
   RAISE EXCEPTION 'Source URL constraint differs from observed snapshot';
 END IF;
END $url_precondition$;
ALTER TABLE efg_private.coach_reviewed_foods DROP CONSTRAINT coach_reviewed_foods_source_url_check;
ALTER TABLE efg_private.coach_reviewed_foods ADD CONSTRAINT coach_reviewed_foods_source_url_check
 CHECK(source_url ~ '^https://[^[:space:]]+$' AND char_length(source_url) BETWEEN 16 AND 1998);
ALTER TABLE efg_private.coach_reviewed_foods ADD COLUMN automatic_provenance jsonb,
 ADD COLUMN automated_validated_at timestamptz;
ALTER TABLE efg_private.coach_reviewed_foods DROP CONSTRAINT coach_reviewed_foods_evidence_status_check;
ALTER TABLE efg_private.coach_reviewed_foods ADD CONSTRAINT coach_reviewed_foods_evidence_status_check
 CHECK(evidence_status IN ('pending','reviewed','rejected','automated_validated'));
-- Preserve coach_reviewed_foods_check and reviewed_by FK exactly.
ALTER TABLE efg_private.coach_reviewed_foods ADD CONSTRAINT automatic_composition_shape
 CHECK(evidence_status<>'automated_validated' OR (reviewed_by IS NULL AND reviewed_at IS NULL
 AND automated_validated_at IS NOT NULL AND jsonb_typeof(automatic_provenance)='object'
 AND automatic_provenance IS NOT NULL AND expires_at>automated_validated_at AND expires_at IS NOT NULL));
-- Local operating policy is not a USDA attribute. No row is seeded or activated.
-- Existing authorized server importer owns this immutable-per-version manifest.
CREATE TABLE efg_private.nutrition_import_policies(
 policy_version text PRIMARY KEY CHECK(policy_version ~ '^[a-zA-Z0-9_-]{5,80}$'),
 active boolean NOT NULL DEFAULT false,
 review_interval interval NOT NULL CHECK(review_interval>interval '0'),
 mapping_version text NOT NULL, parser_version text NOT NULL,
 manifest jsonb NOT NULL CHECK(jsonb_typeof(manifest)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE efg_private.nutrition_import_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON efg_private.nutrition_import_policies FROM public,anon,authenticated;
CREATE FUNCTION efg_private.coach_food_evidence_current(food efg_private.coach_reviewed_foods)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $evidence$
DECLARE p jsonb:=food.automatic_provenance; policy efg_private.nutrition_import_policies%rowtype; source jsonb; k text;
BEGIN
 IF food.evidence_status='reviewed' THEN
  RETURN food.reviewed_by IS NOT NULL AND food.reviewed_at IS NOT NULL
   AND food.reviewed_at<=now() AND food.expires_at>now();
 END IF;
 IF food.evidence_status IS DISTINCT FROM 'automated_validated' OR food.reviewed_by IS NOT NULL
  OR food.reviewed_at IS NOT NULL OR food.automated_validated_at IS NULL
  OR food.automated_validated_at>now() OR food.expires_at IS NULL OR food.expires_at<=now()
  OR food.unit IS DISTINCT FROM 'g' OR food.source_kind IS DISTINCT FROM 'validated_composition'
  OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR p->'test_only' IS DISTINCT FROM 'false'::jsonb
  OR p->'schemaVersion' IS DISTINCT FROM '1'::jsonb OR p->>'provider' IS DISTINCT FROM 'usda_fdc'
  OR p->>'dataType' IS DISTINCT FROM 'SR Legacy' OR p->>'foodId' IS DISTINCT FROM food.food_id
  OR p->>'unit' IS DISTINCT FROM food.unit OR p->'basisGrams' IS DISTINCT FROM '100'::jsonb
  OR p->>'importMode' IS DISTINCT FROM 'approved_official_archive'
  OR coalesce(p->>'importRunId','') !~ '^[a-zA-Z0-9_-]{8,120}$'
  OR coalesce(p->>'rawDigest','') !~ '^sha256:[a-f0-9]{64}$'
 THEN RETURN false; END IF;
 SELECT * INTO policy FROM efg_private.nutrition_import_policies
 WHERE policy_version=p->>'policyVersion' AND active;
 IF NOT FOUND OR food.expires_at>food.automated_validated_at+policy.review_interval
  OR p->>'mappingVersion' IS DISTINCT FROM policy.mapping_version
  OR food.catalog_version IS DISTINCT FROM policy.mapping_version
  OR p->>'parserVersion' IS DISTINCT FROM policy.parser_version THEN RETURN false; END IF;
 source:=policy.manifest->food.food_id;
 IF jsonb_typeof(source) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['recordId','description','preparation','rawDigest','archiveDigest','sourceUrl','sourcePublishedAt','preparationEvidenceId'] LOOP
  IF coalesce(source->>k,'')='' OR p->>k IS DISTINCT FROM source->>k THEN RETURN false; END IF;
 END LOOP;
 IF food.source_url IS DISTINCT FROM source->>'sourceUrl'
  OR food.source_url IS DISTINCT FROM 'https://api.nal.usda.gov/fdc/v1/food/'||(p->>'recordId')
  OR coalesce(p->>'capturedAt','')='' OR (p->>'capturedAt')::timestamptz>food.automated_validated_at
  OR (p->>'sourcePublishedAt')::date>food.automated_validated_at::date THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['k','p','c','f','fi'] LOOP
  -- A matching mutable row+provenance is insufficient: both anchor to the
  -- independently imported, private policy manifest (per ONE gram, not per100g).
  IF jsonb_typeof(source->'perUnit'->k) IS DISTINCT FROM 'number'
   OR jsonb_typeof(p->'perUnit'->k) IS DISTINCT FROM 'number'
   OR (source->'perUnit'->>k)::numeric<0
   OR (to_jsonb(food)->>k) IS NULL
   OR abs((source->'perUnit'->>k)::numeric-(p->'perUnit'->>k)::numeric)>0.0000005
   OR abs((source->'perUnit'->>k)::numeric-(to_jsonb(food)->>k)::numeric)>0.0000005
   THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range THEN RETURN false;
END $evidence$;
REVOKE ALL ON FUNCTION efg_private.coach_food_evidence_current(efg_private.coach_reviewed_foods) FROM public,anon,authenticated;
-- Exact existing gate replacement is appended by the private build; every other guard retained.
DO $exact$ BEGIN IF md5(pg_get_functiondef('efg_private.coach_guide_foods_verified(jsonb)'::regprocedure))<> 'b3473ef6c03c4aede6ed4cd2ba012c38' THEN RAISE EXCEPTION 'Existing guide gate changed'; END IF; END $exact$;
CREATE OR REPLACE FUNCTION efg_private.coach_guide_foods_verified(p_guide jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 v_meal jsonb;
 v_item jsonb;
 v_food efg_private.coach_reviewed_foods%rowtype;
 v_food_id text;
 v_units text;
 v_value numeric;
 v_key text;
 v_source numeric;
 v_slots text[] := '{}';
 v_items_count integer;
 v_count integer := 0;
begin
 if pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
  or p_guide->>'kind' is distinct from 'five_meal_example'
  or p_guide->>'version' is distinct from '1'
  or pg_catalog.jsonb_typeof(p_guide->'meals') is distinct from 'array'
  or pg_catalog.jsonb_array_length(p_guide->'meals') <> 5 then
   return false;
 end if;
 for v_meal in select value from pg_catalog.jsonb_array_elements(p_guide->'meals') loop
  if pg_catalog.jsonb_typeof(v_meal) is distinct from 'object'
   or v_meal->>'slot' is null or v_meal->>'slot' not in
    ('desayuno','media_manana','almuerzo','merienda','cena')
   or v_meal->>'slot'=any(v_slots)
   or pg_catalog.jsonb_typeof(v_meal->'items') is distinct from 'array' then
   return false;
  end if;
  v_slots:=pg_catalog.array_append(v_slots,v_meal->>'slot');
  v_items_count:=pg_catalog.jsonb_array_length(v_meal->'items');
  if v_items_count not between 1 and 15 then return false; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(v_meal->'items') loop
   v_count:=v_count+1;
   if v_count>75 or pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
    or v_item->>'id' is null or v_item->>'unit' is null
    or v_item->>'id' !~ '^[a-zA-Z0-9_-]{1,100}$'
    or v_item->>'unit' not in ('g','ml')
    or pg_catalog.jsonb_typeof(v_item->'qty') is distinct from 'number' then
     return false;
   end if;
   if (v_item->>'qty')::numeric<=0 or (v_item->>'qty')::numeric>1000 then
    return false;
   end if;
   v_food_id:=v_item->>'id';
   v_units:=v_item->>'unit';
   select * into v_food from efg_private.coach_reviewed_foods food
    where food_id=v_food_id and unit=v_units
      and efg_private.coach_food_evidence_current(food);
   if not found then return false; end if;
   foreach v_key in array array['k','p','c','f','fi'] loop
    if pg_catalog.jsonb_typeof(v_item->v_key) is distinct from 'number' then
     return false;
    end if;
    v_value:=(v_item->>v_key)::numeric;
    v_source:=(case v_key
      when 'k' then v_food.k when 'p' then v_food.p
      when 'c' then v_food.c when 'f' then v_food.f else v_food.fi end);
    if v_value<0 or abs(v_value-v_source) >
      (case when v_key='k' then 0.01 else 0.003 end) then
     return false;
    end if;
   end loop;
  end loop;
 end loop;
 return pg_catalog.cardinality(v_slots)=5 and v_count>=5;
end
$function$;
COMMIT;
