# EFG Nutrition Pro — Piloto privado (26/10/2026)

## Acceso
- Dirección única y pública compartible: https://efg-nutrition.onrender.com (redirecciona a /pilot/).
- Sin cuentas invitadas, la aplicación muestra una puerta de acceso, no los datos.
- Administrador invitado inicialmente: floresgrancelli@gmail.com (la invitación no equivale a un inicio de sesión completado).
- Supabase: proyecto \`cyjvddhimbsfipjfctsl\`, región São Paulo, organización Floresgrancelli (Pro).
- En el navegador **solo** se incluye la clave publicable \`sb_publishable_...\`. Nunca incluir claves secretas.
- La demo antigua fue archivada como \`demo.html\` para conservar los registros locales anteriores. No se sincronizan automáticamente a la cuenta privada.

## Roles
**EFG admin:** crea coaches, fija cupos, cambia estado de licencia, ve invitaciones comerciales y pagos a EFG. También tiene sus diarios y metas personales. No tiene SELECT en los diarios nutricionales, peso ni actividad de alumnos ajenos.

**Coach:** recibe invitación por correo autorizado, ve exclusivamente sus alumnos asignados (nombre y email); invita alumnos sin exceder cupos; puede liberar cupos cancelando invitaciones pendientes; asigna metas con Mifflin–St Jeor y aprobación explícita únicamente a alumnos que hayan consentido; revisa sus registros, peso, actividad y pagos dirigidos a él.

**Alumno:** recibe su nombre visible y acceso por correo habilitado, carga su propio diario, actividad, suplementos y pesajes, autoriza y revoca acceso al coach, paga por transferencia y sube comprobante privado.

## Configuración obligatoria de Supabase Auth antes de pruebas por correo
Estas opciones **no están disponibles por las herramientas conectadas actualmente**, y deben activarse en el panel web del usuario:
1. Authentication > URL Configuration: Site URL = \`https://efg-nutrition.onrender.com/pilot/\`.
2. Añadir como Redirect URL la misma ruta \`https://efg-nutrition.onrender.com/pilot/\`.
3. Authentication > SMTP Settings: activar un proveedor de SMTP transaccional verificado antes de incorporar usuarios fuera del equipo de la organización. El SMTP por defecto de Supabase solo envía correos a miembros preautorizados y tiene límites muy bajos (2/hora).
4. Configurar remitente autenticado, DNS SPF/DKIM/DMARC del dominio apropiado y verificar recepción / botón de magic link.
5. Para superar 5–10 usuarios, revisar CAPTCHA y límites de OTP. No compartir claves SMTP en chats o repositorios.

Docs: https://supabase.com/docs/guides/auth/auth-email-passwordless
https://supabase.com/docs/guides/auth/auth-smtp

## Prueba mínima del piloto
1. Admin recibe magic link, inicia sesión y entra como "Administrador EFG", con su diario propio.
2. Admin invita a coach (nombre, email, 3–5 cupos). El coach inicia sesión con su correo.
3. Coach establece alias de banco. Invita 2 alumnos. Verificar cupos contabilizados y bloqueo al superar cupo.
4. Alumno inicia sesión: sin consentimiento, coach ve únicamente ficha básica; no ve los diarios.
5. Alumno autoriza a su coach y registra comidas y suplemento: los macros se reflejan en su cuenta y el panel del coach.
6. Alumno revoca: el coach deja de poder leer esos datos inmediatamente.
7. Coach calcula metas y las aprueba. El alumno las ve sin facultad de alterarlas.
8. Alumno registra peso: aparece advertencia roja de misma hora y balanza. Registra pasos y ejercicio.
9. Subir fotografía de comprobante (privada), validar acceso único de emisor/receptor y que subir foto no sea aprobación bancaria.
10. Con segundo coach y alumnos distintos, intentar consultas cruzadas a la REST API manualmente y verificar denegación RLS. **Este ensayo de aislamiento con dos cuentas reales todavía no se ha realizado.**
11. Probar en Safari iPhone, Chrome Android y escritorio.

## Seguridad y limitaciones
- Todas las 11 tablas EFG en \`public\` tienen RLS y políticas restrictivas.
- Los comprobantes viven en bucket privado con reglas de acceso.
- La inicialización comercial se gestiona con RPCs con comprobación de rol/propiedad. Los avisos sobre funciones \`SECURITY DEFINER\` ejecutables por authenticated son esperables para estas RPCs y deben revisarse antes de escalar.
- Los macros de alimentos genéricos, porciones de whey, isotónica y budín están estimados. Se requiere catalogación por marca verificada y receta exacta para precisión suficiente.
- Sin SMTP y redirect URLs, los nuevos usuarios pueden no recibir enlace válido. No anunciar el piloto como operativo hasta completar la prueba de los pasos anteriores.
- Los cambios de costo y estado de suscripción todavía son manuales. No existe conciliación bancaria automática.
