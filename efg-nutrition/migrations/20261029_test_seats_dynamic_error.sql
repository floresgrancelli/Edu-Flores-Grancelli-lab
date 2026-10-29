-- No se alteran datos ni privilegios. Sólo se corrige el mensaje fijo
-- que informaba cinco cupos aun si la organización tenía otro límite.
-- CREATE OR REPLACE conserva la titularidad, grants y SECURITY DEFINER
-- existentes de la función; rechaza el cambio si su definición difiere.
do $migration$
declare
  fn text;
begin
  select pg_get_functiondef('public.efg_invite_test_student(text,text)'::regprocedure)
    into fn;
  if fn is null then raise exception 'No existe la función de invitaciones de prueba'; end if;
  if position($old$raise exception 'Se completaron los 5 cupos de prueba';$old$ in fn) > 0 then
    fn := replace(
      fn,
      $old$raise exception 'Se completaron los 5 cupos de prueba';$old$,
      $new$raise exception 'Se completaron los % cupos de prueba', v_org.seat_limit;$new$
    );
    execute fn;
  elsif position($new$raise exception 'Se completaron los % cupos de prueba', v_org.seat_limit;$new$ in fn) = 0 then
    raise exception 'Definición de invitaciones inesperada; sin cambios';
  end if;
end
$migration$;