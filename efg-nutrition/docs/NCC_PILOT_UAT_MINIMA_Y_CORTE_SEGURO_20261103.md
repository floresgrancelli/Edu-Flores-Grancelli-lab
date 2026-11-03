# Nutrición Con-Ciencia · UAT mínima y corte seguro del piloto
**03/11/2026 (Argentina) · PR #43 DRAFT · rama release/ncc-pilot-fast-track-20261102.**
**Procedimiento de prueba, NO acta aprobada ni autorización para actualizar.** El SHA válido es el HEAD actual de PR #43 verificado junto con sus seis workflows. P23 cerró sus seis controles locales sobre `7d8492a607e33f72ba22ceb82cb674aa0656320f`; cualquier edición posterior cambia el SHA y exige revalidar el nuevo conjunto. No confundir la propuesta temporal (siete flags ON) con las flags OFF que siguen en el código desplegable.

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
El recorrido definitivo tiene **una sola ruta de ingreso**: `COACH_STUDENT_JOURNEY_ENABLED`. Nunca activarlo a la vez que `COACH_RELAUNCH_ONBOARDING_ENABLED`: la aplicación lo rechaza expresamente. Para un piloto con ficha vigente, Términos y Privacidad separados, guía automática y visto bueno del coach, el paquete revisable habilita **solo en la propuesta externa** estos **siete** switches:
`COACH_STUDENT_JOURNEY_ENABLED`, `COACH_ATOMIC_PLAN_UI_ENABLED`,
`COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED`,
`COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED`, `LEGAL_ONBOARDING_ENABLED`
y `COACH_SHARED_STUDENT_RECIPES_UI_ENABLED`, más `SCIENCE_WELCOME_ENABLED` (las ocho pantallas educativas anteriores al consentimiento). La versión de ficha se deriva automáticamente de la ruta de ingreso; nunca editarla a mano.

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
En la revisión P23, además de comprobar que los siete flags propuestos aparecen en el paquete, Visual QA sirve **ese mismo overlay externo** (HTML, CSS, JS importadores y flags) a Chromium móvil y Safari/WebKit móvil, con un SDK ficticio y cero solicitudes al backend alojado. Comprueba que la pantalla de ingreso funcione, que el grafo de 90 módulos resuelva sin errores, que los siete switches estén ON solo en el overlay, que los siete módulos excluidos permanezcan OFF y que un visitante sin autenticar no vea el diario. Ejecutar `EFG_QA_P20_OVERLAY=1 node efg-nutrition/tests/ncc-pilot-pre-go-browser-boot.mjs` dentro del CI Visual, repitiendo con `EFG_QA_ENGINE=webkit` tras instalar WebKit.

**Esto es un ensayo de arranque de frontend, no un ingreso con OTP ni UAT física/alojada.** No produce aceptación legal, aprobación nutricional ni habilitación de flags privadas del backend. La prueba del SDK local con identidades y datos ficticios continúa separada.

### P22 · Acoplamiento del overlay P20/P21 con módulos reales (SINTÉTICO, NO GO)
El CI Visual ejecuta `EFG_QA_P20_OVERLAY=1 EFG_QA_P22_FLOW=1 node efg-nutrition/tests/ncc-pilot-pre-go-browser-boot.mjs` en Chromium y WebKit: el servidor sirve **exactamente el overlay temporal versionado** y el archivo `tests/ncc-pilot-pre-go-browser-flow.mjs` importa desde el navegador los módulos reales de educación, textos piloto, recorrido, motor flexible y cliente de borradores/confirmación del coach. Los intercambios de identidad/documentos/almacenamiento usan un **adaptador ficticio en memoria**; ni siquiera las aprobaciones simuladas son decisiones de humanos. El entorno prohíbe las llamadas a Supabase o Render alojados y verifica que los interruptores originales sigan OFF.

Regresiones nuevas de este lote: ocho pasos educativos y recibo ficticio una sola vez; avisos de Términos/Privacidad inicialmente desmarcados e independientes; compartir opcional y pantalla de espera; seis horarios autogenerados desde objetivo sintético de 2.500 kcal; edición conservando el primer borrador; guardado privado y publicación prohibida sin `confirmed:true`; renovaciones CO-05 de 2.500→2.100 kcal y de menú solamente conservando versiones anteriores; cambio de sesión entre coaches sin recuperar el borrador anterior; ninguna llamada para registrar consumo. **La prueba no certifica OTP, RLS real ni atomicidad PostgreSQL**, que siguen cubiertos por el SDK/GoTrue/PostgREST/PG descartables existentes y deben leerse sobre **el mismo SHA**. Tampoco equivale a UAT física ni a JWT/consentimientos reales alojados.

**Fuentes nutricionales:** seguir utilizando `tools/prepare-ncc-source-review-batch.mjs` sobre la selección final del coach, con `selectedGuideFingerprintSha256`, `recipeComponentsFingerprintSha256`, fuente/identidad/preparación/unidad, cantidades, diferencias por 100 g o ml y decisiones humanas PENDING. El resultado ficticio de P22 **no** desbloquea la revisión alojada 23/24 ni aprueba ningún alimento. Cuando exista borrador definitivo autorizado, generar el expediente específico y obtener firma humana de cada ingrediente/receta seleccionados.

### P23 · Acoplamiento del overlay con SDK / GoTrue / PostgreSQL LOCAL (NO GO)

Se corrigió un faltante **del paquete preparado, no de producción**: las ocho pantallas introductorias dependen de `SCIENCE_WELCOME_ENABLED`, que antes no se activaba en el overlay P20 (aunque P22 importaba el módulo de forma aislada). El paquete temporal ahora propone **siete** flags ON, incluida la educativa; conserva siete OFF, sin activar la ruta duplicada, el modo clínico, Autogestión ni el relanzamiento masivo. La comprobación de P20/P21 ya exige la nueva flag en el módulo servido.

En el **mismo SDK descartable de CI ya existente**, `tests/ncc-p23-sdk-overlay.mjs` genera la propuesta exacta para el HEAD y la sirve sin editar el checkout; únicamente sustituye la URL y la clave ANON de Supabase por las del GoTrue/PostgREST **local**. El navegador ejecuta `pilot.js` y el grafo JS/CSS versionado reales. Una nueva cuenta exclusivamente ficticia hace OTP real en Mailpit, recorre ocho pantallas una sola vez, acepta Términos y Privacidad por separado, decide compartir la ficha, queda en espera y mantiene bloqueado Mi Día. Su coach, autenticado por OTP, genera y edita seis horarios reales y guarda un borrador privado **sin publicación ni registro de comidas**. El otro coach no puede ver ese alumno. PostgreSQL y las APIs firmadas, no un stub, son autoridad para los permisos, estados y borrador. Se verifican cero llamadas a Supabase/Render alojados y cero modificaciones de flags/archivos reales.

Este P23 **no atribuye a un humano aprobación de fuentes** ni intenta que una guía con ingredientes pendientes se publique en alojado. La atomicidad y readback de guías publicadas se siguen probando en el anterior test SDK/PG local con fuentes ficticias, sin repetirlo. Para la publicación real siguen faltando el borrador validado por coach, revisión humana de sus componentes, cuentas/consentimientos autorizados alojados, autorización para activar flags/merge, UAT física y GO expreso. Si CI cambia de SHA hay que exigir de nuevo los seis workflows del SHA definitivo.
### P24 · Preflight ALOJADO de solo lectura y revisión de fuentes (sin GO)

Verificación real en Supabase `cyjvddhimbsfipjfctsl`: una versión vigente de Términos, una de Privacidad; función de publicación atómica instalada; **0 fuentes nutricionales revisadas por humano, 0 fichas generales nuevas, 0 borradores privados nuevos**; flags `pilot_coach_atomic_publication=false` y `pilot_student_diary_write_gate=false`. Esos resultados confirman que **la infraestructura está lista estructuralmente, pero no se ha hecho una prueba con usuarios autorizados en alojado**. Prohibido presentar los 6/6 CI locales como validación alojada.

La plantilla demostrativa equilibrada sin restricciones tiene 17 alimentos únicos: 5 capturas USDA cotejables pendientes de operador (manzana, avena, aceite de oliva, banana, papa); 2 referencias FDC por capturar/cotejar (huevo, yogur natural); 1 valor de fibra por conciliar (arroz integral); 1 error de preparación si se pretende mapear pollo genérico a pechuga asada; 1 incompatibilidad de unidad masa/volumen (leche descremada ml); 7 preparaciones/marcas sin fuente primaria exacta (pan, queso, café, calabaza, mandarina, merluza, rúcula). **No aprobar por recuento ni homologar toda la plantilla**: solo se revisan los ingredientes efectivos de la Dieta Guía autogenerada y aprobada por el coach. El expediente preparado por CI `operator-review-worklist.csv` tiene estados PENDING, decisiones de operador vacías y huella de selección exacta; si cambia el menú, regenerarlo.

Render `srv-dbfle40ae00c738hf0v0` confirma `autoDeploy=yes` sobre `efg-nutrition-app`; el despliegue `9000e4d8e08bd9483770209a863b1cdba2141c43` sigue live. **NO fusionar PR #43 directamente**: los siete switches siguen OFF en el código fuente, y el overlay que los activa existe únicamente fuera del checkout. Un merge sin aplicar el paquete versionado podría actualizar Render dejando el recorrido nuevo inactivo. El corte real exige aplicar la propuesta a la rama autorizada con el SHA exacto, comprobar que las siete flags y los assets de caché correspondan al nuevo build, revalidar seis CI del SHA resultante y coordinar con dos flags alojadas tras consentimiento y fuentes revisadas. **No ejecutar nada de esto antes de autorización expresa del propietario.**

### P25C · Verificador nutricional V2 instalado DESACTUALIZADO (NO GO)
El ensayo alojado de SOLO LECTURA identificó una divergencia real: `efg_private.coach_guide_foods_verified(jsonb)` conserva una definición V1 de cinco comidas, aunque `efg_publish_coach_plan_draft_atomic` y la migración COACH114 que ejecutan los tests PG17 admiten `flexible_meal_guide` V2 de 2–6 horarios. **Sin corregirlo, una guía V2 sería rechazada incluso con ingredientes revisados**. Los anteriores 23/24 controles del preflight no podían ver esta divergencia.

Se preparó para revisión `efg-nutrition/docs/NCC_P25_HOSTED_V2_NUTRITION_VERIFIER_NOT_APPLIED.sql`: copia EXACTA del verificador de fuentes PG17 ya probado, como `CREATE OR REPLACE`, con transacción, precondiciones de firma/ACL/switches OFF, comprobación posterior y denegación de ejecuciones sobre definiciones inesperadas. **NO se ejecutó en Supabase**. El preflight incorpora `COACH119_NUTRITION_SOURCE_VERIFIER_FLEXIBLE_V2`, por lo que pasa de 24 a 25 controles: mientras no exista corrección alojada ni aprobación nutricional, se esperan 23/25 PASS (dos fallos independientes: función antigua y ninguna fuente humana). Una vez autorizado y aplicado bajo control, repetir preflight read-only, test con JWT real y aprobación de fuentes exactas antes de activar cualquier backend flag. El paquete original COACH119/SEC09/OPT01/GU06 **ya está instalado** y no debe reinstalarse por esto.

## 3. Secuencia de GO y reversión — preparar, NO ejecutar
1. Verificar SHA final de PR43, 6/6 CI y estado productivo. Mantener sin merge/despliegue y detectar cambios de otros ejecutores. Conservar hashes/estado base sin alterar datos reales.
2. El sistema genera la Dieta Guía automáticamente en **borrador privado** desde la ficha nutricional vigente y las metas calculadas/ajustadas. El coach la revisa y **da el visto bueno o modifica** alimentos, recetas, gramos y horarios; se recalcula sin tocar Mi Día. Solo sobre los ingredientes que quedan en ese borrador final —incluidos componentes expandidos de recetas— generar `operator-review-worklist.csv` con huella `selectedGuideFingerprintSha256`. Un revisor humano autorizado verifica identidad, preparación, unidad, kcal/P/HC/G/fibra, fuente y diferencias. **Nunca aprobar alimentos automáticamente**, ni convertir la lista de fuentes revisadas en una lista blanca del catálogo. La aprobación del coach para publicar es posterior a esa verificación y no se presume por haber generado la guía.
3. Preflight alojado **READ ONLY**. Según registro del 03/11, migraciones estructurales ya instaladas, 23/24 checks correctos, único pendiente de fuentes sin revisión humana, avisos de piloto simples ya publicados, `pilot_coach_atomic_publication=false` y `pilot_student_diary_write_gate=false`. **No reinstalar** SEC09/OPT01/FOOD/COACH119/COACH116/GU06 ni inferir disponibilidad desde tests locales.
4. Aceptaciones piloto verdaderas, consentimiento sanitario específico si corresponde, permisos RLS/JWT de cuentas autorizadas y pruebas cross-org deben verificarse antes de habilitar usuarios. No crear cuentas ni consentimientos simulados alojados sin autorización.
5. **GO expreso del propietario** para operaciones alojadas, flags, merge y despliegue. Render puede auto-desplegar desde `efg-nutrition-app`: un merge no es prueba informal y NO está autorizado aún. Activar backend verificado antes de abrir UI, con manifest versionado y secuencia coordinada.
6. Después de actualizar con GO: verificar SHA realmente servido, guardado de Mi Día e históricos, ejecutar UAT mínima y registrar incidentes. Ante falla crítica: detener nuevas escrituras/flags y volver al frontend previo únicamente mediante operación autorizada; nunca borrar ni recrear datos/guías/recibos. Revertir frontend no revierte cambios de esquema ni compras.
7. Ensayo integral de restauración DB/Auth/Storage y verificación de bytes físicos privados sigue **diferido por decisión del propietario**, no declarar probado lo que no se ejecutó.

**Dependencias humanas finales:** visto bueno del coach sobre la **propuesta autogenerada** (con las modificaciones que decida), revisión humana nutricional **solo de los ingredientes resultantes** y recetas expandidas, cuentas/aceptaciones autorizadas en alojado, interacción física en equipos y GO expreso. El coach **no crea manualmente el menú desde cero**. Sin servicios ni ramas pagos adicionales.
