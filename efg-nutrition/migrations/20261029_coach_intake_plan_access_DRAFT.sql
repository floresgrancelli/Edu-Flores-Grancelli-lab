-- EFG Nutrition Pro — DRAFT MIGRATION, DO NOT APPLY TO PRODUCTION
-- Coach intake and explicit plan publication. Requires isolated staging and cross-role RLS QA.
-- Historical students must remain enabled; new students start pending.
begin;

-- Migration-time safety: hold new profile inserts until both legacy backfill and
-- new-student trigger are committed. This can briefly block onboarding; staging
-- must measure lock time and production would require an approved maintenance window.
lock table public.efg_profiles in share row exclusive mode;

create table public.efg_student_plan_access (
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 coach_id uuid not null references auth.users(id),
 status text not null default 'pending' check (status in ('pending','published','paused')),
 published_goal_id uuid references public.efg_goals(id),
 published_at timestamptz,
 published_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 constraint efg_access_published_consistent check ((status <> 'published') or (published_at is not null and published_by is not null))
);
create index efg_access_coach_status_idx on public.efg_student_plan_access (coach_id,status);

-- IMPORTANT: this backfill must be completed atomically BEFORE the access gate is installed.
insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status,published_goal_id,published_at,published_by)
select p.user_id,p.organization_id,o.coach_id,
 'published',
 (select g.id from public.efg_goals g where g.student_id=p.user_id order by g.approved_at desc limit 1),
 now(),o.coach_id
from public.efg_profiles p join public.efg_organizations o on o.id=p.organization_id
where p.role='student' and o.coach_id is not null
on conflict(student_id) do nothing;

-- Abort atomically rather than silently locking any historic account whose
-- organization/coach linkage was missing or changed. No existing user data is edited.
do $$
declare v_uncovered bigint;
begin
 select count(*) into v_uncovered
 from public.efg_profiles p
 left join public.efg_student_plan_access a on a.student_id=p.user_id
 where p.role='student'
   and (a.student_id is null
     or a.organization_id is distinct from p.organization_id
     or a.status is distinct from 'published');
 if v_uncovered>0 then
  raise exception 'Legacy student access backfill incomplete: % account(s); migration rolled back',v_uncovered;
 end if;
end $$;

-- Legacy published accounts may lack a goal. Allow that exception only in the historical cohort
-- until a coach explicitly replaces the legacy plan. Enforce the event for all future publications.
alter table public.efg_student_plan_access drop constraint efg_access_published_consistent;
alter table public.efg_student_plan_access add constraint efg_access_published_consistent
 check ((status <> 'published') or (published_at is not null and published_by is not null));

create function efg_private.new_student_pending_access() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_coach uuid;
begin
 if new.role <> 'student' then return new; end if;
 select coach_id into v_coach from public.efg_organizations where id=new.organization_id;
 if v_coach is null then raise exception 'Student organization requires assigned coach'; end if;
 insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status)
 values(new.user_id,new.organization_id,v_coach,'pending');
 return new;
end $$;
create trigger efg_student_new_access
after insert on public.efg_profiles for each row
execute function efg_private.new_student_pending_access();

-- Voluntary first-contact details, never automatically sent through OTP.
create table public.efg_student_intakes (
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 organization_id uuid not null references public.efg_organizations(id),
 objective text check(objective is null or objective in ('fat_loss','recomp','muscle_gain','maintenance','general')),
 age_years integer check(age_years between 18 and 100),
 height_cm numeric(5,1) check(height_cm between 100 and 250),
 weight_kg numeric(5,1) check(weight_kg between 20 and 400),
 activity_level text check(activity_level is null or activity_level in ('low','light','moderate','high')),
 dietary_pattern text check(dietary_pattern is null or dietary_pattern in ('omnivore','vegetarian','vegan','pescatarian','other')),
 preferred_foods text not null default '' check(char_length(preferred_foods)<=400),
 disliked_foods text not null default '' check(char_length(disliked_foods)<=400),
 meal_routine text not null default '' check(char_length(meal_routine)<=400),
 notes text not null default '' check(char_length(notes)<=1000),
 shared_at timestamptz,
 updated_at timestamptz not null default now()
);

alter table public.efg_student_plan_access enable row level security;
alter table public.efg_student_intakes enable row level security;
revoke all on public.efg_student_plan_access from public,anon,authenticated;
revoke all on public.efg_student_intakes from public,anon,authenticated;
grant select on public.efg_student_plan_access to authenticated;
grant select,insert,update,delete on public.efg_student_intakes to authenticated;

create policy access_student_read on public.efg_student_plan_access
 for select to authenticated using(student_id=(select auth.uid()));
create policy access_consenting_coach_read on public.efg_student_plan_access
 for select to authenticated using(coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id));
create policy intake_student_read on public.efg_student_intakes
 for select to authenticated using(student_id=(select auth.uid()));
create policy intake_coach_shared_read on public.efg_student_intakes
 for select to authenticated using(shared_at is not null and efg_private.coach_has_student(student_id));
create policy intake_student_insert on public.efg_student_intakes
 for insert to authenticated with check (
  student_id=(select auth.uid()) and
  exists(select 1 from public.efg_profiles p where p.user_id=(select auth.uid())
  and p.role='student' and p.active and p.organization_id=efg_student_intakes.organization_id));
create policy intake_student_update on public.efg_student_intakes
 for update to authenticated using(student_id=(select auth.uid()))
 with check(student_id=(select auth.uid()) and exists(
 select 1 from public.efg_profiles p where p.user_id=(select auth.uid())
 and p.role='student' and p.active and p.organization_id=efg_student_intakes.organization_id));

-- Owner-only erasure of the optional intake. Does not touch nutrition logs,
-- plans, coach consents, account, or any other student record.
create policy intake_student_delete on public.efg_student_intakes
 for delete to authenticated using(
  student_id=(select auth.uid()) and exists(
   select 1 from public.efg_profiles p where p.user_id=(select auth.uid())
   and p.role='student' and p.active and p.organization_id=efg_student_intakes.organization_id));

create function efg_private.student_nutrition_enabled(p_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
select case when exists(select 1 from public.efg_profiles p where p.user_id=p_student and p.role='student')
 then exists(select 1 from public.efg_student_plan_access a where a.student_id=p_student and a.status='published')
 else true end
$$;
revoke all on function efg_private.student_nutrition_enabled(uuid) from public;
grant execute on function efg_private.student_nutrition_enabled(uuid) to authenticated;

-- Restrictive policies combine with existing ownership RLS rather than replacing it.
-- They prevent direct REST writes while pending, not just disabled UI controls.
do $$
declare t text;
begin
 foreach t in array array['efg_daily_logs','efg_weights','efg_activities','efg_habitual_meals','efg_personal_recipes'] loop
  execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (efg_private.student_nutrition_enabled(student_id))',t||'_plan_insert',t);
  execute format('create policy %I on public.%I as restrictive for update to authenticated using (efg_private.student_nutrition_enabled(student_id)) with check (efg_private.student_nutrition_enabled(student_id))',t||'_plan_update',t);
  execute format('create policy %I on public.%I as restrictive for delete to authenticated using (efg_private.student_nutrition_enabled(student_id))',t||'_plan_delete',t);
 end loop;
end $$;

-- The current food guide is not approved merely because an older guide was approved.
-- If the coach changes the JSON/associated goal without a NEW explicit approval event,
-- invalidate the old timestamp at the database layer. Existing unaffected guides and
-- legacy student access rows stay intact. Test against genuine JWTs in staging.
create function efg_private.invalidate_stale_guided_approval()
returns trigger language plpgsql set search_path='' as $$
begin
 if (new.guided_plan is distinct from old.guided_plan
     or new.guided_goal_id is distinct from old.guided_goal_id)
    and new.guided_plan_approved_at is not distinct from old.guided_plan_approved_at then
   new.guided_plan_approved_at := null;
 end if;
 return new;
end $$;
create trigger efg_guard_guided_approval_update
before update of guided_plan,guided_goal_id,guided_plan_approved_at
on public.efg_food_plans
for each row execute function efg_private.invalidate_stale_guided_approval();

-- Defence in depth: the five slots alone do not make a valid nutritional guide.
-- Prevent empty/unknown IDs, missing quantities and fabricated "zero" nutrients
-- from passing the publication RPC. Values are per g/ml, NOT meal totals.
-- This is a broad numeric/shape guard, not a substitute for comparing the
-- chosen IDs and nutrient composition with a server-owned catalog in staging.
create function efg_private.coach_guide_items_valid(p_guide jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare
 v_meal jsonb;
 v_item jsonb;
 v_nutrient text;
 v_value numeric;
begin
 if pg_catalog.jsonb_typeof(p_guide->'meals') is distinct from 'array' then return false; end if;
 for v_meal in select value from pg_catalog.jsonb_array_elements(p_guide->'meals') loop
  if pg_catalog.jsonb_typeof(v_meal->'items') is distinct from 'array' then return false; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(v_meal->'items') loop
   if pg_catalog.jsonb_typeof(v_item) is distinct from 'object' then return false; end if;
   if pg_catalog.jsonb_typeof(v_item->'id') is distinct from 'string' then return false; end if;
   if pg_catalog.length(pg_catalog.btrim(v_item->>'id'))<1
      or pg_catalog.length(v_item->>'id')>100 then return false; end if;
   if pg_catalog.jsonb_typeof(v_item->'qty') is distinct from 'number' then return false; end if;
   v_value := (v_item->>'qty')::numeric;
   if v_value<=0 or v_value>1000 then return false; end if;
   foreach v_nutrient in array array['k','p','c','f','fi'] loop
    if pg_catalog.jsonb_typeof(v_item->v_nutrient) is distinct from 'number' then return false; end if;
    v_value := (v_item->>v_nutrient)::numeric;
    if v_value<0 or v_value>(case when v_nutrient='k' then 12 else 1 end) then return false; end if;
   end loop;
  end loop;
 end loop;
 return true;
end $$;

-- Publish only if the assigned, authorized coach has saved a matching approved 5-meal guide.
create function public.efg_publish_coach_plan(p_student uuid,p_goal_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_coach uuid := auth.uid();
begin
 if v_coach is null or not efg_private.coach_has_student(p_student) then
  raise exception 'Not authorized to publish this student plan';
 end if;
 if not exists (
  select 1 from public.efg_student_plan_access a
  join public.efg_profiles p on p.user_id=a.student_id
  join public.efg_organizations o on o.id=a.organization_id
  join public.efg_goals g on g.id=p_goal_id
  join public.efg_food_plans f on f.student_id=a.student_id
  where a.student_id=p_student and a.coach_id=v_coach
    and p.active and p.role='student' and p.organization_id=a.organization_id
    and o.coach_id=v_coach and g.student_id=p_student and g.approved_by=v_coach
    and f.coach_id=v_coach and f.guided_goal_id=p_goal_id
    and f.guided_plan is not null and f.guided_plan_approved_at is not null
    and efg_private.coach_guide_items_valid(f.guided_plan)
    -- SQL-side structural check: UI approval alone is not sufficient.
    -- An empty JSON object or fewer than five nonempty, distinct slots cannot publish.
    and f.guided_plan->>'kind'='five_meal_example'
    and f.guided_plan->>'version'='1'
    and case when jsonb_typeof(f.guided_plan->'meals')='array' then
      jsonb_array_length(f.guided_plan->'meals')=5
      and (select count(distinct m.meal->>'slot')=5
           from jsonb_array_elements(f.guided_plan->'meals') as m(meal)
           where m.meal->>'slot' in ('desayuno','media_manana','almuerzo','merienda','cena')
             and case when jsonb_typeof(m.meal->'items')='array'
               then jsonb_array_length(m.meal->'items') between 1 and 15
               else false end)
    else false end
    and g.id=(select g2.id from public.efg_goals g2 where g2.student_id=p_student order by g2.approved_at desc limit 1)
 ) then raise exception 'Complete and approve the latest goal and matching food guide first'; end if;
 update public.efg_student_plan_access
 set status='published',published_goal_id=p_goal_id,published_at=now(),published_by=v_coach,updated_at=now()
 where student_id=p_student and coach_id=v_coach;
 if not found then raise exception 'Student activation record missing'; end if;
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student)
 values(p_student,v_coach,'plan_update','plan_publicado_'||p_goal_id::text,
 'Tu plan está listo','Tu coach publicó el plan. Ya podés comenzar a registrar tu día.','home',p_student)
 on conflict(recipient_id,event_key) do nothing;
end $$;
revoke all on function public.efg_publish_coach_plan(uuid,uuid) from public,anon;
grant execute on function public.efg_publish_coach_plan(uuid,uuid) to authenticated;

-- Generic inbox notification. No health information in push messages.
create function efg_private.notify_submitted_intake() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_coach uuid;
begin
 if new.shared_at is null or (tg_op='UPDATE' and old.shared_at is not null) then return new; end if;
 -- Do not notify a coach before the student has separately approved follow-up.
 if not exists(
  select 1 from public.efg_consents c
  where c.student_id=new.student_id and c.accepted=true
 ) then return new; end if;
 select o.coach_id into v_coach from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=new.student_id and p.role='student' and p.active and p.organization_id=new.organization_id;
 if v_coach is not null then
  insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student)
  values(v_coach,new.student_id,'message','ficha_ingreso_'||new.student_id::text||'_'||extract(epoch from new.shared_at)::bigint::text,
    'Ficha inicial recibida','Un alumno compartió su ficha inicial. Revisala en Nuevos ingresos.','coachIntake',new.student_id)
  on conflict(recipient_id,event_key) do nothing;
 end if;
 return new;
end $$;
create trigger efg_student_intake_notice after insert or update on public.efg_student_intakes
for each row execute function efg_private.notify_submitted_intake();

commit;

-- STAGING GATES BEFORE PROD: existing students unchanged, freshly invited pending,
-- cross-organization denial, declined/revoked permission, bypass via REST, guide approval/publishing,
-- notification routing, no ability to write daily logs while pending, coach/admin private diaries unaffected.
