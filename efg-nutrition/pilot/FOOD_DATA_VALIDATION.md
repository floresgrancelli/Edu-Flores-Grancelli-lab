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
