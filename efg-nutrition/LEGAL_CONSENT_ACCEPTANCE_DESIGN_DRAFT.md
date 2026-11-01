# EFG Nutrition Pro · aceptación de términos, privacidad y datos sensibles (DISEÑO)
**Versión de trabajo 2026-10-29 · documentación preliminar · NO IMPLEMENTADO · revisión legal requerida.**

## Objetivo
Cumplir el requisito de producto: al primer ingreso, ANTES de usar funciones de la app,
mostrar Términos y Condiciones + Política de Privacidad en español claro y registrar
aceptación **expresa y trazable por versión**. No confundir consentimiento legal del
servicio, reconocimiento de información de privacidad, permiso de seguimiento por coach
y permiso voluntario para tratar/compartir datos sensibles de salud.

**Nunca** utilizar una cláusula genérica de "no nos hacemos responsables de nada".
Argentina Ley 24.240, art. 37, considera ineficaces ciertas limitaciones de
responsabilidad y renuncias de derechos del consumidor. Los textos definitivos
requieren revisión de un profesional jurídico argentino, identidad y datos de contacto
reales del responsable, definición de prestadores y jurisdicción.

## Documentos y campos a completar antes de publicarlos
- Términos y Condiciones: nombre legal del prestador, contacto, servicio y límites
  funcionales, planes/pagos/cancelación/reclamos, contenido de coaches y obligaciones
  recíprocas, disponibilidad y cambios de versión, idioma y fecha de vigencia.
- Política de Privacidad: responsable y domicilio, finalidades, categorías de datos,
  subencargados (hosting y base), plazos de conservación, cómo ejercer acceso,
  rectificación, supresión y revocación, medidas de seguridad e incidentes; identificar
  claramente quién accede a la ficha, al diario y a datos de salud.
- Nota clínica comprensible: la plataforma ofrece registro y orientación general;
  no atribuir diagnósticos, resultados clínicos, tratamiento de patologías ni sustitución
  de atención profesional al algoritmo. Un coach tampoco adquiere licencia sanitaria
  por usar EFG Nutrition. Las indicaciones deben ajustarse a incumbencias reales.
- Permisos separados: el acceso mínimo para operar el servicio no habilita a compartir
  una ficha privada ni a agregar/usar datos de enfermedad, glucemia o laboratorio.
  Condiciones médicas declaradas voluntariamente requieren evaluación legal
  específica de habilitación, finalidad, seguridad, acceso y conservación.

## Modelo técnico propuesto (NO migración ejecutable)
`efg_legal_documents`: `id`, `kind` (terms/privacy),
`version`, `content_hash_sha256`, `effective_at`, `published_at`,
`status` (draft/published/retired), `locale`, referencia a texto inmutable.
`efg_legal_acceptances`: `user_id` (FK), `document_id` (FK),
`accepted_at` (servidor), `acceptance_method` (explicit_checkbox),
`document_hash_sha256` (inmutable), `recorded_at` (servidor).
Cada documento se acepta de forma separada; no marcar casillas por defecto.
`efg_health_disclosures`: propuesta de esquema separado del perfil general:
`user_id`, `category`, `value`, `source`, `measured_on`, `unit`,
`shared_with_coach_at` y `revoked_at` (si legalmente viable tras revisión).
No empezar a recabar datos clínicos con esta propuesta sin evaluación específica.

No almacenar IP, huella del dispositivo o datos excesivos "por las dudas".
Definir retención y auditoría mínima con responsables legales. Una aceptación
anterior jamás debe actualizarse silenciosamente para aparentar otra versión.
El cliente no decide `accepted_at` ni eleva permisos; RPC/constraints/RLS
de servidor verifican identidad y versión activa.

## Flujo de pantalla
1. OTP y validación de perfil. Sin pasar todavía a MI DÍA ni panel coach.
2. Pantalla premium "Antes de empezar" con enlaces legibles y opción de abrir
   el documento completo. Casillas inicialmente desmarcadas:
   - "Leí y acepto los Términos y Condiciones (versión X)" (obligatoria).
   - "Leí la Política de Privacidad (versión Y)" (constancia y tratamiento legal
     a validar; no equiparar automáticamente a consentimiento de salud).
3. Si no acepta, no registrar aceptación y no habilitar uso funcional; ofrecer
   salida segura, contacto y mecanismos aplicables de acceso/supresión de datos.
4. Se guarda evento inmutable en servidor y se habilita la navegación según rol.
5. Al cambiar una versión publicada, volver a mostrar SOLO lo que requiere
   nueva aceptación. No revocar ni eliminar datos históricos automáticamente.
6. Más adelante, ficha con controles aparte para compartir al coach y, si se
   habilita clínicamente, permisos granulares de datos sensibles revocables,
   por finalidad y destinatario.

## Requisitos de seguridad y QA
- Nunca confiar en esconder un botón; los endpoints de datos protegidos deben
  verificar el estado aceptado según la modalidad legal/funcional elegida.
  Definir excepciones deliberadas para cierre de sesión, ayuda, acceso a datos,
  solicitudes de rectificación/supresión y recuperación de cuenta.
- Prevenir que una cuenta A registre aceptación por B, que un admin cree
  aceptaciones en nombre de alumnos o que se falsee fecha/versión por REST.
- Dos usuarios de organizaciones distintas no deben leer eventos/documentos
  privados de otros. Backfill de usuarios existentes **no** significa
  aceptación: conservar cuentas, diarios, pagos y planes; solicitar aceptación
  real en próximo ingreso tras activar el módulo.
- Validar visual y teclado en iPhone, Android, pantallas pequeñas; textos
  completos legibles y enlace de descarga. Versionado auditable incluso si
  el usuario no puede continuar por negativa.
- Nunca bloquear o borrar a un usuario existente mediante una migración
  inadvertida; desplegar primero documentos, luego mecanismo de aceptación
  y por último el gate mediante feature flag y aprobación.
- Probar caída de conexión justo antes/después de guardar la aceptación,
  reintento idempotente, cierre de sesión, cambio de cuenta y cambio de versión.
- Exigir revisión legal y de privacidad de Términos/Política, además de seguridad
  de base, antes del lanzamiento. No publicar un texto provisional como definitivo.

## Orden de implementación
A) Revisar textos e identidad legal del prestador (pendiente).
B) Diseñar migración DRAFT aparte; staging+restore+RLS tests.
C) Preparar pantalla/persistencia y correr QA; sin bloquear producción.
D) Habilitar con decisión explícita de producto, de forma escalonada.
E) Solo tras evaluación clínica/legal diseñar el módulo de condiciones
   declaradas y laboratorios; no predecir glucemia o analíticas.

## Fuentes primarias para revisión
- Ley 25.326, texto actualizado: https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion
- Ley 24.240, texto actualizado (art. 37):
  https://www.argentina.gob.ar/normativa/nacional/638/actualizacion

**Este archivo describe el diseño técnico y los puntos jurídicos a revisar; no es
una opinión legal ni confirma que la app cumpla la normativa.**

## Compatibilidad coloreada y responsabilidad (decisión de UX, 29/10/2026)
La interfaz futura mostrará alimentos con tres estados explícitos:
VERDE «Compatible verificado», AMARILLO «Verificar antes de elegir» y
ROJO «No compatible con la restricción/plan elegido», más un distintivo
separado «Incluido en mi plan». Se usará en Coach, **Alumno con Coach**
y Autogestión. La elección y registro veraz de alimentos seguirá siendo
del usuario; debe poder leer por qué aparece la advertencia. **Nunca**
presentar rótulos sin evidencia como seguros para celiaquía o alergias.

En los Términos y Condiciones, explicar el alcance de estas señales,
limitaciones de fichas y fuentes, necesidad de revisar envases/ingredientes,
fecha y condiciones, y que orientaciones generales no reemplazan atención
profesional. Mostrar aviso específico en pantalla donde aplique;
no limitarse a una aceptación contractual al registrarse.
La aceptación será informada, no premarcada, fechada y versionada; se separa
de consentimientos voluntarios para compartir salud con un coach.

**No prometer liberación total de responsabilidad jurídica:** Ley argentina
24.240 art. 37 puede dejar sin efecto cláusulas que limiten responsabilidad
por daños o derechos del consumidor. Ley 25.326 regula datos personales
sensibles y seguridad. Debe mediar revisión profesional del texto y de la
operación real de la app, además de pruebas de seguridad alimentaria.
Fuente oficial: https://www.argentina.gob.ar/normativa/nacional/638/actualizacion
Privacidad: https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion

ESTADO: planificación legal/UX, sin textos finales, sin migración ni publicación.
