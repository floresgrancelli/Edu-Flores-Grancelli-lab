# COACH99 — Acuerdo piloto: dos autorizaciones expresas y reinicio sin borrar alumnos

**30/10/2026 — Decisión expresa del propietario — PR #37 DRAFT, todavía NO publicado**

## Decisiones
1. **Para continuar en el piloto Coach, ambas opciones deben estar marcadas:** (a) participación voluntaria en el piloto; (b) permiso explícito para compartir la ficha con su coach. Se presentan **ambas desmarcadas**. El botón «Continuar con la prueba» debe permanecer deshabilitado si falta cualquiera de las dos. No preseleccionar por ingreso anterior, cookies, localStorage, planes previos ni consentimientos de una versión anterior.
2. Cada alumno conserva el derecho a no participar o a retirar el permiso; en tal caso no se habilita el seguimiento del coach que requiere acceso a su ficha. Esta pantalla **no es** un documento legal definitivo ni un permiso para tratar información médica sensible. No obligar a exponer diagnósticos en la ficha y no prometer cumplimiento jurídico con una ficción.
3. **No borrar ningún alumno.** Se propuso condicionalmente para simplificar las pruebas, pero no aporta ninguna ventaja frente a una ficha versionada nueva y agrega riesgos irreversibles sobre Auth, registros, pagos, mensajes, consentimientos y recibos.
4. Todos los alumnos actuales y nuevos deben completar la versión `coach_major_2026_r1`. La función `resolveCoachRelaunchEntry` ya devuelve ruta `intake` si no existe una revisión nueva, aunque haya fichas o planes antiguos; `initialCoachRelaunchIntake` no precarga información histórica ni casillas antiguas. Los datos previos se preservan. Esto es **reinicio de incorporación**, NO restauración ni borrado de la base.
5. Código de la pantalla provisional: `pilot/pilot-participation-demo.js`, `PILOT_PARTICIPATION_ENABLED=false`, parser/estado UI y `bindPilotParticipationDemo` en preview aislada. Los tests `tests/coach98-pilot-participation-demo.mjs` cubren cuatro combinaciones, clic sin ambos y revocación antes de continuar. Los flags deben mantenerse OFF hasta que un backend registro-por-usuario versión/fecha/decisiones y pruebas con RLS impidan saltarse el control.
6. **Pendiente para la integración real:** asociar autorización de participar + compartir a UID, versión, fecha y acción voluntaria en la base; crear controles de lectura por dueño y coach correcto; probar rechazo sin checkbox, revocación y denegación entre organizaciones con JWT. Conectar formulario de ficha versionada e interfaz, revisar PWA iOS/Android. No falsificar registros en `efg_legal_acceptances`.
7. El responsable pospuso el respaldo/restauración de Mac y hardening no imprescindible para POSTACTUALIZACIÓN; **no** autorizó borrar historiales ni dejar sin control los permisos de lectura de datos de alumnos.

## Línea de base histórica (solo lecturas, 30/10)
- Supabase alojado tiene 6 usuarios Auth, 5 perfiles, 1 organización, 9 metas, 3 planes guía, 18 registros diarios, 14 comidas habituales, 8 mensajes, 3 pagos y 3 recibos en bucket privado. No hay instrucción para eliminar ninguno de ellos.
- En la rama candidata, la autorización/participación todavía **no está conectada ni publicada**. `PILOT_PARTICIPATION_ENABLED=false` y el parser devuelve `persisted:false, legalAcceptance:false` aun cuando ambas casillas están seleccionadas.
- Supabase ya tiene el componente adicional de recibo de introducción científica COACH97 (no reemplaza esta autorización); bienvenida real permanece OFF.

**Revisar este acuerdo antes de integrar migraciones o fusionar PR37. Nunca ofrecer borrar usuarios como atajo técnico.**
