# Borrado de alumnos — candidato de servidor

No desplegado. No borra cuentas reales durante estas pruebas. Requiere el esquema
de recepción de solicitudes y la revisión del candidato SQL antes de activarse.

## Qué implementa

`erase-student.mjs` recibe un cliente Supabase ADMINISTRATIVO de servidor y un ID
de solicitud existente. Nunca recibe un ID de usuario elegido por el navegador.
Las funciones SQL solo tienen EXECUTE para service_role. No hay endpoint público,
credenciales incrustadas ni importación del módulo desde el piloto.

La única excepción de privilegios es un helper SECURITY DEFINER en un esquema
privado no expuesto: sin parámetros, comprueba solo si existe la identidad firmada
del llamador en Auth. No devuelve otros usuarios ni usa user_metadata. Evita que
un JWT antiguo recree archivos sin bloquear el ingreso válido previo a crear un perfil.

1. El servidor obtiene el titular de la solicitud y verifica rol, referencias y
   coincidencia del esquema con metadatos revisados. No lee user_metadata para autorizar.
2. Se detiene para coach/admin, pagos relacionados o vínculos profesionales con
   otras personas. Estos casos requieren resolución manual; no se borran alumnos ajenos.
3. Para un alumno elegible, marca la solicitud en proceso, desactiva el perfil y
   revoca el consentimiento de seguimiento. Los triggers bloquean nuevas escrituras
   de ese usuario en tablas de la app y Storage, incluso mediante una función
   SECURITY DEFINER. Usan el mismo advisory lock que la preparación del inventario.
4. Restringe Auth, elimina archivos de propiedad comprobada por la API de Storage
   y vuelve a verificar que no queden objetos de ese propietario.
5. Elimina los registros personales en una transacción SQL ordenada. No hace DELETE
   directo de auth.users ni borra las cuentas del coach o de otros alumnos.
6. Llama a Auth Admin para el borrado definitivo y confirma por separado que el
   usuario ya no existe. No interpreta un timeout o error de red como éxito.

Los pasos de base de datos y archivos soportan reintento si Auth todavía existe.
Una falla deja el pedido en proceso y no muestra una eliminación completada.
El pedido y sus datos de tramitación desaparecen por cascada al borrarse Auth.

## Pruebas y límites de evidencia

- La fixture reproduce columnas, nulabilidad y relaciones FK observadas; NO
  reproduce todas las reglas de negocio, índices y políticas del servicio real.
- PostgreSQL 17 prueba eliminación de registros sintéticos, rechazo de usuarios
  ajenos, bloqueo de escrituras/sesiones antiguas durante el proceso, protección
  de otros alumnos y rechazo de cambios de esquema no revisados.
- Los tests Node prueban orden de APIs, propiedad de archivos, errores, reintentos
  y confirmación independiente de Auth. Auth y Storage son dobles de prueba.
- Los efectos de esas APIs se simulan por SQL SOLO dentro de la base efímera de QA.
  No equivale aún a una prueba alojada de Supabase Auth y Storage reales.
- La nueva prueba `erase-student-local-api.mjs` utiliza APIs GoTrue, PostgREST y
  Storage reales de un stack Supabase local desechable, con JWT firmados y archivos
  de texto ficticios. Verifica el bloqueo después del borrado incluso si el token
  anterior sigue firmado. No tiene acceso a proyectos alojados ni envía correos.

Antes de producción faltan: prueba alojada en un entorno aislado con Auth/Storage
reales y cuentas sintéticas, revisión de triggers/permisos existentes, pruebas de
concurrencia y sesiones en dispositivos, respaldos/restauración y resolución de
retención financiera y de cuentas profesionales. No marcar el borrado como listo
para todas las cuentas por aprobar estas pruebas.

## Archivos

- `catalog-columns-20261113.json`: solo metadatos, sin registros de usuarios.
- `student-erasure.template.sql`: fuente del candidato, sin aplicar a producción.
- `generate-erasure-fixture.py`: genera SQL y fixture, sin conexión a bases remotas.
- `student-erasure.candidate.sql`: resultado revisable; no es una migración aplicada.
- `erasure-fixture.sql` / `erasure-scenarios.sql`: QA aislada con datos ficticios.

El circuito por correo sigue disponible para iniciar pedidos de cualquier rol.
La atención manual de coaches no puede consistir en congelar indefinidamente su
cuenta: debe resolver vínculos, datos propios y retenciones dentro del plazo aplicable.
