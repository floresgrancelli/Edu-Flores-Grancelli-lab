-- Coach 2.0: foto opcional y privada del alumno.
-- Aplicar solo luego de revisar consentimiento y políticas de acceso.
create table if not exists public.efg_profile_photos (
 student_id uuid primary key references auth.users(id) on delete cascade,
 object_path text not null,
 updated_at timestamptz not null default now()
);
alter table public.efg_profile_photos enable row level security;
revoke all on public.efg_profile_photos from anon;
grant select,insert,update,delete on public.efg_profile_photos to authenticated;
create policy "Alumno administra su foto" on public.efg_profile_photos for all to authenticated
 using(student_id=(select auth.uid())) with check(student_id=(select auth.uid()));
create policy "Coach autorizado consulta foto" on public.efg_profile_photos for select to authenticated
 using(exists(select 1 from public.efg_profiles p join public.efg_consents c on c.student_id=p.user_id
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=efg_profile_photos.student_id and p.active and c.accepted
 and c.organization_id=p.organization_id and o.coach_id=(select auth.uid())));
-- Bucket privado. Las políticas de storage.objects deben restringir los objetos
-- a la carpeta del alumno (auth.uid()) y al coach autorizado.
