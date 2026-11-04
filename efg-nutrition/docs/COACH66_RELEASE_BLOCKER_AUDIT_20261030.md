# COACH-66 · Auditoría de bloqueo de publicación y dependencias · 30/10/2026

**Estado: NO GO.** PR #37 DRAFT. Versión pública y datos históricos **sin cambios**. Prioridad única Nutrition Coach; Autogestión queda OFF.

## Evidencia verificada

Consulta **SELECT** exclusiva a `pg_catalog` del proyecto Supabase `cyjvddhimbsfipjfctsl` el 30/10/2026, sin leer filas de usuarios ni ejecutar DDL/DML: de los objetos consultados solo existen `public.efg_goals` y `public.efg_food_plans`, ambos con RLS. No se encontraron aún en producción: `efg_student_intakes`, `efg_student_plan_access`, `efg_coach_relaunch_intakes`, `efg_coach_plan_drafts`, `efg_legal_acceptances`, y ninguno de los RPC candidatos `efg_submit_coach_relaunch_intake`, `efg_save_coach_plan_draft`, `efg_publish_coach_plan_draft`, `efg_legal_current_status`, `efg_accept_legal_documents`. Este resultado **solo** informa el catálogo consultado: no certifica la totalidad del esquema ni la idoneidad de otras funciones existentes.

En la rama candidata, el SQL `COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql` y el SQL `COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql` todavía validan la **ficha antigua** `efg_student_intakes`. La nueva ficha de reingreso ya usa otra fuente `efg_coach_relaunch_intakes`, con versión `coach_major_2026_r1` y revisión. Publicar desde esos RPC sin revisar su fuente/autoridad permitiría un plan basado en datos desactualizados. **No se pueden activar simultáneamente las banderas con la versión actual del backend.**

## Protección adicional implementada

- `pilot/coach-release-plan-gate.js`: `COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false`. Si se intenta habilitar el relanzamiento, bloquea las acciones de guardar/aprobar/publicar objetivos y guías mediante la interfaz hasta que el backend haya sido probado con la **nueva ficha**, la revisión, la autorización, aceptación legal y validación alimentaria.
- `pilot/coach-plan-draft-client.js`: no llega a consultar el origen antiguo ni llamar a los RPC de borradores/publicación cuando se activa relanzamiento sin backend verificado.
- `pilot/pilot.js` y `pilot/coach-intake-flow.js`: defensa extra en los caminos heredados de publicación; muestra un mensaje de preparación si coinciden la interfaz atómica y el relanzamiento con backend sin verificar.
- `tests/coach-release-plan-gate.mjs`: asegura flag OFF y cero operaciones al intentar publicar en modo relanzamiento. Premium QA lo exige. Es protección **de cliente**, no sustituto de revocar permisos y adaptar/ensayar SQL del servidor.

## Secuencia obligatoria para poder pedir GO

1. Mantener una copia restaurable con ensayo de recuperación/PITR; comprobar paridad REAL de esquema y relaciones de Coach en staging, incluidos triggers de notificaciones anteriores y RLS.
2. Aplicar en **staging únicamente** y en orden las migraciones de acceso/coaches, aceptación legal, ficha Coach versionada, borrador atómico, evidencia alimentaria y publicación unificada. Adaptar **ambos RPC** y políticas para usar **únicamente la revisión vigente de `efg_coach_relaunch_intakes`** y para impedir que clientes PWA antiguos publiquen por tablas/RPC anteriores.
3. Ensayar con JWT auténticos y dos organizaciones: alumno piloto viejo con plan, alumno nuevo, formulario realmente fresco tras términos, renovación de aceptación por versión, edición, revocación/limpieza, lectura Coach limitada, doble envío y recuperación de sesión/PWA. Probar carreras de revisión y permisos revocados justo antes del commit, y publicación atómica de 5 comidas por Coach.
4. Validación de la evidencia alimentaria: fuentes del catálogo, cantidad, cocción, patrones (vegano/celíaco/etc.) y etiquetas de elegibilidad. Ninguna declaración médica se convierte automáticamente en diagnóstico ni 'apto' sin revisión profesional.
5. Obtener textos legales y evaluación clínica de profesional competente, incluyendo tratamiento de datos potencialmente sensibles en Argentina, alcance de consentimiento, retención y derechos de supresión. Documentos actuales son **borradores**.
6. Aprobar checks Security, Premium, PostgreSQL, GoTrue JWT/RLS, Visual **del mismo SHA**; revisar artefactos de capturas y la PWA instalada/actualización en iPhone, Android y escritorio. Auditar 19 RPC privilegiados SEC-08 y recuperación.
7. Solicitar al propietario **GO explícito**. No ejecutar DDL/DML sobre Supabase alojada, activar banderas, fusionar PR ni desplegar Render antes de las comprobaciones.

**Resultado de esta sesión:** se confirmó un bloqueo real y se añadió una defensa que impide una publicación incompatible. No se afirmó que el producto está listo ni se hizo ningún cambio en usuarios reales.
