# EFG Nutrition Pro — Con Coach: ingreso, ficha y publicación

**Estado:** propuesta técnica, no desplegada. La nueva pestaña **Nuevos ingresos** en esta rama es una organización de datos existentes, **NO** activa ni bloquea planes. Trabajo separado del PR #33 UX1.

## Recorrido aprobado
1. Coach invita alumno según cupo y licencia vigentes.
2. Alumno accede con OTP; bienvenida e información de privacidad.
3. La cuenta recién incorporada entra en **Preparando tu plan**. Tiene mensajería con coach, ficha de ingreso voluntaria, consentimiento y soporte. Las herramientas que escriben o recomiendan a partir de un plan aún inexistente permanecen bloqueadas, **también a nivel de servidor**.
4. Alumno llena ficha y elige compartirla. Campos candidatos: objetivo, edad/fecha de nacimiento (minimizada), altura, peso autodeclarado, nivel de actividad y observaciones opcionales. No imponer campos de salud ni inferir diagnósticos. Puede guardar borrador, enviar, corregir/revocar permisos.
5. Coach ve **Ficha recibida** solo con consentimiento. Prepara objetivo y guía; borrador no es publicación.
6. Coach **publica explícitamente** plan validado en una operación autorizada y auditable. Se notifica al alumno y se habilitan MI DÍA, cálculo de macros, registro de alimentos, recetas, progresos y herramientas permitidas. Una meta aprobada anterior en efg_goals **no demuestra** que exista este nuevo evento de publicación.
7. Alumno conserva historial. Al revocar consentimiento, cesa lectura por coach según RLS; privacidad no equivale a borrar datos.

## Diseño de la navegación del coach
Pestaña **Nuevos ingresos** entre Inicio y Alumnos, con etapas visibles: Invitaciones, Esperando autorización, Ficha recibida (después de implementar almacenamiento seguro), Plan por preparar, Plan publicado (solo desde evento backend), En seguimiento. La versión inicial en código muestra de forma fiable únicamente invitaciones, consentimientos y presencia de objetivo, sin declarar publicados o desbloqueados. Incluye accesos directos a mensajes y ficha individual.

## Backend pendiente — obligatorio ANTES de publicar onboarding restringido
- Diseñar tabla de ficha inicial privada, columnas tipadas/validadas, consentimientos granulares, RLS de lectura por alumno y por coach **únicamente** cuando haya vínculo activo + consentimiento vigente y el alumno haya enviado la ficha; roles autenticados y pruebas cruzadas entre organizaciones.
- Diseñar un estado de activación **servidor** explícito e inalterable por alumnos; plan Borrador / Publicado y evento auditado de publicación por coach autorizado y de la organización correcta. No inferir publicación de la mera existencia de `efg_goals` o `efg_food_plans`.
- Garantizar que la actualización inicial **preserve acceso de todos los alumnos actuales**: migrar cohortes históricas como heredadas habilitadas, incluir trigger/transacción para nuevos alumnos y validación de migración/rollback; nunca deducir estado de ausencia de fila sin prueba.
- Aplicar gate de escritura y consultas derivadas a servidor/RLS/RPC para `efg_daily_logs`, pesos, actividades, suplementos, recetas/habituales, metas automáticas y acciones de planificación, sin romper el diario privado del coach/admin. La UI no basta.
- Incluir consentimiento explícito del alumno antes de compartir datos de salud; OTP no equivale a consentimiento universal.
- Plan de staged QA: invitación sin acceder, ficha borrador/envío, recepción solo por coach, plan borrador, publicación atómica/única, intento de eludir bloqueo vía API, aislación coach A/B, revocación, sesiones móviles, alumnos históricos con acceso intacto.
- Generar migración versionada, revisar SQL, advisors y riesgos/costos, **sin ejecutarla en producción** hasta aprobación específica.

## Estado del código
La pestaña actual consulta `efg_goals` **solo en lectura** para alumnos activos con consentimiento conocido, y conserva resultados como «objetivo existente», no «plan publicado». No hay nuevas tablas, migraciones ni permisos añadidos. Cualquier falla en esa consulta se muestra como estado no verificable. Esta PR debe mantenerse DRAFT, sin fusionar/desplegar; tras cerrar UX1 rebasar/integrar cambios sobre la versión aprobada y repetir CI y QA visual autenticado.
