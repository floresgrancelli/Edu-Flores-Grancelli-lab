-- All rows are fictional, no Auth API, SMTP or external credentials.
create function public.qa_expect_error(p_sql text,p_code text) returns void
language plpgsql security invoker as $$
declare v_code text;
begin
 begin execute p_sql;
 exception when others then
  get stacked diagnostics v_code=returned_sqlstate;
  if v_code<>p_code then raise exception 'Expected %, got %: %',p_code,v_code,sqlerrm;end if;
  return;
 end;
 raise exception 'Expected error %, query succeeded',p_code;
end $$;
create function public.qa_assert(p_ok boolean,p_message text) returns void
language plpgsql security invoker as $$begin if p_ok is distinct from true then raise exception '%',p_message;end if;end$$;

set role service_role;
select public.qa_assert(not has_table_privilege(current_user,'auth.users','select'),'Do not broaden Auth privileges');
select public.ncc_self_register('00000000-0000-4000-8000-000000000001','self_qa_only');
select public.ncc_self_register('00000000-0000-4000-8000-000000000002','self_qa_only');
select public.qa_expect_error($q$select public.ncc_self_register('00000000-0000-4000-8000-000000000004','self_qa_only')$q$,'42501');
select public.qa_expect_error($q$select public.ncc_self_register('00000000-0000-4000-8000-000000000099','self_qa_only')$q$,'23503');
select public.qa_assert(public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_01',0,
 '{"processingConsent":true,"age_years":35,"height_cm":175,"weight_kg":80}')=1,'First intake');
select public.qa_assert(public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_01',0,
 '{"processingConsent":true,"age_years":35,"height_cm":175,"weight_kg":80}')=1,'Idempotent intake retry');
select public.qa_expect_error($q$select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_02',0,'{"processingConsent":true}')$q$,'PT409');
select public.qa_expect_error($q$select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_01',0,'{"processingConsent":true,"weight_kg":70}')$q$,'PT409');
select public.qa_expect_error($q$select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_02',1,'{"processingConsent":false}')$q$,'22023');
select public.qa_expect_error($q$select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_02',1,'{"processingConsent":true,"role":"admin"}')$q$,'22023');

-- The real shared engine produces this fixture envelope in the preceding CI step.
reset role;
\i efg-nutrition/self-management/backend/generated-qa-result.sql
set role service_role;
select public.qa_assert(public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000001','plan_request_001',1,
 (select payload from public.qa_result))=1,'Atomic first plan');
select public.qa_assert(public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000001','plan_request_001',1,
 (select payload from public.qa_result))=1,'Idempotent plan retry');
select public.qa_assert((select count(*)=1 from public.ncc_self_results),'No duplicate plan');
select public.qa_assert((select result ? 'goal' and result ? 'guide' from public.ncc_self_results),'Goal and guide saved together');
select public.qa_expect_error($q$select public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000002','plan_request_001',1,(select payload from public.qa_result))$q$,'PT409');
select public.qa_expect_error($q$select public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000001','plan_request_bad',1,jsonb_set((select payload from public.qa_result),'{guide,coachReviewed}','true'))$q$,'22023');
select public.qa_expect_error($q$select public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000001','plan_request_bad',1,jsonb_set((select payload from public.qa_result),'{guide,meals}','[]'))$q$,'22023');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.qa_assert((select count(*)=1 from public.ncc_self_intakes),'A reads own intake');
select public.qa_assert((select count(*)=1 from public.ncc_self_results),'A reads own result');
select public.qa_expect_error($q$select public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000001','forged_request_01',1,'{}')$q$,'42501');
select public.qa_expect_error($q$insert into public.ncc_self_intakes(user_id,revision,request_id,data) values('00000000-0000-4000-8000-000000000001',2,'forged_request_01','{}')$q$,'42501');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.qa_assert((select count(*)=0 from public.ncc_self_intakes),'B cannot read A intake');
select public.qa_assert((select count(*)=0 from public.ncc_self_results),'B cannot read A result');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.qa_assert((select count(*)=0 from public.ncc_self_results),'Coach cannot read independent results');
set role anon;
select public.qa_expect_error('select * from public.ncc_self_results','42501');
select public.qa_expect_error($q$select public.ncc_self_register('00000000-0000-4000-8000-000000000001','self_qa_only')$q$,'42501');

set role service_role;
select public.qa_assert(public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_02',1,
 '{"processingConsent":true,"weight_kg":79}')=2,'New intake version');
select public.qa_assert((select data->>'height_cm'='175' and data->>'age_years'='35' and data->>'weight_kg'='79'
 from public.ncc_self_intakes where user_id='00000000-0000-4000-8000-000000000001' and revision=2),'Partial changes preserve previous answers');
select public.qa_expect_error($q$select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_01',0,'{"processingConsent":true,"age_years":35,"height_cm":175,"weight_kg":80}')$q$,'PT409');
select public.qa_expect_error($q$select public.ncc_self_commit_plan('00000000-0000-4000-8000-000000000001','stale_plan_request',1,(select payload from public.qa_result))$q$,'PT409');
update public.ncc_self_accounts set mode='coach_linked' where user_id='00000000-0000-4000-8000-000000000001';
select public.qa_expect_error($q$select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000001','intake_request_03',2,'{"processingConsent":true}')$q$,'42501');
reset role;
select public.qa_assert((select count(*)=1 from public.ncc_self_results),'Rejected writes preserve history');
select public.qa_assert((select count(*)=2 from public.efg_profiles),'No roles created or replaced');
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
select public.qa_assert((select count(*)=0 from public.ncc_self_results),'Auth deletion cascades independent results');
select public.qa_assert((select count(*)=1 from public.ncc_self_accounts),'Other independent account preserved');
select 'self-management persistence scenarios passed' as result;
