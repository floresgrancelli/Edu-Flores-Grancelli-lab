# Doble espacio R4: candidata de integración, no habilitación

Esta candidata se prepara sobre `9aaddfe21d77302224f93ea82be3b215c86769d6` y es independiente del PR63. La bandera de doble espacio permanece apagada. No incluye ni aplica migraciones, cambios de RLS, grants, credenciales o configuración de servicios. No debe fusionarse ni desplegarse como habilitación de coaches.

## Objetivo

Un administrador podrá preparar un coach de pruebas con cupo configurable. Una cuenta que ya es alumna debe conservar su rol, organización, mentor, consentimiento e historial personal y seleccionar un espacio profesional separado. El cupo se calcula con alumnos activos más invitaciones pendientes.

## Diferencia frente a R3

R3 probó una interfaz independiente. R4 inserta el panel en el `frame()` de la aplicación completa, manteniendo la identidad y el estado personal. La selección se vincula al usuario, sesión y época de autenticación. El contenido personal queda oculto e inerte durante el espacio profesional; salir de la cuenta sigue disponible. No se reutilizan handlers clínicos legacy para dar acceso a una alumna con capacidad profesional.

El alta sintética de una cuenta sin perfil prueba el claim candidato después de verificar identidad. Un coach candidato se mantiene en un área restringida y no carga las rutas clínicas legacy. Si el servidor no devuelve un contexto profesional inequívoco, el ensayo falla cerrado, también después de revocación y nueva sesión. Esto no crea cuentas Auth ni envía OTP reales.

Se corrigió un defecto del formulario real: `FormData` se construía después de deshabilitar los campos y no incluía sus valores. La captura ahora ocurre antes del bloqueo de la operación.

## Integridad de los assets

Los controles heredados detectaron inicialmente que el manifiesto R12 ya no correspondía a los archivos modificados. Se regeneró el manifiesto de assets de R4 con hashes reales y versiones de módulos nuevas, conservando la identidad de release, los flags y todos los assets históricos. Una revisión independiente verificó todos sus hashes y que los validadores conservan sus comprobaciones. Los negativos rechazan alteraciones de assets, manifiesto, flags y build; actualizar el manifiesto de una candidata no autoriza una publicación. El generador local está incluido para reproducir esa preparación sin red ni servicios.

La suite del cliente pasó 70 pruebas Node después de esta integración. Las regresiones locales de sesión y restricciones privadas también pasaron. El agregado local disponible pasó 43 scripts; 83 entradas del workflow no estaban en la copia local y otra necesitaba una dependencia no disponible. Eso no equivale a un pase global del repositorio. La CI con checkout completo y las pruebas de navegador se verifican por separado.

## Ensayos de servidor separados

Se inspeccionó únicamente estructura autorizada, nunca filas personales. La captura se conservó privada y no forma parte de este PR ni de sus artefactos de CI. En memoria se reconstruyó un núcleo de cinco tablas, catorce funciones y sus controles capturados. Dos dependencias auxiliares proceden de estructuras históricas expresamente delimitadas; no se afirma paridad completa con la base actual.

- R4 original: 118 verificaciones con brechas confirmadas.
- Propuesta local R4.1: 129 verificaciones con brechas confirmadas. Su corrección permite conservar una invitación de alumna ya utilizada únicamente cuando identidad, rol y organización coinciden con el vínculo original. Invitaciones abiertas o de otra identidad u organización siguen rechazadas.
- El claim de alumno convierte la reserva en ocupación activa sin contar dos cupos y crea acceso al plan pendiente. No reescribe el vínculo ni un plan personal ya publicado.
- Los ensayos se ejecutaron con PGlite 0.3.14/PostgreSQL 17.5 en memoria y datos ficticios. No prueban JWT hospedado, PostgREST ni concurrencia multisesión del esquema capturado. El ensayo Auth concurrente de R3 usaba otro modelo sintético y no se presenta como prueba equivalente.

## Bloqueos de habilitación

1. **Revocación no unificada.** Las rutas candidatas pueden negar el acceso después de revocar la capacidad mientras rutas legacy conservan metadatos. En una cuenta nueva con rol coach, también pueden conservar acceso y operaciones profesionales. Ocultar la interfaz no reemplaza el control del servidor. No se modificaron políticas para ocultar este hallazgo.
2. **Doble rol aún no cubierto por operaciones legacy.** Las operaciones profesionales existentes que exigen rol coach no aceptan una cuenta que mantiene su rol student. No se deben resolver promoviendo o trasladando el perfil de la alumna.
3. **Privilegios heredados.** El ensayo reproduce que los defaults otorgan EXECUTE a service_role en nuevas funciones públicas aunque anon y authenticated estén revocados. No se afirma que todos los roles carezcan de permisos.
4. **Documentos profesionales de prueba.** Los términos del fixture son ficticios. No sustituyen la aceptación profesional real ni el consentimiento de seguimiento de cada alumno.
5. **Clínica cerrada.** Fichas, guías, mensajes y pagos profesionales no quedan habilitados por este cambio. Se requiere integrar y verificar todas las rutas relevantes antes de plantear una habilitación.

## CI de interfaz

El harness ejecuta el `pilot.js` completo con SDK ficticio del mismo origen y datos en RAM. Solo sirve por loopback, activa la bandera únicamente en las respuestas del fixture, bloquea las solicitudes externas y no usa Supabase real. Imágenes y fuentes remotas se sustituyen por placeholders; esto no certifica paridad de esos recursos.

La ejecución local de navegador estaba bloqueada por el entorno. No se eludió esa restricción. El PR separado permite ejecutar Chromium/WebKit en runners estándar ya autorizados, sin secretos, permisos de escritura, deploy ni servicios pagos. Los resultados deben verificarse para el SHA final antes de presentar un pase.

La candidata mantiene la función apagada. Un resultado satisfactorio de UI no elimina los bloqueos del servidor listados arriba.

## Ajustes de fixtures heredados

El primer ensayo dedicado de R4 pasó en Chromium y WebKit. La CI heredada detectó dos incompatibilidades de sus propios fixtures: un contrato exigía que la limpieza de PDF fuese la primera instrucción de reset y otro servidor no asignaba MIME JavaScript a archivos `.mjs`. Se actualizó el primero para ejecutar el reset real y exigir tanto la invalidación dual como la limpieza anterior, con negativos. El segundo conserva su aislamiento y agrega únicamente `.mjs: text/javascript`; tres pruebas detectan la regresión si se retira. Estos ajustes no modifican código funcional, assets ni permisos. El SHA final debe volver a completar CI.

La auditoría posterior cubrió los 20 scripts activos del workflow Visual y 14 dependencias locales con fuentes remotas verificadas. Detectó un segundo mapa MIME sin `.mjs` en el fixture de privacidad; se añadió solo esa entrada y el test de callback real también lo cubre con una regresión negativa. Los demás servidores activos ya admitían módulos. Las pruebas de aplicación no se modificaron para ocultar el fallo.
