// P29H source package approved by Edu with "Aprobado", 2026-11-04, QA only.
// Disabled in repository; preview may enable for the exact authorized account pair.
export const QA_REVIEWED_SOURCES_ENABLED=false;
export function qaReviewedSourcesAllowed(coachId,studentId,enabled=QA_REVIEWED_SOURCES_ENABLED){
 return enabled===true&&coachId==='69f78429-face-4c55-a28c-357cca35d452'&&studentId==='09f08bd9-9acf-4348-9200-21a5df396aa5';
}
const rows={"apple": {"unit": "g", "k": 0.52, "p": 0.0026, "f": 0.0017, "c": 0.1381, "fi": 0.024, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/171688"}, "banana": {"unit": "g", "k": 0.89, "p": 0.0109, "f": 0.0033, "c": 0.2284, "fi": 0.026, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/173944"}, "brownrice": {"unit": "g", "k": 1.23, "p": 0.0274, "f": 0.0097, "c": 0.2558, "fi": 0.016, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/169704"}, "coffee_black": {"unit": "ml", "k": 0.010009, "p": 0.001201, "f": 0.0002, "c": 0.0, "fi": 0.0, "name": "Café filtrado con agua, sin azúcar", "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/171890"}, "egg": {"unit": "g", "k": 1.48, "p": 0.124, "f": 0.0996, "c": 0.0096, "fi": 0.0, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/748967"}, "egg_white": {"unit": "g", "k": 0.52, "p": 0.109, "f": 0.0017, "c": 0.0073, "fi": 0.0, "name": "Clara de huevo cruda, peso antes de cocinar", "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/172183"}, "fish_hake": {"unit": "g", "k": 0.99, "p": 0.193, "c": 0.0, "f": 0.0242, "fi": 0.0, "name": "Merluza cocida y escurrida, sin aceite ni sal", "sourceUrl": "https://tbca.net.br/base-dados-en/int_statistical_composition.php?cod_produto=BRC0190E"}, "mandarin": {"unit": "g", "k": 0.53, "p": 0.0081, "f": 0.0031, "c": 0.1334, "fi": 0.018, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/169105"}, "oil": {"unit": "g", "k": 8.84, "p": 0.0, "f": 1.0, "c": 0.0, "fi": 0.0, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/171413"}, "potato": {"unit": "g", "k": 0.86, "p": 0.0171, "f": 0.001, "c": 0.2001, "fi": 0.018, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/170440"}, "pumpkin": {"unit": "g", "k": 0.4, "p": 0.009, "f": 0.0009, "c": 0.1049, "fi": 0.032, "name": "Zapallo anco horneado sin sal ni aceite", "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/169296"}, "rocket": {"unit": "g", "k": 0.25, "p": 0.0258, "f": 0.0066, "c": 0.0365, "fi": 0.016, "name": null, "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/169387"}, "tofu_firm": {"unit": "g", "k": 1.44, "p": 0.1727, "f": 0.0872, "c": 0.0278, "fi": 0.023, "name": "Tofu firme con sulfato de calcio", "sourceUrl": "https://api.nal.usda.gov/fdc/v1/food/172475"}};
export function applyQaReviewedSources(guide){
 const copy=structuredClone(guide);
 for(const meal of copy.meals)for(const item of meal.items){
  const row=rows[item.id];
  if(!row||row.unit!==item.unit)throw Error('Referencia QA ausente o unidad incompatible: '+item.id);
  for(const key of ['k','p','c','f','fi'])item[key]=row[key];
  if(row.name)item.name=row.name;
  item.sourceType='validated_composition';item.validationStatus='reviewed_qa';item.sourceUrl=row.sourceUrl;
 }
 // Preparation identity is explicit on each affected ingredient.
 return copy;
}
