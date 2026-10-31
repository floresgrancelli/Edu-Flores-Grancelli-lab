# EFG Nutrition Pro · Ficha nutricional contextual y generación asistida Coach (decisión 29/10/2026)

**ESTADO: especificación funcional aprobada por el propietario, NO IMPLEMENTADA en conjunto ni habilitada en producción. PR37 DRAFT.** La ficha actual de PR34 cubre datos generales y compartir explícito, pero aún no crea automáticamente una guía desde esa ficha ni completa el flujo protegido de envío, notificación y aprobación. No confundir documentación con funcionalidad live.

## Regla de navegación: NUNCA selector de perfiles en la ficha
La sesión y los permisos verificados por Supabase determinan automáticamente la experiencia. **No mostrar el campo «¿Qué perfil querés visualizar?»** ni dejar que el usuario cambie roles con controles de UI:
- `student` vinculado a Coach (entitlement y vínculo verificados): `MI INGRESO / Mi ficha nutricional`, opción de guardar privada y acción explícita «Enviar mi ficha a mi coach».
- `personal` o rol `student` con entitlement real de Autogestión: `Mi ficha nutricional`, genera estimación y guía editable propias sin un coach receptor. El rol lógico debe venir del servidor, no del parámetro `mode` elegible o URL.
- `coach`: como profesional abre «Nuevos ingresos» y la ficha **de sus alumnos autorizados**; cuando registra su propia alimentación utiliza el flujo de perfil propio sin leer datos ajenos.
- `admin`: permisos administrativos explícitos de la plataforma; no ver datos clínicos/ingestas de alumnos por la sola condición de administrador.

Una sesión y su vínculo no se infieren del email, un querystring o una elección del frontend. Si la identidad/entitlement no se puede verificar, mostrar error o vista segura, no desbloquear la calculadora ajena.

## Flujo alumno Con Coach → Coach → publicación, de punta a punta

1. **Alumno:** accede por OTP; se determina modalidad y permisos de sesión. Completa ficha general de datos, objetivo, actividad, entrenamientos, preferencias, horarios y comidas. Los campos médicos y alergias son un módulo sensible SEPARADO con consentimiento específico. Admite guardar y retomar borrador privado; no publicar sin autorización.
2. **Entrega informada:** botón inequívoco «Enviar mi ficha a mi coach»; antes de enviar mostrar destinatario (coach vinculado) y alcance exacto de datos generales compartidos. Requiere consentimiento de seguimiento y compartición vigentes. NO marcar por defecto ni compartir una ficha solo porque se guardó. Marcar fecha/versión de envío desde el servidor; el alumno puede revocar compartir. El estado pasa de `draft_private` a `submitted` solo mediante operación autorizada e idempotente.
3. **Aviso a coach:** cuando el backend confirma envío, crear notificación privada de tipo `student_intake_submitted` para el coach vinculado, sin incluir datos de salud ni información sensible en asunto/previsualización/push/correo. La lectura en la bandeja no concede permisos: la consulta posterior siempre relee vínculo, compartir y RLS.
4. **Coach abre ficha recibida:** ve edad, altura, peso declarado, objetivo, actividad, rutina y preferencias en una vista de `Nuevo ingreso`; puede solicitar aclaraciones sin cambiar la ficha declarada del alumno. Si el permiso se revoca, pierde acceso a la ficha nueva y su caché se invalida.
5. **Ingresar a calculadora:** acción «Preparar plan con esta ficha». La app precarga automáticamente **solo los campos autorizados y válidos**, verificando unidad, fecha, modalidad y origen. La calculadora devuelve gasto/objetivo energético estimado y propuesta de macros/fibra con fórmula científica aplicable, grado de incertidumbre, advertencias por campos faltantes y verificación humana. La variable necesaria de una ecuación fisiológica, si aplica, debe recogerse informadamente como dato opcional o ofrecer fórmula alternativa; no inferir sexo fisiológico del apodo o identidad. Entrenamientos y actividad laboral se modelan sin doble conteo.
6. **Crear guía automáticamente:** la app propone cinco comidas (o la distribución autorizada) con alimentos del catálogo, preferencias, horarios, restricciones/patrones y compatibilidades científicamente verificadas. Respetar fuentes de ingredientes, alergias, dieta restringida, calorías, macros y fibra. Si faltan datos para compatibilidad: etiqueta amarilla, no presentar como seguro. Al modificar ingredientes/gramos, recalcular automáticamente resto del día sin alterar los elementos fijados por coach; botón «Recalcular con nuevos pesos y/o ingredientes». Mostrar desvíos no resueltos y permitir revisión/corrección.
7. **Revisión humana indispensable:** los objetivos y la guía generada son `draft`, nunca se envían ni habilitan consumo diario por crearse automáticamente. Coach revisa/edit/approve dentro de sus competencias; puede rechazar y devolver sugerencias. «Aprobar y enviar plan» es acción separada, consciente y server-authoritative con idempotencia/auditoría y referencia a versión de ficha/objetivo/guía. Si la guía cambia después de aprobación, invalidar aprobación y requerir otra.
8. **Alumno:** cuando el servidor confirma publicación, recibe notificación «Tu plan está listo» y puede consultar guía y metas desde su cuenta. No se deben confundir guías sugeridas con comidas efectivamente registradas.
9. **Cambios posteriores:** alumno modifica/retira la ficha sin borrar diario ni plan histórico. Si cambia un dato significativo del intake tras publicación, marcar necesidad de revisión por el coach, pero no alterar macros ni reemplazar automáticamente el plan vigente. Nueva publicación requiere nueva aprobación.

## Flujo Autogestión
La misma estructura visible se adapta automáticamente a Autogestión desde entitlement verificado: ficha propia → cálculos y guía orientativos para revisión por usuario → `Confirmar mi propuesta` → seguimiento. No se envía a ningún coach. Condiciones médicas/alergias sin módulo revisado detienen las **afirmaciones clínicas automáticas**, pero no impiden registrar alimento real ni consultar información general. Permitir cambiar metas dentro de límites e indicaciones apropiadas y monitorear evolución.

## Flujo Coach
Un coach que es usuario de la app debe ver automáticamente su **panel Coach** para alumnos autorizados. El plan de **su propia alimentación** sigue la ficha Personal propia cuando se habilite esa modalidad para el perfil, sin permitir acceso a datos de alumnos por confusión de identidad. El coach es quien aprueba los objetivos/guías de sus alumnos; EFG genera borradores asistidos, nunca realiza publicación clínica unilateral.

## Indicadores que debería ver cada persona
- Alumno: «Ficha guardada en privado», «Ficha enviada a [coach autorizado]», «Coach preparando el plan», «Tu plan está listo», «Actualización de ficha recibida», y «Revocar acceso». Evitar estados de falso éxito si falla el backend.
- Coach: «Nuevo ingreso / Ficha recibida», botón «Preparar plan con esta ficha», «Objetivos calculados (estimados)», «Guía generada (borrador)», «Revisar», «Aprobar y enviar», registro de notificación/entrega, diferencias frente a nueva versión de ficha.
- Autogestión: «Ficha guardada», «Propuesta para revisar», «Confirmar mi plan» y «Actualizar según evolución».

## Datos, seguridad y QA (bloqueantes)
- Backing schema/estados y RPC transaccionales en staging aislado; no aceptar submitted/approved/published por una mutación libre de cliente. Coach A no debe leer alumno B ni alumnos con ficha privada/revocada; validar con JWT reales y dos organizaciones.
- Integridad de cálculos: objetivo, gasto energético, calorías y macros científicamente coherentes; hábitos, edades y actividad incompletos informados al coach; restricciones médicas separadas con autorización y fuentes; usuario puede registrar ingestas reales aun si plan incompatibilidad detectada.
- Cambios de ficha y concurrencia: idempotencia, reintentos offline, envío doble, retiro de permiso mientras coach edita, versión obsoleta de ficha/objetivos, borrador nuevo tras plan publicado, no sobrescribir cambios del coach.
- Pruebas UX móviles Safari/Chrome (390/320/430), accesibilidad, teclado, foco, estados vacíos y borradores.
- Compatibilidad hacia atrás de alumnos históricos; no obligarlos a reenviar una ficha nueva para conservar planes/diarios existentes.
- El envío de una notificación depende de canal disponible/consentimiento/base legal. Un aviso a la bandeja puede esperar a próximo ingreso sin ser push instantáneo.
- Mantener todas las banderas en **OFF**, PR37 en DRAFT, no merge, no SQL/Auth en producción ni comunicaciones reales. Hace falta validación de staging/backup, cumplimiento jurídico y autorización final del propietario.

## Prioridad de desarrollo
**Primero:** modelar roles y estados `draft_private → submitted → coach_review → draft_plan → approved → published` y documentos/verificación del servidor, con tests aislados.
**Después:** integrar notificación y precarga de calculadora, generador de cinco comidas y editor ya existentes, evitando duplicación de algoritmos.
**Finalmente:** pruebas reales staging/JWT y walkthrough móvil con personas ficticias; incluir semáforo/restricciones solo después de revisar fuentes.

**Decisión del propietario:** no debe aparecer un selector de perfil en la ficha, ni permitirse que el alumno apruebe la guía asignada por su coach. Ficha enviada al coach + app calcula + app genera guía + coach revisa/ajusta + coach aprueba y envía.


## Implementación incremental en la rama candidata PR #37 — 29/10/2026
**Primer puente real de interfaz (solo código DRAFT, no activo en producción):**
- `pilot/coach-intake-prefill.js` transforma únicamente datos generales de una ficha RLS compartida en campos de la **calculadora existente**, sin inferir sexo de ecuación ni diagnóstico. Edad, altura, peso, objetivo y actividad fuera de los rangos soportados quedan para revisión manual; actividad «alta» no se convierte artificialmente en 1,5. Objetivos «mantenimiento» o «hábitos» no se sustituyen en secreto por descenso de grasa.
- `pilot/coach-intake-flow.js` ofrece «Preparar plan con esta ficha» dentro de la ficha consentida. El guardado de ficha puede mantenerse privado o compartirse expresamente con el coach; el botón de guardar/enviar informa su alcance según la casilla.
- `pilot/pilot.js` vuelve a consultar ficha y consentimiento del servidor en el momento de precargar. En la vista de Objetivos abre la calculadora con campos conocidos y advertencias. El parámetro fisiológico requerido por Mifflin/Ten Haaf sigue siendo de selección **manual**, no se deduce del usuario.
- **Al calcular**, la app genera un **ejemplo de cinco comidas no aprobado** cuando el patrón es omnívoro y existe seguimiento autorizado. Si la ficha declara un patrón vegano/vegetariano/pescetariano/otro, el generador omnívoro no funciona automáticamente para evitar mostrar ingredientes excluidos; falta motor dietético validado. **No se afirma seguridad ante alergias o celiaquía**: el ejemplo no incluye validación médica. Si el coach cambia kcal/macros, el menú preliminar se vuelve a calcular.
- **Al guardar el objetivo revisado**, el borrador de guía pasa al editor que ya existía, para que el coach revise cantidades/ingredientes, apruebe la guía y, por separado, publique el plan con la RPC existente cuando esté habilitada. No se simula un envío a alumno ni se registra consumo ficticio.
- Prevención de datos obsoletos: se relee consentimiento y la revisión `updated_at` de la ficha antes de aprobar un objetivo; si cambió o se revocó, se cancela ese paso hasta que el coach vuelva a abrir la ficha. Cache de prefill se limpia al cambiar alumno y en logout.
- `tests/coach-intake-prefill.mjs` y Premium QA verifican casos negativos de permisos, límites de fórmula, objetivos/actividad no mapeables, no crear guías animales para patrones incompatibles, ausencia de publicación automática y conexión a UI. Browser QA sigue usando fixtures; **NO** autenticación real ni permisos multi-organización.

**Qué todavía NO está terminado:** publicación/aceptación legal y sesión nueva, SQL/RLS realmente aplicados, notificaciones reales al coach y al alumno, versiones completas y envío de ficha registrado por backend, integración segura de restricciones clínicas, Autogestión, evaluación científica de planes especiales, staging con restauración y QA físico. En la migración DRAFT ya existe un trigger de notificación de «Ficha inicial recibida» al comenzar a compartir (`efg_private.notify_submitted_intake`); **no se ejecutó**. El botón de envío usa hoy `shared_at` como autorización, no una RPC de entrega con estado/versionado; esto sigue pendiente de un backend robusto.

**Riesgo de diseño que debe resolverse antes de liberar:** `efg_goals` guarda el objetivo revisado antes de que el coach apruebe la guía; los alumnos nuevos deben seguir `pending` hasta `efg_publish_coach_plan`, y los alumnos históricos pueden tener objetivos visibles según las políticas actuales. La futura implementación definitiva debe distinguir borrador de objetivo y versión publicada para impedir que una guía no aprobada modifique la prescripción visible. Validar con JWT/organizaciones en staging antes de autorizar publicación.

**Regla de publicación:** mantener PR #37 DRAFT, todas las funcionalidades nuevas sin desplegar en Render; no ejecutar SQL productivo, no enviar comunicaciones ni forzar sesiones.
