create temporary table ncc_diary_gate_probe(student_id uuid, marker integer) on commit drop;
create trigger ncc_diary_probe before insert or update on ncc_diary_gate_probe for each row execute function efg_private.coach_diary_write_gate();
do $qa$
declare p record; prior_claims text:=current_setting('request.jwt.claims',true); checked integer:=0; denied boolean; other_id uuid;
begin
 for p in select user_id,role from public.efg_profiles where active and role in ('coach','admin') loop
  perform set_config('request.jwt.claims',json_build_object('sub',p.user_id,'role','authenticated')::text,true);
  insert into ncc_diary_gate_probe values(p.user_id,1);
  update ncc_diary_gate_probe set marker=2 where student_id=p.user_id;
  select user_id into other_id from public.efg_profiles where user_id<>p.user_id limit 1;
  denied:=false;
  begin insert into ncc_diary_gate_probe values(other_id,3);
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Cross-owner write was allowed'; end if;
  denied:=false;
  begin update ncc_diary_gate_probe set student_id=other_id where student_id=p.user_id;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Owner reassignment was allowed'; end if;
  checked:=checked+1;
 end loop;
 if checked<2 then raise exception 'Missing professional fixtures'; end if;
 for p in select user_id,role,active from public.efg_profiles where role='student' or not active loop
  perform set_config('request.jwt.claims',json_build_object('sub',p.user_id,'role','authenticated')::text,true);
  if public.efg_coach_pilot_entry_status()->>'can_log_meals' is distinct from 'true' then
   denied:=false;
   begin insert into ncc_diary_gate_probe values(p.user_id,4);
   exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Pending student/inactive profile was allowed'; end if;
  end if;
 end loop;
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
end $qa$;
drop table ncc_diary_gate_probe;
