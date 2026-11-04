# P28M · Recorrido de alumno habilitado solo en Work

Fecha: 2026-11-04. Base: `3aec25c036d794eefab7a20ad3658ebe33b420b8`.
PR53 sigue DRAFT. Sin merge, despliegue Render ni cambios globales de Supabase.

## Alcance autorizado

Edu respondió «Si autorizo» a la propuesta P28L: crear un único alumno nuevo
`NCC QA Ingreso 20261104` en la organización QA A existente, habilitar tres
controles solo en la copia de Work y guardar una ficha general ficticia.
El propietario completa las aceptaciones y decide salud/compartir en pantalla.
La autorización no incluye publicar planes, registrar consumos ni activar los
controles globales de publicación/diario de Supabase.

Los tres flags de `dist/pilot` de Work están ON: `SCIENCE_WELCOME_ENABLED`,
`COACH_STUDENT_JOURNEY_ENABLED`, `PRIVATE_HEALTH_DECLARATION_UI_ENABLED`.
Los originales del repositorio siguen OFF. Respaldo externo al directorio servido:
`ncc-work-preview/backups/p28l-3aec25c`, con hashes y manifest de activación.
La vista interna administrada es `http://terminal.local:4173/pilot/`.

## Evidencia real con Supabase alojado

- Sesión existente `NCC QA Alumno` recuperada, sin solicitar otro OTP.
- Con recorrido ON, aparece «Tu ficha está guardada como privada» y el historial
  de solo lectura. No se presenta el registro de comidas ni editor de objetivos.
  Es evidencia de navegación; el switch global de escritura del diario sigue OFF.
- La presentación ya confirmada para esta cuenta no se repite. No se borraron
  recibos para simular primer ingreso. Las nueve pantallas con actor nuevo siguen
  pendientes de invitación/autenticación.
- «Mis restricciones» carga el documento sanitario alojado aprobado P28I y el
  estado «Declaración ausente o no comprobada». Ocho selectores «No informar»;
  ninguna declaración de ausencia ni autorización de tratamiento/compartir marcada.
  No se guardó ninguna declaración ni se aceptó ningún permiso.
- «Mi ficha» recupera la ficha general ficticia existente, sin editarla.
- Lectura posterior: un documento sanitario, cero declaraciones y cero
  revocaciones; tres controles globales de Supabase OFF. El alias nuevo aún no
  tiene usuario Auth. No se creó la invitación en este punto.

## Dos problemas observados y corregidos

1. La apertura de restricciones fallaba en HTTP interno porque `randomUUID`
   requiere contexto seguro. `renderPrivateHealthDeclaration` ahora utiliza
   `crypto.getRandomValues` para UUIDv4 cuando `randomUUID` no está disponible.
   Conserva 122 bits aleatorios y rechaza ausencia/fallo del CSPRNG; nunca usa
   `Math.random`, fecha ni valores constantes. Este nonce vive solo en RAM y
   separa respuestas de distintas sesiones; no sustituye identidad Auth, RLS ni
   permisos de las RPC. Reprueba real: módulo y documento sanitario cargaron.
2. La ficha general mostraba el bloque clínico deshabilitado y decía que faltaba
   almacenamiento/consentimiento aunque el módulo privado estaba disponible.
   Con ese módulo habilitado ahora orienta a «Mis restricciones» después de guardar
   la ficha. La ficha general continúa sin recoger ni enviar condiciones médicas.
   Con flags OFF se conserva el comportamiento anterior.

Archivos funcionales: `pilot/pilot.js`, `pilot/coach-relaunch-entry-client.js`.
Pruebas actualizadas: `tests/private-health-entry-route-runtime.mjs` y
`tests/coach-relaunch-entry-client.mjs`.

## Verificación y límites

Node 24.22.1: PASS de render privado real aislado (UUID nativo, CSPRNG alternativo,
ausencia/fallo de CSPRNG, nonce estable en sesión, gates y descarte de errores
tardíos), contrato OFF, cliente de ficha, integración COACH113, hidratación privada
y contrato UX35; sintaxis y `git diff --check` PASS. Los CI de 3aec25c son evidencia
anterior, no certifican este cambio. No se reejecutan suites alojadas históricas.

Work es navegador de escritorio sobre HTTP interno y backend alojado; no dispositivo
físico. Ninguna evidencia de esta etapa certifica todavía invitación/OTP nuevos,
aceptaciones, envío de ficha, guía, publicación atómica ni primer registro diario.
Siguiente: ingreso de Coach QA A por el propietario, invitación autorizada, nuevo
OTP y recorrido de nueve pantallas. NO GO para producción.
