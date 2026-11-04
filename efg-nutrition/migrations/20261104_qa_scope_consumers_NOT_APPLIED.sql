-- CANDIDATE ONLY: registry + consumers must be installed in ONE transaction,
-- after integration QA. No enrollment or global switch activation in this file.
do $patch$
declare d text; needle text; replacement text;
begin
 if exists(select 1 from efg_private.p29_qa_release_scope) then
  raise exception 'Install requires empty QA registry'; end if;
 if exists(select 1 from efg_private.coach_release_switches where enabled and switch_key in
 ('pilot_coach_atomic_publication','pilot_health_bound_publication','pilot_student_diary_write_gate')) then
  raise exception 'Install requires three global switches OFF'; end if;
 select pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure) into d;
 if md5(d)<>'90c7c64b6581f84a893d67ada77b7af6' then raise exception 'Atomic function drift'; end if;
 needle:=$s$ where switch_key='pilot_coach_atomic_publication';$s$;
 replacement:=needle||E'\n if efg_private.p29_qa_scope_required(p_student,\'coach\') then v_enabled:=true; end if;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'Atomic anchor drift'; end if;
 execute replace(d,needle,replacement);

 select pg_get_functiondef('efg_private.p28_require_current_health_source()'::regprocedure) into d;
 if md5(d)<>'a184be87eb4c7c9465f8c1b4bad74fa1' then raise exception 'Health function drift'; end if;
 needle:=$s$ if not exists(select 1 from efg_private.coach_release_switches
  where switch_key='pilot_health_bound_publication' and enabled) then return new; end if;$s$;
 -- Evaluate scope BEFORE global switch; invalid enrollment must never short-circuit.
 replacement:=$s$ if not efg_private.p29_qa_scope_required(new.student_id,'coach') then
  if not exists(select 1 from efg_private.coach_release_switches
   where switch_key='pilot_health_bound_publication' and enabled) then return new; end if;
 end if;$s$;
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'Health anchor drift'; end if;
 execute replace(d,needle,replacement);

 select pg_get_functiondef('efg_private.coach_diary_write_gate()'::regprocedure) into d;
 if md5(d)<>'9153d76a27b5a792b978e1f3a5520da8' then raise exception 'Diary function drift'; end if;
 needle:=$s$ -- OFF: preserve legacy PWA diary writes byte-for-byte.$s$;
 replacement:=$s$ -- Preserve the existing maintenance exception; ordinary users cannot set auth.role.
 if auth.role()='service_role' then return new; end if;
 -- Check OLD as well: changing owner cannot escape an enrolled student's gate.
 if tg_op='UPDATE' then
  if efg_private.p29_qa_scope_required(old.student_id,'student') then v_enabled:=true; end if;
 end if;
 if efg_private.p29_qa_scope_required(new.student_id,'student') then v_enabled:=true; end if;
 -- OFF for unregistered students retains legacy behavior.$s$;
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'Diary anchor drift'; end if;
 execute replace(d,needle,replacement);
end $patch$;
