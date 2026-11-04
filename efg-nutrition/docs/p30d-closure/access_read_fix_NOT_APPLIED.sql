-- P30D proposal ONLY. Not installed: owner forbids changing permissions to obtain a PASS.
-- Reuses existing boolean authorization; does not expose participation receipts.
begin;
do $$ begin
 if (select md5(qual) from pg_policies where schemaname='public' and tablename='efg_student_plan_access' and policyname='efg_access_coach_linked') is distinct from '3b9559c3abae4095554cf24e8a588421' then raise exception 'Access policy drift'; end if;
 if to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is null then raise exception 'Existing authorization helper missing'; end if;
end $$;
alter policy efg_access_coach_linked on public.efg_student_plan_access
 using (coach_id=(select auth.uid()) and efg_private.coach_pilot_share_active(student_id,organization_id));
commit;
