# EFG Nutrition Pro · Interfaz Coach → borrador privado → publicación atómica (PR37, 29/10/2026)

**Estado: integrado en la candidata, DESACTIVADO por defecto. No publicar.**
Producción en Render permanece en el commit `9000e4d8e08bd9483770209a863b1cdba2141c43`. El frontend no ejecutó operaciones reales.

## Flujo por rol aprobado

**Alumno:** conserva su ficha opcional y el permiso separado de compartirla con el coach. No ve borradores privados. Su plan activo, diarios, recetas, historial y permisos anteriores no se tocan al preparar una revisión.

**Coach:** desde la ficha compartida selecciona «Preparar plan con esta ficha», confirma datos en calculadora, revisa macros y guía de cinco comidas. El nuevo módulo propone dos operaciones separadas:
1. «Guardar borrador privado» → `efg_save_coach_plan_draft` con revisión esperada y timestamp original de ficha; **no inserta en efg_goals ni publica, notifica o habilita al alumno**.
2. «Revisar y publicar juntos» → confirmación explícita y `efg_publish_coach_plan_draft` con identificador único persistido durante el reintento; DB debe validar coach vinculado, consentimiento, ficha actual, alimentos, restricciones, legal y publicación atómica.

**Admin EFG:** no accede a borradores ni planes de alumnos ajenos por su rol global. El coach de laboratorio de pruebas solo actúa dentro de la organización donde es coach autorizado y el alumno aceptó el seguimiento. **Personal/autogestión:** circuitos separados; no hereda permisos del Coach.

## Código ejecutado en PR37

- `pilot/coach-plan-draft-client.js`: `COACH_ATOMIC_PLAN_UI_ENABLED=false`, adaptador modular de `load`, `save` y `publish`. Valida ID UUID, metas enteras/acotadas, cinco comidas distintas, alimentos/gramos/nutrientes y nota; verifica consentimiento y ficha compartida actual antes de cada acción. Es una comprobación UX, **no autorización de servidor ni fuente clínica**.
- `pilot/pilot.js`: importación del adaptador, estado aislado por alumno, panel `coachAtomicDraftPanel`, acciones `saveCoachAtomicDraft` y `publishCoachAtomicDraft`, relectura de borrador cuando eventualmente se habilite, limpieza de estado al cambiar de alumno. Guardar llama a la función SQL prevista; publicar exige diálogo explícito. **La bandera OFF impide mostrar los controles y consultar/escribir las tablas nuevas.**
- `pilot/coach-intake-flow.js`: la publicación heredada `efg_publish_coach_plan` debe pasar por `assertCoachGoalWriteSafe`. Mientras exista la nueva tabla de plan-access, se bloquea; solo en esquema genuinamente anterior (no hay tablas nuevas) puede conservarse el flujo de legado y nunca se infiere legado de un error de permisos/red.
- `pilot/pilot.js` `approveGuidedDay`: también se controla antes del UPSERT directo de `efg_food_plans`; con plan-access nuevo bloquea el flujo heredado. Direct `efg_goals` ya estaba protegido.
- `tests/coach-plan-draft-client.mjs`: validación estructural, bandera OFF sin llamadas a DB, carga de registro, guardado con revisión, publicación confirmada con clave única, negativa por consentimiento revocado, falta de ficha, fecha de fuente obsoleta, ID inválido y error RPC. `tests/coach-intake-flow.mjs` confirma que la publicación heredada se deniega cuando existe esquema nuevo y solo permite fallback sin él.
- `.github/workflows/efg-nutrition-premium-qa.yml`: nueva suite de adaptador sobre fixtures sintéticos.

## Decisión técnica

**NO ENCENDER `COACH_ATOMIC_PLAN_UI_ENABLED`** ni modificar grants del esquema productivo. Todavía no existen en Supabase de producción `efg_coach_plan_drafts`, `efg_student_intakes`, `efg_student_plan_access`, los contratos legales y tablas de evidencia. No hay una branch staging/restauración con JWT firmados para dos organizaciones ni una revisión clínica/jurídica. El panel del coach en PR37 es integración preparada, no funcionalidad disponible al alumno.

Para activar en staging primero:
- Generar entorno PostgreSQL/Supabase **aislado** autorizado, con restauración probada y usuarios ficticios con JWT firmados; sin copiar secretos ni datos médicos reales.
- Aplicar en orden y revisar los SQL (intake/access, borradores, catálogo/legal, RPC transaccional), con cambios de grants y políticas de administración auditados.
- Validar que el backend compara el total nutricional de la guía con la meta, que evidencia y certificados reales no se inventan, que la revocación afecta la lectura y la aprobación y que el editor no borra diarios.
- Ensayar UI Coach nueva en Safari/iPhone y Chrome/Android, error/timeout, reintento de request idempotente, cambios de alumno, coexistencia con usuarios históricos, role separation, y luego revisión humana.
- Completar semáforo médico/legal y Personal antes de liberar la gran actualización; la serotonina animada de marca no debe ocultar estados de error. GO únicamente con autorización expresa del titular.

**No se ejecutó SQL en Supabase ni se hizo merge/deploy, signOut ni mensajes masivos. La entrega de esta etapa no cambia el NO GO.**
