# SEC-10 — OTP y consentimiento de seguimiento deben ser independientes

**30/10/2026 | PR #37 DRAFT | CANDIDATA únicamente | NO GO**

## Hallazgo verificado en el cliente anterior

El módulo `pilot/pilot.js` trataba erróneamente la validación de un código de acceso como autorización para compartir información de alimentación, peso, actividad y suplementos con un coach: `confirmOtp` guardaba una marca `efgNutritionCoachConsent:<user_id>` en `sessionStorage` y `refresh` intentaba poner `efg_consents.accepted=true` para alumnos. La interfaz también describía esta concesión automática como consecuencia de introducir el código.

**La verificación de identidad no demuestra un consentimiento libre, específico e informado para compartir datos sensibles**. El nuevo flujo necesita una acción separada, afirmativa y revocable, y un procedimiento documentado para consentimientos históricos antes de habilitar el lanzamiento.

## Contención implementada — SIN producción

- OTP solo valida identidad y no crea ningún permiso de seguimiento ni escritura a `efg_consents`.
- Al recuperar una sesión, se descarta la antigua marca local de OTP/consentimiento sin convertirla en autorización.
- La pantalla **Privacidad y seguimiento** del alumno explica que el código no comparte información. El botón **Autorizar seguimiento del coach** es el camino afirmativo; solicita confirmación diferenciada con el alcance de información y revocabilidad. El botón de revocación permanece.
- El guard del cliente rechaza la acción de permiso si el perfil no es `student`. El backend RLS sigue siendo la autoridad, nunca el botón ni `sessionStorage`.
- `tests/legal-onboarding-draft.mjs` añade aserciones estáticas para impedir futuras concesiones automáticas en OTP/refresh y exigir la acción separada. **Esta prueba no sustituye una prueba E2E de consentimiento por JWT y RLS en staging fiel.**
- El prototipo `NUT60` sigue aislado y desactivado en la PWA: usuarios Personal no heredan automáticamente consentimientos de Coach.

## Pendiente antes del relanzamiento

1. Auditar los consentimientos históricos `efg_consents` **por metadatos y procedimiento aprobado**, sin exponer ni borrar diarios de usuarios: algunos `accepted=true` pudieron originarse en la antigua interacción OTP. Una marca previa sin evidencia de consentimiento independiente **no puede presentarse como consentimiento explícito y versionado**.
2. Diseñar transición segura: pedir autorización nueva a cada alumno donde corresponda, conservar datos privados e historial de autorizaciones, evitar que el coach vea datos mientras falte permiso válido y preservar la posibilidad de revocación. Decisión jurídica y comunicación transparente previas a cualquier cambio de permisos reales.
3. Verificar una API de consentimiento autenticada de solo-titular, revocación inmediata, política RLS, doble organización, alumno inactivo, cuenta con sesión antigua/OTP repetido, baja del coach y autorización de nuevos datos.
4. Separar el contrato LEG-07 de Términos/Privacidad (versiones y hashes) y consentimiento adicional de compartir datos sensibles con coach, con registros auditables de fecha, objeto, sujeto, versión y revocación. No inferir aceptación por `login`, por el uso de la aplicación ni por perfiles preexistentes.
5. Ejecutar QA visual en Chromium/WebKit y validación física en iPhone, Android y Mac; comprobar que el consentimiento no vuelve a habilitarse al cerrar/reabrir.
6. Obtener revisión jurídica argentina y evaluación de privacidad antes del GO. La app pública y Supabase alojada conservan su estado anterior mientras PR #37 siga DRAFT.

**No se aplicó ninguna migración ni escritura a Supabase hospedado, ni se fusionó PR #37 ni se desplegó Render.**
