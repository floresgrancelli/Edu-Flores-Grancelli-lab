-- Additive controls for the independent pilot; no changes to existing roles/data.
begin;
create table public.ncc_self_pilot_access(
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default false,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.ncc_self_legal_receipts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 version text not null check(version='ncc-self-legal-20261113'),
 accepted_at timestamptz not null default now(),
 revoked_at timestamptz
);
alter table public.ncc_self_pilot_access enable row level security;
alter table public.ncc_self_legal_receipts enable row level security;
revoke all on public.ncc_self_pilot_access,public.ncc_self_legal_receipts from public,anon,authenticated;
grant select on public.ncc_self_pilot_access,public.ncc_self_legal_receipts to authenticated;
grant all on public.ncc_self_pilot_access,public.ncc_self_legal_receipts to service_role;
create policy ncc_self_pilot_owner on public.ncc_self_pilot_access for select to authenticated using(user_id=(select auth.uid()));
create policy ncc_self_legal_owner on public.ncc_self_legal_receipts for select to authenticated using(user_id=(select auth.uid()));
create table ncc_self_private.rate_windows(
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('read','generate')),
 window_start timestamptz not null,
 attempts integer not null,
 primary key(user_id,kind)
);
alter table ncc_self_private.rate_windows enable row level security;
revoke all on ncc_self_private.rate_windows from public,anon,authenticated;
grant all on ncc_self_private.rate_windows to service_role;
create function public.ncc_self_consume_rate(p_user uuid,p_generate boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_attempts integer;v_kind text:=case when p_generate then 'generate' else 'read' end;
begin
 if current_user<>'service_role' or p_user is null then raise exception 'Server only' using errcode='42501';end if;
 insert into ncc_self_private.rate_windows as r(user_id,kind,window_start,attempts)
 values(p_user,v_kind,date_trunc('minute',now()),1)
 on conflict(user_id,kind) do update set
  attempts=case when r.window_start=date_trunc('minute',now()) then r.attempts+1 else 1 end,
  window_start=date_trunc('minute',now()) returning attempts into v_attempts;
 return v_attempts<=case when p_generate then 5 else 40 end;
end $$;
revoke all on function public.ncc_self_consume_rate(uuid,boolean) from public,anon,authenticated;
grant execute on function public.ncc_self_consume_rate(uuid,boolean) to service_role;
commit;
