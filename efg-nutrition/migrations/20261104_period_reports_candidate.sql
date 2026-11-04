-- Additive period report history. No weekly rows are changed.
create table public.efg_period_reports (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id),
 coach_id uuid not null references auth.users(id),
 period_from date not null,
 period_to date not null,
 report_text text not null check(char_length(report_text) between 1 and 64000),
 created_at timestamptz not null default now(),
 constraint period_report_window check(period_to>=period_from and period_to-period_from<90),
 constraint period_report_unique unique(student_id,coach_id,period_from,period_to),
 constraint period_report_kind check((report_text::jsonb->>'kind') is not distinct from 'efg_luxury_period_v1'),
 constraint period_report_approved check((report_text::jsonb->>'approvedByCoach') is not distinct from 'true'),
 constraint period_report_dates check((report_text::jsonb->>'from') is not distinct from period_from::text and (report_text::jsonb->>'to') is not distinct from period_to::text)
);
alter table public.efg_period_reports enable row level security;
revoke all on public.efg_period_reports from public,anon,authenticated;
grant select,insert on public.efg_period_reports to authenticated;
create policy period_report_read on public.efg_period_reports for select to authenticated
 using(student_id=(select auth.uid()) or (coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id)));
create policy period_report_insert on public.efg_period_reports for insert to authenticated
 with check(coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id)
 and period_to <= (current_timestamp at time zone 'America/Argentina/Buenos_Aires')::date);
-- No UPDATE/DELETE policies or privileges: shared history is immutable.
create index efg_period_reports_student_created on public.efg_period_reports(student_id,created_at desc);
