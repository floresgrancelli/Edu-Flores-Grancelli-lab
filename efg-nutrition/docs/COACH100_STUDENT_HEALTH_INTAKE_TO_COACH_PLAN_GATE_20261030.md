# COACH100 — Recorrido único obligatorio del alumno para Nutrition Coach

**Aprobación funcional del propietario: 30/10/2026. PR #37 DRAFT; NO DESPLEGADO.**

## Flujo de extremo a extremo
1. **Ingreso OTP:** identidad y perfil `student` activos autenticados, sin inferir aceptación anterior.
2. **Aviso de participación piloto:** el alumno marca expresamente LAS DOS casillas (participar + compartir su ficha con su coach); ninguna aparece marcada por defecto. Si falta una, no puede continuar. Registros pendientes de guardar por UID, versión y fecha en Supabase con RLS.
3. **Ficha inicial de salud y nutrición:** para alumnos nuevos Y actuales. Datos generales y nutricionales: objetivo, edad, altura, peso, actividad, tipo de alimentación, hábitos y restricciones; parte clínica (por ejemplo, diabetes, celiaquía, hipertensión, intolerancia a lactosa/SIBO) requiere autorización específica y acceso restringido. La ficha de esta versión se completa desde cero, sin dar por aceptados permisos ni diagnósticos antiguos.
4. **Envío explícito al coach:** servidor comprueba organización, usuario, participación/permiso vigente, versión de ficha, revisión y marca el envío; notifica al coach CORRECTO. No se publica un objetivo ni dieta automáticamente.
5. **Espera:** pantalla «Tu coach está preparando tu plan» con mensajería y opción de comprobar estado; no permitir registrar comidas, MI DÍA, gráficos ni recetas personales hasta que exista plan aprobado.
6. **Coach:** ve solo ficha autorizada de sus alumnos; calcula objetivos, confecciona guía de CINCO ingestas y revisa. Publica **meta+guía conjuntamente** en una operación atómica con versión/revisión de ficha y permiso vigente; una sola notificación.
7. **Desbloqueo:** solo después de comprobar EN EL SERVIDOR `status='published'` para alumno/organización correctos, vínculo exacto al objetivo, guía aprobada para ese objetivo y fecha de publicación NO anterior a la última revisión de la ficha. No sirve un plan histórico sin ratificación posterior a la ficha nueva. Se habilita MI DÍA.
8. **Retiro de permiso:** cierra el acceso del coach a la ficha y cualquier nuevo seguimiento que requiera ese permiso; no borra diarios, pesos, pagos o historiales antiguos y nunca confiere autorización clínica por silencio.

## Evidencia y estado real
- Añadido `pilot/coach-student-journey.js`, con máquina de estados de diseño `verify/participation/intake/review/ready`, fail-closed, y `renderCoachPlanWaiting()`; **COACH_STUDENT_JOURNEY_ENABLED=false**. La máquina exige 2 autorizaciones persistidas, ficha de la versión nueva compartida y con sección de salud confirmada, y publicación vinculada meta+guía posterior a esa ficha. Sus estados NO reemplazan RPC/RLS del servidor.
- Añadida prueba de contratos `tests/coach100-student-journey.mjs` para 25+ casos ficticios: falta de autorización, permisos retirados, ficha vieja, organización ajena, plan antiguo, plan pendiente, guía equivocada, aprobación previa a ficha y cuenta inactiva. Registrada en Premium QA de PR #37.
- **No terminado aún:** `health_section_confirmed` es un requisito de interfaz/contrato futuro y todavía NO existe como dato persistido alojado. Las dos autorizaciones COACH99 siguen con `persisted:false`. No activar flags ni hacer un GO sin las tablas/RPC correspondientes.
- Candidato actual: el flujo de ficha nueva `coach-relaunch-entry-client.js` está OFF, y el módulo digestivo `gut-clinical-workbench.js` NO recopila diagnósticos en Supabase. `efg_student_plan_access` todavía no está instalado en el Supabase alojado.
- Los alumnos existentes **NO se borran**: se solicita una nueva versión de ficha; se conservan identidad, planes e historia. Una meta/guía anterior no habilita esta versión automáticamente.

## Pruebas antes del relanzamiento del piloto
- Preparar backend versionado (sin intervención destructiva), aviso de participación con dos decisiones registradas, ficha y permiso sensible separado.
- Verificar RLS real: alumno A, coach A, alumno B, coach B, usuario inactivo, anónimo y admin; acceso a ficha médica solo por canal explícito autorizado.
- Probar orden tanto al ingresar como al actualizar o abrir deep links, y denegación de escritura de diario antes de publicar plan: **la interfaz no basta**.
- Probar reingreso en iPhone Safari/PWA, Android Chrome/PWA y computadora con datos ficticios; notificación coach/estudiante; comprobar registros antiguos intactos.
- Mac backup y hardening no imprescindible después de actualización por decisión del propietario; no autoriza exposición de datos de salud ni pérdida de permisos.

**Criterio de aceptación: el alumno NO ve MI DÍA ni registra comidas hasta que su coach apruebe y publique la meta y guía juntas, después de recibir la ficha actual.**
