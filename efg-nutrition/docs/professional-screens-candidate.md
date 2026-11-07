# Pantallas profesionales integradas: candidata OFF

## Estado y alcance

Alias, recetas compartidas y mensajes tienen un panel separado integrado al frame, selector y ciclo de sesión de la app completa. Conserva el `profile.role='student'`, la organización, el vínculo, el consentimiento y los datos personales originales. No elimina las guardas legacy de alias, recetas o mensajería ni abre fichas clínicas, informes, guías o pagos.

Base exacta de esta extensión: PR64, rama `work/ncc-dual-workspace-r4-20261106`, commit `96c5e3caef7797455d904595c895fab13a24efe0`. Es desarrollo candidato, no aprobación, merge, despliegue ni habilitación alojada. El build de release sigue siendo `ncc-pilot-3a40474052be`.

Permanecen **false en disco** `DUAL_WORKSPACE_RELEASE_ENABLED`, `PROFESSIONAL_SCREENS_RELEASE_ENABLED`, `PROFESSIONAL_TRANSPORT_ENABLED` y `PROFESSIONAL_BACKEND_EXECUTION_ENABLED`. Sólo el servidor de pruebas sustituye explícitamente esas constantes en respuestas HTTP de loopback. No reescribe archivos. El transporte rechaza destinos hosted aun si la página corre en localhost y exige cuentas ficticias `.invalid`.

## Contrato y aislamiento

- El frame mantiene una guardia opaca de mutaciones durante toda su vida. Todos los remontajes usan la misma guardia. Su identidad de módulo está fijada con la misma versión en imports de runtime y fixtures.
- Cada petición liga UID real, sesión opaca, época de autenticación, organización y época de navegación. La selección local o `user_metadata` nunca conceden acceso. `managed_coaches` es inventario administrativo, no autorización clínica.
- `ncc_dual_workspace_contexts_v1()` es una respuesta autenticada, no un snapshot criptográficamente firmado. El transporte exige un contexto propio con `coach_id===user_id`, estado permitido y `legal_ready`. Revalida antes y después de cada operación.
- El roster se pide con `ncc_pilot_workspace_roster_v1({p_org})`. Sólo incluye identidad y estado de seguimiento, no información clínica. Para operaciones sobre un alumno se revalida además que pertenezca al espacio, siga activo y tenga consentimiento.
- El alias no forma parte de contexts. Se lee explícitamente `id,coach_id,payment_alias` de `efg_organizations`, filtrando el ID profesional y su propietario; no se usa el ID del perfil personal.
- Alias conserva `efg_set_coach_alias({p_alias}) → boolean`. Sólo `true` confirma la escritura. **Límite:** esa firma no contiene `p_org` ni comparación de versión; depende de la unicidad vigente de organización por coach. No es un CAS de workspace.
- Recetas conserva `efg_coach_shared_student_recipes({p_student})`. Se valida organización/alumno, lista y contenido recibido, sin consulta directa alternativa ni fila inventada. Lista vacía es válida.
- Mensajes usa la tabla y policies existentes, pareja explícita alumno/coach y remitente UID auténtico. Consulta los 200 mensajes más recientes con orden descendente estable por fecha/ID; el panel los presenta cronológicamente. La confirmación de lecturas sólo modifica `read_at` de IDs entrantes autorizados y aplica únicamente recibos devueltos.

El transporte recibe un SDK; no construye clientes, credenciales ni grants. La implementación SDK de prueba es memoria determinista, sin JWT, RLS, PostgREST, SQL o locks reales. Sus resultados no prueban paridad de backend ni sustituyen autorización de servidor. No se incluyen SQL privado, datos reales, capturas privadas ni cambios de permisos.

## Navegación, borradores y carreras

Estado, caché, alumno, alias y borradores son profesionales y separados. Las respuestas de otra sesión, época, espacio o alumno se descartan. Cambio de alumno/contexto o denegación borra datos de la vista. La consulta de la misma conversación puede conservar mensajes ya verificados mientras refresca; una escritura confirmada invalida lecturas anteriores para que no la borren.

Los borradores bloquean el cambio de espacio; cancelarlos nunca envía. Los re-renders normales preservan la instancia del panel. Logout, cambio de sesión, `popstate` y `pagehide` invalidan; `pageshow.persisted` solicita un selector personal fresco, sin restaurar caché profesional. El evento `pageshow` ordinario no duplica carga.

Doble clic sólo comparte una operación pendiente de la misma instancia. Otro montaje no duplica escritura. Timeout, recibo inválido o pérdida de contexto después del envío dejan resultado incierto y bloquean reintento; no se infiere rollback ni se fabrica confirmación. **Pendiente:** la guardia vive en RAM, no aporta idempotencia después de recargar/reiniciar toda la app. Falta reconciliación autorizada de escrituras inciertas y su prueba de reinicios antes de cualquier habilitación real.

## Archivos principales

- `pilot/professional-screens-{candidate,panel,transport}.mjs`: estado, presentación y transporte contextual separado.
- `pilot/dual-workspace-{frame,panel,integration}.mjs` y `pilot.js`: montaje, sesión, navegación y contexto.
- `tests/professional-screens-*.test.mjs`: contratos, carreras, integración del frame y SDK sintético.
- `tests/professional-screens-fullapp-sdk.mjs`: SDK ficticio y controles visibles para QA local de la app completa.
- `tests/professional-screens-fullapp-browser.mjs`: prueba Chromium/WebKit de la app completa mediante SDK ficticio; sin destinos externos.
- `tests/dual-workspace-fullapp-server.mjs`: sirve archivos locales en puerto efímero, CSP local y sustitución sólo en respuestas del ensayo.
- `tests/professional-screens-preview.*` y `professional-screens-browser.mjs`: prueba del panel aislado anterior. No equivalen a la app completa.
- `tools/prepare-professional-screens-assets.py`: exige hashes de la candidata anterior, preserva flags/release y fija imports, manifiesto y validador del candidato.

## Verificación y límites

- 169/169 pruebas Node de doble espacio y pantallas profesionales pasan en el snapshot integrado: 70 existentes y 99 profesionales. Incluye frame/gateway reales con DOM simulado, transporte contextual con SDK simulado, contratos del servidor local y bfcache. No son 169 pruebas de navegador ni backend.
- Revisiones independientes encontraron y corrigieron carreras de guardia/lecturas y recuperación bfcache. Se verificaron hashes del manifiesto y separación del espacio personal.
- QA visual anterior del **panel aislado** en Chrome, 390 y 1280 px: alias, recetas, mensajes/lecturas, escape de texto, borrador/cancelación, separación de alumnos, logout, revocación y Back/Forward. Sin desborde horizontal. No es prueba visual de esta integración completa.
- El runner cloud del panel aislado quedó bloqueado antes del navegador por `socket() failed: Operation not permitted`; no ejecutó asserts. No se sorteó con `--no-sandbox` ni cambios de seguridad.
- **App completa verificada en Chromium y WebKit** con SDK ficticio, en 390 y 1280 px, sobre el commit de implementación `ebb1760ea6e1c6fb6669c4bd8927c1538810ea4c`. El [run 42332492067](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/42332492067) pasó contratos, concurrencia sintética y ambos motores. Alias, recetas, mensajes/lecturas, texto seguro, borrador/cancelación, preservación personal, revocación y logout pasaron sin errores JS, solicitudes externas ni desborde horizontal. Se inspeccionaron las capturas de ambos motores. Las capturas largas móviles muestran barras fijas sobre contenido al momento del scroll y WebKit recorta el nombre largo del selector: no se demostró bloqueo funcional, pero no es certificación visual exhaustiva de todas las posiciones. Esto no acredita API, SDK o datos reales; Back/Forward y bfcache integrados tienen cobertura Node, no una nueva certificación visual de historia. La Mac no queda ocupada por este trabajo.
- SDK real contra API privada, grants alojados, onboarding/OTP, versiones legales reales, paridad ICU, reconciliación tras reinicio y aceptación de producción siguen fuera de esta entrega.

## Ejecución reproducible

El workflow existente verifica base exacta, allowlist de fuentes, contratos, regresiones y assets. Se amplía dentro de sus mismos jobs para las pantallas nuevas; no agrega servicios externos. El modelo PostgreSQL sintético existente permanece idéntico al commit base de esta extensión. El job correspondiente fija esos dos archivos; las modificaciones intencionales de runtime se validan en los otros jobs.

```sh
node --test efg-nutrition/tests/dual-workspace-*.test.mjs efg-nutrition/tests/professional-screens-*.test.mjs
NCC_R4_SYNTHETIC_FULL_APP=1 NCC_BROWSER=chromium node efg-nutrition/tests/professional-screens-fullapp-browser.mjs
```

Las pruebas de doble espacio requieren los inputs públicos `NCC_R4_BASELINE_ROOT` y `NCC_R4_BASE_TREE_JSON`, preparados por CI. El runner de navegador usa Playwright existente o `NCC_PLAYWRIGHT_MODULE`; nunca debe apuntarse a un servicio alojado. Cada ejecución cierra únicamente sus contextos, navegador y servidor propios.
