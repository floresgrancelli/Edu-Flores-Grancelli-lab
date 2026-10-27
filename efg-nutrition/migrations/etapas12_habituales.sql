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
