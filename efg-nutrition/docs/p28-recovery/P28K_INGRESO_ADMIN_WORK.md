# P28K — Ingreso real del administrador y restauración de sesión

4/11/2026. PR53 permanece DRAFT. Sin merge, despliegue Render ni activación de flags.

## Navegador real y backend alojado

El propietario completó el ingreso en Cloud Browser. La candidata servida por la vista previa administrada de Work (`http://terminal.local:4173/pilot/`) mostró **Edu · Administrador EFG**. El frontend utiliza el Supabase existente; la URL HTTP es interna de Work, no una publicación HTTPS pública.

| Prueba ejecutada | Resultado y alcance |
| --- | --- |
| Ingreso del propietario | Panel del administrador visible; el error `efg_student_intakes` no apareció en este recorrido. |
| Mi Día personal del administrador | Abrió; seis horarios permanentes, Balance restante y objetivos personales visibles. No se registraron alimentos ni se guardaron objetivos. |
| Espacio de coach del administrador | Panel y listado autorizado abrieron. No se abrieron fichas individuales, publicaron planes ni aceptaron permisos. No equivale a una sesión con rol coach. |
| Página educativa vertical | Abrió desde la navegación. Es diferente del onboarding obligatorio de nueve pantallas; este último sigue OFF. |
| Recarga antes de la corrección | La sesión se conservó y volvió al administrador sin OTP, pero durante la recuperación apareció transitoriamente el formulario de ingreso. |
| Recarga después de la corrección | Se observó «Restaurando tu sesión» y luego el panel del administrador, sin nuevo OTP. |

Inspección visual interna de escritorio en Cloud Browser: panel legible y navegación visible. No se acredita móvil ni dispositivo físico en esta etapa. Consultas de consola filtradas por `supabase` y `efg_student_intakes`: sin resultados; los errores observados de la extensión del navegador no se atribuyen a la app. No se inspeccionaron credenciales, tokens ni almacenamiento de autenticación.

## Corrección concreta

- `pilot/auth-hydration-gate.js`: comunica si la invalidación corresponde a una identidad pendiente o a una salida.
- `pilot/pilot.js`: `invalidateAuthContext` limpia primero los datos privados en RAM. Para una identidad pendiente muestra una espera accesible; para cierre de sesión muestra ingreso. La identidad continúa requiriendo `getUser`; el evento no concede acceso.
- `tests/auth-hydration-pilot-private.mjs`: prueba las funciones reales con transporte sintético, incluyendo recuperación inicial sin perfil verificado, cambio A→B, A→B→C, cierre de sesión, eventos repetidos y renovación. Completa las dependencias de colas de escritura que faltaban en el adaptador de prueba.
- `tests/ux35-session-release-contract.mjs`: actualiza el contrato de limpieza para el callback nombrado sin exigir que toda transición muestre login.
- `tests/coach113-pilot-ui-integration.mjs`: mantiene el mismo contrato de limpieza del recorrido de alumno con el callback nombrado.

Validaciones ejecutadas con Node 24.22.1: sintaxis de ambos archivos, `auth-hydration-gate-private.mjs`, `auth-hydration-pilot-private.mjs`, `ux35-session-release-contract.mjs`, `coach113-pilot-ui-integration.mjs`, `persisted-guide-local-e2e.mjs --pilot-scope-regression` y `git diff --check`: PASS. La prueba inicial con el Node predeterminado no admitía el flag experimental; se utilizó el runtime administrado. Los fallos intermedios del adaptador y del contrato antiguo se corrigieron antes del resultado final.

La vista previa se actualizó únicamente con los dos archivos funcionales modificados. No cambia permisos, tokens, configuración de autenticación, flags, SQL, imágenes ni datos nutricionales. Los seis CI de `123eec3` son evidencia anterior y no se presentan como aprobaciones de este nuevo commit.

## Siguiente prueba y decisión

Ingreso/recuperación del administrador: **PASS, alcance limitado**. No acredita el ingreso de alumnos existentes ni el recorrido obligatorio. Falta una sesión con una cuenta de alumno de prueba existente cuyo correo controle el propietario; las identidades `NCC QA Alumno` y `NCC QA Coach A` solo fueron identificadas previamente por metadatos. No se presume control de sus OTP ni autorización de nuevas escrituras.

Antes de la prueba de escritura se debe concretar la habilitación acotada del recorrido y las cuentas destinatarias. Los controles de presentación, ficha privada y recorrido siguen OFF. No se activan controles globales de Supabase para simular una prueba aislada. El consentimiento lo decide el titular. Luego corresponde ficha → espera → coach → guía editable → revisión humana → publicación conjunta → Mi Día.

**NO GO para actualizar producción.** El acceso real del administrador deja de ser pendiente; el circuito alumno/coach y las escrituras siguen pendientes. P28G y P28I ya se aplicaron: no repetir sus SQL de instalación o documento.
