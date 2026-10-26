-- EFG Nutrition: ESQUEMA INICIAL PARA PILOTO PRIVADO (NO ejecutado).
-- Aplicar solo una vez que Supabase esté conectado y se hayan revisado políticas.
-- Registro sanitario y financiero: jamás usar anon/service_role en el frontend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,40}$'),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  bank_alias text,
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial','active','grace','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.coach_student_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.coach_organizations(id),
  coach_id uuid not null references auth.users(id),
  student_id uuid not null references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, student_id)
);

-- El consentimiento se administra en otra tabla, escrita por el propio alumno.
create table if not exists public.student_consents (
  link_id uuid primary key references public.coach_student_links(id) on delete cascade,
  student_id uuid not null references auth.users(id),
  granted_at timestamptz,
  revoked_at timestamptz
);

create or replace function public.coach_can_access_student(p_student uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
   select 1 from public.coach_student_links l
   join public.student_consents c on c.link_id=l.id and c.student_id=l.student_id
   join public.coach_organizations o on o.id=l.organization_id
   where l.student_id=p_student
     and l.coach_id=(select auth.uid())
     and o.owner_id=l.coach_id
     and o.subscription_status in ('trial','active','grace')
     and l.is_active=true
     and c.granted_at is not null
     and c.revoked_at is null
 );
$$;

create table if not exists public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  professional_id uuid not null references auth.users(id),
  goal_type text not null check (goal_type in ('fat_loss','recomposition','muscle_gain','maintenance')),
  kcal numeric(8,2) not null check (kcal > 0),
  protein_g numeric(8,2) not null check (protein_g >= 0),
  carbohydrate_g numeric(8,2) not null check (carbohydrate_g >= 0),
  fat_g numeric(8,2) not null check (fat_g >= 0),
  fiber_g numeric(8,2) not null check (fiber_g >= 0),
  valid_from date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.food_catalog (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  brand text,
  kcal_per_100g numeric(9,3),
  protein_per_100g numeric(9,3),
  carbs_per_100g numeric(9,3),
  fats_per_100g numeric(9,3),
  fiber_per_100g numeric(9,3),
  micros jsonb not null default '{}'::jsonb,
  amino_acids jsonb not null default '{}'::jsonb,
  source_type text not null check (source_type in ('label','food_table','estimated')),
  source_reference text,
  verified_at timestamptz
);

create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  food_id uuid references public.food_catalog(id),
  consumed_at timestamptz not null default now(),
  meal_slot text not null check (meal_slot in ('breakfast','lunch','midafternoon','snack','dinner')),
  grams numeric(9,3) not null check (grams > 0),
  nutrition_snapshot jsonb not null,
  state text not null default 'consumed' check (state in ('consumed','removed'))
);

create table if not exists public.sports_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  logged_at timestamptz not null default now(),
  product_name text not null,
  product_brand text,
  amount numeric(10,3) not null check (amount > 0),
  unit text not null,
  timing text not null,
  nutrition_snapshot jsonb not null,
  source_type text not null check (source_type in ('label','food_table','estimated'))
);

create table if not exists public.weekly_weights (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  measurement_date date not null,
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 400),
  comment text,
  unique (student_id, measurement_date)
);

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  activity_date date not null,
  steps int check (steps >= 0 and steps <= 100000),
  exercise_minutes int check (exercise_minutes >= 0 and exercise_minutes <= 1440),
  activity_type text,
  unique (student_id, activity_date)
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  organization_id uuid references public.coach_organizations(id),
  amount_ars numeric(12,2) not null check (amount_ars > 0),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  alias_snapshot text not null,
  receipt_storage_path text,
  payment_status text not null default 'pending' check (payment_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.coach_organizations enable row level security;
alter table public.coach_student_links enable row level security;
alter table public.student_consents enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.food_catalog enable row level security;
alter table public.meal_entries enable row level security;
alter table public.sports_entries enable row level security;
alter table public.weekly_weights enable row level security;
alter table public.daily_activity enable row level security;
alter table public.payment_requests enable row level security;

create policy profiles_read_self on public.profiles for select to authenticated
 using (user_id=(select auth.uid()));
create policy profiles_write_self on public.profiles for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy profiles_edit_self on public.profiles for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create policy organizations_read_own on public.coach_organizations for select to authenticated
 using (owner_id=(select auth.uid()));
create policy organizations_edit_own on public.coach_organizations for update to authenticated
 using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));

create policy links_read_participants on public.coach_student_links for select to authenticated
 using (coach_id=(select auth.uid()) or student_id=(select auth.uid()));
create policy consents_read_student on public.student_consents for select to authenticated
 using (student_id=(select auth.uid()) or public.coach_can_access_student(student_id));
-- Crear y revocar invitaciones / consentimiento solo a través de un backend autenticado.
-- Evitar que el coach pueda establecer granted_at por su propia cuenta.

create policy catalog_read_auth on public.food_catalog for select to authenticated using (true);

create policy goals_read_authorized on public.nutrition_goals for select to authenticated
 using (student_id=(select auth.uid()) or public.coach_can_access_student(student_id));
create policy meals_read_authorized on public.meal_entries for select to authenticated
 using (student_id=(select auth.uid()) or public.coach_can_access_student(student_id));
create policy sports_read_authorized on public.sports_entries for select to authenticated
 using (student_id=(select auth.uid()) or public.coach_can_access_student(student_id));
create policy weights_read_authorized on public.weekly_weights for select to authenticated
 using (student_id=(select auth.uid()) or public.coach_can_access_student(student_id));
create policy activity_read_authorized on public.daily_activity for select to authenticated
 using (student_id=(select auth.uid()) or public.coach_can_access_student(student_id));

create policy meals_insert_self on public.meal_entries for insert to authenticated
 with check (student_id=(select auth.uid()));
create policy sports_insert_self on public.sports_entries for insert to authenticated
 with check (student_id=(select auth.uid()));
create policy weights_insert_self on public.weekly_weights for insert to authenticated
 with check (student_id=(select auth.uid()));
create policy activity_insert_self on public.daily_activity for insert to authenticated
 with check (student_id=(select auth.uid()));

create policy payments_read_party on public.payment_requests for select to authenticated
 using (payer_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create policy payments_insert_payer on public.payment_requests for insert to authenticated
 with check (payer_id=(select auth.uid()) and payment_status='pending' and receipt_storage_path is null);
-- Solo el servidor de pagos actualiza estados y rutas de comprobantes previa validación.
-- Falta definir políticas storage.objects y RPCs con transacciones, auditoría y rate limiting.

create index if not exists idx_meal_entries_student_date on public.meal_entries(student_id,consumed_at);
create index if not exists idx_sport_entries_student_date on public.sports_entries(student_id,logged_at);
create index if not exists idx_weights_student_date on public.weekly_weights(student_id,measurement_date);
create index if not exists idx_activities_student_date on public.daily_activity(student_id,activity_date);
create index if not exists idx_links_coach_student on public.coach_student_links(coach_id,student_id);

-- REVISAR ANTES DE USO REAL:
-- 1) Inmutabilidad de snapshots e historiales.
-- 2) Políticas UPDATE/DELETE y acceso mínimo necesario.
-- 3) Consentimiento creado mediante verificación de identidad del propio alumno.
-- 4) Admin EFG sin acceso global a datos sensibles.
-- 5) Nunca ejecutar en producción sin pruebas de cruce de tenants y auditoría.
