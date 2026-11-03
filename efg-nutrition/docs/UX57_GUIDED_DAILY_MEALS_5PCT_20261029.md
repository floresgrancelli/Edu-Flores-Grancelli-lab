# UX-57 · Selector guiado de comidas y único margen semanal ±5 %

**29/10/2026 · PR #37 DRAFT · NO DEPLOY · ningún cambio de datos alojados.**

## Decisiones de producto

- **Desayuno, Almuerzo y Cena** tendrán selector educativo en 4 secciones: **Proteínas**, **Hidratos**, **Plato preparado**, **Verduras y otros**. Las secciones no son diagnósticos, ni etiquetan un alimento como libre de los demás nutrientes. Buscar por nombre debe encontrar alimentos aun si el usuario no entró en su sección.
- **Omitir** está disponible para fuentes **Proteínas/Hidratos por separado**. Es opcional, persistido como bandera de presentación en `efg_daily_logs.skipped._guidedComponents`; no elimina ni altera otros alimentos. Una tarta de atún va en **Plato preparado**, se registra **una vez** y suma kcal, proteínas, HC, grasas y fibra completas, incluso si el usuario omitió una fuente *adicional*. «Agregar y seguir eligiendo» permite armar una comida con más de un alimento.
- Las **grasas se calculan automáticamente** sumando la composición real declarada de cada alimento, no obligando al usuario a elegir una sección «Grasas». Grasas agregadas (aceite, frutos secos) siguen disponibles en «Verduras y otros».
- **Media mañana y media tarde no se modifican**: conservan buscador y catálogo generales. **Merienda** tampoco se cambia en esta iteración; no se altera la lista histórica de comidas ni las favoritas guardadas.
- **MIS LOGROS DE LA SEMANA** muestra **una sola barra ±5 %**, no una de ±10 %. El reconocimiento de 6/6 y el permiso opcional del coach siguen la condición de seis días cumplidos con esta única banda, respetando el mínimo de proteína ≥90 % de la meta actual. El domingo y la regla de no premiar por adelantado no cambian. El ±5 % es una decisión UX de seguimiento, no un umbral médico.

## Código y validaciones del PR candidato

- `pilot/guided-meal-picker.js`, `pilot/guided-meal-picker.css`: clasificación pedagógica, platos mixtos, sumas, diseño táctil.
- `pilot/pilot.js` e `index.html`: menús de 3 comidas, buscador, omit, resumen de grasa calculado, guardar y seguir, assets sin caché vieja.
- `pilot/weekly-consistency.js` y `tests/weekly-consistency.mjs`: se elimina ±10 % del criterio, del gráfico y del premio. Compatibilidad de `report.acceptable` recalculada como el resultado ±5 % exclusivamente para no romper llamadas antiguas.
- `tests/guided-meal-picker.mjs`: tarta, sushi, pizza, empanada, sumas sin duplicar, omisión y colaciones tradicionales.
- `tests/premium-visual-smoke.mjs`: pruebas táctiles en Chromium/WebKit con alumnos de prueba en memoria; las categorías no deben impedir acceder al catálogo de referencia, y la tarta debe registrarse una vez con P/HC/G completos. Media mañana continúa con el registro tradicional.
- `.github/workflows/efg-nutrition-premium-qa.yml` incorporó pruebas adicionales sin reducir los gates existentes.

## Seguridad, límites y pendientes

**La clasificación de macros NO es el semáforo de seguridad alimentaria médico**. Celiaquía, diabetes, alergias y patrones dietéticos requieren una revisión separada y evidencias certificadas. Los preparados caseros genéricos son estimaciones ajustables por marca, preparación y porción, no datos absolutos. El valor ±5 % no promete una dieta perfecta y no autoriza comer en compensación.

**Release: NO GO** hasta concluir QA 5/5 SAME HEAD, verificación iPhone/Android físicos, reglas clínicas y legales, migración segura del Coach y aprobación expresa. **No hay merge/deploy**, el flag de Coach atómico continúa OFF y la app pública Render conserva `9000e4d8`; Supabase Pro no se modifica ni se crean ramas con costo.
