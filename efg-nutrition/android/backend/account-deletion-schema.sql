-- CANDIDATE ONLY: execute in isolated QA database; not applied to hosted production.
-- Request intake only. This does not delete users or data.
begin;
create table public.ncc_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('privacy_web')),
  status text not null default 'pending' check (status in ('pending','processing','completed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint completed_time check ((status = 'completed') = (completed_at is not null))
);
create unique index ncc_one_open_deletion_request
  on public.ncc_account_deletion_requests(user_id) where status in ('pending','processing');
alter table public.ncc_account_deletion_requests enable row level security;
revoke all on public.ncc_account_deletion_requests from public, anon, authenticated;
grant select (id,user_id,source,status,requested_at,completed_at)
  on public.ncc_account_deletion_requests to authenticated;
grant insert (user_id,source) on public.ncc_account_deletion_requests to authenticated;
create policy ncc_deletion_read_own on public.ncc_account_deletion_requests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ncc_deletion_request_own on public.ncc_account_deletion_requests
  for insert to authenticated with check ((select auth.uid()) = user_id);
grant all on public.ncc_account_deletion_requests to service_role;
commit;
