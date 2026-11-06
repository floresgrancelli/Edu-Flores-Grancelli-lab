-- Versioned server catalog validates composition; it does not certify estimates.
create or replace function efg_private.canonical_catalog_guide(p_guide jsonb,p_goal jsonb)
returns jsonb language plpgsql stable set search_path='' as $fn$
declare snapshot jsonb:=efg_private.guide_catalog_snapshot(); meal jsonb; item jsonb; food jsonb;
 result jsonb; meals jsonb:='[]'; items jsonb; slots text[]:='{}'; ids text[]:='{}';
 key text; qty numeric; amount numeric; count_items integer:=0; has_estimates boolean:=false;
 totals jsonb:='{"k":0,"p":0,"c":0,"f":0,"fi":0}'; deviation jsonb:='{}'; target numeric;
begin
 if jsonb_typeof(p_guide) is distinct from 'object' or octet_length(p_guide::text)>30000
  or p_guide->>'catalogVersion' is distinct from snapshot->>'version' then
  raise exception 'Catalog version changed; refresh and review the guide' using errcode='PT409'; end if;
 if jsonb_typeof(p_guide->'meals') is distinct from 'array'
  or not ((p_guide->>'kind'='flexible_meal_guide' and p_guide->>'version'='2' and jsonb_array_length(p_guide->'meals') between 2 and 6)
    or (p_guide->>'kind'='five_meal_example' and p_guide->>'version'='1' and jsonb_array_length(p_guide->'meals')=5)) then
  raise exception 'Invalid catalog guide meals' using errcode='22023'; end if;
 for meal in select value from jsonb_array_elements(p_guide->'meals') loop
  if jsonb_typeof(meal) is distinct from 'object' or meal->>'slot' is null
   or meal->>'slot' not in ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')
   or meal->>'slot'=any(slots) or jsonb_typeof(meal->'items') is distinct from 'array'
   or jsonb_array_length(meal->'items') not between 1 and 15 then
   raise exception 'Invalid catalog guide slot' using errcode='22023'; end if;
  slots:=array_append(slots,meal->>'slot');items:='[]';
  for item in select value from jsonb_array_elements(meal->'items') loop
   count_items:=count_items+1;
   food:=snapshot->'foods'->(item->>'id');
   if count_items>90 or jsonb_typeof(item) is distinct from 'object' or food is null
    or item->>'unit' is distinct from food->>'unit' or jsonb_typeof(item->'qty') is distinct from 'number' then
    raise exception 'Invalid catalog food or unit' using errcode='22023'; end if;
   qty:=(item->>'qty')::numeric;
   if qty<=0 or qty>1000 then raise exception 'Invalid catalog quantity' using errcode='22023'; end if;
   if item->>'id'='egg' and coalesce(item->>'recipeComponent','false')<>'true'
    and (qty<50 or qty>150 or mod(qty,50)<>0) then
    raise exception 'Whole eggs require integer units' using errcode='22023'; end if;
   foreach key in array array['k','p','c','f','fi'] loop
    if jsonb_typeof(item->key) is distinct from 'number'
     or abs((item->>key)::numeric-(food->>key)::numeric)>0.000000001 then
     raise exception 'Catalog composition changed; refresh and review the guide' using errcode='PT409'; end if;
    amount:=(food->>key)::numeric*qty;
    totals:=jsonb_set(totals,array[key],to_jsonb((totals->>key)::numeric+amount));
   end loop;
   has_estimates:=has_estimates or food->>'dataQuality'='estimated';
   ids:=array_append(ids,item->>'id');
   -- Never persist a caller's claimed independent approval or provenance.
   item:=(item-'sourceApprovalId'-'reviewedAt'-'expiresAt'-'source'-'sourceId'-'sourceUrl'-'validationStatus'-'sourceType'-'dataQuality') || (food-'source');
   items:=items||jsonb_build_array(item);
  end loop;
  meals:=meals||jsonb_build_array(jsonb_set(meal,'{items}',items));
 end loop;
 foreach key in array array['k','p','c','f','fi'] loop
  target:=(p_goal->>(case key when 'k' then 'kcal' when 'p' then 'protein_g' when 'c' then 'carb_g' when 'f' then 'fat_g' else 'fiber_g' end))::numeric;
  deviation:=jsonb_set(deviation,array[key],case when target>0 then to_jsonb(100*((totals->>key)::numeric-target)/target) else 'null'::jsonb end);
 end loop;
 result:=jsonb_set(p_guide,'{meals}',meals)-'healthContext';
 result:=jsonb_set(result,'{approvedFoodIds}',(select jsonb_agg(id order by id) from (select distinct unnest(ids) as id) x));
 return result||jsonb_build_object('catalogTotals',totals,'catalogDeviations',deviation,'catalogHasEstimates',has_estimates);
end $fn$;
revoke all on function efg_private.canonical_catalog_guide(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.efg_coach_guide_catalog(p_student uuid,p_food_ids text[])
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare snapshot jsonb; rows jsonb; missing text[];
begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student)
  or not exists(select 1 from public.efg_coach_relaunch_intakes i where i.student_id=p_student
   and i.completed_version='coach_major_2026_r1' and i.shared_at is not null) then
  raise exception 'Unauthorized catalog request' using errcode='42501'; end if;
 if p_food_ids is null or cardinality(p_food_ids) not between 1 and 90
  or exists(select 1 from unnest(p_food_ids) id where id is null or length(id) not between 1 and 100) then
  raise exception 'Invalid catalog ids' using errcode='22023'; end if;
 snapshot:=efg_private.guide_catalog_snapshot();
 select array_agg(id) into missing from unnest(p_food_ids) id where not((snapshot->'foods') ? id);
 if cardinality(missing)>0 then raise exception 'Food missing from current catalog: %',array_to_string(missing,', ') using errcode='PT422'; end if;
 select jsonb_agg(value order by key) into rows from jsonb_each(snapshot->'foods') where key=any(p_food_ids);
 return jsonb_build_object('version',snapshot->>'version','foods',rows);
end $fn$;
revoke all on function public.efg_coach_guide_catalog(uuid,text[]) from public,anon;
grant execute on function public.efg_coach_guide_catalog(uuid,text[]) to authenticated;
