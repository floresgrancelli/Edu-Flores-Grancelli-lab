# COACH-RELAUNCH · Reingreso de todos los alumnos piloto con ficha nueva

**Fecha:** 30/10/2026  
**Producto prioritario:** EFG Nutrition **Coach** (Alumno, Coach, Admin)  
**Prioridad:** CRÍTICA, requisito bloqueante del relanzamiento único.  
**Estado:** especificación de desarrollo en PR #37 DRAFT; NO se publicó.

## Decisión del propietario

En la **gran actualización de Nutrition Coach**, cada alumno que hoy está probando la app (también quien tiene su cuenta desde antes, con plan, históricos y ficha previa) **deberá ver la nueva ficha nutricional inicial cuando vuelva a iniciar sesión**, como si recién comenzara a usar el nuevo circuito. Deberá ocurrir **además** de la aceptación de las versiones vigentes de Términos y Privacidad; no es suficiente que el alumno ya haya iniciado sesión o completado una ficha antigua.

**Orden de experiencia:** validar OTP y rol real → presentar/registrar la aceptación explícita de Términos y Privacidad si corresponde → presentar **ficha nutricional Coach nueva para esta versión** → permitir revisar/completar y guardar la ficha con consentimiento de compartir **independiente** → luego navegación normal del alumno. Un historial previo de plan publicado NO omite la nueva ficha. En el primer ingreso posterior a la actualización, nunca caer directamente en «MI DÍA» por tener un plan antiguo.

### Requisitos innegociables

- La ficha aparece para **alumnos existentes y nuevos**, incluidos alumnos piloto de Coaches, al primer acceso verificado a la versión mayor; no se activa para Coaches o Admins. Usar la misma versión de ficha al reingresar hasta que complete/revise el paso; no repetir indefinidamente una vez verificada en el servidor esa revisión concreta. Cualquier nueva versión mayor posterior tiene su propio marcador.
- Para **probar desde cero**, mostrar los controles de la nueva ficha como **nuevos/vacíos** si sólo existe una ficha de versión antigua. No dar por terminado el paso por el `shared_at` de la ficha antigua ni preseleccionar restricciones, consentimientos o datos sensibles. Mantener los registros previos sin borrarlos silenciosamente.
- La ficha debe tener datos nutricionales generales, objetivos, antecedentes/restricciones declarados con controles clínicos (celiaquía, diabetes, hipertensión, colesterol elevado, hígado graso, alergias, vegano/vegetariano, etc.). El área médica necesita revisión profesional, base legal adecuada y consentimiento separado: **nunca recopilarla o distribuirla sin garantías**. Los campos clínicos no se vuelven obligatorios por reingreso; permitir no declarar datos sensibles y respetar derechos de acceso/eliminación.
- La ficha guardada/compartida **viaja al Coach únicamente cuando el alumno autoriza compartir**, bajo permisos server-side de organización/rol y RLS, y el coach la revisa antes de proponer objetivo/calculadora y guía de cinco comidas. El OTP y la aceptación de términos no equivalen a consentimiento de seguimiento ni de compartir información.
- Preservar IDs, cuentas, planes, peso, diarios, habituales, pagos, mensajes, consentimientos históricos y progresos, sin reiniciar la base de datos. No volver a publicar un plan automáticamente ni sobrescribir el objetivo aprobado por cargar la ficha. No invalidar el acceso a datos propios por negar compartir información clínica.
- Alumnos con sesión recordada o PWA instalada: validar el requisito al **abrir la actualización** también, no solo en un evento técnico de logout/login. El servidor decide qué versión fue confirmada; `localStorage`, cookie o estado del cliente **no** son prueba de revisión.
- Para un alumno que conserva plan publicado, la nueva ficha es un **paso de reintroducción/revisión**, no un borrado de plan ni una despublicación. La guía y objetivo previo siguen visibles al terminar el reingreso, salvo cambio explícito y aprobado del Coach.
- Revisa todos los perfiles desde el mismo despliegue: Admin/Coach mantienen permisos normales, pero todos los alumnos piloto prueban el circuito completo desde su punto de entrada, sin tocar los módulos aislados de **Nutrition Autogestión**. **Autogestión queda en PAUSA** hasta cerrar Nutrition Coach.

## Criterios de aceptación QA del lanzamiento

1. Alumno piloto con plan e histórico y ficha antigua → acepta documentos nuevos por separado (si aplica) → **ve la ficha nueva sin datos prellenados de la versión anterior** → guarda datos generales/autoriza o no compartir; continúa con registros conservados. Al reabrir con revisión actual guardada no la repite.
2. Alumno piloto sin plan/ficha previa → ve nuevo ingreso Coach sin perder su vinculación con el coach; flujo de creación/plan revisado.
3. Alumno que no quiere enviar datos al Coach → puede guardar ficha privada o marcar no compartir; ningún dato llega al Coach. Los datos médicos no son forzados.
4. Alumno con documento legal pendiente/rechazado → el aviso legal se gestiona antes de ficha, sin aceptar ni compartir implícitamente; no se borran sus registros propios.
5. Alumno con sesión previa/PWA antigua → tras actualizar o recuperar sesión se aplica exactamente el mismo gate versionado.
6. Alumno en organización A → el coach de B, admin no autorizado u otro alumno no pueden leer ficha privada ni marcar el paso completado por él.
7. Reintentos, conexión interrumpida, navegación atrás, cambios en otra sesión y doble envío → el backend conserva versión y revisión de forma idempotente, sin perder datos existentes ni repetir notificaciones innecesarias.
8. Verificar iPhone y Android reales, PC, UI premium, lectores de pantalla, notificación de actualización, términos, flujo Coach→calculadora→guía→aprobación, mensajes, pagos y restauración antes del GO.

## Implementación que falta

Definir y probar en staging fiel **marcador server-side versionado de revisión de ficha Coach**, con restricciones/RLS por `auth.uid()`, revisión de documento legal vigente y control de concurrencia. No confiar solo en la existencia de `efg_student_intakes` ni en `efg_student_plan_access.status='published'`. Gate de rutas y registro del nuevo esquema deben ir detrás de un flag OFF mientras no se completen DB, legal, UX, QA y migración segura. No ejecutar scripts de reinicio masivo ni borrar cuentas/datos en Supabase real.

**Cambio de prioridad aprobado:** finalizar Nutrition Coach (ficha/reingreso, calculadora, guía, comidas, habituales, catálogo, restricción/semáforo revisado, mensajería, pagos, visual y seguridad). Posponer trabajo de desarrollo funcional de Nutrition Autogestión; dejar sus commits ya existentes intactos, desactivados y sin desplegar.

## Implementación progresiva · 30/10/2026 · NUT-64 (candidata únicamente)

- `docs/COACH_RELAUNCH_REONBOARDING_STAGING_ONLY.sql`: migración nueva en tabla **separada** `efg_coach_relaunch_intakes`, PK por alumno + versión `coach_major_2026_r1`. Su revisión `revision` permite detectar envíos concurrentes sin sobrescribir; la ficha anterior permanece íntegra en `efg_student_intakes`. Sin INSERT/UPDATE/DELETE REST directo; sólo SELECT por RLS del alumno y SELECT del coach si el propio alumno compartió **y** mantiene consentimiento en la misma organización. RPC `efg_submit_coach_relaunch_intake` resuelve `auth.uid()`, estudiante activo, términos/privacidad **vigentes** y permiso para compartir; devuelve 409 por revisión obsoleta. Acepta campos generales y preferencias, **rechaza** `health_flags` y detalles clínicos no revisados. No emite avisos ni publica objetivos. Preflight obligatorio `efg_private.nut57_isolated_staging_marker`, ausente en producción.
- `pilot/coach-relaunch-entry-client.js`: lee primero el estado de ambos documentos legales, luego la ficha versionada de un **alumno Coach** solamente; ofrece formulario **nuevo** sin prefijar datos de fichas antiguas ni aceptar compartir por defecto. Una confirmación explícita hace RPC y exige lectura del resultado `revision=1` en el servidor. Si no hay versiones legales aceptadas, muestra estado bloqueado; **la experiencia jurídica final continúa incompleta**.
- `pilot/pilot.js`: puerta de reingreso integrada **sólo bajo** `COACH_RELAUNCH_ONBOARDING_ENABLED=false`, antes de cargar diarios y navegar en MI DÍA, de forma que también evalúe una sesión restaurada/PWA y un plan ya publicado. No interfiere con roles Coach/Admin ni habilita Autogestión.
- `tests/coach-relaunch-onboarding.mjs`, `tests/coach-relaunch-entry-client.mjs` en Premium QA. `tests/coach-relaunch-auth-local-e2e.mjs` en el workflow local firma JWT GoTrue para dos organizaciones y verifica propietario/coach ajeno, compartir explícito y revocable, legal anterior al guardado, HTTP 409, REST sin escrituras, restricciones del payload y conservación de registros ficticios. **Un test no sustituye escenarios visuales y móviles reales.**

**CI a verificar por SHA:** Primera ejecución local de la migración completó las sentencias SQL sobre contenedor descartable, pero falló la creación de una organización sintética por omitir su `name NOT NULL` en el fixture; **no fue un pase E2E**. Se corrigió el fixture y se están repitiendo los controles. Sin certificación clínica, jurídica o de esquema productivo. Nunca se aplicó a Supabase alojada ni a Render. Ninguna nueva ficha obliga al alumno a declarar condiciones médicas o compartir datos.

**Pendiente antes del GO:** reconciliar la nueva ficha Coach con la experiencia final de documentos legales vigentes y consentimiento sensible validado profesionalmente, adaptar correctamente la calculadora y la guía al nuevo origen de ficha, pruebas JWT/RLS del esquema final y dos organizaciones, revisión accesible/visual, PWA/Android/iPhone, restauración y SEC-08. Nutrition Autogestión permanece expresamente **en pausa**, con flags OFF.


### Evidencia adicional verificable · circuito Coach (30/10)

- La migración de ensayo y la batería GoTrue/JWT de dos organizaciones, retención de planes/diarios, permiso privado→compartido→revocado, acceso cruzado bloqueado, escritura directa REST bloqueada, términos/privacidad aceptados por separado y revisiones CAS de ficha fueron **SUCCESS** en la ejecución local `41034881265` (HEAD anterior `b84ceb018280704db1f1dd5ec448b51d32fe697e`). Las pruebas utilizaron solo identidades ficticias y SQL local; no se verificó paridad con Supabase alojada.
- `tests/coach-relaunch-visual-qa.mjs` agrega captura de formulario nuevo, estado legal y reintento a 320/390/430/768 px con Chromium y 390 px con WebKit; el workflow visual fue actualizado y la CSS `pilot/coach-experience.css` protege grillas y botones de 44 px. **El resultado final visual depende del HEAD y la ejecución específica.**
- El relanzamiento y la obligación de ficha nueva para pilotos todavía están bajo `COACH_RELAUNCH_ONBOARDING_ENABLED=false`; no hay permiso de publicar/activar ni garantía sobre material médico sin aprobación profesional. La interfaz del coach debe migrar la lectura a la tabla versionada y las aceptaciones legales finales requieren textos revisados y flujo de confirmación activo. Sin ello es **NO GO**, aun con 5/5 CI.


### Etapa posterior · lectura segura de la ficha nueva por el Coach

En `pilot/coach-intake-flow.js` (commit `7ad03de3`) la búsqueda de ficha propia y la lectura del coach ahora distinguen por bandera si deben consultar `efg_student_intakes` (circuito actual con bandera OFF) o **solo** `efg_coach_relaunch_intakes` con `completed_version='coach_major_2026_r1'`. Se mantiene la validación de coach/organización y el consentimiento de seguimiento mediante RLS; no se muestra un formulario antiguo que había quedado compartido como si fuera la ficha nueva. Se añadió un cierre preventivo: cuando se habilite el circuito versionado, la edición y el borrado **antiguos** no pueden tocar esa nueva ficha por accidente. Contratos regresivos en `tests/coach-relaunch-entry-client.mjs`.

**Bloqueo explícito:** aún falta una interfaz de edición y supresión específica de la ficha versionada que permita modificar la revisión actual y revocar compartición sin perder históricos; el guardado/borrado antiguos se bloquearon para evitar corrupción, NO constituyen UX terminada. Faltan reconectar con el coach la calculadora y la aprobación atómica de la guía que parten de esta fuente nueva, establecer documentos legales reales y revisión de datos médicos. Todo continúa OFF.

**CI verificado de un HEAD anterior:** `84f89529a9957acea4f6e4d9c04aef2287164104` completó **5/5 SUCCESS**, con Security `41035052987`, Premium `41035052943`, PostgreSQL `41035052953`, Auth JWT local `41035052927` y Visual Chromium/WebKit `41035052959`. Los cambios posteriores a ese SHA **requieren sus propios checks completos**; el pase anterior no habilita despliegue.


### COACH-65 · Corrección, privacidad y borrado de la ficha nueva (30/10/2026)

**Prioridad Nutrition Coach. Sin habilitar Autogestión.** La tabla `efg_coach_relaunch_intakes` de staging mantiene la misma versión al editar o retirar el permiso, pero incrementa `revision` mediante la RPC autenticada y un control compare-and-swap (HTTP 409 para revisiones obsoletas). No hay INSERT/UPDATE/DELETE directo del navegador.

- La pantalla del alumno `pilot/coach-relaunch-entry-client.js` puede mostrar la ficha de versión actual con campos previamente guardados **únicamente después de recuperar la fila propia y los documentos legales vigentes desde el servidor**. Al primer ingreso de cada versión permanece en blanco; una ficha vieja NO se precarga. En edición la casilla refleja el permiso que el alumno había concedido y puede desmarcarse.
- Acciones explícitas con confirmación: **«Retirar permiso de compartir»** conserva campos del alumno pero vuelve `shared_at` nulo; **«Borrar solo los datos de esta ficha»** envía los campos generales vacíos y revoca el permiso. El marcador técnico `completed_version`, `student_id` y `revision` se conserva para impedir una nueva obligación interminable de ingreso, y los objetivos, diarios, favoritos, pagos y mensajes de la persona siguen intactos. **No es eliminación integral de los datos personales antiguos**; otros derechos de supresión necesitan un circuito específico, aprobado y verificable.
- `pilot/pilot.js` pasa la pestaña `intake` por la nueva pantalla de revisión/edit cuando `COACH_RELAUNCH_ONBOARDING_ENABLED` se habilite. Los botones de revocar/borrar no aparecen por otro rol y los envíos pasan por la misma RPC y relectura. Con bandera OFF sigue funcionando el flujo antiguo sin cambios de producción.
- `tests/coach-relaunch-entry-client.mjs` valida edición, preservación de campos tras revocación, vaciado de campos, revisión incrementada, permiso visible, consentimiento por defecto desmarcado en el primer ingreso y rechazo de acciones implícitas. `tests/coach-relaunch-auth-local-e2e.mjs` añade pruebas con JWT firmados en la base descartable de edición, borrado, registro de versión retenido, bloqueo de DELETE REST, CAS y permanencia de `efg_student_intakes` histórico. `tests/coach-relaunch-visual-qa.mjs` incorpora escenario **edit** para Chromium/WebKit con campos y botón de revocación y vaciado, en pantallas estrechas.

**Pendientes estrictos:** no activar bandera hasta revisión legal y clínica de la ficha completa; los campos de condición médica no están almacenados en este prototipo por motivos de privacidad. Deben terminarse textos legales oficiales, esquema real y recuperación, permisos/jurisdicciones, conexión Coach→calculadora→guía y control de versiones PWA antiguo, pruebas de regresión, QA físico iPhone/Android. Los checks GitHub requieren cotejo **del último SHA**; no inferir seguridad de un PASS anterior.


### COACH-65 · Vinculación segura con la calculadora

Para que el alumno que ya recibió la nueva ficha no obtenga objetivos a partir de una ficha vieja compartida, se agregó un nuevo contrato a `pilot/coach-intake-prefill.js`: el parámetro opcional `requiredIntakeVersion` obliga a comparar **versión y revisión positiva** antes de precargar datos generales a la calculadora. `pilot/pilot.js` lo exige **solamente cuando la bandera de relanzamiento esté activa**, manteniendo compatibilidad con la modalidad Coach actual apagada. `tests/coach-intake-prefill.mjs` verifica que versión vieja, revisión cero/nula o permiso retirado se rechacen, y que la variable fisiológica necesaria siga seleccionándose manualmente. El prefill NO crea un objetivo aprobado ni publica una guía; el coach debe revisar la propuesta y el backend debe revalidar permisos de nuevo antes de cualquier publicación.

Nota de QA: hubo dos fallas de **fixtures/aserciones**, no de cálculos reales ni de permisos sobre hosted: el JWT E2E de borrado verificaba una ficha histórica que aún no se había creado como dato ficticio y se añadió esa fila de prueba (commit `fd07ef26`). Premium esperaba una cadena de importación antigua y se actualizó (commit `e9b70250`). Los cinco checks deben verificarse de nuevo en un mismo HEAD posterior a estas correcciones.


### COACH-66/67 · Cierre de hueco de publicación y aceptación legal verificada (30/10)

**Detección objetiva:** el SQL de borradores privados `docs/COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql` y el de publicación atómica `docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql` **todavía consultan `efg_student_intakes`, la ficha antigua**. Aunque la nueva pantalla y la calculadora lean `efg_coach_relaunch_intakes` por versión, eso no prueba que la RPC final de guardar/publicar apruebe la versión correcta. No se debe activar la nueva versión con esta inconsistencia.

**Corrección preventiva ya versionada:** `pilot/coach-release-plan-gate.js` crea `COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false` y prohíbe en modo relanzamiento los comandos heredados de aprobación de objetivo, guía, alimentos y publicación atómica; la función `createCoachPlanDraftClient()` también bloquea **antes de consultar ni escribir** con la base. `pilot/pilot.js` muestra un aviso claro de publicación retenida en vez de botones que no pueden funcionar. `pilot/coach-intake-flow.js` cierra la ruta antigua de publicar. `tests/coach-release-plan-gate.mjs` verifica bloqueo, cero operaciones y existencia de referencias SQL a la ficha antigua; su ejecución es obligatoria en Premium QA. **Con ambas banderas de relanzamiento y publicación en OFF, el piloto Coach antiguo no cambia.**

**Aceptación de documentos por versión:** `pilot/coach-legal-bridge.js` (flag adicional `COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED=false`) enlaza la UI legal existente con `efg_legal_current_status` y con dos textos reales de `efg_legal_documents`, exige correspondencia exacta por `document_id`, `kind`, `version` y `sha256`. Solo después de dos casillas marcadas y envío explícito usa la RPC `efg_accept_legal_documents`, **reconsultando ambas versiones en el servidor** antes de considerarlas aceptadas. Los textos se muestran con escape de HTML y no incorporan consentimiento para seguimiento ni salud. `tests/coach-legal-bridge.mjs` ejercita documentos publicados ficticios, cambios de versión, lectura incompleta, aceptación explícita y confirmación obligatoria del servidor; Premium QA requiere la suite. La bandera de aceptación general `LEGAL_ONBOARDING_ENABLED=false` sigue apagada.

**Importante:** el puente legal es **un módulo de prueba**, no está conectado al ingreso real. Los textos de Términos y Privacidad son borradores que requieren validación jurídica, responsable, domicilio y política de conservación, entre otros detalles. No se generaron aceptaciones para alumnos reales.

**Bloqueos REALES antes del GO de Nutrition Coach:**
1. Implementar y comprobar **en una base aislada restaurable** las funciones de guardado/publicación que verifican la ficha `coach_major_2026_r1` compartida con su `revision` exacta al momento de cada operación, autorización de su coach y permiso revocable, además de la vigencia de las dos versiones legales y los controles de catálogo/condiciones dietarias. Deben garantizar objetivo+guía juntos, versión optimista e idempotencia.
2. Integrar y revisar el texto definitivo y los flujos de consentimiento legal y de datos de salud (las condiciones clínicas no se aceptan ni almacenan todavía en la ficha nueva). Completar el onboarding OTP→documentos→ficha con prueba end-to-end de alumnos antiguos, nuevos y PWA con sesión recordada.
3. Preparar migración reversible de staging fiel y restauración/PITR con respaldo comprobado; auditoría de funciones `SECURITY DEFINER`/RLS con JWT multi-organización y permisos; confirmar todas las pruebas del **mismo SHA**.
4. Inspección real en iPhone/Android y navegador de escritorio, con visual de fichas, comidas, guía, mensajes, pagos, campana y actualización PWA. Los fixtures Chromium/WebKit no demuestran funcionamiento en dispositivos físicos.
5. Solo con evidencia de lo anterior y autorización del propietario solicitar GO; **NO merge, deploy, DDL/DML hosted ni reinicios de alumnos** mientras tanto.

La expectativa de completar hoy las tareas automatizables NO anula estas puertas de autorización profesional/legal ni garantiza una salida segura en la misma fecha.


### COACH-67 · Pantalla legal conectada bajo banderas OFF

En `pilot/pilot.js`, la ruta de reingreso de un **alumno Coach** ahora sabe presentar los textos actuales de Términos y Privacidad mediante `renderCoachLegalOnboarding()` y enviar las casillas marcadas con `acceptCoachLegalOnboarding()`; la pantalla vuelve a consultar la sesión y el estado legal en `refresh()` antes de permitir que se muestre la ficha nueva. El usuario no puede abrir «MI DÍA» ni la ficha cuando el servidor no confirmó la versión requerida. Se exige `COACH_RELAUNCH_ONBOARDING_ENABLED` **y** `COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED` además de `LEGAL_ONBOARDING_ENABLED`; todas siguen en `false` y la variante legal sin aprobar permanece bloqueada.

`tests/coach-legal-bridge.mjs` añade comprobaciones de que el ingreso ejecuta el puente solo tras el resultado `route='legal'`, exige confirmación expresa y reconsulta el servidor, y no se basa en una marca local. La conexión todavía no valida textos jurídicos reales y no fue probada con sesiones de usuarios de producción.
