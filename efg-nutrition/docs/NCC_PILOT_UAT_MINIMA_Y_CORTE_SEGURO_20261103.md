# Nutrición Con-Ciencia · UAT mínima y corte seguro del piloto
**03/11/2026 (Argentina) · PR #43 DRAFT · rama release/ncc-pilot-fast-track-20261102.**
**Procedimiento de prueba, NO acta aprobada ni autorización para actualizar.** La revisión definitiva siempre debe registrar el SHA del HEAD efectivamente probado (al crear este documento: `3ec25bcc682c9830b7cb805ab455e4eab7c650d7`).

## Fuente y alcance
El recorrido vigente es el de «RECORRIDO DEFINITIVO 02-11», «GO PILOTO 02-11» y «Control QA» del Plan Maestro. Los protocolos de octubre que citan cinco comidas o un entorno alojado pago son **históricos**; no sustituyen las decisiones actuales.
- La **Dieta Guía** comienza con 6 horarios y el coach puede quitar algunos, recalcular cantidades, cambiar alimentos o recetas y publicar una nueva versión CO-05 semanas después. **Mi Día conserva siempre 6 horarios** y no registra automáticamente comidas sugeridas.
- Conservar íntegros catálogo, recetas, metas, diarios, informes, mensajes y pagos. Semáforo orientativo, no bloqueante. Datos sanitarios sensibles, Autogestión y clínica avanzada OFF.
- Render https://efg-nutrition.onrender.com/pilot/ continúa en SHA productivo `9000e4d8e08bd9483770209a863b1cdba2141c43`; **no probar la nueva candidata contra esa URL**.

## 1. Qué podemos verificar gratis ahora
En la rama candidata y los ejecutores **ya existentes**, sin crear infraestructura:
- Seis GitHub Actions de un **mismo SHA**: Premium QA, Seguridad, PostgreSQL descartable, Educación, Visual Chromium/WebKit y Auth local JWT/RLS con GoTrue/PostgREST.
- SDK E2E descartable de 390/1280 px: OTP local, introducción, aceptaciones **sintéticas solo locales**, ficha, Coach A/B, publicación atómica v2 con seis horarios, readback del alumno y conservación del diario.
- Premium QA: primer alimento al primer toque, sushi por piezas, múltiples habituales y recuperación, búsquedas/autocompletado, recetas por porción, fallos de persistencia y reconexión, IME/Gboard emulado, scroll, sesión A→B→A, respuestas desordenadas y cambio a medianoche.
- Etiquetar pruebas automatizadas como **LOCAL/CI**. No declararlas JWT hosted, aceptación de usuarios reales ni UAT en dispositivo físico.

## 2. Plan mínimo de UAT en equipos reales — SIN EJECUTAR
El propietario o tester autorizado debe usar **iPhone Safari/PWA, Android Chrome/Gboard/PWA y escritorio**, después de autorización expresa para disponer de la candidata en un entorno habilitado y sin gastos adicionales. No introducir fichas clínicas reales ni credenciales en capturas.

Registrar en cada caso: ID, fecha/hora ART, equipo, SO, navegador/PWA, SHA/URL servido, identidad ficticia y rol, PASS/FAIL/BLOCKED/NOT RUN, pasos observados y evidencia desidentificada.

| ID | Prueba de usuario | Criterio de éxito |
|---|---|---|
| UAT-N01 | Nuevo/existente: invitación, OTP, ocho pantallas una sola vez, Términos+Privacidad por separado, ficha y permiso de compartir | Sin casillas premarcadas; espera del coach; historia intacta |
| UAT-N02 | Coach recibe ficha; calcula objetivo; genera guía 6, sustituye alimento/receta, varía gramos y reduce 6→5→4 horarios | Recalcula con catálogo íntegro; no añade consumo al diario |
| UAT-N03 | Coach publica objetivo+guía+acceso+aviso, vuelve a entrar y renueva 2.500→2.100 kcal o cambia solo menú (CO-05) | Una publicación atómica, nuevo versionado y guía visible para alumno; histórico anterior íntegro |
| UAT-N04 | Mi Día registra primer desayuno, segundo almuerzo y sushi de 3 piezas en cena | Guarda al primer intento sin duplicar; seis horarios permanentes, kcal/macros y piezas coherentes |
| UAT-N05 | Guardar dos habituales diferentes en el mismo horario, cerrar y volver a entrar; recuperar al día siguiente | Ambos nombres, ingredientes y porciones correctos; sin reapariciones de borrados |
| UAT-N06 | Autocompletar sin tilde/con tilde, seleccionar y editar, receta Fit/propia por media porción, simular en Planificador | No se pierde selección/teclado; no duplica nutrición; simulación NO es registro |
| UAT-N07 | Android Chrome + Gboard: teclado, gestos, scroll hasta último botón, cambio de pestaña y PWA | Último botón accesible y borradores conservados |
| UAT-N08 | iPhone Safari/PWA: primer toque, selector de comidas, scroll y retorno a app | Sin borrado del primer registro ni apertura espuria del selector |
| UAT-N09 | Sin conexión, reconectar, doble toque, cambio de cuenta A/B y paso de día | Cero falsas confirmaciones, cruces entre usuarios o duplicaciones |
| UAT-N10 | Escritorio y smoke de informe Luxury Pro, notificaciones, mensajes y pagos ficticios | Sin regresiones de privacidad, datos ni experiencia |

**Todo UAT-N01…N10 queda NOT RUN hasta su ejecución real.** Si la app nueva no está alojada, la prueba física del recorrido nuevo permanece BLOQUEADA, no se simula desde Render productivo antiguo.

## 3. Secuencia de GO y reversión — preparar, NO ejecutar
1. Verificar SHA final de PR43, 6/6 CI y estado productivo. Mantener sin merge/despliegue y detectar cambios de otros ejecutores. Conservar hashes/estado base sin alterar datos reales.
2. Coach autorizado selecciona **Dieta Guía FINAL**; generar worklist para esos IDs y recetas expandidas, con huella `selectedGuideFingerprintSha256`. Revisión humana verificable de identidad, preparación, unidad, kcal/P/HC/G/fibra, fuente y diferencias; **cero aprobaciones automáticas**, sin lista blanca del catálogo.
3. Preflight alojado **READ ONLY**. Según registro del 03/11, migraciones estructurales ya instaladas, 23/24 checks correctos, único pendiente de fuentes sin revisión humana, avisos de piloto simples ya publicados, `pilot_coach_atomic_publication=false` y `pilot_student_diary_write_gate=false`. **No reinstalar** SEC09/OPT01/FOOD/COACH119/COACH116/GU06 ni inferir disponibilidad desde tests locales.
4. Aceptaciones piloto verdaderas, consentimiento sanitario específico si corresponde, permisos RLS/JWT de cuentas autorizadas y pruebas cross-org deben verificarse antes de habilitar usuarios. No crear cuentas ni consentimientos simulados alojados sin autorización.
5. **GO expreso del propietario** para operaciones alojadas, flags, merge y despliegue. Render puede auto-desplegar desde `efg-nutrition-app`: un merge no es prueba informal y NO está autorizado aún. Activar backend verificado antes de abrir UI, con manifest versionado y secuencia coordinada.
6. Después de actualizar con GO: verificar SHA realmente servido, guardado de Mi Día e históricos, ejecutar UAT mínima y registrar incidentes. Ante falla crítica: detener nuevas escrituras/flags y volver al frontend previo únicamente mediante operación autorizada; nunca borrar ni recrear datos/guías/recibos. Revertir frontend no revierte cambios de esquema ni compras.
7. Ensayo integral de restauración DB/Auth/Storage y verificación de bytes físicos privados sigue **diferido por decisión del propietario**, no declarar probado lo que no se ejecutó.

**Dependencias humanas finales:** selección de guía real y revisión de las fuentes seleccionadas, cuentas/aceptaciones autorizadas en alojado, interacción física en equipos y GO expreso. Sin servicios ni ramas pagos adicionales.
