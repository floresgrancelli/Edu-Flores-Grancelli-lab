# Doble espacio y coach piloto: candidata R3 aislada

Estado al 6 de noviembre de 2026: candidata de pruebas, apagada y no aplicada a la aplicación ni a una base real. No habilita cuentas.

## Qué permite ensayar

- Un administrador ficticio puede agregar un coach piloto sin cobro y elegir un cupo de 1 a 10000 alumnos.
- La misma identidad puede conservar su perfil, organización, consentimiento e historial de alumna y tener una capacidad profesional separada.
- Elegir el espacio no reescribe el rol ni la organización del perfil original. Las operaciones profesionales requieren su propio consentimiento/aceptación vigente.
- Los cupos cuentan alumnos activos e invitaciones pendientes; las invitaciones y el cambio de cupo comparten bloqueo de organización en la propuesta SQL.
- Las respuestas tardías, cambios de identidad y resultados inciertos no se aplican al contexto equivocado. Los reintentos usan recibos de idempotencia por actor.

## Base y aislamiento

Base de código exacta: `9aaddfe21d77302224f93ea82be3b215c86769d6`. El archivo `efg-nutrition/pilot/pilot.js` tiene Git blob `6cfb981876043274eb7c1756f1b9c6e5eb37c620` y permanece sin cambios.

`integration/pilot-entrypoint.patch` es un artefacto OFF comprobado sobre una copia temporal de esa base; no está aplicado. El módulo y el panel están desactivados por defecto. No se modifican el PR de informes, el entrypoint de producción, roles/cuentas reales, políticas existentes, credenciales ni configuración del hosting.

El SQL está en `proposed/`, no en migraciones activas. Exige un marcador de base sintética y cuentas `@example.invalid`; no reemplaza funciones ni RLS existentes. Al terminar la propuesta, sus nuevas RPC y tablas siguen sin acceso para `anon` ni `authenticated`.

## Evidencia ejecutada localmente

- 42 pruebas Node pasaron, incluyendo límites de cupo, aislamiento, idempotencia, vínculo original, consentimiento, carrera de respuestas, borradores, panel OFF y validación criptográfica de claims sintéticos.
- Sintaxis JavaScript y aplicación del patch en una copia temporal: PASS.
- PGlite 0.3.14 (PostgreSQL 17.5 WASM), instalado desde npm oficial en carpeta aislada y con scripts desactivados: PASS. Ejecutó la propuesta real en memoria y comprobó guardas, cupos, idempotencia, aceptación profesional y preservación de perfil, historial y consentimiento.
- Postura sin concesiones: las ocho RPC de la propuesta no tienen EXECUTE para `anon`/`authenticated`.
- Un segundo paso exclusivamente dentro del ensayo concede accesos a un rol efímero y crea una política de prueba sobre un diario sintético. RLS PostgreSQL con claims sintéticos firmados: PASS para separación de coaches, acceso del mentor original, denegación al administrador general, revocación de capacidad/consentimiento, usuario inactivo, intento de cambiar rol y JWT inválido/caducado/con audiencia o emisor incorrectos.

La política RLS de ese paso es un modelo de prueba, no la política completa del servicio. La verificación JWT usa un puente local escrito para el ensayo, no GoTrue/PostgREST. PGlite no demuestra concurrencia multisesión.

## Evidencia CI y límites pendientes

[Run 42257502057](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/42257502057), sobre `f27cdab4a2f2956250fb0b16b530f602c2f4905a`, terminó SUCCESS en el primer intento. Los cuatro jobs ejecutados pasaron:

- Node/PGlite: 42/42 pruebas Node, propuesta PostgreSQL WASM y compilación de fixture Auth.
- Chromium y WebKit: demo sintética a 390 y 1280 píxeles. Alta/cupo, rechazo del tercer alumno con cupo dos, cambio de espacios, preservación del vínculo original, retiro de consentimiento personal, rechazo de identidad ajena y reinicio de sesión. Cero solicitudes externas y sin desbordamiento horizontal. Capturas móvil/desktop inspeccionadas.
- [Auth y PostgreSQL multisesión](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/42257502057/job/128028628713): GoTrue y PostgREST locales emitieron y validaron JWT de usuarios ficticios. Pasaron aislamiento A/B, vínculo original, rechazo anónimo y token manipulado, revocación de consentimiento/capacidad e identidad inactiva. Dos backends distintos mostraron espera real de bloqueo: el último cupo fue atómico y dos solicitudes concurrentes iguales produjeron una invitación y un recibo. La limpieza del stack temporal pasó.

El servidor de Auth no imprimió su versión PostgreSQL; no se infiere. PGlite sí verificó PostgreSQL17.5. El navegador local continúa bloqueado por el entorno y no se eludió; los navegadores se ejecutaron en el runner estándar de CI autorizado.

Los JWT y la concurrencia de ese job son reales dentro de un stack local desechable, pero su esquema y políticas RLS son un modelo sintético de prueba, no la base hospedada. El browser prueba la demo independiente, no el panel integrado en toda la aplicación. OTP/correo y dispositivos físicos no se probaron.

El workflow dedicado usa runners estándar Ubuntu del repositorio público, `contents: read`, checkout sin credenciales persistidas, dependencias oficiales fijadas y ningún secreto del repositorio. No contiene comandos de despliegue, vínculos a proyectos hospedados ni cambios a servicios reales. Los usuarios y los tokens que genere un stack de prueba solo pertenecen a esa instancia temporal y no se publican como artefactos.

Todavía falta integrar y ensayar el esquema completo y todos los consumidores privados de la app, rutas de alta/reactivación/baja que afectan cupos, revocaciones, permisos y recuperación de sesiones. El panel muestra un padrón básico ficticio; guías, datos clínicos, mensajería y pagos permanecen cerrados. No se certifican móviles físicos ni producción.

## Reproducción

Desde la raíz del paquete/repositorio:

```sh
node --test efg-nutrition/tests/dual-workspace-*.test.mjs efg-nutrition/tests/synthetic-signed-claims.test.mjs
NCC_PGLITE_MODULE=/ruta/pglite/dist/index.js node efg-nutrition/tests/dual-workspace-pglite-rehearsal.mjs
```

El workflow dedicado documenta las dependencias exactas para CI. Nunca ejecutar esta propuesta contra una base con personas reales.

## Puerta de salida

Esta candidata no debe fusionarse ni publicarse como función habilitada. Antes de aplicar cambios de permisos/RLS en un servicio, crear accesos efectivos o habilitar cuentas reales, se requiere revisión y autorización específica. Un resultado verde de la demostración no basta para cambiar un flag ni para certificar la integración productiva.
