# Modelo comercial aprobado — Google Play
Fecha: 13/11/2026. Confirmado por Edu: «Exacto».

## Decisión vigente
Una sola aplicación, con descarga gratuita. El alumno no paga por descargar,
activar su cuenta ni vincularse con un coach. La autorización de cuentas y roles
se conserva en el servidor; elegir una pantalla no concede permisos.

El coach autorizado compra una activación de US$10 por única vez mediante Google
Play Billing. Es un producto no consumible, vinculado a la cuenta de la plataforma
y verificable/restaurable; no se cobra nuevamente por reinstalar. Precio de
referencia en USD, sujeto a configuración territorial, moneda e impuestos de Play.
No equivale a US$10 netos para el desarrollador.

El coach compra paquetes de capacidad para alumnos mediante Google Play.
Los tamaños 10/20/50 son propuestas, no precios ni catálogo aprobados.
Quedan pendientes: precio de cada paquete, duración (compra permanente o
suscripción), cupos incluidos en la activación y reglas de cambio de paquete.
No crear productos facturables hasta definir esas condiciones.
La activación única no implica que los paquetes sean gratuitos o permanentes.

Administradores y coaches dispondrán de mensajería interna para soporte,
habilitaciones y gestión. Los cobros de la plataforma al coach irán por Google
Play; no usar mensajes, alias ni comprobantes para sustituir ese circuito.

## Sustituye propuestas anteriores
Esta decisión reemplaza la descarga paga de US$10 para ambos roles y la propuesta
de cobrar por fuera las licencias/cupos del coach. El análisis de excepciones
y respaldos en PAGOS_Y_RESPALDOS_20261113.md conserva valor como antecedente,
pero su propuesta de Android sin compras ya no es la opción seleccionada.
No decide ni autoriza nuevos pagos entre alumnos y coaches.

## Preparación técnica necesaria
La candidata actual usa Android Browser Helper / TWA y aún no implementa Billing.
No alcanza con agregar un botón o importar BillingClient: diseñar el recorrido
Android y su comunicación segura con la cuenta web antes de habilitar compras.
No exponer un puente WebView general a contenido remoto.

- Autenticar y comprobar rol autorizado antes de ofrecer activación/paquetes.
- Verificar purchaseToken en servidor con Google Play Developer API y comprobar
  paquete, producto, estado PURCHASED, titular esperado y ausencia de reutilización.
- Guardar la asignación de compra/cuenta de forma idempotente, confirmar compras
  y gestionar restauración, reembolsos, revocaciones y notificaciones de Play.
- No habilitar funciones por respuesta del cliente ni por compra PENDING.
- Mantener acceso gratuito del alumno también en cuentas de doble rol; las compras
  corresponden a la capacidad profesional y no bloquean su acceso como alumno.
- Aplicar capacidad en servidor en altas/invitaciones/activación; impedir que una
  actualización de página o llamadas directas eludan el límite.
- No borrar alumnos ni historiales por vencimiento o reducción de un paquete.
  Definir estados y comunicación antes de implementar esas reglas.
- Revisar rutas existentes de licencia/alias/comprobantes en Android. No quitar
  cobros de la web ni modificar cuentas existentes por efecto de esta decisión.
- Mostrar claramente en la ficha y pantallas: instalación/alumno gratuitos,
  activación profesional paga y cargos adicionales por capacidad.
- Obtener aprobación visual de capturas reales antes de publicar cambios de UI.

## Criterios mínimos de aceptación
Alumno accede sin abrir cobro. Coach sin autorización no obtiene rol al pagar.
Coach autorizado puede completar activación única y restaurarla sin nuevo cargo.
Compra pendiente/rechazada no concede permisos; repetición no duplica cupos.
Reembolso/revocación actualiza permisos profesionales sin borrar registros.
Doble rol conserva acceso de alumno. Cupos concurrentes se validan en servidor.
Pruebas con productos de prueba de Play antes del release; sin cobros reales en QA.

## Estado y límites
Documento de requisitos guardado en la candidata, no implementación de pagos.
No se crearon productos, credenciales, cargos ni suscripciones. No se cambió la
aplicación publicada. Play Console se creará cuando la preparación lo requiera,
según la preferencia de Edu. Merge/despliegue requieren GO final.

Fuentes oficiales consultadas:
https://support.google.com/googleplay/android-developer/answer/1153481
https://support.google.com/googleplay/android-developer/answer/6334373
https://developer.android.com/google/play/billing/backend
https://developer.android.com/google/play/billing/security
