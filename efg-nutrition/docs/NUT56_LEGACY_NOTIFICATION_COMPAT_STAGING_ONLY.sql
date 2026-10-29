-- NUT-56 STAGING-ONLY / DO NOT APPLY TO HOSTED PRODUCTION.
-- Production already has triggers that create a goal notice + a guide notice.
-- The atomic publication RPC produces its OWN unified notice. Without
-- compatibility, one published plan would show THREE notifications.
-- Preserve legacy trigger function bodies exactly; only add a narrow WHEN
-- condition on their two trigger definitions during the atomic transaction.
-- This must be reviewed and deployed atomically with the RPC, not separately.
begin;
do $efg_check$
declare
 v_goal text;
 v_guide text;
begin
 select pg_catalog.pg_get_triggerdef(t.oid,true) into v_goal
 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
 where c.oid='public.efg_goals'::regclass
   and t.tgname='trg_efg_notify_goal' and not t.tgisinternal
   and t.tgfoid='public.efg_notify_goal()'::regprocedure
   and t.tgenabled='O';
 select pg_catalog.pg_get_triggerdef(t.oid,true) into v_guide
 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
 where c.oid='public.efg_food_plans'::regclass
   and t.tgname='trg_efg_notify_food_guide' and not t.tgisinternal
   and t.tgfoid='public.efg_notify_food_guide()'::regprocedure
   and t.tgenabled='O';
 if v_goal is null or v_goal not like '%AFTER INSERT ON%'
    or v_goal like '% WHEN %'
    or v_guide is null or v_guide not like '%AFTER INSERT OR UPDATE ON%'
    or v_guide like '% WHEN %' then
   raise exception 'STOP NUT56: production trigger identities/declarations drifted'
     using errcode='55000';
 end if;
 if pg_catalog.strpos(pg_catalog.pg_get_functiondef('public.efg_notify_goal()'::regprocedure),'goal:')=0
    or pg_catalog.strpos(pg_catalog.pg_get_functiondef('public.efg_notify_food_guide()'::regprocedure),'guide:')=0 then
   raise exception 'STOP NUT56: existing notification function behavior changed'
     using errcode='55000';
 end if;
end $efg_check$;

drop trigger trg_efg_notify_goal on public.efg_goals;
create trigger trg_efg_notify_goal
after insert on public.efg_goals
for each row
when (coalesce(pg_catalog.current_setting('efg.coach_atomic_publish',true),'') <> 'on')
execute function public.efg_notify_goal();

drop trigger trg_efg_notify_food_guide on public.efg_food_plans;
create trigger trg_efg_notify_food_guide
after insert or update on public.efg_food_plans
for each row
when (coalesce(pg_catalog.current_setting('efg.coach_atomic_publish',true),'') <> 'on')
execute function public.efg_notify_food_guide();
commit;

-- The atomic RPC sets this transaction-local setting ONLY after authorizing
-- coach, student, current consent, draft, nutritional and legal evidence.
-- Outside the RPC the original legacy notifications remain in effect.
-- Old-client direct goal/guide DML must still be revoked during cutover.
-- NEVER treat this GUC as authentication or as a substitute for RLS.
