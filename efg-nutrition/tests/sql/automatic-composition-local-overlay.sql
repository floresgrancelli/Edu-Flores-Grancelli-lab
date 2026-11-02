-- PRIVATE LOCAL TEST OVERLAY, not a hosted migration. Caller wraps BEGIN/ROLLBACK.
-- Uses existing postgres connection in disposable Coach119 runner. No grants added.
do $guard$
begin
 if current_database()<>'postgres' or current_user<>'postgres'
  or pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null
  or pg_catalog.to_regclass('efg_private.coach_reviewed_foods') is null
  or pg_catalog.to_regprocedure('efg_private.coach119_reviewed_food_ids(jsonb)') is null then
  raise exception 'V10 requires existing disposable Coach119 schema';
 end if;
 if exists(select 1 from efg_private.coach_reviewed_foods
   where food_id in ('apple','oats_raw','spinach_cooked')) then
  raise exception 'V10 refuses to overwrite sample food IDs';
 end if;
end $guard$;
alter table efg_private.coach_reviewed_foods
 add column automatic_provenance jsonb,
 add column automated_validated_at timestamptz;
alter table efg_private.coach_reviewed_foods
 drop constraint coach_reviewed_foods_evidence_status_check;
alter table efg_private.coach_reviewed_foods add constraint coach_reviewed_foods_evidence_status_check
 check(evidence_status in ('pending','reviewed','rejected','automated_validated'));
-- Original reviewed CHECK remains untouched, so manual evidence still requires a human.
alter table efg_private.coach_reviewed_foods add constraint automatic_composition_shape
 check(evidence_status<>'automated_validated' or (
  reviewed_by is null and reviewed_at is null and automated_validated_at is not null
  and automatic_provenance is not null and jsonb_typeof(automatic_provenance)='object'
  and expires_at is not null and expires_at>automated_validated_at));

create function efg_private.coach_food_evidence_current(food efg_private.coach_reviewed_foods)
returns boolean language plpgsql stable security invoker set search_path=''
as $evidence$
declare
 p jsonb:=food.automatic_provenance;
 expected_id text;
 expected_description text;
 expected_preparation text;
 k text;
begin
 if food.evidence_status='reviewed' then
  return food.reviewed_by is not null and food.reviewed_at is not null
   and food.reviewed_at<=pg_catalog.now() and food.expires_at>pg_catalog.now();
 end if;
 if food.evidence_status is distinct from 'automated_validated'
  or food.reviewed_by is not null or food.reviewed_at is not null
  or food.automated_validated_at is null or food.automated_validated_at>pg_catalog.now()
  or food.expires_at is null or food.expires_at<=pg_catalog.now()
  or food.expires_at>food.automated_validated_at+interval '1 hour'
  or food.unit is distinct from 'g' or food.source_kind is distinct from 'validated_composition'
  or pg_catalog.jsonb_typeof(p) is distinct from 'object'
  or p->'schemaVersion' is distinct from '1'::jsonb
  or p->'test_only' is distinct from 'false'::jsonb
  or p->>'provider' is distinct from 'usda_fdc'
  or p->>'dataType' is distinct from 'SR Legacy'
  or p->>'policyVersion' is distinct from 'ISOLATED_ARCHIVE_REVIEW_1H_V1'
  or p->>'importMode' is distinct from 'approved_official_archive'
  or p->>'archiveDigest' is distinct from 'sha256:ea088c8c4e30729a10aa0512cfe57365f91c5d0c53e83490a1ec296a4f5ebcae'
  or p->>'mappingVersion' is distinct from food.catalog_version
  or p->>'mappingVersion' is distinct from 'official-three-records-v1'
  or p->>'unit' is distinct from 'g' or p->'basisGrams' is distinct from '100'::jsonb
  or coalesce(p->>'rawDigest','') !~ '^sha256:[a-f0-9]{64}$'
  or coalesce(p->>'parserVersion','') <> 'ncc-fdc-selected-export-v1'
  or coalesce(p->>'importRunId','') !~ '^[a-zA-Z0-9_-]{8,120}$'
  or p->>'foodId' is distinct from food.food_id then return false; end if;
 case food.food_id
 when 'apple' then expected_id:='171688';expected_preparation:='raw';
  expected_description:='Apples, raw, with skin (Includes foods for USDA''s Food Distribution Program)';
 when 'oats_raw' then expected_id:='173904';expected_preparation:='raw';
  expected_description:='Cereals, oats, regular and quick, not fortified, dry';
 when 'spinach_cooked' then expected_id:='168463';expected_preparation:='cooked';
  expected_description:='Spinach, cooked, boiled, drained, without salt';
 else return false;
 end case;
 if p->>'recordId' is distinct from expected_id or p->>'description' is distinct from expected_description
  or p->>'preparation' is distinct from expected_preparation
  or p->>'preparationEvidenceId' is distinct from 'FDC-'||expected_id||'-description'
  or food.source_url is distinct from 'https://api.nal.usda.gov/fdc/v1/food/'||expected_id
  or p->>'sourceUrl' is distinct from food.source_url
  or coalesce(p->>'sourcePublishedAt','')='' or coalesce(p->>'capturedAt','')=''
  then return false; end if;
 -- Parsing malformed dates is caught and rejected, never an authorization bypass.
 if (p->>'sourcePublishedAt')::date>food.automated_validated_at::date
  or (p->>'capturedAt')::timestamptz>food.automated_validated_at then return false; end if;
 foreach k in array array['k','p','c','f','fi'] loop
  if pg_catalog.jsonb_typeof(p->'perUnit'->k) is distinct from 'number'
   or abs((p->'perUnit'->>k)::numeric-(pg_catalog.to_jsonb(food)->>k)::numeric)>0.0000005
   then return false; end if;
 end loop;
 return true;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
 return false;
end $evidence$;
revoke all on function efg_private.coach_food_evidence_current(efg_private.coach_reviewed_foods)
 from public,anon,authenticated;
-- New evidence can only be written by existing authorized server owner. No client RPC is added.
-- Following exact function replacements preserve all non-evidence guard logic.

create or replace function efg_private.coach_guide_foods_verified(p_guide jsonb)
returns boolean language plpgsql stable security invoker set search_path=''
as $verify$
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
$verify$;
revoke all on function efg_private.coach_guide_foods_verified(jsonb)
 from public,anon,authenticated;

create or replace function efg_private.coach119_reviewed_food_ids(p_guide jsonb)
returns text[] language plpgsql stable set search_path=''
as $coach119_foods$
declare
 v_items jsonb;
 v_item jsonb;
 v_id text;
 v_selected text[]:='{}';
 v_count integer;
 v_verified integer;
begin
 v_items:=p_guide->'approvedFoodIds';
 if pg_catalog.jsonb_typeof(v_items) is distinct from 'array' then
  raise exception 'Coach food selection missing' using errcode='22023';
 end if;
 v_count:=pg_catalog.jsonb_array_length(v_items);
 if v_count not between 1 and 300 then
  raise exception 'Coach food selection out of bounds' using errcode='22023';
 end if;
 for v_item in select value from pg_catalog.jsonb_array_elements(v_items) loop
  if pg_catalog.jsonb_typeof(v_item) is distinct from 'string' then
   raise exception 'Invalid approved food type' using errcode='22023';
  end if;
  v_id:=v_item #>> '{}';
  if v_id !~ '^[A-Za-z0-9_-]{1,100}$' or v_id=any(v_selected) then
   raise exception 'Invalid or duplicate approved food' using errcode='22023';
  end if;
  v_selected:=pg_catalog.array_append(v_selected,v_id);
 end loop;
 -- This evidence concerns nutritional data, not medical safety.
 select pg_catalog.count(distinct food.food_id) into v_verified
 from efg_private.coach_reviewed_foods food
 where food.food_id=any(v_selected)
  and efg_private.coach_food_evidence_current(food)
  and food.source_url like 'https://%';
 if v_verified<>v_count then
  raise exception 'Selected catalog foods lack current reviewed evidence'
   using errcode='42501';
 end if;
 for v_item in
  select item.value
  from pg_catalog.jsonb_array_elements(p_guide->'meals') as meal(value)
  cross join lateral pg_catalog.jsonb_array_elements(meal.value->'items') as item(value)
 loop
  if v_item->>'id' is null or not(v_item->>'id'=any(v_selected)) then
   raise exception 'Guide food not in Coach approved list' using errcode='22023';
  end if;
 end loop;
 return v_selected;
end;
$coach119_foods$;
revoke all on function efg_private.coach119_reviewed_food_ids(jsonb)
 from public,anon,authenticated;

