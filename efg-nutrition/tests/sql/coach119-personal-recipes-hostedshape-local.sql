-- NCC GU-06 · local-only mirror of currently observed hosted recipe table shape.
-- Verified metadata only; NO customer rows or hosted accesses. Disposable PG.
create table public.efg_personal_recipes(
 id uuid primary key default pg_catalog.gen_random_uuid(),
 student_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(pg_catalog.char_length(name) between 1 and 70),
 ingredients jsonb not null check(pg_catalog.jsonb_typeof(ingredients)='array'),
 portions integer not null check(portions between 1 and 50),
 totals jsonb not null check(pg_catalog.jsonb_typeof(totals)='object'),
 created_at timestamptz not null default pg_catalog.clock_timestamp()
);
create index efg_personal_recipes_student_created_local
 on public.efg_personal_recipes(student_id,created_at);
alter table public.efg_personal_recipes enable row level security;
revoke all on public.efg_personal_recipes from public,anon,authenticated;
grant select,insert,update,delete on public.efg_personal_recipes to authenticated;
create policy "Alumno lee sus recetas" on public.efg_personal_recipes
 for select to authenticated using(student_id=(select auth.uid()));
create policy "Alumno crea sus recetas" on public.efg_personal_recipes
 for insert to authenticated with check(student_id=(select auth.uid()));
create policy "Alumno edita sus recetas" on public.efg_personal_recipes
 for update to authenticated using(student_id=(select auth.uid()))
 with check(student_id=(select auth.uid()));
create policy "Alumno elimina sus recetas" on public.efg_personal_recipes
 for delete to authenticated using(student_id=(select auth.uid()));
