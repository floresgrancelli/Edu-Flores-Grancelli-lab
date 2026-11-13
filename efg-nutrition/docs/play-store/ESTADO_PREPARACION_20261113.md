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

## Por qué falta verificar el borrado real

Hay referencias a auth.users sin ON DELETE CASCADE en mensajes, informes por
período, pagos, organizaciones, invitaciones, aprobaciones de objetivos, planes
y accesos publicados. Por tanto, borrar solamente Auth puede fallar o dejar sin
resolver información asociada. Hay además archivos de Storage que no desaparecen
por borrar una fila de usuario.

Se debe diferenciar la información personal del titular de los datos de alumnos
vinculados a un coach. Primero hace falta definir tratamiento/retención y probar
el procedimiento completo con cuentas sintéticas. No se borró ninguna cuenta real.
La página nueva recibe pedidos pendientes y lo indica expresamente; no afirma
que solicitar sea equivalente a haber eliminado todos los datos.

## Última prueba de arranque Android

El APK se instala correctamente en el emulador Android 16, pero el primer intento
de apertura regresó al launcher sin mostrar el formulario. Se conservan capturas
y se ajustó la prueba para usar la acción MAIN/CATEGORY_LAUNCHER/NEW_TASK que usa
un acceso desde el icono. La siguiente ejecución guarda también logcat para
distinguir fallo de arranque real de una invocación incorrecta de la prueba.
No dar por aprobada la apertura solo porque compiló o se instaló.

Historial/evidencias: PR #123 y workflow NCC Android build. Consultar la ejecución
del commit que modifica emulator-smoke.py para su resultado, no una prueba anterior.

## Próximas puertas

1. Resolver y verificar apertura en Android; después, pruebas autenticadas por rol.
2. Definir e implementar la tramitación y eliminación completa con prueba sintética.
3. Completar/publicar privacidad y contacto, revisar pagos y ficha de tienda.
4. Aprobar icono/capturas; crear cuenta Play, configurar firma y asociación de dominio.
5. Completar pruebas exigidas por la cuenta y solicitar revisión con GO final de Edu.
