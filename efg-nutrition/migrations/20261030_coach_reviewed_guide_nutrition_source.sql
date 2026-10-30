-- COACH114 · private, operator-reviewed nutrition composition for atomic Coach guides.
-- ADDED ONLY; no reviewed foods seeded; no health claims or traffic-light
-- compatibility from macro data. All legacy client writes remain untouched.
-- This is a necessary prerequisite, NOT the complete publish RPC or GO.
do $preflight$
begin
 if pg_catalog.to_regclass('efg_private.coach_reviewed_foods') is not null or
    pg_catalog.to_regprocedure('efg_private.coach_guide_foods_verified(jsonb)') is not null then
  raise exception 'COACH114: reviewed food backend already exists; audit migration';
 end if;
 if pg_catalog.to_regnamespace('efg_private') is null then
  raise exception 'COACH114: expected private schema missing';
 end if;
end $preflight$;

create table efg_private.coach_reviewed_foods(
 food_id text primary key check(food_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 catalog_version text not null check(catalog_version ~ '^[a-zA-Z0-9._-]{3,80}$'),
 unit text not null check(unit in ('g','ml')),
 k numeric(10,6) not null check(k between 0 and 12),
 p numeric(10,6) not null check(p between 0 and 1),
 c numeric(10,6) not null check(c between 0 and 1),
 f numeric(10,6) not null check(f between 0 and 1),
 fi numeric(10,6) not null check(fi between 0 and 1),
 source_kind text not null check(source_kind in
   ('manufacturer_label','official_product','validated_composition')),
 source_url text not null check(source_url ~ '^https://[^[:space:]]{8,1990}$'),
 evidence_id text not null unique check(evidence_id ~ '^[a-zA-Z0-9_-]{8,120}$'),
 evidence_status text not null default 'pending' check(evidence_status in ('pending','reviewed','rejected')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 expires_at timestamptz,
 check(evidence_status<>'reviewed' or
   (reviewed_by is not null and reviewed_at is not null and expires_at is not null
    and expires_at>reviewed_at))
);
alter table efg_private.coach_reviewed_foods enable row level security;
revoke all on efg_private.coach_reviewed_foods from public,anon,authenticated;
-- Never make the food review privately writable by a Coach or Student JWT.
-- No SELECT policy; backend RPC with owner privileges may read for approval.

create function efg_private.coach_guide_foods_verified(p_guide jsonb)
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
   select * into v_food from efg_private.coach_reviewed_foods
    where food_id=v_food_id and unit=v_units
      and evidence_status='reviewed'
      and reviewed_by is not null and reviewed_at is not null
      and expires_at>pg_catalog.now() and reviewed_at<=pg_catalog.now();
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
comment on function efg_private.coach_guide_foods_verified(jsonb) is
 'Fail-closed server-owned nutrient source verification. Not medical food suitability. Only reviewed, current operator evidence can pass.';
