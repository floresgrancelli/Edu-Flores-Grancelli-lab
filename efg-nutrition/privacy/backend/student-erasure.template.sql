-- CANDIDATE ONLY. Not applied to hosted production. Requires request table first.
begin;
alter table public.ncc_account_deletion_requests
 add column role_at_processing text,
 add column profile_email_at_processing text,
 add column db_purged_at timestamptz,
 add column storage_purged_at timestamptz;

create function public.ncc_erasure_schema_matches() returns boolean
language sql stable security invoker set search_path=pg_catalog,public as $fn$
 with actual_fk as (
   select jsonb_build_object('source_table',src.relname,'target_table',
     case when ns.nspname='public' then dst.relname else ns.nspname||'.'||dst.relname end,
     'definition',replace(pg_get_constraintdef(c.oid),'REFERENCES public.','REFERENCES ')) as row
   from pg_constraint c join pg_class src on src.oid=c.conrelid
   join pg_namespace sns on sns.oid=src.relnamespace
   join pg_class dst on dst.oid=c.confrelid join pg_namespace ns on ns.oid=dst.relnamespace
   where c.contype='f' and sns.nspname='public' and left(src.relname,4)='efg_'
 ), actual_columns as (
   select jsonb_build_object('table_name',table_name,'column_name',column_name,
     'data_type',data_type,'udt_name',udt_name,'is_nullable',is_nullable) as row
   from information_schema.columns where table_schema='public' and left(table_name,4)='efg_'
 )
 select (select jsonb_agg(row order by row::text) from actual_fk)
       = (select jsonb_agg(value order by value::text) from jsonb_array_elements(@@FOREIGN_KEYS@@::jsonb))
    and (select jsonb_agg(row order by row::text) from actual_columns)
       = (select jsonb_agg(value order by value::text) from jsonb_array_elements(@@COLUMNS@@::jsonb));
$fn$;

create function public.ncc_student_erasure_scopes() returns jsonb
language sql immutable security invoker set search_path=pg_catalog as $fn$
 select @@SCOPES@@::jsonb;
$fn$;

create function public.ncc_assert_student_erasure(p_uid uuid,p_email text) returns void
language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare r record; scopes jsonb:=public.ncc_student_erasure_scopes(); scope text; qty bigint;
begin
 if public.ncc_erasure_schema_matches() is distinct from true then raise exception 'SCHEMA_REVIEW_REQUIRED';end if;
 if exists(select 1 from public.efg_payments where payer_id=p_uid or recipient_id=p_uid) then
   raise exception 'FINANCIAL_REVIEW_REQUIRED';
 end if;
 -- Reject relationships in which this nominal student is acting for someone else.
 for r in
   select src.relname as tbl,a.attname as col,dst.relname as target
   from pg_constraint c join pg_class src on src.oid=c.conrelid
   join pg_namespace ns on ns.oid=src.relnamespace
   join pg_class dst on dst.oid=c.confrelid
   join pg_attribute a on a.attrelid=src.oid and a.attnum=c.conkey[1]
   where c.contype='f' and ns.nspname='public' and array_length(c.conkey,1)=1
   and c.confrelid in ('auth.users'::regclass,'public.efg_profiles'::regclass,'public.efg_goals'::regclass)
   and left(src.relname,4)='efg_'
 loop
   scope:=scopes->>r.tbl;
   if scope is null then scope:='false';end if;
   if r.target='efg_goals' then
     execute format('select count(*) from public.%I where %I in (select id from public.efg_goals where student_id=$1) and not coalesce((%s),false)',r.tbl,r.col,scope) into qty using p_uid,p_email;
   else
     execute format('select count(*) from public.%I where %I=$1 and not coalesce((%s),false)',r.tbl,r.col,scope) into qty using p_uid,p_email;
   end if;
   if qty>0 then raise exception 'PROFESSIONAL_LINK_REVIEW_REQUIRED';end if;
 end loop;
end;
$fn$;

-- The sole definer helper checks only the caller's signed identity, takes no
-- user ID argument, and lives outside exposed API schemas. It allows legitimate
-- onboarding before a profile exists while denying JWTs of deleted Auth users.
create schema ncc_erasure_private;
revoke all on schema ncc_erasure_private from public,anon;
grant usage on schema ncc_erasure_private to authenticated,service_role;
create function ncc_erasure_private.current_auth_user_exists() returns boolean
language sql stable security definer set search_path='' as $fn$
 select auth.uid() is not null and exists(select 1 from auth.users where id=(select auth.uid()));
$fn$;
revoke all on function ncc_erasure_private.current_auth_user_exists() from public,anon;
grant execute on function ncc_erasure_private.current_auth_user_exists() to authenticated,service_role;

create function public.ncc_freeze_erasure_writes() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare uid uuid:=auth.uid();
begin
 if uid is not null and current_user<>'service_role' then
   perform pg_advisory_xact_lock(hashtextextended('ncc-delete:'||uid::text,0));
   if exists(select 1 from public.ncc_account_deletion_requests where user_id=uid and status='processing') then
     raise exception 'ACCOUNT_DELETION_IN_PROGRESS';
   end if;
   -- Old signed JWTs can outlive Auth deletion. No permanent tombstone is needed.
   if ncc_erasure_private.current_auth_user_exists() is distinct from true then
     raise exception 'ACCOUNT_NO_LONGER_AVAILABLE';
   end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;
$fn$;
@@FREEZE_TRIGGERS@@

create function public.ncc_prepare_student_erasure(p_request_id uuid) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare req public.ncc_account_deletion_requests%rowtype; profile public.efg_profiles%rowtype; files jsonb;
begin
 select * into req from public.ncc_account_deletion_requests where id=p_request_id for update;
 if not found or req.status not in ('pending','processing') then raise exception 'VERIFIED_REQUEST_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('ncc-delete:'||req.user_id::text,0));
 if public.ncc_erasure_schema_matches() is distinct from true then raise exception 'SCHEMA_REVIEW_REQUIRED';end if;
 if req.db_purged_at is null then
   select * into profile from public.efg_profiles where user_id=req.user_id for update;
   if not found or profile.role<>'student' then raise exception 'ROLE_REQUIRES_MANUAL_REVIEW';end if;
   perform public.ncc_assert_student_erasure(req.user_id,profile.email);
   update public.ncc_account_deletion_requests set status='processing',
     role_at_processing='student',profile_email_at_processing=profile.email where id=req.id;
   update public.efg_profiles set active=false where user_id=req.user_id;
   update public.efg_consents set accepted=false where student_id=req.user_id;
 else
   if req.role_at_processing is distinct from 'student' then raise exception 'ROLE_REQUIRES_MANUAL_REVIEW';end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name,'owner_id',owner_id) order by bucket_id,name),'[]'::jsonb)
 into files from storage.objects where owner_id=req.user_id::text;
 return jsonb_build_object('request_id',req.id,'user_id',req.user_id,'role','student','status','processing','files',files);
end;
$fn$;

create function public.ncc_purge_student_data(p_request_id uuid) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare req public.ncc_account_deletion_requests%rowtype; tbl text; scope text;
 scopes jsonb:=public.ncc_student_erasure_scopes();qty bigint;
begin
 select * into req from public.ncc_account_deletion_requests where id=p_request_id for update;
 if not found or req.status<>'processing' or req.role_at_processing is distinct from 'student' then
   raise exception 'PROCESSING_REQUEST_REQUIRED';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('ncc-delete:'||req.user_id::text,0));
 perform public.ncc_assert_student_erasure(req.user_id,req.profile_email_at_processing);
 if exists(select 1 from storage.objects where owner_id=req.user_id::text) then raise exception 'OWNED_FILES_REMAIN';end if;
 if req.db_purged_at is null then
   if not exists(select 1 from public.efg_profiles where user_id=req.user_id and role='student') then
     raise exception 'ROLE_REQUIRES_MANUAL_REVIEW';end if;
   foreach tbl in array @@DELETE_ORDER@@ loop
     scope:=scopes->>tbl;
     if scope is null then raise exception 'UNKNOWN_DELETION_SCOPE';end if;
     execute format('delete from public.%I where coalesce((%s),false)',tbl,scope) using req.user_id,req.profile_email_at_processing;
   end loop;
   for tbl,scope in select * from jsonb_each_text(scopes) loop
     execute format('select count(*) from public.%I where coalesce((%s),false)',tbl,scope) into qty using req.user_id,req.profile_email_at_processing;
     if qty<>0 then raise exception 'PERSONAL_ROWS_REMAIN';end if;
   end loop;
   update public.ncc_account_deletion_requests set db_purged_at=now(),storage_purged_at=now() where id=req.id;
 end if;
 return jsonb_build_object('request_id',req.id,'user_id',req.user_id,'database_purged',true,'storage_purged',true);
end;
$fn$;

revoke all on function public.ncc_erasure_schema_matches(),public.ncc_student_erasure_scopes(),
 public.ncc_assert_student_erasure(uuid,text),public.ncc_prepare_student_erasure(uuid),
 public.ncc_purge_student_data(uuid) from public,anon,authenticated;
grant execute on function public.ncc_erasure_schema_matches(),public.ncc_student_erasure_scopes(),
 public.ncc_assert_student_erasure(uuid,text),public.ncc_prepare_student_erasure(uuid),
 public.ncc_purge_student_data(uuid) to service_role;
revoke all on function public.ncc_freeze_erasure_writes() from public,anon;
grant execute on function public.ncc_freeze_erasure_writes() to authenticated,service_role;
commit;
