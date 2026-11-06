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

## CI propuesta y límites pendientes

La rama de pruebas separada prepara Node/PGlite, Chromium/WebKit y una instancia local desechable de Supabase para GoTrue/PostgREST/PostgreSQL multisesión. Hasta que exista evidencia del run exacto, estas etapas son PENDIENTES, no aprobadas. El navegador local está bloqueado por el entorno; no se lo eludió.

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
