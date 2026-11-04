# NUT-55 — Recuperación local, escrituras heredadas y brechas de esquema productivo

29/10/2026 · PR #37 DRAFT · **RELEASE NO GO** · Flag `COACH_ATOMIC_PLAN_UI_ENABLED=false`.

## Qué se hizo en GitHub (no en producción)

- Prueba ejecutable `tests/coach-local-backup-restore-nut55.mjs`: después de NUT-54 con GoTrue/Auth firmado y alumnos ficticios, genera un archivo **real** de `pg_dump -Fc --data-only` usando el servidor PostgreSQL local para **tres tablas**: `efg_coach_plan_drafts`, `efg_coach_plan_publish_receipts`, `efg_notifications`. Comprueba contenido del archivo, borra **solo esas filas ficticias** del entorno efímero mediante `TRUNCATE` sin `CASCADE`, y ejecuta `pg_restore --single-transaction --exit-on-error` en el **mismo PostgreSQL local desechable**. Verifica idénticos conteos y hashes MD5 por tabla, y que metas, guías, acceso, cinco usuarios Auth y RLS no se alteraron.
- **No es** una restauración completa de Supabase o del proyecto productivo; no cubre Storage, correos, Realtime, JWT secrets, usuarios históricos, backups en hosting ni RTO/RPO. No se exportan datos reales; el backup sólo viaja en memoria dentro de CI. Un FAIL es bloqueo de release, nunca motivo para probar sobre producción.
- Nueva prueba estática `tests/coach-legacy-write-audit-nut55.mjs`: cuenta exactamente **cuatro** escrituras directas a `efg_goals`/`efg_food_plans` en `pilot/pilot.js`, verifica que los cuatro manejadores antiguos **rechen antes del write si el flag futuro está ON**, y que el cliente de borradores sólo utiliza RPC atómicos. Detectará una quinta ruta sin auditoría. No garantiza que otro cliente desplegado/caché antiguo respete el guard.
- Workflow `.github/workflows/efg-nutrition-auth-local-qa.yml` dispara las dos pruebas tras autenticar con GoTrue real LOCAL, en un runner aislado, sin ningún enlace a un proyecto Supabase remoto.

## Comparación con el esquema productivo — **consulta SOLO LECTURA**

Conector oficial Supabase `get_project` y consultas exclusivamente al catálogo `pg_class`/`pg_attribute`/`pg_proc`, sin leer filas de alumnos:

- Proyecto real **Pro** PostgreSQL **17.11**, `ACTIVE_HEALTHY`. Las nuevas `efg_student_intakes`, `efg_student_plan_access`, `efg_coach_plan_drafts`, `efg_legal_documents` y `efg_legal_acceptances` **no existen aún en producción**. Las RPC `efg_publish_coach_plan_draft`, `efg_save_coach_plan_draft` y la antigua `efg_publish_coach_plan` tampoco figuran en el catálogo público consultado; **no** asumir que la migración será un simple `ALTER`.
- Las tablas existentes `efg_goals`, `efg_food_plans`, `efg_notifications`, `efg_profiles`, `efg_organizations`, `efg_consents` están protegidas por RLS, pero no son idénticas a la maqueta local. Ejemplos verificados: `efg_goals` tiene columnas de método de estimación/factor de actividad/proteína por kg/grasa por kg; `efg_notifications` tiene `read_at`; `efg_consents` tiene `email_report_opt_in`; `efg_profiles` exige `email` y `nickname`; `efg_organizations` exige `name` y tiene licencias, pagos y cupos. La maqueta del workflow no certifica las restricciones, triggers, RLS o planes históricos de esos campos.
- Permisos actuales: `authenticated` mantiene `INSERT/UPDATE/DELETE` en **`efg_goals` y `efg_food_plans`** con RLS; los SQL de staging del circuito atómico **revocan** escrituras directas y exigen RPC. Esta transición corta el flujo de clientes antiguos y exige un plan de corte, despliegue coordinado y posibles sesiones antiguas. **No ejecutar SQL en Supabase productivo sin ensayo sobre un esquema fiel, rollback y GO explícito.**

## Auditoría de rutas legacy (sin modificar UX actual)

Cuatro puntos detectados en `pilot/pilot.js`, con guard cuando flag ON:

1. `saveCoachFoods()` → upsert `efg_food_plans` (lista alimentos).
2. `approveGuidedDay()` → upsert `efg_food_plans` (guía cinco comidas).
3. `approveGoalRevision()` → insert `efg_goals` (ajuste vigente).
4. Acción `approveGoal` → insert `efg_goals` (primera aprobación).

El estado **OFF** permite el comportamiento productivo actual. No activar **ON** antes de cerrar flujo alternativo de edición, cambios de plan vigentes, organización/administradores, mensajes, nuevos alumnos y múltiples pestañas.

## Siguientes gates para release

- [ ] Prueba automatizada de restauración parcial por el runner exitosa y documentada con SHA exacto; prueba completa de recuperación de **esquema fiel de una base aislada** aún pendiente.
- [ ] Migraciones sobre réplica sin datos reales, con esquema, constraints, grants, políticas, funciones y triggers representativos de producción, sin pérdida de datos históricos.
- [ ] Revisión de OAuth/OTP real, sesión anterior, cachés y clientes que sigan utilizando escrituras directas; estrategia de compatibilidad/rollback y banner de actualización.
- [ ] Revisión profesional de dietas/restricciones, origen de alimentos, consentimiento de privacidad y términos es-AR. Los fixtures de NUT-54 eran intencionalmente ficticios.
- [ ] QA físico iPhone/Android, revisión visual, función OFF y GO por el titular.

**No crear Preview Branch con gasto, no tocar Render, no publicar, no migrar ni leer datos personales.** La suscripción Supabase Pro de base USD 25/mes no incluye necesariamente ramas sin cargo.
