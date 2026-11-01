-- PRIVATE test teardown only. Stack disposal remains always() even if this script fails.
begin;
do $$ begin
 if current_user<>'postgres' or not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
 then raise exception 'LOCAL only';end if;
end $$;
update efg_private.coach_release_switches set enabled=false
 where switch_key in ('pilot_coach_atomic_publication','pilot_student_diary_write_gate');
update efg_private.bound_publication_local_gate set enabled=false;
do $$ declare r record;begin
 for r in select definition from efg_private.bound_publication_local_originals loop execute r.definition;end loop;
end $$;
drop function efg_private.assert_bound_publication_local(uuid,bigint,uuid);
drop table efg_private.bound_publication_local_gate;
drop table efg_private.bound_publication_local_originals;
notify pgrst,'reload schema';
commit;
