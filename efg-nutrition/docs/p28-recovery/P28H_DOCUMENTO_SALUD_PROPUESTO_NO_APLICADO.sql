-- P28H: proposed content, not yet owner-approved or applied.
-- Execute only after approval of this exact text. Never insert acceptance receipts.
begin;
set local lock_timeout='3s';
set local statement_timeout='15s';
lock table efg_private.efg_coach_health_documents in exclusive mode;
do $p28h$
declare
 v_text text := $consent$Nutrición Con-Ciencia — Autorización de datos de salud del piloto

Si lo autorizás, Nutrición Con-Ciencia guardará y usará las restricciones alimentarias, alergias y condiciones que decidas informar para adaptar las orientaciones y la Dieta Guía. La app no realiza diagnósticos ni reemplaza la atención de un profesional.

Compartir esta declaración con tu coach vinculado es una elección separada. Si no lo autorizás, tu coach no podrá verla ni publicar una nueva guía adaptada a ella.

Podés actualizar tu declaración o retirar la autorización desde «Mis restricciones». Al retirarla, se elimina la declaración vigente y tu coach deja de tener acceso a ella. Tus comidas registradas y planes anteriores se conservan.

Dejar la ficha vacía no significa declarar que no tenés restricciones. Si no tenés ninguna para informar, elegí esa opción expresamente.$consent$;
 v_hash text;
begin
 if exists(select 1 from efg_private.coach_release_switches where enabled is distinct from false) then
  raise exception 'P28H STOP: release switches must remain OFF';
 end if;
 if exists(select 1 from efg_private.efg_coach_health_documents)
 or exists(select 1 from efg_private.efg_coach_health_intakes) then
  raise exception 'P28H STOP: initial document installation only; existing state requires review';
 end if;
 v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_text,'UTF8')),'hex');
 if v_hash <> 'ddd3e8a8e51795c1a4d2b2aaf29a3901ffaf500c95551a5c6e28ecf701502806' then
  raise exception 'P28H STOP: reviewed text hash mismatch';
 end if;
 insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at)
 values(pg_catalog.gen_random_uuid(),'ncc_pilot_health_20261104_v1',v_hash,v_text,'published',pg_catalog.now());
end $p28h$;
commit;
