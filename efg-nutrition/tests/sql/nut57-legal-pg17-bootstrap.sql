-- LEG-07: isolated PostgreSQL fixture. No real accounts, no hosted resources.
-- Run ONLY after coach-staging-bootstrap.sql in separate disposable database
-- (roles anon/authenticated already exist in the ephemeral PG17 cluster).
create schema auth;
create schema efg_private;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $uid$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$uid$;
grant usage on schema auth to authenticated;
create table efg_private.nut57_isolated_staging_marker(
 isolated_only boolean not null default true check (isolated_only=true)
);
insert into efg_private.nut57_isolated_staging_marker default values;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
