\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.ncc_account_deletion_requests(user_id,source)
values ('11111111-1111-4111-8111-111111111111','privacy_web');
do $$begin
  if (select count(*) from public.ncc_account_deletion_requests) <> 1 then raise exception 'Own request not readable';end if;
  begin
    insert into public.ncc_account_deletion_requests(user_id,source) values ('22222222-2222-4222-8222-222222222222','privacy_web');
    raise exception 'Foreign insert allowed';
  exception when insufficient_privilege then null;end;
  begin
    insert into public.ncc_account_deletion_requests(user_id,source,status) values ('11111111-1111-4111-8111-111111111111','privacy_web','completed');
    raise exception 'Client status override allowed';
  exception when insufficient_privilege then null;end;
  begin
    update public.ncc_account_deletion_requests set user_id='22222222-2222-4222-8222-222222222222';
    raise exception 'Owner reassignment allowed';
  exception when insufficient_privilege then null;end;
  begin
    delete from public.ncc_account_deletion_requests;
    raise exception 'Client delete allowed';
  exception when insufficient_privilege then null;end;
  begin
    truncate public.ncc_account_deletion_requests;
    raise exception 'Client truncate allowed';
  exception when insufficient_privilege then null;end;
  begin
    insert into public.ncc_account_deletion_requests(user_id,source) values ('11111111-1111-4111-8111-111111111111','privacy_web');
    raise exception 'Duplicate pending request allowed';
  exception when unique_violation then null;end;
end$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
  if exists(select 1 from public.ncc_account_deletion_requests) then raise exception 'Foreign request visible';end if;
end$$;
set local role anon;
do $$begin
  begin perform 1 from public.ncc_account_deletion_requests;raise exception 'Anon read allowed';exception when insufficient_privilege then null;end;
  begin insert into public.ncc_account_deletion_requests(user_id,source) values ('11111111-1111-4111-8111-111111111111','privacy_web');raise exception 'Anon insert allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
  if not (select relrowsecurity from pg_class where oid='public.ncc_account_deletion_requests'::regclass) then raise exception 'RLS disabled';end if;
  if has_table_privilege('authenticated','public.ncc_account_deletion_requests','UPDATE,DELETE,TRUNCATE') then raise exception 'Excess client privileges';end if;
end$$;
rollback;
\echo 'Deletion request RLS tests passed'
