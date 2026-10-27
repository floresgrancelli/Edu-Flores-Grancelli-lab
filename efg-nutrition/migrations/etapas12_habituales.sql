-- EFG Nutrition Pro · etapa 1: habituales sincronizados
-- Aplicar únicamente durante la publicación conjunta, tras respaldo y pruebas.
create table if not exists public.efg_habitual_meals (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id) on delete cascade,
 meal_slot text not null check (meal_slot in ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')),
 name text not null check (char_length(name) between 1 and 60),
 items jsonb not null check (jsonb_typeof(items)='array'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists efg_habitual_meals_student_slot_idx on public.efg_habitual_meals(student_id,meal_slot,created_at);
alter table public.efg_habitual_meals enable row level security;
revoke all on public.efg_habitual_meals from anon;
grant select,insert,update,delete on public.efg_habitual_meals to authenticated;
create policy "Alumno lee sus comidas habituales" on public.efg_habitual_meals for select to authenticated using (student_id=(select auth.uid()));
create policy "Alumno guarda sus comidas habituales" on public.efg_habitual_meals for insert to authenticated with check (student_id=(select auth.uid()));
create policy "Alumno edita sus comidas habituales" on public.efg_habitual_meals for update to authenticated using (student_id=(select auth.uid())) with check (student_id=(select auth.uid()));
create policy "Alumno elimina sus comidas habituales" on public.efg_habitual_meals for delete to authenticated using (student_id=(select auth.uid()));

-- Recetas propias: propiedad exclusiva del alumno.
create table if not exists public.efg_personal_recipes (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 70),
 ingredients jsonb not null check (jsonb_typeof(ingredients)='array'),
 portions integer not null check (portions between 1 and 50),
 totals jsonb not null check (jsonb_typeof(totals)='object'),
 created_at timestamptz not null default now()
);
create index if not exists efg_personal_recipes_student_idx on public.efg_personal_recipes(student_id,created_at);
alter table public.efg_personal_recipes enable row level security;
revoke all on public.efg_personal_recipes from anon;
grant select,insert,update,delete on public.efg_personal_recipes to authenticated;
create policy "Alumno lee sus recetas" on public.efg_personal_recipes for select to authenticated using (student_id=(select auth.uid()));
create policy "Alumno crea sus recetas" on public.efg_personal_recipes for insert to authenticated with check (student_id=(select auth.uid()));
create policy "Alumno edita sus recetas" on public.efg_personal_recipes for update to authenticated using (student_id=(select auth.uid())) with check (student_id=(select auth.uid()));
create policy "Alumno elimina sus recetas" on public.efg_personal_recipes for delete to authenticated using (student_id=(select auth.uid()));
