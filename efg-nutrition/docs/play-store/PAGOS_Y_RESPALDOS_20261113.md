# Pagos y respaldos — preparación de Google Play

Revisión de código y fuentes oficiales, 13/11/2026. No cambia precios, funciones
publicadas, planes de proveedores ni crea servicios pagos.

## Pagos observados y decisión pendiente

| Flujo existente | Evidencia en el código | Tratamiento antes de distribuir en Play |
|---|---|---|
| Licencia del coach a EFG, asociada a cupos | license_fee_ars, platformAlias, efg_submit_coach_payment, efg_set_coach_plan | Tratar como acceso a software/funciones digitales; implementar facturación aplicable o una versión que no permita iniciar esas compras desde Android |
| Alumno a coach | payment_alias, efg_submit_payment, envío de comprobante | Clasificar el servicio realmente vendido. No suponer que toda nutrición o seguimiento asincrónico entra en la excepción de una sesión individual |
| Historial y revisión de comprobantes | efg_payments, recibos y estados | Distinguir consulta de historial de los botones/alias/instrucciones que facilitan una nueva compra |

Google incluye el acceso a software, funciones y suscripciones digitales entre
las compras que requieren su facturación, salvo excepciones/programas aplicables.
La excepción de servicios online 1:1 exige que el servicio sea entre dos personas
y que no quede disponible para reproducción posterior. El solo nombre «coach»
no basta para asignar esa excepción a planes, informes o contenido persistente.

Google admite una app de acceso a contenido/servicios ya adquiridos por otra vía.
Por costo y por la decisión de crear Play Console al final, la opción a revisar
para la primera versión es Android sin nuevas compras dentro de la app, conservando
cuentas, planes y registros. Esto requerirá una variante probada que no muestre
CTAs, alias ni rutas de compra/transferencia, y que no ejecute sus acciones por un
acceso alternativo de la propia interfaz. No alcanza con ocultar un botón por CSS.

Esta es una propuesta de distribución, no un cambio ya realizado o aprobado.
No se quitaron pagos de la web ni se asumió que el flujo actual está exento.
No publicar la ficha de tienda como gratuita si el acceso a funciones exige un
servicio pago sin explicar correctamente esa condición.

Fuentes:
https://support.google.com/googleplay/android-developer/answer/10281818
https://support.google.com/googleplay/android-developer/answer/9858738

## Respaldos y conservación: qué se pudo verificar

- El proyecto consultado es EFG Nutrition y está en sa-east-1. La respuesta de
  metadatos no informa su plan comercial ni una ventana efectiva de respaldos.
- La documentación de Supabase indica ventanas de respaldos diarios de 7 días
  para Pro, 14 para Team y hasta 30 para Enterprise, y recomienda exportaciones
  propias para proyectos gratuitos. No se asigna ninguna de esas ventanas al
  proyecto sin confirmar su configuración.
- Los respaldos de base de datos contienen metadatos de Storage, no los bytes
  de los objetos. Eliminar un archivo debe comprobarse por la API de Storage;
  borrar una fila o restaurar una base no constituye esa comprobación.

Antes de cerrar la política pública se debe confirmar el plan/configuración
efectivos, registros técnicos y cualquier copia operativa propia, documentando
finalidad, acceso y ventana real. No se modificó ninguna suscripción para investigar.

Una restauración debe ensayarse con acceso de usuarios suspendido hasta reaplicar
las eliminaciones realizadas después del respaldo. El expediente de borrado debe
conservar solo el mínimo necesario y durante una ventana justificada; no guardar
copias de fichas o mensajes completos para demostrar una eliminación.

Fuente:
https://supabase.com/docs/guides/platform/backups
