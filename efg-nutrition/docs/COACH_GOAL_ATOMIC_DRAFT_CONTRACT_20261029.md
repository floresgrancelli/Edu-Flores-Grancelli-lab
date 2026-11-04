# PR37 · Control transaccional de objetivos y guía (contrato de bloqueo, 29/10/2026)

**NO APLICAR EN PRODUCCIÓN · NO GO.** Documento derivado de auditoría de código y esquema **solo lectura** del proyecto `cyjvddhimbsfipjfctsl`. No existe staging Supabase. La protección JS agregada a PR37 es temporal, no sustituye un control SQL/RLS.

## Hallazgo crítico confirmado

- `pilot/pilot.js` tenía DOS caminos de inserción directa en `public.efg_goals`: `approveGoal` y `approveGoalRevision`.
- La vista del alumno lee las metas de `efg_goals` por `approved_at desc`. Esta tabla es de objetivos **vigentes**, no borradores; el editor de la guía se ejecutaba después de insertar el nuevo objetivo.
- El borrador SQL `20261029_coach_intake_plan_access_DRAFT.sql` prevé `efg_student_plan_access`, pero por sí mismo no convierte `efg_goals` en una tabla de drafts.
- Esquema real verificado: `efg_goals` exige `approved_by`, `goal_type`, `kcal`, proteínas, hidratos, grasas, fibra, `start_on` y `approved_at`; `efg_food_plans` es único por `student_id` y `guided_goal_id` referencia una meta ya creada. Su check `efg_guided_plan_shape` exige cinco comidas y `guided_plan_approved_at` cuando existe guía.
- `efg_notifications.kind` solo admite actualmente `guide`, `plan_update`, `weekly_report`, `weekly_ready`, `missing_diary`, `payment`, `payment_status` o `message`.

## Parche provisional implementado en PR37 (únicamente rama candidata)

- Módulo `pilot/coach-goal-write-gate.js` consulta `efg_student_plan_access` por alumno antes de ambos INSERT de `efg_goals`.
- Mientras exista el nuevo esquema, bloquea **también los alumnos históricos publicados**, porque una revisión adelantada podría cambiar la meta visible. Ninguna modificación silenciosa de objetivos autorizados.
- Solo se permite mantener el comportamiento anterior de un alumno **sin ficha nueva** y mientras el esquema nuevo verdaderamente falte (`42P01` o `PGRST205`). Los errores de red, permiso, filas faltantes o RLS NO equivalen a esquema antiguo.
- El alumno con ficha nueva no puede insertar metas aunque aún falte el esquema. La UI explica el bloqueo y conserva la calculadora/preview como propuesta no aprobada.
- `tests/coach-goal-write-gate.mjs` comprueba cohortes y errores negativos; ejecutado en Premium CI. **No es una prueba de RLS real.**

## Solución de servidor exigida antes de remover el bloqueo

1. Tabla separada `efg_coach_plan_drafts` o equivalente: `student_id`, `coach_id`, `organization_id`, meta propuesta `jsonb`, guía propuesta `jsonb`, versión/revisión, `intake_updated_at` autorizada, estado `draft`, timestamps del servidor. Propietario coach autorizado (RLS). **El alumno no puede leer drafts de metas ni guías**. Persistencia segura, nunca solo `localStorage`.
2. RPC de guardado/edición idempotente: solo coach efectivamente vinculado, activo, con seguimiento y uso de ficha autorizados, comprobando la versión de la ficha y sin escribir `efg_goals`, `efg_food_plans` ni notificaciones de publicación. Bloquear cambios concurrentes optimistamente por versión.
3. RPC final **atómica y en una sola transacción Postgres**: bloquear borrador y acceso del alumno `FOR UPDATE`; repetir identidad JWT, rol/vínculo/organización, consentimientos vigentes, revisión de ficha y acuerdo legal aplicable; validar meta nutricional, identidad de ingredientes server-owned, restricciones/semáforo y estructura de cinco comidas; insertar meta en `efg_goals`, persistir `efg_food_plans` con guía aprobada y `guided_goal_id` coincidente, actualizar `efg_student_plan_access` y crear **una** notificación idempotente en el mismo commit.
4. Ante cualquier error, **rollback integral**: ni meta nueva visible ni guía parcial, ni desbloqueo ni aviso. No sustituir una transacción por una secuencia de requests del navegador.
5. Alumnos históricos: no modificar metas/diarios/planes publicados durante el backfill. La publicación de una revisión reemplaza solo el puntero lógico de meta vigente tras aprobar y verificar la guía, conservando historial. Validar explícitamente que la fecha de inicio para planificación no altera cierres anteriores.
6. Endpoints REST/RPC: denegar al alumno, coach ajeno, admin sin mandato y anónimo todo acceso de escritura a drafts, metas y guías ajenas; proteger también contra INSERT directo a `efg_goals` evitando el RPC. Revisión completa de grants, RLS, SECURITY DEFINER, search_path y sesiones JWT antiguas.
7. Mantener desactivadas guías dietéticas clínicas, Personal/Autogestión, semáforo, legal y lanzamiento hasta que cada módulo tenga su propia prueba y aprobación.

## Matriz mínima STAGING (NO REALIZADA)

- Dos organizaciones ficticias A/B, coach A/B y alumno nuevo/histórico de cada una, tokens reales emitidos por Auth de staging.
- Guardar varias revisiones de draft → la meta visible en alumno A no cambia.
- Alumno nuevo sin aprobación permanece pending; coach aprueba una guía válida → meta y publicación aparecen juntas, exactamente una notificación.
- Falla deliberada después de INSERT de meta pero antes de INSERT de guía → ninguna escritura persiste.
- Revocar seguimiento o compartir ficha entre preview y submit → rechazo sin cambios ni aviso.
- Coach B publica plan de alumno A → rechazo; ADMIN general sin mandato → rechazo.
- Reintentar solicitud con igual idempotency key → sin meta duplicada ni dos notificaciones.
- Intentar INSERT directo REST a `efg_goals` y UPDATE directo de `efg_food_plans` con JWT que no debe publicar → denegación.
- Restaurar copia de STAGING, comparar hashes de guías, objetivos y estados; no hacer rollback sobre producción.
- Safari/iPhone y Android: comprobar borradores, cambio de alumno/rol, foco/scroll, offline y reconexión.

## Verificación disponible hoy

Se inspeccionaron las columnas y constraints de `efg_goals`, `efg_food_plans` y `efg_notifications` usando solo `SELECT`. A 29/10/2026 las tablas nuevas de ficha/acceso y aceptación legal no existen en producción. El conjunto de cambios de JS + tests es una **mitigación preventiva en código no desplegado**, sin afirmar una aprobación clínica, legal, RLS ni de la publicación.

Siguiente acción de ingeniería: implementar y ensayar la transacción sobre un Supabase aislado autorizado, o en Supabase local reproducible, antes de volver a habilitar guardado de metas. Referencias: `COACH_STAGING_TEST_MATRIX.md`, `ROLE_AWARE_INTAKE_TO_COACH_GUIDE_20261029.md`.
