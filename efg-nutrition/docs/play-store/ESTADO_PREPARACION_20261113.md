# Google Play — estado de preparación técnica

13/11/2026. Trabajo en PR #123; sin merge ni despliegue. La cuenta de desarrollador
se creará al final por decisión de Edu. El usuario no necesita abrirla para estas pruebas.

## Comprobado

- Compilación APK debug y AAB sin firmar aprobada; API objetivo 36.
- Lint termina sin errores. Quedan 3 avisos: reglas de extracción de datos y formato/densidad del icono provisional.
- 12 pruebas unitarias de recepción de solicitudes y exportación de privacidad aprobadas.
- Prueba PostgreSQL 17/RLS aprobada: usuario propio, denegación de usuario ajeno/anónimo,
  rechazo de duplicados y prohibición de editar/borrar/truncar solicitudes desde clientes.
- Browser QA móvil/escritorio aprobada con cuentas ficticias: OTP, confirmación,
  constancia persistida, fallo de servidor y cierre de sesión. Sin desbordamiento horizontal.
- Captura real de la pantalla de eliminación preparada para revisión visual.
- Responsable, correo y domicilio públicos confirmados por Edu e incorporados al borrador.
- Borrado de un alumno ficticio aprobado con Auth, PostgREST y Storage locales reales: ver BORRADO_ALUMNOS_QA_20261113.md.

## Lectura específica de la configuración actual (sin datos de alumnos)

Se consultaron únicamente los documentos legales vigentes y metadatos de claves
foráneas; no se leyeron historiales, mensajes ni pagos de personas reales.
Proyecto confirmado por coincidencia de la URL usada por el cliente: EFG Nutrition,
región sa-east-1. Esto identifica el backend; no prueba por sí solo todos los
proveedores o transferencias de información.

Los avisos vigentes son pilot_20261102_v1 (alumno) y
professional_pilot_20261107_v1 (profesional). Ambos se refieren al piloto privado.
No ofrecen todavía una política pública completa con responsable/contacto y
plazos de retención definidos para el lanzamiento. No se reemplazaron ni se
alteraron aceptaciones existentes.

El exportador público ya preparado debe usarse sobre la futura versión completa.
No convierte un aviso de piloto en una política suficiente para distribución pública.

## Borrado: avance y alcance pendiente

Hay referencias a auth.users sin ON DELETE CASCADE en mensajes, informes por
período, pagos, organizaciones, invitaciones, aprobaciones de objetivos, planes
y accesos publicados. Por tanto, borrar solamente Auth puede fallar o dejar sin
resolver información asociada. Hay además archivos de Storage que no desaparecen
por borrar una fila de usuario.

Se implementó y probó el procedimiento para alumnos elegibles con cuentas
sintéticas y servicios locales reales. No se borró ninguna cuenta real ni se
aplicó el candidato al proyecto alojado. Los casos con pagos o responsabilidades
profesionales se detienen para resolución manual; falta completar su tratamiento
y las pruebas de paridad con toda la configuración alojada.
La página nueva recibe pedidos pendientes y lo indica expresamente; no afirma
que solicitar sea equivalente a haber eliminado todos los datos.

## Última prueba de arranque Android

El APK se instaló correctamente, pero el primer arranque volvió al launcher.
El logcat completo identificó la causa exacta:
`IllegalArgumentException: Component class com.google.androidbrowserhelper.trusted.ManageDataLauncherActivity does not exist`.
La biblioteca intenta registrar el acceso a configuración al abrir; ese componente
no estaba declarado en el manifiesto mínimo. Se agregaron ManageDataLauncherActivity
y FocusActivity conforme al ejemplo oficial.

Verificación posterior APROBADA:
https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/43476247904
Los cuatro jobs pasaron: compilación/lint, PostgreSQL/RLS, browser de privacidad
y arranque en emulador Android 16 hasta el formulario real de acceso.

La captura muestra una Custom Tab con barra del navegador, que es el fallback
esperado mientras no se publique Digital Asset Links con la firma real. No
se declara validada la experiencia final sin barra. No se inició sesión ni
se probaron aún los flujos autenticados de alumnos, coaches y administrador.

APK debug de prueba 0.1.0 generado y disponible para Edu:
SHA-256: bce8921c98fed49615bf976e82bf4b3c0dfadb964153d420229e03d5f8c78de4.
El AAB permanece sin firmar y no puede enviarse todavía a Google Play.

Historial/evidencias: PR #123 y workflow NCC Android build. Consultar la ejecución
del commit que modifica emulator-smoke.py para su resultado, no una prueba anterior.

## Próximas puertas

1. Completar pruebas autenticadas por rol en Android; la apertura ya está verificada.
2. Extender la tramitación a coaches/doble rol y pagos; validar paridad de configuración y restauración. El circuito básico de alumnos ya pasó la prueba local completa.
3. Cerrar conservación/respaldos y transferencias de la política; resolver distribución de pagos en Android y ficha de tienda. Identidad/contacto del responsable ya completos.
4. Aprobar icono/capturas; crear cuenta Play, configurar firma y asociación de dominio.
5. Completar pruebas exigidas por la cuenta y solicitar revisión con GO final de Edu.
