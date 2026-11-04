# P28 — Recuperación de la candidata después del rollback

Fecha de referencia del trabajo: 3 de noviembre de 2026, Argentina. Base revisada: `f2efe5ad895a8672a8a60bbb0a156d7e86bf0178`, PR53 DRAFT. Este informe describe el cambio que lo contiene; no autoriza publicación.

**NO GO para volver a publicar.** Se corrigió el ingreso con el recorrido nuevo apagado. El circuito obligatorio de restricciones todavía no puede funcionar en Supabase alojado y el semáforo del diario no está conectado a ese circuito. No se fusionó, desplegó, activó ningún interruptor ni escribió en datos de alumnos.

## Cambios ejecutados

- `pilot/coach-intake-flow.js`: las rutas con interruptores OFF ya no consultan `efg_student_intakes`. El backend legacy solo puede solicitarse explícitamente para los ensayos históricos. Se impiden guardado, borrado y publicación legacy por esa ruta predeterminada. Un alumno sin fila de acceso, con el relanzamiento apagado, no recibe un estado pendiente inventado; los estados pending/published existentes se conservan tal como los devuelve el servidor. Con el recorrido nuevo ON, un error de tabla obligatoria detiene la operación: no se degrada silenciosamente a acceso antiguo.
- `pilot/pilot.js`: la consulta autorizada del coach a restricciones depende del permiso/interruptor de declaración básica, no del módulo clínico avanzado. Ambos siguen OFF. Se conservan los controles de identidad, organización y consentimiento del lector.
- `tests/ncc-p28-hosted-entry-compatibility.mjs`: regresión del esquema alojado con transporte sintético: ausencia de llamadas legacy, cuentas existentes sin fila, estados explícitos, bloqueo de escrituras legacy, error de permisos y cambio A→B durante lectura.
- `tests/coach-versioned-journey-integration.mjs`: errores de esquema obligatorio en alumno, listado y detalle del coach deben propagarse.
- `tests/coach-intake-flow.mjs`: el ensayo histórico solicita su backend antiguo explícitamente; no lo presenta como esquema alojado actual.
- `.github/workflows/efg-nutrition-premium-qa.yml`: incluye la nueva regresión en CI.

## Compatibilidad alojada: comprobada y límites

Se consultaron exclusivamente metadatos, definiciones de funciones, interruptores y metadatos de los avisos piloto. Se conservaron los resultados de 29 tablas públicas EFG con columnas y RLS, 44 funciones públicas EFG con argumentos/permisos, 60 políticas y 76 grants. Las 69 consultas SELECT literales localizadas no piden columnas ausentes en las tablas que sí existen. El inventario no prueba por sí solo consultas dinámicas, exposición efectiva en PostgREST, éxito de escrituras ni aislamiento firmado entre personas.

| Circuito | Resultado alojado comprobado | Falta real |
| --- | --- | --- |
| Perfil / ficha general / acceso | `efg_profiles`, `efg_coach_relaunch_intakes`, `efg_student_plan_access` presentes | Recorrido autenticado de nueva ficha y publicaciones |
| Tabla legacy del incidente | `efg_student_intakes` ausente | Ruta predeterminada corregida; nunca crearla para tapar el error |
| Educación | Tabla de recibos y `efg_ack_science_intro` presentes, RPC sin permiso anon | Recibo firmado mediante UI de candidata |
| Términos / Privacidad | Dos documentos current `pilot_20261102_v1`, hashes presentes | Aceptación real separada, persistencia y reingreso |
| Restricciones básicas | Faltan `efg_current_coach_health_document`, `efg_get_coach_health_intake`, `efg_declare_no_restrictions`, `efg_submit_coach_health_intake`, `efg_revoke_coach_health_intake`; no tablas privadas de salud instaladas | Validar el paquete existente en entorno aislado antes de proponer instalación; consentimiento y lectura/revocación reales |
| Plan atómico / historial | Guardado de borrador, publicación, historial privado y triggers presentes; verificador admite flexible V2 de 2–6 horarios | Switch de publicación OFF; ensayo firmado de escrituras pendiente |
| Restricciones al publicar | El cuerpo de la publicación alojada revisa ficha general, permisos y fuentes; no vincula una revisión sanitaria vigente | Completar validación servidor de declaración/cambio/revocación antes de admitir plan basado en restricciones |
| Diario | Tabla y trigger de acceso presentes; switch `pilot_student_diary_write_gate=false` | No afirmar bloqueo operativo alojado mientras esté OFF |

Las 44 funciones públicas EFG inventariadas no conceden EXECUTE a anon. Esto no sustituye el ensayo de autorización de sus cuerpos. El expediente conserva las políticas y definiciones para revisar exactamente el contrato; no contiene fichas, recetas, comprobantes o diarios de personas.

No reaplicar el parche histórico P25 del verificador V2: la función alojada ya acepta `flexible_meal_guide`. No reabrir legales comerciales: los dos avisos simples ya están vigentes.

## Educación: ocho originales y serotonina

El JPEG del propietario está disponible y fue inspeccionado: collage 4×2, portada, calorías, macronutrientes, proteína/entrenamiento, consumo excesivo, hidratos, combinación diaria y conclusiones. SHA256 verificado: `4ca3067e7508cf7e887422d0c8b375c6b3a71e563231f06e4ad3e186f802f2b4`. No se modificó.

La novena pantalla de serotonina y los ocho recortes mantienen la implementación de PR53. Evidencia visual previa del mismo archivo/módulo sin cambios: [run 41745089305](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/41745089305), Chromium/WebKit sintéticos. No se repitió esa prueba sin delta. `SCIENCE_WELCOME_ENABLED=false`; no se certifica acceso real ni aceptación del propietario por esta evidencia.

## Pruebas ejecutadas y no ejecutadas

Diez suites locales dirigidas PASS; salidas en `p28-targeted-tests.json`. Incluyen las dos rutas de ficha, permiso sanitario separado, restricciones desconocidas versus ninguna, guía flexible de seis horarios, recálculo y elecciones fijas, revisión 2500→2100 y misma energía, habituales y carreras de escritura al cambiar de cuenta. La ampliación de errores de esquema en ruta ON se ejecutó nuevamente después de modificarla y pasó.

Estas suites ejecutan código real con transporte sintético. No son una escritura alojada ni un ensayo PostgreSQL nuevo. Los seis CI de la base f2efe5a se verificaron SUCCESS sin volver a iniciarlos. El commit de esta corrección requiere los CI de su propio HEAD: nunca heredar automáticamente el 6/6 anterior.

Cloud Browser abrió la URL de producción y mostró una sesión ya autenticada **NCC QA Coach B**, rol Entrenador, cero alumnos. No se asumió la cuenta de Edu, no se inició OTP, no se introdujeron códigos ni se crearon cuentas. Esto confirma solo acceso de lectura a la versión recuperada para esa sesión. No verifica alumno nuevo, ficha, publicación ni Mi Día de la candidata. No se realizaron pruebas en dispositivos físicos.

La rama de producción fue consultada en GitHub y conserva `ab7c241cdfa376cab9954fc9b8f12750d2f905d7`. Render no tenía workspace seleccionado; se identificó un único workspace disponible, pero no se cambió el contexto ni se reconsultó LIVE sin confirmar la selección. LIVE es antecedente del rollback, no una verificación Render nueva de esta etapa.

## Matriz y bloqueantes específicos

`MATRIZ_55.md` y `matrix-55.json` contienen los 55 IDs canónicos, estado de código, backend, flags, pruebas, evidencia y pendiente. Distinguen explícitamente referencia histórica de prueba ejecutada aquí. No equivalen a certificar las 55 mejoras.

1. Falta el backend de restricciones básicas con consentimiento separado; no inferir «ninguna» de una ficha general vacía.
2. `foodTrafficLight()` aún no recibe restricciones sanitarias del alumno en Diario/Planificar. La UI del semáforo por patrón existe, pero esa integración sigue parcial. La guía usa otro motor; no confundir ambos circuitos.
3. La publicación necesita vincular y revalidar la declaración sanitaria actual en el servidor. Un control exclusivamente frontend no resuelve revocación o cambio de restricciones.
4. Los interruptores principales del frontend y los dos del servidor permanecen OFF. No basta desplegar estos archivos para activar la Gran Actualización.
5. Faltan selección/revisión humana de alimentos efectivamente elegidos y E2E alojado de escritura con actores y alcance autorizados. No se inventaron firmas.

## Propuesta concreta de prueba guiada antes del nuevo despliegue

Primero completar los tres bloqueantes de restricciones en un entorno descartable con datos sintéticos y esquema fiel, sin recursos facturables. Mantener el rollback disponible. Reutilizar las cuentas QA existentes solamente después de confirmar sus identidades, organizaciones y autorización de escritura; su nombre no constituye permiso.

Preparar una vista de la candidata aislada de producción. Edu revisa nueve pantallas y después el flujo con un alumno QA nuevo y uno existente: dos avisos desmarcados, declaración sanitaria separada, ficha, espera y recepción del coach. El coach genera seis horarios, sustituye alimentos y recetas, fija cantidades, elimina un horario, revisa desvíos y aprueba explícitamente. Ensayar publicación conjunta e idempotente, cambio/revocación de restricciones, denegación entre organizaciones y nueva versión 2500→2100 conservando anterior.

Finalmente, en esa misma prueba autorizada: Mi Día mantiene seis horarios, primer alimento, habituales tras reingreso, sushi por piezas, recetas y Balance restante; la guía no aparece como ingesta. Probar móvil y escritorio emulados indicando esa condición. La UAT física completa sigue en el alcance posterior acordado; la revisión guiada mínima del propietario precede al nuevo GO.

Solo entonces presentar el SHA exacto, flags propuestos y resultados para pedir **una nueva autorización de publicación**. El GO revertido del 3/11 no se reutiliza.
