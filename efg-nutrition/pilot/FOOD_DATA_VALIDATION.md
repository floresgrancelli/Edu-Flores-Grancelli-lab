# EFG Nutrition — Validación del catálogo de alimentos (fase 1)

**Inicio:** 26/10/2026. **Estado:** auditoría inicial en curso; NO equivale a validar toda la biblioteca ni a certificar los datos.

## Fuentes y orden de prioridad

1. **Producto industrial con marca identificada:** rótulo del envase real del producto/lote y, cuando sea posible, ficha del fabricante. Para productos argentinos contrastar su registro/información nutricional con el buscador de ANMAT/SIFeGA. La fuente es el fabricante, no un análisis del equipo EFG.
2. **Alimento simple sin marca:** USDA FoodData Central **Foundation Foods** y, si corresponde, bases regionales **ARGENFOODS/LATINFOODS**. Registrar la tabla, identificación de alimento, fecha/versión y forma de preparación. Si se usa FNDDS u otras tablas, indicarlo.
3. **Preparación casera:** estimación a partir de ingredientes pesados y rendimiento de cocción, con receta visible. Si no hay receta estándar validada, mantener estado «estimado».
4. **Valores genéricos heredados:** nunca declararlos analizados/validados sin fuente trazable.

Fuentes oficiales:
- USDA: https://fdc.nal.usda.gov/data-documentation/
- USDA descargas/versiones: https://fdc.nal.usda.gov/download-datasets/
- FAO INFOODS, Argentina: https://www.fao.org/infoods/infoods/tablas-y-bases-de-datos/america-latina/es/
- **Licencias:** USDA FDC es CC0/dominio público (https://fdc.nal.usda.gov/api-guide/). ARGENFOODS/LATINFOODS publica restricciones de reproducción/alteración/comercialización y exige contacto para fines comerciales (https://latinfoodsportal.net/paises/main.php?sg2=ar&sg3=arg). Usarla para orientación y evaluación de disponibilidad, NO copiarla al catálogo comercial sin consentimiento/licencia expresa.
- Portal LATINFOODS: https://www.latinfoodsportal.net/latinfoods.php
- ANMAT / SIFeGA: https://www.argentina.gob.ar/node/410817
- Factores energéticos del rotulado argentino: https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-683-2005-110017/actualizacion

## Hallazgos iniciales sobre el código de la rama

- Se encontraron **134 alimentos** en RAW_FOODS, **147 alimentos** en REGIONAL_FOODS y **63 alimentos** en EXPANSION_FOODS: **344 fichas genéricas o de preparación** en la biblioteca ampliada; hay además alimentos principales declarados en pilot.js. No significa 344 alimentos verificados.
- En RAW_FOODS hay **14 fichas base con proteínas, carbohidratos y grasas en cero**: varias corresponden a infusiones sin azúcar. **Inspección estática posterior:** la interfaz usa `calculateBeverage` para sumar los aportes de la leche seleccionada y del azúcar de las bebidas personalizables. Por ello los ceros son una referencia base y NO necesariamente un error de totales. Queda pendiente probar la operación en navegador con sesiones reales.
- La biblioteca incluye `milanesa_soy_baked` como **estimación genérica al horno**: 11 g proteínas, 17 g carbohidratos y 7 g grasas por 100 g, equivalentes a **175 kcal / 100 g**.
- El nuevo producto **Gobinda – Milanesas simples de harina de soja**, según foto del rótulo aportado el 26/10/2026, declara **312 kcal; 20,67 g proteínas; 32,33 g carbohidratos; 11,15 g grasas; 7,5 g fibra; 290 mg de sodio y 640 mg de potasio por milanesa de 125 g**. Esto equivale a **249,6 kcal / 100 g**. La diferencia con la genérica es de **74,6 kcal / 100 g (≈42,6%)**; deben mantenerse como entradas DISTINTAS, sin transferir los macros de una a otra.
- Control de coherencia energética para Gobinda: proteínas×4 + carbohidratos×4 + grasas×9 = **312,35 kcal**, diferencia de **0,35 kcal** respecto de las 312 declaradas; consistente con redondeo de etiqueta. El cálculo utiliza factores 4/4/9 del rotulado.

## Estado de procedencia recomendado

- `rotulo_fotografiado`: dato transcripto de una etiqueta real, no análisis químico de EFG; preferir esta entrada para la marca correspondiente.
- `tabla_referenciada`: ficha asociada con ID, versión, matriz analítica y preparación de una tabla confiable.
- `receta_estimado`: receta casera con ingredientes/rendimiento explícitos.
- `generico_pendiente`: promedio inicial sin correspondencia exacta demostrada.

## Reglas antes de pasar un alimento a «tabla_referenciada»

- Mantener ID estable, nombre claro, **marca y presentación** si corresponde, y porción predeterminada editable.
- Identificar **crudo/cocido/envasado**, cantidad comestible, aceite de cocción y mermas por agua; jamás comparar 100 g crudos con 100 g cocidos como si fueran iguales.
- Registrar energía (kcal), proteínas, carbohidratos, grasas y fibra por **100 g/ml**, con su fuente y unidad. Ausencia de dato NO implica cero.
- Verificar energía calculada por macronutrientes como alarma de coherencia, no como criterio único de corrección (fibra, polialcoholes y reglas de rotulado pueden alterar el cálculo).
- Revisar alérgenos y gluten usando envase íntegro/registro del fabricante: la foto parcial Gobinda NO autoriza declaración «sin TACC» ni «apto celíacos»; se confirma soja y se deja el resto por verificar.
- No replicar declaraciones de propiedades terapéuticas de las etiquetas como recomendaciones clínicas.
- Describir sugerencias de marcas como tales, no como aprobación sanitaria, efectividad clínica o ranking científico.

## Pruebas de aceptación para la nueva ficha Gobinda

1. Buscar «Gobinda» o «milanesa de soja» en el catálogo del alumno y confirmar que se distingue de «Milanesa de soja al horno» genérica.
2. Registrar 1 unidad: **125 g; 312 kcal; 20,67 g de proteína; 32,33 g de hidratos; 11,15 g de grasa**. Registrar 2 unidades: 250 g y exactamente el doble de cada aporte.
3. Registrar 100 g personalizados: **249,6 kcal; 16,536 g de proteína; 25,864 g de hidratos; 8,92 g de grasa** (el UI puede redondear para mostrar).
4. Confrontar consumidos/restantes del día y la persistencia al recargar; revisar también la vista privada del coach bajo consentimiento.
5. Si se utiliza aceite en la preparación, agregarlo como ingrediente independiente; no inventar absorción de aceite.
6. Confirmar que toda la biblioteca disponible se ofrece al alumno sin autorizaciones alimento por alimento, según decisión funcional del piloto.

## Siguiente lote prioritario de validación (pendiente)

Arroz blanco/integral crudo y cocido; papa y batata crudas/hervidas/al horno; huevo; pollo crudo y cocido; carne vacuna magra; cerdo; leche entera/descremada; yogures; avena; pan; aceite de oliva; whey de distintas marcas; barras proteicas. Empezar por los más usados y después avanzar por categoría. **No sustituir números en masa sin verificar cada definición exacta.**

## Estado técnico

Esta fase solo toca el catálogo público de alimentos y documentación científica de la rama `efg-nutrition-app`. No modifica autenticación, roles, consentimiento, pagos ni datos privados de alumnos. Verificar despliegue en Render antes de afirmar que una nueva ficha ya es visible en producción.


## Lote 2 — fuentes USDA por FDC_ID (26/10/2026)

Incorporamos referencias identificables manteniendo la diferencia crudo/cocido, las fuentes de energía propias de USDA y la marca de dato genérico vs. dato de tabla. **Los valores se contrastaron contra fichas secundarias que reproducen los registros FDC e indican fecha y FDC_ID; la comprobación independiente directa vía API oficial USDA continúa pendiente**. Por eso no es correcto afirmar que todo el catálogo se verificó con descarga directa ni que se analizó químicamente.

| Registro en EFG | Condición específica | kcal/100 g | Proteína/100 g | HC/100 g | Grasa/100 g | ID, fuente y año |
|---|---|---:|---:|---:|---:|---|
| `egg` | Huevo entero grado A grande sin cáscara, referencia crudo | 148 | 12,40 | 0,96 | 9,96 | 748967, Foundation Foods 04/2026 |
| `egg_white` | Clara grado A grande, referencia crudo | 55 | 10,70 | 2,36 | 0,00 | 747997, Foundation Foods 04/2026 |
| `oats_raw` | Avena arrollada seca sin fortificar | 379 | 13,20 | 67,70 | 6,50 | 173904, SR Legacy 04/2018; fibra 10,1 g/100 g |
| `rice` | Arroz blanco cocido sin grasa añadida | 129 | 2,67 | 27,99 | 0,28 | 2708408, FNDDS 2021-2023 |
| `potato` | Papa hervida sin piel y sin sal | 86 | 1,71 | 20,01 | 0,10 | 170440, SR Legacy 04/2018 |
| `chicken_breast_raw` | Pechuga cruda sin piel y hueso | 120 | 22,50 | 0,00 | 2,62 | 171077, SR Legacy 04/2018 |
| `chicken_breast_roasted` (nueva) | Pechuga al horno sin consumir la piel, desde crudo | 161 | 30,22 | 0,00 | 3,52 | 2705956, FNDDS 2021-2023 |
| `chicken_thigh_cooked` | Muslo de pollo sin piel asado | 179 | 24,76 | 0,00 | 8,15 | 172388, SR Legacy 04/2018 |

Fuentes de consulta para cotejo de cifras por identificador: 
- https://nutrientgraph.com/foods/eggs-grade-a-large-egg-whole-fdc-748967/
- https://nutrientgraph.com/foods/eggs-grade-a-large-egg-white-fdc-747997/
- https://www.wtfgyms.com/nutrition/oats (copia con referencia USDA FDC 173904)
- https://nutrientgraph.com/foods/rice-white-cooked-no-added-fat-fdc-2708408/
- https://nutrientgraph.com/foods/potatoes-boiled-cooked-without-skin-flesh-without-salt-fdc-170440/
- https://nutrientgraph.com/foods/chicken-broiler-or-fryers-breast-skinless-boneless-meat-only-raw-fdc-171077/
- https://nutrientgraph.com/foods/chicken-breast-baked-broiled-or-roasted-skin-not-eaten-from-raw-fdc-2705956/
- https://nutrientgraph.com/foods/chicken-broilers-or-fryers-thigh-meat-only-cooked-roasted-fdc-172388/

**Diferencias de modelo energético:** el archivo ampliado EFG generaba `k` aplicando 4-4-9 a todos los macronutrientes. Para las 8 fichas referenciadas, se asigna la **energía publicada** por la tabla, que puede no coincidir con 4-4-9 por los factores Atwater específicos, tipos de carbohidrato y redondeos. En USDA el campo «Carbohydrate, by difference» puede incluir fibra, mientras que el rótulo argentino distingue fibra por separado: advertirlo antes de comparar o transformar valores.

**Campo todavía pendiente:** la fibra del arroz blanco FDC 2708408 quedó en **0,4 g/100 g de la estimación EFG anterior**, explícitamente marcada pendiente, porque el extracto cotejado no muestra ese dato. No presentarla como verificada hasta consultar el registro completo.

**No sustituir:** `chicken` (pollo cocido genérico) por la pechuga: son preparaciones diferentes. No convertir gramos crudos a cocidos sin conocer el rendimiento real. La ficha `milanesa_soy_gobinda` sigue diferenciada de `milanesa_soy_baked`.

**Pruebas funcionales pendientes:** confirmar búsqueda en UI y cálculos persistentes del alumno/coach; y comprobar que Render haya recibido los últimos commits. Los cambios quedan guardados en GitHub; un commit NO equivale automáticamente a un despliegue. 


## Control automatizable del catálogo ampliado (26/10/2026)

Se añadió `pilot/test-food-catalog.mjs` para ejecutar de manera local sin datos privados. Controla que los IDs sean únicos, que existan fuentes y estados de procedencia, que kcal/macros sean números finitos no negativos, que Gobinda mantenga sus valores por 1 y 2 milanesas, y que las 5 referencias USDA dentro de `food-catalog.js` conserven FDC_ID y energía por 100 g. Ejecución: `node efg-nutrition/pilot/test-food-catalog.mjs`.

**Comprobación puntual de JS en el entorno de edición:** módulo evaluado correctamente, **346 fichas en biblioteca ampliada**, 346 IDs distintos, cero números faltantes/no finitos/negativos, 340 fichas genéricas, 5 referencias USDA y 1 etiquetada Gobinda. Fuera de este módulo, `pilot.js` contiene alimentos base adicionales (3 actualizados con fuentes USDA identificadas) que no entran en ese conteo. **La prueba reproducible fue añadida al repositorio, pero aún no se ejecutó en el runtime de Node del proyecto.**


### Avena y receta del budín
Se actualizó `oats_raw`: 379 kcal, 13,2 g proteínas, 67,7 g carbohidratos, 6,5 g grasas y 10,1 g fibra por 100 g de avena seca (FDC 173904). La cifra anterior derivada con 4-4-9 era aproximadamente 355 kcal y solo 60 g de hidratos por 100 g. **El budín proteico EFG recalcula sus macros desde los ingredientes en tiempo de ejecución** mediante `setBudinNutrition()`; por eso la nueva avena se refleja en sus porciones de forma automática sin modificar el peso de 82,5 g estimado por porción. La producción definitiva sigue pendiente de prueba funcional.


## Lote 3 — Fritolim, lácteos y cereales (26/10/2026)

### Huevo frito con Fritolín / Fritolim
- **Nueva ficha**: `huevo_frito_fritolim`, preparación a la plancha con aerosol antideslizante en **pulverización mínima**, que se considera energéticamente despreciable para el registro de uso habitual, **pero no químicamente sin calorías**. Por unidad de huevo sin cáscara (50 g, peso de referencia crudo): ≈74 kcal, 6,2 g de proteínas, 0,48 g de hidratos y 4,98 g de grasas (base FDC 748967).
- Su identificación correcta no es «huevo frito con aceite», y no debe recibir automáticamente los 109 kcal estimados para esa otra preparación.
- Fritolim (también llamado informalmente «Fritolín») es rocío vegetal; las porciones muy pequeñas pueden declararse «0 kcal» por **redondeo regulatorio**, no porque un aerosol a base de aceite tenga literalmente 0 calorías. Una pulverización de mayor duración o varias aplicaciones debe contabilizarse por separado. Fuentes orientativas: https://www.fatsecret.com.ar/calorías-nutrición/cocinero ; https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-683-2005-110017/actualizacion (umbral de 4 kcal por porción para declaración de cantidades no significativas).
- **Corrección de la ficha anterior** `huevo_frito`: el valor de 109 kcal por unidad de 50 g representa una **preparación promedio con aceite YA incluido**. Se actualiza su nombre y la ayuda del modal para evitar doble contabilización. No afirma que todos los huevos fritos absorban idéntica cantidad de aceite.
- **No usar los valores del huevo crudo por 100 g para afirmar composición medida del huevo cocido por 100 g**: la unidad equivale a un huevo mediano de referencia, cuya masa comestible inicial es 50 g. Se conserva el estado de **receta estimada**, NO «tabla USDA validada» para la preparación Fritolim.

### Lácteos

| Código | Especificación | Referencia USDA FDC | Estado | Energía | Proteínas | Carbohidratos | Grasas |
|---|---|---|---|---:|---:|---:|---:|
| `milk_whole` | Leche entera 3,25% | 171265 | Tabla convertida de g a ml | 62,83 kcal/100 ml | 3,2445 g/100 ml | 4,944 g/100 ml | 3,3475 g/100 ml |
| `milk_skim` | Leche descremada, sin vitaminas añadidas | 173432 | Tabla convertida de g a ml | 36,05 kcal/100 ml | 3,4711 g/100 ml | 5,0058 g/100 ml | 0,1854 g/100 ml |
| `yogurt` | Yogur natural descremado sin azúcar | 2647437 | Tabla referenciada | 50 kcal/100 g | 4,2 g/100 g | 8,1 g/100 g | 0,087 g/100 g |
| `yogurt_greek_light` | Yogur griego natural 0% | 170894 | Tabla referenciada | 59 kcal/100 g | 10,2 g/100 g | 3,6 g/100 g | 0,39 g/100 g |

La conversión de las dos leches usa densidad **1,03 g/ml**, valor orientativo en el intervalo físico documentado de leche vacuna. Este factor tiene incertidumbre y no sustituye la etiqueta de una marca argentina. Fuente para la densidad: https://www.argentina.gob.ar/sites/default/files/informe_definitivo_uai_no_031-001-2016.pdf (rango de referencia 1,028–1,035 g/cm³). La ficha de la leche descremada USDA corresponde a una composición sin vitaminas A/D añadidas; el enriquecimiento de marcas nacionales puede diferir. Porciones expresadas originalmente en g, no en ml.

### Cereales y grasas (crudos/cocidos no intercambiables)

| Código | Especificación exacta | USDA FDC | Energía (kcal/100 g) | P/100 g | HC/100 g | G/100 g |
|---|---|---|---:|---:|---:|---:|
| `rice_dry` | Arroz blanco largo seco, sin enriquecer | 169756 | 365 | 7,1 | 80,0 | 0,7 |
| `rice` | Arroz blanco cocido sin aceite | 2708408 | 129 | 2,67 | 27,99 | 0,28 |
| `pasta_dry` | Fideos de trigo secos sin enriquecer | 168927 | 371 | 13,0 | 74,7 | 1,51 |
| `pasta` | Fideos cocidos sin salsa | 169737 | 158 | 5,8 | 30,9 | 0,93 |
| `oil` | Aceite de oliva en gramos | 171413 | 884 | 0 | 0 | 100 |

La diferencia entre gramos crudos y cocidos depende de la absorción de agua. **Nunca aplicar un factor de rendimiento fijo a todos los tipos de arroz y pasta** sin estandarización culinaria.

### Verificación técnica (sin datos privados)
- Control estático y evaluación del módulo de catálogo superados: **347 fichas ampliadas, todas con ID distinto**, sin cantidades energéticas/macros negativas o no finitas en ese módulo.
- Clasificación ampliada actual: **8 fuentes USDA directas por ID**, **2 referencias USDA convertidas de g a ml**, **1 etiqueta Gobinda**, **1 receta huevo/Fritolim**, **335 fichas genéricas**. El archivo principal de la aplicación aporta otros alimentos referenciados, incluidos huevo entero, arroz/papa, yogur natural, fideos cocidos y aceite de oliva.
- Se actualizaron pruebas locales para ingredientes de marca, porciones de huevo con aerosol, aceite ya incluido, factores de ml y las fuentes documentadas de arroz/fideos. El módulo y el archivo principal fueron revisados sintácticamente en el entorno de edición; **las pruebas de navegador, persistencia en Supabase y despliegue Render siguen pendientes**.
- **Limitación de verificación científica**: identificación de FDC_ID y cifras cotejadas con fuentes secundarias públicas. Es necesaria una pasada final contra los detalles oficiales de USDA antes de promover estos registros a un estado institucional de validación completa.


## Auditoría transversal de 370 alimentos — 26/10/2026

**Alcance y método.** Se analizaron todas las filas de `pilot.js` (catálogo principal) y `food-catalog.js` (biblioteca ampliada) con una exportación reproducible, `audit-food-catalog.mjs`, que genera `FOOD_CATALOG_AUDIT_2026-10-26.csv` (370 filas). Cada fila conserva identificador, categoría, unidad, macros, energía, origen declarado, FDC_ID cuando existe, estado de respaldo, comparación aproximada de energía contra el método general 4/4/9 y señales de revisión. La revisión de integridad encontró **0 IDs repetidos** y **0 valores negativos o no finitos**; también hay **0 divergencias de más de 40 kcal/100 g entre energía y 4/4/9 en alimentos genéricos**, pero ese control matemático NO demuestra que los valores nutricionales sean correctos. Para USDA, pueden existir diferencias esperables por fibra y factores Atwater.

**Estado después de incorporar las seis referencias siguientes:**

| Nivel | Fichas | Interpretación |
|---|---:|---|
| Tablas USDA con FDC_ID citado | 20 | Identificadas y cotejadas con referencias públicas; **confirmación integral primaria pendiente** |
| USDA convertidas de g a ml | 2 | Dato referenciado con densidad estimada, no etiqueta en ml |
| Etiqueta comercial fotografiada (Gobinda) | 1 | Transcripción de envase real; la marca puede actualizar formulación |
| Receta calculada (budín, huevo con Fritolim) | 2 | Cantidades y técnica de preparación estimadas |
| Promedios genéricos sin registro nutricional trazable | 345 | **No validados científicamente**, disponibles solo como estimaciones orientativas |
| **Total** | **370** | El reporte incluye cada ficha, sin exclusiones |

**Seis referencias añadidas en este control:**
- Banana cruda sin cáscara (`banana`, 173944): 89 kcal, P 1,09 g, HC totales 22,84 g, G 0,33 g/100 g.
- Palta cruda, pulpa (`avocado`, 171705): 160 kcal, P 2 g, HC totales 8,53 g, G 14,66 g/100 g.
- Manzana cruda con cáscara (`apple`, 171688): 52 kcal, P 0,26 g, HC totales 13,81 g, G 0,17 g/100 g.
- Zanahoria cruda (`carrot_raw`, 170393): 41 kcal, P 0,93 g, HC totales 9,58 g, G 0,24 g/100 g.
- Espinaca hervida escurrida (`spinach_cooked`, 168463): 23 kcal, P 2,97 g, HC totales 3,75 g, G 0,26 g/100 g.
- Tomate rojo maduro crudo (`tomato`, 170457): 18 kcal, P 0,88 g, HC totales 3,89 g, G 0,20 g/100 g. La fibra de esta ficha sigue marcada como estimación provisional (1,2 g/100 g).

**Verificación externa de este lote:** cotejo de descripciones, macros y números FDC en copias públicas con referencia a USDA SR Legacy; no se ha descargado todavía la base oficial para comprobar todos los nutrientes, revisiones y micronutrientes a nivel de campo. Ejemplos de registros públicos: https://rawpawiq.com/ingredient/bananas-raw-173944 ; https://nutrientgraph.com/foods/avocados-raw-all-commercial-varieties-fdc-171705/ ; https://rawpawiq.com/ingredient/apples-raw-with-skin-includes-foods-for-usda-s-food-distribution-program-171688 ; https://rawpawiq.com/ingredient/carrots-raw-170393 ; https://rawpawiq.com/ingredient/spinach-cooked-boiled-drained-without-salt-168463 ; https://nutrientgraph.com/foods/tomatoes-red-ripe-raw-year-round-average-fdc-170457/ .

### Cambios de transparencia en la interfaz

El editor ahora declara el **origen/limitación del alimento junto a sus macros**. Cada registro nuevo también conserva `sourceType`, `sourceId` cuando corresponda y `validationStatus` para permitir auditoría histórica. Los valores genéricos no se bloquean: el usuario puede seguir registrando cualquier alimento, pero verá que son estimados. El catálogo conserva whey por scoop de 30 g, huevo con Fritolim como receta estimada y marca Gobinda por etiqueta.

### Pendientes imprescindibles para declarar la prioridad 1 *científicamente completa*

1. Descargar y cruzar directamente USDA Foundation/SR Legacy/FNDDS, respetando versión, alimento, parte comestible y métodos de preparación, para los 20 IDs actuales y luego para los genéricos que tengan equivalentes exactos.
2. Para **345 genéricos sin fuente**: asociar una tabla con ID verificable solo cuando alimento/preparación coincidan; en recetas variables exigir ingredientes y rendimiento, mantener la estimación si no existe receta unívoca; para marcas pedir rótulo o ficha de fabricante. No inventar una fuente ni sustituir valores masivamente.
3. Revisión específica de hidratos por diferencia (USDA incluyen fibra) versus declaración de carbohidratos del rótulo argentino y factores energéticos; revisar coherencia de los objetivos y porcentajes sin cambiar metas personales en silencio.
4. Verificar el flujo de alumno/coach en sesiones autorizadas y un despliegue de la última rama GitHub en Render antes de dar por visible la interfaz.
5. Licenciamiento: FoodData Central CC0 (https://fdc.nal.usda.gov/), pero ARGENFOODS/LATINFOODS exige consulta previa a coordinadores para cualquier fin comercial (https://latinfoodsportal.net/paises/main.php?sg2=ar&sg3=arg); **no copiar** a EFG Nutrition sin permiso.

**Estado:** auditoría estructural y de procedencia del catálogo completo realizada; **validación científica individual de las 345 estimaciones genéricas aún no completada**. Evitar usar las expresiones «todos los alimentos validados» o «precisión garantizada».
