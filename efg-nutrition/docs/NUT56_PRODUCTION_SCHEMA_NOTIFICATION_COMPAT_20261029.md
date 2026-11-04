# NUT-56 — Compatibilidad con base actual y disparadores de notificaciones

**29/10/2026 · PR #37 DRAFT · solo pruebas con usuarios ficticios · RELEASE NO GO.**

## Auditoría real: exclusivamente metadatos, cero datos personales

Proyecto Supabase: `cyjvddhimbsfipjfctsl`, PostgreSQL 17.11, Supabase Pro USD 25/mes. Se consultó `pg_class`, `pg_attribute`, `pg_constraint`, `pg_policies`, `pg_proc` y `pg_trigger` mediante `SELECT` sin leer registros. No se ejecutó ninguna migración ni DML sobre producción.

Comparación clave del esquema existente respecto de la maqueta local usada anteriormente:

- `efg_organizations.name` es **NOT NULL** sin valor por defecto; hay cupos, estados, licencias, alias de pago y `UNIQUE(coach_id)`.
- `efg_profiles.email` y `nickname` son **NOT NULL**, email único, nickname de 2 a 70 caracteres y check de pertenencia organización/rol.
- `efg_consents` tiene `updated_at` y `email_report_opt_in`; el trigger `efg_consent_identity_immutable` protege la identidad y organización.
- `efg_goals` incluye método de estimación `mifflin/tenhaaf`, factor de actividad y proteína/grasa por kg, además de los macros.
- `efg_food_plans` tiene triggers `efg_verify_guide_goal` (verifica propiedad usando `auth.uid()`) y `efg_food_plan_lock_owner` (impide cambiar dueño al actualizar).
- `efg_notifications` tiene `read_at` y límites reales en título (1–140) y cuerpo (≤600), además de `UNIQUE(recipient_id,event_key)`.
- RLS actual: `authenticated` permite la escritura antigua de metas y guías **condicionada a permisos**. Los SQL del nuevo plan revocan DML de la tabla y requieren RPC atómica: hay riesgo real de romper clientes antiguos/PWA con caché.

## Hallazgo que bloqueaba compatibilidad: tres avisos por un único plan

La base actual tiene:

1. `trg_efg_notify_goal` que, tras `INSERT` de meta, genera un aviso `goal:UUID`.
2. `trg_efg_notify_food_guide` que, tras insertar/actualizar guía, genera un aviso `guide:fecha`.
3. La nueva RPC `efg_publish_coach_plan_draft` además genera un **único aviso unificado** `coach_plan_UUID`.

Sin compatibilidad, un plan publicado atomícamente podría disparar **tres notificaciones**. NUT-54 no lo detectaba porque el fixture anterior omitía ambos triggers.

## Correcciones exclusivas de la rama candidata

- `tests/sql/nut56-prodshape-local-overlay.sql`: añade restricciones, columnas y triggers que representan aspectos verificados de producción a la base GoTrue/REST/Postgres **local efímera**. Las cuentas son ficticias y los emails se generan durante la ejecución.
- `docs/NUT56_LEGACY_NOTIFICATION_COMPAT_STAGING_ONLY.sql`: valida que ambos triggers preexistentes conserven su definición conocida, y reemplaza **solo las definiciones de los triggers** (no sus funciones originales) para omitir la notificación heredada cuando la transacción marca `efg.coach_atomic_publish=on`.
- `docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql`: añade `set_config(...,true)` **después** de autorización, consentimiento, borrador y revisión alimentaria/legal, y antes de modificar metas y guías. La marca es **local a esa transacción** y **nunca una prueba de identidad**.
- `tests/coach-auth-local-e2e.mjs`: alta ficticia real por GoTrue e inserción de `name`, `email`, `nickname`, exigidos por el esquema productivo.
- `tests/sql/nut56-prodshape-compat-assertions.sql`: falla la CI si faltan restricciones, disparadores, la guarda de notificación, o si sigue permitido `INSERT` directo a metas/guías luego del corte.
- `tests/coach-notification-compat-nut56.mjs`: tras NUT-54 y el restore NUT-55, verifica una sola notificación unificada y que los triggers heredados generen sus avisos habituales **en operaciones separadas privilegiadas, solo en local**. No habilita escritura antigua por REST.
- Workflow `.github/workflows/efg-nutrition-auth-local-qa.yml`: ejecuta fixture, SQL de staging y prueba final, sin ninguna variable ni conexión de gestión del proyecto alojado.

**Límites:** un overlay del esquema no es una réplica exacta del proyecto: faltan otras políticas RLS, triggers no relacionados, funciones, Edge Functions, Storage, correo OTP real, usuarios y datos históricos. No prueba compatibilidad con Android físico. Los valores de alimentos y documentos legales del test son deliberadamente **FICTICIOS**.

## Transición segura prevista, aún no autorizada

1. Crear una base de staging **realmente aislada y restaurable**, con esquema productivo completo y datos **ficticios**, sin cargos nuevos no aprobados. Comprobar restore real, incluyendo extensiones, triggers y grants.
2. Revisar divergencias `pg_catalog` antes de la migración y abortar si cambió un trigger, política o columna desde esta auditoría. Auditar versión publicada y sesiones/caché antiguas.
3. Preparar **una migración transaccional indivisible** que aplique compatibilidad de disparadores + RPC + grants + RLS + legal/intakes con una operación de rollback ensayada. **Los archivos SQL de diseño actuales contienen BEGIN/COMMIT propios y NO constituyen por sí mismos esa migración indivisible.**
4. Incluir protección de versión para clientes antiguos; informar sobre actualización obligatoria antes de revocar permisos de escrituras anteriores. Probar el flujo de los tres roles y Autogestión, sesiones antiguas, varias pestañas, mensajes y notificaciones.
5. Exigir aprobación legal, nutricional y de privacidad, fuentes de alimentos con criterios reales de restricciones, QA visual y físico iPhone/Android y autorización expresa antes del despliegue.

**Producción actual Render `9000e4d8` intacta. PR #37 DRAFT. Supabase Pro sin ramas de preview ni cargos nuevos. Flag `COACH_ATOMIC_PLAN_UI_ENABLED=false`. Release NO GO.**
