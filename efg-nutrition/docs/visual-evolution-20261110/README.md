# Evolución visual del alumno · Primera propuesta · 10/11/2026

## Resultado

Vista previa portátil de **Mi Día**, negra/carbón con amarillo lima, fotografías y navegación móvil. Abrir `mi-dia.html` en un navegador. Incluye todos sus recursos: no necesita conexión, login, Supabase ni almacenamiento local. Todos los objetivos, comidas y mensajes son ficticios; no consulta ni modifica cuentas.

**Edu aprobó esta composición el 10/11/2026** («me encantó como queda») y autorizó subir únicamente la vista previa y su documentación a una rama del repositorio público. Esta autorización no incluye merge ni despliegue. No se integró la estética en la app, no se desplegó y no se alteró ningún archivo de producción.

## EV-00: inventario puntual del código vigente

Base verificada: producción `efg-nutrition-app`, HEAD `43a335386c73ad6b54f67704b458727c430d2d2f` del 09/11/2026. Incluye merge PR64 (`24623efb`) de doble rol y PR65 de administración compacta exclusiva de Admin. Esta comprobación es del código y metadatos GitHub, no una revalidación de producción autenticada ni una prueba física.

| Pantalla o responsabilidad | Componente vigente | Tratamiento propuesto |
| --- | --- | --- |
| Mi Día y seis horarios | `pilot/pilot.js`: `mealSlots` línea 107 y `homeView()` línea 1627 | Mantener slots, registros, omisiones, comentarios y acciones; cambiar presentación después de revisión. |
| Resumen de calorías y macros | `pilot/pastel-day.js`: `pastelDaySummary()` | Reutilizado en esta preview, embebido sin cambios salvo sintaxis de exportación; nuevas reglas de estilo aisladas. |
| Totales y objetivos | `pilot/pilot.js`: `values()`, `dailyTotals()` líneas 648–649 y `activeGoal()` | La integración futura debe recibir los valores existentes; preview usa solo fixtures y la misma agregación básica, sin motor nutricional nuevo. |
| Registro, habituales y recetas | `homeView()`, `habitualPickerHTML()`, acciones existentes y `guided-meal-picker.css` | EV-03; no duplicar buscador ni circuitos de persistencia. La preview solo simula sumar un ejemplo. |
| Guía aprobada | `studentGuidedSection()`, `persisted-guide-provider.js`, `guided-day-v2.js`, `guided-countable-portions.js` | EV-04; reutilizar el plan real y sus cantidades; abrirlo nunca registra automáticamente consumos. |
| Resolver lo que me falta | `planner.js` y acceso `data-tab="planner"` existente | EV-05; presentar sugerencias reales con fotografía cuando se integre, no fabricar compatibilidad ni otro catálogo. |
| Mensaje del día y contenido | `daily-motivation.js`, `nutrition-daily-tip.js` y `messages-ui.js` | Distinguir contenido editorial de un mensaje real del coach; si no hay mensaje, ocultar tarjeta. |
| Identidad y fotografías | `assets/serotonina-acuarela.avif`, `welcome-bowl.jpg`, `fit-recipe-photos.js` | Preview reutiliza los dos primeros recursos locales; foto ilustrativa declarada. No descarga ni copia activos de Focus. |
| Estilos y navegación | `pilot.css`, `student-experience.css`, `premium-system.css`, `pastel-system.css`, `luxury-theme.css`; `frame()` en `pilot.js` | Hay varias capas de CSS. Integrar mediante alcance explícito alumno/pantalla, sin cambiar selectores globales ni el panel del coach. |
| Doble rol | `dual-workspace-*.mjs`, `professional-workspace-release-*.mjs` | Preservar selector, contexto, sesiones y separación entre datos personales y profesionales. |
| Informes y educación | `weekly-luxury-report*`, `period-luxury-report*`, `science-welcome*`, `nutrition-science*` | Fuera de este rediseño; conservar formatos aprobados. |

No se diagnosticaron nuevos defectos funcionales de la app: esta etapa inspeccionó código y creó una preview aislada. Los pendientes históricos no se dan por cerrados sin verificar su estado vigente.

## EV-01/02: decisiones aplicadas

- Carbón `#101214`, tarjetas `#1B1F23`, lima `#D7FF3F`, texto cálido `#F5F3EB` y secundarios `#B1B9B9`.
- El anillo muestra calorías **registradas** y las barras muestran avance individual de macros; el exceso conserva el número real, aunque la barra termine en 100%.
- Sin meta no aparecen porcentajes ni un plan ficticio aprobado. La guía muestra espera. Esta preview no modifica reglas reales de acceso o permisos.
- Se mantienen seis casilleros del diario, separados de la guía. La tarjeta de mensaje puede ocultarse por completo.
- Navegación fija móvil y registro accesible; foco visible, diálogo nativo con Escape y CSS para movimiento reducido.
- Foto de referencia con alternativa funcional sin fotografía. Sin marcas/recursos de Focus.

## Verificación realizada

Chrome compartido, preview local, marcos de revisión de **320, 390, 768 y 1280 px**. Anchos interiores efectivos, con barra de scroll: **305, 375, 753 y 1265 px**; `scrollWidth === clientWidth` en los cuatro. Seis comidas e imágenes cargadas en todos. Inspección visual de escritorio y móvil de 390 px.

| Caso | Resultado observado |
| --- | --- |
| Día parcial | 1.240/2.200 kcal; 960 restantes; 3 comidas; 15 g fibra. |
| Día vacío | 0 kcal y 0 comidas; meta visible y barras vacías. |
| Sobre meta | 2.480 kcal; +280 sobre meta; valores reales conservados. |
| Sin meta | Texto sin meta, sin porcentaje inventado; guía pendiente. |
| Sin mensaje | Tarjeta de coach oculta, sin hueco reservado. |
| Sumar ejemplo | 1.240 → 1.445 kcal; restantes 960 → 755; 3 → 4 comidas; diálogo se cierra. |
| Consultar guía | Abre diálogo; totales no cambian. |
| Recargar | Regresa a 1.240 kcal: las simulaciones no persisten. |

No hay evidencia de dispositivo físico, WebKit, integración autenticada, render del coach con el tema nuevo ni QA de producción. Se observaron errores de metadatos de la extensión Chrome, ajenos al origen local; no se los clasifica como errores de la app. Movimiento reducido revisado en CSS, sin emulación visual certificada. Contrastes calculados: texto principal/tarjeta 14,92:1, secundario/tarjeta 8,30:1, lima/fondo 16,33:1 y texto/botón lima 15,13:1. Esto no constituye una certificación integral de accesibilidad.

## Continuación

1. Revisión de composición con Edu completada y aprobada el 10/11/2026; conservar esta versión como referencia visual.
2. Siguiente etapa del plan: integrar componentes visuales con alcance exclusivo del alumno, usando `dailyTotals()`, `activeGoal()` y callbacks reales. No copiar la fixture ni convertir el menú ficticio en un plan.
3. Revalidar registro, seis horarios, recarga y cambio personal/coach sobre la integración modificada, y avanzar EV-03/04/05.
4. Producción permanece sin cambios; merge/despliegue requieren GO específico.

Regenerar preview: `python docs/visual-evolution-20261110/build-preview.py` desde `efg-nutrition/`. El generador integra el renderer y los recursos del checkout presente, sin solicitudes de red. Mantener `mi-dia.template.html` como fuente editable.
