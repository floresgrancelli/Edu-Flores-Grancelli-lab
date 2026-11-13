# Recepción y tramitación de solicitudes — preparación

Responsable confirmado: Eduardo Flores Grancelli.
Correo público confirmado: floresgrancelli@gmail.com.
Domicilio público confirmado: Murias 2274, 3F, Caseros, Buenos Aires, Argentina.

## Vías de recepción

La página de eliminación tiene un enlace de correo visible sin sesión y sin
JavaScript. Solo abre el programa de correo; el usuario debe enviar su mensaje.
La interfaz no afirma que el correo se envió ni que fue recibido. No se envían
mensajes automáticos desde esta implementación.

El formulario OTP existente es una segunda vía: confirma identidad y relee una
constancia guardada antes de indicar éxito. Su tabla sigue siendo candidata,
sin aplicar en producción. No debe presentarse como disponible hasta verificar
su backend. La vía de correo no depende de esa tabla ni de acceso a la app.

## Operación necesaria antes del lanzamiento

1. Revisar diariamente el canal de soporte una vez lanzada la app y registrar
   fecha de recepción, solicitud y verificación, sin copiar datos de salud.
2. Si el remitente coincide con la cuenta, coordinar verificación proporcional;
   no pedir DNI o diagnósticos de manera automática. Para representantes,
   verificar el alcance de su representación por un canal seguro.
3. Responder acceso en los plazos aplicables y tramitar rectificación/supresión
   cuando corresponda: la AAIP indica diez días corridos para acceso y cinco
   días hábiles para rectificación, actualización o supresión. No sustituir esto
   por un plazo genérico de 30 días.
4. Antes de borrar, inventariar datos y archivos de esa cuenta. Usar los
   metadatos guardados en docs/play-store/deletion-metadata-20261113.json.
   Confirmar que el esquema sigue coincidiendo; no ejecutar SQL de borrado
   contra cuentas reales a partir de una suposición o de un mero correo sin verificar.
5. En alumnos, incluir perfil, diarios, peso, actividad, fichas, planes,
   informes, mensajes, notificaciones relacionadas, recetas, invitaciones,
   archivos y registro de autenticación. Revisar comprobantes y obligaciones
   de conservación por separado, con motivo y plazo específicos.
6. En coaches o doble rol, separar sus datos personales de los registros de
   alumnos. Resolver primero los vínculos profesionales y las referencias a
   coach/aprobador; no borrar alumnos ni sus cuentas por cascada. El esquema
   actual contiene referencias NO NULL y referencias sin cascada que impiden
   tratar esos casos como un DELETE directo del usuario.
7. Eliminar archivos por la API de Storage; borrar solo metadatos no equivale
   a eliminar archivos. Borrar el usuario de Auth tampoco prueba que se
   revocaron todos los tokens ya emitidos. Verificar protección frente a
   sesiones antiguas y nuevas escrituras durante la tramitación.
8. Verificar el resultado, las retenciones legítimas y el tratamiento de copias
   de seguridad antes de declarar una eliminación completada. Conservar solo
   la constancia mínima que tenga una finalidad y plazo justificados.

## Prueba de preparación completada en esta tanda

- Contacto público del titular confirmado por él.
- Enlace de solicitud por correo comprobado en móvil y escritorio sin sesión
  y con JavaScript desactivado. No se envió ningún correo.
- Borrador de política con responsable, contacto, datos tratados, acceso de
  coaches, proveedores, derechos y eliminación; marcado como no vigente.
- El generador rechaza publicar como vigente una política con puntos pendientes.

La prueba con Auth, PostgREST y Storage locales reales ya pasó para alumnos
elegibles: ver docs/play-store/BORRADO_ALUMNOS_QA_20261113.md. El candidato sigue
sin activarse en el proyecto alojado. Faltan los casos profesionales/financieros,
la paridad de configuración completa y respaldos/restauración; no se presenta
la app como lista para Google Play por aprobar únicamente ese circuito.

## Datos y configuración pendientes

- Plazos efectivos de registros técnicos y respaldos y tratamiento de restauraciones.
- Verificación final de proveedores/transferencias y conservación comercial.
- Ampliación de la prueba sintética a los casos pendientes y atención operativa del correo.

Fuentes oficiales:
https://www.argentina.gob.ar/aaip/datospersonales/derechos
https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion
https://support.google.com/googleplay/android-developer/answer/13327111
https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
https://supabase.com/docs/reference/javascript/storage-from-remove
