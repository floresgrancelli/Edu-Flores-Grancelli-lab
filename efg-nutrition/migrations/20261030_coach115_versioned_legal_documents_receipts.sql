-- COACH115 · Additive legal document versions and explicit receipts.
-- SAFE TO STAGE ON HOSTED: publishes zero documents, accepts zero users,
-- changes no legacy clients, diary rows, goals or access ledgers.
-- Only a reviewed current terms AND privacy document can later be accepted.
-- This is NOT a clinical/health-data consent or a lawyer-reviewed text.
do $coach115$
begin
 if pg_catalog.to_regclass('public.efg_legal_documents') is not null
 or pg_catalog.to_regclass('public.efg_legal_acceptances') is not null
 or pg_catalog.to_regprocedure('public.efg_legal_current_status()') is not null
 or pg_catalog.to_regprocedure('public.efg_accept_current_legal(uuid,uuid,boolean,boolean)') is not null then
  raise exception 'COACH115 already present: review schema before editing';
 end if;
end $coach115$;

create table public.efg_legal_documents (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 kind text not null check(kind in ('terms','privacy')),
 version text not null check(version ~ '^[a-z0-9_]{5,80}$'),
 body text not null,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 is_current boolean not null default false,
 published_at timestamptz,
 created_at timestamptz not null default pg_catalog.now(),
 unique(kind,version),
 constraint coach115_only_reviewed_published_current
  check(not is_current or
    (published_at is not null and pg_catalog.char_length(body)>=300))
);
create unique index coach115_single_current_doc_per_kind
 on public.efg_legal_documents(kind) where is_current;

create table public.efg_legal_acceptances (
 user_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null references public.efg_legal_documents(id),
 accepted_at timestamptz not null default pg_catalog.now(),
 acceptance_method text not null default 'explicit_checkbox'
  check(acceptance_method='explicit_checkbox'),
 primary key (user_id,document_id)
);
create index coach115_legal_receipts_by_document
 on public.efg_legal_acceptances(document_id);

alter table public.efg_legal_documents enable row level security;
alter table public.efg_legal_acceptances enable row level security;
revoke all on public.efg_legal_documents from public,anon,authenticated;
revoke all on public.efg_legal_acceptances from public,anon,authenticated;
grant select on public.efg_legal_documents to authenticated;
grant select on public.efg_legal_acceptances to authenticated;
create policy coach115_public_current_docs on public.efg_legal_documents
 for select to authenticated using(is_current and published_at is not null);
create policy coach115_own_legal_receipts on public.efg_legal_acceptances
 for select to authenticated using(user_id=(select auth.uid()));
-- No INSERT/UPDATE/DELETE permissions for browser clients; audited receipts
-- are created only through the signed RPC after both checkboxes are explicit.

create function public.efg_legal_current_status()
returns table(kind text,document_id uuid,version text,sha256 text,accepted boolean)
language sql stable security definer
set search_path=''
as $status$
 select doc.kind,doc.id,doc.version,doc.sha256,
  (receipt.user_id is not null) as accepted
 from public.efg_legal_documents doc
 left join public.efg_legal_acceptances receipt
  on receipt.document_id=doc.id and receipt.user_id=auth.uid()
 where auth.uid() is not null
  and doc.is_current and doc.published_at is not null
  and doc.sha256=pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(doc.body,'UTF8')),'hex')
 order by doc.kind;
$status$;
revoke all on function public.efg_legal_current_status()
 from public,anon,authenticated;
grant execute on function public.efg_legal_current_status()
 to authenticated;

create function public.efg_accept_current_legal(
 p_terms_id uuid,p_privacy_id uuid,
 p_terms_checked boolean,p_privacy_checked boolean)
returns boolean
language plpgsql security definer set search_path=''
as $accept$
declare
 v_uid uuid := auth.uid();
 v_found integer;
begin
 if v_uid is null or p_terms_checked is distinct from true
 or p_privacy_checked is distinct from true
 or p_terms_id is null or p_privacy_id is null or p_terms_id=p_privacy_id then
  raise exception 'Both legal documents require explicit separate acceptance'
   using errcode='42501';
 end if;
 if not exists(
  select 1 from public.efg_profiles profile
  where profile.user_id=v_uid and profile.active
    and profile.role in ('student','coach','admin')
 ) then
  raise exception 'Inactive or missing signed profile'
   using errcode='42501';
 end if;
 -- Lock exact current versions so they cannot change mid-transaction.
 select count(*) into v_found
 from public.efg_legal_documents doc
 where (doc.id=p_terms_id and doc.kind='terms'
    or doc.id=p_privacy_id and doc.kind='privacy')
  and doc.is_current and doc.published_at is not null
  and pg_catalog.char_length(doc.body)>=300
  and doc.sha256=pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(doc.body,'UTF8')),'hex')
 for share;
 if v_found<>2 then
  raise exception 'Terms or privacy version unavailable or invalid'
   using errcode='PT409';
 end if;
 insert into public.efg_legal_acceptances(user_id,document_id)
 values (v_uid,p_terms_id),(v_uid,p_privacy_id)
 on conflict(user_id,document_id) do nothing;
 return true;
end;
$accept$;
revoke all on function public.efg_accept_current_legal(uuid,uuid,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.efg_accept_current_legal(uuid,uuid,boolean,boolean)
 to authenticated;
comment on function public.efg_accept_current_legal(uuid,uuid,boolean,boolean)
 is 'Explicit signed acceptance of TWO reviewed CURRENT legal documents. NOT medical consent. Fail closed before documents are published.';

-- No records are seeded and no published document is automatically activated.
-- The release remains OFF pending actual legal text, health consent and end-to-end UAT.
