// Guía alimentaria educativa: presentación por grupos, sin alterar gramos,
// composición, totales, permisos, planes guardados ni motor de cálculo.
// Se utiliza tanto en la revisión del coach como en la vista del alumno.
import {GUIDED_MEAL_GROUPS,isGuidedMealSlot,guidedMealGroupFor} from "./guided-meal-picker.js";

export const GUIDE_EDUCATION_HINTS=Object.freeze({
 protein:"Identificá las fuentes de proteína. También pueden aportar grasas e hidratos.",
 carb:"Identificá las fuentes de hidratos. También pueden aportar proteína o grasas.",
 prepared:"Una tarta, pizza, empanada o sushi puede combinar varios nutrientes: se registra una sola vez.",
 other:"Verduras, bebidas, aceites y otros alimentos completan la comida; sus nutrientes también cuentan."
});

export function educationalGuideSections(meal,categoryFor=()=> "other"){
 if(!isGuidedMealSlot(meal?.slot))return null; // nunca agrupar colaciones o merienda
 const items=Array.isArray(meal.items)?meal.items:[];
 const sections=GUIDED_MEAL_GROUPS.map(group=>({
  id:group.id,title:group.title,hint:GUIDE_EDUCATION_HINTS[group.id],entries:[]
 }));
 items.forEach((food,index)=>{
  const group=guidedMealGroupFor(food,categoryFor(food));
  const destination=sections.find(section=>section.id===group)||sections[3];
  // Conservar el índice ORIGINAL; los inputs del coach usan slot:index.
  destination.entries.push({food,index});
 });
 // Mostrar siempre fuentes de proteína e hidratos, incluso si falta alguna.
 // Los grupos adicionales solo se muestran cuando contienen alimentos.
 return sections.filter(section=>section.entries.length||section.id==="protein"||section.id==="carb");
}
