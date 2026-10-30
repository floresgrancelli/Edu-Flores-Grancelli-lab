-- BRAND77B: isolated-only, user-scoped one-time educational welcome receipt.
-- DRAFT. NEVER RUN ON HOSTED PRODUCTION. No personal nutrition data stored.
-- To enable in a release: approve/apply a reviewed migration with preflight,
-- backup, RLS/JWT A/B verification, owner GO, and set flag true separately.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
do $brand77_preflight$
begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null or
    pg_catalog.to_regclass('public.efg_profiles') is null or
    pg_catalog.to_regclass('auth.users') is null then
   raise exception 'BRAND77B STOP: isolated disposable database required' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_science_intro_receipts') is not null or
    pg_catalog.to_regprocedure('public.efg_ack_science_intro(text,text)') is not null then
   raise exception 'BRAND77B STOP: schema already installed; audit changes separately' using errcode='55000';
 end if;
end $brand77_preflight$;
create table public.efg_science_intro_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 version text not null check(version='con_ciencia_2026_r1'),
 seen_at timestamptz not null default pg_catalog.clock_timestamp(),
 action text not null check(action in ('completed','skipped')),
 primary key(user_id,version)
);
alter table public.efg_science_intro_receipts enable row level security;
revoke all on public.efg_science_intro_receipts from public,anon,authenticated;
grant select on public.efg_science_intro_receipts to authenticated;
create policy efg_science_intro_read_own on public.efg_science_intro_receipts
 for select to authenticated using(user_id=(select auth.uid()));
-- No direct INSERT/UPDATE/DELETE grant or policy for client roles.
-- Explicit click acknowledgement; the server derives user_id and timestamp.
create function public.efg_ack_science_intro(
 p_version text,p_action text
) returns boolean
language plpgsql security definer set search_path='' as $body$
declare v_user uuid:=(select auth.uid());
begin
 if v_user is null or p_version is distinct from 'con_ciencia_2026_r1' or
    p_action not in ('completed','skipped') or p_action is null then
  raise exception 'Unsupported science intro confirmation' using errcode='42501';
 end if;
 if not exists (
  select 1 from public.efg_profiles p
  where p.user_id=v_user and p.active is true and p.role in ('student','coach')
 ) then
  raise exception 'Active Coach/student account required' using errcode='42501';
 end if;
 insert into public.efg_science_intro_receipts(user_id,version,action)
 values(v_user,p_version,p_action)
 on conflict(user_id,version) do nothing;
 return exists (
  select 1 from public.efg_science_intro_receipts
  where user_id=v_user and version=p_version
 );
end $body$;
revoke all on function public.efg_ack_science_intro(text,text) from public,anon,authenticated;
grant execute on function public.efg_ack_science_intro(text,text) to authenticated;
commit;
-- MISSING ON PURPOSE: hosted migration, backup/restore verification and GO.
