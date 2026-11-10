# EV-03 · registro de alimentos

Base comprobada: producción `c710fe7450573e60f0ac19b5f2006d7bedc7952f`. Continuación de PR69; sin reconstrucción ni cambios de backend.

## Comportamiento

- Una ventana reúne horario, búsqueda por nombre/contenido, recientes, habituales/favoritos y recetas propias. Cambiar horario conserva la selección, cantidad y unidad.
- Los recientes se derivan de diarios del usuario actual, con valores del catálogo vigente. No se crea otra caché ni se reutilizan nutrientes históricos como datos actuales.
- Habituales mantiene nombres, contenido, revisión y registro explícito existentes. Su selector dentro de la ventana tiene identidad propia para no leer por accidente el selector del diario situado detrás.
- Las recetas propias usan la proyección existente por porciones y el mismo guardado del diario. No se duplica el recetario.
- Instrucciones por grupos y catálogo tradicional quedan desplegables; buscar sigue siendo global respecto del grupo nutricional.
- Cantidad/unidad, piezas estimadas y aportes conservan fórmulas vigentes. La búsqueda no registra. El guardado muestra espera, usa el bloqueo existente y confirma sólo tras respuesta.
- Fondo, contraste y acciones siguen el tema común. La ventana usa altura dinámica, scroll contenido, cantidad con teclado decimal y pie de guardado accesible.

## Validación y límites

Pruebas dirigidas locales PASS: sintaxis, `guided-meal-picker.mjs`, `student-diary-catalog-gates.mjs` y `planner-sushi-first-select.mjs` (primer alimento, sushi, reintentos, IME y aislamiento de cuentas/día).

`food-entry-browser.mjs` ejecuta la PWA completa con un adaptador ficticio sólo en loopback: buscar → elegir → cantidad/unidad → guardar → verificar resumen; respuesta demorada/doble toque; rechazo/reintento; cambio de horario; piezas; recetas; recarga; favoritos e historial de una fecha anterior. Chromium/WebKit, 390 y 1280 px, con bloqueo de toda conexión externa. El viewport reducido comprueba accesibilidad del guardado, no un teclado físico.

CI debe acreditar el HEAD concreto antes de publicar. Estas pruebas no acreditan una sesión autenticada alojada ni dispositivos físicos Android/iPhone. No se registraron alimentos ni se modificaron datos de personas reales.

EV-04 (guía visual), EV-05 (sugerencias), EV-06 (ingreso) y EV-07 (progreso) conservan su orden y siguen pendientes de implementación propia.
