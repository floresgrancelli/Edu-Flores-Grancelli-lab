-- EFG NUTRITION PRO / EPHEMERAL POSTGRES 16 - SYNTHETIC SCHEMA ONLY.
-- Never point this fixture at production or import real customer data.
-- This mirrors ONLY the columns needed by staged Coach publication scripts.
-- Auth claims are simulated by a session variable, NOT real Supabase JWTs.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema efg_private;
create function auth.uid() returns uuid
language sql stable
as $uid$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$uid$;
grant usage on schema auth to authenticated;

create table auth.users(id uuid primary key);
create table public.efg_organizations(
 id uuid primary key, coach_id uuid not null references auth.users(id)
);
create table public.efg_profiles(
 user_id uuid primary key references auth.users(id),
 organization_id uuid references public.efg_organizations(id),
 role text not null check(role in ('student','coach','admin')),
 active boolean not null default true
);
create table public.efg_consents(
 student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),
 accepted boolean not null default false
);
create function efg_private.coach_has_student(p_student uuid) returns boolean
language sql stable security definer set search_path=''
as $coach$
 select exists(
  select 1 from public.efg_profiles student
  join public.efg_organizations org on org.id=student.organization_id
  join public.efg_consents c on c.student_id=student.user_id
  where student.user_id=p_student and student.role='student' and student.active
    and org.coach_id=auth.uid() and c.organization_id=org.id and c.accepted
 )
$coach$;
create table public.efg_student_intakes(
 student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),
 dietary_pattern text, shared_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.efg_goals(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.efg_profiles(user_id),
 approved_by uuid not null references auth.users(id),
 goal_type text not null check(goal_type in ('fat_loss','recomp','muscle_gain','maintenance')),
 kcal integer not null check(kcal between 1200 and 10000),
 protein_g integer not null check(protein_g between 0 and 1000),
 carb_g integer not null check(carb_g between 0 and 2000),
 fat_g integer not null check(fat_g between 0 and 1000),
 fiber_g integer not null check(fiber_g between 0 and 150),
 start_on date not null default current_date,
 approved_at timestamptz not null default now()
);
create table public.efg_food_plans(
 student_id uuid primary key references public.efg_profiles(user_id),
 coach_id uuid not null references auth.users(id),
 approved_food_ids text[] not null default '{}'::text[],
 updated_at timestamptz not null default now(),
 guided_plan jsonb,
 guided_goal_id uuid references public.efg_goals(id),
 guided_plan_approved_at timestamptz,
 constraint approved_food_ids_limit check(cardinality(approved_food_ids) between 1 and 300),
 constraint efg_guided_plan_shape check(guided_plan is null or (
   jsonb_typeof(guided_plan)='object' and guided_plan->>'kind'='five_meal_example'
   and jsonb_typeof(guided_plan->'meals')='array'
   and jsonb_array_length(guided_plan->'meals')=5
   and octet_length(guided_plan::text)<30000
   and guided_goal_id is not null and guided_plan_approved_at is not null
 ))
);
create table public.efg_student_plan_access(
 student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),
 coach_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','published','paused')),
 published_goal_id uuid references public.efg_goals(id),
 published_at timestamptz, published_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
create table public.efg_notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id),
 actor_id uuid references auth.users(id),
 kind text not null check(kind in ('guide','plan_update','weekly_report','weekly_ready','missing_diary','payment','payment_status','message')),
 event_key text not null, title text not null,
 body text not null default '',target_tab text not null default 'home',
 target_student uuid,is_read boolean not null default false,
 created_at timestamptz not null default now(),
 unique(recipient_id,event_key)
);
create table public.efg_legal_documents(
 id uuid primary key,kind text not null,version text not null,
 sha256 text not null, locale text not null,
 content text not null default '',published_at timestamptz not null,
 effective_at timestamptz not null,retired_at timestamptz,
 status text not null
);
create table public.efg_legal_acceptances(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 document_id uuid not null references public.efg_legal_documents(id),
 accepted_at timestamptz not null default now(),
 acceptance_method text not null,document_hash_sha256 text not null,
 version text not null,kind text not null,recorded_at timestamptz not null default now(),
 unique(user_id,document_id)
);
revoke insert,update,delete on public.efg_legal_acceptances from public,anon,authenticated;
create function public.efg_publish_coach_plan(p_student uuid,p_goal_id uuid)
returns void language plpgsql as $old$
begin raise exception 'Old RPC prohibited in staging'; end
$old$;
-- Simulated historical grant, intentionally revoked by staged atomic SQL.
grant execute on function public.efg_publish_coach_plan(uuid,uuid) to authenticated;
-- Actual production has authenticated SELECT permissions on these tables.
grant select on public.efg_goals,public.efg_food_plans to authenticated;
