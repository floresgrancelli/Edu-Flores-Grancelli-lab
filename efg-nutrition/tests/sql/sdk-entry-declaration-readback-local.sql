-- PRIVATE disposable local overlay only; no new function, grant, or policy.
-- After persisted-guide-local-overlay.sql, before any fictional users are created.
begin;
do $local$
declare definition text;
begin
 if current_user<>'postgres' or current_database()<>'postgres'
  or not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
  or exists(select 1 from auth.users)
  or exists(select 1 from efg_private.coach_release_switches where enabled)
 then raise exception 'Empty isolated SDK fixture required'; end if;
 definition:=pg_get_functiondef('public.efg_get_coach_health_intake(uuid)'::regprocedure);
 if (length(definition)-length(replace(definition,'h.conditions,h.sibo_phase,','')))/length('h.conditions,h.sibo_phase,')<>1
  or (length(definition)-length(replace(definition,'''revision'',v_row.revision,''conditions'',v_row.conditions,','')))/length('''revision'',v_row.revision,''conditions'',v_row.conditions,')<>1
 then raise exception 'Scoped response anchors changed'; end if;
 definition:=replace(definition,'h.conditions,h.sibo_phase,','h.conditions,h.sibo_phase,h.restriction_declaration,');
 definition:=replace(definition,'''revision'',v_row.revision,''conditions'',v_row.conditions,',
  '''revision'',v_row.revision,''conditions'',v_row.conditions,''restriction_declaration'',v_row.restriction_declaration,');
 execute definition; -- CREATE OR REPLACE preserves existing grants and all authorization logic.
end $local$;
notify pgrst, 'reload schema';
commit;
