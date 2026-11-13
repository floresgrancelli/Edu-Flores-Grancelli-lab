-- FICTITIOUS PostgreSQL 17 fixture only. Never execute on a hosted project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth,public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
-- Deliberately no SELECT on auth.users for service_role, as in the hosted project.
create table public.efg_profiles(user_id uuid primary key references auth.users,
 role text not null check(role in ('student','coach','admin')),active boolean not null);
grant select,update on public.efg_profiles to service_role;
insert into auth.users values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003'),
 ('00000000-0000-4000-8000-000000000004');
insert into public.efg_profiles values
 ('00000000-0000-4000-8000-000000000003','coach',true),
 ('00000000-0000-4000-8000-000000000004','student',true);
