# EFG Nutrition Pro · contrato técnico de aceptación legal por versión (DRAFT)

**29/10/2026 · PR34 · NO EXECUTABLE / NO MIGRAR PROD**

## Dependencias para habilitar
1. Aprobar jurídicamente los textos de `legal/TERMINOS_CONDICIONES_BORRADOR_20261029.md` y `legal/POLITICA_PRIVACIDAD_BORRADOR_20261029.md` completando responsable, domicilio, canal, condiciones económicas, conservación y proveedores. Crear textos finales inmutables por versión y hash criptográfico de su contenido exacto.
2. Instalar en **staging separado** el esquema y las funciones, con usuarios ficticios, JWT reales de ensayo y dos organizaciones. Probar restauración de backup. Registrar su evidencia.
3. Solo entonces habilitar `LEGAL_ONBOARDING_ENABLED` y conectar `pilot/legal-onboarding.js` al login/roles. No activar una pantalla que diga "Aceptado" si la base no registró el evento.
4. Publicar después de resolver PR33/PR35 y revisar la integración; ninguna migración masiva puede convertir antiguas cuentas en aceptaciones falsas.

## Aplicabilidad a todos los perfiles y relanzamiento mayor (decisión 29/10)
- La aceptación de Términos y la constancia informada de Privacidad se verifican **por identidad, no por tipo de cuenta**: administrador EFG, coach, alumno con coach y modalidad Personal/Autogestión cuando esta última se habilite. Cada relación contractual puede requerir cláusulas/anexos específicos para coach/Personal; el backend no debe asumir que un rol está exento por defecto.
- `efg_legal_documents` mantiene documento/version/hashes inmutables y ámbito aplicable. `efg_legal_acceptances` registra identidad y timestamp de servidor. `efg_student_intakes.shared_at`, `efg_consents` y salud sensible permanecen independientes.
- Para la actualización mayor se exige **reautenticación y aceptación real** de las nuevas versiones, pero confirmar «Entendido, cerrar sesión» en un aviso **no equivale** a consentir los Términos. La transición debe seguir: comunicación → confirmación de lectura → cierre de sesión propio → OTP → consulta de documentos vigentes → aceptación expresa → acceso por roles y permisos efectivos → Novedades de versión.
- Distinguir dos mecanismos: `efg_notifications.is_read` señala lectura de un mensaje; un ACK de lanzamiento, si se implementa, debe tener versión/usuario/fecha de servidor propia. Ninguna de esas señales desbloquea el gate contractual.
- En Supabase Auth, `signOut({scope:'global'})` desde la sesión del usuario revoca sus refresh tokens en todos sus dispositivos, pero los JWT ya emitidos pueden seguir siendo utilizables hasta su vencimiento. Para bloquear funciones sensibles inmediatamente tras el cambio de versión, validar estado del servidor/versión y, cuando corresponda, el `session_id` en `auth.sessions`; no confiar en componentes ocultos de un navegador viejo.
- No se puede enviar un aviso in-app de forma garantizada a una PWA cerrada sin servicio de push/correo habilitado. Evaluar bandeja de `efg_notifications` de solo lectura del usuario autenticado y canal de correo legítimo si está aprobado y probado. Nunca usar envíos masivos sobre cuentas reales como prueba.
- Publicación principal **congelada** hasta que estén implementados y validados semáforo contextual, dietas y restricciones, flujo Coach y documentos legales; Work sigue validando PR33 sin publicar, y ningún cierre masivo está autorizado ahora.

## Contrato de datos propuesto
- `efg_legal_documents` (lectura de versiones publicadas para usuarios): `id`, `kind` (terms/privacy), `version`, `sha256`, `locale`, `content`, `published_at`, `effective_at`, `retired_at`, `status`. Inmutabilidad del texto y del hash a partir de publicación, sin edición in-place.
- `efg_legal_acceptances` (owner-only SELECT, sin INSERT directo): `id`, `user_id`, `document_id`, `accepted_at` servidor, `acceptance_method`, `document_hash_sha256`, `version`, `kind`, `recorded_at`. Unique `(user_id,document_id)`, idempotente.
- `efg_legal_current_status()` seguridad de rol: obtiene documentos activos y aceptación real de la identidad autenticada. El cliente no puede elegir user_id ni editar fecha.
- `efg_accept_legal_documents(p_document_ids)` debe comprobar `auth.uid()`, `authenticated`, documentos published de la modalidad/versión vigente y aceptar un array de IDs **sin confiar en hash/version desde navegador**; registrar hash/version en una operación transaccional que no admita suplantación, backdate o overwrite. Validar que los IDs solicitados son exactamente los que el usuario seleccionó.
- `RLS` por identidad y roles estrictos en las tablas, `REVOKE EXECUTE FROM PUBLIC, anon` en RPC y grants mínimos. No delegar al frontend la comprobación de acceso.
- Una instalación de la nueva versión no requiere borrado ni reseteo de usuarios históricos. Ausencia de aceptación no equivale a aceptación; incluir ruta de acceso/soporte y salida sin entrar a funciones de seguimiento.
- El permiso de `efg_consents` (seguimiento por coach), `efg_student_intakes.shared_at` (compartir ficha) y cualquier permiso de salud futuro **son independientes** de los eventos de aceptación legal.

## Activación en dos fases
**Fase informativa**, tras revisión jurídica: publicar versiones legales de solo lectura, mostrar información de derechos y permitir contactos sin bloquear ninguna cuenta. No presentar la simple visita como aceptación.

**Fase obligatoria**, únicamente tras RLS/JWT E2E y autorización: desde sesión OTP, mostrar `renderLegalOnboarding` cuando falta versión obligatoria; pantalla accesible, dos casillas no premarcadas, ver texto completo, cerrar sesión, acceso a derechos. Ejecutar RPC por cada documento seleccionado y reconsultar el servidor antes de mostrar MI DÍA/Coach/Admin. En cambios de versión, solicitar solo las nuevas aceptaciones; no inventar un `accepted_at`.

## Gating de backend
**No basta** con ocultar navegación: revisar todas las rutas REST y RPC de escritura, la obtención de información de alumnos, diarios, planes, pagos y mensajes, así como lecturas sensibles cuando corresponde. Evitar circularidad en endpoints necesarios para consultar las políticas y retirar el consentimiento. La implementación concreta requiere inventario del esquema y pruebas de regresión antes de decidir cuáles operaciones bloquear. No emplear un `SECURITY DEFINER` público sin validación de identidad/rol.

## QA ficticio
- Usuario antiguo entra tras activación: sin pérdida de diarios/pagos, ve documentos vigentes y sin aceptaciones preexistentes ficticias.
- Usuario nuevo: dos casillas separadas, texto completo legible, 0 casillas por defecto.
- Negativa, cierre de sesión, sin red, OTP vencido: acceso seguro y sin aceptación inventada.
- A intenta aceptar por B / con fecha inventada / hash desactualizado: bloqueado en servidor.
- Coach A y alumno A vs Coach B y alumno B: aislamiento; coach no registra aceptación por su alumno.
- Nueva versión de Términos con Privacidad sin cambios: reacepta solo la primera.
- Permiso de compartir ficha revocado: no se reabre por aceptar los Términos; caso viceversa.
- Cuenta existente con plan en curso: conservar permisos de privacidad y permitir acceso a derechos.
- Capturas iPhone Safari/Android 320–430px, teclado, lector de pantalla, focos.
- Control de idempotencia, reintentos y timestamp del servidor.

## Excepciones que requieren definición legal
Menores de edad, coach profesional sanitario vs entrenador, términos de pagos/licencias, plazos de retención, reclamos, transferencia internacional y derecho de rectificación/supresión. No usar el motor de dietas para inferir diagnósticos.

**ACTUALIZACIÓN LEG-07 · 29/10/2026:** se agregó `docs/LEGAL_VERSIONED_ACCEPTANCE_STAGING_SQL_20261029.sql` como **borrador ejecutable EXCLUSIVAMENTE en PostgreSQL 17 aislado**, con tablas de documentos versionados (hash SHA-256 del contenido), RLS, congelamiento de textos publicados, registros de aceptación por identidad/tiempo de servidor, RPC con comprobación de documentos vigentes y prevención de suplantación, y reaceptación sólo de versión nueva. Se probaron escenarios con documentos y usuarios **ficticios** en base efímera mediante `tests/sql/nut57-legal-pg17-bootstrap.sql`, `tests/sql/nut57-legal-pg17-scenarios.sql` y el workflow PostgreSQL17. No equivale a términos jurídicamente aprobados ni prueba JWT firmado, dos organizaciones, retención/derechos completos, staging fiel, restauración integral o protección global de endpoints. `LEGAL_ONBOARDING_ENABLED=false`. Ninguna tabla legal fue creada en Supabase hospedado, ningún usuario fue declarado aceptante y la aplicación publicada sigue sin cambios.

**ESTADO:** SQL de diseño probado SOLO con PostgreSQL aislado sintético, no conectado a la UI; revisión legal, integración, Auth firmado y staging completo PENDIENTES. RELEASE NO GO.
