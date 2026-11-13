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

## Códigos y cupos — preparación autorizada posterior
Edu pidió preparar prueba gratuita de siete días para coach y un alumno vinculado,
y cortesías para conocidos que también puedan incluir cupos gratuitos del coach.
La prueba no cobra activaciones ni suscripción; al finalizar se requiere compra
expresa en Google Play para continuar. No genera cobro automático por canjear código.

La candidata incorpora commerce/access-service.mjs, su contrato de integración y
14 pruebas Node aprobadas localmente (compras simuladas, sin Google ni base real).
Incluye códigos aleatorios de un uso, vencimiento, destinatario opcional,
siete días compartidos, cortesía temporal/permanente y cupos por transacción.
El paquete verificado de 20 asigna 20 cupos automáticamente, sin intervención del
administrador; una repetición no suma otros 20. Solo administrador puede emitir
cortesías. Paquetes y cortesías son capacidades alternativas, no acumulables.
Se conservan registros al expirar o archivar.

Faltan persistencia productiva/seguridad, integración con invitaciones y roles
actuales, Google API/Billing/RTDN y confirmación de compras, endpoints y panel.
El contrato marca estos bloqueos; no presentar el módulo como cobros ya operativos.
No se creó ningún código real ni se cambiaron permisos de usuarios existentes.

## Transferencias alumno–coach — decisión de simplificación
Edu autoriza retirar el circuito de transferencias alumno–coach para la versión
Android de Google Play, conservando la comunicación interna y el seguimiento.
Los acuerdos profesionales se gestionan entre ellos fuera del circuito de cobro
de la plataforma. No convertir la mensajería en un flujo alternativo para vender
funciones digitales; esta decisión no declara exentos todos los servicios del coach.

Alcance de implementación revisado en pilot/pilot.js:
- Retirar «Pagar a mi coach», alias/copiar alias, importe/período, carga y envío de
  comprobantes, estados/aprobación/rechazo y el acceso «Mis pagos» del alumno.
- Retirar del coach configuración de alias de alumnos y bandeja de comprobantes.
- Bloquear también manejadores de acciones y rutas alternativas de la interfaz,
  no solo esconder formularios con CSS. No cargar datos de cobro innecesarios.
- Conservar mensajes, archivos propios de comunicación permitidos, invitaciones,
  fichas, planes e informes. No borrar registros financieros ni recibos históricos.
- Activación y paquetes de nuestra plataforma conservan el circuito Google Play.
  Tampoco se ofrecerá transferencia a EFG como alternativa en la distribución Play.
- No modificar por esta decisión la web publicada para iPhone ni los datos
  existentes. Preparar la separación de distribución y verificar su recorrido.
- Mostrar captura real antes de publicar cualquier cambio visual.

Revisión de fuentes realizada; todavía no se aplicó el retiro en pilot.js.
La variante TWA actual apunta al piloto web compartido: no basta detectar Android
por user-agent ni un parámetro de URL para afirmar que ya está aislado el canal.
Falta implementar esa separación junto con la integración de Billing.
