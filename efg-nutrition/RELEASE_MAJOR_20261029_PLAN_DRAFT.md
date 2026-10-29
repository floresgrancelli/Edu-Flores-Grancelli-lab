# EFG Nutrition Pro · actualización mayor para pruebas (release candidate, NO autorización de despliegue)

**Fecha de preparación: 29/10/2026. Producción actual conocida `9000e4d8e08bd9483770209a863b1cdba2141c43`.**

## Decisión vigente del propietario · **CONGELAMIENTO DE PUBLICACIÓN**
**29/10/2026: reemplaza expresamente el esquema anterior de cuatro olas públicas.** No fusionar PR #33/#35/#34/#36 ni desplegar parcialmente aunque sus CI individuales estén aprobados. Work puede **revisar** PR #33 y otros PR pueden desarrollarse/testearse **en ramas de staging**, pero ninguna publicación de la app principal queda autorizada. Se prepara una **única actualización mayor coordinada**, no necesariamente en una sola migración; las etapas técnicas se prueban antes de la apertura al público.

### Alcance mínimo, obligatorio para levantar el bloqueo
1. **Términos y Condiciones + Política de Privacidad** versionados y jurídicamente revisados, visibles y aplicables a **todos los roles existentes y futuros**: administrador EFG, coach, alumno con coach y Autogestión/Personal. Dos confirmaciones explícitas, independientes de compartir ficha y salud, guardadas con identidad real, versión, hash y hora del servidor. Nunca aceptar por otro usuario ni pre-marcar casillas.
2. **Ficha inicial y publicación de plan** validadas en staging; datos opcionales del alumno, permiso voluntario de compartir, revocación, permisos seguros, cohortes anteriores sin pérdida de acceso/historial y publicación expresamente autorizada. No almacenar diagnósticos en la ficha general.
3. **Motor único de patrones y restricciones para Coach/Alumno/Personal** con pruebas científicas y legales: dietas variadas/mediterránea/DASH/Portfolio/vegetariana/vegana/pescetariana/flexitariana/keto cuando sea seguro; horarios/ayuno independientemente. Restricciones y condiciones se deben evaluar bajo incertidumbre, etiquetas verificadas, consentimiento médico sensible aparte y profesional habilitado cuando corresponda.
4. **Semáforo alimentario contextual y compartido** en las tres experiencias: VERDE solo compatibilidad documentada, AMARILLO información pendiente, ROJO incompatibilidad demostrada; **catálogo neutral sin restricciones**, y distintivo aparte «Incluido en mi plan». NUNCA etiqueta roja por kcal, grasas o dulces; no ocultar alimento ni impedir registro veraz. En alergias/celiaquía, sin prueba suficiente = NO verde.
5. **Comunicación profesional del lanzamiento**: aviso individual seguro al usuario sobre la próxima actualización mayor, lectura y confirmación de recepción **NO contractual**, cierre de sesión únicamente tras decisión activa y reentrada OTP; aviso posterior «Novedades de esta versión» con mejoras específicas y recursos visuales, una vez por versión (no confundir con «Tip nutricional del día»).
6. **Protección de sesiones antiguas y aceptación legal real**: aviso leído NO autoriza acceder a salud ni aceptar términos; backend gate versionado/rol y control de reautenticación, rutas de ayuda/derechos accesibles. RLS/RPC JWT reales con dos organizaciones, respaldo restaurable, CI 3/3 tras INTEGRACIÓN, QA visual y humana de dispositivos, revisión del usuario antes de publicar.

### Experiencia propuesta para todas las personas
**Antes de actualizar:** si está disponible la bandeja de notificaciones `efg_notifications`, enviar una comunicación por destinatario (lectura no es aceptación). Para cuentas inactivas, la notificación se verá al volver a abrir la app; un aviso por correo requerirá canal permitido, consentimiento/base legal y supervisión del envío. No afirmar entrega instantánea a todos los dispositivos; no mandar ahora.
**Al confirmar el aviso:** botón «Entendido, cerrar sesión» → comprobar que no queden cambios locales sin guardar → guardar ACK de aviso en servidor (separado de consentimiento legal) → invocar cierre de sesión propio `supabase.auth.signOut({scope:'global'})` **después** de validar el flujo. Si falla, no afirmar cierre; permitir reintento o salida segura.
**Al volver a iniciar sesión con OTP:** verificar identidad y versión actual en servidor → pantalla de Términos/Política (casillas sin pre-marcar) → aceptación del servidor por persona, hash/versión/fecha → permisos de Coach/Alumno/Personal según el rol. Nunca considerar «leído» como firma.
**Después:** pantalla editorial «Novedades de EFG Nutrition Pro», ilustraciones/íconos y explicación real, con botón «Comenzar». En actualizaciones menores: novedades sin forzar otra firma, salvo modificación contractual material, ni cierre obligatorio. Guardar que el usuario vio versión para no repetir continuamente.
**Importante Supabase Auth:** `signOut({scope:'global'})` revoca refresh tokens de la propia cuenta; JWT antiguos pueden seguir vigentes hasta expirar. Un backend que deba bloquear acceso inmediatamente verificará el estado de sesión/versión y RLS/RPC. Cerrar sesión en el navegador no sustituye ese control. Probar con varios dispositivos.

### Condiciones de bloqueo y orden de trabajo interno
- Preparar PR #33 con Work, #35 catálogo, #34 Coach/legal y #36 patrones en ramas independientes. Integrar de forma secuencial **en una rama candidata** y correr nuevamente QA/CI, sin merges a la rama productiva.
- Todavía **no existe staging Supabase** (`list_branches=[]` al 29/10): no ejecutar migraciones ni configurar cierre masivo hasta contar con entorno aislado y backup restaurado, y sin autorizar ningún costo nuevo.
- Falta texto legal definitivo y revisión jurídica; faltar estos puntos impide activar consentimiento obligatorio.
- Semáforo/motor dietético documentados pero no implementados ni clínicamente validados; condición explícita del propietario: **sin ellos no hay publicación**.
- Comunicación previa no se logra mágicamente sin que el usuario abra la app, o un canal preexistente de correo/push; debe probarse primero. No usar cierre masivo como sustituto de consentimiento.
- No activar cualquier cambio de Auth, RLS, correos masivos, sesión o políticas de facturación en producción sin autorización final específica.

**ESTADO:** CONGELADO PARA PUBLICACIÓN. Solo desarrollo y QA aislados. No existe autorización de merge/despliegue/SQL, ni de cerrar sesiones reales, ni de enviar mensajes reales.

## Verificación post despliegue (sólo si autorizada)
Registrar SHA/URL `live` de Render; validar vista y PWA cache/version, login OTP, apertura/cierre sesión, roles alumno/coach/admin, diarios, pagos, chats, notificaciones, favoritos y mensajes, revisión móvil. Ante incidente, no borrar datos ni improvisar SQL; documentar rollback del **código** y analizar migración por separado.

**Este archivo no autoriza automáticamente merge, SQL, uso de service_role ni deploy.**
