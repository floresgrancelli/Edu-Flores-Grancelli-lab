# Nutrición Con-Ciencia — preparación Google Play

Actualizado: 13/11/2026. Rama de trabajo: work/ncc-android-play-prep-20261113, PR #123.
La cuenta Play Console se creará al final, por decisión de Edu. No es un bloqueo para esta etapa.

## Evidencia técnica ya obtenida

- Compilación exitosa: https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/43447478835
- JDK 17, Gradle 8.11.1, API objetivo 36, mínimo Android 7/API 24.
- APK debug instalable y AAB release sin firmar generados. Lint Android pasó.
- El APK debug NO es el archivo que se envía a Google Play.
- TWA usa las mismas cuentas/backend; no existe una segunda base de datos.
- No se publicaron cambios en Render, no se fusionó la rama y no se registraron claves de firma.
- Verificación en emulador y QA de privacidad: consultar el último workflow de la PR.

## Solicitud de eliminación preparada

La página /pilot/eliminar-cuenta.html funciona como recurso web externo y se enlaza
desde Privacidad y desde el pie común de la app (alumno, coach, administrador).
Verifica la cuenta por OTP, no crea cuentas nuevas y registra una solicitud pendiente.
Entrega constancia solo después de releer el pedido confirmado por el servidor.
El cliente no puede declarar completado un pedido ni acceder al de otro titular.

IMPORTANTE: es el circuito de RECEPCIÓN de solicitudes; no es un ejecutor de borrado.
El esquema backend es candidato y se verifica en PostgreSQL aislado. NO se aplicó
al servicio publicado. Antes de activar la página hay que poner en funcionamiento
la atención de solicitudes y verificar el borrado real con una cuenta sintética.
No fusionar los enlaces del piloto hasta que el backend esté disponible y ese circuito esté probado.

## Requisitos pendientes antes del envío

| Área | Pendiente concreto |
|---|---|
| Cuenta y firma | Cuenta/tipo/titular verificados; paquete definitivo; firma de subida y Play App Signing |
| Dominio | Servir /.well-known/assetlinks.json en la raíz con SHA-256 REAL de firma de app, no solo firma de subida |
| Eliminación | Activar recepción y responsable de atención; verificar Auth, Storage, tablas relacionadas y datos retenidos |
| Privacidad | Publicar HTML con responsable, contacto, proveedores/regiones y retención confirmados; no reutilizar el borrador antiguo como vigente |
| Seguridad de datos | Declaración basada en inventario de datos, SDKs y flujos efectivos, con revisión de datos compartidos con coaches |
| Salud | Declarar nutrición/control de peso y otras categorías que correspondan a funciones reales |
| Pagos | Clasificar pago por servicio profesional y licencia digital; resolver facturación aplicable antes de distribución |
| Revisión | Cuenta sintética de revisión con acceso reproducible a funciones, sin aprobación manual pendiente del coach |
| Calidad Android | Login/logout/OTP, rol alumno/coach/admin, fotos, PDF, teclado, Atrás, scroll y recuperación de red |
| Presentación | Icono definitivo y capturas aprobados por Edu; descripción sin promesas médicas |
| Lanzamiento | Prueba desde Play y requisitos según cuenta; revisión de Google y autorización final de Edu |

## Datos observados en el código (inventario inicial, no declaración final)

| Grupo | Evidencia en pilot.js / módulos | Uso a declarar/revisar |
|---|---|---|
| Identidad | Supabase Auth; efg_profiles, efg_invitations | Correo, ID de usuario, nombre/perfil, rol y vínculo |
| Nutrición y bienestar | efg_daily_logs, efg_weights, efg_activities, efg_goals, efg_personal_targets | Alimentación, peso, actividad, objetivos y datos de salud declarados |
| Planificación | efg_food_plans, efg_coach_plan_drafts, efg_habitual_meals, efg_personal_recipes | Planes, preferencias y contenido creado por el usuario |
| Informes y comunicación | efg_weekly_reports y módulos de mensajería/notificaciones | Informes y mensajes privados; revisar adjuntos |
| Información comercial | efg_payments, efg_billing_settings, efg_organizations | Pagos, comprobantes y licencias; no asumir que son compras Play |
| Archivos | Storage efg-receipts; demás módulos de fotos por inventariar | Fotos y comprobantes, enlaces firmados, borrado de objetos |
| Permisos/consentimientos | efg_consents, onboarding y documentos versionados | Autorizaciones y constancias; definir retención necesaria |
| Solicitudes de eliminación | ncc_account_deletion_requests, nuevo candidato | ID de titular, fecha y estado de su pedido |

No se inspeccionaron ni copiaron registros de personas reales. Este inventario de código
no prueba residencia de datos, ausencia de telemetría ni configuración efectiva de proveedores.

## Privacidad pública sin abrir permisos de base de datos

El esquema legal existente permite leer documentos solo a usuarios autenticados.
Eso no alcanza como URL pública de Google Play. Se agregó un exportador que toma
la versión vigente/publicada, verifica su SHA-256 y genera HTML estático accesible
sin sesión. Rechaza borradores, contenido alterado y marcas de datos incompletos.
No exporta recibos de usuarios ni abre la tabla legal al público.
Debe ejecutarse sobre el documento vigente real, revisado y completo; no se
publica una política ficticia. Comando desde android/:
`node scripts/export-public-privacy.mjs documento.json ../pilot/privacidad.html`.
Volver a exportar al actualizar la versión legal.

## Tramitar una eliminación: procedimiento requerido

1. Un responsable debe revisar solicitudes abiertas mediante acceso administrativo seguro.
2. Verificar la identidad y el alcance; la recepción ya verifica al titular por OTP.
3. Inventariar relaciones y archivos asociados ANTES de eliminar Auth: revisar claves
   foráneas reales, cascadas, membresías y objetos de Storage. No ejecutar cascadas a ciegas.
4. En cuentas coach/admin, preservar las cuentas y registros ajenos y resolver propiedad
   de espacios compartidos. No borrar alumnos porque su coach cierra su cuenta.
5. Comunicar cualquier retención justificada, finalidad y plazo. No inventar plazos.
6. Probar con una cuenta sintética la eliminación de datos y archivos, el cierre/revocación
   de sesiones y el bloqueo de tokens antiguos donde corresponda.
7. Completar una solicitud únicamente con evidencia del procesamiento real; no usar
   desactivación o congelamiento como sustituto. El pedido se elimina por cascada al
   borrar el usuario Auth; no se conserva PII duplicada sin finalidad.

## Fuentes oficiales consultadas

- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/14738291
- https://support.google.com/googleplay/android-developer/answer/10281818
- https://support.google.com/googleplay/android-developer/answer/13634885
- https://developer.android.com/google/play/requirements/target-sdk
- https://developer.chrome.com/docs/android/trusted-web-activity/
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Ficha de tienda — borrador para revisar

Nombre propuesto: Nutrición Con-Ciencia

Descripción breve:
Registrá tus comidas, organizá tus hábitos y compartí tu progreso con tu coach.

Descripción:
Nutrición Con-Ciencia reúne tu registro de comidas, planificación y seguimiento
personal en un solo lugar. Consultá tus objetivos y tu Dieta Guía cuando estén
habilitados, registrá tus comidas y revisá tu evolución de peso y actividad.

Si trabajás con un coach, podés compartir tus registros según los permisos que
autorices, recibir informes y usar la mensajería disponible en tu cuenta.
Los profesionales cuentan con herramientas para organizar el seguimiento de sus alumnos.

La versión Android usa la misma cuenta y los mismos registros que la versión web.
Requiere conexión a Internet y una cuenta habilitada para acceder a sus funciones.
Las herramientas son orientativas y no sustituyen la evaluación de un profesional
de la salud. No se presentan como un medio para diagnosticar o tratar enfermedades.

No se afirma disponibilidad offline, integración Health Connect, diagnóstico,
notificaciones push ni funcionalidades nativas que todavía no se verificaron.
