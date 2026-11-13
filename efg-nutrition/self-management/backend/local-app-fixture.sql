-- Disposable Supabase stack only. Real Auth schema is supplied by the CLI.
create table public.efg_profiles(user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in('student','coach','admin')),active boolean not null);
alter table public.efg_profiles enable row level security;
grant select,update on public.efg_profiles to service_role;
create table public.efg_coach_relaunch_intakes(student_id uuid primary key references auth.users(id) on delete cascade,
 revision integer,objective text,age_years integer,height_cm numeric,weight_kg numeric,activity_level text,
 dietary_pattern text,eating_window text,preferred_foods text,disliked_foods text,meal_routine text,notes text,updated_at timestamptz default now());
alter table public.efg_coach_relaunch_intakes enable row level security;
grant select on public.efg_coach_relaunch_intakes to service_role;
