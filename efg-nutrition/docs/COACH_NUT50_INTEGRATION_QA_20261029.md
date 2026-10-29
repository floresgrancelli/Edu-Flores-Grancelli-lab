# EFG Nutrition Pro · NUT-50 · Ficha → calculadora → cinco comidas → borrador privado

**Fecha: 29/10/2026. PR #37 DRAFT. NO GO. Sin merge, sin SQL productivo, sin deploy.**

## Alcance de esta etapa

La pantalla Coach y su lógica de cálculo siguen conectadas a la app existente. El nuevo camino privado sigue marcado `COACH_ATOMIC_PLAN_UI_ENABLED=false` dentro de `pilot/coach-plan-draft-client.js`. **No aparece ni funciona en producción**. Únicamente en tests con Supabase simulado se habilita temporalmente `enabled:true`; no hay cookies, Auth ni alumnos reales.

Se incorporan:
- `pilot/coach-draft-review.js`: contraste puro entre meta/guía actualmente editadas y **propuesta específica guardada**, sin depender del orden de claves de JSONB. Controla alumno, estado `draft`, número de revisión entero, `source_intake_updated_at`, meta (kcal/proteínas/hidratos/grasas/fibra) y guía completa (cinco comidas, alimentos/gramos/unidad y nota de suplementos). No permite publicar una revisión vieja tras editar calorías, alimentos, cantidades o notas sin volver a guardar.
- `pilot/pilot.js`: botón de publicación del circuito futuro se habilita solo cuando el borrador coincide; el manejador vuelve a comprobar la coincidencia **después de leer los valores reales del editor**, antes de pedir confirmación y llamar al RPC. `saveCoachAtomicDraft()` lee cantidades reales de `readGuidedEditor()` y establece `student_id` y la versión en el registro local. La selección de alumno aísla el estado; se recupera un borrador exclusivamente si la ficha sigue compartida y tiene **el mismo timestamp del servidor**.
- `refreshVisibleWorkspace()`: al actualizar datos de la sesión Coach, no restaura ediciones locales si hubo una nueva versión de ficha, revocación de compartición, cambio del estado o número de revisión del borrador en otro dispositivo. En modo antiguo (flag OFF) se preserva la continuidad existente.
- Rutas heredadas de aprobación por separado (`approveGoal`, `approveGoalRevision`, `approveGuidedDay`, lista de alimentos y `coach-intake-flow.publish`) fallan explícitamente si se habilita el modo atómico; los botones antiguos individuales quedan ocultos para evitar elegir el flujo erróneo. En modo actual no cambian las operaciones del cohort legacy y sigue la barrera `coach-goal-write-gate` cuando exista esquema nuevo.
- `tests/coach-plan-flow-nut50.mjs`: ejercicio sintético con **implementaciones reales y puras** de prefill de ficha, motor Mifflin–St Jeor, generador de guía de cinco comidas, validador de guía, borrador privado y comparación de revisiones. Comprueba que no se infiere la variable fisiológica, que patrones distintos de omnívoro no reciben el menú genérico, que una ficha ajena/revocada/obsoleta o un borrador publicado no habilitan publicar, y que nuevos gramos/kcal/suplementos sin guardar hacen fallar la aprobación. Simula `efg_save_coach_plan_draft` y `efg_publish_coach_plan_draft` con una base de datos en memoria; **no prueba los JWT reales, ni los consentimientos legales ni la composición clínica**.
- Premium QA requiere NUT-50; las suites PostgreSQL 16 de dos organizaciones ficticias, seguridad y Visual fixtures siguen en el mismo PR.

## Requisitos de aceptación funcional para el ensayo staging

1. Alumno activo inicia sesión y comparte su ficha voluntariamente. Coach autorizado lee **solo** la versión compartida con RLS; la ecuación no deduce sexo del nombre y exige confirmación manual, además de actividad.
2. Coach calcula meta, cambia kcal y reparto, genera cinco comidas para patrón revisado, edita alimentos/gramos/nota y **guarda borrador**. La meta previamente publicada del alumno no cambia ni llega aviso.
3. Al salir y volver al alumno, se restaura exactamente el borrador del servidor cuando la ficha y permisos siguen vigentes; el ID del alumno se conserva aislado.
4. Si se modifica kcal, alimentos, gramos o suplementos luego de guardar: debe mostrar «Hay cambios sin guardar», impedir publicar y pedir nueva revisión. El botón no se convierte en aprobación del anterior documento por accidente.
5. Si ficha, consentimiento, organización o borrador cambiaron desde otro dispositivo, el refresco nunca debe revivir valores antiguos ni permitir publicar. El RPC server-owned vuelve a comprobar todo dentro de una transacción.
6. Usuario confirma y publica **una sola vez**: meta, guía, habilitación de MI DÍA, recibo y notificación juntos. Reintentos idempotentes, fallo de red y rollback. Cero operaciones de goal/guide aisladas por REST.
7. iPhone Safari, Android Chrome, escritorio y accesibilidad: QA de estados, scroll, errores y esperas de serotonina con motion reducido. No usar resultados de fixtures como capturas de teléfonos reales.

## Límites / NO GO

La bandera continúa OFF, y la lógica de la candidata **no reemplaza** pruebas de PostgreSQL de esquema exacto de Supabase, JWT firmados de dos organizaciones, revisión nutricional con fuentes reales, legales vigentes y firmado profesional cuando corresponda. Antes del GO se necesitan entorno aislado/restaurable y compatibilidad completa con el flujo de catálogo/planes existentes. `pilot.js` contiene todavía operaciones heredadas destinadas a cuentas antiguas: no activar el flag ni revocar permisos en vivo sin migración atómica revisada y pruebas E2E.

El Plan Maestro conserva esta decisión como NUT-50 y una nueva fila de continuidad. La aplicación pública permanece en Render sin modificar.
