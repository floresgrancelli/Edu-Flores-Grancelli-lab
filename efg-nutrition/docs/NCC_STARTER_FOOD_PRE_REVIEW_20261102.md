# NCC · Primer catálogo del piloto: selección con fuente comprobable
**02/11/2026 · PR43 · Revisión preliminar, NO aprobada ni instalada.**

Se analizan diez registros originales del manifiesto de USDA FDC SR Legacy 2018-04, con hash por registro y nutrientes por 100 g. El chequeo `efg-nutrition/tests/starter-food-source-identity-20261102.mjs` cruza el FDC ID con el alimento real de la PWA y calcula diferencias por 100 g. No son declaraciones de equivalencia médica, ni sustituyen una revisión del coach.

**Bloqueos confirmados:** el pollo genérico `chicken` NO equivale a pechuga asada FDC 171477; la leche registrada en ml NO equivale directamente a datos por 100 g sin densidad. La espinaca genérica «cocida» no especifica hervida/escurrida/sin sal; el arroz integral «cocido» no especifica grano largo. Esos casos necesitan aclaración de identidad antes de aprobar la referencia.

El informe marca diferencias nutricionales mayores de 10 kcal, 1 g de proteína o carbohidratos, 0,5 g grasa o fibra por 100 g para revisión adicional. Son tolerancias de **cribado**, no autorizaciones para modificar macros ni sustituir datos oficiales. Todos los registros mantienen `publishable=false`, `operatorReviewed=false`, `serverEvidenceSeeded=false`.

**Próximo paso:** resolver los IDs seleccionados para cinco comidas (incluida una fuente proteica exacta con preparación compatible), obtener aceptación de quien revisa el alimento, y registrar en backend solamente esas evidencias autorizadas. El existente `chicken_breast_roasted` de la PWA usa FNDDS 2705956, fuente DISTINTA de SR Legacy 171477. No se valida uno con el otro. Ningún SQL de producción ni cambio de catálogo histórico.

Fuentes: USDA https://fdc.nal.usda.gov/data-documentation/ ; manifiesto `NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json`.


## Fuente de proteína exacta — nueva prueba
El alimento `chicken_breast_roasted` de la PWA sí tiene un identificador de fuente FNDDS específico: **USDA FDC 2705956** («Chicken breast, baked, broiled, or roasted, skin not eaten, from raw»). La referencia publicada asigna **161 kcal, 30,22 g de proteína, 3,52 g de grasa y 0 g de carbohidratos por 100 g**, coincidentes con los valores por gramo en el catálogo. Se incluyó el test `starter-chicken-fndds-identity-20261102.mjs` para impedir que se sustituya ese ID por el genérico `chicken` (SR Legacy FDC 171477). **Verifica coherencia documental y código, NO certifica aún captura de bytes fuente original, revisión nutricional firmada ni alta como alimento `reviewed` del servidor.** Hasta ese control final queda sin aprobar para publicación de guía.

Fuente oficial sobre tipos distintos FNDDS / SR Legacy: https://fdc.nal.usda.gov/data-documentation/
Referencia de valores FDC 2705956: https://nutrientgraph.com/foods/chicken-breast-baked-broiled-or-roasted-skin-not-eaten-from-raw-fdc-2705956/
