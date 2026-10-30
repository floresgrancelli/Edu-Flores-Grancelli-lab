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
