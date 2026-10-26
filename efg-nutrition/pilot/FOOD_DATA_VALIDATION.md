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
- Portal LATINFOODS: https://www.latinfoodsportal.net/latinfoods.php
- ANMAT / SIFeGA: https://www.argentina.gob.ar/node/410817
- Factores energéticos del rotulado argentino: https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-683-2005-110017/actualizacion

## Hallazgos iniciales sobre el código de la rama

- Se encontraron **134 alimentos** en RAW_FOODS, **147 alimentos** en REGIONAL_FOODS y **63 alimentos** en EXPANSION_FOODS: **344 fichas genéricas o de preparación** en la biblioteca ampliada; hay además alimentos principales declarados en pilot.js. No significa 344 alimentos verificados.
- En RAW_FOODS hay **14 fichas con proteínas, carbohidratos y grasas en cero**: la mayoría son agua o infusiones sin azúcar y pueden ser plausibles; sin embargo, `coffee_milk`, `coffee_cortado`, `tea_milk` y `mate_cocido_milk` son bebidas «personalizables» que no deben contabilizarse como cero si se agregó leche. Verificar comportamiento del editor de bebida en la prueba funcional.
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
