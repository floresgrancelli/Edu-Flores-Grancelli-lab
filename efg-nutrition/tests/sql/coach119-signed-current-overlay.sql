-- LOCAL TEST FIXTURE ONLY. No customer records and no hosted writes.
-- These two helper bodies were read from pg_get_functiondef on 31/10/2026.
-- Keeping their real license/active-role conditions prevents the simplified
-- historical fixture from giving a false authorization pass. This subset is
-- NOT a complete production schema or a verified production restore.
create or replace function efg_private.coach_has_student(p_student uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select exists(
  select 1 from public.efg_profiles student
  join public.efg_organizations org on org.id=student.organization_id
  join public.efg_consents c on c.student_id=student.user_id and c.organization_id=org.id
  join public.efg_profiles coach on coach.user_id=org.coach_id
  where student.user_id=p_student and student.role='student' and student.active
    and org.coach_id=auth.uid() and org.status in ('trial','active','grace')
    and (org.is_test or (org.status='active' and org.paid_through >= (now() at time zone 'America/Argentina/Buenos_Aires')::date))
    and coach.active and (coach.role='coach' or (coach.role='admin' and org.is_test))
    and c.accepted
 );
$function$;
create or replace function efg_private.is_admin()
returns boolean language sql stable security definer set search_path=''
as $function$
 select exists(select 1 from public.efg_profiles p where p.user_id=auth.uid() and p.role='admin' and p.active);
$function$;
grant usage on schema efg_private to authenticated;
revoke all on function efg_private.coach_has_student(uuid) from public,anon,authenticated;
grant execute on function efg_private.coach_has_student(uuid) to authenticated;
revoke all on function efg_private.is_admin() from public,anon,authenticated;
grant execute on function efg_private.is_admin() to authenticated;

-- Restrict the facade tables too. Auth.uid() remains the REAL Supabase
-- function: PostgREST sets claims from a token verified by local GoTrue.
alter table public.efg_profiles enable row level security;
revoke all on public.efg_profiles from public,anon,authenticated;
grant select on public.efg_profiles to authenticated;
create policy coach119_fixture_profiles_read on public.efg_profiles
for select to authenticated using(user_id=(select auth.uid()) or efg_private.coach_has_student(user_id));
alter table public.efg_consents enable row level security;
revoke all on public.efg_consents from public,anon,authenticated;
grant select on public.efg_consents to authenticated;
create policy coach119_fixture_consents_read on public.efg_consents
for select to authenticated using(student_id=(select auth.uid()) or efg_private.coach_has_student(student_id));
alter table public.efg_student_plan_access enable row level security;
revoke all on public.efg_student_plan_access from public,anon,authenticated;
grant select on public.efg_student_plan_access to authenticated;
create policy coach119_fixture_access_read on public.efg_student_plan_access
for select to authenticated using(student_id=(select auth.uid()) or efg_private.coach_has_student(student_id));
alter table public.efg_notifications enable row level security;
revoke all on public.efg_notifications from public,anon,authenticated;
grant select on public.efg_notifications to authenticated;
create policy coach119_fixture_notifications_read on public.efg_notifications
for select to authenticated using(recipient_id=(select auth.uid()));
