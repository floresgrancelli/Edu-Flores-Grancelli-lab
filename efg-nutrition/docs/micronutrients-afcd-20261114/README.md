# Lote AFCD: frutos secos, cereales, lácteos, vegetales y bebidas

Referencia: Food Standards Australia New Zealand, Australian Food Composition Database (AFCD), Release 3. Se revisaron 53 filas y 66 correspondencias de alimentos/ingredientes. Se utilizan exclusivamente las columnas por 100 g de alimento para ALA, EPA, DHA y B12. No se utiliza la columna de porcentaje de ácidos grasos. Los registros y encabezados están congelados con hashes del archivo oficial y de cada extracto.

Sobre la candidata e79fe9e61f7215be92f8cd1f0e1c1877191531af:

- 75 celdas se completan directamente desde AFCD, incluyendo ingredientes de bebidas.
- 105 valores numéricos cambian en 93 alimentos, siempre antes nulos o parciales.
- 135 perfiles mejoran si se cuentan también sumas numéricamente iguales que dejan de ser parciales gracias a ceros publicados de ingredientes.
- Perfiles completos: **551 → 662** de 853; parciales: **302 → 191**.

Se completan cajú, pistacho, pecán, macadamia, cebada cocida, trigo sarraceno, mijo, lentejas rojas, cottage, leches en polvo y descremada, té negro/verde, frutas/vegetales seleccionados, hummus, tahini, bagel, maní con chocolate y determinados mariscos cocidos. Los ingredientes de bebidas incluyen referencias genéricas de cerveza, vino, sidra, destilados, gaseosas, lima y crema. Las equivalencias y diferencias de preparación/variedad se documentan individualmente; no se presentan como formulaciones de marcas.

Los ceros numéricos reflejan la precisión y supuestos de la tabla; no significan ausencia analítica absoluta. Las celdas nulas, trazas y alimentos no equivalentes siguen sin completar. No se extrapolan fortificación, concentraciones, densidades o rendimiento de alimentos secos a cocidos. Se conservan las densidades existentes (leche 1,03 g/ml; modelo previo de bebidas 1 g/ml) y los macros, cantidades, IDs e historial.

No se completó el nori en este lote: se revisaron otras tablas pero no se incorporaron al generador. Tampoco se sustituyen automáticamente infusiones de hierbas/mate por té negro, ni se extrapolan los destilados a aperitivos/liqueurs de composición distinta. Las recetas con componentes aún desconocidos permanecen parciales.

## Licencia y atribución

Los extractos AFCD y sus valores/adaptaciones derivados conservan la licencia FSANZ basada en CC BY-SA 3.0 Australia. `licensing.json` contiene el enlace a las condiciones, atribución, descripción de cambios, declaración de origen australiano y la declaración requerida sobre limitaciones. Se reproduce en las fuentes seleccionadas, en el catálogo generado y en el archivo de equivalentes de bebidas. El software y los datos independientes constituyen obras separadas. No se implica respaldo de FSANZ.

## Verificación

```sh
python efg-nutrition/tools/build-micronutrient-catalog.py
python efg-nutrition/tools/build-micronutrient-restaurants.py
node efg-nutrition/tests/micronutrient-afcd.test.mjs
node efg-nutrition/tests/micronutrient-gaps.test.mjs
node efg-nutrition/tests/micronutrient-restaurants.test.mjs
node --test efg-nutrition/tests/micronutrients.test.mjs efg-nutrition/tests/micronutrient-coverage.test.mjs
node efg-nutrition/tests/approved-release-flags.mjs
```

Pruebas locales aprobadas: cálculo independiente de todas las celdas añadidas, preservación de valores completos, códigos/unidades, hashes, licencia y cantidades (25 g, 12,5 g, líquidos). Los generadores son reproducibles. CI específico de la candidata anterior aprobado en Chromium y WebKit: run 43644836772. Este lote amplía el recorrido visual con cajú, pistacho y lentejas rojas; requiere un nuevo pase sobre el commit final. Sin publicación ni escrituras en diarios reales.
