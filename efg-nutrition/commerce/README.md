# Accesos, cupos y cortesías — candidata de servidor

Preparación del 13/11/2026. **No activada en la aplicación publicada.**

## Reglas implementadas en el módulo

- Activación única de alumno y coach: referencia US$10 cada una.
- Suscripciones de capacidad total, alternativas: 10 / US$29, 20 / US$49,
  50 / US$95 por mes. Capacidad de suscripción y cortesía no se suman: se usa
  el máximo vigente. Los precios locales se obtendrán de Google, no del módulo.
- Prueba gratuita con código: siete días para un coach y un alumno. Al canjear,
  el coach recibe un código secundario para ese alumno. El alumno comparte la
  fecha final del coach aunque ingrese más tarde. No cobra ni inicia suscripción.
- Cortesía de alumno: activación por plazo elegido o sin vencimiento.
- Cortesía de coach: activación y cupos definidos por administrador, por plazo
  elegido o sin vencimiento. Las cortesías no se venden por fuera de Play.
- Códigos aleatorios de 192 bits, un uso, vencimiento de canje y destinatario
  opcional. Solo se guarda SHA-256 del código; no imprimirlo en logs/analíticas.
- Solo un administrador autenticado emite/revoca códigos sin canjear. Roles
  y habilitación se consultan en servidor, nunca se conceden por pagar.
- Una prueba por cuenta, sin extensión por canjear otros códigos. No impide por
  sí solo abuso con cuentas múltiples: implementar controles antes del piloto.
- Verificación de compra mediante adaptador de servidor. Pagos pendientes no
  conceden permisos; capacidad sin activación de coach no permite altas.
- Compra repetida no duplica cupos. Cambio vinculado sustituye la capacidad;
  el token sustituido no puede reactivarse con una notificación retrasada.
- Cancelación mantiene acceso hasta vencimiento pagado; grace period verificado
  lo conserva, hold/pause/expiry lo quitan. Reembolsos se procesan al sincronizar.
- Altas y canjes requieren transacción serializable. Archivar libera capacidad,
  sin eliminar activaciones ni vínculos históricos. Exceso por reducción no borra
  registros; bloquea nuevas altas hasta resolverlo.

## Contratos y límites reales

`access-service.mjs` contiene reglas ejecutables, sin dependencia de UI. No es un
endpoint, no está importado por el piloto y no implementa almacenamiento productivo.
`actorId` debe provenir de Auth verificado en servidor, nunca del cuerpo HTTP.
`repo.transaction` debe implementar persistencia durable, exclusión entre procesos,
rollback y restricciones únicas. El adaptador en tests es solo memoria: sus pruebas
de concurrencia verifican el contrato serializado, no PostgreSQL real ni RLS.
El estado no se envía al navegador. No conectar este modelo mediante JSON público.

El adaptador `verifyPlay(token)` aún no está construido. Debe consultar Google
Developer API, comprobar paquete/producto/estado, normalizar el estado y resolver
el usuario desde `obfuscatedAccountId` generado por servidor. Nunca confiar en el
ID/estado/capacidad enviados por Android. Los productos aún no existen en Play.
Para suscripciones devolver `ACTIVE`, `IN_GRACE_PERIOD`, `CANCELED`, `ON_HOLD`,
`PAUSED`, `EXPIRED` o `PENDING` según la respuesta canónica, con `expiresAt`.
Para compras únicas devolver `PURCHASED` únicamente si completadas y no revocadas.
Fallos de API no se convierten en compra exitosa. Las compras rechazadas requieren
reembolso/revocación explícita por el adaptador, no solo mostrar un error.

`acknowledgeRequired` **no confirma una compra en Google**. La integración debe
persistir trabajo de confirmación idempotente en la misma transacción, guardar el
token de forma privada adecuada, confirmar con Google y reintentar antes del plazo.
Actualmente el módulo conserva solo el hash del token; no sustituye una outbox.
RTDN requiere autenticación y consulta posterior a la API, nunca aplicar el mensaje
directamente. Agregar conciliación programada de vencimientos y compras revocadas.
El acceso se evalúa por reloj del servidor, incluso sin recibir RTDN de vencimiento.

Antes de producción faltan adaptadores reales Auth/DB/Google, migraciones privadas
y RLS, endpoints con rate limits, integración Android TWA/Billing, recuperación de
códigos perdidos y revocación de cortesías ya canjeadas. La vinculación de un alumno
debe usar el consentimiento/invitación existentes; la función de dominio no los
reemplaza. Verificar pertenencia y aplicar el control en todas las rutas actuales.

El permiso individual de alumno es independiente de la relación de coaching:
`student: true` no autoriza acceso a datos de otra persona ni implica un vínculo
vigente. Integrar ambas condiciones con la seguridad y los consentimientos actuales.
Al expirar una prueba se conserva el historial; el alcance de lectura/escritura de
cuentas sin pago y de coaches excedidos necesita definir una UX antes de activar.
No se decide aún el tratamiento comercial del doble rol ni de cuentas del piloto.
Sin configuración productiva el módulo permanece desconectado: no cobra ni cambia
permisos de usuarios actuales.

## Verificación realizada

Ejecutar desde la raíz del repositorio:

```sh
node --test efg-nutrition/commerce/tests/access-service.test.mjs
```

Los tests usan identidades y compras simuladas; no prueban Google Play ni realizan
cobros. Cubren caducidad compartida, códigos concurrentes, cortesías, roles,
restauración lógica sin duplicados, estados de pago, renovación, cambio/reducción
de paquete y altas concurrentes con límite. Pruebas reales de Play pendientes
hasta crear Console, productos, firma y credenciales.

Fuentes oficiales:
https://developer.android.com/google/play/billing/security
https://developer.android.com/google/play/billing/lifecycle/subscriptions
https://support.google.com/googleplay/android-developer/answer/6321495
