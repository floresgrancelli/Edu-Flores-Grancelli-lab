# Nutrición Con-Ciencia · UAT mínima y corte seguro del piloto
**03/11/2026 (Argentina) · PR #43 DRAFT · rama release/ncc-pilot-fast-track-20261102.**
**Procedimiento de prueba, NO acta aprobada ni autorización para actualizar.** La revisión definitiva siempre debe registrar el SHA del HEAD efectivamente probado (al crear este documento: `3ec25bcc682c9830b7cb805ab455e4eab7c650d7`).

## Fuente y alcance
El recorrido vigente es el de «RECORRIDO DEFINITIVO 02-11», «GO PILOTO 02-11» y «Control QA» del Plan Maestro. Los protocolos de octubre que citan cinco comidas o un entorno alojado pago son **históricos**; no sustituyen las decisiones actuales.
- La **Dieta Guía se genera automáticamente como borrador privado** desde la ficha vigente compartida, el objetivo de kcal/macros calculado y el perfil alimentario; comienza con seis horarios. El coach **revisa y aprueba expresamente** la propuesta tal como está o modifica ingredientes, recetas, cantidades y horarios, con recálculo antes de aprobar. Puede generar otra versión CO-05 semanas después. **Generar no es publicar**: la publicación atómica exige su confirmación, fuentes verificadas de la selección efectiva y permisos vigentes. **Mi Día conserva siempre seis horarios** y no registra automáticamente comidas sugeridas.
- Conservar íntegros catálogo, recetas, metas, diarios, informes, mensajes y pagos. Semáforo orientativo, no bloqueante. Datos sanitarios sensibles, Autogestión y clínica avanzada OFF.
- Render https://efg-nutrition.onrender.com/pilot/ continúa en SHA productivo `9000e4d8e08bd9483770209a863b1cdba2141c43`; **no probar la nueva candidata contra esa URL**.

## 1. Qué podemos verificar gratis ahora
En la rama candidata y los ejecutores **ya existentes**, sin crear infraestructura:
- Seis GitHub Actions de un **mismo SHA**: Premium QA, Seguridad, PostgreSQL descartable, Educación, Visual Chromium/WebKit y Auth local JWT/RLS con GoTrue/PostgREST.
- SDK E2E descartable de 390/1280 px: OTP local, introducción, aceptaciones **sintéticas solo locales**, ficha, Coach A/B, publicación atómica v2 con seis horarios, readback del alumno y conservación del diario.
- Premium QA: primer alimento al primer toque, sushi por piezas, múltiples habituales y recuperación, búsquedas/autocompletado, recetas por porción, fallos de persistencia y reconexión, IME/Gboard emulado, scroll, sesión A→B→A, respuestas desordenadas y cambio a medianoche.
- Etiquetar pruebas automatizadas como **LOCAL/CI**. No declararlas JWT hosted, aceptación de usuarios reales ni UAT en dispositivo físico.

## Revisión nutricional de la guía generada automáticamente
El coach recibe una **propuesta automática**, ajusta alimentos, recetas, porciones u horarios y la guarda como borrador privado. La exportación de fuentes se realiza sobre **ese borrador revisado**, sin pedir que el coach construya manualmente el menú. El operador coteja únicamente los alimentos e ingredientes incluidos. En recetas compuestas como tartas, pizzas, sushi, budín o ensalada de frutas, un expediente adicional `recipe-component-review-worklist.csv` enumera los ingredientes del modelo, sus cantidades orientativas y los proxies sin ficha del catálogo. Los modelos no son análisis nutricionales ni autorizaciones.

La hoja de componentes y la de fuentes principales conservan decisiones humanas en blanco, huella de selección exacta, estado PENDING y cero aprobaciones. Si el coach cambia porciones o el modelo de receta cambia, el expediente debe generarse nuevamente para esa versión. El catálogo visible de alimentos no se limita ni se modifica.

## 2. Plan mínimo de UAT en equipos reales — SIN EJECUTAR
El propietario o tester autorizado debe usar **iPhone Safari/PWA, Android Chrome/Gboard/PWA y escritorio**, después de autorización expresa para disponer de la candidata en un entorno habilitado y sin gastos adicionales. No introducir fichas clínicas reales ni credenciales en capturas.

Registrar en cada caso: ID, fecha/hora ART, equipo, SO, navegador/PWA, SHA/URL servido, identidad ficticia y rol, PASS/FAIL/BLOCKED/NOT RUN, pasos observados y evidencia desidentificada.

| ID | Prueba de usuario | Criterio de éxito |
|---|---|---|
| UAT-N01 | Nuevo/existente: invitación, OTP, ocho pantallas una sola vez, Términos+Privacidad por separado, ficha y permiso de compartir | Sin casillas premarcadas; espera del coach; historia intacta |
| UAT-N02 | Coach recibe ficha; confirma/ajusta objetivo; pulsa Generar y recibe una Dieta Guía AUTOMÁTICA de seis horarios. Puede aprobarla sin cambios o reemplazar alimentos/recetas, variar gramos y reducir 6→5→4 | Debe salir de la ficha y objetivos actuales sin construir un menú desde cero; edición recalcula, preserva catálogo íntegro y no registra consumo ni publica por sí sola |
| UAT-N03 | Coach verifica el borrador automático final y da visto bueno explícito antes de publicar objetivo+guía+acceso+aviso. Luego renueva 2.500→2.100 kcal o solo el menú (CO-05) | Generación o guardado privado NO publican; confirmación y revisión de fuentes seleccionadas preceden una sola transacción atómica; el alumno ve la versión vigente y conserva todo el historial |
| UAT-N04 | Mi Día registra primer desayuno, segundo almuerzo y sushi de 3 piezas en cena | Guarda al primer intento sin duplicar; seis horarios permanentes, kcal/macros y piezas coherentes |
| UAT-N05 | Guardar dos habituales diferentes en el mismo horario, cerrar y volver a entrar; recuperar al día siguiente | Ambos nombres, ingredientes y porciones correctos; sin reapariciones de borrados |
| UAT-N06 | Autocompletar sin tilde/con tilde, seleccionar y editar, receta Fit/propia por media porción, simular en Planificador | No se pierde selección/teclado; no duplica nutrición; simulación NO es registro |
| UAT-N07 | Android Chrome + Gboard: teclado, gestos, scroll hasta último botón, cambio de pestaña y PWA | Último botón accesible y borradores conservados |
| UAT-N08 | iPhone Safari/PWA: primer toque, selector de comidas, scroll y retorno a app | Sin borrado del primer registro ni apertura espuria del selector |
| UAT-N09 | Sin conexión, reconectar, doble toque, cambio de cuenta A/B y paso de día | Cero falsas confirmaciones, cruces entre usuarios o duplicaciones |
| UAT-N10 | Escritorio y smoke de informe Luxury Pro, notificaciones, mensajes y pagos ficticios | Sin regresiones de privacidad, datos ni experiencia |

**Todo UAT-N01…N10 queda NOT RUN hasta su ejecución real.** Si la app nueva no está alojada, la prueba física del recorrido nuevo permanece BLOQUEADA, no se simula desde Render productivo antiguo.

## Preparación de versiones sin GO (paquete NO ejecutable)
El HTML actual usa una versión de octubre y el módulo principal importa múltiples dependencias con identificadores propios. Un cambio de versión únicamente en el HTML no alcanza para renovar toda la caché de JavaScript de un teléfono. **No modificar estos identificadores todavía en la candidata: se cambian en un corte coordinado y autorizado.**

Para comprobar el inventario sin escribir:
```bash
node efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs --check
```
Solo cuando exista SHA definitivo y para producir una propuesta **fuera del repositorio**, sin aplicar nada:
```bash
node efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs --emit \
  --ack=PREPARE_ONLY_NOT_GO --expected-sha=SHA_COMPLETO_REVISADO \
  --build=ncc-pilot-PRIMEROS_12_CARACTERES_DEL_SHA \
  --out=/tmp/ncc-pilot-pre-go-review
```
El comando exige que el SHA coincida con el checkout y produce `review-manifest.json`, un `index.html` propuesto y versiones de los módulos importadores que necesitan `?v=` nuevo; incluye dependencias anidadas y estilos. Las hojas fuente NO se editan ni se publica el paquete. El CI Premium comprueba el modo solo lectura, el paquete temporal y el rechazo de SHA incorrecto, sin tocar Supabase ni Render. Después del GO, revisar este artefacto y aplicar de forma controlada antes de comprobar el SHA realmente servido.

### P20 · Propuesta de activación UI, SIN GO ni despliegue
El recorrido definitivo tiene **una sola ruta de ingreso**: `COACH_STUDENT_JOURNEY_ENABLED`. Nunca activarlo a la vez que `COACH_RELAUNCH_ONBOARDING_ENABLED`: la aplicación lo rechaza expresamente. Para un piloto con ficha vigente, Términos y Privacidad separados, guía automática y visto bueno del coach, el paquete revisable habilita **solo en la propuesta externa** estos seis switches:
`COACH_STUDENT_JOURNEY_ENABLED`, `COACH_ATOMIC_PLAN_UI_ENABLED`,
`COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED`,
`COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED`, `LEGAL_ONBOARDING_ENABLED`
y `COACH_SHARED_STUDENT_RECIPES_UI_ENABLED`. La versión de ficha se deriva automáticamente de la ruta de ingreso; nunca editarla a mano.

El relanzamiento de notificaciones forzadas depende de un manifiesto firmado real; por ahora `MAJOR_RELEASE_FLOW_ENABLED` y `RELEASE_COMMUNICATIONS_ENABLED` continúan OFF. También permanecen OFF la ruta alternativa, los módulos clínicos privados, Autogestión, el motor privado de guía y la promoción de coaches POST-GO. `FOOD_COMPATIBILITY_ENABLED` mantiene su estado orientativo existente. **Ningún interruptor de cliente sustituye la autorización o los controles del servidor.**

Para inspeccionar la combinación segura, sin cambiar un byte del checkout:
```bash
node efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs --check
```
Para emitir únicamente un expediente de revisión externo con HTML, assets y switches propuestos en conjunto:
```bash
node efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs --emit --pilot-ui-draft \
  --ack=PREPARE_ONLY_NOT_GO --expected-sha=SHA_COMPLETO_REVISADO \
  --build=ncc-pilot-PRIMEROS_12_CARACTERES_DEL_SHA \
  --out=/tmp/ncc-pilot-ui-activation-review
```
**La salida NO ES UN DESPLIEGUE.** El manifest deja explícito que falta GO, huella final de alimentos revisados, prueba alojada de identidad/compartir/OTP/RLS y las dos flags privadas del backend. Sin verificar primero esos requisitos y la secuencia de publicación, está prohibido aplicar la propuesta a la rama productiva. El alumno debe aceptar realmente los avisos al entrar; no generar aceptaciones previas ficticias.

### P21 · Arranque real del paquete temporal en navegadores
Además de comprobar que los seis flags propuestos aparecen en el paquete, Visual QA sirve **ese mismo overlay externo** (HTML, CSS, JS importadores y flags) a Chromium móvil y Safari/WebKit móvil, con un SDK ficticio y cero solicitudes al backend alojado. Comprueba que la pantalla de ingreso funcione, que el grafo de 90 módulos resuelva sin errores, que los seis switches estén ON solo en el overlay, que los siete módulos excluidos permanezcan OFF y que un visitante sin autenticar no vea el diario. Ejecutar `EFG_QA_P20_OVERLAY=1 node efg-nutrition/tests/ncc-pilot-pre-go-browser-boot.mjs` dentro del CI Visual, repitiendo con `EFG_QA_ENGINE=webkit` tras instalar WebKit.

**Esto es un ensayo de arranque de frontend, no un ingreso con OTP ni UAT física/alojada.** No produce aceptación legal, aprobación nutricional ni habilitación de flags privadas del backend. La prueba del SDK local con identidades y datos ficticios continúa separada.

### P22 · Acoplamiento del overlay P20/P21 con módulos reales (SINTÉTICO, NO GO)
El CI Visual ejecuta `EFG_QA_P20_OVERLAY=1 EFG_QA_P22_FLOW=1 node efg-nutrition/tests/ncc-pilot-pre-go-browser-boot.mjs` en Chromium y WebKit: el servidor sirve **exactamente el overlay temporal versionado** y el archivo `tests/ncc-pilot-pre-go-browser-flow.mjs` importa desde el navegador los módulos reales de educación, textos piloto, recorrido, motor flexible y cliente de borradores/confirmación del coach. Los intercambios de identidad/documentos/almacenamiento usan un **adaptador ficticio en memoria**; ni siquiera las aprobaciones simuladas son decisiones de humanos. El entorno prohíbe las llamadas a Supabase o Render alojados y verifica que los interruptores originales sigan OFF.

Regresiones nuevas de este lote: ocho pasos educativos y recibo ficticio una sola vez; avisos de Términos/Privacidad inicialmente desmarcados e independientes; compartir opcional y pantalla de espera; seis horarios autogenerados desde objetivo sintético de 2.500 kcal; edición conservando el primer borrador; guardado privado y publicación prohibida sin `confirmed:true`; renovaciones CO-05 de 2.500→2.100 kcal y de menú solamente conservando versiones anteriores; cambio de sesión entre coaches sin recuperar el borrador anterior; ninguna llamada para registrar consumo. **La prueba no certifica OTP, RLS real ni atomicidad PostgreSQL**, que siguen cubiertos por el SDK/GoTrue/PostgREST/PG descartables existentes y deben leerse sobre **el mismo SHA**. Tampoco equivale a UAT física ni a JWT/consentimientos reales alojados.

**Fuentes nutricionales:** seguir utilizando `tools/prepare-ncc-source-review-batch.mjs` sobre la selección final del coach, con `selectedGuideFingerprintSha256`, `recipeComponentsFingerprintSha256`, fuente/identidad/preparación/unidad, cantidades, diferencias por 100 g o ml y decisiones humanas PENDING. El resultado ficticio de P22 **no** desbloquea la revisión alojada 23/24 ni aprueba ningún alimento. Cuando exista borrador definitivo autorizado, generar el expediente específico y obtener firma humana de cada ingrediente/receta seleccionados.

## 3. Secuencia de GO y reversión — preparar, NO ejecutar
1. Verificar SHA final de PR43, 6/6 CI y estado productivo. Mantener sin merge/despliegue y detectar cambios de otros ejecutores. Conservar hashes/estado base sin alterar datos reales.
2. El sistema genera la Dieta Guía automáticamente en **borrador privado** desde la ficha nutricional vigente y las metas calculadas/ajustadas. El coach la revisa y **da el visto bueno o modifica** alimentos, recetas, gramos y horarios; se recalcula sin tocar Mi Día. Solo sobre los ingredientes que quedan en ese borrador final —incluidos componentes expandidos de recetas— generar `operator-review-worklist.csv` con huella `selectedGuideFingerprintSha256`. Un revisor humano autorizado verifica identidad, preparación, unidad, kcal/P/HC/G/fibra, fuente y diferencias. **Nunca aprobar alimentos automáticamente**, ni convertir la lista de fuentes revisadas en una lista blanca del catálogo. La aprobación del coach para publicar es posterior a esa verificación y no se presume por haber generado la guía.
3. Preflight alojado **READ ONLY**. Según registro del 03/11, migraciones estructurales ya instaladas, 23/24 checks correctos, único pendiente de fuentes sin revisión humana, avisos de piloto simples ya publicados, `pilot_coach_atomic_publication=false` y `pilot_student_diary_write_gate=false`. **No reinstalar** SEC09/OPT01/FOOD/COACH119/COACH116/GU06 ni inferir disponibilidad desde tests locales.
4. Aceptaciones piloto verdaderas, consentimiento sanitario específico si corresponde, permisos RLS/JWT de cuentas autorizadas y pruebas cross-org deben verificarse antes de habilitar usuarios. No crear cuentas ni consentimientos simulados alojados sin autorización.
5. **GO expreso del propietario** para operaciones alojadas, flags, merge y despliegue. Render puede auto-desplegar desde `efg-nutrition-app`: un merge no es prueba informal y NO está autorizado aún. Activar backend verificado antes de abrir UI, con manifest versionado y secuencia coordinada.
6. Después de actualizar con GO: verificar SHA realmente servido, guardado de Mi Día e históricos, ejecutar UAT mínima y registrar incidentes. Ante falla crítica: detener nuevas escrituras/flags y volver al frontend previo únicamente mediante operación autorizada; nunca borrar ni recrear datos/guías/recibos. Revertir frontend no revierte cambios de esquema ni compras.
7. Ensayo integral de restauración DB/Auth/Storage y verificación de bytes físicos privados sigue **diferido por decisión del propietario**, no declarar probado lo que no se ejecutó.

**Dependencias humanas finales:** visto bueno del coach sobre la **propuesta autogenerada** (con las modificaciones que decida), revisión humana nutricional **solo de los ingredientes resultantes** y recetas expandidas, cuentas/aceptaciones autorizadas en alojado, interacción física en equipos y GO expreso. El coach **no crea manualmente el menú desde cero**. Sin servicios ni ramas pagos adicionales.
