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
 })
]);
export const USER_PHOTO_LABEL_PORTIONS=Object.freeze({
 colonial_chocolate_organico_80_cacao:Object.freeze({
   grams:25,label:"1/4 de tableta (25 g)"
 }),
 mi_mix_nueces_almendras_avellanas_caju:Object.freeze({
   grams:25,label:"porción sugerida de mix (estimación, 25 g)"
 })
});
