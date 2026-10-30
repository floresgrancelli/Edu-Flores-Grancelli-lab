-- EFG NUTRITION PRO · LEG-07 / NUT-57 · STAGING-ONLY DESIGN (NOT PRODUCTION MIGRATION).
-- Requires a separately provisioned disposable database with efg_private.nut57_isolated_staging_marker.
-- NO legal texts are approved or seeded; NO existing users are recorded as consenting.
-- Run ONLY with dedicated rollback/recovery QA; production gate remains OFF.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';

do $legal_preflight$
begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null
  or pg_catalog.to_regclass('auth.users') is null
  or pg_catalog.to_regprocedure('auth.uid()') is null then
  raise exception 'LEGAL STAGING STOP: isolated marker or Auth dependencies absent' using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_legal_documents') is not null
  or pg_catalog.to_regclass('public.efg_legal_acceptances') is not null then
  raise exception 'LEGAL STAGING STOP: existing legal tables need a separate audited upgrade path' using errcode='55000';
 end if;
end
$legal_preflight$;

create table public.efg_legal_documents(
 id uuid primary key default pg_catalog.gen_random_uuid(),
 kind text not null check(kind in ('terms','privacy')),
 version text not null check(version ~ '^[A-Za-z0-9._-]{1,32}$'),
 locale text not null default 'es-AR' check(locale ~ '^[a-z]{2}-[A-Z]{2}$'),
 content text not null check(pg_catalog.length(pg_catalog.btrim(content)) between 100 and 100000),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'draft' check(status in ('draft','published','retired')),
 published_at timestamptz,
 effective_at timestamptz,
 retired_at timestamptz,
 created_at timestamptz not null default pg_catalog.clock_timestamp(),
 constraint legal_content_hash_verified check(
  sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(content,'UTF8')),'hex')
 ),
 constraint legal_published_dates check(
  status='draft' or (published_at is not null and effective_at is not null)
 ),
 constraint legal_retirement_check check(
  (status='retired')=(retired_at is not null)
 ),
 unique(kind,version,locale)
);
create unique index efg_legal_one_published_kind_locale
 on public.efg_legal_documents(kind,locale) where status='published';

create function efg_private.legal_document_freeze() returns trigger
language plpgsql security invoker set search_path=''
as $frozen$
begin
 if old.status='retired' then
  raise exception 'Retired legal text is immutable' using errcode='23514';
 end if;
 if old.status='published' then
  if (new.id,new.kind,new.version,new.locale,new.content,new.sha256,
      new.published_at,new.effective_at,new.created_at)
    is distinct from
     (old.id,old.kind,old.version,old.locale,old.content,old.sha256,
      old.published_at,old.effective_at,old.created_at)
    or new.status not in ('published','retired') then
    raise exception 'Published legal document cannot be overwritten or unpublished' using errcode='23514';
  end if;
 end if;
 return new;
end
$frozen$;
create trigger efg_legal_docs_immutable
before update on public.efg_legal_documents
for each row execute function efg_private.legal_document_freeze();

create table public.efg_legal_acceptances(
 id uuid primary key default pg_catalog.gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 document_id uuid not null references public.efg_legal_documents(id),
 accepted_at timestamptz not null default pg_catalog.clock_timestamp(),
 acceptance_method text not null check(acceptance_method='explicit_checkbox'),
 document_hash_sha256 text not null check(document_hash_sha256 ~ '^[a-f0-9]{64}$'),
 version text not null,
 kind text not null check(kind in ('terms','privacy')),
 recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
 unique(user_id,document_id)
);

create function efg_private.legal_acceptance_immutable() returns trigger
language plpgsql security invoker set search_path=''
as $immutable$
begin
 raise exception 'Legal acceptance records cannot be edited in place' using errcode='23514';
end
$immutable$;
create trigger efg_legal_acceptance_no_update
before update on public.efg_legal_acceptances
for each row execute function efg_private.legal_acceptance_immutable();

alter table public.efg_legal_documents enable row level security;
alter table public.efg_legal_acceptances enable row level security;
revoke all on public.efg_legal_documents from public,anon,authenticated;
revoke all on public.efg_legal_acceptances from public,anon,authenticated;
grant select on public.efg_legal_documents to authenticated;
grant select on public.efg_legal_acceptances to authenticated;
create policy legal_published_text_read on public.efg_legal_documents
 for select to authenticated
 using(status in ('published','retired') and effective_at<=pg_catalog.now());
create policy legal_self_acceptance_read on public.efg_legal_acceptances
 for select to authenticated
 using(user_id=(select auth.uid()));

-- No user_id, timestamp, hash, role or version is accepted from the browser.
-- This RPC never fabricates historical acceptances. Current terms and privacy
-- are resolved by the server at the moment of the authenticated request.
create function public.efg_accept_legal_documents(p_document_ids uuid[])
returns integer language plpgsql volatile security definer set search_path=''
as $accept$
declare
 v_user uuid:=auth.uid();
 v_current uuid[];
 v_missing uuid[];
 v_supplied uuid[];
 v_inserted integer:=0;
begin
 if v_user is null or not exists(
    select 1 from auth.users where id=v_user
 ) then
   raise exception 'Authenticated user required' using errcode='42501';
 end if;
 if p_document_ids is null or pg_catalog.array_position(p_document_ids,null::uuid) is not null
  or pg_catalog.coalesce(pg_catalog.array_length(p_document_ids,1),0)>2 then
  raise exception 'Invalid legal document selection' using errcode='22023';
 end if;
 -- Deterministic selection with exactly one currently published document per kind.
 select pg_catalog.array_agg(id order by id) into v_current
 from public.efg_legal_documents
 where locale='es-AR' and status='published' and effective_at<=pg_catalog.now();
 if pg_catalog.coalesce(pg_catalog.array_length(v_current,1),0)<>2 then
   raise exception 'Published legal texts are not ready' using errcode='55000';
 end if;
 select pg_catalog.array_agg(d.id order by d.id) into v_missing
 from public.efg_legal_documents d
 where d.id=any(v_current)
   and not exists(
    select 1 from public.efg_legal_acceptances a
    where a.user_id=v_user and a.document_id=d.id
      and a.document_hash_sha256=d.sha256 and a.version=d.version and a.kind=d.kind
   );
 v_missing:=pg_catalog.coalesce(v_missing,array[]::uuid[]);
 select pg_catalog.array_agg(x order by x) into v_supplied
 from (select distinct x from pg_catalog.unnest(p_document_ids) x) q;
 v_supplied:=pg_catalog.coalesce(v_supplied,array[]::uuid[]);
 if pg_catalog.coalesce(pg_catalog.array_length(p_document_ids,1),0)
  <>pg_catalog.coalesce(pg_catalog.array_length(v_supplied,1),0)
  or v_missing<>v_supplied then
   raise exception 'Only missing current legal versions may be accepted' using errcode='22023';
 end if;
 insert into public.efg_legal_acceptances
  (user_id,document_id,acceptance_method,document_hash_sha256,version,kind)
 select v_user,d.id,'explicit_checkbox',d.sha256,d.version,d.kind
 from public.efg_legal_documents d
 where d.id=any(v_missing)
 on conflict (user_id,document_id) do nothing;
 get diagnostics v_inserted=row_count;
 return v_inserted;
end
$accept$;

create function public.efg_legal_current_status()
returns table(kind text,document_id uuid,version text,sha256 text,accepted boolean)
language plpgsql stable security definer set search_path=''
as $status$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then
  raise exception 'Authenticated user required' using errcode='42501';
 end if;
 return query
 select d.kind,d.id,d.version,d.sha256,exists(
   select 1 from public.efg_legal_acceptances a
   where a.user_id=v_user and a.document_id=d.id
     and a.document_hash_sha256=d.sha256 and a.version=d.version and a.kind=d.kind
 ) as accepted
 from public.efg_legal_documents d
 where d.locale='es-AR' and d.status='published' and d.effective_at<=pg_catalog.now()
 order by d.kind;
end
$status$;

revoke all on function public.efg_accept_legal_documents(uuid[]) from public,anon,authenticated;
revoke all on function public.efg_legal_current_status() from public,anon,authenticated;
grant execute on function public.efg_accept_legal_documents(uuid[]) to authenticated;
grant execute on function public.efg_legal_current_status() to authenticated;
commit;

-- STOP: STAGING SQL, NOT reviewed legal content, NOT authorized for hosted production.
-- Privacy/terms wording, access to rights, retention and rollout gates remain BLOCKED.
