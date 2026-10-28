// EFG Nutrition Pro — primer lote de etiquetas ARGENTINAS del sitio del fabricante.
// Fuente 28/10/2026: tablas por 100 g de páginas oficiales Arcor enlazadas en cada ficha.
// Esto es transcripción web del fabricante, NO medición propia ni garantía de que
// la receta/envase del usuario corresponde a esta presentación, país o fecha.
// Ante cambios de fórmula, preferir rótulo vigente del envase físico.
const ROWS=[
 [
  "arcor_chocolate_leche_porcion",
  "Chocolate con leche Arcor — porción justa",
  "dessert",
  527,
  5.9,
  61,
  29,
  0,
  16,
  "2 unidades",
  "Arcor",
  "https://www.arcor.com/ar/alimentacion-productos-porcion-justa"
 ],
 [
  "arcor_chocolate_blanco_porcion",
  "Chocolate blanco Arcor — porción justa",
  "dessert",
  543,
  6.7,
  60,
  31,
  0,
  16,
  "2 unidades",
  "Arcor",
  "https://www.arcor.com/ar/alimentacion-productos-porcion-justa"
 ],
 [
  "arcor_saladix_jamon",
  "Saladix Jamón — galletitas saladas",
  "bakery",
  433,
  8.9,
  71,
  13,
  2.1,
  30,
  "porción de 30 g (aprox. 50 galletitas)",
  "Arcor / Saladix",
  "https://www.arcor.com/ar/alimentacion-productos-porcion-justa"
 ],
 [
  "arcor_mini_alfajor_aguila_chocolate",
  "Mini alfajor Águila chocolate",
  "dessert",
  401,
  6.4,
  60,
  15,
  2.4,
  24,
  "1 mini alfajor",
  "Arcor / Águila",
  "https://www.arcor.com/ar/alimentacion-productos-porcion-justa"
 ],
 [
  "arcor_chocolate_aguila_familiar",
  "Chocolate familiar Águila — tableta",
  "dessert",
  474,
  7,
  55,
  25,
  9,
  21,
  "1 tableta",
  "Arcor / Águila",
  "https://www.arcor.com/es/alimentacion-productos-sin-tacc"
 ],
 [
  "arcor_bon_o_bon_blanco",
  "Bon o Bon blanco — bombón",
  "dessert",
  564,
  11,
  49,
  36,
  0,
  15,
  "1 bombón",
  "Arcor / Bon o Bon",
  "https://www.arcor.com/ar/alimentacion-productos-porcion-justa"
 ]
];
export const ARGENTINE_LABEL_COUNT=ROWS.length;
export const ARGENTINE_LABEL_FOODS=Object.freeze(ROWS.map(([id,name,category,k,p,c,f,fi,servingGrams,portionLabel,brand,url])=>Object.freeze({
 id,name,category,unit:"g",k:k/100,p:p/100,c:c/100,f:f/100,fi:fi/100,
 brand,productType:name,suggestedBrand:true,servingGrams,
 sourceType:"manufacturer_web_label",validationStatus:"rotulo_web_fabricante",
 source:"Tabla nutricional por 100 g publicada por el fabricante Arcor (consultada 28/10/2026): "+k+
 " kcal; proteínas "+p+" g; hidratos "+c+" g; grasas "+f+" g; fibra "+fi+
 " g. Porción declarada orientativa en esta página: "+servingGrams+" g ("+portionLabel+"). "+
 "Verificá el envase real y la formulación actual; fuente oficial: "+url
})));
export const ARGENTINE_LABEL_PORTIONS=Object.freeze(Object.fromEntries(ROWS.map(([id,,,,,,,,servingGrams,portionLabel])=>[id,{grams:servingGrams,label:portionLabel}])));
