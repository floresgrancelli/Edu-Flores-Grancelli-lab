// EFG Nutrition Pro / Fase 2: lotes 1 y 2 de cotejo documental 28/10/2026.
// Cada entrada corresponde al TIPO DE ALIMENTO indicado, no a una marca argentina.
// Datos por 100 g comestibles de USDA FoodData Central, SR Legacy (abril 2018).
// El cotejo se realizó con reproducciones trazables por FDC ID de las entradas USDA.
// La energía de USDA se respeta; no se recalcula por 4-4-9, por diferencias metodológicas.
// Pesos de las unidades en EXPANDED_PORTIONS siguen siendo aproximaciones separadas.
const REFERENCES=[
 // id | nombre preciso que corresponde a la tabla | FDC ID | kcal/100g | P | HC | G | fibra
 ["zapallo_anco_horno","Zapallo anco al horno sin aceite (referencia USDA)",169296,40,0.90,10.50,0.09,3.20],
 ["helado_crema_americana","Helado crema americana / vainilla tradicional (referencia USDA)",167575,207,3.50,23.60,11.00,0.70],
 ["helado_chocolate","Helado de chocolate tradicional (referencia USDA)",168809,216,3.80,28.20,11.00,1.20],
 ["chocolate_leche","Chocolate con leche común (referencia USDA)",167587,535,7.65,59.40,29.66,3.40],
 ["chocolate_amargo_70","Chocolate amargo 70–85% cacao (referencia USDA)",170273,598,7.79,45.90,42.60,10.90],
 ["chocolate_mani","Maní recubierto de chocolate con leche (referencia USDA)",168001,519,13.10,49.70,33.50,4.70],
 ["chocolate_blanco","Chocolate blanco común (referencia USDA)",167571,539,5.87,59.20,32.10,0.20],
 ["malvaviscos","Malvaviscos tradicionales (referencia USDA)",167995,318,1.80,81.30,0.20,0.10],
 // Lote 2: equivalencia exacta de cocción (hervido/escurrido, sin aceite).
 ["espinaca_hervida","Espinaca hervida, escurrida, sin sal ni aceite (referencia USDA)",168463,23,2.97,3.75,0.26,2.40],
 ["acelga_hervida","Acelga hervida, escurrida, sin sal ni aceite (referencia USDA)",170401,20,1.88,4.13,0.08,2.10],
 ["remolacha_hervida","Remolacha hervida y escurrida, sin aceite (referencia USDA)",169146,44,1.68,9.96,0.18,2.00],
 ["choclo_hervido","Choclo amarillo desgranado, hervido y escurrido, sin sal (referencia USDA)",169999,96,3.41,20.98,1.50,2.40]
];
export const VERIFIED_SOURCE_COUNT=REFERENCES.length;
export const VERIFIED_FOODS=Object.freeze(Object.fromEntries(REFERENCES.map(([id,name,fdcId,k,p,c,f,fi])=>[
 id,Object.freeze({
  name,k:k/100,p:p/100,c:c/100,f:f/100,fi:fi/100,
  sourceType:"usda_fdc",sourceId:String(fdcId),validationStatus:"tabla_referenciada",
  source:"USDA FoodData Central, SR Legacy (2018), FDC "+fdcId+
   ": "+k+" kcal; proteínas "+p+" g; hidratos totales "+c+" g; grasas "+f+
   " g; fibra "+fi+" g por 100 g. Promedio de referencia para esta preparación; no sustituye el rótulo de una marca ni el pesado de una receta. Las unidades sugeridas son pesos estimados."
 })
])));
