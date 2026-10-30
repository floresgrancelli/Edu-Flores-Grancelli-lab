-- COACH-PILOT-10 disposable PostgreSQL 17 fixture, no hosted connections.
create schema auth;
create schema efg_private;
create role authenticated nologin;
create role anon nologin;
create function auth.uid() returns uuid language sql stable set search_path=''
as $body$
select nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$body$;
create table auth.users(id uuid primary key,email text not null unique,email_confirmed_at timestamptz);
create table public.efg_organizations(
 id uuid primary key default pg_catalog.gen_random_uuid(),
 coach_id uuid references auth.users(id) unique,
 name text not null,
 seat_limit integer not null default 5 check(seat_limit between 1 and 10000),
 status text not null default 'trial' check(status in ('trial','active','grace','suspended')),
 is_test boolean not null default false,
 license_fee_ars numeric
);
create table public.efg_profiles(
 user_id uuid primary key references auth.users(id),email text not null unique,
 nickname text not null,role text not null check(role in ('student','coach','admin')),
 organization_id uuid references public.efg_organizations(id),
 active boolean not null default true,
 constraint profile_org_role check(
 (role='student' and organization_id is not null) or (role<>'student' and organization_id is null))
);
create table public.efg_consents(
 student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),accepted boolean default false
);
create table public.efg_invitations(
 id uuid primary key default pg_catalog.gen_random_uuid(),
 email text not null,nickname text not null,
 organization_id uuid not null references public.efg_organizations(id),
 role text not null default 'student',
 claimed_by uuid,revoked_at timestamptz,
 invited_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.efg_daily_logs(
 student_id uuid references public.efg_profiles(user_id),log_day date,
 payload text,primary key(student_id,log_day));
create table public.efg_weights(student_id uuid references public.efg_profiles(user_id),kg numeric);
create table public.efg_personal_recipes(student_id uuid references public.efg_profiles(user_id),name text);
create table public.efg_habitual_meals(student_id uuid references public.efg_profiles(user_id),name text);
create table public.efg_goals(student_id uuid references public.efg_profiles(user_id),kcal integer);
create table efg_private.nut57_isolated_staging_marker(local_only boolean default true check(local_only));
insert into efg_private.nut57_isolated_staging_marker default values;
create function efg_private.is_admin() returns boolean
 language sql stable security definer set search_path=''
as $body$
select exists(select 1 from public.efg_profiles where
 user_id=auth.uid() and role='admin' and active)
$body$;
create function efg_private.coach_has_student(p_student uuid) returns boolean
 language sql stable security definer set search_path=''
as $body$
select exists(select 1 from public.efg_profiles student
 join public.efg_organizations o on student.organization_id=o.id
 join public.efg_consents c on c.student_id=student.user_id and c.organization_id=o.id
 where student.user_id=p_student and student.role='student'
 and student.active and o.coach_id=auth.uid() and c.accepted)
$body$;
-- Fixed fictitious identities. No email matches real accounts.
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000101','admin@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000102','prior-coach@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000103','carla-synthetic@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000104','student-b@example.invalid',now());
insert into public.efg_organizations(id,coach_id,name,seat_limit,status,is_test)
 values('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000102',
 'Prior Coach',5,'active',false);
insert into public.efg_profiles(user_id,email,nickname,role,organization_id) values
 ('00000000-0000-4000-8000-000000000101','admin@example.invalid','Admin','admin',null),
 ('00000000-0000-4000-8000-000000000102','prior-coach@example.invalid','Prior Coach','coach',null),
 ('00000000-0000-4000-8000-000000000103','carla-synthetic@example.invalid','Carla DEMO','student','00000000-0000-4000-8000-000000000201'),
 ('00000000-0000-4000-8000-000000000104','student-b@example.invalid','Student DEMO','student','00000000-0000-4000-8000-000000000201');
insert into public.efg_consents values
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000201',true);
insert into public.efg_daily_logs values ('00000000-0000-4000-8000-000000000103','2026-10-29','HISTORIC_PERSONAL_MEAL');
insert into public.efg_weights values ('00000000-0000-4000-8000-000000000103',82.4);
insert into public.efg_personal_recipes values ('00000000-0000-4000-8000-000000000103','Historic recipe');
insert into public.efg_habitual_meals values ('00000000-0000-4000-8000-000000000103','Historic breakfast');
insert into public.efg_goals values ('00000000-0000-4000-8000-000000000103',2100);
