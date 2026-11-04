# P30F — mensajería del alumno en espera corregida

2026-11-04. Runtime c40397b67bab2554b3c3d0970a1b376571bf2e5a. Sin GO/merge/deploy/activación global.

Edu completó ingreso de NCC QA Alumno521b41b5. Ruta review conserva espera del plan y lectura de históricos. Defecto real: mensajes mostraba0contactos porque el retorno temprano de ingreso no cargaba state.org. Corregido con consulta RLS mínima id,coach_id a la organización del perfil, antes de renderizar review/private. No lee pagos/diarios ni concede permisos; verifica usuario/rol/org/epoch después de await y rechaza respuesta ajena.

PASS específicos: ncc-p28-hosted-entry-compatibility ampliado ejecuta función real enVM (contacto correcto, ausenciaRLS,orgajena,cambiosesión); notifications-messages (incluye escenarios negativos de red esperados); sintaxis. Preview actualizado solo con delta, flags preservados. Recarga real recupera mismo alumno, espera activa, Mensajes1contacto Mi coach.

PASS ALOJADO FIRMADO alumno: mensajeP30D visible, abrir hilo elimina1no leído; SQL read_at2026-11-04T19:39:28.938Z para e7ecf163-cea3-49ab-a61f-b5fe1903268b. Respuesta ficticia enviada porUI, IDd93133ab-f637-418b-ab63-b80634fb17e7, sender521b41b5, coach69f78429; read_atNULL. No certificar lectura de respuesta porcoach todavía. Sin comunicaciones reales ni correos externos.

Pagos: alumno antiguo sin plan publicado no tiene ruta Pagos por gate existente. No publicar plan ni alterar permisos para probar. Próximo ingreso requerido: alumnoQA nuevo floresgrancelli+ncc-inicio20261104@gmail.com, que ya tiene acceso publicado. No reabrir certificación diferida de lectura del plan2100. CoachQA gratis tampoco certifica circuito comercial. Admin pendiente de sesión.

Paquete regenerado para c40397b: buildncc-pilot-c40397b67bab/manifiestomajor_ncc_c40397b67bab,44archivos98módulos25CSS10ONpropuestos5OFF(QAOFF). gitapply--check y ncc-pwa-asset-cutover-pre-go PASS. Parche/SQLlanzamiento NOAPLICADOS. P30D obsoleto para nuevo runtime.

P30E reparación de lectura YA INSTALADA y UIcoach Planpublicado1 comprobada; no repetir access_read_fix_NOT_APPLIED.sql. Fuentes18vigentes y diferidos previos conservados. Última consulta runtimec403:Security41898952149/PG41898951946/Premium41898952014SUCCESS;Visual41898951890/Auth41898952152/Educación41898952119encurso. No reruns ni heredarPASS.
