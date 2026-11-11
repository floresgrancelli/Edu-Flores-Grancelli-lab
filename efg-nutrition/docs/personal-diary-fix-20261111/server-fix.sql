do $fix$
declare
 definition text;
 anchor text := ' -- COACH116 legal-first status reads current signed coach/org, two legal';
 replacement text := ' -- Active professional accounts own their personal diary; student publication
 -- remains mandatory for student profiles, including dual-role students.
 if exists(select 1 from public.efg_profiles p
   where p.user_id=v_actor and p.active=true and p.role in (''coach'',''admin'')) then
  return new;
 end if;

 -- COACH116 legal-first status reads current signed coach/org, two legal';
begin
 definition:=pg_catalog.pg_get_functiondef('efg_private.coach_diary_write_gate()'::regprocedure);
 if position(anchor in definition)=0 or position('p.role in (''coach'',''admin'')' in definition)>0 then
  raise exception 'Unexpected diary gate revision; inspect before applying';
 end if;
 execute replace(definition,anchor,replacement);
end $fix$;
