# Micronutrientes: segunda ampliación de datos faltantes

Se completan 21 celdas mediante 19 correspondencias de alimentos: ALA, EPA/DHA de bebida de soja y B12 de helado lácteo bañado en chocolate. Las referencias son CoFID 2021 (Public Health England) y SARA 2. Son estimaciones por alimentos comparables, no análisis de marcas o porciones concretas. Las diferencias de preparación, grasa y origen se describen por nutriente y se muestran mediante el detalle existente.

La propagación por las recetas y por los modelos de restaurantes mejora **75 valores en 73 alimentos**. Sobre los 853 perfiles de la candidata PR138, los completos pasan de **486 a 551** y los parciales de **367 a 302**. Un valor numérico parcial no cuenta como completo. En el catálogo base: 420 → 454 completos. Esto corrige la ambigüedad del conteo anterior de 503: aquel contaba filas con números en todas las celdas, aunque algunas sumas aún fueran parciales.

Se mantienen exactamente los valores previos completos, macros, unidades, referencias diarias, cantidades y rendimientos. Se recalculan solo sumas parciales o ausentes de recetas existentes. Las trazas `Tr`, ausentes y `N` de CoFID no se convierten a cero. Se toma la columna específica cis n-3 C18:3 por 100 g de alimento; nunca la columna de ácidos grasos por 100 g de grasa ni el 18:3 no diferenciado. EPA/DHA se convierten de gramos a miligramos. Se respeta la densidad ya declarada para bebidas.

Ejemplos de valores por 100 g: salmón al horno ALA 0,16 g; trucha al horno 0,06 g; mejillones cocidos 0,01 g; croissant como aproximación de medialuna de manteca 0,21 g. Carne vacuna magra cocida SARA: ALA 0,009 g/100 g, usado como equivalente explícito de hamburguesa/picada/cuadril. Helado lácteo bañado: B12 0,3 µg/100 g. No se extrapola fortificación desde la bebida de soja a otros nutrientes.

## Fuentes y reproducción

- `cofid-selected.json`: filas originales, encabezados, notas, URL y SHA256 del libro oficial. Incluye atribución y licencia Open Government Licence v3.0.
- `mappings.json`: correspondencias explícitas por identidad, unidad y nutriente.
- `manifest.json`: hashes de las evidencias revisadas.
- Fuentes SARA ya fijadas en `../micronutrients-20261114/enrichment-manifest.json`.

Desde la raíz del repositorio:

```sh
python efg-nutrition/tools/build-micronutrient-catalog.py
python efg-nutrition/tools/build-micronutrient-restaurants.py
node efg-nutrition/tests/micronutrient-gaps.test.mjs
node efg-nutrition/tests/micronutrient-restaurants.test.mjs
node --test efg-nutrition/tests/micronutrients.test.mjs efg-nutrition/tests/micronutrient-coverage.test.mjs
node efg-nutrition/tests/approved-release-flags.mjs
```

La prueba de regresión requiere el commit base ce12efcbb9440e2a51d86d508d2a1ecc533d2836 y las revisiones históricas de cobertura, disponibles con checkout completo. Se amplía el recorrido de navegador de PR138 a salmón, bebida de soja y helado bañado, en alumno/coach/admin.

Estado: candidata para revisión. Sin publicación ni escrituras en diarios reales. Las pruebas locales de datos y assets pasan; la prueba de navegador se ejecuta en CI porque este entorno no tiene instalados los binarios Playwright requeridos.
