# Busco coach — preparación para personas sin entrenador

Solicitud de Edu, 13/11/2026. Se mantiene una sola aplicación. Esta preparación
no habilita una modalidad autónoma de nutrición ni reconstruye el piloto.

## Recorrido propuesto

En el ingreso: «Ya tengo coach», «Busco coach» y acceso profesional.
«Busco coach» abre un directorio consultable sin comprar activación.
Publicamos únicamente los profesionales que administración seleccione y que
acepten aparecer. Mostrar nombre profesional, enfoque, modalidad y ubicación
opcional, sin datos de otros alumnos ni datos privados de contacto.
No afirmar títulos/matrícula o verificación profesional sin evidencia real.

«Quiero contactarme» requiere una identidad verificada y consentimiento para esa
solicitud. Si aún no puede ingresar al piloto por falta de invitación, habilitar
un acceso limitado de consulta/contacto. Ese estado no concede un rol de alumno
activo, cupo, seguimiento ni permisos sobre alimentación o ficha.

El coach recibe una solicitud y puede iniciar una conversación limitada con la
persona. El interés inicial no crea el vínculo de seguimiento. Para incorporarla,
usar la invitación/aceptación actuales, validar disponibilidad de cupo en servidor
y aplicar la activación de alumno de US$10 o cortesía/prueba correspondiente.
El consentimiento sobre salud sigue siendo opcional y separado del contacto.
No enviar al coach ficha, restricciones, peso, dieta o historial por consultar.
Preservar datos y permisos existentes en cambios de coach.

Si no hay recomendaciones o capacidad, mostrar estado vacío real; no inventar
perfiles ni asignar contactos automáticamente. No enviar mensajes a personas
reales durante la preparación. Los pagos del servicio profesional no se ofrecen
en esta sección. No añadir transferencias, alias ni checkout de planes del coach.

La publicidad paga mencionada en conversaciones anteriores sigue como idea:
no cobrarla ni activarla en esta fase. Si después hubiera perfiles promocionados,
identificarlos claramente como «Patrocinado», sin presentarlos como recomendación
orgánica. El componente ya distingue esa etiqueta, sin venta de publicidad.

## Componentes preparados y validación

`coach-discovery.mjs` ofrece proyección pública por lista de campos, render del
directorio/estados y controlador de solicitud de contacto con adaptador inyectado.
No conserva correos/teléfonos ni incorpora datos clínicos o pagos al payload.
Reintentos de una solicitud usan el mismo requestId mientras vive el controlador;
la protección durable entre dispositivos y recargas debe aplicarla el servidor.
No anuncia éxito sin recibo persistido del endpoint y controla cambio de sesión.
Los atributos published/recommended/coachOptIn/enabled/acceptingRequests son una
proyección de servidor confiable: no leerlos de user_metadata ni permitir que un
coach se recomiende a sí mismo modificando su perfil público.

Ocho pruebas nuevas pasan localmente; 22 pruebas contando acceso/cupos/cortesías.
Se probaron filtros, whitelist de datos, escape HTML, estados vacíos, consentimiento,
identidad, duplicación concurrente, reintentos y respuesta tras cambio de cuenta.
La prueba utiliza perfiles inventados etiquetados como ejemplo; no lista coaches reales.

## Integración pendiente — bloquea activación

El piloto actual exige invitación/rol y sus mensajes limitan contactos ya
habilitados. No modificar esa seguridad para permitir chats indiscriminados.
Faltan el endpoint de directorio público sin PII privada, publicación/consentimiento
de coaches en Administración y la persistencia de solicitudes con unicidad por
persona/coach, rate limits, bloqueo y revocación, estados y notificaciones.
Crear conversaciones explícitamente autorizadas por la solicitud sin ampliar
acceso a datos nutricionales. Revalidar publicación y disponibilidad al solicitar.
La aceptación y reserva de cupo deben ser atómicas con el flujo actual, incluidas
las invitaciones pendientes que ya consumen cupo. El módulo de cupos aislado no
reproduce aún esa contabilidad del piloto; no activarlo sin integración.

También falta integrar en ingreso/estado sin coach, navegación de vuelta,
sesiones y panel, probar roles sin invitación y revisar las capturas reales con
Edu antes de publicar. El módulo está guardado pero no importado por pilot.js;
no hay directorio, solicitudes, coaches publicados ni mensajes nuevos en producción.
