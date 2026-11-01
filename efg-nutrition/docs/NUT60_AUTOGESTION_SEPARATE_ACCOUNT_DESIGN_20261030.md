# NUT-60 · Autogestión sin coach — diseño de aislamiento y lanzamiento seguro

**30/10/2026 · PR #37 DRAFT · implementación del backend/UI NO terminada · RELEASE NO GO**

## Diagnóstico verificado sin datos personales

Se inspeccionó el código candidato y las restricciones de `public.efg_profiles` mediante una consulta **solo metadatos**. Hoy `efg_profiles_role_check` admite únicamente `admin`, `coach`, `student`; la restricción `profile_org_role` exige `organization_id` para estudiantes y lo prohíbe para otros roles. La función vigente `efg_claim_invitation()` requiere una invitación previa del coach/EFG, lo cual no sirve para usuarios que desean registrar su propia nutrición sin profesional.

La pantalla `MI DÍA` de coach/admin permite **su seguimiento personal** (tiene un comportamiento distinto del alumno), pero eso **no equivale** a un producto Autogestión para personas sin coach. NO se debe otorgar artificialmente el rol `student` en una organización ficticia ni usar credenciales de servicio en el cliente para sortear estas restricciones.

## Modelo aprobado como objetivo de diseño (NO operativo)

**Modalidades:** Admin, Coach, Alumno de coach y **Personal (Autogestión)**. Cada login muestra su interfaz propia automáticamente, sin selector de perfiles. Mantener intacta la relación coach↔alumno y la cuenta personal del coach.

**Identidad:** proponer rol `personal` con `organization_id IS NULL`, y alta explícita en un endpoint `SECURITY DEFINER` auditable de **autorregistro autenticado** con OTP verificado y aceptación legal versionada; nunca permitir que cliente elija otro `user_id`, rol admin o propiedad ajena. La nueva RPC no debe poder apropiarse de usuarios existentes ni de invitaciones, y debe rechazar transiciones coach↔alumno↔personal no autorizadas. La ampliación de `profile_org_role` exige migración exacta, revisión de todas las políticas RLS y de los triggers dependientes.

**Nutrición:** objetivos calculados con motor científico existente y ficha de ingreso adaptada; restricciones médicas y patrones vegetarianos/veganos/celiaquía son preferencias/condiciones declaradas por el usuario, no diagnósticos automáticos. Los semáforos verde/amarillo/rojo corresponden **solo a compatibilidad con restricciones/dietas**, nunca a calorías ni a «alimentos buenos/malos». Sin restricciones, todo el catálogo es elegible sin marcas; con evidencia insuficiente, usar amarillo «Verificar» y nunca verde por inferencia. No bloquear alimentos «prohibidos» sin base clínica; informar al usuario y dejar claro que la app no sustituye asesoramiento médico.

**Planes y datos:** registrar objetivos, versiones de guía y reportes como **propiedad del usuario personal**, no como `approved_by=coach` ni como `coach_id` falso. Un cambio de objetivos no debe sobrescribir el historial; mantener `goal_id` versionado, instantánea de guía vigente, notas de origen y aceptación de cambios. Reutilizar la biblioteca de alimentos y el motor de macros con datos propios, respetando 5 ingestas, favoritos/habituales, suplementos y la función «Resolver lo que me falta». La guía educativa debe separar proteína/hidratos/plato preparado en comidas principales; media mañana y media tarde permanecen libres. Debe permitir «Omitir» sin inventar consumo. La barra de tolerancia solo ±5%.

**Privacidad:** mantener datos personales separados de los de alumnos/organizaciones, incluso si un coach también es usuario personal. La cuenta personal no aparece en búsquedas, mensajería o pagos de coach. Probar ataques de un personal→estudiante ajeno y coach→personal ajeno con JWT firmado, SELECT e INSERT/UPDATE/DELETE, RPC y RLS en ambos sentidos. Ningún registro personal debe aparecer en informes automáticos a un coach sin nueva autorización específica y revocable.

**Consentimientos:** aceptación legal de Términos y Política de Privacidad versionados debe ser explícita y sin backfill; autorizaciones de compartir datos con un coach son separadas, por finalidad y revocables. Revisión jurídica y profesional obligatoria antes de habilitar.

## Checklist técnico de implementación segura

1. **Staging restaurable** fiel al esquema hospedado, con inventario de todas las restricciones `profile_org_role`, RLS/GRANT, funciones y triggers.
2. Migración DRAFT para rol `personal` y tablas/RPC de planes/versiones personales, sin tocar hosted. No abrir una función `SECURITY DEFINER` sin exigir `auth.uid()` confirmado, `search_path` fijo, grants mínimos y auditoría anónimos/otros roles.
3. Pruebas locales de registro personal con OTP/GoTrue firmado, usuario existente, reintentos, carreras, BOLA entre usuario A/B, coach y alumno, versiones de meta/guía, login/logout y ausencia de filtración.
4. UI personal completa de extremo a extremo: ficha, objetivos, dieta guía, registro de cinco comidas, favoritos, resolver faltantes, informe, gráficos y notificaciones propias, experiencia visual comparable con coach/alumno.
5. Ensayos de restricciones dietéticas por profesional y fuentes auditables: verde/amarillo/rojo explícitos, sin semáforo si no hay restricciones, desconocidos amarillo, alérgenos/celiaquía nunca clasificados como seguros por datos faltantes.
6. QA real iPhone PWA, Android PWA, MacBook/Safari; pruebas de accesibilidad y sincronización, recuperación de datos tras crash, avisos de actualización, servicio worker/caché y cambios de plan.
7. Garantizar que usuarios existentes no sean convertidos automáticamente. Una sola publicación junto con NUT-57, LEG-07, SEC-08 y las demás mejoras, con autorización expresa.

**DECISIÓN ACTUAL:** diseño base de Autogestión y limitaciones verificadas, **NO implementada**, sin migración productiva ni cuentas creadas. Seguir preparación técnica en la rama candidata, no declarar listo para publicar.
