# Nutrición Con-Ciencia — Android, etapa 1

Base técnica de prueba, NO lista para enviar a producción.
Origen de código web revisado: bd6efa0d767436c6d06155eb83b89a9b37540287 (13/11/2026).

## Decisión
Trusted Web Activity con android-browser-helper oficial. Abre la app existente
en https://efg-nutrition.onrender.com/pilot/ y utiliza su mismo backend,
autenticación y permisos. No replica bases de datos ni migra registros.
Requiere conexión. No agrega permisos nativos de cámara, almacenamiento,
actividad física ni notificaciones: los flujos web se deben probar en Android.
Si la asociación web no está validada, abre una Custom Tab con barra del navegador.

## Compilación
JDK 17, Gradle 8.11.1 y Android SDK 36. Desde esta carpeta:
`gradle --no-daemon :app:assembleDebug :app:bundleRelease :app:lintDebug`.
El workflow ncc-android-build genera un APK de depuración y un AAB SIN FIRMAR.
El APK es para pruebas; el AAB sin firmar no se puede presentar en Play Console.
No hay credenciales ni claves de publicación en el repositorio.
No se ejecuta ningún envío a Google Play ni despliegue de Render.

## Asociación de dominio pendiente
El identificador ar.com.nutricionconciencia.app es una propuesta: confirmar antes del primer envío.
Obtener el SHA-256 del certificado de FIRMA DE APP de Play App Signing
(no confundir con la clave de subida). Generar:
`python scripts/assetlinks.py --sha256 AA:... --output /ruta/assetlinks.json`.
Publicar en la RAÍZ del origen:
https://efg-nutrition.onrender.com/.well-known/assetlinks.json
(no dentro de /pilot/), mediante un cambio de hosting autorizado.
Si existe un archivo previo, combinar las asociaciones sin reemplazar otras apps.
Verificar respuesta HTTPS 200, JSON correcto y sin redirecciones.
Para pruebas debug se puede asociar otro certificado, retirándolo antes de producción.
No se publica un archivo con un certificado ficticio.

## Puertas antes de publicar
- Confirmar cuenta Play Console, titular, tipo de cuenta y verificación que corresponda.
- Confirmar identificador de paquete, país inicial y audiencia.
- Revisar privacidad vigente, consentimiento y tratamiento de datos de salud.
- Implementar/verificar solicitud de eliminación dentro y fuera de la app.
- Completar Seguridad de datos con evidencia de servicios y datos efectivamente utilizados.
- Declarar Nutrición y control de peso en la declaración de salud; revisar otras funciones.
- Revisar flujo de pagos de coach/alumnos frente a política de pagos antes de distribuir.
- Crear acceso de revisión de Google sin datos personales reales.
- Revisar icono y capturas con Edu; conservar aprobación visual antes de publicar.
- Firmar, verificar DAL con certificado real y probar instalación desde Google Play.
- Probar alumno, coach y admin; login/logout/recuperación, registro, fotos,
  PDFs, teclado, scroll, Atrás, enlaces externos, red interrumpida y reconexión.
- Completar pruebas requeridas según la cuenta y solicitar revisión.

## Fuentes oficiales
- https://developer.chrome.com/docs/android/trusted-web-activity/
- https://github.com/GoogleChrome/android-browser-helper
- https://developer.android.com/google/play/requirements/target-sdk
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/13634885
- https://support.google.com/googleplay/android-developer/answer/14738291
