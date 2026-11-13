# Modelo comercial aprobado — Google Play
Fecha: 13/11/2026. Última decisión: alumno con pago único y paquetes al precio mensual publicado por Everfit.

## Decisión vigente
Una sola aplicación, con descarga gratuita y compras dentro de Google Play.
El alumno paga US$10 por única vez para activar su acceso; no paga mensualidad
a la plataforma. El importe mantiene la referencia de pago único de esta conversación.
La autorización de cuentas y roles se conserva en el servidor; elegir una pantalla
no concede permisos. Un alumno necesita además vinculación/habilitación del coach;
explicar este requisito antes de cobrar y evitar compras sin acceso utilizable.

El coach autorizado compra una activación de US$10 por única vez mediante Google
Play Billing. Es un producto no consumible, vinculado a la cuenta de la plataforma
y verificable/restaurable; no se cobra nuevamente por reinstalar. Precio de
referencia en USD, sujeto a configuración territorial, moneda e impuestos de Play.
No equivale a US$10 netos para el desarrollador.

El coach contrata paquetes mensuales de capacidad para alumnos mediante Google Play.
La capacidad es por alumnos activos, no un cobro por cada nueva invitación.
Paquetes seleccionados, con referencia en los precios de Everfit consultados:
| Alumnos activos máximos | USD/mes |
|---|---:|
| 10 | 29 |
| 20 | 49 |
| 50 | 95 |
Son alternativas de capacidad total, no paquetes acumulables.
Quedan pendientes: cupos incluidos en la activación, renovación y reglas de
cambio/cancelación de paquete. Las condiciones se mostrarán antes de contratar.
Los importes son referencias USD; no representan netos después de comisiones/impuestos.
No crear productos facturables hasta definir esas condiciones.
La activación única no implica que los paquetes sean gratuitos o permanentes.

Administradores y coaches dispondrán de mensajería interna para soporte,
habilitaciones y gestión. Los cobros de la plataforma al coach irán por Google
Play; no usar mensajes, alias ni comprobantes para sustituir ese circuito.

## Sustituye propuestas anteriores
Esta decisión reemplaza el acceso gratuito del alumno, los precios sugeridos
US$15/25/45 mensuales, la descarga paga de US$10 para ambos roles y la propuesta
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
- Asociar la activación del alumno a su cuenta; restaurarla sin volver a cobrar.
- Definir el tratamiento de doble rol y cuentas piloto existentes antes de cobrar.
  No inferir que un pago de coach cubre alumno ni cobrar ambos automáticamente.
  Separar permisos profesionales y de alumno para que una suscripción vencida
  no revoque por sí sola una activación de alumno vigente.
- Aplicar capacidad en servidor en altas/invitaciones/activación; impedir que una
  actualización de página o llamadas directas eludan el límite.
- No borrar alumnos ni historiales por vencimiento o reducción de un paquete.
  Definir estados y comunicación antes de implementar esas reglas.
- Revisar rutas existentes de licencia/alias/comprobantes en Android. No quitar
  cobros de la web ni modificar cuentas existentes por efecto de esta decisión.
- Mostrar claramente en la ficha y pantallas: descarga gratuita, activaciones
  de alumno/coach de pago único y paquetes mensuales adicionales del coach.
- Obtener aprobación visual de capturas reales antes de publicar cambios de UI.

## Criterios mínimos de aceptación
Alumno activado no recibe cargos mensuales ni vuelve a pagar por reinstalar.
Alumno sin activación no accede a funciones pagas por modificar el cliente.
Coach sin autorización no obtiene rol al pagar.
Coach autorizado puede completar activación única y restaurarla sin nuevo cargo.
Compra pendiente/rechazada no concede permisos; repetición no duplica cupos.
Reembolso/revocación actualiza permisos profesionales sin borrar registros.
La política de doble rol y cuentas piloto se define antes de cobrar.
Cupos concurrentes se validan en servidor.
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

Referencia comercial consultada el 13/11/2026:
https://everfit.io/pricing/ (facturación mensual: 10 US$29, 20 US$49, 50 US$95).
