# UX-ANDROID-01 · Deslizamiento de MI DÍA desde la zona de métricas

Fecha 29/10/2026. PR #37 DRAFT. Evidencia: video de usuario filmando Android con Chrome mostrando EFG Nutrition Pro en MI DÍA. **No** se sube ni almacena el video en GitHub; solo se registra el síntoma informado.

## Síntoma y alcance
El usuario describe que solo logra desplazar la pantalla cuando inicia el gesto en la franja inferior, no cuando desliza sobre el resumen de calorías/macros. El video es compatible con ese síntoma, pero **no determina por sí solo una causa única** ni acredita el comportamiento de todos los Android. Navegador mostrado: Chrome, no instalación PWA confirmada.

## Hallazgo en el código de producción
`pilot/pull-refresh.js` iniciaba seguimiento de **cualquier** `touchstart` a cualquier altura mientras `window.scrollY<=2`; una tracción descendente (`dy>=8`) ejecutaba `preventDefault()`. El comentario de código afirmaba que solo interceptaría el gesto desde arriba, pero la condición geométrica no existía. Así podía captar gestos sobre tarjetas de contenido al comienzo del documento.

## Corrección candidata (sin publicar)
- Limitar el gesto `pull-to-refresh` a una franja superior, máximo 110 CSS px o 18 % de la altura visible. El resto de la pantalla conserva gestos nativos; el refresh todavía existe desde el borde.
- En `pastel-system.css`, declarar `touch-action:pan-y pinch-zoom` solo para el panel resumen del alumno `.pilot-layout.efg-role-student .efg-pastel-day` en viewport móvil. No tocar interacciones horizontales o controles de comidas.
- Versionar URLs del módulo y CSS/JS de `pilot/index.html` para evitar conservar la versión anterior desde caché al desplegar más adelante.
- Añadir pruebas en `premium-visual-smoke.mjs`: `TouchEvent` no debe quedar cancelado al iniciar desde la tarjeta, un gesto desde borde mantiene refresh, y **Chromium con entrada táctil nativa CDP** debe desplazar efectivamente `MI DÍA` al arrastrar desde la tarjeta. Las pruebas de CI con fixture no equivalen a verificación en Android real.
- Actualizar la aserción de caché en `notifications-messages.mjs`; el primer CI falló solo por la etiqueta de versión anterior y no por un fallo funcional. La corrección elimina esa expectativa obsoleta, no desactiva el control de caché.

## Gates de aceptación pendientes
- [ ] Cinco workflows de PR #37 completos en el MISMO HEAD, especialmente Visual Chromium/WebKit sin ocultar fallas.
- [ ] Prueba física en Android Chrome y PWA instalada desde distintas alturas: sobre anillo de calorías, macros, texto superior, sección semanal, tarjetas de comidas y cerca de barra inferior.
- [ ] Verificar subir y bajar la pantalla, abrir comidas, notificaciones, pull-to-refresh desde arriba y desplazamiento horizontal de navegación, tanto en Android como iPhone.
- [ ] Verificar actualización real instalada/cache nueva y el rol coach, estudiante, admin y autogestión.
- [ ] Recién entonces evaluar despliegue por PR protegido y consentimiento del propietario, coordinado con release grande.

**Producción y Supabase Pro intactos.** No ejecutar migraciones, no fusionar PR, no anunciar que ya quedó arreglado en el teléfono observado.
