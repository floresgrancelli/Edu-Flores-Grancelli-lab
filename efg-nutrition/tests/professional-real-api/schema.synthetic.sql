-- PUBLIC SYNTHETIC MODEL V1. Written only from public candidate DTOs.
-- This is NOT R5.3, a production migration, or hosted-policy equivalence.
-- setup.mjs requires a fresh, owned, disposable CI stack before applying it.
begin;

create schema ncc_synthetic;
revoke all on schema ncc_synthetic from public, anon, authenticated;
grant usage on schema ncc_synthetic to authenticated;

create table ncc_synthetic.model (
  singleton boolean primary key default true check (singleton),
  version text not null check (version = 'PUBLIC_SYNTHETIC_INDEPENDENT_V1')
);
insert into ncc_synthetic.model values (true, 'PUBLIC_SYNTHETIC_INDEPENDENT_V1');

create table public.efg_organizations (
  id uuid primary key,
  coach_id uuid not null references auth.users(id),
  workspace_kind text not null check (workspace_kind in ('personal', 'professional')),
  payment_alias text check (char_length(payment_alias) between 3 and 100),
  is_test boolean not null default true check (is_test),
  status text not null default 'trial' check (status in ('trial', 'active')),
  legal_ready boolean not null default true,
  professional_enabled boolean not null default true
);
create unique index ncc_synthetic_one_professional on public.efg_organizations(coach_id)
  where workspace_kind = 'professional';

create table public.efg_profiles (
  user_id uuid primary key references auth.users(id),
  role text not null check (role = 'student'),
  organization_id uuid not null references public.efg_organizations(id),
  active boolean not null default true
);
create table ncc_synthetic.roster (
  user_id uuid not null references auth.users(id),
  organization_id uuid not null references public.efg_organizations(id),
  nickname text not null check (char_length(nickname) between 1 and 70),
  active boolean not null default true,
  consent_accepted boolean not null default true,
  primary key (organization_id, user_id)
);
create table public.efg_messages (
  -- No server-generated replacement: the caller's UUID is the primary key.
  id uuid primary key,
  student_id uuid not null references auth.users(id),
  coach_id uuid not null references auth.users(id),
  sender_id uuid not null references auth.users(id),
  body text not null check (body = btrim(body) and char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  visible boolean not null default true,
  check (student_id <> coach_id),
  check (sender_id in (student_id, coach_id))
);
create index ncc_synthetic_message_pair on public.efg_messages(coach_id, student_id, created_at, id);

-- SQL effects, not HTTP dispatch counters. Message INSERT history survives the
-- Node-only absent-receipt control; this table is inaccessible to API clients.
create table ncc_synthetic.effects (
  sequence bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('sendMessage', 'setAlias', 'markRead')),
  target_id uuid not null,
  created_at timestamptz not null default now()
);
create unique index ncc_synthetic_insert_once on ncc_synthetic.effects(target_id)
  where action = 'sendMessage';
create table ncc_synthetic.notifications (
  message_id uuid primary key references public.efg_messages(id) on delete cascade,
  recipient_id uuid not null references auth.users(id)
);

alter table ncc_synthetic.model enable row level security;
alter table ncc_synthetic.roster enable row level security;
alter table ncc_synthetic.effects enable row level security;
alter table ncc_synthetic.notifications enable row level security;
alter table public.efg_profiles enable row level security;
alter table public.efg_organizations enable row level security;
alter table public.efg_messages enable row level security;

revoke all on public.efg_profiles, public.efg_organizations, public.efg_messages
  from public, anon, authenticated;
revoke all on all tables in schema ncc_synthetic from public, anon, authenticated;
revoke all on all sequences in schema ncc_synthetic from public, anon, authenticated;
grant select (user_id, role, organization_id, active) on public.efg_profiles to authenticated;
grant select on public.efg_organizations to authenticated;
grant update (payment_alias) on public.efg_organizations to authenticated;
grant select on ncc_synthetic.roster to authenticated;
grant select (id, student_id, coach_id, sender_id, body, created_at, read_at)
  on public.efg_messages to authenticated;
grant insert (id, student_id, coach_id, sender_id, body) on public.efg_messages to authenticated;
grant update (read_at) on public.efg_messages to authenticated;

create policy synthetic_self_profile on public.efg_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy synthetic_owned_org on public.efg_organizations for select to authenticated
  using (coach_id = (select auth.uid()));
create policy synthetic_alias on public.efg_organizations for update to authenticated
  using (coach_id = (select auth.uid()) and workspace_kind = 'professional'
    and professional_enabled and is_test and legal_ready)
  with check (coach_id = (select auth.uid()) and workspace_kind = 'professional'
    and professional_enabled and is_test and legal_ready);
create policy synthetic_roster on ncc_synthetic.roster for select to authenticated
  using (exists (select 1 from public.efg_organizations o
    where o.id = roster.organization_id and o.coach_id = (select auth.uid())
      and o.workspace_kind = 'professional' and o.professional_enabled and o.legal_ready and o.is_test));

-- SECURITY INVOKER throughout client-callable APIs. Membership is stored SQL,
-- not user_metadata, JWT role promotion, a client fixture, or a cached claim.
create function ncc_synthetic.can_message(p_student uuid, p_coach uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select p_coach = (select auth.uid()) and exists (
    select 1 from ncc_synthetic.roster r join public.efg_organizations o on o.id = r.organization_id
    where r.user_id = p_student and r.active and r.consent_accepted
      and o.coach_id = p_coach and o.workspace_kind = 'professional'
      and o.professional_enabled and o.legal_ready and o.is_test
  );
$$;
revoke all on function ncc_synthetic.can_message(uuid, uuid) from public, anon, authenticated;
grant execute on function ncc_synthetic.can_message(uuid, uuid) to authenticated;

create policy synthetic_message_read on public.efg_messages for select to authenticated
  using (visible and ncc_synthetic.can_message(student_id, coach_id));
create policy synthetic_message_insert on public.efg_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and visible and read_at is null
    and ncc_synthetic.can_message(student_id, coach_id));
create policy synthetic_message_read_at on public.efg_messages for update to authenticated
  using (visible and sender_id = student_id and read_at is null
    and ncc_synthetic.can_message(student_id, coach_id))
  with check (visible and sender_id = student_id and read_at is not null
    and ncc_synthetic.can_message(student_id, coach_id));

-- The only definer functions are non-exposed trigger bodies for SQL evidence.
-- Neither role can invoke them. They check the authenticated actor explicitly.
create function ncc_synthetic.message_effect() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' and NEW.sender_id = NEW.coach_id then
    if (select auth.uid()) is distinct from NEW.coach_id then
      raise exception using errcode = '42501', message = 'Synthetic actor required';
    end if;
    insert into ncc_synthetic.effects(actor_id, action, target_id)
      values (NEW.coach_id, 'sendMessage', NEW.id);
    insert into ncc_synthetic.notifications(message_id, recipient_id)
      values (NEW.id, NEW.student_id);
  elsif TG_OP = 'UPDATE' and OLD.read_at is null and NEW.read_at is not null then
    if (select auth.uid()) is distinct from NEW.coach_id then
      raise exception using errcode = '42501', message = 'Synthetic actor required';
    end if;
    insert into ncc_synthetic.effects(actor_id, action, target_id)
      values (NEW.coach_id, 'markRead', NEW.id);
  end if;
  return NEW;
end;
$$;
revoke all on function ncc_synthetic.message_effect() from public, anon, authenticated;
create trigger synthetic_message_effect after insert or update on public.efg_messages
  for each row execute function ncc_synthetic.message_effect();
create function ncc_synthetic.alias_effect() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if NEW.payment_alias is distinct from OLD.payment_alias then
    if (select auth.uid()) is distinct from NEW.coach_id then
      raise exception using errcode = '42501', message = 'Synthetic actor required';
    end if;
    insert into ncc_synthetic.effects(actor_id, action, target_id)
      values (NEW.coach_id, 'setAlias', NEW.id);
  end if;
  return NEW;
end;
$$;
revoke all on function ncc_synthetic.alias_effect() from public, anon, authenticated;
create trigger synthetic_alias_effect after update of payment_alias on public.efg_organizations
  for each row execute function ncc_synthetic.alias_effect();

create function public.ncc_dual_workspace_contexts_v1() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('user_id', p.user_id, 'active', p.active,
    'profile_role', p.role, 'student_context', jsonb_build_object('organization_id', p.organization_id),
    'coach_contexts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', o.id, 'coach_id', o.coach_id, 'is_test', o.is_test,
      'status', o.status, 'legal_ready', o.legal_ready) order by o.id)
      from public.efg_organizations o where o.coach_id = p.user_id
      and o.workspace_kind = 'professional' and o.professional_enabled and o.legal_ready), '[]'::jsonb))
  from public.efg_profiles p where p.user_id = (select auth.uid()) and p.active;
$$;
create function public.ncc_pilot_workspace_roster_v1(p_org uuid)
returns table(user_id uuid, organization_id uuid, nickname text, active boolean, consent_accepted boolean)
language sql stable security invoker set search_path = '' as $$
  select r.user_id, r.organization_id, r.nickname, r.active, r.consent_accepted
  from ncc_synthetic.roster r where r.organization_id = p_org order by r.user_id;
$$;
create function public.efg_set_coach_alias(p_alias text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  if p_alias is null or p_alias <> btrim(p_alias) or char_length(p_alias) not between 3 and 100 then
    raise exception using errcode = '22023', message = 'Synthetic alias rejected';
  end if;
  update public.efg_organizations set payment_alias = p_alias
    where coach_id = (select auth.uid()) and workspace_kind = 'professional'
      and professional_enabled and legal_ready and is_test;
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception using errcode = '42501', message = 'Synthetic workspace denied';
  end if;
  return true;
end;
$$;
create function public.efg_coach_shared_student_recipes(p_student uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not ncc_synthetic.can_message(p_student, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Synthetic workspace denied';
  end if;
  -- The five mutation/reconciliation cases do not seed or certify recipes.
  return '[]'::jsonb;
end;
$$;
revoke all on function public.ncc_dual_workspace_contexts_v1(),
  public.ncc_pilot_workspace_roster_v1(uuid), public.efg_set_coach_alias(text),
  public.efg_coach_shared_student_recipes(uuid) from public, anon, authenticated;
grant execute on function public.ncc_dual_workspace_contexts_v1(),
  public.ncc_pilot_workspace_roster_v1(uuid), public.efg_set_coach_alias(text),
  public.efg_coach_shared_student_recipes(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
