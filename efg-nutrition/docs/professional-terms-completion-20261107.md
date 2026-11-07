# Doble rol: actualización autorizada del 7 de noviembre de 2026

La migración controlada v5 ya está aplicada en el Supabase existente. No reinstalar el delta ABSENT. El propietario aprobó los dos avisos profesionales `professional_pilot_20261107_v1`, la habilitación de Carla con 10 cupos y continuar la actualización. La configuración de esta candidata activa únicamente el adaptador de publicación; los prototipos anteriores permanecen apagados.

## Resultado

- Cuenta original de alumna conservada: mismo rol, organización, objetivos, consentimientos y acceso. El espacio profesional tiene organización y cupo independientes.
- Carla tiene 10 cupos; sus aceptaciones profesionales permanecen pendientes. Ella debe leer y aceptar por separado los dos textos mostrados. Su aceptación como alumna no se reutiliza.
- El alias se escribe mediante el RPC existente que resuelve y bloquea la organización profesional en el servidor. El cliente verifica el destino y la lectura posterior. Ante resultado incierto conserva el bloqueo y no reenvía automáticamente.
- El coach puede entrar aun cuando tenga pendiente su propia bienvenida como alumna; regresar conserva ese recorrido. Los alumnos sin capacidad profesional no reciben el panel nuevo.
- Cupos, invitaciones, ficha general, salud desconocida si no compartida, guía editable/versionada y publicación atómica, informe Luxury, mensajes y comprobantes se mantienen dentro del vínculo autorizado.

## Evidencia nueva

En el backend instalado, con cuentas exclusivamente ficticias: 12 comprobaciones de Auth/aceptación/invitación/claim/seguimiento/mensajes, 5 de ficha/guía/publicación canónica/recibo y 10 de alias/Storage/comprobante/informe. Todos aprobados. La publicación canónica entregó recibo verificable; la salud no compartida siguió desconocida. No hubo transferencias de dinero.

La app completa con SDK oficial 2.118.0, sesión GoTrue real y Chromium/IndexedDB nativos aprobó entrada independiente, carga del alumno ficticio, herramientas y guía publicada, retorno personal y anchos 390/1280 sin desbordamiento. El entorno de Work usa su CA gestionada con verificación TLS activada.

La cohorte ficticia se cerró: sesiones globalmente revocadas, tres perfiles desactivados, capacidad revocada y allowlist temporal retirada. Se conservan historial y recibos. La autorización final de coach está limitada a la cuenta revisada de Carla. No se generó aceptación en su nombre.

Se conserva el DEMO previo 5/5 de `166a03a5`; no se repitió. La evidencia nativa privada anterior de locks/carreras tampoco se repitió. No se publica SQL privado ni metadatos personales en este repositorio.

## Publicación y reversión

Verificar CI aplicable del HEAD exacto antes del merge; después verificar el deploy live de Render y los hashes de los assets publicados. El servicio existente y Supabase siguen siendo los mismos, sin servicios pagos nuevos.

Para una incidencia de frontend, volver al commit estable `9aaddfe21d77302224f93ea82be3b215c86769d6` mediante actualización controlada de Render o revertir la activación con una nueva versión de assets. La migración es compatible con el lector original de alumnos: sus dos avisos no se sustituyeron. No borrar tablas, recibos, guías ni consentimientos; con actividad nueva, conservar evidencia y reparar hacia adelante. La desactivación de la capacidad profesional es una operación administrativa separada y no debe desactivar el perfil personal de alumna.

El cierre privado está en `NCC-doble-rol-release-v5-20261107.zip`. El resultado live y SHA final se registran en el PR64 y en ese cierre después de la verificación.
