-- Etapa 2: informe semanal revisado por coach, entregado dentro de la aplicación.
-- Migración pendiente de aplicación en lanzamiento conjunto.
create table if not exists public.efg_weekly_reports (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id) on delete cascade,
 coach_id uuid not null references auth.users(id),
 week_ending date not null,
 report_text text not null check(char_length(report_text) between 1 and 8000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(student_id,week_ending)
);
create index if not exists efg_weekly_reports_student_week on public.efg_weekly_reports(student_id,week_ending desc);
alter table public.efg_weekly_reports enable row level security;
revoke all on public.efg_weekly_reports from anon;
grant select,insert,update on public.efg_weekly_reports to authenticated;
create policy "Alumno consulta sus informes publicados" on public.efg_weekly_reports
 for select to authenticated using(student_id=(select auth.uid()));
create policy "Coach consulta informes de alumnos autorizados" on public.efg_weekly_reports
 for select to authenticated using(
 coach_id=(select auth.uid()) and exists(
 select 1 from public.efg_profiles p join public.efg_consents c on c.student_id=p.user_id
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=efg_weekly_reports.student_id and p.active and p.role='student'
 and c.accepted and c.organization_id=p.organization_id and o.coach_id=(select auth.uid())
 )
 );
create policy "Coach publica informes de alumnos autorizados" on public.efg_weekly_reports
 for insert to authenticated with check(
 coach_id=(select auth.uid()) and exists(
 select 1 from public.efg_profiles p join public.efg_consents c on c.student_id=p.user_id
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=efg_weekly_reports.student_id and p.active and p.role='student'
 and c.accepted and c.organization_id=p.organization_id and o.coach_id=(select auth.uid())
 )
 );
create policy "Coach edita sus informes de alumnos autorizados" on public.efg_weekly_reports
 for update to authenticated using(coach_id=(select auth.uid()) and exists(
 select 1 from public.efg_profiles p join public.efg_consents c on c.student_id=p.user_id
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=efg_weekly_reports.student_id and p.active and c.accepted and c.organization_id=p.organization_id and o.coach_id=(select auth.uid())
 )) with check(coach_id=(select auth.uid()) and exists(
 select 1 from public.efg_profiles p join public.efg_consents c on c.student_id=p.user_id
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=efg_weekly_reports.student_id and p.active and c.accepted and c.organization_id=p.organization_id and o.coach_id=(select auth.uid())
 ));
