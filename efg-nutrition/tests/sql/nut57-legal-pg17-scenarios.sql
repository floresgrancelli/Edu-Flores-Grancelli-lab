-- LEG-07: synthetic PostgreSQL 17 acceptance checks, no real legal documents.
insert into public.efg_legal_documents
 (id,kind,version,content,sha256,status,published_at,effective_at)
select x.id,x.kind,'fixture-1',x.content,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(x.content,'UTF8')),'hex'),
 'published',pg_catalog.now()-interval '2 days',pg_catalog.now()-interval '1 day'
from (values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,'terms',pg_catalog.repeat('Synthetic sample terms only. ',8)),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,'privacy',pg_catalog.repeat('Synthetic sample privacy only. ',8))
) as x(id,kind,content);
do $verify$
begin
 if (select count(*) from public.efg_legal_acceptances)<>0 then
  raise exception 'No real or synthetic acceptances may be backfilled';
 end if;
 if pg_catalog.has_table_privilege('authenticated','public.efg_legal_acceptances','INSERT')
  or pg_catalog.has_table_privilege('authenticated','public.efg_legal_acceptances','UPDATE')
  or pg_catalog.has_function_privilege('anon','public.efg_accept_legal_documents(uuid[])','EXECUTE') then
  raise exception 'Unsafe legal permissions';
 end if;
end
$verify$;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $student_a$
declare n integer;
begin
 if (select count(*) from public.efg_legal_current_status() where accepted)<>0 then
  raise exception 'Missing documents must remain unaccepted';
 end if;
 select public.efg_accept_legal_documents(array[
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid]) into n;
 if n<>2 or (select count(*) from public.efg_legal_current_status() where accepted)<>2 then
  raise exception 'Explicit acceptance not persisted';
 end if;
 select public.efg_accept_legal_documents(array[]::uuid[]) into n;
 if n<>0 then raise exception 'Idempotent retry inserted records';end if;
end
$student_a$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $student_b$
begin
 if (select count(*) from public.efg_legal_acceptances)<>0 or
    (select count(*) from public.efg_legal_current_status() where accepted)<>0 then
  raise exception 'Cross-user legal acceptance leak';
 end if;
end
$student_b$;
reset role;
do $freeze$
begin
 begin
  update public.efg_legal_documents set content='tampered' where kind='terms';
  raise exception 'Published legal text edit was allowed';
 exception when check_violation then null;
 end;
 begin
  update public.efg_legal_acceptances set accepted_at='2000-01-01';
  raise exception 'Acceptance timestamp edit was allowed';
 exception when check_violation then null;
 end;
end
$freeze$;
-- Version change: previous terms remain historical, privacy remains accepted.
reset role;
update public.efg_legal_documents
 set status='retired',retired_at=pg_catalog.now()
 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid;
insert into public.efg_legal_documents
 (id,kind,version,content,sha256,status,published_at,effective_at)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid,'terms','fixture-2',v.content,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v.content,'UTF8')),'hex'),
 'published',pg_catalog.now(),pg_catalog.now()
from (select pg_catalog.repeat('Second version of synthetic terms only. ',6) as content) v;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $new_terms$
declare count_added integer;
begin
 if (select count(*) from public.efg_legal_current_status() where accepted)<>1 then
  raise exception 'New terms should require consent without repeating privacy';
 end if;
 begin
  perform public.efg_accept_legal_documents(array[
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid]);
  raise exception 'Retired terms accepted as current';
 exception when sqlstate '22023' then null;
 end;
 select public.efg_accept_legal_documents(array[
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid]) into count_added;
 if count_added<>1 or (select count(*) from public.efg_legal_current_status() where accepted)<>2
  or (select count(*) from public.efg_legal_acceptances)<>3 then
  raise exception 'Versioned new-only reacceptance failed';
 end if;
end
$new_terms$;
reset role;
select 'PASS LEG-07: immutable legal documents and acceptances, per-user JWT-claim simulation, version-specific reacceptance, no automatic consents' as result;
