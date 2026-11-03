# PR #37 · Revisión humana de capturas CI (29/10/2026)

**Alcance:** inspección posterior al informe de Work, archivo ZIP autenticado del workflow Visual QA `40933523874`, artefacto `12924675178` (expira 12/11/2026). **No son capturas de un dispositivo físico ni de cuentas reales.** La inspección es de un HEAD anterior `ff4b6b07c4841cef2c7e783809d9344bb19ad706`; las modificaciones posteriores de `food-compatibility.js` no cambian UI y requieren nuevo CI.

## Evidencia recuperada
- Archivo ZIP con **72 capturas PNG** y 2 informes JSON (Chromium y WebKit). Las capturas son una muestra representativa; no equivale a 123 archivos PNG.
- Reporte `report-chromium.json`: **100 estados** inspeccionados por el navegador, 17 combinaciones rol/ancho; **0 `bad`**, 0 desbordamientos `documentWidth > viewportWidth`, 0 botones de navegación de altura menor a 44 px según los campos que documenta.
- Reporte `report-webkit.json`: **23 estados**, 4 combinaciones; tampoco se registran `bad`, desbordamientos horizontales ni controles de navegación con altura menor a 44 px.
- Revisión **visual humana efectiva**, usando mosaicos de capturas 390 px de los tres roles para Chromium y WebKit y captura completa de `webkit-coach-390-coach.png`. Vistas revisadas: login/onboarding, MI DÍA/planificador, MI ESPACIO, panel Coach/Alumnos, Administración/Pagos, Mensajería y Recetas.

## Hallazgos humanos
1. **Sin fallas bloqueantes evidentes en las muestras revisadas:** texto/paneles discernibles, tarjetas de navegación reconocibles, colores coherentes y panel de mensajería legible en 390 px. Coach muestra acciones de nuevos ingresos y alumnos. En reportes automatizados no aparece scroll horizontal.
2. **Advertencia de QA (no declarar PASS físico):** la barra de navegación inferior fija aparece en mitad de algunas capturas de página completa y se superpone visualmente con tarjetas en la fotografía larga. Es una característica de fotografiar una vista con barra fija mientras se captura todo el documento; comprobar **interactivamente** con scroll real y teclado que ningún botón/campo queda inaccesible al pie de la pantalla, en especial 320/360 px e iPhone con safe area.
3. **Advertencia de UX:** la pantalla «MI ESPACIO» todavía muestra una tarjeta técnica `VERSIÓN DE EFG NUTRITION PRO · COMPROBAR ACTUALIZACIONES`. Es un diagnóstico manual, **no un pop-up**, pero evaluar moverlo a un menú de configuración/admin para una experiencia comercial menos técnica. No es bloqueo de seguridad.
4. **Advertencia de mensajería:** la lista de chats deja un espacio inferior muy amplio con un solo contacto en el fixture. Verificar comportamiento con 10, 50 y 200 chats, búsqueda, teclado y retorno después de abrir conversación, antes de aprobar uso real.
5. **Experiencia mayor aún NO diseñada ni visible:** estas capturas son del estado antiguo de la interfaz integrada (fixtures); no hay pruebas visuales reales del relanzamiento ilustrado, aceptación de T&C ni semáforo integrado. No extrapolar este PASS a módulos OFF.

## Restricciones
- No se inspeccionaron manualmente **todas** las PNG individuales ni todas las posiciones de scroll. La revisión humana se realizó con 6 mosaicos de capturas 390 px y 1 imagen individual; otros tamaños y páginas quedan cubiertos solo por los reportes JSON.
- Sin pruebas de voz, lector de pantalla, contraste WCAG, OTP real, conexión irregular, RLS/JWT, PWA instalada ni dispositivos físicos.
- La auditoría visual no valida la exactitud científica, seguridad de alérgenos, permisos de usuario ni legalidad contractual.

## Próxima iteración, en orden
1. Probar la barra fija y foco/teclado en móviles reales o Browser QA autenticado, con scroll al último campo.
2. Validar los chats con listas reales ficticias de distinto tamaño, preservando borradores.
3. Revisar si `COMPROBAR ACTUALIZACIONES` debe reservarse a diagnóstico avanzado.
4. Capturar escenarios específicos de semáforo con fuente validada, usuarios sin restricciones, permisos y «Novedades» cuando existan implementaciones conectadas.
5. Correr de nuevo CI 3/3 en HEAD actualizado de PR #37 y mantener publicación congelada.

**Estado:** revisión humana parcial realizada; no hay autorización de merge o despliegue.
