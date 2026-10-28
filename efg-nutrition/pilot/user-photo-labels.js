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
 })
]);
export const USER_PHOTO_LABEL_PORTIONS=Object.freeze({
 colonial_chocolate_organico_80_cacao:Object.freeze({
   grams:25,label:"1/4 de tableta (25 g)"
 })
});
