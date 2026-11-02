-- NCC GU-06 / 02-03: scoped coach read of a student's SERVER-SYNCED recipes.
-- PROPOSAL ONLY — NEVER APPLY HOSTED WITHOUT EDU'S EXPLICIT GO.
-- No new public table SELECT policy, no bypass for other coaches or accounts.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
do $ncc_shared_recipe_preflight$
begin
 if pg_catalog.to_regclass('public.efg_personal_recipes') is null
    or pg_catalog.to_regclass('public.efg_coach_relaunch_intakes') is null
    or pg_catalog.to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is null
    or pg_catalog.to_regprocedure('efg_private.coach_has_student(uuid)') is null
    or pg_catalog.to_regprocedure('public.efg_coach_shared_student_recipes(uuid)') is not null
    or not exists(select 1 from pg_catalog.pg_class
     where oid='public.efg_personal_recipes'::regclass and relrowsecurity)
 then raise exception 'NCC-GU06 STOP: recipe ownership/RLS or Coach sharing prerequisites not ready' using errcode='55000';
 end if;
end $ncc_shared_recipe_preflight$;
create function public.efg_coach_shared_student_recipes(p_student uuid)
returns jsonb
language plpgsql stable security definer set search_path=''
as $ncc_shared_recipes$
declare
 v_coach uuid := auth.uid();
 v_org uuid;
 v_rows jsonb := '[]'::jsonb;
begin
 if v_coach is null or p_student is null or v_coach=p_student then
  return '[]'::jsonb;
 end if;
 -- Both identities and organization must be current and server-owned.
 select p.organization_id into v_org
 from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 join public.efg_profiles coach_profile on coach_profile.user_id=v_coach
 where p.user_id=p_student and p.role='student' and p.active=true
  and coach_profile.role='coach' and coach_profile.active=true
  and o.coach_id=v_coach and p.organization_id is not null;
 if v_org is null
  or efg_private.coach_has_student(p_student) is distinct from true
  or efg_private.coach_pilot_share_active(p_student,v_org) is distinct from true
  or not exists(
    select 1 from public.efg_coach_relaunch_intakes i
    where i.student_id=p_student and i.organization_id=v_org
     and i.completed_version='coach_major_2026_r1'
     and i.shared_at is not null
   ) then
  return '[]'::jsonb;
 end if;
 select coalesce(pg_catalog.jsonb_agg(to_jsonb(rec) order by rec.created_at,rec.id),'[]'::jsonb)
 into v_rows
 from (
  select recipe.id,recipe.student_id,v_org as organization_id,recipe.name,
   recipe.ingredients,recipe.portions,recipe.totals,recipe.created_at
  from public.efg_personal_recipes recipe
  where recipe.student_id=p_student
   and pg_catalog.jsonb_typeof(recipe.ingredients)='array'
   and pg_catalog.jsonb_array_length(recipe.ingredients) between 1 and 12
   and pg_catalog.octet_length(recipe.ingredients::text)<12000
   and pg_catalog.jsonb_typeof(recipe.totals)='object'
   and pg_catalog.octet_length(recipe.totals::text)<4000
  order by recipe.created_at,recipe.id
  limit 30
 ) rec;
 return v_rows;
end
$ncc_shared_recipes$;
revoke all on function public.efg_coach_shared_student_recipes(uuid)
 from public,anon,authenticated;
grant execute on function public.efg_coach_shared_student_recipes(uuid) to authenticated;
comment on function public.efg_coach_shared_student_recipes(uuid) is
 'Coach-only consented read of current shared student recipe components. No health disclosure, no general RLS widening. Not activated outside authorized release.';
commit;
