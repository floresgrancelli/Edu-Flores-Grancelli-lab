-- EFG Nutrition Pro: el alta comercial del coach la confirma SOLO el administrador.
-- Los coaches recién invitados permanecen 'trial' (pendientes de contrato), con
-- MI DÍA privado activo pero sin permisos para invitar alumnos.
-- Mantener la organización is_test del administrador y sus alumnos existentes.
-- No modifica filas, perfiles, consentimientos, pagos ni cupos vigentes.
do $migration$
declare
  src text;
  target regprocedure;
  old_inv text := $old$if not found or v_org.status not in ('trial','active','grace') or not exists$old$;
  new_inv text := $new$if not found or v_org.status not in ('active','grace') or not exists$new$;
  old_restore text := $old$if v_org.status not in ('trial','active','grace') then$old$;
  new_restore text := $new$if (v_org.status not in ('active','grace') and not v_org.is_test) then$new$;
begin
  target:='public.efg_invite_student(text,text)'::regprocedure;
  select pg_get_functiondef(target) into src;
  if strpos(src,old_inv)>0 then
    src:=replace(src,old_inv,new_inv);
    execute src;
  elsif strpos(src,new_inv)=0 then
    raise exception 'Definición efg_invite_student desconocida: revisión manual necesaria';
  end if;

  target:='public.efg_set_student_active(uuid,boolean)'::regprocedure;
  select pg_get_functiondef(target) into src;
  if strpos(src,old_restore)>0 then
    src:=replace(src,old_restore,new_restore);
    execute src;
  elsif strpos(src,new_restore)=0 then
    raise exception 'Definición efg_set_student_active desconocida: revisión manual necesaria';
  end if;
end
$migration$;