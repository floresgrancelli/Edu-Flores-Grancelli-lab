# NUT-51 · Relectura verificada del borrador y aislamiento del espacio Coach

Fecha: 29/10/2026. PR #37 DRAFT, rama `efg-major-integration-20261029`. **Candidata desactivada; NO publicar / NO ejecutar SQL en Supabase.**

## Problema preventivo detectado en la revisión de NUT-50
Antes de este cambio, `saveCoachAtomicDraft` aceptaba el número de revisión devuelto por la RPC y armaba el registro de UI con `goal_proposal:goal`. Este valor retenía la misma referencia mutable usada por el editor, de modo que una modificación local posterior podía falsear la comparación visual de cambios no guardados. Un guardado/publicación pendiente podía regresar luego de un cambio de alumno o de sesión y repoblar estado de la pantalla que ya no correspondía.

## Ajuste candidato
- `pilot/coach-draft-review.js`: `verifyCoachDraftReadback` comprueba contra el registro realmente leído del servidor el alumno, condición DRAFT, versión de ficha, número exacto de revisión, meta y guía, y devuelve una copia profunda; `coachDraftWorkspaceCurrent` bloquea aplicar resultados asíncronos cuando cambian la sesión, el alumno seleccionado, la ficha en memoria, el registro activo o el consentimiento visible.
- `pilot/pilot.js`: capturar con `validateCoachPlanProposal` una copia validada **antes de la espera de red**, guardar mediante la RPC, hacer `coachDraftClient.load(studentId)`, validar `verifyCoachDraftReadback` y solo después actualizar el estado del mismo workspace. En el camino de publicación: confirmación seguida de comprobación de contexto inmediatamente antes del RPC y otra después de la respuesta; un cambio de alumno nunca repuebla ni borra el request-id del alumno actualmente seleccionado.
- `tests/coach-plan-flow-nut50.mjs`: añade ensayos sintéticos del alias mutable, contenido alterado en la respuesta, revisión diferente, cambio de alumno, sesión, ficha/versión, registro y consentimiento. El test existente continúa cubriendo calculadora científica real y guía de cinco comidas con servidor mock.

## Qué garantiza y qué NO garantiza
La interfaz no da por guardado un plan que no puede releer exactamente de la base ni vuelve a poblar otra ficha por un resultado tardío. La autorización efectiva siempre depende de PostgreSQL RLS, del consentimiento en el servidor y de las funciones transaccionales. Una RPC completada puede haber guardado/publicado aunque el usuario haya cambiado de pantalla: por eso se evita modificar el estado de la pantalla actual, no se intenta deshacer la transacción.

**No** se utilizaron JWT reales, revisión clínica, textos legales aprobados, datos nutricionales certificados ni dispositivos físicos. GitHub CI sintético y visual aislado son pruebas parciales, no autorización de despliegue.

## Verificación y próximos bloqueos
- Baseline anterior, SHA `84f24583addfed9b6746ef11bce32e0fe38756cc`: Security, Premium, PostgreSQL efímero y Visual QA: **4/4 SUCCESS** (GitHub runs 40957586014 / 40957586163 / 40957585857 / 40957586067).
- Cambios NUT-51: revisar los cuatro workflows del HEAD exacto **posterior al commit de este documento**. Registrar PASS/FAIL real en Plan Maestro, sin extrapolar resultados de SHAs anteriores.
- Pendientes obligatorios: Supabase Auth firmado y RLS multi-organización en entorno aislado/restaurable sin afectar producción; fuentes de alimentos realmente revisadas; textos/consentimientos legales; políticas por restricción y UI Personal; rutas heredadas, QA físico iOS/Android, aprobación del titular.

`COACH_ATOMIC_PLAN_UI_ENABLED=false` se mantiene. Ninguna migración aplicada, ninguna publicación/merge/Render deploy ni gasto autorizado. Decisión **NO GO**.
