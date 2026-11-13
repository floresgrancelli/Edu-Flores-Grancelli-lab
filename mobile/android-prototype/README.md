# Android · prototipo aislado 0.1.0

Primer destino: Google Play. iPhone continúa usando la web; App Store queda para una etapa posterior. Sin cambios en la web publicada.

Este prototipo NO es la app real lista para distribuir: ejecuta la interfaz aprobada con el adaptador RAM ficticio existente. El código de producción y su subárbol se mantienen exactos a PR122. Se transforman solo los recursos generados e ignorados de este proyecto. No se modifica la base alojada.

## Preparación reproducible

Con Node22+ y Java21 para Android:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:web
npm run android:create
npm run check
```

El wrapper se genera desde Capacitor8.6.2 fijado por lockfile. Para compilar se necesitan Android SDK36, build-tools36.0.0 y las dependencias que descarga Gradle:

```sh
cd android
./gradlew --no-daemon assembleDebug
```

El workflow puntual `NCC isolated Android prototype` compila el APK debug e inspecciona su identidad y permisos reales. Otro job revisa la copia exacta de recursos sincronizada al proyecto Android en Chromium320/390. Esto no equivale a ejecutar el APK en Android WebView ni en teléfonos físicos.

## Límites deliberados

- Identidad provisional `com.nutricionconciencia.prototype`, nombre `NCC PRUEBA FICTICIA`. No reservar este ID como identidad final de tienda. Icono técnico generado por Capacitor, pendiente de sustituir por el aprobado al preparar la presentación real.
- No hay `server.url`, enlaces a producción ni SDK remoto de autenticación. Se elimina el permiso INTERNET del manifest Android y se verifica también el APK resultante. CSP bloquea conexiones y envío de formularios. Los controles de entrada dicen explícitamente que son datos ficticios y no ofrecen ingresar un correo real.
- Se reutilizan el adaptador RAM y controles de ensayo existentes; los registros de prueba se guardan solo en la sesión local ficticia. No certifica OTP, Auth/RLS, pagos, PDF ni subida de fotos contra el servidor.
- No se integran push, HealthKit, Health Connect ni pagos nativos. No hay AAB firmado ni claves de publicación. No se abrieron cuentas pagas ni se habilitaron servicios pagos.
- No instalar con intención de usar cuentas reales: ese modo todavía no existe aquí. No distribuir como la aplicación definitiva.

Próximos pasos: probar el APK en emulador/dispositivo, conservar las capturas reales, preparar configuración alojada de manera controlada y resolver las brechas de eliminación de cuenta, privacidad/declaración de salud y clasificación de cobros antes de enviar a Play. Cualquier cambio visual se muestra antes de publicación.
