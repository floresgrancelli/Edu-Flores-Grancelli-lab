-- NCC P25C · REVIEW-ONLY CORRECTION for a verified HOSTED CODE DRIFT.
-- NOT APPLIED. This is NOT a database migration executed by GitHub CI.
-- At 2026-11-03, public.efg_publish_coach_plan_draft_atomic supports flexible V2
-- but hosted efg_private.coach_guide_foods_verified still accepts legacy V1 only.
-- The function body below is taken unchanged from the already PG17-tested
-- COACH114 source, except CREATE -> CREATE OR REPLACE. No food approval,
-- consent, role, user, flag, legacy diary or customer row is changed.
-- Only a qualified operator may consider execution AFTER explicit owner GO,
-- with a CURRENT hosted preflight and separately authorized signed-actor QA.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $ncc_p25_pre$
declare v_current text;
begin
 if pg_catalog.to_regclass('efg_private.coach_reviewed_foods') is null
  or pg_catalog.to_regprocedure('efg_private.coach_guide_foods_verified(jsonb)') is null
  or pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null
 then raise exception 'NCC_P25C_ABORT: hosted prerequisites absent'; end if;
 if exists(select 1 from efg_private.coach_release_switches where enabled)
  or not exists(select 1 from efg_private.coach_release_switches
    where switch_key='pilot_coach_atomic_publication' and enabled=false)
  or not exists(select 1 from efg_private.coach_release_switches
    where switch_key='pilot_student_diary_write_gate' and enabled=false)
 then raise exception 'NCC_P25C_ABORT: pilot switches must remain OFF'; end if;
 select pg_catalog.pg_get_functiondef(p.oid) into v_current
 from pg_catalog.pg_proc p
 where p.oid=pg_catalog.to_regprocedure('efg_private.coach_guide_foods_verified(jsonb)')
  and p.prosecdef=false
  and p.proconfig @> array['search_path=""']::text[]
  and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
  and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE');
 if v_current is null
  or pg_catalog.strpos(v_current,'five_meal_example')=0
  or pg_catalog.strpos(v_current,'flexible_meal_guide')>0
 then raise exception 'NCC_P25C_ABORT: unexpected or already-upgraded verifier; manual review'; end if;
 if coalesce(pg_catalog.strpos(pg_catalog.pg_get_functiondef(
   pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)')),
   'flexible_meal_guide'),0)=0
 then raise exception 'NCC_P25C_ABORT: publication endpoint does not support V2'; end if;
end
$ncc_p25_pre$;
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
  or pg_catalog.jsonb_typeof(p_guide->'meals') is distinct from 'array'
  or not (
   (p_guide->>'kind'='five_meal_example' and p_guide->>'version'='1'
    and pg_catalog.jsonb_array_length(p_guide->'meals')=5)
   or
   (p_guide->>'kind'='flexible_meal_guide' and p_guide->>'version'='2'
    and pg_catalog.jsonb_array_length(p_guide->'meals') between 2 and 6)
  ) then
   return false;
 end if;
 for v_meal in select value from pg_catalog.jsonb_array_elements(p_guide->'meals') loop
  if pg_catalog.jsonb_typeof(v_meal) is distinct from 'object'
   or v_meal->>'slot' is null or v_meal->>'slot' not in
    ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')
   or v_meal->>'slot'=any(v_slots)
   or pg_catalog.jsonb_typeof(v_meal->'items') is distinct from 'array' then
   return false;
  end if;
  v_slots:=pg_catalog.array_append(v_slots,v_meal->>'slot');
  v_items_count:=pg_catalog.jsonb_array_length(v_meal->'items');
  if v_items_count not between 1 and 15 then return false; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(v_meal->'items') loop
   v_count:=v_count+1;
   if v_count>90 or pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
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
 return pg_catalog.cardinality(v_slots)=pg_catalog.jsonb_array_length(p_guide->'meals')
    and v_count>=pg_catalog.jsonb_array_length(p_guide->'meals');
end
$verify$;
revoke all on function efg_private.coach_guide_foods_verified(jsonb)
 from public,anon,authenticated;
comment on function efg_private.coach_guide_foods_verified(jsonb) is
 'NCC P25C: current reviewed ingredient verifier supports 5-meal legacy and flexible V2 (2-6); no automatic approval.';
do $ncc_p25_post$
declare v_current text;
begin
 select pg_catalog.pg_get_functiondef(p.oid) into v_current
 from pg_catalog.pg_proc p
 where p.oid=pg_catalog.to_regprocedure('efg_private.coach_guide_foods_verified(jsonb)')
  and not p.prosecdef
  and p.proconfig @> array['search_path=""']::text[]
  and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
  and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE');
 if v_current is null
  or pg_catalog.strpos(v_current,'five_meal_example')=0
  or pg_catalog.strpos(v_current,'flexible_meal_guide')=0
  or pg_catalog.strpos(v_current,'media_tarde')=0
  or pg_catalog.strpos(v_current,'evidence_status = ''reviewed''')=0
 then raise exception 'NCC_P25C_ABORT: installed verifier failed ACL and V2 source checks'; end if;
end
$ncc_p25_post$;
commit;
