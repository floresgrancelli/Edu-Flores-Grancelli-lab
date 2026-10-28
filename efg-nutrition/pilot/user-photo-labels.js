// EFG Nutrition Pro · lote de productos enviados por el usuario · NO PUBLICADO.
// La información es transcripción del rótulo FOTOGRAFIADO de un envase físico.
// Energía y macronutrientes por 100 g de producto, no una medición de laboratorio.
// Porciones por 25 g: valores del envase pueden diferir de 1/4 de los de 100 g por redondeos.
//
// Entrada 1 — Chocolate Colonial orgánico amargo 80% cacao, tableta 100 g.
// El rótulo dice: porción 25 g (1/4 tableta); 4 porciones/envase.
// 25 g impresos: 150 kcal; HC 7 g; azúcares 5,3 g; añadidos 4,9 g;
// proteínas 2,9 g; grasas 11 g; saturadas 6,6 g; trans 0 g;
// fibra 3,0 g; sodio 0 mg.
// 100 g impresos: 598 kcal; HC 30 g; azúcares 21 g; añadidos 20 g;
// proteínas 11,7 g; grasas 43 g; saturadas 26 g; trans 0 g;
// fibra 11,9 g; sodio 16 mg.
//
// No inferir ingredientes ni certificaciones adicionales de un rótulo parcial.
export const USER_PHOTO_LABEL_FOODS=Object.freeze([
 Object.freeze({
   id:"colonial_chocolate_organico_80_cacao",
   name:"Chocolate Colonial orgánico 80% cacao — tableta",
   category:"dessert",
   unit:"g",
   brand:"Chocolate Colonial",
   productType:"Chocolate orgánico amargo 80% cacao",
   suggestedBrand:true,
   servingGrams:25,
   packageGrams:100,
   servingsPerPackage:4,
   k:598/100,
   p:11.7/100,
   c:30/100,
   f:43/100,
   fi:11.9/100,
   sugarPer100g:21,
   addedSugarPer100g:20,
   saturatedFatPer100g:26,
   transFatPer100g:0,
   sodiumMgPer100g:16,
   declaredServing:{
     grams:25,energyKcal:150,carbsG:7,sugarsG:5.3,addedSugarsG:4.9,
     proteinG:2.9,fatG:11,saturatedFatG:6.6,transFatG:0,
     fiberG:3.0,sodiumMg:0
   },
   sourceType:"etiqueta_fabricante",
   validationStatus:"rotulo_fotografiado",
   source:"Rótulo de la tableta Chocolate Colonial orgánico 80% cacao, envase 100 g, fotografiado por el usuario el 28/10/2026. Por 100 g, según el envase: 598 kcal, proteínas 11,7 g, hidratos 30 g, grasas 43 g, fibra 11,9 g. Porción declarada: 25 g (1/4 tableta), 150 kcal. Los valores por porción y por 100 g pueden diferir ligeramente debido al redondeo del rótulo. Se emplea la columna por 100 g para calcular pesos personalizados."
 }),
 // Entrada 2 — mezcla fotografiada a granel. El frasco confirma LOS TIPOS de frutos secos,
 // pero NO permite medir la proporción de cada componente. Se muestra el listado en el
 // nombre y fuente; los macros son ESTIMACIÓN, NO información nutricional del comercio.
 Object.freeze({
   id:"mi_mix_nueces_almendras_avellanas_caju",
   name:"Mi mix de frutos secos — nueces, almendras, avellanas y castañas de cajú",
   category:"fat",
   unit:"g",
   brand:"Mix a granel (frasco de la foto)",
   productType:"Mezcla de nueces, almendras, avellanas y castañas de cajú",
   ingredients:Object.freeze(["Nueces","Almendras","Avellanas","Castañas de cajú"]),
   servingGrams:25,
   servingIsEstimated:true,
   // Promedio simple de los 4 frutos secos = 25% c/u, SOLO COMO HIPÓTESIS.
   // Referencias genéricas PREEXISTENTES de la biblioteca (g por 100g):
   // nueces P15 HC14 G65 FIB7; almendras P21 HC22 G50 FIB12,5;
   // avellanas P15 HC17 G61 FIB10; cajú P18 HC30 G44 FIB3,3.
   // Macros promedio por 100g: P17,25 HC20,75 G55 FIB8,2; 647 kcal por 100g
   // (energía estimada por 4-4-9, no es resultado de análisis ni rótulo).
   k:6.47,p:.1725,c:.2075,f:.55,fi:.082,
   sourceType:"generic_estimate",
   validationStatus:"generico_pendiente",
   source:"COMPOSICIÓN CONFIRMADA EN FOTO DEL FRASCO: NUECES, ALMENDRAS, AVELLANAS Y CASTAÑAS DE CAJÚ. No incluye maní en la lista indicada. PROPORCIONES NO INFORMADAS: estimación nutricional usando 25% EN PESO DE CADA INGREDIENTE, con valores genéricos de la biblioteca EFG. Por 100 g de mezcla supuesta: 647 kcal, proteínas 17,25 g, hidratos 20,75 g, grasas 55 g, fibra 8,2 g. NO es un valor analítico ni un etiquetado nutricional de esta mezcla a granel. Si cambian las proporciones, cambian sus macros. Porción sugerida 25 g editable; no figura un tamaño de porción en el frasco."
 }),
 // Entrada 3 — foto de naranja azucarada a granel (tiras de cáscara de
 // naranja confitada aparentemente cubiertas de azúcar).
 // La foto sólo muestra el nombre y el precio ($2.500), NO peso ni rótulo.
 // Proxy nutricional de una cáscara de naranja confitada comparable en la
 // base suiza FSVO V7.1, documentada en https://datafood.ch/en/food/candied-orange-peel/
 // La cantidad extra de azúcar y humedad de ESTE producto pueden variar mucho.
 Object.freeze({
   id:"naranja_azucarada_cascara_confitada_granel",
   name:"Naranja azucarada — cáscara de naranja confitada en tiras (a granel)",
   category:"dessert",
   unit:"g",
   productType:"Naranja azucarada a granel, probablemente cáscara confitada en tiras",
   packagePriceARS:2500,
   packageGrams:null,
   servingGrams:25,
   servingIsEstimated:true,
   k:306/100,
   p:0.4/100,
   c:74.3/100,
   f:0.3/100,
   fi:2.3/100,
   sourceType:"generic_estimate",
   validationStatus:"generico_pendiente",
   source:"FOTO DEL USUARIO (28/10/2026): rótulo manuscrito 'NARANJA AZUCARADA', precio $2.500 por paquete, PESO NO INDICADO y SIN TABLA NUTRICIONAL. Visualmente parecen tiras de cáscara de naranja confitada recubiertas de azúcar; descripción aproximada, NO ingredientes verificados. ESTIMACIÓN POR PRODUCTO SIMILAR, NO RÓTULO DEL ENVASE: referencia suiza FSVO V7.1 para 'candied orange peel' en https://datafood.ch/en/food/candied-orange-peel/ (100 g: 306 kcal; proteínas 0,4 g, hidratos 74,3 g, grasas 0,3 g, fibra 2,3 g). Puede diferir considerablemente por humedad y cantidad de azúcar incorporada. Porción 25 g sugerida editable, NO declarada. El precio $2.500 es del paquete, NO costo por 100 g al desconocerse el peso."
 }),
 // Entrada 4 — foto de quinoa inflada a granel ("QUINOA POP" manuscrito),
 // precio $1.300 por bolsa. SIN peso neto, ingredientes ni tabla nutricional.
 // Se usa sólo como proxy la tabla de un fabricante de quinoa inflada
 // (Ceridés/Haricaman), NO corresponde necesariamente a esta bolsa.
 Object.freeze({
   id:"quinoa_inflada_pop_granel",
   name:"Quinoa inflada (quinoa pop) — a granel",
   category:"carb",
   unit:"g",
   productType:"Quinoa inflada / quinoa pop a granel, bolsa sin etiqueta nutricional",
   packagePriceARS:1300,
   packageGrams:null,
   servingGrams:20,
   servingIsEstimated:true,
   k:369/100,
   p:12/100,
   c:72/100,
   f:2.5/100,
   fi:4.7/100,
   sourceType:"generic_estimate",
   validationStatus:"generico_pendiente",
   source:"FOTO DEL USUARIO (28/10/2026): etiqueta manuscrita 'QUINOA POP', precio $1.300 por paquete; PESO NO INDICADO, SIN TABLA NUTRICIONAL ni ingredientes declarados. ESTIMACIÓN POR PRODUCTO SIMILAR, NO RÓTULO DE ESTA BOLSA: quinoa inflada Ceridés del fabricante Haricaman, https://www.haricaman.com/productos-cerides/inflados/quinoa-inflada.html (por 100 g: 369 kcal, proteínas 12 g, hidratos 72 g, grasas 2,5 g, fibra 4,7 g). La composición puede variar entre fabricantes, en particular si existe azúcar añadido, que NO puede descartarse con esta fotografía. Porción sugerida editable 20 g, NO indicada en bolsa. El precio $1.300 corresponde a la bolsa completa, de gramaje desconocido; no calcular precio por 100 g."
 })
]);
export const USER_PHOTO_LABEL_PORTIONS=Object.freeze({
 colonial_chocolate_organico_80_cacao:Object.freeze({
   grams:25,label:"1/4 de tableta (25 g)"
 }),
 mi_mix_nueces_almendras_avellanas_caju:Object.freeze({
   grams:25,label:"porción sugerida de mix (estimación, 25 g)"
 }),
 naranja_azucarada_cascara_confitada_granel:Object.freeze({
   grams:25,label:"porción sugerida (25 g, NO indicada en envase)"
 }),
 quinoa_inflada_pop_granel:Object.freeze({
   grams:20,label:"porción sugerida (20 g, NO indicada en envase)"
 })
});
