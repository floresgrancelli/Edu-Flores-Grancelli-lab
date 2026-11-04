-- Assertions executed ONLY between BEGIN and mandatory ROLLBACK of
-- the staging-preview assembled in GitHub Actions' disposable database.
-- All user IDs, organization IDs and foods are fictitious.
do $nut57_inside$
declare trig_goals text; trig_guide text;
begin
 if (select count(*) from public.efg_profiles where role='student')<>2
   or (select count(*) from public.efg_goals)<>1
   or (select count(*) from public.efg_food_plans)<>1
   or (select count(*) from public.efg_daily_logs)<>1
   or (select count(*) from public.efg_weights)<>1
   or (select count(*) from public.efg_activities)<>1
   or (select count(*) from public.efg_habitual_meals)<>1
   or (select count(*) from public.efg_personal_recipes)<>1
   or (select count(*) from public.efg_notifications)<>1 then
  raise exception 'NUT57 historic nutrition records changed during migration';
 end if;
 if (select count(*) from public.efg_student_plan_access
     where status='published' and published_by is not null)<>2
    or (select count(*) from public.efg_student_plan_access
     where student_id='22222222-2222-4222-8222-222222222222'::uuid
       and published_goal_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid)<>1 then
  raise exception 'NUT57 historical student access backfill did not preserve older goal';
 end if;
 if (select count(*) from public.efg_coach_plan_drafts)<>0
    or (select count(*) from public.efg_coach_plan_publish_receipts)<>0
    or (select count(*) from public.efg_legal_acceptances)<>0 then
  raise exception 'NUT57 created drafts, receipts or synthetic legal acceptance unexpectedly';
 end if;
 if pg_catalog.to_regprocedure('public.efg_publish_coach_plan_draft(uuid,bigint,uuid)') is null
    or pg_catalog.to_regprocedure('public.efg_accept_legal_documents(uuid[])') is null
    or pg_catalog.to_regprocedure('efg_private.coach_publication_policy_valid(uuid,jsonb,jsonb,uuid)') is null then
  raise exception 'NUT57 missing integrated atomic/legal/evidence RPC';
 end if;
 if pg_catalog.has_table_privilege('authenticated','public.efg_goals','INSERT')
    or pg_catalog.has_table_privilege('authenticated','public.efg_food_plans','UPDATE')
    or pg_catalog.has_table_privilege('authenticated','public.efg_legal_acceptances','INSERT') then
  raise exception 'NUT57 still exposes direct legacy writes or fabricated acceptance';
 end if;
 select pg_catalog.pg_get_triggerdef(t.oid,true) into trig_goals
 from pg_catalog.pg_trigger t where t.tgrelid='public.efg_goals'::regclass
  and t.tgname='trg_efg_notify_goal' and not t.tgisinternal;
 select pg_catalog.pg_get_triggerdef(t.oid,true) into trig_guide
 from pg_catalog.pg_trigger t where t.tgrelid='public.efg_food_plans'::regclass
  and t.tgname='trg_efg_notify_food_guide' and not t.tgisinternal;
 if trig_goals not like '%efg.coach_atomic_publish%'
   or trig_guide not like '%efg.coach_atomic_publish%' then
  raise exception 'NUT57 notification compatibility trigger missing';
 end if;
end
$nut57_inside$;
-- Test a freshly invited account. Creation + pending status will both roll back.
insert into public.efg_profiles(user_id,role,organization_id,email,nickname)
values('55555555-5555-4555-8555-555555555555','student',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','student-new@example.invalid','Alumno nuevo');
do $new_student_gate$
begin
 if (select status from public.efg_student_plan_access
   where student_id='55555555-5555-4555-8555-555555555555')<>'pending'
   or efg_private.student_nutrition_enabled('55555555-5555-4555-8555-555555555555')
   or not efg_private.student_nutrition_enabled('22222222-2222-4222-8222-222222222222') then
  raise exception 'NUT57 new-pending or historical-enabled gate incorrect';
 end if;
end
$new_student_gate$;
-- The existing student can still record, but new pending student cannot bypass
-- the server-side restrictive policies with a direct REST-equivalent INSERT.
set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
insert into public.efg_daily_logs(student_id,log_day)
 values('22222222-2222-4222-8222-222222222222','2026-10-29');
set request.jwt.claim.sub='55555555-5555-4555-8555-555555555555';
do $pending_rls$
begin
 begin
  insert into public.efg_daily_logs(student_id,log_day)
    values('55555555-5555-4555-8555-555555555555','2026-10-29');
  raise exception 'Pending student bypassed database write gate';
 exception when insufficient_privilege then null;
 end;
end
$pending_rls$;
reset role;
select 'PASS NUT57 INSIDE TRANSACTION: historical rows, 2 backfills, new pending gate, legal/food RPC, notifications, old/new direct RLS. ALL ROLLBACK.' as result;
