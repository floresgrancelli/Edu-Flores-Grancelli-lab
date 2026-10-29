import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import {pastelDaySummary} from "./pastel-day.js?v=20261028-phase3-pastel-preview1";
import {calculateWeeklyConsistency,weeklyConsistencyPanel} from "./weekly-consistency.js?v=20261029-coach-commercial-r1";
import {FOOD_GROUPS,FOOD_DEFAULTS,MEAL_ORDER,optionsFor,allPlannerFoods,makePlan,plannerEnergyBreakdown,projectNutritionBalance} from "./planner.js?v=20261027-partial-merienda-v5";
import {EXTRA_FOODS,FOOD_CATEGORIES,LEGACY_CATEGORIES,FOOD_UNIT_PORTIONS,foodSearchText} from "./food-catalog.js?v=20261029-plant1";
import {applyRecipeModels} from "./recipe-models.js?v=20261028-recipe1";
import {applyRegionalCompositeModels} from "./regional-composite-models.js?v=20261028-regional2";
import {buildNutritionReport,nutritionReportText} from "./daily-report.js?v=20261027-auto2359-v1";
import {weeklyNumbers} from "./weekly-metrics.js?v=1";
import {progressDashboard} from "./progress-charts.js?v=20261027-premium33";
import {FIT_RECIPES,recipeTotals} from "./fit-recipes.js?v=20261027-fit1";
import {FIT_RECIPE_PHOTOS} from "./fit-recipe-photos.js?v=20261027-realphotos1";
import {estimateMacros,ACTIVITY_LEVELS,RECOMP_STRATEGIES} from "./macro-engine.js?v=20261027-science1";
import {motivationOfTheDay} from "./daily-motivation.js?v=20261027-weekly-messages-v1";
import {isNutritionDayClosed,argentinaClock} from "./day-lifecycle.js?v=20261027-auto2359-v1";
import {adjustNutritionGoal,goalForDate} from "./goal-adjustments.js?v=20261026-coach-calories-3modes-v1";
import {generateGuidedDay,guideTotals,guideDeviation,validateGuidedDay,summarizeBaseline,guidedFoodAlternatives,guidedPortionBounds,swapGuidedFood,rebalanceGuidedDay,describeGuidedMeal} from "./guided-day.js?v=20261028-guide4";
import {createNotificationInbox} from "./notifications-ui.js?v=20261029-gold-bell1";
import {habitualShortLabel,habitualPreviewHTML} from "./habitual-preview.js?v=20261029-habitual-preview1";
import {createMessagesCenter} from "./messages-ui.js?v=20261029-chats1";
import {createCoachIntakeFlow,intakeSaveButtonLabel} from "./coach-intake-flow.js?v=20261029-intake2";
import {createCoachCalculatorPrefill,coachGuidePreviewAllowed} from "./coach-intake-prefill.js?v=20261029-prefill1";
import {createPullToRefresh} from "./pull-refresh.js?v=20261028-pull1";
import {createVersionNotice} from "./version-notice.js?v=20261028-diag1";

const SUPABASE_URL="https://cyjvddhimbsfipjfctsl.supabase.co";
const SUPABASE_PUBLISHABLE="sb_publishable_85h68iKEFdxLTWM86Z8svg_a4s349CZ";
const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const root=document.getElementById("app");
const today=()=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k)?.value||"";return get("year")+"-"+get("month")+"-"+get("day");};
const yesterday=()=>{const d=new Date(today()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);};
const escapeHTML=(v)=>String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=(v,d=0)=>Number(v||0).toLocaleString("es-AR",{maximumFractionDigits:d});
const mealSlots=[["desayuno","Desayuno","☀️"],["media_manana","Media mañana","🥛"],["almuerzo","Almuerzo","🍽️"],["media_tarde","Media tarde","☕"],["merienda","Merienda","🍌"],["cena","Cena","🌙"]];
const FOOD_STATE_PAIRS={rice:["rice","rice_raw"],pasta:["pasta","pasta_raw"],potato:["potato","potato_raw"],chicken:["chicken","chicken_raw"]};
const RAW_STATE_FOODS=[
{id:"rice_raw",name:"Arroz blanco crudo / seco",unit:"g",k:3.65,p:.0713,c:.80,f:.0066,fi:.013,sourceType:"usda_fdc",sourceId:"169756",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 169756: valores por 100 g en crudo."},
{id:"pasta_raw",name:"Fideos de trigo secos / crudos",unit:"g",k:3.71,p:.13,c:.747,f:.0151,fi:.032,sourceType:"usda_fdc",sourceId:"168927",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 168927: pasta seca sin enriquecer por 100 g."},
{id:"potato_raw",name:"Papa cruda con piel",unit:"g",k:.77,p:.0205,c:.1749,f:.0009,fi:.021,sourceType:"usda_fdc",sourceId:"170026",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 170026: papa cruda con piel por 100 g. Para papa pelada utilizar una ficha específica."},
{id:"chicken_raw",name:"Pechuga de pollo cruda sin piel ni hueso",unit:"g",k:1.20,p:.225,c:0,f:.0262,fi:0,sourceType:"usda_fdc",sourceId:"171077",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 171077: pechuga cruda sin piel ni hueso por 100 g. El equivalente cocido debe coincidir en corte y preparación."}
];
const sportTimes=[["pre","Preentrenamiento"],["during","Durante el entrenamiento"],["post","Postentrenamiento"],["morning","Media mañana"],["afternoon","Media tarde"],["other","Otro momento"]];
const foods=[
 {id:"egg",name:"Huevo entero sin cáscara (referencia crudo)",unit:"g",k:1.48,p:.124,c:.0096,f:.0996,fi:0,source:"USDA FoodData Central Foundation Foods (04/2026), FDC 748967: huevo entero grado A grande, sin cáscara, referencia sin cocción. Valores por 100 g: 148 kcal; proteínas 12,4 g; hidratos totales 0,96 g; grasas 9,96 g. No sumar aceite de cocción; registrarlo aparte.",sourceType:"usda_fdc",sourceId:"748967",validationStatus:"tabla_referenciada"},
 {id:"chicken",name:"Pollo cocido sin piel (estimación general)",unit:"g",k:1.65,p:.31,c:0,f:.036,fi:0,source:"Promedio genérico por 100 g, corte y método no especificados: usar la ficha de pechuga/muslo cuando se conozcan los detalles."},
 {id:"beef",name:"Carne vacuna magra cocida",unit:"g",k:2.10,p:.29,c:0,f:.09,fi:0,source:"Promedio"},
 {id:"pork",name:"Lomo de cerdo cocido",unit:"g",k:1.96,p:.29,c:0,f:.085,fi:0,source:"Promedio"},
 {id:"bread",name:"Pan integral",unit:"g",k:2.47,p:.13,c:.41,f:.042,fi:.07,source:"Promedio"},
 {id:"cheese",name:"Port Salut Light",unit:"g",k:2.17,p:.27,c:.017,f:.12,fi:0,source:"Estimación; verificar marca"},
 {id:"milk",name:"Leche Protein descremada",unit:"ml",k:.42,p:.052,c:.046,f:0,fi:0,source:"Estimación; verificar envase"},
 {id:"quince",name:"Dulce de membrillo",unit:"g",k:2.7,p:.003,c:.67,f:.001,fi:.004,source:"Promedio"},
 {id:"cake",name:"Budín proteico casero Edu",unit:"g",k:2.173,p:.1547,c:.2613,f:.064,fi:.0373,source:"Receta estimada"},
 {id:"rice",name:"Arroz blanco cocido sin aceite",unit:"g",k:1.29,p:.0267,c:.2799,f:.0028,fi:.004,source:"USDA FoodData Central FNDDS 2021-2023, FDC 2708408: arroz blanco cocido sin grasa añadida. Valores por 100 g: 129 kcal; proteínas 2,67 g; hidratos totales 27,99 g; grasas 0,28 g. Fibra: estimación heredada (0,4 g/100 g), pendiente de cotejo específico.",sourceType:"usda_fdc",sourceId:"2708408",validationStatus:"tabla_parcial_fibra_pendiente"},
 {id:"potato",name:"Papa hervida sin piel y sin sal",unit:"g",k:.86,p:.0171,c:.2001,f:.001,fi:.018,source:"USDA FoodData Central SR Legacy (04/2018), FDC 170440: papa hervida sin piel, sin sal. Valores por 100 g cocidos: 86 kcal; proteínas 1,71 g; hidratos totales 20,01 g; grasas 0,1 g; fibra 1,8 g. Si agregás aceite, contalo por separado.",sourceType:"usda_fdc",sourceId:"170440",validationStatus:"tabla_referenciada"},
 {id:"sweetpotato",name:"Batata hervida",unit:"g",k:.76,p:.013,c:.177,f:.001,fi:.025,source:"Tabla genérica, peso cocido"},
 {id:"brownrice",name:"Arroz integral cocido",unit:"g",k:1.23,p:.027,c:.256,f:.01,fi:.018,source:"Tabla genérica, peso cocido"},
 {id:"protein_pasta",name:"Fideos proteicos cocidos (estimación)",unit:"g",k:1.55,p:.12,c:.235,f:.018,fi:.04,source:"Estimación ilustrativa: sustituir según marca y cocción"},
 {id:"tuna",name:"Atún al natural escurrido",unit:"g",k:1.16,p:.26,c:0,f:.01,fi:0,source:"Tabla genérica, escurrido"},
 {id:"avocado",name:"Palta cruda (pulpa sin piel ni carozo)",unit:"g",k:1.60,p:.02,c:.0853,f:.1466,fi:.067,sourceType:"usda_fdc",sourceId:"171705",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 171705: palta cruda variedades comerciales, pulpa comestible: 160 kcal, 2 g proteínas, 8,53 g hidratos totales, 14,66 g grasas y 6,7 g fibra por 100 g. Valores dependen de variedad y maduración."},
 {id:"pasta",name:"Fideos de trigo cocidos sin salsa",unit:"g",k:1.58,p:.058,c:.309,f:.0093,fi:.018,sourceType:"usda_fdc",sourceId:"169737",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 169737: pasta común cocida sin sal y sin salsa, 158 kcal; proteínas 5,8 g; hidratos totales 30,9 g; grasas 0,93 g; fibra 1,8 g por 100 g COCIDOS. No confundir con fideos secos."},
 {id:"oil",name:"Aceite de oliva (gramos)",unit:"g",k:8.84,p:0,c:0,f:1,fi:0,sourceType:"usda_fdc",sourceId:"171413",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 171413, aceite de oliva para cocinar o ensaladas: 884 kcal y 100 g de grasa por 100 g de aceite. Registrar la cantidad en gramos; la energía publicada es 8,84 kcal/g. Si ya seleccionaste una preparación con aceite incluido, no lo dupliques."},
 {id:"yogurt",name:"Yogur natural descremado sin azúcar (referencia USDA)",unit:"g",k:.50,p:.042,c:.081,f:.00087,fi:0,sourceType:"usda_fdc",sourceId:"2647437",validationStatus:"tabla_referenciada",source:"USDA FoodData Central Foundation Foods FDC 2647437, yogur natural descremado sin azúcar añadida: 50 kcal, 4,2 g proteínas, 8,1 g hidratos y 0,087 g grasa por 100 g. NO sustituye un yogur saborizado/proteico de marca; contrastar etiqueta."},
 {id:"banana",name:"Banana cruda sin cáscara",unit:"g",k:.89,p:.0109,c:.2284,f:.0033,fi:.026,sourceType:"usda_fdc",sourceId:"173944",validationStatus:"tabla_referenciada",source:"USDA FoodData Central SR Legacy FDC 173944: banana cruda parte comestible sin cáscara, 100 g: 89 kcal, 1,09 g proteínas, 22,84 g hidratos totales, 0,33 g grasas y 2,6 g fibra. El tamaño y maduración modifican cantidades."},
 {id:"mandarin",name:"Mandarina",unit:"g",k:.53,p:.008,c:.133,f:.003,fi:.018,source:"Tabla genérica"},
 {id:"pumpkin",name:"Calabaza cocida",unit:"g",k:.34,p:.01,c:.08,f:.001,fi:.01,source:"Tabla genérica"},
 {id:"rocket",name:"Rúcula",unit:"g",k:.25,p:.026,c:.037,f:.007,fi:.016,source:"Tabla genérica"}
].concat(EXTRA_FOODS);
// Solo cambia modelos nutricionales de 4 tartas en memoria; nunca muta diarios guardados.
// No se confunde una preparación supuesta con un dato analítico o etiqueta.
applyRecipeModels(foods);
applyRegionalCompositeModels(foods);
// Origen visible: NO atribuir análisis USDA a los promedios EFG ni tratar un rótulo como una medición propia.
for(const food of foods){
 food.validationStatus ||= food.id==="cake"?"receta_estimado":food.sourceId?"referencia_pendiente_confirmacion":"generico_pendiente";
 food.sourceType ||= food.id==="cake"?"recipe_estimate":food.sourceId?"usda_fdc":"generic_estimate";
}
const FOOD_PROVENANCE_LABELS={
 generico_pendiente:"Estimación genérica; todavía sin cotejo con tabla específica",
 tabla_referenciada:"Referencia USDA identificada (pendiente revisión final de fuente primaria)",
 tabla_parcial_fibra_pendiente:"Referencia USDA parcial: fibra todavía estimada",
 tabla_convertida_densidad:"USDA convertido de gramos a mililitros; densidad estimada",
 rotulo_fotografiado:"Datos de etiqueta comercial fotografiada",
 rotulo_web_fabricante:"Tabla nutricional web del fabricante; contrastar envase vigente",
 receta_estimado:"Receta o preparación estimada",
 referencia_pendiente_confirmacion:"Referencia documental pendiente de cotejo oficial"
};
const foodProvenance=(f)=>FOOD_PROVENANCE_LABELS[f?.validationStatus]||"Procedencia pendiente de clasificación";
const BUDIN_RECIPE={
 id:"cake",name:"Budín de avena proteico",portions:5,portionGrams:82.5,
 allowedMeals:["media_manana","media_tarde"],
 ingredients:[
  {label:"1 manzana mediana, sin carozo",foodId:"apple",grams:150},
  {label:"3 huevos medianos (sin cáscara)",foodId:"egg",grams:150},
  {label:"100 g de avena",foodId:"oats_raw",grams:100},
  {label:"30 g de pasas de uva",foodId:"raisins",grams:30},
  {label:"1 scoop de proteína whey (se estima 30 g)",foodId:"whey_powder",grams:30}
 ],
 flavorings:["Polvo de hornear (cantidad habitual)","Extracto de vainilla a gusto","Canela a gusto"]
};
function setBudinNutrition(){
 const budin=foods.find(f=>f.id===BUDIN_RECIPE.id);
 if(!budin)throw new Error("No encontramos el budín proteico.");
 const total={k:0,p:0,c:0,f:0,fi:0};
 for(const ingredient of BUDIN_RECIPE.ingredients){
  const food=foods.find(f=>f.id===ingredient.foodId);
  if(!food)throw new Error("Falta un ingrediente: "+ingredient.foodId);
  for(const nutrient of Object.keys(total))total[nutrient]+=Number(food[nutrient]||0)*ingredient.grams;
 }
 budin.name=BUDIN_RECIPE.name;
 budin.source="Estimación a partir de los ingredientes de la receta EFG. Scoop supuesto: 30 g. Rinde 5 porciones (aprox. 80–85 g cada una).";
 for(const nutrient of Object.keys(total))budin[nutrient]=total[nutrient]/(BUDIN_RECIPE.portions*BUDIN_RECIPE.portionGrams);
 BUDIN_RECIPE.total=total;
}
setBudinNutrition();
const FRUIT_SALAD_RECIPE={
 id:"fruit_salad_basic",portionGrams:200,
 ingredients:[
  {label:"Manzana con cáscara",foodId:"apple",grams:50},
  {label:"Banana sin cáscara",foodId:"banana",grams:50},
  {label:"Naranja sin cáscara",foodId:"orange",grams:50},
  {label:"Mandarina sin cáscara",foodId:"mandarin",grams:50}
 ]
};
function setFruitSaladNutrition(){
 const salad=foods.find(f=>f.id===FRUIT_SALAD_RECIPE.id);
 if(!salad)throw new Error("Falta la ensalada de frutas en el catálogo.");
 const total={k:0,p:0,c:0,f:0,fi:0};
 for(const ingredient of FRUIT_SALAD_RECIPE.ingredients){
  const food=foods.find(f=>f.id===ingredient.foodId);
  if(!food)throw new Error("Falta fruta en la ensalada: "+ingredient.foodId);
  for(const key of Object.keys(total))total[key]+=Number(food[key]||0)*ingredient.grams;
 }
 for(const key of Object.keys(total))salad[key]=total[key]/FRUIT_SALAD_RECIPE.portionGrams;
 salad.source="Receta estimada: 50 g de manzana, banana, naranja y mandarina (total 200 g de fruta comestible), sin azúcar, jugo, miel ni almíbar añadidos. La mezcla real puede variar; anotá cualquier agregado por separado.";
 salad.sourceType="recipe_estimate";
 salad.validationStatus="receta_estimado";
 FRUIT_SALAD_RECIPE.total=total;
}
setFruitSaladNutrition();
function fruitSaladRecipeHTML(){
 const salad=foods.find(f=>f.id===FRUIT_SALAD_RECIPE.id),portion=FRUIT_SALAD_RECIPE.portionGrams;
 return '<details class="budin-recipe" open><summary>🍎 Mezcla orientativa · ensalada de frutas</summary>'+
 '<p><b>Bol de referencia: 200 g</b> de fruta comestible, sin agregados.</p><ul>'+
 FRUIT_SALAD_RECIPE.ingredients.map(i=>'<li>'+escapeHTML(i.label)+': '+num(i.grams)+' g</li>').join("")+
 '</ul><p>Por bol: <b>'+num(salad.k*portion)+' kcal</b> · P '+num(salad.p*portion,1)+' g · HC '+num(salad.c*portion,1)+' g · G '+num(salad.f*portion,1)+' g.</p>'+
 '<small>Podés registrar 1 bol (200 g) o elegir «Peso» y cargar lo realmente consumido. Si la mezcla es diferente, los valores son aproximados. Azúcar, miel, almíbar, jugo o yogur se registran por separado.</small></details>';
}
const foodAllowedForMeal=(food,meal)=>food?.id!=="cake" || BUDIN_RECIPE.allowedMeals.includes(meal);
function budinRecipeHTML(){
 const cake=foods.find(f=>f.id==="cake"),portion=BUDIN_RECIPE.portionGrams;
 return '<details class="budin-recipe" open><summary>📖 Receta · '+BUDIN_RECIPE.name+'</summary>'+
 '<p>Rinde <b>'+BUDIN_RECIPE.portions+' porciones</b> de <b>80–85 g</b> (referencia: 82,5 g por porción).</p>'+
 '<ul>'+BUDIN_RECIPE.ingredients.map(i=>'<li>'+escapeHTML(i.label)+'</li>').join("")+
 BUDIN_RECIPE.flavorings.map(x=>'<li>'+escapeHTML(x)+'</li>').join("")+'</ul>'+
 '<p><b>Preparación orientativa:</b> integrar todos los ingredientes, colocar en un molde y hornear hasta que el centro esté bien cocido. Distribuir en cinco porciones una vez frío.</p>'+
 '<p><b>Por porción estimada:</b> '+num(cake.k*portion)+' kcal · '+num(cake.p*portion,1)+' g proteínas · '+num(cake.c*portion,1)+' g hidratos · '+num(cake.f*portion,1)+' g grasas.</p>'+
 '<small>La manzana se estima en 150 g comestibles, los huevos en 50 g cada uno y el scoop en 30 g. Polvo de hornear, vainilla y canela no tienen cantidad definida en esta receta y no están incluidos en los macros. El peso cocido y los valores pueden variar.</small></details>';
}
function updateMealRecipe(){
 const holder=document.getElementById("mealRecipeDetail");
 if(!holder)return;
 const choice=document.getElementById("mealEditorFood")?.value;
 holder.innerHTML=choice==="cake"&&BUDIN_RECIPE.allowedMeals.includes(state.activeMeal)?budinRecipeHTML():choice==="fruit_salad_basic"?fruitSaladRecipeHTML():"";
}
const BEVERAGE_IDS=new Set(["coffee_black","coffee_decaf","coffee_milk","coffee_cortado","tea_plain","tea_green","tea_milk","herbal_tea","chamomile_tea","mint_tea","tilo_tea","cedron_tea","mate_plain","mate_cocido","mate_cocido_milk"]);
const MILK_BEVERAGES={coffee_milk:125,coffee_cortado:30,tea_milk:80,mate_cocido_milk:125};
const BEVERAGE_DEFAULT_ML={coffee_black:180,coffee_decaf:180,coffee_milk:250,coffee_cortado:100,tea_plain:250,tea_green:250,tea_milk:250,herbal_tea:250,chamomile_tea:250,mint_tea:250,tilo_tea:250,cedron_tea:250,mate_plain:250,mate_cocido:250,mate_cocido_milk:250};
const BEVERAGE_MILK_IDS=["milk_skim","milk_whole","milk_lactosefree","milk"];
function beverageEditorHTML(f){
 if(!f||!BEVERAGE_IDS.has(f.id))return "";
 const needMilk=Object.prototype.hasOwnProperty.call(MILK_BEVERAGES,f.id);
 const milkChoices=BEVERAGE_MILK_IDS.map(id=>foods.find(x=>x.id===id)).filter(Boolean);
 return '<div class="beverage-editor"><h3>☕ Personalizá tu bebida</h3><p class="pilot-hint">Indicá el volumen total y los ingredientes reales para calcular sus macros.</p>'+
 (needMilk?'<div class="field-row"><div class="field"><label for="beverageMilkType">Tipo de leche</label><select id="beverageMilkType">'+option(milkChoices)+'</select></div>'+
 '<div class="field"><label for="beverageMilkMl">Leche agregada (ml)</label><input id="beverageMilkMl" type="number" min="1" max="1000" step="1" value="'+MILK_BEVERAGES[f.id]+'"></div></div>':'')+
 '<div class="field"><label for="beverageSugarG">Azúcar agregada (g)</label><input id="beverageSugarG" type="number" min="0" max="60" step="1" value="0"></div>'+
 '<p class="pilot-hint">Sin azúcar o con edulcorante sin aporte energético: dejá 0 g. Si usás azúcar, indicá los gramos. El volumen total incluye la leche.</p></div>';
}
function updateMealBeverage(){
 const holder=document.getElementById("mealBeverageDetail");
 if(!holder)return;
 const f=foods.find(x=>x.id===document.getElementById("mealEditorFood")?.value);
 holder.innerHTML=beverageEditorHTML(f);
 const qty=document.getElementById("mealEditorQty");
 if(qty&&f&&BEVERAGE_IDS.has(f.id))qty.value=BEVERAGE_DEFAULT_ML[f.id]||250;
}
function calculateBeverage(f,totalMl){
 if(!f||!BEVERAGE_IDS.has(f.id))return null;
 if(!Number.isFinite(totalMl)||totalMl<=0||totalMl>5000)throw new Error("Ingresá el volumen total de la bebida en ml.");
 const sugar=Number(document.getElementById("beverageSugarG")?.value??0);
 if(!Number.isFinite(sugar)||sugar<0||sugar>60)throw new Error("Revisá el azúcar agregada (0 a 60 g).");
 const withMilk=Object.prototype.hasOwnProperty.call(MILK_BEVERAGES,f.id);
 const ml=withMilk?Number(document.getElementById("beverageMilkMl")?.value):0;
 const milkId=withMilk?document.getElementById("beverageMilkType")?.value:null;
 const milk=withMilk?foods.find(x=>x.id===milkId&&BEVERAGE_MILK_IDS.includes(x.id)):null;
 if(withMilk&&(!milk||!Number.isFinite(ml)||ml<=0||ml>totalMl))throw new Error("Indicá un tipo de leche y una cantidad mayor que 0 y no superior al volumen total.");
 const base=withMilk?totalMl-ml:totalMl;
 const infusionId=f.id==="coffee_milk"||f.id==="coffee_cortado"?"coffee_black":f.id==="tea_milk"?"tea_plain":f.id==="mate_cocido_milk"?"mate_cocido":f.id;
 const infusion=foods.find(x=>x.id===infusionId)||f;
 const sugarFood=foods.find(x=>x.id==="sugar");
 const totals={};
 for(const k of ["k","p","c","f","fi"])totals[k]=Math.round(((infusion[k]||0)*base+(milk?.[k]||0)*ml+(sugarFood?.[k]||0)*sugar)*100)/100;
 const desc=withMilk?' · '+num(ml,0)+' ml '+milk.name.toLowerCase():'';
 return {
  totals,
  name:f.name.replace(" (personalizable)","").replace(sugar>0?" sin azúcar":"", "")+desc+(sugar?' · '+num(sugar,0)+' g de azúcar':''),
  source:"Bebida personalizada: volumen total "+num(totalMl,0)+" ml"+(withMilk?", leche "+num(ml,0)+" ml ("+milk.name+")":"")+", azúcar "+num(sugar,0)+" g. Valores genéricos estimados.",
  ingredients:{milk_id:milkId||null,milk_ml:ml,sugar_g:sugar},
  summary:num(totals.k)+" kcal · P "+num(totals.p,1)+" g · HC "+num(totals.c,1)+" g · G "+num(totals.f,1)+" g"
 };
}
const FOOD_GROUP_MAP=Object.fromEntries(foods.map(f=>[f.id,f.category||LEGACY_CATEGORIES[f.id]||"extra"]));
const groupIdFor=(f)=>FOOD_GROUP_MAP[f.id]||"extra";
const SNACK_FOOD_IDS=new Set(["cake","whey_powder","walnuts","almonds","peanuts","cashews","pistachios","mixed_nuts"]);
const groupedFoodOptions=(items,meal=null)=>{
 const snack=meal==="media_manana"||meal==="media_tarde";
 const suggested=snack?items.filter(f=>SNACK_FOOD_IDS.has(f.id)).sort((a,b)=>a.name.localeCompare(b.name,"es-AR")):[];
 const regular=snack?items.filter(f=>!SNACK_FOOD_IDS.has(f.id)):items;
 return (suggested.length?'<optgroup label="Colaciones sugeridas · budín y frutos secos">'+option(suggested)+'</optgroup>':"")+
 FOOD_CATEGORIES.map(([id,title])=>{const list=regular.filter(f=>groupIdFor(f)===id).sort((a,b)=>a.name.localeCompare(b.name,"es-AR"));return list.length?'<optgroup label="'+escapeHTML(title)+'">'+option(list)+'</optgroup>':"";}).join("");
};
const sports=[
 {id:"whey",name:"Proteína whey (scoop)",unit:"g",defaultQty:30,k:3.86,p:.8333,c:.0667,f:.025,fi:0,source:"Estimado; 25 g proteína por scoop de 30 g"},
 {id:"creatine",name:"Creatina monohidratada",unit:"g",defaultQty:5,k:0,p:0,c:0,f:0,fi:0,source:"Sin aporte energético significativo"},
 {id:"magnesium",name:"Magnesio elemental",unit:"mg",defaultQty:200,k:0,p:0,c:0,f:0,fi:0,source:"Debe comprobarse contenido elemental en etiqueta"},
 {id:"omega3",name:"Omega-3 (aceite en cápsula)",unit:"cápsulas",defaultQty:1,k:9,p:0,c:0,f:1,fi:0,source:"Estimación por cápsula de 1 g de aceite"},
 {id:"gel",name:"Gel energético running",unit:"geles",defaultQty:1,k:100,p:0,c:25,f:0,fi:0,source:"Estimación; verificar etiqueta de gel"},
 {id:"isotonic",name:"Bebida isotónica azucarada",unit:"ml",defaultQty:500,k:.24,p:0,c:.06,f:0,fi:0,source:"Estimación 6 g hidratos/100 ml"},
 {id:"zero",name:"Gaseosa zero",unit:"ml",defaultQty:350,k:0,p:0,c:0,f:0,fi:0,source:"Aprox. cero; verificar etiqueta"},
 {id:"sparkling",name:"Agua gasificada sin azúcar",unit:"ml",defaultQty:300,k:0,p:0,c:0,f:0,fi:0,source:"Sin calorías"},
 {id:"water",name:"Agua",unit:"ml",defaultQty:300,k:0,p:0,c:0,f:0,fi:0,source:"Sin calorías"},
 {id:"electrolytes",name:"Electrolitos sin azúcar",unit:"porciones",defaultQty:1,k:0,p:0,c:0,f:0,fi:0,source:"Sales y sodio por etiqueta"}
];
foods.push(...RAW_STATE_FOODS);

// Suplementos declarados por el alumno. Las cantidades son las del producto consumido,
// nunca sugerencias terapéuticas. Las sales de magnesio se registran en Mg elemental.
const SUPPLEMENTS=[
 {id:"creatine",name:"Creatina monohidratada",unit:"g",k:0,p:0,c:0,f:0,fi:0,source:"No aporta energía significativa. Registrá la cantidad realmente tomada."},
 {id:"collagen",name:"Colágeno hidrolizado",unit:"g",k:3.6,p:.9,c:0,f:0,fi:0,source:"Estimación: 90 % de proteína; comprobar etiqueta. No equivale a proteína completa para hipertrofia."},
 {id:"omega3",name:"Omega-3 en cápsulas de aceite de pescado",unit:"cápsulas",k:9,p:0,c:0,f:1,fi:0,source:"Estimación para cápsulas con 1 g de aceite. Verificar contenido real de EPA/DHA y masa del aceite."},
 {id:"magnesium",name:"Magnesio (sin especificar sal)",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de magnesio elemental según etiqueta, no mg totales de la sal."},
 {id:"magnesium_bisglycinate",name:"Magnesio bisglicinato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de Mg elemental declarados en la etiqueta."},
 {id:"magnesium_citrate",name:"Magnesio citrato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de Mg elemental declarados en la etiqueta."},
 {id:"magnesium_oxide",name:"Magnesio óxido",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de Mg elemental declarados en la etiqueta."},
 {id:"magnesium_chloride",name:"Magnesio cloruro",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de Mg elemental declarados en la etiqueta."},
 {id:"magnesium_malate",name:"Magnesio malato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de Mg elemental declarados en la etiqueta."},
 {id:"magnesium_threonate",name:"Magnesio L-treonato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar mg de Mg elemental declarados en la etiqueta."},
 {id:"vitamin_d3",name:"Vitamina D3",unit:"UI",k:0,p:0,c:0,f:0,fi:0,source:"Registrar las UI de la etiqueta; no es una recomendación de dosis."},
 {id:"vitamin_b12",name:"Vitamina B12",unit:"µg",k:0,p:0,c:0,f:0,fi:0,source:"Registrar los microgramos de la etiqueta."},
 {id:"vitamin_c",name:"Vitamina C",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Registrar los mg indicados en el envase."},
 {id:"zinc",name:"Zinc",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Registrar mg de zinc elemental, no peso de la sal."},
 {id:"calcium",name:"Calcio",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Registrar mg de calcio elemental, no peso de la sal."},
 {id:"multivitamin",name:"Multivitamínico",unit:"comprimidos",k:0,p:0,c:0,f:0,fi:0,source:"Composición varía según marca y etiqueta."},
 {id:"probiotics",name:"Probióticos",unit:"cápsulas",k:0,p:0,c:0,f:0,fi:0,source:"Registrar presentación; unidades formadoras de colonias según etiqueta."},
 {id:"psyllium",name:"Psyllium (fibra soluble)",unit:"g",k:2,p:0,c:.8,f:0,fi:.8,source:"Estimación por gramo; fibra y calorías dependen de la marca. Comprobar etiqueta."},
 {id:"electrolytes",name:"Electrolitos sin azúcar",unit:"porciones",k:0,p:0,c:0,f:0,fi:0,source:"Sin aporte significativo solo si la fórmula no contiene azúcar."}
,
 {id:"magnesium_taurate",name:"Magnesio taurato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar magnesio elemental declarado en la etiqueta; no miligramos de taurato."},
 {id:"magnesium_lactate",name:"Magnesio lactato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar magnesio elemental declarado en la etiqueta."},
 {id:"magnesium_gluconate",name:"Magnesio gluconato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar magnesio elemental declarado en la etiqueta."},
 {id:"magnesium_aspartate",name:"Magnesio aspartato",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Ingresar magnesio elemental declarado en la etiqueta."},
 {id:"vitamin_b6",name:"Vitamina B6 (piridoxina)",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Indicar los miligramos de la etiqueta; evitar suponer una dosis segura."},
 {id:"vitamin_b9",name:"Vitamina B9 (folato/ácido fólico)",unit:"µg",k:0,p:0,c:0,f:0,fi:0,source:"Indicar los microgramos de la etiqueta y la forma indicada por el fabricante."},
 {id:"vitamin_k2",name:"Vitamina K2",unit:"µg",k:0,p:0,c:0,f:0,fi:0,source:"Indicar los microgramos de la etiqueta. Puede interactuar con anticoagulantes."},
 {id:"vitamin_e",name:"Vitamina E",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Indicar los mg de vitamina E declarados; verificar la formulación."},
 {id:"b_complex",name:"Complejo de vitaminas B",unit:"comprimidos",k:0,p:0,c:0,f:0,fi:0,source:"Registrar unidades consumidas. La composición varía según marca; revisar la etiqueta."},
 {id:"iron_elemental",name:"Hierro",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Registrar hierro elemental y no la sal total. Consultar antes de suplementar hierro."},
 {id:"selenium",name:"Selenio",unit:"µg",k:0,p:0,c:0,f:0,fi:0,source:"Indicar los microgramos reales. Dosis excesivas pueden ser perjudiciales."},
 {id:"iodine",name:"Yodo",unit:"µg",k:0,p:0,c:0,f:0,fi:0,source:"Indicar los microgramos de la etiqueta; especialmente relevante revisar la función tiroidea."},
 {id:"copper",name:"Cobre",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Registrar miligramos de cobre elemental, no peso de la sal."},
 {id:"potassium",name:"Potasio",unit:"mg elementales",k:0,p:0,c:0,f:0,fi:0,source:"Registrar potasio elemental. Precaución con enfermedad renal y ciertos medicamentos."},
 {id:"omega3_algae",name:"Omega-3 de algas (aceite)",unit:"cápsulas",k:9,p:0,c:0,f:1,fi:0,source:"Estimación por cápsula que contiene 1 g de aceite. Verificar aceite total y contenido de DHA/EPA."},
 {id:"fish_oil_liquid",name:"Aceite de pescado líquido",unit:"g",k:9,p:0,c:0,f:1,fi:0,source:"Por gramo de aceite. No confundir el contenido total del aceite con los mg de EPA y DHA."},
 {id:"creatine_hcl",name:"Creatina HCl",unit:"g",k:0,p:0,c:0,f:0,fi:0,source:"Registrar los gramos reales del producto; no equivale automáticamente a creatina monohidratada."},
 {id:"beta_alanine",name:"Beta-alanina",unit:"g",k:0,p:0,c:0,f:0,fi:0,source:"Registrar gramos reales. Aporte energético no estimado en esta herramienta; verificar etiqueta."},
 {id:"citrulline",name:"L-citrulina / citrulina malato",unit:"g",k:0,p:0,c:0,f:0,fi:0,source:"Registrar gramos del producto y especificación de la fórmula. No se incluyen calorías por falta de composición."},
 {id:"coenzyme_q10",name:"Coenzima Q10",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Registrar los mg declarados. Excipientes oleosos no cuantificados."},
 {id:"glucosamine",name:"Glucosamina",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Registrar mg del compuesto informado en el envase; aporte energético no estimado."},
 {id:"chondroitin",name:"Condroitina",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Registrar los mg indicados. No implica beneficio clínico garantizado."},
 {id:"caffeine",name:"Cafeína en suplemento",unit:"mg",k:0,p:0,c:0,f:0,fi:0,source:"Registrar mg totales, sumando otras fuentes de cafeína. Puede causar efectos adversos o interacciones."}
];
const SUPPLEMENT_IDS=new Set(SUPPLEMENTS.map(s=>s.id));
const supplementRecord=e=>e?.kind==="supplement"||SUPPLEMENT_IDS.has(e?.id);
const supplementSummary=e=>num(e.qty,1)+" "+escapeHTML(e.unit)+" · "+num(e.k)+" kcal · P "+num(e.p,1)+" g · HC "+num(e.c,1)+" g · G "+num(e.f,1)+" g";
function supplementsPanel(d){
 const existing=(d.sports||[]).map((e,index)=>({e,index})).filter(x=>supplementRecord(x.e));
 const choices=SUPPLEMENTS.slice().sort((a,b)=>a.name.localeCompare(b.name,"es-AR"));
 return '<section class="nutrition-supplements" id="supplementsToday"><div class="section-head"><h3>💊 Suplementos del día</h3><span class="pilot-pill">'+existing.length+' registrados</span></div>'+
 '<p class="pilot-hint">Separados de las comidas. Registrá solo lo que consumiste; no son recomendaciones para tomar suplementos.</p>'+
 (existing.length?'<div class="supplement-entries">'+existing.map(({e,index})=>'<div class="meal-food-line"><div class="meal-food-label"><strong>'+escapeHTML(e.name)+'</strong><span>'+supplementSummary(e)+'</span></div><button class="meal-remove-item" type="button" data-removesupp="'+index+'" aria-label="Eliminar suplemento">×</button></div>').join("")+'</div>':'<p class="meal-food-empty">Todavía no registraste suplementos.</p>')+
 '<div class="pilot-form"><div class="field"><label for="supplementItem">Suplemento</label><select id="supplementItem">'+option(choices)+'</select></div>'+
 '<div class="field-row"><div class="field"><label for="supplementQty" id="supplementQtyLabel">Cantidad</label><input type="number" inputmode="decimal" step="any" min="0.01" max="100000" id="supplementQty" placeholder="Según etiqueta"></div>'+
 '<div class="field"><label for="supplementMoment">Momento del día</label><select id="supplementMoment">'+[["desayuno","Desayuno"],["media_manana","Media mañana"],["almuerzo","Almuerzo"],["media_tarde","Media tarde"],["merienda","Merienda"],["cena","Cena"],["otro","Otro momento"]].map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join("")+'</select></div></div>'+
 '<p class="pilot-hint" id="supplementHint">Anotá la cantidad de producto realmente consumida.</p>'+
 '<button type="button" class="btn small" data-act="addDailySupplement">+ Registrar suplemento</button></div>'+
 '<p class="pilot-hint">Creatina y minerales: sin calorías relevantes. Colágeno: puede aportar proteína; omega-3: aporta grasas. Comprobá siempre la composición del envase. No cuentes el mismo suplemento dos veces.</p></section>';
}
function updateSupplementHint(){
 const item=SUPPLEMENTS.find(x=>x.id===document.getElementById("supplementItem")?.value);
 const label=document.getElementById("supplementQtyLabel"),hint=document.getElementById("supplementHint");
 if(label)label.textContent="Cantidad consumida ("+(item?.unit||"según envase")+")";
 if(hint)hint.textContent=item?.source||"Elegí un suplemento.";
}
async function addDailySupplement(){
 const item=SUPPLEMENTS.find(x=>x.id===document.getElementById("supplementItem")?.value);
 const qty=Number(document.getElementById("supplementQty")?.value);
 const moment=document.getElementById("supplementMoment")?.value||"otro";
 if(!item||!Number.isFinite(qty)||qty<=0||qty>100000||!document.getElementById("supplementQty")?.value?.trim())throw new Error("Ingresá el suplemento y una cantidad positiva de su etiqueta.");
 const d=activeDiary();
 d.sports ||= [];
 const entry=normItem(item,qty,moment);entry.kind="supplement";
 d.sports.push(entry);d.skipped=d.skipped||{};d.skipped._closed=false;
 await saveDiary();notify("Suplemento guardado por separado; balance actualizado cuando corresponde.");
}
function dayComment(d){return String(d?.skipped?._comment||"").slice(0,1000);}
function readDayComment(){
 const text=String(document.getElementById("dayComment")?.value||"").trim();
 if(text.length>1000)throw new Error("El comentario puede tener hasta 1000 caracteres.");
 return text;
}
async function saveDayComment(){
 if(state.profile?.role!=="student")throw new Error("Solo el alumno puede escribir comentarios del día.");
 const d=activeDiary();
 d.skipped=d.skipped||{};
 d.skipped._comment=readDayComment();
 await saveDiary();notify("Comentario guardado para el informe de tu coach.");
}
let coachRosterConsent={};
let myWeeklyReports=[];
async function loadMyWeeklyReports(){
 if(state.profile?.role!=="student"){myWeeklyReports=[];return;}
 const {data,error}=await sb.from("efg_weekly_reports").select("id,week_ending,report_text,created_at").eq("student_id",state.session.user.id).order("week_ending",{ascending:false}).limit(12);
 if(error)throw error;myWeeklyReports=data||[];
}
function weeklyStudentPanel(){
 if(state.profile?.role!=="student")return "";
 const items=myWeeklyReports.map(r=>'<details class="pilot-record"><summary>Semana hasta '+escapeHTML(r.week_ending)+'</summary><p style="white-space:pre-wrap">'+escapeHTML(r.report_text)+'</p></details>').join("");
 return '<section class="card"><h2>Mis resúmenes semanales</h2><p class="pilot-hint">Informes revisados por tu entrenador.</p>'+(items||'<p class="pilot-hint">Todavía no hay informes compartidos.</p>')+'</section>';
}
function weeklyReportEnd(){
 const d=new Date(today()+"T12:00:00Z");
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-5+7)%7); // Latest Friday, never a future one.
 return d.toISOString().slice(0,10);
}
function weeklyReportWindow(){
 const friday=new Date(weeklyReportEnd()+"T12:00:00Z");
 const from=new Date(friday),to=new Date(friday);
 from.setUTCDate(from.getUTCDate()-7);to.setUTCDate(to.getUTCDate()-1);
 return {from:from.toISOString().slice(0,10),to:to.toISOString().slice(0,10),friday:weeklyReportEnd()};
}
async function publishWeeklyReport(){
 if(!(state.profile?.role==="coach"||(state.profile?.role==="admin"&&state.org?.is_test&&state.org?.coach_id===state.session?.user?.id)))throw Error("Solo un entrenador puede publicar informes.");
 const student=(state.roster||[]).find(x=>x.user_id===state.selectedStudent&&x.active);
 if(!student||!state.consent?.accepted)throw Error("Alumno sin autorización de seguimiento vigente.");
 const reportText=document.getElementById("weeklyCoachDraftText")?.value?.trim();
 if(!reportText||reportText.length>8000)throw Error("Revisá el borrador antes de compartirlo.");
 if(!confirm("¿Confirmás que revisaste el informe y querés compartirlo con el alumno?"))return;
 const {error}=await sb.from("efg_weekly_reports").upsert({student_id:student.user_id,coach_id:state.session.user.id,week_ending:weeklyReportEnd(),report_text:reportText,updated_at:new Date().toISOString()},{onConflict:"student_id,week_ending"});
 if(error)throw error;
 notify("Informe compartido con el alumno.");
}
const mealDefault={desayuno:[],media_manana:[],almuerzo:[],media_tarde:[],merienda:[],cena:[]};
const state={session:null,profile:null,org:null,tab:"home",habitualSelection:{},fitFilter:"all",diary:null,progressLogs:[],progressRange:7,coachProgressLogs:[],weights:[],activities:[],goals:[],personalTargets:null,roster:[],invitations:[],orgs:[],payments:[],platformAlias:null,platformAliases:[],selectedStudent:null,coachLogs:[],coachWeights:[],coachActivities:[],coachGoals:[],coachIntakeGoals:{},coachIntakeVerified:false,coachIntakeForms:{},coachIntakeAccess:{},studentIntake:null,planAccess:null,planAccessSupported:false,consent:null,loggingIn:false,loading:false,foodPlan:null,coachFoodPlan:null,plannerMode:"dinner",plannerSelections:{},plannerDraftGrams:{},plannerDraftDay:null,activeMeal:null,testInvitations:[],macroInputs:null,macroPreview:null,pendingGoal:null,calculatedGoalBase:null,pendingGoalRevision:null,otpEmail:null,reportDate:null,renderedDay:null,daySwitching:null,welcomePending:false,welcomeSubmitting:false,coachGuidedDraft:null,coachIntakePrefill:null,coachIntakeGuidePreview:null,rewardApproval:null,rewardFeatureReady:false,rewardOpened:false};
const inbox=createNotificationInbox({sb,
 getUserId:()=>state.profile?state.session?.user?.id:null,
 navigate:async n=>{
  const coachMode=state.profile?.role==="coach"||(state.profile?.role==="admin"&&state.org?.is_test);
  const targets=new Set(["home","reports","coachStudents","coachIntake","summaries","payments","messages"]);
  let target=targets.has(n.target_tab)?n.target_tab:"notifications";
  if(!coachMode&&["reports","coachStudents"].includes(target))target="home";
  if(coachMode&&n.target_student&&["reports","coachStudents","coachIntake","messages"].includes(target)){
   const p=(state.roster||[]).find(p=>p.user_id===n.target_student&&p.active);
   if(p&&target!=="messages"&&target!=="coachIntake")await loadStudentDetail(p.user_id);
   if(p&&target==="messages")messages.selectStudent(p.user_id);
  }
  state.tab=target;
  await render();
  if(target==="reports")document.getElementById("coachReportWeek")?.scrollIntoView({block:"start"});
  if(target==="coachStudents")document.getElementById("studentFollowPanel")?.scrollIntoView({block:"start"});
  if(target==="home")document.querySelector(".efg-guide-student")?.scrollIntoView({block:"start"});
 }
});
const messages=createMessagesCenter({sb,
 context:()=>({
  userId:state.profile?state.session?.user?.id:null,role:state.profile?.role,
  testCoach:!!state.org?.is_test,orgCoachId:state.org?.coach_id,
  roster:state.roster,consented:coachRosterConsent
 }),
 afterSend:()=>inbox.refresh()
});
const notify=(msg)=>{let e=document.getElementById("pilot-toast");e.textContent=msg;e.style.display="block";clearTimeout(notify.timer);notify.timer=setTimeout(()=>e.style.display="none",4500);};
const coachIntakeFlow=createCoachIntakeFlow({sb,state,escapeHTML,rootText,notify,render,refresh});
const studentPlanPending=()=>coachIntakeFlow.pending();
const fail=(error)=>{console.error(error);notify(error?.message||"Ocurrió un problema. Intentá nuevamente.");};
const values=(items)=>items.reduce((a,it)=>{for(const k of ["k","p","c","f","fi"])a[k]+=(Number(it[k])||0);return a;},{k:0,p:0,c:0,f:0,fi:0});
const dailyTotals=(diary)=>values([...(Object.entries(diary?.meals||{}).filter(([slot])=>!diary?.skipped?.[slot]).flatMap(([,items])=>items||[])),...(diary?.sports||[])]);
const blankDiary=()=>({student_id:state.session.user.id,log_day:today(),meals:structuredClone(mealDefault),sports:[],skipped:{},totals:{}});
const activeDiary=()=>state.diary?.log_day===today()?state.diary:blankDiary();
async function ensureCurrentDay(){
 if(!state.session?.user?.id||!state.profile||!state.renderedDay||state.renderedDay===today())return;
 if(state.daySwitching)return state.daySwitching;
 const nowDay=today(),uid=state.session.user.id;
 state.daySwitching=(async()=>{
  const {data,error}=await sb.from("efg_daily_logs").select("*").eq("student_id",uid).eq("log_day",nowDay).maybeSingle();
  if(error)throw error;
  if(state.session?.user?.id===uid&&today()===nowDay){state.diary=data||null;state.renderedDay=nowDay;state.activeMeal=null;}
 })();
 try{await state.daySwitching;}finally{state.daySwitching=null;}
}
const activeGoal=()=>state.profile?.role==="student"?(state.goals[0]?{k:state.goals[0].kcal,p:state.goals[0].protein_g,c:state.goals[0].carb_g,f:state.goals[0].fat_g,fi:state.goals[0].fiber_g}:null):(state.personalTargets?{k:state.personalTargets.kcal,p:state.personalTargets.protein_g,c:state.personalTargets.carb_g,f:state.personalTargets.fat_g,fi:state.personalTargets.fiber_g}:null);
function formatTime(d){return new Date(d).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"});}
function safePhoneEmail(email){return escapeHTML(email);}
function normItem(p,qty,when){let result={id:p.id,name:p.name,qty:Number(qty),unit:p.unit,source:p.source,sourceType:p.sourceType,sourceId:p.sourceId||null,validationStatus:p.validationStatus,when};for(const k of ["k","p","c","f","fi"])result[k]=Math.round((p[k]||0)*qty*100)/100;return result;}
let cloudHabituales=[];
async function loadCloudHabituales(){
 if(!["student","coach","admin"].includes(state.profile?.role)){cloudHabituales=[];return;}
 const {data,error}=await sb.from("efg_habitual_meals").select("id,meal_slot,name,items,created_at").eq("student_id",state.session.user.id).order("created_at",{ascending:true});
 if(error)throw error;
 cloudHabituales=data||[];
 // Importar favoritos locales anteriores sin perderlos y sin duplicarlos.
 for(const [slot] of mealSlots){
  let local=[];
  try{
   const saved=JSON.parse(localStorage.getItem(habitualListKey(slot))||"null");
   if(Array.isArray(saved)&&saved.length)local=saved;
   else {const older=JSON.parse(localStorage.getItem(habitualKey(slot))||"null");if(Array.isArray(older)&&older.length)local=[{name:"Mi habitual anterior",items:older}];}
  }catch(_){} 
  const remote=cloudHabituales.filter(x=>x.meal_slot===slot);
  for(const item of local){
   if(remote.some(x=>x.name===item.name&&JSON.stringify(x.items)===JSON.stringify(item.items)))continue;
   if(!Array.isArray(item.items)||!item.items.length||remote.length>=20)continue;
   const created=await sb.from("efg_habitual_meals").insert({student_id:state.session.user.id,meal_slot:slot,name:String(item.name||"Habitual").slice(0,60),items:item.items}).select("id,meal_slot,name,items,created_at").single();
   if(created.error)throw created.error;
   remote.push(created.data);cloudHabituales.push(created.data);
  }
  // Respaldo local ya importado: evita que una comida eliminada reaparezca.
  if(local.length&&local.every(item=>remote.some(x=>x.name===item.name&&JSON.stringify(x.items)===JSON.stringify(item.items)))){
   localStorage.removeItem(habitualListKey(slot));localStorage.removeItem(habitualKey(slot));
  }
 }
}
function habitualKey(slot){return "efg-nutrition-habitual-v1:"+state.session?.user?.id+":"+slot;}
function habitualListKey(slot){return "efg-nutrition-habitual-v2:"+state.session?.user?.id+":"+slot;}
function getHabitualList(slot){
 try{
  const remote=cloudHabituales.filter(x=>x.meal_slot===slot&&Array.isArray(x.items)&&x.items.length).map(x=>({id:x.id,name:x.name,items:x.items}));
  if(remote.length)return remote;
  const saved=JSON.parse(localStorage.getItem(habitualListKey(slot))||"null");
  if(Array.isArray(saved)&&saved.length)return saved.filter(x=>x&&Array.isArray(x.items)&&x.items.length);
  const legacy=JSON.parse(localStorage.getItem(habitualKey(slot))||"null");
  return Array.isArray(legacy)&&legacy.length?[{name:"Mi habitual anterior",items:legacy}]:[];
 }catch(_){return [];}
}
function getHabitual(slot){return getHabitualList(slot)[0]?.items||null;}
const habitualEntryKey=(item,index)=>String(item.id||"local-"+index);
function habitualPickerHTML(slot){
 const list=getHabitualList(slot);
 if(!list.length)return '<p class="pilot-hint efg-no-habitual" aria-live="polite">Todavía no guardaste habituales en este horario. Registrá una comida y tocá «Guardar habitual» para verla acá todos los días.</p>';
 const requested=state.habitualSelection[slot]||"";
 const selectedIndex=list.findIndex((item,i)=>habitualEntryKey(item,i)===requested);
 const choice=selectedIndex>=0?selectedIndex:list.length===1?0:-1;
 const selected=choice<0?null:list[choice];
 const selectedKey=selected?habitualEntryKey(selected,choice):"";
 state.habitualSelection[slot]=selectedKey;
 return '<div class="efg-habitual-picker"><label for="habitualChoice_'+slot+'">Mis habituales de '+escapeHTML(mealSlots.find(m=>m[0]===slot)?.[1]||slot)+'</label>'+
 '<select id="habitualChoice_'+slot+'" data-habitualchoice="'+slot+'" aria-label="Elegir comida habitual de '+escapeHTML(slot)+'"><option value="" '+(!selected?'selected':'')+'>Elegí una de tus '+list.length+' comidas habituales</option>'+
 list.map((item,i)=>'<option value="'+escapeHTML(habitualEntryKey(item,i))+'" '+(i===choice?'selected':'')+'>'+escapeHTML(habitualShortLabel(item))+'</option>').join('')+'</select>'+
 '<div id="habitualPreview_'+slot+'" class="efg-habitual-preview-host" aria-live="polite">'+habitualPreviewHTML(selected,escapeHTML)+'</div>'+
 '<div class="efg-habitual-controls"><button type="button" class="btn small light" data-habitualapply="'+slot+'">↻ Registrar habitual</button>'+
 '<button type="button" class="btn small ghost" data-habitualdelete="'+slot+'">Eliminar habitual</button></div>'+
 '<small>Podés revisar el menú completo sin agregarlo. Solo se registrará al tocar «Registrar habitual».</small></div>';
}
function updateHabitualPreview(slot){
 const id=document.getElementById('habitualChoice_'+slot)?.value||"";
 state.habitualSelection[slot]=id;
 const current=getHabitualList(slot).find((item,index)=>habitualEntryKey(item,index)===id);
 const host=document.getElementById('habitualPreview_'+slot);
 if(host)host.innerHTML=habitualPreviewHTML(current,escapeHTML);
}
function chosenHabitual(slot){
 const id=document.getElementById('habitualChoice_'+slot)?.value;
 if(!id)throw Error('Primero elegí una comida habitual de la lista.');
 const item=getHabitualList(slot).find((x,index)=>habitualEntryKey(x,index)===String(id));
 if(!item||!Array.isArray(item.items)||!item.items.length)throw Error('Ese habitual no está disponible. Actualizá y volvé a elegir.');
 return item;
}
async function deleteChosenHabitual(slot){
 if(!mealSlots.some(m=>m[0]===slot))throw Error('Horario inválido.');
 const fav=chosenHabitual(slot);
 if(!fav.id)throw Error('No se puede eliminar este habitual antiguo. Primero sincronizá la cuenta.');
 if(!confirm('¿Eliminar «'+fav.name+'» de tus habituales? No se borrarán comidas ya registradas.'))return;
 const {data,error}=await sb.from("efg_habitual_meals").delete().eq("id",fav.id).eq("student_id",state.session.user.id).eq("meal_slot",slot).select("id");
 if(error)throw error;
 if(!data?.length)throw Error('No se pudo confirmar la eliminación del habitual.');
 cloudHabituales=cloudHabituales.filter(x=>x.id!==fav.id);
 state.habitualSelection[slot]="";
 await render();notify('Habitual eliminado. Tus diarios históricos están intactos.');
}
async function applyChosenHabitual(slot){
 if(!mealSlots.some(m=>m[0]===slot))throw Error('Horario inválido.');
 const fav=chosenHabitual(slot);
 const d=activeDiary();d.meals[slot] ||= [];
 if(d.meals[slot].length&&!confirm('Esta comida ya tiene alimentos. ¿Reemplazarlos por «'+fav.name+'»?'))return;
 d.meals[slot]=structuredClone(fav.items);
 d.skipped[slot]=false;d.skipped._closed=false;state.lastEditedMeal=slot;
 await saveDiary();notify('Habitual «'+fav.name+'» registrado en '+(mealSlots.find(m=>m[0]===slot)?.[1]||slot)+'.');
}
async function habitualAction(slot,action){
 if(!mealSlots.some(m=>m[0]===slot))throw Error("Comida inválida.");
 const d=activeDiary();d.meals[slot] ||= [];
 if(action==="save"){
  if(!d.meals[slot].length)throw Error("Primero registrá alimentos en esta comida.");
  const existing=getHabitualList(slot);
  const name=prompt("Nombre de esta comida habitual (ej.: Yogur con granola):","Habitual "+(existing.length+1));
  if(name===null)return;
  const clean=name.trim().slice(0,60);
  if(!clean)throw Error("Ingresá un nombre para identificarla.");
  if(existing.length>=20)throw Error("Máximo 20 comidas habituales por horario.");
  const {data,error}=await sb.from("efg_habitual_meals").insert({student_id:state.session.user.id,meal_slot:slot,name:clean,items:structuredClone(d.meals[slot])}).select("id,meal_slot,name,items,created_at").single();
  if(error)throw error;
  cloudHabituales.push(data);
  state.habitualSelection[slot]=String(data.id);
  notify("Guardaste «"+clean+"» en tu cuenta.");return render();
 }
 const favorites=getHabitualList(slot);
 if(!favorites.length)throw Error("No hay comidas habituales guardadas.");
 const menu=favorites.map((x,i)=>(i+1)+". "+x.name).join("\n");
 const answer=prompt("Elegí la comida habitual escribiendo su número:\n"+menu,"1");
 if(answer===null)return;
 if(!/^[0-9]+$/.test(answer.trim()))throw Error("Ingresá un número de la lista.");
 const index=Number(answer.trim())-1,fav=favorites[index];
 if(!fav)throw Error("Número de comida habitual inválido.");
 if(d.meals[slot].length&&!confirm("Esta comida ya tiene alimentos. ¿Querés reemplazarlos por «"+fav.name+"»?"))return;
 d.meals[slot]=structuredClone(fav.items);d.skipped[slot]=false;d.skipped._closed=false;
 await saveDiary();notify("Comida habitual registrada; balance recalculado.");
}
function recipeStoreKey(){return "efg-nutrition-custom-recipes:"+state.session?.user?.id;}
let cloudRecipes=[];
function myRecipes(){return cloudRecipes;}
async function loadCloudRecipes(){
 if(!["student","coach","admin"].includes(state.profile?.role)){cloudRecipes=[];return;}
 const {data,error}=await sb.from("efg_personal_recipes").select("id,name,ingredients,portions,totals,created_at").eq("student_id",state.session.user.id).order("created_at",{ascending:true});
 if(error)throw error;
 cloudRecipes=data||[];
 let saved=[];
 try{saved=JSON.parse(localStorage.getItem(recipeStoreKey())||"[]");}catch(_){}
 if(Array.isArray(saved))for(const recipe of saved){
  if(!recipe||!Array.isArray(recipe.ingredients)||!recipe.ingredients.length||!recipe.portions||!recipe.totals)continue;
  if(cloudRecipes.some(x=>x.name===recipe.name&&JSON.stringify(x.ingredients)===JSON.stringify(recipe.ingredients)))continue;
  if(cloudRecipes.length>=30)break;
  const created=await sb.from("efg_personal_recipes").insert({student_id:state.session.user.id,name:String(recipe.name).slice(0,70),ingredients:recipe.ingredients,portions:recipe.portions,totals:recipe.totals}).select("id,name,ingredients,portions,totals,created_at").single();
  if(created.error)throw created.error;
  cloudRecipes.push(created.data);
 }
 // Al completar la importación, retirar el respaldo local para no recrear recetas eliminadas.
 if(Array.isArray(saved)&&saved.length)localStorage.removeItem(recipeStoreKey());
}
async function createPersonalRecipe(){
 const name=prompt("Nombre de la receta propia (ej.: Bowl de granola y yogur)");
 if(name===null)return;
 if(!name.trim()||name.trim().length>70)throw Error("Usá un nombre de 1 a 70 caracteres.");
 const ingredients=[];
 for(let i=0;i<12;i++){
  const nameInput=prompt("Ingrediente "+(i+1)+". Escribí su nombre; dejalo vacío para terminar.\nEj.: yogur, granola, banana",i===0?"":"");
  if(nameInput===null){if(!ingredients.length)return;break;}
  const term=nameInput.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR");
  if(!term){if(!ingredients.length)throw Error("Agregá al menos un ingrediente.");break;}
  const matches=foods.filter(f=>f.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").includes(term)).slice(0,12);
  if(!matches.length){notify("No encontramos ese ingrediente en el catálogo.");i--;continue;}
  const chosen=prompt("Elegí el número del ingrediente:\n"+matches.map((f,j)=>(j+1)+". "+f.name).join("\n"),"1");
  if(chosen===null)return;
  const idx=Number(chosen)-1;if(!Number.isInteger(idx)||!matches[idx])throw Error("Ingrediente inválido.");
  const gramsText=prompt("Cantidad de "+matches[idx].name+" en gramos o mililitros (según ficha):","100");
  if(gramsText===null)return;
  const grams=Number(gramsText.replace(",","."));if(!Number.isFinite(grams)||grams<=0||grams>5000)throw Error("Cantidad inválida.");
  ingredients.push({foodId:matches[idx].id,grams});
 }
 if(!ingredients.length)return;
 const portionsText=prompt("¿Cuántas porciones rinde la receta?","1");if(portionsText===null)return;
 const portions=Number(portionsText);if(!Number.isInteger(portions)||portions<1||portions>50)throw Error("Cantidad de porciones inválida.");
 const totals={k:0,p:0,c:0,f:0,fi:0};
 for(const x of ingredients){const f=foods.find(y=>y.id===x.foodId);if(!f)throw Error("Ingrediente no encontrado.");for(const key of Object.keys(totals))totals[key]+=Number(f[key]||0)*x.grams;}
 const recipe={name:name.trim(),ingredients,portions,totals};
 const saved=myRecipes();if(saved.length>=30)throw Error("Límite de 30 recetas propias.");
 const {data,error}=await sb.from("efg_personal_recipes").insert({student_id:state.session.user.id,name:recipe.name,ingredients:recipe.ingredients,portions:recipe.portions,totals:recipe.totals}).select("id,name,ingredients,portions,totals,created_at").single();
 if(error)throw error;
 cloudRecipes.push(data);
 notify("Receta guardada en tu cuenta: "+num(totals.k/portions)+" kcal por porción (estimadas).");return render();
}
let recipeDialogReturnFocus=null,recipeRegistrationBusy=false;
function closeRecipeRegistration(){
 document.getElementById("efgRecipeRegisterOverlay")?.remove();
 if(recipeDialogReturnFocus?.isConnected)recipeDialogReturnFocus.focus({preventScroll:true});
 recipeDialogReturnFocus=null;
}
function registerPersonalRecipe(){
 const saved=myRecipes();if(!saved.length)throw Error("Primero creá una receta.");
 closeRecipeRegistration();
 recipeDialogReturnFocus=document.activeElement;
 root.insertAdjacentHTML("beforeend",'<div class="efg-recipe-register-overlay" id="efgRecipeRegisterOverlay"><section class="efg-recipe-register-card" role="dialog" aria-modal="true" aria-labelledby="efgRecipeRegisterTitle">'+
 '<div class="between"><h2 id="efgRecipeRegisterTitle">Registrar receta propia</h2><button type="button" class="btn small ghost" data-act="closeRecipeRegistration" aria-label="Cerrar registro de receta">✕</button></div>'+
 '<p class="pilot-hint">Elegí la preparación, el horario y las porciones realmente consumidas. Nada se registrará hasta que confirmes.</p>'+
 '<div class="field"><label for="efgRecipeRegisterId">Mi receta</label><select id="efgRecipeRegisterId">'+saved.map(r=>'<option value="'+escapeHTML(r.id)+'">'+escapeHTML(r.name)+' · '+num(r.totals.k/r.portions)+' kcal por porción</option>').join("")+'</select></div>'+
 '<div class="field"><label for="efgRecipeRegisterSlot">Horario de comida</label><select id="efgRecipeRegisterSlot">'+mealSlots.map(m=>'<option value="'+escapeHTML(m[0])+'">'+escapeHTML(m[1])+'</option>').join("")+'</select></div>'+
 '<div class="field"><label for="efgRecipeRegisterQty">Porciones consumidas</label><input type="number" id="efgRecipeRegisterQty" value="1" min="0.1" max="20" step="any" inputmode="decimal"></div>'+
 '<div class="efg-recipe-register-actions"><button type="button" class="btn light" data-act="closeRecipeRegistration">Cancelar</button><button type="button" class="btn" data-act="confirmRecipeRegistration">Registrar y recalcular</button></div></section></div>');
 document.getElementById("efgRecipeRegisterId")?.focus({preventScroll:true});
}
async function confirmRecipeRegistration(){
 if(recipeRegistrationBusy)return;
 const selected=myRecipes().find(r=>r.id===document.getElementById("efgRecipeRegisterId")?.value);
 const slot=document.getElementById("efgRecipeRegisterSlot")?.value;
 const qty=Number(document.getElementById("efgRecipeRegisterQty")?.value);
 if(!selected||!mealSlots.some(m=>m[0]===slot)||!Number.isFinite(qty)||qty<=0||qty>20)throw Error("Revisá la receta, el horario y las porciones.");
 recipeRegistrationBusy=true;
 try{
  const item={id:"custom-recipe",name:selected.name,qty,unit:"porción",when:slot,source:"Receta propia según ingredientes informados",sourceType:"recipe_estimate",validationStatus:"estimado"};
  for(const key of ["k","p","c","f","fi"])item[key]=Math.round((Number(selected.totals[key]||0)/selected.portions)*qty*100)/100;
  const d=activeDiary();d.meals[slot] ||= [];d.meals[slot].push(item);d.skipped[slot]=false;
  await saveDiary();
  closeRecipeRegistration();notify("Receta registrada y macros recalculados.");
 }finally{recipeRegistrationBusy=false;}
}
function rootText(title,sub){return '<div class="pilot-top"><div><div class="eyebrow">EFG NUTRITION PRO</div><h1 class="pilot-title">'+title+'</h1><p class="pilot-lead">'+sub+'</p></div><span class="pilot-tag">Acceso privado</span></div>';}
function option(items){return items.map(v=>'<option value="'+escapeHTML(v.id)+'">'+escapeHTML(v.name)+'</option>').join("");}
function roleLabel(){return {admin:"Administrador EFG",coach:"Entrenador",student:"Alumno"}[state.profile?.role]||"";}
function efgNavIcon(tab){
 const p={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 planner:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18m-12 5h6m-3-3v6"/>',
 weight:'<path d="M3 18l6-6 4 4 8-9"/><path d="M15 7h6v6"/>',
 studentMore:'<circle cx="5" cy="6" r="1"/><path d="M9 6h12"/><circle cx="5" cy="12" r="1"/><path d="M9 12h12"/><circle cx="5" cy="18" r="1"/><path d="M9 18h12"/>',
 coach:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 15l3-3 3 2 4-5M7 18h10"/>',
 coachIntake:'<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>',
 coachStudents:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
 reports:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 payments:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h5"/>',
 admin:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h3v3H8zm5 0h3v3h-3zM8 14h3v3H8zm5 0h3v3h-3z"/>',
 testCoach:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
 adminMore:'<circle cx="5" cy="6" r="1"/><path d="M9 6h12"/><circle cx="5" cy="12" r="1"/><path d="M9 12h12"/><circle cx="5" cy="18" r="1"/><path d="M9 18h12"/>'
 };
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(p[tab]||p.home)+'</svg>';
}
function efgAvatarLetters(name){
 const w=String(name||"").trim().split(/\s+/).filter(Boolean);
 return (w.length>1?w.slice(0,2).map(x=>x.slice(0,1)).join(""):(w[0]||"EF").slice(0,2)).toLocaleUpperCase("es-AR");
}
function frame(content){
 const role=state.profile.role;
 const menu=role==="student"
  ?(studentPlanPending()?[["intake","▣","Mi ingreso"],["messages","◉","Mensajes"],["privacy","♙","Privacidad"]]:[["home","⌂","MI DÍA"],["planner","✧","Planificar"],["weight","↗","Progreso"],["studentMore","☷","Más"]])
  :role==="coach"
  ?[["coach","⌂","Inicio"],["coachIntake","▣","Ingresos"],["coachStudents","♧","Alumnos"],["home","◷","MI DÍA"],["studentMore","☷","MI ESPACIO"],["payments","▤","Pagos"]]
  :[["admin","⌂","Inicio"],["home","◷","MI DÍA"],["testCoach","♧","Coach"],["adminMore","☷","Más"]];
 const moreTabs=["recipes","supplements","summaries","privacy","sport","payments"];
 const activeTab=(role==="student"&&moreTabs.includes(state.tab))?"studentMore":role==="coach"&&state.tab==="coachTools"?"coach":role==="coach"&&["recipes","supplements","sport","weight","planner"].includes(state.tab)?"studentMore":role==="admin"&&["coachStudents","coachTools"].includes(state.tab)?"testCoach":(role==="admin"&&["reports","weight","sport","planner","recipes","supplements","payments","adminManage"].includes(state.tab))?"adminMore":state.tab;
 root.innerHTML='<div class="pilot-layout efg-role-'+role+'"><aside class="pilot-nav" aria-label="Navegación principal"><div class="pilot-logo"><img class="efg-serotonin-symbol" src="./assets/serotonina-acuarela.avif" width="64" height="37" alt="" aria-hidden="true" decoding="async"><span>EFG NUTRITION <small style="display:block;color:#96b1a9;font-size:9px;letter-spacing:1px">PRO · PRIVADO</small></span></div>'+
 menu.map(m=>'<button type="button" class="navitem '+(activeTab===m[0]?'active':'')+'" data-tab="'+m[0]+'" '+(activeTab===m[0]?'aria-current="page"':'')+'><span class="nav-icon">'+efgNavIcon(m[0])+'</span><span class="nav-label">'+m[2]+'</span></button>').join("")+
 '<div class="pilot-avatar"><span class="avatar">'+escapeHTML(state.profile.nickname.slice(0,2).toUpperCase())+'</span><div><strong>'+escapeHTML(state.profile.nickname)+'</strong><small>'+roleLabel()+'</small></div></div><button class="pilot-logout" data-act="logout">Salir de mi cuenta</button></aside>'+
 '<header class="efg-mobile-header"><div class="efg-mobile-brand"><img class="efg-serotonin-symbol" src="./assets/serotonina-acuarela.avif" width="56" height="32" alt="" aria-hidden="true" decoding="async"><span class="efg-mobile-brand-text"><strong>EFG Nutrition</strong><small>PRO · TU ESPACIO</small></span></div><div class="efg-mobile-person"><span class="efg-mobile-user">'+escapeHTML(state.profile.nickname)+'</span><span class="efg-mobile-avatar" aria-hidden="true">'+escapeHTML(efgAvatarLetters(state.profile.nickname))+'</span></div></header><main class="pilot-main">'+content+'<div class="pilot-bottom">EFG NUTRITION · Información de uso personal · Los cálculos son orientativos y requieren revisión profesional cuando corresponda.</div></main></div>';
}
// Bienvenida institucional, exclusivamente en el primer acceso del alumno nuevo.
function welcomeView(){
 const disabled=state.welcomeSubmitting?'disabled aria-busy="true"':'';
 root.innerHTML='<div class="efg-onboard" role="main" aria-labelledby="efg-onboard-heading">'+
  '<section class="efg-onboard-sheet">'+
   '<header class="efg-onboard-brand"><img class="efg-onboard-leaf efg-onboard-serotonin" src="./assets/serotonina-acuarela.avif" width="70" height="42" alt="" aria-hidden="true">'+
    '<strong>EFG</strong><small>NUTRITION PRO</small></header>'+
   '<div class="efg-onboard-photo" role="img" aria-label="Bol de vegetales frescos, palta, tomate, zanahoria, hojas verdes y cereales"></div>'+
   '<div class="efg-onboard-copy">'+
    '<h1 id="efg-onboard-heading">Hoy comienza una <em>nueva forma de cuidarte.</em></h1>'+
    '<p>Cada buena elección cuenta. Descubrí una alimentación que se adapte a vos, a tus objetivos y a tu vida.</p>'+
    '<button type="button" class="efg-onboard-cta" data-act="completeWelcome" '+disabled+'>'+
    (state.welcomeSubmitting?'Guardando tu bienvenida…':'Comenzar mi cambio <span aria-hidden="true">›</span>')+
    '</button>'+
    '<p class="efg-onboard-motto">Una alimentación consciente.<br><b>Un hábito a la vez.</b></p>'+
   '</div>'+
  '</section></div>';
}
async function loadWelcomeStatus(){
 state.welcomePending=false;
 if(state.profile?.role!=="student"||!state.profile?.active)return;
 const {data,error}=await sb.from("efg_student_onboarding").select("seen_at").eq("user_id",state.session.user.id).maybeSingle();
 // Un error de red o configuración nunca impide consultar los diarios privados.
 if(error){console.warn("No se pudo comprobar la bienvenida:",error.message);return;}
 state.welcomePending=!data;
}
async function completeWelcome(){
 if(!state.welcomePending||state.welcomeSubmitting||state.profile?.role!=="student")return;
 state.welcomeSubmitting=true;welcomeView();
 try{
  const {error}=await sb.from("efg_student_onboarding").upsert({user_id:state.session.user.id},{onConflict:"user_id",ignoreDuplicates:true});
  if(error)throw error;
  state.welcomePending=false;
  await render();
 }catch(error){
  state.welcomeSubmitting=false;
  welcomeView();
  throw error;
 }finally{state.welcomeSubmitting=false;}
}
function loginView(message=""){
 const verification=!!state.otpEmail;
 const title=verification?"Revisá tu correo":"Ingresá a tu espacio privado.";
 const details=verification
  ?"Si tu cuenta está habilitada, recibirás un código de verificación en <b>"+escapeHTML(state.otpEmail)+"</b>. Copialo acá, sin salir de la aplicación."
  :"Ingresá con el correo que habilitó EFG o tu entrenador. En vez de abrir enlaces, recibirás un código numérico.";
 const form=verification
  ?'<form id="pilot-otp-form"><div class="field"><label for="loginOtp">Código de acceso</label><input type="text" inputmode="numeric" pattern="[0-9]{6,10}" autocomplete="one-time-code" id="loginOtp" required minlength="6" maxlength="10" placeholder="Código numérico" class="pilot-otp-input"></div><p class="pilot-hint">Al ingresar con este código, autorizás a tu coach asignado a consultar tus registros nutricionales, peso, actividad y suplementos para tu seguimiento. Podrás revocar el acceso desde la app. El código verifica tu identidad; ingresarlo confirma esta autorización.</p><button type="submit" class="btn block" '+(state.loggingIn?'disabled':'')+'>'+(state.loggingIn?"Verificando…":"Ingresar con mi código")+'</button></form><div class="pilot-auth-help"><button class="btn small ghost" data-act="loginBack">Cambiar correo</button><button class="btn small light" data-act="resendOtp" '+(state.loggingIn?'disabled':'')+'>Reenviar código</button></div><p class="pilot-footnote">Si recibiste el correo anterior con un enlace de confirmación, también podés abrirlo mientras terminamos la configuración del código numérico.</p>'
  :'<form id="pilot-login-form"><div class="field"><label for="loginEmail">Tu correo electrónico autorizado</label><input type="email" id="loginEmail" required placeholder="tu@email.com" autocomplete="email" maxlength="200"></div><button type="submit" class="btn block" '+(state.loggingIn?'disabled':'')+'>'+(state.loggingIn?"Enviando…":"Enviarme un código")+'</button></form><div class="pilot-footnote">Tu sesión se guarda en este navegador. Si volvés a entrar desde Safari normal, sin modo privado, no deberías necesitar otro código. Los navegadores internos de WhatsApp y otros navegadores no comparten la sesión.</div>';
 root.innerHTML='<div class="pilot-login"><div class="pilot-login-art"><img class="efg-login-brandmark" src="./assets/serotonina-acuarela.avif" width="100" height="56" alt="" aria-hidden="true" decoding="async"><div class="eyebrow">CIENCIA • HÁBITOS • ENTRENAMIENTO</div><h1>Tu nutrición,<br>tu evolución.</h1><p>Alimentación, macros y seguimiento privado para entrenadores y alumnos autorizados.</p></div><div class="pilot-login-form"><div class="pilot-login-card"><div class="eyebrow">BIENVENIDO A EFG NUTRITION</div><h2>'+title+'</h2><p>'+details+'</p>'+
 (message?'<div class="pilot-alert" style="margin-top:20px">'+escapeHTML(message)+'</div>':'')+
 form+'<p class="pilot-footnote" style="margin-top:22px">🔒 Tu información solo se muestra a usuarios autorizados. Nunca utilizamos tu dirección IP para identificarte.</p></div></div></div>';
}
async function requestOtp(email){
 if(state.loggingIn)return;
 const normalized=String(email||"").trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>200)throw new Error("Ingresá un correo electrónico válido.");
 state.loggingIn=true;
 try{
  const {error}=await sb.auth.signInWithOtp({
   email:normalized,
   options:{shouldCreateUser:true,emailRedirectTo:"https://efg-nutrition.onrender.com/pilot/"}
  });
  if(error)throw error;
  state.otpEmail=normalized;
  state.loggingIn=false;
  loginView("Si tu correo está habilitado, recibirás un código numérico de acceso. Puede tardar unos instantes; revisá Spam si es necesario.");
 }catch(err){
  state.loggingIn=false;
  // Do not reveal provider messages that could expose email/account existence.
  console.warn("EFG OTP request",err?.code||"failed");
  const connection=!navigator.onLine||/fetch|network|timeout|connection/i.test(err.message||"");
  loginView(connection?"No pudimos conectar con el servicio. Revisá tu conexión y volvé a intentarlo.":"No pudimos solicitar el código en este momento. Intentá nuevamente en unos instantes.");
 }
}
async function confirmOtp(token){
 const email=state.otpEmail;
 const code=String(token||"").trim();
 if(!email||!/^\d{6,10}$/.test(code))throw new Error("El código debe tener entre 6 y 10 dígitos numéricos.");
 state.loggingIn=true;
 let verified=false;
 try{
  const {error}=await sb.auth.verifyOtp({email,token:code,type:"email"});
  if(error)throw error;
  verified=true;
  const who=(await sb.auth.getUser()).data?.user;
  if(who?.id)sessionStorage.setItem("efgNutritionCoachConsent:"+who.id,"yes");
  state.otpEmail=null;
  state.loggingIn=false;
  await refresh();
 }catch(err){
  state.loggingIn=false;
  console.warn("EFG OTP verification",err?.code||"failed");
  if(verified){sessionConnectionRetry();return;}
  const connection=!navigator.onLine||/fetch|network|timeout|connection/i.test(err.message||"");
  loginView(connection?"No pudimos verificar tu código por un problema de conexión. Volvé a intentarlo.":"El código es incorrecto o venció. Revisá el correo o solicitá otro.");
 }
}
function sessionConnectionRetry(){
 root.innerHTML='<div class="pilot-loader"><h2>No pudimos verificar tu sesión</h2>'+
 '<p>Si entrás desde el mismo navegador, tus datos de acceso pueden seguir guardados. Reintentá antes de solicitar otro correo.</p>'+
 '<div class="pilot-toolbar"><button class="btn" data-act="retry">Reintentar conexión</button>'+
 '<button class="btn small ghost" data-act="logout">Salir e ingresar nuevamente</button></div></div>';
}
function unauthorized(msg){
 root.innerHTML='<div class="pilot-login"><div class="pilot-login-art"><div class="food-hero">🔒 🌿</div><h1>Un espacio privado, con permisos.</h1><p>EFG Nutrition protege los datos personales y nutricionales de cada alumno.</p></div><div class="pilot-login-form"><div class="pilot-login-card"><h2>Cuenta pendiente de habilitación</h2><p>'+escapeHTML(msg||"Este correo aún no fue habilitado.")+'</p><div class="pilot-alert" style="margin:20px 0">Tu entrenador debe crear tu usuario antes de que puedas usar la aplicación. Si sos el administrador, ingresá con el correo habilitado por EFG.</div><button class="btn block" data-act="logout">Cerrar sesión</button></div></div></div>';
}
function macroCard(name,key,t,goal){let target=goal?.[key];let ratio=target?Math.min(100,Math.max(0,t[key]/target*100)):0;return '<div class="card metric-card metric-'+key+'"><div class="metric-label">'+name+'</div><div class="metric-value">'+num(t[key],1)+' <span>'+ (target?'/ '+num(target):'') +' '+(key==='k'?'kcal':'g')+'</span></div>'+ (target?'<div class="meter"><div style="width:'+ratio+'%"></div></div><div class="metric-remaining">'+num(Math.max(0,target-t[key]),1)+' restante</div>':'<div class="metric-remaining" style="margin-top:9px">Sin objetivo asignado</div>')+'</div>';}

function versionCheckCard(){
 return '<section class="card efg-version-settings"><h3>🔄 Versión de EFG Nutrition Pro</h3>'+
 '<p class="pilot-hint">Comprobá si hay una publicación nueva sin salir de tu cuenta.</p>'+
 '<button type="button" class="btn small light" data-act="checkAppVersion">Comprobar actualizaciones</button>'+
 '<p class="pilot-hint" id="efgBuildStatus" role="status" aria-live="polite">La app también revisa versiones automáticamente.</p></section>';
}
/* Iconografía consistente: SVG vectorial con acabado metal cepillado via CSS.
   El tercer campo de las entradas se mantiene; no se alteran destinos o permisos. */
function efgMenuIcon(kind){
 const paths={
  adminManage:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l-1.5 1.5a1.6 1.6 0 0 0-1.7-.3l-1.2.5a1.6 1.6 0 0 0-1 1.4V21h-4v-1.2a1.6 1.6 0 0 0-1-1.4l-1.2-.5a1.6 1.6 0 0 0-1.7.3l-1.5-1.5a1.6 1.6 0 0 0 .3-1.7l-.5-1.2a1.6 1.6 0 0 0-1.4-1H3v-4h1.2a1.6 1.6 0 0 0 1.4-1l.5-1.2a1.6 1.6 0 0 0-.3-1.7l1.5-1.5a1.6 1.6 0 0 0 1.7.3l1.2-.5a1.6 1.6 0 0 0 1-1.4V3h4v1.2a1.6 1.6 0 0 0 1 1.4l1.2.5a1.6 1.6 0 0 0 1.7-.3l1.5 1.5a1.6 1.6 0 0 0-.3 1.7l.5 1.2a1.6 1.6 0 0 0 1.4 1H21v4h-1.2a1.6 1.6 0 0 0-1.4 1z"/>',
  notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  messages:'<path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M7 11h10M7 15h7"/>',
  reports:'<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>',
  summaries:'<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>',
  weight:'<path d="m3 18 6-6 4 4 8-9"/><path d="M15 7h6v6"/><path d="M3 21h18"/>',
  sport:'<circle cx="14" cy="4" r="2"/><path d="m12 9-4 4-5 1m8-6 5 5 4 1M12 10l-1 6-5 5m6-6 4 3 2 4"/>',
  planner:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4m10-4v4M3 10h18m-12 5h6m-3-3v6"/>',
  recipes:'<path d="M3 14c.5 5 4 7 9 7s8.5-2 9-7H3z"/><path d="M7 12c-1-3 1-6 5-7m1 7c0-4 2-6 5-7"/>',
  supplements:'<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-38 12 12)"/><path d="m9 10 5 6"/>',
  payments:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h5"/>',
  privacy:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v3"/>',
  coachStudents:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  coachTools:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 12h2m4 0h2m-8 5h2m4 0h2"/>',
  testCoach:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  studentMore:'<circle cx="5" cy="6" r="1"/><path d="M9 6h12M9 12h12M9 18h12"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'
 };
 return '<svg class="efg-lux-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+(paths[kind]||paths.home)+'</svg>';
}

function premiumMenuView(title,description,entries){
 return rootText(title,description)+'<section class="efg-menu-grid">'+entries.map(x=>'<button type="button" class="efg-menu-card efg-menu-'+x[3]+'" data-tab="'+x[0]+'"><span class="efg-menu-emoji" aria-hidden="true">'+efgMenuIcon(x[0])+'</span><strong>'+x[2]+'</strong><span class="efg-menu-arrow" aria-hidden="true">↗</span></button>').join("")+'</section>'+versionCheckCard();
}
function coachPersonalMoreView(){
 return premiumMenuView("MI ESPACIO","Tus herramientas nutricionales personales. Los registros son exclusivamente tuyos y no pertenecen a los alumnos.",[
 ["home","⌂","MI DÍA","blue"],["planner","✧","Mi planificador","cream"],
 ["weight","↗","Mi progreso","mint"],["recipes","🍲","Mis recetas","peach"],
 ["supplements","💊","Mis suplementos","lilac"],["sport","🏃","Mi actividad","blue"],
 ["messages","💬","Mensajería interna","mint"],["payments","💳","Pagos y licencias","cream"]
 ]);
}
function studentMoreView(){
 return premiumMenuView("Mi espacio","Elegí la herramienta que necesitás. Todo está disponible sin recorrer una página interminable.",[
 ["notifications","🔔","Notificaciones","peach"],["messages","💬","Mensajes con mi coach","blue"],["recipes","🍲","Mis recetas","mint"],["supplements","💊","Suplementos","lilac"],["sport","🏃","Actividad física","peach"],["summaries","📋","Informes semanales","blue"],["privacy","🔒","Privacidad y permisos","cream"],["payments","💳","Mis pagos","mint"]]);
}
function fitRecipeCard(recipe){
 const data=recipeTotals(recipe,foods),p=data.perPortion;
 const photo=FIT_RECIPE_PHOTOS[recipe.id];
 const picture=photo?'<img class="efg-fit-photo" src="'+escapeHTML(photo.src)+'" alt="Fotografía ilustrativa de '+escapeHTML(recipe.name)+'" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="efg-fit-photo-fallback" hidden>Fotografía temporalmente no disponible</span>':'<span class="efg-fit-photo-fallback">Fotografía temporalmente no disponible</span>';
 const credit=photo?'<a class="efg-fit-photo-credit" href="'+escapeHTML(photo.source)+'" target="_blank" rel="noopener noreferrer" aria-label="Fuente de fotografía: '+escapeHTML(photo.author)+' en '+escapeHTML(photo.provider)+'">Foto: '+escapeHTML(photo.author)+' · '+escapeHTML(photo.provider)+'</a>':'';
 return '<article class="efg-fit-card"><div class="efg-fit-art">'+picture+'<span class="efg-fit-photo-label">Foto ilustrativa</span>'+credit+'</div><div class="efg-fit-card-top"><div><span class="efg-fit-tag">'+escapeHTML(recipe.tag)+' · '+recipe.time+' min</span><h3>'+escapeHTML(recipe.name)+'</h3><p>'+num(p.k)+' kcal · P '+num(p.p,1)+' g · HC '+num(p.c,1)+' g · G '+num(p.f,1)+' g <span class="efg-fit-muted">por porción</span></p></div></div>'+
 '<details class="efg-fit-detail"><summary>Ingredientes y preparación</summary><div class="efg-fit-inner"><strong>Ingredientes para '+recipe.portions+' porciones</strong><ul>'+data.details.map(x=>'<li>'+num(x.grams)+' g · '+escapeHTML(x.name)+'</li>').join("")+'</ul>'+(recipe.extras?'<p>'+escapeHTML(recipe.extras)+'</p>':'')+'<strong>Preparación</strong><ol>'+recipe.steps.map(step=>'<li>'+escapeHTML(step)+'</li>').join("")+'</ol><small>Valores orientativos calculados a partir del catálogo. El rendimiento, las marcas y la cocción pueden modificarlos.</small></div></details>'+
 '<button type="button" class="btn small efg-fit-register" data-fitrecipe="'+recipe.id+'">+ Registrar porción</button></article>';
}
function studentRecipesView(){
 const rs=myRecipes();
 return rootText("Mis recetas","Ideas Fit fáciles de preparar, con ingredientes pesados y macros estimados. También podés guardar tus propias recetas.")+
 '<section class="efg-fit-library"><div class="efg-fit-intro"><div><span class="eyebrow">COCINA PRÁCTICA</span><h2>Biblioteca Fit</h2><p>12 preparaciones listas para registrar en tu diario. Ninguna se guarda como receta personal hasta que vos lo decidas.</p></div><span class="efg-fit-count">12 recetas</span></div>'+
 '<div class="efg-fit-filter" role="group" aria-label="Filtrar recetas"><button type="button" data-fitfilter="all" class="'+(state.fitFilter==="all"?'active':'')+'">Todas</button><button type="button" data-fitfilter="Desayunos y meriendas" class="'+(state.fitFilter==="Desayunos y meriendas"?'active':'')+'">Desayunos y meriendas</button><button type="button" data-fitfilter="Almuerzos y cenas" class="'+(state.fitFilter==="Almuerzos y cenas"?'active':'')+'">Almuerzos y cenas</button></div>'+
 '<div class="efg-fit-grid">'+FIT_RECIPES.filter(r=>!state.fitFilter||state.fitFilter==="all"||r.category===state.fitFilter).map(fitRecipeCard).join("")+'</div>'+
 '<p class="efg-fit-disclaimer">Las preparaciones no reemplazan un plan nutricional. Las porciones y valores se calculan según el catálogo EFG; pueden variar por marcas, peso comestible y método de cocción.</p></section>'+
 '<section class="card efg-content-card efg-own-recipes"><div class="efg-own-recipes-header"><div><span class="eyebrow">TU RECETARIO</span><h2>Mis preparaciones guardadas</h2><p class="pilot-hint">Tus recetas personales siguen siendo privadas y editables mediante una nueva carga.</p></div><div class="efg-actions"><button class="btn" data-act="createPersonalRecipe">+ Crear receta</button><button class="btn light" data-act="registerPersonalRecipe" '+(!rs.length?'disabled':'')+'>Registrar receta propia</button></div></div>'+
 (rs.length?rs.map(r=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(r.name)+'</strong><small>'+num(r.totals.k/r.portions)+' kcal por porción · P '+num(r.totals.p/r.portions,1)+' g · HC '+num(r.totals.c/r.portions,1)+' g · G '+num(r.totals.f/r.portions,1)+' g</small></div><button class="btn small ghost" data-recipedelete="'+escapeHTML(r.id)+'">Eliminar</button></div></div>').join(""):'<div class="empty">Todavía no guardaste recetas propias. Podés usar las 12 recetas Fit sin crearlas.</div>')+'</section>';
}
async function registerFitRecipe(id){
 if(!["student","coach","admin"].includes(state.profile?.role))throw new Error("Esta función corresponde al diario personal.");
 const recipe=FIT_RECIPES.find(r=>r.id===id);
 if(!recipe)throw new Error("No encontramos esa receta.");
 const meal=prompt("¿En qué comida querés registrar «"+recipe.name+"»?\n"+mealSlots.map((m,i)=>(i+1)+". "+m[1]).join("\n"),"1");
 if(meal===null)return;
 const slot=mealSlots[Number(meal)-1]?.[0];
 if(!slot)throw new Error("Elegí una comida válida.");
 const answer=prompt("¿Cuántas porciones comiste? (podés usar 0,5)","1");
 if(answer===null)return;
 const qty=Number(answer.replace(",","."));
 if(!Number.isFinite(qty)||qty<=0||qty>20)throw new Error("Ingresá entre 0,1 y 20 porciones.");
 const {perPortion}=recipeTotals(recipe,foods);
 const item={id:"fit-recipe:"+recipe.id,name:recipe.name,qty,unit:"porción",when:slot,source:"Receta Fit EFG: cálculo por ingredientes y pesos informados",sourceType:"recipe_estimate",validationStatus:"estimado"};
 for(const key of ["k","p","c","f","fi"])item[key]=Math.round(perPortion[key]*qty*100)/100;
 const d=activeDiary();d.meals[slot] ||= [];d.meals[slot].push(item);d.skipped[slot]=false;d.skipped._closed=false;
 await saveDiary();notify("Agregaste "+num(qty,1)+" porción(es) de "+recipe.name+".");
}
function studentSupplementsView(){
 return rootText("Suplementos","Registrá tus suplementos del día independientemente de las comidas.")+
 '<section class="card efg-content-card">'+supplementsPanel(activeDiary())+'</section>';
}
function notificationsView(){
 return rootText("🔔 Mis notificaciones","Todos tus avisos en un solo lugar. La campanita también está disponible en cualquier pantalla.")+
  '<section class="card efg-inbox-full" id="efgInboxFull"><p class="pilot-hint">Consultando tus avisos…</p></section>';
}
function messagesView(){
 return rootText("MENSAJERÍA INTERNA","Buscá un contacto y tocá su conversación. Solo ves chats habilitados para tu cuenta.")+
  '<section class="card" id="efgMessagesContent"><p class="pilot-hint">Consultando conversación…</p></section>';
}
function studentSummariesView(){
 return rootText("Mis informes","Los resúmenes semanales que revisó y compartió tu coach.")+
 (weeklyStudentPanel()||'<section class="card"><p class="pilot-hint">Este espacio está disponible para alumnos.</p></section>');
}
function studentPrivacyView(){
 const c=state.consent;
 return rootText("Privacidad","Vos decidís si autorizás a tu coach a consultar tus registros.")+
 '<section class="card efg-content-card"><h2>Seguimiento nutricional</h2><p class="pilot-hint">Tu coach asignado puede consultar alimentación, peso, actividad y suplementos únicamente con tu consentimiento.</p><div class="pilot-notice"><strong>'+(c?.accepted?'Acceso autorizado':'Acceso no autorizado')+'</strong><small>Podés modificar este permiso cuando lo necesites.</small></div><button class="btn" data-act="'+(c?.accepted?'revokeConsent':'grantConsent')+'">'+(c?.accepted?'Revocar autorización':'Autorizar seguimiento')+'</button></section>'+
 (state.profile.role==="student"&&state.planAccessSupported?
 '<section class="card efg-content-card"><h2>Ficha inicial y permiso para compartir</h2><p class="pilot-hint">Es un permiso separado del seguimiento nutricional. Podés revisar tus datos, corregirlos y dejar de compartir esta ficha aun cuando tu plan ya esté publicado.</p><button type="button" class="btn light" data-tab="intake">Revisar mi ficha y su permiso</button></section>':'');
}
function studentPlannerView(){
 return rootText("Mi planificador",state.profile.role==="student"?"Elegí alimentos y calculá porciones orientativas según el objetivo aprobado por tu coach.":"Calculá tus porciones con tus objetivos personales, sin modificar los planes de ningún alumno.")+
 plannerCard()+'<div id="mealDialogContainer"></div>';
}
function adminMoreView(){
 return premiumMenuView("Todas mis herramientas","Como administrador conservás tus accesos personales y de gestión.",[
 ["adminManage","⚙️","Organizaciones","lilac"],["notifications","🔔","Notificaciones","peach"],["messages","💬","Mensajería interna","mint"],["reports","📈","Informes","blue"],["weight","⚖️","Mi progreso","mint"],["sport","🏃","Mi actividad","peach"],["planner","✨","Mi planificador","cream"],["recipes","🍲","Mis recetas","mint"],["supplements","💊","Mis suplementos","lilac"],["payments","💳","Pagos y licencias","blue"]]);
}
/* PRO-37: premio separado de la ingesta. La autorización viene exclusivamente
   de una fila RLS creada/aprobada por el coach; sin tabla, permiso = NO. */
function currentWeekMonday(){
 const d=new Date(today()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
 return d.toISOString().slice(0,10);
}
function weeklyScoreForCoach(){
 return calculateWeeklyConsistency({today:today(),logs:state.coachProgressLogs||[],
   goals:state.coachGoals||[],totalOf:dailyTotals,goalForDate});
}
async function loadSundayPermission(studentId){
 state.rewardApproval=null;state.rewardFeatureReady=false;
 if(!studentId||!state.session?.user?.id)return;
 if(state.profile.role!=="student"&&(!state.selectedStudent||!state.consent?.accepted))return;
 const {data,error}=await sb.from("efg_sunday_rewards")
   .select("student_id,week_monday,coach_id,approved,approved_at")
   .eq("student_id",studentId).eq("week_monday",currentWeekMonday()).maybeSingle();
 if(error){
  // La migración todavía puede estar pendiente: nunca atribuir una
  // autorización sin prueba persistida, y nunca bloquear el diario.
  console.warn("Permiso dominical no disponible; no se concede autorización.",error.code);
  return;
 }
 state.rewardFeatureReady=true;state.rewardApproval=data||null;
}
function coachRewardPanel(){
 if(!state.selectedStudent||!state.consent?.accepted)return "";
 const score=weeklyScoreForCoach();
 const eligible=score.acceptable===6&&score.evaluated===6;
 const approved=state.rewardFeatureReady&&state.rewardApproval?.approved===true &&
    state.rewardApproval?.coach_id===state.session?.user?.id &&
    state.rewardApproval?.week_monday===score.monday && !!state.rewardApproval?.approved_at;
 return '<section class="efg-coach-reward card" aria-labelledby="coachRewardTitle">'+
 '<h3 id="coachRewardTitle">✦ COMIDA LIBRE DOMINICAL</h3>'+
 '<p class="pilot-hint">Permiso individual y explícito. Solo disponible con 6/6 días cumplidos y consentimiento activo. No registra ni altera comidas.</p>'+
 '<strong>'+score.acceptable+'/6 DÍAS CUMPLIDOS</strong>'+
 (!eligible?'<p class="pilot-hint">La opción se habilita después de completar los seis días de lunes a sábado. No se adelantan premios.</p>':
  !state.rewardFeatureReady?'<p class="pilot-alert">La autorización persistente todavía no está habilitada. No se puede conceder permiso desde esta versión.</p>':
  '<div class="efg-reward-coach-controls"><span class="pilot-pill">'+(approved?'Autorizada por vos':'Sin autorización')+'</span>'+
  '<button type="button" class="btn small '+(approved?'ghost':'light')+'" data-reward-approval="'+(approved?'no':'yes')+'">'+
  (approved?'REVOCAR AUTORIZACIÓN':'AUTORIZAR COMIDA LIBRE EL DOMINGO')+'</button></div>')+
 '</section>';
}
async function updateSundayPermission(approve){
 const p=state.profile,student=(state.roster||[]).find(x=>x.user_id===state.selectedStudent&&x.active);
 const isCoach=p?.role==="coach"||(p?.role==="admin"&&state.org?.is_test===true&&state.org?.coach_id===state.session?.user?.id);
 if(!isCoach||!student||!state.consent?.accepted||!state.rewardFeatureReady)
  throw Error("No hay permiso de coach disponible para este alumno.");
 const score=weeklyScoreForCoach();
 if(score.acceptable!==6||score.evaluated!==6)throw Error("Todavía no completó los seis días válidos.");
 if(!window.confirm(approve?
  "¿Autorizás expresamente una comida libre este domingo para este alumno?":
  "¿Revocás la autorización de comida libre de este domingo?"))return;
 const row={student_id:student.user_id,week_monday:score.monday,
  coach_id:state.session.user.id,approved:approve,approved_at:approve?new Date().toISOString():null,
  updated_at:new Date().toISOString()};
 const {data,error}=await sb.from("efg_sunday_rewards")
   .upsert(row,{onConflict:"student_id,week_monday"})
   .select("student_id,week_monday,coach_id,approved,approved_at").single();
 if(error)throw error;state.rewardApproval=data;
 await render();notify(approve?"Autorización individual guardada.":"Autorización revocada.");
}

function homeView(){
 let d=activeDiary(),tot=dailyTotals(d),goal=activeGoal();
 const motivation=motivationOfTheDay();
 // El coach/admin puede utilizar sus propios gráficos semanales con la meta
 // personal. Jamás se lee un alumno aquí ni se inventan metas históricas.
 const isPersonalProfessional=state.profile.role==="coach"||state.profile.role==="admin";
 const ownTarget=state.personalTargets;
 const personalStart=ownTarget?.updated_at?new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(ownTarget.updated_at)):today();
 const history=isPersonalProfessional&&ownTarget?
 [{start_on:personalStart,approved_at:ownTarget.updated_at,kcal:ownTarget.kcal,protein_g:ownTarget.protein_g}]:state.goals||[];
 const weeklyPanel=(isPersonalProfessional?!!ownTarget:!!state.goals?.length)
  ?weeklyConsistencyPanel(calculateWeeklyConsistency({
    today:today(),logs:[...(state.progressLogs||[]),...(state.diary?[state.diary]:[])],
    goals:history,totalOf:dailyTotals,goalForDate
   }),{opened:state.rewardOpened===true,personal:isPersonalProfessional,
    verified:!isPersonalProfessional&&state.rewardFeatureReady===true,
    approved:!isPersonalProfessional&&state.rewardFeatureReady===true&&state.consent?.accepted===true&&state.rewardApproval?.approved===true&&!!state.rewardApproval?.approved_at&&state.rewardApproval?.week_monday===currentWeekMonday()&&state.rewardApproval?.coach_id===state.org?.coach_id}):"";
 const recipeTools='<section class="card"><h2>🍽️ Mis recetas propias</h2><p class="pilot-hint">Calculá los macros según ingredientes pesados y porciones. Son estimaciones y no recetas terapéuticas.</p><div class="meal-actions"><button class="btn small light" data-act="createPersonalRecipe">Crear receta</button><button class="btn small ghost" data-act="registerPersonalRecipe" '+(!myRecipes().length?'disabled':'')+'>Registrar receta</button></div><small>'+myRecipes().length+' recetas guardadas en tu cuenta</small><div class="pilot-stack" style="margin-top:12px">'+myRecipes().map(r=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(r.name)+'</strong><small>Porción: '+num(r.totals.k/r.portions)+' kcal · P '+num(r.totals.p/r.portions,1)+' g · HC '+num(r.totals.c/r.portions,1)+' g · G '+num(r.totals.f/r.portions,1)+' g</small></div><button class="btn small ghost" data-recipedelete="'+escapeHTML(r.id)+'">Eliminar</button></div></div>').join("")+'</div></section>';
 let meals=mealSlots.map(([key,title,emoji])=>{
  let items=(d.meals[key]||[]),omitted=!!d.skipped?.[key];
  const detail=items.length?'<div class="meal-food-list">'+items.map((i,index)=>{
   const portion=i.displayQty?num(i.displayQty,1)+' '+escapeHTML(i.displayUnit)+' (≈'+num(i.qty,1)+' '+escapeHTML(i.unit)+')':num(i.qty,1)+' '+escapeHTML(i.unit);
   return '<div class="meal-food-line"><div class="meal-food-label"><strong>'+escapeHTML(i.name)+'</strong><span>'+portion+' · '+num(i.k,0)+' kcal · P '+num(i.p,1)+' g · HC '+num(i.c,1)+' g · G '+num(i.f,1)+' g</span></div>'+
   '<button type="button" class="meal-remove-item" data-removefood="'+key+':'+index+'" aria-label="Eliminar '+escapeHTML(i.name)+'" title="Quitar solo este alimento">×</button></div>';
  }).join("")+'</div>':'<small class="meal-food-empty">Todavía no hay alimentos registrados.</small>';
  return '<details class="pilot-record meal-day-section student-meal-card" '+(state.lastEditedMeal===key?'open':'')+'><summary class="student-meal-heading"><strong>'+emoji+' '+title+'</strong><span class="pilot-pill">'+(omitted?'Omitida':items.length?num(values(items).k)+' kcal':'Sin cargar')+'</span></summary><div class="student-meal-details">'+
  detail+'<div class="meal-actions"><label class="pilot-switch"><input type="checkbox" data-skipmeal="'+key+'" '+(omitted?'checked':'')+'> Omitir</label><button class="btn small light" data-setmeal="'+key+'">+ Añadir alimento</button>'+(items.length?'<button class="btn small ghost" data-clearm="'+key+'">Vaciar comida</button>':'')+'<button class="btn small ghost" data-habitualsave="'+key+'" '+(!items.length?'disabled':'')+'>☆ Guardar habitual</button></div>'+habitualPickerHTML(key)+'</div></details>';
 }).join("");
const cons=state.consent,showConsent=state.profile.role==="student";
 const consentPanel=showConsent?'<section class="pilot-consent" style="margin-bottom:20px"><h3>🔒 Privacidad y seguimiento</h3><p class="pilot-hint">Tu coach asignado puede consultar registros de alimentación, peso, actividad y suplementos cuando autorizás el seguimiento al ingresar con tu código. Podés retirar el permiso cuando quieras.</p><small style="display:block;margin:10px 0;color:#77958a">Seguimiento: '+(cons?.accepted?'Autorizado':'No autorizado')+'</small>'+(cons?.accepted?'<button class="btn small ghost" data-act="revokeConsent">Revocar acceso del coach</button>':'<button class="btn small light" data-act="grantConsent">Autorizar seguimiento del coach</button>')+'</section>':'';
 const closePanel=showConsent?'<div class="nutrition-day-close"><h3>📝 Comentario del día</h3>'+
 '<p class="pilot-hint">¿Tuviste dificultades con una comida, los horarios, el apetito o la saciedad? Podés contárselo a tu coach. Es opcional.</p>'+
 '<div class="field"><label for="dayComment">Tu comentario para el coach</label><textarea id="dayComment" rows="4" maxlength="1000" placeholder="Ej.: tuve una reunión y me salteé la media mañana.">'+escapeHTML(dayComment(d))+'</textarea></div>'+
 '<div class="meal-actions"><button type="button" class="btn small light" data-act="saveDayComment">Guardar comentario</button></div>'+
 '<p class="pilot-hint">El día se cierra automáticamente a las 23:59 (hora de Argentina). Hasta entonces podés registrar y corregir comidas. No hace falta cerrar nada manualmente.</p></div>':'';
 const goalForm=state.profile.role!=="student"?'<section class="card" style="margin-top:17px"><h2>Mis objetivos personales</h2><p class="pilot-hint">Estos objetivos pertenecen a tu cuenta personal. No modifican los planes de los alumnos.</p><div class="pilot-form"><div class="field-row">'+[
 ["selfK","Calorías",goal?.k||2200],["selfP","Proteínas",goal?.p||160],["selfC","Hidratos",goal?.c||230],["selfF","Grasas",goal?.f||70],["selfFi","Fibra",goal?.fi||30]
 ].map(x=>'<div class="field"><label>'+x[1]+'</label><input type="number" min="0" id="'+x[0]+'" value="'+x[2]+'"></div>').join("")+'</div><button class="btn" data-act="setSelfGoals">Guardar mis objetivos</button></div></section>':'';
  return rootText("MI DÍA",isPersonalProfessional?"Tu alimentación personal, tus objetivos y tu progreso. Ningún registro se mezcla con los de tus alumnos.":"Tu registro de hoy. Las metas provienen de tu coach y la guía no se registra como consumo.")+
 '<section class="efg-personal-hello"><span>HOLA,</span><strong>'+escapeHTML((state.profile?.nickname||"ALUMNO").trim())+'</strong></section>'+
 pastelDaySummary(tot,goal,d,mealSlots)+
 weeklyPanel+
 '<section class="pilot-hero efg-pastel-motivation"><div class="eyebrow">MENSAJE DEL DÍA · '+today().split("-").reverse().join("/")+'</div><h2>'+escapeHTML(motivation.title)+'</h2><p>'+escapeHTML(motivation.subtitle)+'</p><button class="btn small light" data-tab="planner">✨ Resolver lo que me falta</button></section>'+
 (!goal?'<div class="pilot-alert">Aún no hay un objetivo nutricional aprobado para esta cuenta. Los registros funcionan, pero no mostraremos metas inventadas.</div>':'')+
 (state.profile.role==="student"&&state.foodPlan?.guided_plan?'<details class="efg-pastel-guide"><summary>📋 Ver mi guía aprobada del coach</summary>'+studentGuidedSection()+'</details>':'')+
 (state.profile.role==="student"&&!state.consent?.accepted?'<div class="efg-consent-reminder"><span>🔒 Tu coach todavía no tiene autorización para seguir tus registros.</span><button class="btn small light" data-tab="privacy">Revisar permiso</button></div>':'')+'<nav class="student-shortcuts" aria-label="Accesos rápidos"><button type="button" data-scrollto="studentMeals">🍽️ Mis comidas</button><button data-tab="planner">✨ Planificar</button><button data-tab="weight">📈 Progreso</button></nav>'+
 '<div class="pilot-two student-daily-layout"><div class="card" id="studentMeals">'+ '<div class="section-head"><h2>Mis comidas de hoy</h2><span class="pilot-pill">'+num(tot.fi,1)+' g fibra</span></div>'+meals+'<details class="efg-optional-panel"><summary>✍️ Comentario para mi coach</summary>'+closePanel+'</details>'+'</div><div class="pilot-stack"><div class="card"><h2>Balance restante</h2>'+(goal?["p","c","f","fi"].map(k=>'<div class="pilot-macro"><span>'+({p:"Proteínas",c:"Hidratos",f:"Grasas",fi:"Fibra"}[k])+'</span><b>'+num(Math.max(0,goal[k]-tot[k]),1)+' g</b></div>').join(""):'<div class="pilot-plan-empty">El entrenador todavía no configuró las metas.</div>')+'<p class="pilot-hint" style="margin-top:16px">Los registros son autodeclarados. No representan una valoración médica ni reemplazan la consulta con un profesional matriculado cuando corresponda.</p></div></div></div>'+'<div class="efg-quick-more"><button class="btn light" data-tab="supplements">💊 Suplementos</button><button class="btn light" data-tab="recipes">🍲 Mis recetas</button><button class="btn light" data-tab="summaries">📋 Informes</button></div><div id="mealDialogContainer"></div>'+goalForm;
}

function allowedFoods(){return foods.map(f=>f.id);}
function plannerCard(){
 const goal=activeGoal(),d=activeDiary(),tot=dailyTotals(d),mode=state.plannerMode;
 const plan=makePlan({foods,approved:allowedFoods(),diary:d,goals:goal,totals:tot,dinnerOnly:mode==="dinner",selections:state.plannerSelections});
 let out='<section class="card planner-panel" id="planSuggestionCard"><div class="eyebrow">TU PLAN FLEXIBLE</div><h2>✨ Resolver lo que me falta</h2>'+
 '<p class="pilot-hint">Elegí qué querés comer. Primero calculamos proteína, después hidratos y, solo si los elegís, extras para completar calorías. Las grasas se contabilizan, pero no se imponen.</p>'+
 '<div class="planner-mode"><button class="'+(mode==="both"?"on":"")+'" data-planmode="both">Merienda + cena</button><button class="'+(mode==="dinner"?"on":"")+'" data-planmode="dinner">Solo cena</button></div>';
 if(!goal)return out+'<div class="pilot-alert">Para sugerir cantidades necesitamos un objetivo nutricional definido. '+(state.profile.role==="student"?"Tu entrenador debe aprobarlo.":"Configurá tus objetivos personales desde Mi día.")+'</div></section>';
 const left=plan.remaining||{};
 out+='<div class="planner-remaining"><b>Saldo REAL · lo que falta hoy</b><span>'+num(left.k,1)+' kcal · P '+num(left.p,1)+' g · HC '+num(left.c,1)+' g · G '+num(left.f,1)+' g</span><small>Los mismos valores de Mi alimentación: solo lo que ya registraste.</small></div>';
 if(!plan.ready)return out+'<div class="pilot-alert">'+escapeHTML(plan.reason)+'</div></section>';
 const all=allPlannerFoods(foods,allowedFoods());
 const slotNames={protein:"Proteína",carbs:"Hidratos",vegetable:"Extra para calorías · opcional 1",fat:"Extra para calorías · opcional 2"};
 for(const meal of plan.meals){
  const title=mealSlots.find(m=>m[0]===meal.slot)?.[1]||meal.slot;
  const available=all; // Catálogo íntegro: todas las categorías y comidas para planificar.
  out+='<details class="planner-meal efg-planner-stage" '+(meal.slot==="merienda"||plan.meals.length===1?'open':'')+'><summary class="efg-planner-stage-head"><span><small>COMIDA PLANIFICADA</small><strong>'+escapeHTML(title)+'</strong></span><span class="pilot-pill">'+num(meal.estimate.k)+' kcal</span></summary>';
  out+='<div class="planner-energy-summary" data-plan-energy="'+escapeHTML(meal.slot)+'">'+
   '<div class="planner-energy-stats">'+
   '<div><span>Objetivo</span><strong data-plan-energy-target>'+num(meal.target.k)+' <small>kcal</small></strong></div>'+
   '<div><span>Comida planificada</span><strong data-plan-energy-selected>'+num(meal.estimate.k)+' <small>kcal</small></strong></div>'+
   '<div><span>Por cubrir</span><strong data-plan-energy-left>'+num(Math.max(0,meal.target.k-meal.estimate.k))+' <small>kcal</small></strong></div>'+
   '</div><p data-plan-energy-message></p></div>';
  if(meal.split){
   const snack=meal.split==="snack-third";
   const budget=meal.target||meal.baselineTarget||{};
   out+='<div class="planner-split-target"><b>'+(snack?'⅓ para la merienda':'⅔ para la cena + lo no cubierto en la merienda')+'</b>'+
    '<span>Objetivo orientativo: '+num(budget.k)+' kcal · P '+num(budget.p,1)+' g · HC '+num(budget.c,1)+' g · G '+num(budget.f,1)+' g</span>'+
    (snack?'<small>Porciones moderadas; lo que no cubras se reserva para la cena.</small>':'<small>La cena considera el remanente real de la merienda, no solo su fracción inicial.</small>')+
    '</div>';
  }
  for(const row of meal.rows){
   if(row.category==="vegetable"){
    const choices=meal.slot==="merienda"?["banana","bread","walnuts"]:["avocado","bread","potato"];
    const idsAlready=new Set(meal.rows.slice(0,2).map(x=>x.food?.id));
    const suggestions=choices.map(id=>available.find(f=>f.id===id)).filter(f=>f&&!idsAlready.has(f.id));
    if(suggestions.length){
     out+='<div class="planner-extras-helper"><b>¿Querés completar calorías con un extra?</b>'+
       '<p data-plan-extra-remaining="'+escapeHTML(meal.slot)+'">Las calorías que faltan aparecen arriba. Elegí un extra solo si querés.</p>'+
       '<div class="planner-extra-actions">'+suggestions.map(f=>'<button type="button" class="planner-extra-chip" data-planextra="'+escapeHTML(meal.slot)+'|vegetable" data-planfood="'+escapeHTML(f.id)+'">+ '+escapeHTML(f.name)+'</button>').join("")+'</div>'+
       '<small>Elegir uno solo prepara la sugerencia de gramos; no registra alimentos automáticamente.</small></div>';
    }
   }
   const key=meal.slot+"|"+row.category;
   const label=slotNames[row.category]||"Alimento";
   const currentId=row.food?.id||"none";
   let options='<option value="none"'+(currentId==="none"?' selected':'')+'>No agregar</option>'+groupedFoodOptions(available,meal.slot);
   if(currentId!=="none")options=options.replace('<option value="'+escapeHTML(currentId)+'">','<option value="'+escapeHTML(currentId)+'" selected>');
   out+='<div class="planner-item"><label for="planSearch_'+escapeHTML(key)+'">'+label+'</label>'+
    '<input class="planner-food-search" type="search" autocomplete="off" data-plansearch="'+escapeHTML(key)+'" id="planSearch_'+escapeHTML(key)+'" placeholder="Buscar entre todos los alimentos…">'+
    '<select aria-label="'+escapeHTML(label)+'" data-planselect="'+escapeHTML(key)+'">'+options+'</select>';
   out+='<div class="planner-row-actions" data-plancontrols="'+escapeHTML(key)+'">';
   if(row.food){
    const unsupported=Object.prototype.hasOwnProperty.call(MILK_BEVERAGES,row.food.id);
    const qty=row.grams;
    const nutrientLabel=row.targetNutrient==="p"?"proteínas":row.targetNutrient==="c"?"hidratos":"calorías";
    const targetExplanation=row.capped?' <small>'+(meal.split==="snack-third"?"Se sugiere una porción moderada de merienda. Lo que falte pasará a la cena.":"Para cubrir el objetivo solo con este alimento harían falta aproximadamente "+num(row.neededGrams)+" "+escapeHTML(row.unit)+". Se recomienda una porción limitada; el resto quedará indicado abajo.")+'</small>':"";
    out+='<div class="planner-qty"><div class="planner-recommendation">'+
      (unsupported?'Bebida con leche: personalizá sus ingredientes al registrar.':qty>0?'Cantidad sugerida para '+nutrientLabel+': <b>'+num(qty)+' '+escapeHTML(row.unit)+'</b>'+targetExplanation:'<span>'+escapeHTML(row.reason||"No es necesario añadir este alimento para el objetivo prioritario.")+'</span>')+
      (row.food.id==="milanesa_soy_gobinda"&&qty>0?' <small>(≈ '+num(qty/125,2)+' milanesas de 125 g)</small>':"")+
      (["egg","egg_boiled","huevo_frito","huevo_frito_fritolim"].includes(row.food.id)&&qty>0?' <small>(≈ '+num(qty/50)+' huevos de 50 g)</small>':"")+
      '</div>';
    if(unsupported){
      out+='<button type="button" class="btn small light" data-planopenmeal="'+escapeHTML(key)+'">Registrar con ingredientes</button>';
    }else{
      out+='<label for="planQty_'+escapeHTML(key)+'">Cantidad real ('+escapeHTML(row.unit)+')<input type="number" min="0.1" max="3000" step="any" id="planQty_'+escapeHTML(key)+'" value="'+qty+'" inputmode="decimal"></label>'+
       '<button type="button" class="btn small" data-planadd="'+escapeHTML(key)+'">Registrar</button>';
    }
    out+='</div>';
   }else{
    out+='<p class="pilot-hint planner-skipped">No se añadirá ningún alimento en este espacio.</p>';
   }
   out+='</div></div>';
  }
  out+='<p class="pilot-hint">Estos alimentos aporta aprox. P '+num(meal.estimate.p,1)+' g · HC '+num(meal.estimate.c,1)+' g · G '+num(meal.estimate.f,1)+' g. Todas las cantidades son orientativas.</p></details>';
 }
 out+='<section class="planner-balance-compare" id="plannerPendingNotice" aria-live="polite" aria-label="Saldo real y balance simulado">'+
 '<div class="planner-real-balance"><b>Saldo REAL · solo lo registrado</b>'+
 '<p id="plannerRealNumbers"></p><small>Coincide con los valores de Mi alimentación. No incluye ningún alimento simulado.</small></div>'+
 '<div class="planner-left planner-simulated-balance"><b id="plannerSimulationHeading">SIMULACIÓN · si comieras lo seleccionado</b>'+
 '<p id="plannerPlannedNumbers"></p><p id="plannerPendingNumbers"></p><small id="plannerPendingDetail"></small></div></section>'+
 '<p class="pilot-hint">La simulación NO registra alimentos. El saldo real solo cambia cuando guardás lo que efectivamente comiste. Estas sugerencias no sustituyen las indicaciones de tu coach.</p></section>';
 return out;
}
const plannerNormalizeQuery=(v)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim();
// Actualizar solamente los controles del extra buscado: NO reconstruir el panel
// mientras el usuario escribe, porque Safari iOS pierde foco/teclado y scroll.
function syncPlannerSearchActions(key){
 const panel=document.getElementById("planSuggestionCard");
 if(!panel)return;
 const mount=[...panel.querySelectorAll("[data-plancontrols]")].find(el=>el.dataset.plancontrols===key);
 if(!mount)return;
 const pair=parsePlannerKey(key);
 if(!pair)return;
 const [slot,category]=pair;
 const plan=makePlan({foods,approved:allowedFoods(),diary:activeDiary(),goals:activeGoal(),totals:dailyTotals(activeDiary()),dinnerOnly:state.plannerMode==="dinner",selections:state.plannerSelections});
 const row=plan.meals?.find(meal=>meal.slot===slot)?.rows?.find(item=>item.category===category);
 if(!row?.food){
  mount.innerHTML='<p class="pilot-hint planner-skipped">No se añadirá ningún alimento en este espacio.</p>';
  return;
 }
 const unsupported=Object.prototype.hasOwnProperty.call(MILK_BEVERAGES,row.food.id);
 if(unsupported){
  mount.innerHTML='<div class="planner-qty"><p class="planner-recommendation">Bebida con leche: personalizá sus ingredientes al registrar.</p>'+
    '<button type="button" class="btn small light" data-planopenmeal="'+escapeHTML(key)+'">REGISTRAR CON INGREDIENTES</button></div>';
  return;
 }
 const suggested=Number(row.grams);
 const hint=suggested>0?
  'Cantidad sugerida: <b>'+num(suggested)+' '+escapeHTML(row.unit)+'</b>. Modificala por la que realmente comiste.':
  'No necesitás este extra para el objetivo, pero podés registrar la cantidad que realmente comiste.';
 mount.innerHTML='<div class="planner-qty"><div class="planner-recommendation">'+hint+'</div>'+
  '<label for="planQty_'+escapeHTML(key)+'">Cantidad real ('+escapeHTML(row.unit)+')'+
  '<input type="number" min="0.1" max="3000" step="any" id="planQty_'+escapeHTML(key)+'" value="'+(suggested>0?num(suggested):'')+'" inputmode="decimal" placeholder="Gramos consumidos"></label>'+
  '<button type="button" class="btn small" data-planadd="'+escapeHTML(key)+'">AGREGAR AL REGISTRO</button></div>';
}
function filterPlannerFoods(input){
 if(!input?.dataset?.plansearch)return;
 const key=input.dataset.plansearch,slot=key.split("|")[0];
 const select=[...root.querySelectorAll("[data-planselect]")].find(el=>el.dataset.planselect===key);
 if(!select)return;
 const chosenId=select.value;
 const words=plannerNormalizeQuery(input.value).split(/\s+/).filter(Boolean);
 const available=allPlannerFoods(foods,allowedFoods()); // Buscar sobre todo el catálogo.
 const matched=available.filter(f=>{
  const aliases=f.id==="milanesa_chicken_baked"?"suprema de pollo horno":f.id==="milanesa_chicken_fried"?"suprema frita":f.id==="milanesa_beef_baked"?"milanesa horno de carne":"";
  const name=plannerNormalizeQuery(foodSearchText(f)+" "+aliases);
  return words.every(w=>name.includes(w));
 });
 const hasQuery=words.length>0;
 const selectedMatch=matched.find(f=>f.id===chosenId);
 const nextId=hasQuery?(selectedMatch?.id||matched[0]?.id||"none"):chosenId;
 // El resultado visible debe coincidir con el texto ingresado, también en iOS.
 select.innerHTML='<option value="none">No agregar</option>'+groupedFoodOptions(matched,slot)+(matched.length?"":'<option disabled>Sin coincidencias</option>');
 select.value=nextId;
 if(hasQuery&&nextId!==chosenId){
  state.plannerSelections[key]=nextId;
  delete state.plannerDraftGrams[key];
  syncPlannerSearchActions(key);
  updatePlannerPreview();
 }
}
function updatePlannerPreview(){
 const notice=document.getElementById("plannerPendingNotice");
 const numbers=document.getElementById("plannerPendingNumbers"),details=document.getElementById("plannerPendingDetail");
 const realNumbers=document.getElementById("plannerRealNumbers"),plannedNumbers=document.getElementById("plannerPlannedNumbers"),simulatedHeading=document.getElementById("plannerSimulationHeading");
 if(!notice||!numbers||!details)return;
 const balance=dailyTotals(activeDiary()),goal=activeGoal();
 if(!goal)return;
 const gramChoices={},chosenFoods=[];
 let hasUnsupported=false;
 for(const select of notice.closest("#planSuggestionCard").querySelectorAll("[data-planselect]")){
  const key=select.dataset.planselect;
  const food=foods.find(f=>f.id===select.value);
  if(!food)continue;
  if(Object.prototype.hasOwnProperty.call(MILK_BEVERAGES,food.id)){hasUnsupported=true;gramChoices[key]=0;continue;}
  const grams=Number(document.getElementById("planQty_"+key)?.value)||0;
  if(grams<0||!Number.isFinite(grams))continue;
  gramChoices[key]=grams;
  chosenFoods.push({food,grams});
 }
 const energyPlan=makePlan({foods,approved:allowedFoods(),diary:activeDiary(),goals:goal,totals:balance,dinnerOnly:state.plannerMode==="dinner",selections:state.plannerSelections});
 const energy=plannerEnergyBreakdown(energyPlan,gramChoices);
 for(const [i,entry] of energy.entries()){
  const section=[...notice.closest("#planSuggestionCard").querySelectorAll("[data-plan-energy]")].find(el=>el.dataset.planEnergy===entry.slot);
  if(!section)continue;
  const fmt=(v)=>num(v)+" <small>kcal</small>";
  const targetEl=section.querySelector("[data-plan-energy-target]");
  const selectedEl=section.querySelector("[data-plan-energy-selected]");
  const leftEl=section.querySelector("[data-plan-energy-left]");
  if(targetEl)targetEl.innerHTML=fmt(entry.target);
  if(selectedEl)selectedEl.innerHTML=fmt(entry.selected);
  if(leftEl)leftEl.innerHTML=fmt(entry.remaining);
  const status=section.querySelector("[data-plan-energy-message]");
  if(status){
   status.textContent=entry.exceeded>2?"Supera este presupuesto en "+num(entry.exceeded)+" kcal. Podés ajustar las cantidades.":
    entry.remaining>2?"Faltan "+num(entry.remaining)+" kcal para este presupuesto. Podés elegir un extra, sin obligación de completarlo.":
    "El objetivo de calorías de esta comida está aproximadamente cubierto.";
   if(energyPlan.split==="one-third-two-thirds"&&entry.slot==="merienda"){
    status.textContent+=" "+(entry.exceeded>2?"La cena tendrá menos calorías disponibles.":"Lo que no se cubra aquí se traslada a la cena.");
   }
   if(energyPlan.split==="one-third-two-thirds"&&entry.slot==="cena"&&i===1){
    status.textContent+=" Presupuesto inicial: "+num(entry.baseline)+" kcal"+
      (entry.transfer>2?"; más "+num(entry.transfer)+" kcal no cubiertas en la merienda.":
       entry.transfer< -2?"; menos "+num(-entry.transfer)+" kcal utilizadas de más en la merienda.":".");
   }
  }
  const extra=[...notice.closest("#planSuggestionCard").querySelectorAll("[data-plan-extra-remaining]")].find(el=>el.dataset.planExtraRemaining===entry.slot);
  if(extra)extra.textContent=entry.remaining>2?
   "Quedan "+num(entry.remaining)+" kcal dentro de este presupuesto. Elegí un extra si querés acercarte al objetivo.":
   entry.exceeded>2?"Esta comida ya supera su presupuesto: no hace falta elegir extras.":
   "Ya se alcanzó el presupuesto de esta comida; no necesitás agregar extras.";
 }
 const balanceView=projectNutritionBalance({consumed:balance,goals:goal,selected:chosenFoods});
 const fmt=(obj)=>"Calorías "+num(obj.k,1)+" kcal · Proteínas "+num(obj.p,1)+" g · Hidratos "+num(obj.c,1)+" g · Grasas "+num(obj.f,1)+" g";
 if(realNumbers)realNumbers.textContent=fmt(balanceView.remaining);
 if(plannedNumbers)plannedNumbers.textContent="Las porciones seleccionadas aportarían: "+fmt(balanceView.planned);
 const remain=balanceView.projectedRemaining,excess=balanceView.projectedExceeded;
 const pendingMain=remain.k>2||remain.p>.4||remain.c>.4;
 const fatOnly=!pendingMain&&remain.f>.4;
 notice.classList.toggle("planner-complete",!pendingMain);
 const heading=simulatedHeading;
 if(heading)heading.textContent=pendingMain?"SIMULACIÓN · quedarían por cubrir":fatOnly?"SIMULACIÓN · solo grasas pendientes (informativo)":"SIMULACIÓN · objetivos aproximadamente cubiertos";
 numbers.textContent="Si comieras todas estas porciones, quedarían: "+fmt(remain);
 const excessParts=[["k","kcal",5],["p","g de proteína",.8],["c","g de hidratos",.8],["f","g de grasas",.8]].filter(([key,,limit])=>excess[key]>limit).map(([key,label])=>num(excess[key],1)+" "+label);
 details.textContent="Esto todavía NO se registró. "+(excessParts.length?"La combinación superaría algunos objetivos: "+excessParts.join(" · ")+". ":"")+
  (remain.k>2?"Si querés sumar alimentos para acercarte a las calorías pendientes, usá un extra opcional. ":"")+
  (hasUnsupported?"Para bebidas con leche, completá sus ingredientes antes de contabilizarlas. ":"")+
  "El saldo real solo cambia cuando registrás efectivamente lo consumido.";
}
function refreshPlannerCard(focusKey=null){
 const section=document.getElementById("planSuggestionCard");
 if(!section)return render();
 const queries=new Map([...section.querySelectorAll("[data-plansearch]")].map(el=>[el.dataset.plansearch,el.value]));
 // Cada cambio de alimento vuelve a calcular sugerencia y cantidad inicial.
 // No restaurar la cantidad vieja (causaba, por ejemplo, 340 g vs 20 g sugeridos).
 section.outerHTML=plannerCard();
 const newer=document.getElementById("planSuggestionCard");
 for(const [key,record] of Object.entries(state.plannerDraftGrams||{})){
  const selected=[...newer.querySelectorAll("[data-planselect]")].find(el=>el.dataset.planselect===key);
  const field=document.getElementById("planQty_"+key);
  if(!selected||!field||selected.value!==record.foodId){delete state.plannerDraftGrams[key];continue;}
  field.value=String(record.grams);
 }
 for(const [key,value] of queries){
  if(key===focusKey)continue;
  const field=[...newer.querySelectorAll("[data-plansearch]")].find(el=>el.dataset.plansearch===key);
  if(field){field.value=value;filterPlannerFoods(field);}
 }
 updatePlannerPreview();
 // iOS Safari: no reenfocar el selector nativo tras una elección; eso reabre la lista.
}
function parsePlannerKey(key){const parts=String(key).split("|");return parts.length===2&&MEAL_ORDER.includes(parts[0])&&FOOD_GROUPS[parts[1]]?[parts[0],parts[1]]:null;}
function openPlannedFoodEditor(key){
 const pair=parsePlannerKey(key);
 if(!pair)throw new Error("Selección inválida.");
 const [slot,category]=pair;
 const id=state.plannerSelections[key]||"";
 const selected=foods.find(f=>f.id===id);
 if(!selected)throw new Error("Seleccioná un alimento.");
 openMealDialog(slot);
 const picker=document.getElementById("mealEditorFood");
 if(!picker)return;
 picker.value=selected.id;
 updateMealEntryMode(true);
}
async function addPlannedFood(key){
 const pair=parsePlannerKey(key);if(!pair)throw new Error("Opción no válida.");
 const [slot,category]=pair, grams=Number(document.getElementById("planQty_"+key)?.value);
 if(!Number.isFinite(grams)||grams<=0||grams>3000)throw new Error("Ingresá el peso real.");
 const plan=makePlan({foods,approved:allowedFoods(),diary:activeDiary(),goals:activeGoal(),totals:dailyTotals(activeDiary()),dinnerOnly:state.plannerMode==="dinner",selections:state.plannerSelections});
 const meal=plan.meals?.find(m=>m.slot===slot),row=meal?.rows.find(r=>r.category===category);
 if(!row?.food)throw new Error("Seleccioná un alimento antes de registrarlo.");
 if(Object.prototype.hasOwnProperty.call(MILK_BEVERAGES,row.food.id))return openPlannedFoodEditor(key);
 const d=activeDiary();d.meals[slot] ||= [];d.skipped[slot]=false;
 d.meals[slot].push(normItem(row.food,grams,slot));
 // Mantener la comida actual, pero no volver a sugerir el componente recién registrado.
 state.plannerSelections[key]="none";
 state.plannerDraftGrams={};
 await saveDiary();notify("Registraste "+num(grams)+" g de "+row.food.name+". Recalculamos lo que falta.");
}
let mealDialogReturnFocus=null;
function closeMealDialog(){
 const container=document.getElementById("mealDialogContainer");if(container)container.innerHTML="";
 state.activeMeal=null;
 if(mealDialogReturnFocus?.isConnected)mealDialogReturnFocus.focus({preventScroll:true});
 mealDialogReturnFocus=null;
}
function openMealDialog(slot){
 const meal=mealSlots.find(m=>m[0]===slot);if(!meal)return;
 const permitted=new Set(allowedFoods());for(const [cooked,raw] of Object.values(FOOD_STATE_PAIRS))if(permitted.has(cooked))permitted.add(raw);
 const allowed=[...permitted].map(id=>foods.find(x=>x.id===id)).filter(Boolean).filter(f=>foodAllowedForMeal(f,slot));
 state.activeMeal=slot;state.lastEditedMeal=slot;
 mealDialogReturnFocus=document.activeElement;
 document.getElementById("mealDialogContainer").innerHTML='<div class="meal-backdrop" role="presentation"><div class="meal-popup" role="dialog" aria-modal="true" aria-labelledby="meal-popup-title">'+
 '<div class="between"><h2 id="meal-popup-title">'+meal[2]+' Añadir a '+meal[1]+'</h2><button type="button" class="btn small ghost" data-act="closeMeal" aria-label="Cerrar ventana de alimentos">✕</button></div><p class="pilot-hint">Podés registrar gramos, mililitros o, cuando corresponda, unidades aproximadas.</p>'+
 '<div class="pilot-form"><div class="field"><label for="mealFoodSearch">Buscar alimento</label><input type="search" id="mealFoodSearch" placeholder="Ej.: zapallo, pizza, sushi, chocolate…" autocomplete="off"></div>'+
 '<div class="field"><label for="mealEditorFood">Alimento</label><select id="mealEditorFood" required><option value="" selected disabled>Elegí un alimento de la lista</option>'+groupedFoodOptions(allowed,slot)+'</select></div>'+
 '<div class="field" id="mealWeightStateWrap"><label for="mealWeightState">Estado del peso</label><select id="mealWeightState"><option value="cooked">Cocido / preparado (recomendado)</option><option value="raw">Crudo / seco</option></select><small id="mealWeightStateHint" class="pilot-hint">Utilizá la ficha nutricional correspondiente al estado de tu alimento.</small></div><div class="field" id="mealEntryModeWrap"><label for="mealEntryMode">¿Cómo querés registrarlo?</label><select id="mealEntryMode"><option value="weight">Peso (g o ml)</option><option value="units">Por unidades</option></select></div>'+
 '<div class="field"><label id="mealEditorQtyLabel" for="mealEditorQty">Cantidad (g o ml)</label><input id="mealEditorQty" type="number" min=".1" max="5000" step="any" value="100"></div>'+
 '<div id="mealRecipeDetail"></div><div id="mealBeverageDetail"></div><div class="note" id="mealEditorHint"></div><button class="btn block" data-act="saveSelectedMeal">Registrar y recalcular</button></div></div></div>';
 updateMealEntryMode(true);
 document.getElementById("mealFoodSearch")?.focus({preventScroll:true});
}
function filterMealFoods(){
 const selector=document.getElementById("mealEditorFood"),search=document.getElementById("mealFoodSearch");
 if(!selector||!search)return;
 const normalizeQuery=(v)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim();
 const term=normalizeQuery(search.value);
 const words=term.split(/\s+/).filter(Boolean);
 const previous=selector.value;
 const permittedFoodIds=new Set(allowedFoods());for(const [cooked,raw] of Object.values(FOOD_STATE_PAIRS))if(permittedFoodIds.has(cooked))permittedFoodIds.add(raw);
 const filtered=[...permittedFoodIds].map(id=>foods.find(f=>f.id===id)).filter(Boolean).filter(f=>foodAllowedForMeal(f,state.activeMeal)).filter(f=>{
  const aliases=f.id==="milanesa_chicken_baked"?"suprema de pollo horno":f.id==="milanesa_chicken_fried"?"suprema frita":f.id==="milanesa_beef_baked"?"milanesa horno de carne":"";
  const name=normalizeQuery(foodSearchText(f)+" "+aliases);
  return words.every(w=>name.includes(w));
 });
 selector.innerHTML='<option value="" disabled selected>'+(filtered.length?'Elegí el alimento que querés registrar':'Sin coincidencias')+'</option>'+groupedFoodOptions(filtered,state.activeMeal);
 if(filtered.some(f=>f.id===previous))selector.value=previous;
 else selector.value="";
 // No autoseleccionar la primera opción: iOS no emite "change" si el
 // usuario elige un valor que el select ya consideraba seleccionado.
 updateMealEntryMode(true);
}
function updateMealEntryMode(foodChanged=false){
 const id=document.getElementById("mealEditorFood")?.value;
 const f=foods.find(x=>x.id===id);
 const portion=f?FOOD_UNIT_PORTIONS[f.id]:null;
 const mode=document.getElementById("mealEntryMode"),wrap=document.getElementById("mealEntryModeWrap"),qty=document.getElementById("mealEditorQty"),label=document.getElementById("mealEditorQtyLabel");
 if(!mode||!qty||!label||!wrap)return;
 wrap.style.display=portion?"":"none";
 if(foodChanged){mode.value=portion?"units":"weight";qty.value=portion?(f.id==="egg"?2:1):100;updateMealBeverage();}
 if(!portion)mode.value="weight";
 const counting=!!portion&&mode.value==="units";
 label.textContent=counting?"Cantidad ("+portion.label+(portion.grams?" · estimación":"")+")":"Cantidad ("+(f?.unit||"g")+")";
 qty.step=counting?"1":"any";
 qty.min=counting?"1":"0.1";
 if(counting&&!Number.isInteger(Number(qty.value)))qty.value=1;
 const stateInput=document.getElementById("mealWeightState"),stateHint=document.getElementById("mealWeightStateHint");
 if(stateInput&&stateHint){const id=f?.id||"";const pair=Object.entries(FOOD_STATE_PAIRS).find(([key,ids])=>ids.includes(id));const raw=pair?pair[1]===id:/\b(crud[oa]|sec[oa])\b/i.test(f?.name||"");stateInput.value=raw?"raw":"cooked";stateInput.disabled=!pair;stateHint.textContent=pair?"Podés cambiar de estado: los valores por 100 g se actualizarán usando su ficha nutricional específica. No convertimos automáticamente los gramos.":"Para este alimento no contamos con dos fichas equivalentes verificadas. Usá el estado indicado en el nombre del alimento.";}

 updateMealRecipe();
 updateMealDialogHint();
}
function measureMealEntry(){
 const id=document.getElementById("mealEditorFood")?.value;
 const f=foods.find(x=>x.id===id);
 const qty=Number(document.getElementById("mealEditorQty")?.value);
 const portion=f?FOOD_UNIT_PORTIONS[f.id]:null;
 const useUnits=!!portion&&document.getElementById("mealEntryMode")?.value==="units";
 const grams=useUnits?qty*portion.grams:qty;
 return {f,qty,grams,useUnits,portion};
}
function updateMealDialogHint(){
 const hint=document.getElementById("mealEditorHint");
 if(!hint)return;
 const {f,qty,grams,useUnits,portion}=measureMealEntry();
 if(!f||!Number.isFinite(grams)||grams<=0){hint.textContent="Elegí un alimento y una cantidad válida.";return;}
 if(BEVERAGE_IDS.has(f.id)){try{const result=calculateBeverage(f,grams);hint.textContent=result.summary+" · "+result.source;}catch(err){hint.textContent=err.message;}return;}
 hint.textContent=(useUnits?num(qty)+" "+portion.label+(qty===1?"":"s")+" ≈ "+num(grams,1)+" g. ":"")+
 num(f.k*grams)+" kcal y "+num(f.p*grams,1)+" g de proteína · "+foodProvenance(f)+". "+f.source+
 (useUnits?(f.oilIncluded?". Porción estimada: el aceite de esta preparación ya está contemplado; no lo registres dos veces.":". Porción estimada: puede variar por tamaño. Si agregaste aceite no incluido en el alimento, registralo aparte."):"");
}
async function saveSelectedMeal(){
 const slot=state.activeMeal;
 const {f,qty,grams,useUnits,portion}=measureMealEntry();
 if(!slot||!f||!foodAllowedForMeal(f,slot)||!(allowedFoods().includes(f.id)||Object.values(FOOD_STATE_PAIRS).some(([cooked,raw])=>raw===f.id&&allowedFoods().includes(cooked)))||!Number.isFinite(grams)||grams<=0||grams>5000||(useUnits&&(!Number.isInteger(qty)||qty>100)))throw new Error("Verificá el alimento y su cantidad.");
 const d=activeDiary();d.meals[slot] ||= [];
 const drink=BEVERAGE_IDS.has(f.id)?calculateBeverage(f,grams):null;
 const entry=normItem(f,grams,slot);
 if(drink){entry.name=drink.name;entry.source=drink.source;entry.ingredients=drink.ingredients;Object.assign(entry,drink.totals);}
 if(useUnits){entry.displayQty=qty;entry.displayUnit=portion.label;entry.unitEstimate=true;}
 d.meals[slot].push(entry);d.skipped[slot]=false;d.skipped._closed=false;state.activeMeal=null;
 await saveDiary();notify("Alimento agregado, balance actualizado.");
}
function coachFoodChoices(p,consent){
 if(!consent?.accepted)return "";
 const selected=new Set(state.coachFoodPlan?.approved_food_ids?.length?state.coachFoodPlan.approved_food_ids:FOOD_DEFAULTS);
 const sections=FOOD_CATEGORIES.map(([id,title],index)=>{
  const items=foods.filter(f=>groupIdFor(f)===id).sort((a,b)=>a.name.localeCompare(b.name,"es-AR"));
  if(!items.length)return "";
  return '<details class="coach-food-group" data-foodgroup="'+id+'" '+(index===0?'open':'')+'><summary><span>'+escapeHTML(title)+'</span><small>'+items.length+' opciones</small></summary>'+
  '<div class="coach-food-bulk"><button type="button" class="btn small light" data-foodbulk="'+id+'" data-foodchecked="yes">Marcar categoría</button><button type="button" class="btn small ghost" data-foodbulk="'+id+'" data-foodchecked="no">Desmarcar</button></div>'+
  '<div class="coach-food-choices">'+items.map(f=>'<label data-foodname="'+escapeHTML(plannerNormalizeQuery(foodSearchText(f)))+'"><input type="checkbox" data-coachfood="'+escapeHTML(f.id)+'" '+(selected.has(f.id)?'checked':'')+'> '+escapeHTML(f.name)+'</label>').join("")+'</div></details>';
 }).join("");
 return '<div class="divider"></div><h3>Alimentos permitidos para planificar</h3>'+
 '<p class="pilot-hint">Elegí lo que verá este alumno al registrar comidas y planificar porciones. Referencias genéricas; los alimentos de marca requieren comprobar la etiqueta.</p>'+
 '<div class="food-library-tools"><label for="coachFoodSearch">Buscar alimentos</label><input type="search" id="coachFoodSearch" placeholder="Buscar entre '+foods.length+' alimentos…" autocomplete="off"><p id="coachFoodCount" class="pilot-hint">'+selected.size+' alimentos seleccionados de '+foods.length+'</p></div>'+
 sections+'<button class="btn block" data-act="saveCoachFoodPlan" style="margin-top:13px">Guardar alimentos del alumno</button>';
}
function filterCoachFoodLibrary(){
 const input=document.getElementById("coachFoodSearch");
 if(!input)return;
 const term=plannerNormalizeQuery(input.value.trim());
 for(const group of root.querySelectorAll(".coach-food-group")){
  let visible=0;
  for(const label of group.querySelectorAll("label[data-foodname]")){
   const match=label.dataset.foodname.includes(term);
   label.style.display=match?"":"none";
   if(match)visible++;
  }
  group.style.display=visible?"":"none";
  if(term&&visible)group.open=true;
 }
 updateCoachFoodCount();
}
function updateCoachFoodCount(){
 const e=document.getElementById("coachFoodCount");
 if(e)e.textContent=root.querySelectorAll('input[data-coachfood]:checked').length+" alimentos seleccionados de "+foods.length;
}
async function saveCoachFoods(){
 if(!(state.profile.role==="coach"||(state.profile.role==="admin"&&state.org?.is_test))||!state.selectedStudent||!state.consent?.accepted)throw new Error("El alumno tiene que autorizarte primero.");
 const ids=[...root.querySelectorAll("input[data-coachfood]:checked")].map(x=>x.dataset.coachfood).filter(id=>foods.some(f=>f.id===id));
 if(!ids.length)throw new Error("Seleccioná por lo menos un alimento.");
 const row={student_id:state.selectedStudent,coach_id:state.session.user.id,approved_food_ids:ids,updated_at:new Date().toISOString()};
 const {error}=await sb.from("efg_food_plans").upsert(row,{onConflict:"student_id"});if(error)throw error;
 state.coachFoodPlan=row;await render();notify("Lista alimentaria guardada para este alumno.");
}

function sportView(){
 let d=activeDiary(),entries=(d.sports||[]).map((e,index)=>({...e,_originalIndex:index})).filter(e=>!supplementRecord(e));
 return rootText("Hidratación y deporte","La proteína whey se registra en comidas; los demás suplementos están debajo de Cena.")+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Registrar bebida o producto de entrenamiento</h2><p class="pilot-hint">Creatina, colágeno, magnesio y omega-3 están en Suplementos del día, debajo de Cena.</p><div class="pilot-form"><div class="field"><label>Producto</label><select id="sportItem">'+option(sports.filter(x=>!supplementRecord(x)&&x.id!=="whey"))+'</select></div><div class="field-row"><div class="field"><label>Momento</label><select id="sportTime">'+sportTimes.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")+'</select></div><div class="field"><label id="sportQtyLabel">Cantidad</label><input id="sportQty" type="number" min=".1" max="3000" step="any" value="30"></div></div><div class="note" id="sportInfo">Consultar etiqueta.</div><button class="btn block" data-act="addSport">Registrar consumo</button></div></div>'+
 '<div class="card"><h2>Consumos de hoy</h2>'+(entries.length?entries.map((x,i)=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(x.name)+'</strong><small>'+num(x.qty,1)+' '+escapeHTML(x.unit)+' · '+escapeHTML(x.when||"")+'</small></div><span class="pilot-pill">'+num(x.k)+' kcal</span></div><button class="btn small ghost" style="margin-top:8px" data-removesport="'+x._originalIndex+'">Eliminar</button></div>').join(""):'<div class="empty">No registraste suplementos ni bebidas.</div>')+'</div></div>'+
 '<div class="pilot-stack"><div class="card"><h2>¿Qué conviene tomar?</h2><div class="pilot-notice"><strong>💧 Agua o agua gasificada</strong><small>Ambas hidratan; elegí según tolerancia y preferencia.</small></div><div class="pilot-notice" style="margin-top:10px"><strong>🥤 Bebidas zero</strong><small>Pueden sustituir bebidas azucaradas cuando se busca reducir calorías, pero no son superiores al agua.</small></div><div class="pilot-notice" style="margin-top:10px"><strong>🏃 Geles e isotónicas</strong><small>Más relevantes en entrenamientos prolongados o con necesidades específicas de hidratos y electrolitos.</small></div><p class="pilot-hint" style="margin-top:15px">El scoop no equivale siempre a 30 g. Omega-3 y magnesio necesitan datos reales de etiqueta y pertinencia individual.</p></div></div></div>';
}
function weightDateLabel(w){
 const date=/^\d{4}-\d{2}-\d{2}$/.test(w?.measured_on||"")?w.measured_on.split("-").reverse().join("/"):"Fecha desconocida";
 const hour=w?.measured_time?String(w.measured_time).slice(0,5):null;
 return date+(hour?" · "+hour+" h":" · horario no registrado");
}
function normalizedWeights(items){
 return (items||[]).filter(w=>/^\d{4}-\d{2}-\d{2}$/.test(w?.measured_on||"")&&Number.isFinite(Number(w.kg))&&Number(w.kg)>0)
 .slice().sort((a,b)=>a.measured_on.localeCompare(b.measured_on));
}
function weightTrendChart(items){
 const weights=normalizedWeights(items);
 if(!weights.length)return '<div class="empty">Sin pesajes todavía. El gráfico aparecerá cuando el alumno registre su peso.</div>';
 const first=weights[0],last=weights[weights.length-1],previous=weights[weights.length-2];
 const delta=(a,b)=>a===null||b===null?'—':(a-b>0?'+':'')+num(a-b,1)+' kg';
 const vals=weights.map(w=>Number(w.kg));
 const lo=Math.min(...vals),hi=Math.max(...vals);
 const pad=Math.max(.5,(hi-lo)*.2),min=Math.max(0,lo-pad),max=hi+pad,span=Math.max(.1,max-min);
 const W=700,H=235,marginL=49,marginR=24,top=24,bottom=46;
 const xp=i=>marginL+(weights.length===1?(W-marginL-marginR)/2:i*(W-marginL-marginR)/(weights.length-1));
 const yp=kg=>top+(max-kg)/span*(H-top-bottom);
 const grid=Array.from({length:5},(_,i)=>{const v=min+(max-min)*i/4,y=yp(v);return '<line class="weight-chart-grid" x1="'+marginL+'" y1="'+y.toFixed(1)+'" x2="'+(W-marginR)+'" y2="'+y.toFixed(1)+'"></line><text class="weight-chart-axis" x="'+(marginL-7)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+num(v,1)+'</text>';}).join('');
 const points=weights.map((w,i)=>xp(i).toFixed(1)+','+yp(Number(w.kg)).toFixed(1)).join(' ');
 const circles=weights.map((w,i)=>'<circle class="weight-chart-point" cx="'+xp(i).toFixed(1)+'" cy="'+yp(Number(w.kg)).toFixed(1)+'" r="5"><title>'+escapeHTML(weightDateLabel(w)+' · '+num(w.kg,1)+' kg')+'</title></circle>').join('');
 const xLabels=weights.map((w,i)=>{if(weights.length>8&&i!==0&&i!==weights.length-1&&i%Math.ceil(weights.length/6)!==0)return '';return '<text class="weight-chart-axis" x="'+xp(i).toFixed(1)+'" y="'+(H-13)+'" text-anchor="middle">'+escapeHTML(w.measured_on.slice(8)+'/'+w.measured_on.slice(5,7))+'</text>';}).join('');
 return '<div class="weight-trend"><div class="weight-summary"><div><small>Primer pesaje</small><strong>'+num(first.kg,1)+' kg</strong><span>'+escapeHTML(weightDateLabel(first))+'</span></div><div><small>Último pesaje</small><strong>'+num(last.kg,1)+' kg</strong><span>'+escapeHTML(weightDateLabel(last))+'</span></div><div><small>Variación total</small><strong>'+delta(Number(last.kg),weights.length>1?Number(first.kg):null)+'</strong><span>Desde el anterior: '+delta(Number(last.kg),previous?Number(previous.kg):null)+'</span></div></div><div class="weight-chart-scroll"><svg class="weight-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de '+weights.length+' pesajes, desde '+num(first.kg,1)+' hasta '+num(last.kg,1)+' kilos">'+grid+(weights.length>1?'<polyline class="weight-chart-line" points="'+points+'"></polyline>':'')+circles+xLabels+'</svg></div><p class="pilot-hint">Cada punto es un pesaje real. Los días sin registro no se cuentan ni interpolan. Las variaciones aisladas pueden reflejar cambios de agua corporal.</p></div>';
}
const argentinaTime=()=>new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
function nutritionProgressPanel(isCoach=false){
 const logs=isCoach?state.coachProgressLogs:state.progressLogs;
 const goals=isCoach?state.coachGoals:state.goals;
 return progressDashboard(logs,goals,state.progressRange,today(),(date)=>goalForDate(goals,date),isCoach?"coach":"student");
}
function progressView(){
 const weights=normalizedWeights(state.weights).reverse();
 const last=weights[0];
 const daysSinceLast=last?Math.round((Date.parse(today()+"T12:00:00Z")-Date.parse(last.measured_on+"T12:00:00Z"))/86400000):null;
 const note=last?'<p class="pilot-hint">Último control: '+escapeHTML(weightDateLabel(last))+' · '+num(last.kg,1)+' kg. '+(daysSinceLast<7?'Para una comparación semanal, podés hacer el siguiente control en '+Math.max(1,7-daysSinceLast)+' día(s).':'Podés registrar tu próximo control semanal.')+'</p>':'<p class="pilot-hint">Comenzá registrando tu primer pesaje con fecha y hora.</p>';
 return rootText("Mi progreso","Seguimiento del peso corporal, actividad y evolución semanal.")+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Peso corporal semanal</h2>'+
 '<div class="warning" style="margin-top:15px">⚖️ Sugerimos un pesaje por semana, idealmente el mismo día y a la misma hora, después de ir al baño, antes del desayuno, con la misma balanza y ropa similar. Podés registrar controles adicionales si hace falta.</div>'+note+
 '<div class="pilot-form"><div class="field-row"><div class="field"><label for="weightDay">Fecha del pesaje</label><input id="weightDay" type="date" value="'+today()+'" max="'+today()+'" required></div>'+
 '<div class="field"><label for="weightTime">Hora del pesaje</label><input id="weightTime" type="time" value="'+argentinaTime()+'" required></div></div>'+
 '<div class="field"><label for="weightKg">Peso corporal (kg)</label><input id="weightKg" type="number" min="20" max="400" step=".1" placeholder="Ej.: 78.5" inputmode="decimal" required></div>'+
 '<button class="btn" data-act="saveWeight">Guardar pesaje</button><p class="pilot-hint">Se toma la fecha y hora local de Argentina. Si corregís un registro del mismo día, se actualiza en vez de duplicarse.</p></div></div>'+
 '<div class="card"><h2>Historial de pesajes</h2>'+(weights.length?'<div class="pilot-table-wrap"><table class="pilot-table"><thead><tr><th>Fecha y hora</th><th>Peso</th></tr></thead><tbody>'+
 weights.map(w=>'<tr><td>'+escapeHTML(weightDateLabel(w))+'</td><td><b>'+num(w.kg,1)+' kg</b></td></tr>').join("")+'</tbody></table></div>':'<div class="empty">Todavía no registraste tu peso.</div>')+'</div></div>'+
 '<div class="pilot-stack"><div class="card"><h2>Mi evolución del peso</h2>'+weightTrendChart(state.weights)+'</div>'+
 '<div class="card"><h2>Movimiento de hoy</h2><div class="pilot-form"><div class="field"><label>Pasos</label><input id="activitySteps" type="number" min="0" max="100000" placeholder="Ej. 8000"></div>'+
 '<div class="field"><label>Minutos de ejercicio</label><input id="activityMinutes" type="number" min="0" max="1440" placeholder="Ej. 60"></div>'+
 '<div class="field"><label>Tipo</label><select id="activityKind"><option>Entrenamiento de fuerza</option><option>Running</option><option>Cardio</option><option>Caminata</option><option>Otro</option></select></div>'+
 '<button class="btn" data-act="saveActivity">Guardar actividad</button></div></div>'+
 '<div class="card"><h2>Últimos registros</h2>'+(state.activities.length?state.activities.slice(0,5).map(a=>'<div class="pilot-record"><strong>'+escapeHTML(a.activity_day)+'</strong><small>'+num(a.steps)+' pasos · '+num(a.exercise_minutes)+' minutos · '+escapeHTML(a.kind)+'</small></div>').join(""):'<div class="empty">Aún no hay actividad registrada.</div>')+'</div></div></div>'+nutritionProgressPanel();
}

function macroEstimate(age,height,weight,activity,sex,goal,model="mifflin",proteinPerKg=null,fatPerKg=.9,recompMode="deficit05"){
 return estimateMacros({age,height,weight,activity,sex,goal,model,proteinPerKg,fatPerKg,recompMode});
}
const activityOptions=(selected=1.5)=>ACTIVITY_LEVELS.map(x=>'<option value="'+x.value+'" '+(Number(selected)===x.value?"selected":"")+'>'+escapeHTML(x.label)+'</option>').join("");
const recompOptions=(selected="deficit05")=>RECOMP_STRATEGIES.map(x=>'<option value="'+x.id+'" '+(x.id===selected?"selected":"")+'>'+escapeHTML(x.label)+'</option>').join("");
const scienceWarnings=r=>r.warnings.length?'<div class="efg-macro-warnings" role="note"><strong>Revisá antes de aprobar:</strong><ul>'+r.warnings.map(w=>'<li>'+escapeHTML(w)+'</li>').join("")+'</ul></div>':"";
const activityHint='<p class="pilot-hint efg-macro-guidance">El gasto depende del movimiento durante toda la jornada: caminatas, trabajo y entrenamiento. No selecciones actividad solo por cantidad de sesiones. Verificá tendencia de peso y rendimiento durante 2–3 semanas.</p>';
const recompHint='<p class="pilot-hint efg-macro-guidance">Solo se aplica a recomposición. Mantenimiento (0%), déficit suave (−5%) o moderado (−10%). Son estimaciones, no garantías de resultados.</p>';
const equationOptions=(model="mifflin")=>'<option value="mifflin" '+(model==="mifflin"?'selected':'')+'>Mifflin–St Jeor · población general</option><option value="tenhaaf" '+(model==="tenhaaf"?'selected':'')+'>Ten Haaf · perfil deportivo entrenado</option>';
const proteinOptions=(p="auto")=>[['auto','Automático · según objetivo'],['1.6','1,6 g/kg'],['1.8','1,8 g/kg'],['2.0','2,0 g/kg'],['2.2','2,2 g/kg']].map(([v,l])=>'<option value="'+v+'" '+(String(p)===v?'selected':'')+'>'+l+'</option>').join('');
const fatOptions=(f=".9")=>[['0.6','0,6 g/kg'],['0.8','0,8 g/kg'],['0.9','0,9 g/kg'],['1','1,0 g/kg']].map(([v,l])=>'<option value="'+v+'" '+(Number(f)===Number(v)?'selected':'')+'>'+l+'</option>').join('');
function macroPlayground(){
 const i=state.macroInputs||{sex:"male",age:30,height:170,weight:75,activity:1.5,model:"mifflin",protein:"auto",fat:.9,recompMode:"deficit05"};
 const fields=[["previewAge","Edad",i.age,18,90],["previewHeight","Altura (cm)",i.height,120,220],["previewWeight","Peso (kg)",i.weight,35,300]];
 const form='<div class="pilot-form"><div class="field-row">'+fields.map(q=>'<div class="field"><label for="'+q[0]+'">'+q[1]+'</label><input type="number" id="'+q[0]+'" min="'+q[3]+'" max="'+q[4]+'" step=".1" value="'+q[2]+'"></div>').join("")+'</div>'+
 '<div class="field-row"><div class="field"><label for="previewSex">Sexo utilizado por la ecuación</label><select id="previewSex"><option value="male" '+(i.sex==="male"?"selected":"")+'>Hombre</option><option value="female" '+(i.sex==="female"?"selected":"")+'>Mujer</option></select></div>'+
 '<div class="field"><label for="previewActivity">Actividad</label><select id="previewActivity">'+activityOptions(i.activity)+'</select></div></div>'+
 '<div class="field-row"><div class="field"><label for="previewModel">Ecuación de metabolismo en reposo</label><select id="previewModel">'+equationOptions(i.model)+'</select></div>'+
 '<div class="field"><label for="previewProtein">Proteína</label><select id="previewProtein">'+proteinOptions(i.protein)+'</select></div>'+
 '<div class="field"><label for="previewFat">Grasas</label><select id="previewFat">'+fatOptions(i.fat)+'</select></div></div>'+
 '<p class="pilot-hint">Mifflin–St Jeor contempla hombre o mujer. Ten Haaf es alternativa para deportistas entrenados, no una garantía de precisión. Proteína automática: 2,0 g/kg para recomposición y descenso, 1,8 g/kg para aumento muscular; grasas iniciales de 0,9 g/kg, ambas ajustables.</p>'+
 '<div class="field"><label for="previewRecompMode">Recomposición · estrategia energética</label><select id="previewRecompMode">'+recompOptions(i.recompMode||"deficit05")+'</select></div>'+activityHint+recompHint+
 '<button class="btn" data-act="previewMacros">Calcular los 3 objetivos</button></div>';
 let cards="";
 if(state.macroPreview){
  cards='<div class="macro-preview-grid">'+state.macroPreview.map(result=>'<div class="macro-preview"><b>'+({fat_loss:"Descenso de grasa",recomp:"Recomposición corporal",muscle_gain:"Aumento muscular"}[result.goal])+'</b><div class="macro-preview-kcal">'+num(result.kcal)+' kcal/día</div><small>Proteínas: '+num(result.protein)+' g<br>Hidratos: '+num(result.carbs)+' g<br>Grasas: '+num(result.fat)+' g<br>Fibra: '+num(result.fiber)+' g</small></div>').join("")+'</div>'+
   '<p class="pilot-hint">Ecuación: '+(state.macroPreview[0].model==="tenhaaf"?"Ten Haaf (deportistas)":"Mifflin–St Jeor")+' · Metabolismo en reposo '+num(state.macroPreview[0].rmr)+' kcal · Mantenimiento estimado '+num(state.macroPreview[0].maintenance)+' kcal. Proteínas '+num(state.macroPreview[0].proteinFactor,1)+' g/kg · Grasas '+num(state.macroPreview[0].fatFactor,1)+' g/kg. No modifica planes reales.</p>'+scienceWarnings(state.macroPreview[1]);
 }
 return '<section class="card" style="margin-bottom:18px"><div class="section-head"><h2>📐 Calculadora de macros</h2><span class="pilot-pill">Tres objetivos</span></div><p class="pilot-hint">Probala incluso sin alumnos. Compará descenso de grasa, recomposición y aumento muscular. Para asignar un plan real, primero abrí la ficha de un alumno que haya autorizado el seguimiento.</p>'+form+cards+'</section>';
}
function coachPreferredNames(){try{return JSON.parse(localStorage.getItem("efg-coach-names-"+(state.session?.user?.id||"local"))||"{}")}catch{return {}}}
function coachDisplayName(p){return coachPreferredNames()[p.user_id]||p.nickname||"Alumno"}
function coachAvatarLetters(p){return String(coachDisplayName(p)).trim().split(/\s+/).slice(0,2).map(w=>w.charAt(0)).join("").toUpperCase()||"?"}

function coachHomeView(){
 const test=state.profile.role==="admin"&&state.org?.is_test;
 const roster=(state.roster||[]).filter(p=>p.active);
 const pending=(test?state.testInvitations:state.invitations||[]).filter(i=>i.role==="student"&&!i.claimed_by&&!i.revoked_at);
 const needsConsent=roster.filter(p=>coachRosterConsent[p.user_id]!==true);
 const testOrgSeats=Number(state.org?.seat_limit)||0;
 const availableSeats=Math.max(0,testOrgSeats-roster.length-pending.length);
 return rootText(test?"MI LABORATORIO DE COACH":"HOLA, "+escapeHTML(state.profile.nickname),"Ingresos nuevos, planes por preparar y seguimiento: cada cosa en su lugar.")+
 '<section class="efg-coach-banner"><div><span class="eyebrow">EFG · ESPACIO DEL ENTRENADOR</span><h2>El progreso empieza con el seguimiento.</h2><p>Tu panel de trabajo, sin formularios interminables.</p></div><span aria-hidden="true" class="efg-coach-banner-icon">✦</span></section>'+
 '<div class="efg-coach-stat-grid"><div><strong>'+roster.length+'</strong><span>Alumnos activos</span></div><div><strong>'+needsConsent.length+'</strong><span>Sin autorización</span></div><div><strong>'+pending.length+'</strong><span>Invitaciones</span></div></div>'+
 '<p class="efg-seats-caption">'+availableSeats+' de '+testOrgSeats+' cupos disponibles · Incluye invitaciones pendientes</p>'+
 '<section class="efg-menu-grid efg-coach-tiles">'+[
  ["coachIntake","📋","Nuevos ingresos","peach"],["coachStudents","👥","Mis alumnos","mint"],["reports","📈","Informes","blue"],["notifications","🔔","Notificaciones","peach"],["messages","💬","Mensajes","mint"],["coachStudents","🎯","Objetivos","peach"],["coachTools","🧮","Herramientas","lilac"]
 ].map(x=>'<button type="button" class="efg-menu-card efg-menu-'+x[3]+'" data-tab="'+x[0]+'"><span class="efg-menu-emoji" aria-hidden="true">'+efgMenuIcon(x[0])+'</span><strong>'+x[2]+'</strong><span class="efg-menu-arrow">↗</span></button>').join("")+'</section>'+
 '<section class="card efg-content-card"><div class="section-head"><h2>Mis alumnos</h2><button type="button" class="btn small light" data-tab="coachStudents">Ver todos</button></div>'+
 (roster.length?roster.slice(0,5).map(p=>'<div class="efg-student-compact"><span class="coach-roster-avatar">'+escapeHTML(coachAvatarLetters(p))+'</span><div><strong>'+escapeHTML(coachDisplayName(p))+'</strong><small>'+(coachRosterConsent[p.user_id]===true?'Seguimiento autorizado':'Autorización pendiente')+'</small></div><button class="btn small light" data-student="'+p.user_id+'">Abrir</button></div>').join(""):'<div class="empty">Todavía no hay alumnos activos. Podés invitarlos desde Mis alumnos.</div>')+
 '</section>';
}
function coachIntakeView(){
 const canView=state.profile?.role==="coach"||(state.profile?.role==="admin"&&state.org?.is_test);
 if(!canView)return rootText("Nuevos ingresos","Este espacio corresponde a entrenadores habilitados.");
 const active=(state.roster||[]).filter(p=>p.active);
 const pending=(state.profile.role==="admin"&&state.org?.is_test?state.testInvitations:state.invitations||[])
  .filter(i=>i.role==="student"&&!i.claimed_by&&!i.revoked_at);
 const waitingConsent=active.filter(p=>coachRosterConsent[p.user_id]!==true);
 const submitted=active.filter(p=>coachRosterConsent[p.user_id]===true&&state.coachIntakeForms[p.user_id]);
 const activated=active.filter(p=>coachRosterConsent[p.user_id]===true&&state.coachIntakeAccess[p.user_id]?.status==="published");
 const waitingPlan=active.filter(p=>coachRosterConsent[p.user_id]===true&&state.coachIntakeVerified&&!state.coachIntakeGoals[p.user_id]&&!activated.some(x=>x.user_id===p.user_id));
 const existingGoal=active.filter(p=>coachRosterConsent[p.user_id]===true&&state.coachIntakeVerified&&state.coachIntakeGoals[p.user_id]&&!activated.some(x=>x.user_id===p.user_id));
 const remaining=active.filter(p=>coachRosterConsent[p.user_id]===true&&!state.coachIntakeVerified);
 const invitationCard=i=>'<div class="coach-intake-person"><span class="coach-roster-avatar" aria-hidden="true">✉</span><div><strong>'+escapeHTML(i.nickname)+'</strong><small>Invitación enviada · todavía no ingresó</small></div><span class="efg-intake-status">Pendiente</span></div>';
 const profileCard=(p,stage)=>'<div class="coach-intake-person"><span class="coach-roster-avatar" aria-hidden="true">'+escapeHTML(coachAvatarLetters(p))+'</span><div><strong>'+escapeHTML(coachDisplayName(p))+'</strong><small>'+stage+'</small></div><div class="coach-intake-actions"><button type="button" class="btn small light" data-student="'+p.user_id+'">Ver alumno</button><button type="button" class="btn small ghost" data-intake-message="'+p.user_id+'">Mensaje</button></div></div>';
 const section=(title,description,entries,renderer,empty)=>'<section class="card coach-intake-group"><div class="section-head"><h2>'+title+'</h2><span class="pilot-pill">'+entries.length+'</span></div><p class="pilot-hint">'+description+'</p>'+(entries.length?entries.map(renderer).join(""):'<p class="efg-intake-empty">'+empty+'</p>')+'</section>';
 return rootText("NUEVOS INGRESOS","De la invitación a la planificación: identificá rápidamente qué necesita cada alumno.")+
 '<section class="coach-intake-intro"><div class="eyebrow">EFG NUTRITION · CON COACH</div><h2>Bienvenidas, fichas y planes en un solo lugar.</h2><p>Esta primera vista organiza alumnos e invitaciones existentes. La ficha compartida y la publicación formal se mostrarán al activar el backend seguro. Hasta entonces, solo se muestran estados realmente verificables.</p></section>'+
 '<div class="coach-intake-summary">'+
  '<div><strong>'+pending.length+'</strong><span>Invitaciones pendientes</span></div>'+
  '<div><strong>'+waitingConsent.length+'</strong><span>Esperando autorización</span></div>'+
  '<div><strong>'+(state.coachIntakeVerified?waitingPlan.length:"—")+'</strong><span>Sin objetivo configurado</span></div>'+
  '<div><strong>'+(state.coachIntakeVerified?existingGoal.length:"—")+'</strong><span>Con objetivo existente</span></div>'+
 '</div>'+
 '<section class="card coach-intake-steps"><h2>El camino de un nuevo alumno</h2><ol><li><strong>Ingreso y autorización</strong><small>El alumno acepta su acceso y sus permisos de privacidad.</small></li><li><strong>Ficha inicial</strong><small>Completa sus datos voluntarios y decide qué compartir con el coach. Próxima implementación.</small></li><li><strong>Preparación del plan</strong><small>El entrenador revisa la información y prepara sus objetivos y su propuesta.</small></li><li><strong>Publicación y activación</strong><small>El plan se publica expresamente y se habilitan las herramientas nutricionales. Próxima implementación.</small></li></ol></section>'+
 section("01 · Invitaciones por aceptar","Todavía no ingresaron a EFG Nutrition.",pending,invitationCard,"No hay invitaciones pendientes.")+
 section("02 · Esperando autorización","El coach todavía no cuenta con permiso para consultar el seguimiento del alumno.",waitingConsent,p=>profileCard(p,"Acceso confirmado · autorización pendiente"),"Todos los alumnos activos autorizaron o todavía no hay alumnos.")+
 section("03 · Fichas recibidas","La ficha llega cuando el alumno decide compartirla y autoriza el seguimiento.",submitted,p=>profileCard(p,"Ficha compartida voluntariamente · lista para revisar"),"Todavía no hay fichas compartidas.")+
 section("04 · Plan por preparar","Alumnos autorizados que todavía no tienen un objetivo configurado.",waitingPlan,p=>profileCard(p,"Seguimiento autorizado · sin objetivo cargado"),"No hay alumnos en esta etapa.")+
 section("05 · Objetivos existentes","Una meta guardada no habilita por sí sola la app; falta publicar el plan.",existingGoal,p=>profileCard(p,"Objetivo configurado · publicación aún no verificable"),"No se encontraron objetivos en este grupo.")+
 section("06 · Plan publicado","Estado confirmado por el servidor; el alumno tiene las funciones habilitadas.",activated,p=>profileCard(p,"Plan publicado · acceso completo"),"Todavía no hay planes publicados en el nuevo circuito.")+
 (remaining.length?'<section class="card coach-intake-group"><h2>Estado temporalmente no disponible</h2><p class="pilot-hint">No fue posible comprobar algunos objetivos. No se muestran estados inventados.</p>'+remaining.map(p=>profileCard(p,"Estado del objetivo sin verificar")).join("")+'</section>':"")+
 '<section class="card coach-intake-privacy"><h2>Privacidad y próximos pasos</h2><p>Las futuras fichas deben ser compartidas voluntariamente. Sin consentimiento, el entrenador no debe acceder a datos sensibles. El bloqueo nutricional de alumnos nuevos también deberá aplicarse en el servidor, nunca únicamente ocultando botones.</p><button class="btn light" data-tab="coachStudents">Administrar mis alumnos e invitaciones</button></section>';
}
function coachToolsView(){
 return rootText("Herramientas del coach","Calculá propuestas de objetivos y revisalas antes de asignarlas.")+macroPlayground()+versionCheckCard();
}
function coachView(){
 const org=state.org;
 const isTest=state.profile.role==="admin"&&!!org?.is_test;
 const roster=state.roster||[];
 const current=state.selectedStudent&&roster.find(p=>p.user_id===state.selectedStudent);
 const pending=(isTest?state.testInvitations:state.invitations).filter(i=>i.role==="student"&&!i.claimed_by&&!i.revoked_at);
 const seats=Number(org?.seat_limit)||0,activeRoster=roster.filter(p=>p.active),used=activeRoster.length+pending.length,available=Math.max(0,seats-used),commercialReady=isTest||["active","grace"].includes(org?.status);
 return rootText("Mis alumnos","Buscá alumnos, administrá autorizaciones y abrí sus fichas individuales.")+
 ' <div class="efg-roster-summary"><span class="pilot-pill">'+activeRoster.length+' alumnos activos</span><button type="button" class="btn small light" data-tab="coach">Volver al inicio</button></div>'+
 '<section class="card efg-seats-panel" aria-label="Cupos disponibles"><div class="section-head"><h2>CUPO DE ALUMNOS</h2>'+(isTest?'<button type="button" class="btn small light" data-testseats="1">Modificar cupos de prueba</button>':'')+'</div><div class="efg-seats-grid"><div><strong>'+seats+'</strong><span>Habilitados</span></div><div><strong>'+used+'</strong><span>Ocupados</span></div><div><strong>'+available+'</strong><span>Disponibles</span></div></div><p class="pilot-hint">Los cupos ocupados incluyen alumnos activos e invitaciones pendientes. Las bajas temporales no consumen cupo.</p></section>'+(!commercialReady?'<div class="pilot-alert" role="status">Tu licencia EFG está pendiente de activación por el administrador. Podés usar MI DÍA, pero todavía no invitar alumnos.</div>':'')+''+
 (isTest?'<div class="pilot-notice" style="margin-bottom:18px"><strong>🧪 Laboratorio de EFG — '+seats+' cupos gratuitos de prueba</strong><small>Conservás tu cuenta de administrador. Solo ves datos de alumnos vinculados a este espacio que hayan dado consentimiento. No se generan cobros automáticos.</small></div>':'')+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card" id="coachRosterSection"><div class="coach-roster-heading"><div><div class="eyebrow">PERSONAS PRIMERO</div><h2>Mis alumnos</h2><p class="pilot-hint">Avatares individuales. Las fotografías se mostrarán solamente cuando el alumno las autorice.</p></div><span class="coach-roster-total">'+activeRoster.length+' activos</span></div>'+
 (roster.length?'<div class="field"><label for="coachRosterSearch">Buscar alumno</label><input id="coachRosterSearch" type="search" autocomplete="off" placeholder="Nombre o correo…"><small id="coachRosterCount" class="pilot-hint">'+roster.length+' alumnos en la lista</small></div>':'')+
 (roster.length?'<div class="pilot-toolbar" style="margin:10px 0"><button class="btn small light" data-rosterfilter="all">Todos</button><button class="btn small ghost" data-rosterfilter="active">Activos</button><button class="btn small ghost" data-rosterfilter="inactive">Inactivos</button><button class="btn small ghost" data-rosterfilter="consent">Sin autorización</button></div><p class="pilot-hint">Los indicadores reflejan el estado administrativo y los permisos; no son diagnósticos nutricionales.</p>':'')+
 (roster.length?roster.map(p=>'<div class="pilot-record" data-rosteractive="'+(p.active?'yes':'no')+'" data-rosterconsent="'+(coachRosterConsent[p.user_id]===true?'yes':'no')+'" data-rostername="'+escapeHTML((p.nickname+" "+(p.email||"")).toLocaleLowerCase("es-AR"))+'"><div class="between"><div class="coach-roster-person"><span class="coach-roster-avatar" aria-hidden="true">'+escapeHTML(coachAvatarLetters(p))+'</span><div><strong>'+escapeHTML(coachDisplayName(p))+'</strong><small>'+((coachDisplayName(p)!==p.nickname)?escapeHTML(p.nickname)+' · ':'')+safePhoneEmail(p.email)+' · '+(p.active?'Activo':'Baja temporal')+'</small></div></div><div class="pilot-toolbar">'+(p.active?'<button class="btn small light" data-student="'+p.user_id+'">Ver seguimiento</button>':'')+'<button class="btn small ghost" data-coachname="'+p.user_id+'">Nombre preferido</button>'+'<button class="btn small ghost" data-studentstatus="'+p.user_id+'">'+(p.active?'Dar de baja':'Reactivar')+'</button></div></div></div>').join(""):'<div class="empty">Aún no hay alumnos. Podés probar la calculadora y después invitar a alguien.</div>')+
 (pending.length?'<div class="divider"></div><h3>Invitaciones pendientes de ingreso</h3>'+pending.map(i=>'<div class="pilot-record"><strong>'+escapeHTML(i.nickname)+'</strong><small>'+safePhoneEmail(i.email)+'</small><button class="btn small ghost" style="margin-top:8px" data-deleteinvite="'+i.id+'">Eliminar correo</button></div>').join(""):'')+'</div>'+
 '<div class="card"><h2>Habilitar un alumno'+(isTest?' de prueba':'')+'</h2><p class="pilot-hint">Elegí un usuario y correo reales. Después compartí el mismo enlace privado de EFG Nutrition con esa persona.</p>'+
 '<div class="pilot-form"><div class="field"><label>Nombre o usuario del alumno</label><input id="studentName" maxlength="70" placeholder="AlumnoPrueba01"></div><div class="field"><label>Correo electrónico del alumno</label><input id="studentEmail" type="email" placeholder="alumno@email.com"></div>'+
 '<button class="btn block" data-act="inviteStudent" '+(used>=seats||!commercialReady?'disabled':'')+'>Habilitar alumno</button><button class="btn light" data-act="copyStudentLink">Copiar enlace para enviar</button></div><p class="pilot-hint">El alumno recibirá el código o enlace de ingreso en su propio correo y deberá autorizarte a consultar sus registros.</p></div>'+
 (isTest?'<div class="pilot-notice"><strong>Sin pagos en modo prueba</strong><small>Estos cupos no se facturan. Tu administración comercial continúa en la pestaña Administración.</small></div>':
 '<div class="card"><h2>Alias para pagos de alumnos</h2><p class="pilot-hint">'+(org?.payment_alias?'Actual: '+escapeHTML(org.payment_alias):'Todavía no configuraste tu alias bancario.')+'</p><div class="pilot-form"><div class="field"><label>Alias bancario</label><input id="coachAlias" value="'+escapeHTML(org?.payment_alias||"")+'" maxlength="100"></div><button class="btn" data-act="coachAlias">Guardar alias</button></div></div>')+
 '</div><div class="pilot-stack"><div id="studentFollowPanel" class="coach-selected-student">'+(current?studentDetailView(current,state.consent):'<div class="card"><h2>Seguimiento de un alumno</h2><div class="empty">Seleccioná un alumno que haya confirmado su cuenta y autorizado el acceso. Ahí podrás calcular sus objetivos de descenso, recomposición o aumento muscular y revisar los registros.</div></div>')+'</div></div></div>';
}
function coachTrendChart(days,key,label,unit,goalValue=null){
 const logs=[...(days||[])].filter(d=>d.hasData && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Number.isFinite(Number(d[key]))).sort((a,b)=>a.date.localeCompare(b.date)).slice(-14);
 if(!logs.length)return '<div class="nutrition-trend"><h4>'+escapeHTML(label)+'</h4><div class="empty">No hay registros para graficar.</div></div>';
 const values=logs.map(d=>Number(d[key]));
 const lo=Math.min(...values),hi=Math.max(...values),span=Math.max(key==="k"?120:8,hi-lo);
 const pad=Math.max(key==="k"?35:3,span*.18);
 const min=Math.max(0,lo-pad),max=hi+pad;
 const goal=Number(goalValue),validGoal=goalValue!==null&&goalValue!==undefined&&Number.isFinite(goal)&&goal>0;
 const showGoal=validGoal&&goal>=min&&goal<=max;
 const W=660,H=228,L=47,R=19,T=22,B=45;
 const dayUtc=d=>Date.parse(d+"T12:00:00Z")/86400000;
 const firstDay=dayUtc(logs[0].date),lastDay=dayUtc(logs[logs.length-1].date);
 const range=Math.max(1,lastDay-firstDay);
 const xp=d=>L+(dayUtc(d.date)-firstDay)/range*(W-L-R);
 const yp=n=>T+(max-n)/(max-min)*(H-T-B);
 const yTicks=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
 const grid=yTicks.map(v=>'<line class="nutrition-line-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+yp(v).toFixed(2)+'" y2="'+yp(v).toFixed(2)+'"/><text class="nutrition-line-axis" x="'+(L-7)+'" y="'+(yp(v)+4).toFixed(2)+'" text-anchor="end">'+num(v,key==="k"?0:1)+'</text>').join("");
 const lines=logs.slice(1).map((d,i)=>{const prev=logs[i],gap=dayUtc(d.date)-dayUtc(prev.date);
   return gap===1?'<line class="nutrition-line-segment kind-'+key+'" x1="'+xp(prev).toFixed(2)+'" y1="'+yp(Number(prev[key])).toFixed(2)+'" x2="'+xp(d).toFixed(2)+'" y2="'+yp(Number(d[key])).toFixed(2)+'"/>':'';
 }).join("");
 const targetLine=showGoal?'<line class="nutrition-line-goal" x1="'+L+'" x2="'+(W-R)+'" y1="'+yp(goal).toFixed(2)+'" y2="'+yp(goal).toFixed(2)+'"><title>Objetivo: '+num(goal,key==="k"?0:1)+' '+unit+'</title></line>':'';
 const circles=logs.map(d=>'<circle class="nutrition-line-point '+(d.closed?'closed':'partial')+' kind-'+key+'" cx="'+xp(d).toFixed(2)+'" cy="'+yp(Number(d[key])).toFixed(2)+'" r="5"><title>'+escapeHTML(d.date.split("-").reverse().join("/")+' · '+num(Number(d[key]),1)+' '+unit+' · '+(d.closed?'Día cerrado':'Registro parcial'))+'</title></circle>').join("");
 const every=Math.max(1,Math.ceil(logs.length/6));
 const xLabels=logs.map((d,i)=>(i!==0&&i!==logs.length-1&&i%every!==0)?'':'<text class="nutrition-line-axis" x="'+xp(d).toFixed(2)+'" y="'+(H-12)+'" text-anchor="middle">'+escapeHTML(d.date.slice(8)+"/"+d.date.slice(5,7))+'</text>').join("");
 return '<div class="nutrition-trend"><div class="nutrition-trend-heading"><h4>'+escapeHTML(label)+'</h4><span>'+num(values[values.length-1],key==="k"?0:1)+' '+unit+' · último registro</span></div>'+
 '<div class="nutrition-line-scroll"><svg class="nutrition-line-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Evolución diaria de '+escapeHTML(label)+' de '+logs.length+' días con registros">'+grid+targetLine+lines+circles+xLabels+'</svg></div>'+
 '<p class="pilot-hint">● Punto lleno: día cerrado · ○ Punto vacío: día parcial.'+
 (validGoal?(showGoal?' Línea punteada: objetivo '+num(goal,key==="k"?0:1)+' '+unit+'.':' Objetivo: '+num(goal,key==="k"?0:1)+' '+unit+' (fuera de la escala).'):'')+
 ' Escala ajustada para ver cambios pequeños; no se unen días faltantes.</p></div>';
}
function weeklyAdherenceSummary(){
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
 const cutoff=Date.parse(today()+"T12:00:00Z")-6*86400000;
 const days=(report.days||[]).filter(d=>d.hasData&&Date.parse(d.date+"T12:00:00Z")>=cutoff);
 const complete=days.filter(d=>d.closed);
 const metrics=weeklyNumbers(days,state.coachGoals,state.coachWeights);
 const goal=state.coachGoals[0];
 const valid=days.filter(d=>d.hasData&&Number.isFinite(Number(d.p)));
 const proteinWithin=metrics.proteinDaysCompared?metrics.proteinDaysOnTarget:null;
 return '<section class="card"><h3>📅 Adherencia de los últimos 7 días</h3>'+
 '<div class="nutrition-report-kpis"><div><small>Días con registros</small><strong>'+days.length+'/7</strong></div>'+
 '<div><small>Días completos</small><strong>'+complete.length+'</strong></div>'+
 '<div><small>Proteína ≥90% del objetivo</small><strong>'+(proteinWithin===null?'Sin objetivo':proteinWithin+'/'+metrics.proteinDaysCompared)+'</strong></div></div>'+
 '<p class="pilot-hint">Se mide la cobertura del registro, no la disciplina de la persona. Los días sin información no se interpretan como incumplimiento ni consumo cero. La meta proteica se compara con el objetivo aprobado vigente en cada fecha registrada.</p></section>';
}
function weeklyDraftText(){
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
 const window=weeklyReportWindow();
 const week=(report.days||[]).filter(d=>d.hasData&&d.date>=window.from&&d.date<=window.to).sort((a,b)=>a.date.localeCompare(b.date));
 if(!week.length)return "Semana del "+window.from+" al "+window.to+": sin registros alimentarios suficientes. No corresponde emitir conclusiones.";
 const avg=k=>week.reduce((v,d)=>v+Number(d[k]||0),0)/week.length;
 const goal=state.coachGoals[0]||null;
 const notes=["EFG Nutrition Pro · Borrador semanal para revisión del entrenador","Período: "+window.from+" a "+window.to+" (se presenta el viernes "+window.friday+").","Registros alimentarios: "+week.length+"/7 días. Los días ausentes NO se contabilizan como cero.","Promedio de los días con registros: "+num(avg("k"))+" kcal, P "+num(avg("p"),1)+" g, HC "+num(avg("c"),1)+" g, G "+num(avg("f"),1)+" g."];
 if(goal?.protein_g>0)notes.push("Proteínas: "+num(100*avg("p")/goal.protein_g)+"% de la referencia actual. Si hubo ajustes de objetivos esta semana, verificar el histórico antes de interpretar.");
 if(goal?.kcal>0)notes.push("Energía: "+num(100*avg("k")/goal.kcal)+"% de la referencia actual. Los registros incompletos pueden subestimar el consumo.");
 const weights=(state.coachWeights||[]).filter(w=>Number(w.kg)>0).sort((a,b)=>String(b.measured_on).localeCompare(String(a.measured_on)));
 if(weights.length>=2)notes.push("Peso: cambio entre los dos últimos pesajes disponibles "+num(Number(weights[0].kg)-Number(weights[1].kg),2)+" kg. No equivale necesariamente a cambios de grasa ni de masa magra.");
 else notes.push("Peso: faltan al menos dos mediciones para comparar una tendencia.");
 const comments=week.filter(d=>d.comment).map(d=>d.date+": "+d.comment).slice(-3);
 if(comments.length)notes.push("Comentarios del alumno para revisar: "+comments.join(" | "));
 notes.push("Propuesta para conversar: revisar regularidad de registros y elegir uno o dos ajustes de hábitos sostenibles, según preferencias y objetivos aprobados.");
 notes.push("BORRADOR SIN ENVÍO. El entrenador debe corregir, aprobar y compartirlo por el canal que acuerde con el alumno.");
 return notes.join("\\n\\n");
}
function weeklyCoachDraft(){
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
 const window=weeklyReportWindow();
 const week=(report.days||[]).filter(d=>d.hasData&&d.date>=window.from&&d.date<=window.to);
 return '<section class="card" id="coachReportWeek"><h2>🌱 Informe del viernes '+window.friday+'</h2><p class="pilot-hint">Período evaluado: '+window.from+' a '+window.to+'. El borrador se construye con registros reales guardados, y debe ser revisado antes de compartir.</p>'+
 '<p class="pilot-hint">Lectura semanal de registros reales. Los datos faltantes no se interpretan como incumplimiento. Revisá las conclusiones y sus motivos antes de compartir el informe con el alumno. Esta versión todavía no utiliza IA generativa.</p>'+
 '<div class="nutrition-report-kpis"><div><small>Días registrados</small><strong>'+week.length+'/7</strong></div>'+
 '<div><small>Proteína media</small><strong>'+(week.length?num(week.reduce((v,d)=>v+Number(d.p||0),0)/week.length,1)+' g':'—')+'</strong></div></div>'+
 '<div class="pilot-notice"><strong>🧬 Entender para mejorar</strong><small>Proteínas: se analiza la cercanía al objetivo del coach, no la calidad de la persona. Peso: un cambio aislado puede incluir agua y glucógeno. Días sin registro: faltan datos, no significa que se haya comido menos. Las recomendaciones deben considerar objetivos, evolución y comentarios del alumno.</small></div>'+
 '<div class="field"><label for="weeklyCoachDraftText">Borrador editable del entrenador</label><textarea id="weeklyCoachDraftText" rows="13" maxlength="8000">'+escapeHTML(weeklyDraftText())+'</textarea></div>'+
 '<button type="button" class="btn small light" data-act="copyWeeklyDraft">Copiar texto revisado</button><button type="button" class="btn small" data-act="publishWeeklyReport">Aprobar y compartir con alumno</button>'+
 '<p class="pilot-hint">La copia no representa aprobación ni entrega. No emitir recomendaciones clínicas automáticas.</p></section>';
}
function coachReportsView(){
 if(!(state.profile?.role==="coach"||(state.profile?.role==="admin"&&state.org?.is_test)))return rootText("Informes","Disponible solo para coaches autorizados.");
 const roster=(state.roster||[]).filter(p=>p.active);
 const p=roster.find(p=>p.user_id===state.selectedStudent);
 let out=rootText("Informes diarios","Consultá automáticamente el día anterior y la evolución de tus alumnos, sin correos.");
 if(!roster.length)return out+'<section class="card"><div class="empty">No hay alumnos activos.</div></section>';
 out+='<section class="card"><div class="eyebrow">SEGUIMIENTO PERSONALIZADO</div><h2>Seleccionar alumno</h2><p class="pilot-hint">Consultá registros e informes individuales.</p><div class="coach-report-students">'+roster.map(r=>'<button class="btn '+(p?.user_id===r.user_id?'':'light')+'" data-reportstudent="'+r.user_id+'">'+escapeHTML(r.nickname)+'</button>').join("")+'</div></section>';
 if(!p)return out+'<section class="card"><p class="pilot-hint">Seleccioná un alumno para consultar sus reportes.</p></section>';
 if(!state.consent?.accepted)return out+'<section class="card"><h2>'+escapeHTML(p.nickname)+'</h2><div class="pilot-alert">Este alumno no autorizó el seguimiento de sus registros.</div></section>';
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
 const prev=report.days.find(d=>d.date===yesterday());
 const status=!prev||!prev.hasData?'Sin registros':prev.closed?'Cerrado':'Parcial';
 out+='<section class="card"><h2>Informe de ayer · '+yesterday().split("-").reverse().join("/")+'</h2><div class="pilot-notice"><strong>'+escapeHTML(status)+'</strong><small>'+(prev?.hasData?num(prev.k)+' kcal · Proteínas '+num(prev.p,1)+' g · HC '+num(prev.c,1)+' g · Grasas '+num(prev.f,1)+' g':'Sin consumos registrados; no se considera cero calorías')+'</small></div>'+
 (prev?.comment?'<div class="coach-comment-detail"><strong>📝 Comentario del alumno de ayer</strong><p>'+escapeHTML(prev.comment)+'</p></div>':'')+
 '<p class="pilot-hint">El informe utiliza lo guardado hasta este momento. Un día puede quedar parcial si el alumno no lo cerró.</p></section>';
 out+=weeklyAdherenceSummary();
 out+=weeklyCoachDraft();
 out+='<section class="card"><h2>📈 Evolución nutricional</h2><p class="pilot-hint">Últimos 14 días disponibles, sin completar con ceros los días faltantes.</p><div class="nutrition-trend-grid">'+coachTrendChart(report.days,"k","Calorías","kcal",state.coachGoals[0]?.kcal)+coachTrendChart(report.days,"p","Proteínas","g",state.coachGoals[0]?.protein_g)+coachTrendChart(report.days,"c","Carbohidratos","g",state.coachGoals[0]?.carb_g)+coachTrendChart(report.days,"f","Grasas","g",state.coachGoals[0]?.fat_g)+'</div></section>';
 out+='<section class="card"><h2>⚖️ Evolución del peso corporal</h2><p class="pilot-hint">Cada registro incluye su fecha y hora. Para comparar, se recomienda un pesaje semanal en condiciones similares.</p>'+weightTrendChart(state.coachWeights)+'</section>';
 out+='<section class="card">'+coachDailyReport(p)+'</section>';
 return out;
}
function coachDailyReport(p){
 const latest=state.coachGoals[0]||null;
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),latest);
 const selected=report.days.find(x=>x.date===state.reportDate)||report.days.find(x=>x.date===yesterday())||report.today||report.days[0]||null;
 const dateLabel=(d)=>d.split("-").reverse().join("/");
 let out='<section class="nutrition-daily-report" id="coachDailyReport"><div class="section-head"><h3>📊 Informe nutricional diario</h3><button type="button" class="btn small light efg-report-refresh" data-act="refreshCoachReport">Actualizar</button></div>'+
 '<p class="pilot-hint">Se actualiza con los registros guardados y se consulta únicamente dentro de la app.</p>';
 if(!report.daysRecorded)return out+'<div class="empty">Sin consumos registrados. El informe aparecerá cuando el alumno cargue su primera comida.</div></section>';
 const haveClosed=report.daysClosed>0;
 out+='<div class="nutrition-report-kpis">'+
 '<div><small>Promedio de días registrados</small><strong>'+num(report.average.k)+' kcal</strong><span>'+report.daysRecorded+' día(s) con consumo</span></div>'+
 '<div><small>Días cerrados</small><strong>'+report.daysClosed+'</strong><span>De '+report.daysRecorded+' días registrados</span></div>'+
 '<div><small>Promedio de días cerrados</small><strong>'+(haveClosed?num(report.finishedAverage.k)+' kcal':'—')+'</strong><span>'+(haveClosed?'Cierres confirmados':'Aún sin días cerrados')+'</span></div></div>'+
 '<p class="pilot-hint">Los días sin registros no se cuentan como cero. Los días parciales pueden cambiar. El cierre lo declara el alumno.</p>'+
 '<div class="field" style="margin:12px 0"><label for="coachReportDate">Elegí la fecha del informe</label><select id="coachReportDate">'+report.days.map(d=>'<option value="'+escapeHTML(d.date)+'" '+(d.date===selected?.date?'selected':'')+'>'+dateLabel(d.date)+' · '+(d.closed?'Cerrado':'Parcial')+'</option>').join("")+'</select></div>';
 if(selected){
  const applicableGoal=goalForDate(state.coachGoals,selected.date);
  const diff=applicableGoal?.kcal?Math.round(selected.k-applicableGoal.kcal):null;
  out+='<div class="nutrition-day-sheet"><div class="between"><h4>'+dateLabel(selected.date)+'</h4><span class="pilot-pill">'+(selected.closed?'Día cerrado':'Registro parcial')+'</span></div>'+
   '<div class="nutrition-day-energy"><strong>'+num(selected.k)+' kcal</strong>'+(applicableGoal?.kcal?'<small>Objetivo de esa fecha '+num(applicableGoal.kcal)+' kcal · '+(diff>=0?'+':'')+num(diff)+' kcal</small>':'<small>Sin objetivo aprobado para esa fecha</small>')+'</div>'+
   '<div class="nutrition-macro-grid"><span>P <b>'+num(selected.p,1)+' g</b></span><span>HC <b>'+num(selected.c,1)+' g</b></span><span>G <b>'+num(selected.f,1)+' g</b></span><span>Fibra <b>'+num(selected.fi,1)+' g</b></span></div>'+
   '<div class="nutrition-meal-table">'+selected.meals.filter(m=>m.foods>0&&!m.omitted).map(m=>'<div><span>'+escapeHTML(m.label)+'</span><b>'+num(m.kcal)+' kcal</b></div>').join("")+'</div>'+
   '<small>'+selected.mealCount+' comidas registradas'+(selected.sportCount?' · '+selected.sportCount+' suplementos o bebidas':'')+'. '+(selected.closed?'Marcado como terminado por el alumno.':'Puede faltar carga de alimentos.')+'</small>'+
   (selected.supplements?.length?'<div class="coach-supplements-detail"><strong>💊 Suplementos registrados</strong>'+selected.supplements.map(s=>'<div class="pilot-macro"><span>'+escapeHTML(s.name)+'</span><b>'+num(s.qty,1)+' '+escapeHTML(s.unit)+'</b></div>').join("")+'</div>':'')+
   '<div class="coach-comment-detail"><strong>📝 Comentario del alumno</strong><p>'+(selected.comment?escapeHTML(selected.comment):'<span class="pilot-hint">No dejó un comentario para este día.</span>')+'</p></div></div>'+
   '<button class="btn light" data-act="copyDailyReport" style="margin-top:12px">Copiar informe del día</button>';
 }
 out+='<h4 style="margin-top:18px">Historial de hasta 14 días</h4>'+
 '<div class="pilot-table-wrap"><table class="pilot-table"><thead><tr><th>Día</th><th>Kcal</th><th>Proteínas</th><th>Estado</th></tr></thead><tbody>'+
 report.days.map(d=>'<tr><td>'+dateLabel(d.date)+'</td><td>'+(d.hasData?num(d.k):'—')+'</td><td>'+(d.hasData?num(d.p,1)+' g':'—')+'</td><td>'+(d.closed?'Cerrado':d.hasData?'Parcial':'Sin comidas')+'</td></tr>').join("")+'</tbody></table></div></section>';
 return out;
}
function revisionModeChoices(){
 return '<option value="proportional">Proporcional · bajar o subir todos los macros</option>'+
 '<option value="protect_protein">Conservar proteína y grasa · ajustar carbohidratos</option>'+
 '<option value="protect_protein_balanced">Conservar proteína · repartir ajuste entre hidratos y grasas</option>';
}
function showGoalComparison(base,goal){
 const delta=goal.kcal-base.kcal;
 return '<strong>'+num(base.kcal)+' → '+num(goal.kcal)+' kcal/día ('+(delta>=0?'+':'')+num(delta)+' kcal)</strong>'+
 '<small>Proteínas '+num(base.protein_g)+' → <b>'+num(goal.protein_g)+' g</b> · Hidratos '+num(base.carb_g)+' → <b>'+num(goal.carb_g)+' g</b> · Grasas '+num(base.fat_g)+' → <b>'+num(goal.fat_g)+' g</b> · Fibra orientativa '+num(goal.fiber_g)+' g.</small>'+
 '<small>Los gramos se redondean; calculá los objetivos según adherencia, actividad y evolución, no como una prescripción automática.</small>';
}
function goalRevisionSection(latest){
 if(!latest)return "";
 const goals=state.coachGoals||[];
 const history='<details style="margin-top:15px"><summary>Historial de objetivos ('+goals.length+')</summary>'+
 goals.map(g=>'<div class="pilot-macro"><span>Desde '+escapeHTML(String(g.start_on||"").split("-").reverse().join("/"))+'</span><b>'+num(g.kcal)+' kcal · P '+num(g.protein_g)+' / HC '+num(g.carb_g)+' / G '+num(g.fat_g)+' g</b></div>').join("")+
 '<p class="pilot-hint">Los objetivos anteriores y registros alimentarios no se borran.</p></details>';
 return '<div class="divider"></div><h3>✏️ Revisar objetivo durante el plan</h3>'+
 '<p class="pilot-hint">Podés revisar el objetivo en cualquier momento, incluso al día siguiente o varias veces el mismo día, sin plazo mínimo. Si el alumno refiere poca energía, hambre, fatiga o dificultades de adaptación, evaluá sus registros, actividad y evolución y ajustá las calorías y los macros. El cambio comienza al aprobarlo; los planes anteriores quedan guardados.</p>'+
 '<div class="pilot-form"><div class="field-row"><div class="field"><label for="reviseGoalKcal">Nuevo objetivo (kcal/día)</label><input id="reviseGoalKcal" type="number" min="1200" max="10000" step="1" value="'+Number(latest.kcal)+'"></div>'+
 '<div class="field"><label for="reviseGoalMode">Reparto de macros</label><select id="reviseGoalMode">'+revisionModeChoices()+'</select></div></div>'+
 '<button type="button" class="btn block light" data-act="previewGoalRevision">Ver nuevo reparto de macros</button></div>'+
 '<div class="pilot-notice" id="revisedGoalPreview" aria-live="polite" style="margin-top:10px">Objetivo actual: '+num(latest.kcal)+' kcal. Elegí un cambio para previsualizar.</div>'+
 '<button type="button" class="btn block" data-act="approveGoalRevision" id="approveGoalRevisionButton" disabled style="margin-top:10px">Aplicar ajuste ahora</button>'+
 '<p class="pilot-hint">No hay período de espera ni límite de revisiones. Podés aumentar o reducir las calorías según la respuesta del alumno. Si reducís todo proporcionalmente, también baja la proteína; evaluá conservarla para objetivos de fuerza o masa muscular.</p>'+history;
}

/* Five-meal guide: draft only on coach until explicit approval; not a diary entry. */
const guideNumbers=t=>num(t.k)+" kcal · P "+num(t.p,1)+" g · HC "+num(t.c,1)+" g · G "+num(t.f,1)+" g";
function guidedTargetFeedback(deviations){
 const keys=["k","p","c","f"];
 const close=keys.every(k=>Number.isFinite(deviations[k]?.percent)&&Math.abs(deviations[k].percent)<=5);
 return close
  ?"Menú cercano al objetivo (energía y macros dentro del 5%). Los valores son orientativos."
  :"Todavía hay diferencias con el objetivo. Recalculá las demás porciones o revisá el menú; se conservan los gramos que fijaste.";
}
function guidedDayContents(plan,goal,editable=false){
 const totals=guideTotals(plan),deviations=guideDeviation(plan,goal);
 const mealCards=plan.meals.map(meal=>{
  const mt=totals.perMeal.find(r=>r.slot===meal.slot)?.totals;
  return '<article class="efg-guide-meal"><div class="efg-guide-meal-head"><b>'+escapeHTML(meal.label)+'</b><span data-guidemealmetric="'+escapeHTML(meal.slot)+'">'+num(mt.k)+' kcal</span></div>'+
   '<p class="efg-guide-description">'+escapeHTML(describeGuidedMeal(meal))+'</p>'+
  meal.items.map((f,i)=>{
  const alt=editable?guidedFoodAlternatives(f.id,foods):[];
  const [min,max]=guidedPortionBounds(f.id);
  const select=alt.length>1?'<label class="efg-guide-select-label">Alternativa <select data-guideswap="'+escapeHTML(meal.slot)+':'+i+'" aria-label="Alternativa para '+escapeHTML(f.name)+'">'+alt.map(id=>{const x=foods.find(t=>t.id===id);return '<option value="'+escapeHTML(id)+'" '+(id===f.id?'selected':'')+'>'+escapeHTML(x?.name||id)+'</option>';}).join('')+'</select></label>':'<span>'+escapeHTML(f.name)+'</span>';
  return '<div class="efg-guide-food"><div class="efg-guide-food-name">'+(editable?select:'<span>'+escapeHTML(f.name)+'</span>')+'</div>'+
  (editable?'<label><input data-guideqty="'+escapeHTML(meal.slot)+':'+i+'" type="number" min="'+min+'" max="'+max+'" step="1" value="'+f.qty+'"> '+escapeHTML(f.unit)+'</label>':
   '<b>'+num(f.qty)+' '+escapeHTML(f.unit)+'</b>')+'</div>';
 }).join("")+
  '<small data-guidemealnumbers="'+escapeHTML(meal.slot)+'">'+guideNumbers(mt)+'</small></article>';
 }).join("");
 return '<div class="efg-guide-summary"><b data-guideoverall>Menú modelo: '+guideNumbers(totals.totals)+'</b><small>Meta: '+num(goal.kcal)+' kcal · P '+goal.protein_g+' g · HC '+goal.carb_g+' g · G '+goal.fat_g+' g</small>'+
 '<small data-guidedeviations>Desvíos: '+["k","p","c","f"].map(k=>(k==="k"?"Kcal":k==="p"?"P":k==="c"?"HC":"G")+" "+(deviations[k].percent>0?"+":"")+num(deviations[k].percent,1)+"%").join(" · ")+'</small><p class="pilot-hint" data-guidetargetstatus role="status">'+escapeHTML(guidedTargetFeedback(deviations))+'</p></div>'+
 '<div class="efg-guide-grid">'+mealCards+'</div>'+
 (editable?'<label class="efg-guide-note">Suplementos (opcional, según indicación del profesional)<textarea id="guideSupplementNote" rows="2" maxlength="300" placeholder="Ej.: no indicados. Si se indican, anotar producto y momento.">'+escapeHTML(plan.supplementNote||"")+'</textarea></label>':
 '<p class="pilot-hint">'+(plan.supplementNote?'<b>Indicación de suplementos:</b> '+escapeHTML(plan.supplementNote):'Suplementos: no indicados en esta guía.')+'</p>')+
 '<p class="pilot-hint">Referencia educativa, no ingesta registrada. Las porciones y macros dependen de la marca, cocción y datos del catálogo. Considerá alergias, hábitos y contexto clínico.</p>';
}
function coachGuidedSection(){
 const goal=state.coachGoals[0],saved=state.coachFoodPlan,old=saved?.guided_plan,matching=goal&&saved?.guided_goal_id===goal.id;
 const draft=state.coachGuidedDraft,plan=draft||(matching?old:null);
 return '<section id="coachGuidedSlot" class="efg-guide-shell"><span class="eyebrow">EFG · DE LOS MACROS A LA COMIDA REAL</span><h3>🥗 Guía alimentaria de cinco comidas</h3>'+
 '<p class="pilot-hint">El alumno verá un ejemplo claro, editable por vos antes de aprobarlo. Nunca reemplaza su registro diario real.</p>'+
 (!goal?'<div class="pilot-notice">Primero aprobá el objetivo nutricional de este alumno.</div>':
 '<div class="pilot-toolbar"><label><input id="guideWhey" type="checkbox" '+(draft?.meals?.some(m=>m.items.some(f=>f.id==="whey_powder"))?"checked":"")+'> Agregar whey opcional a media mañana</label>'+
 '<button class="btn small light" type="button" data-act="makeGuidedDay">'+(plan?(draft?'Regenerar':'Editar guía existente'):'Generar')+' cinco comidas</button></div>'+
 (plan?guidedDayContents(plan,goal,!!draft)+
 (draft?'<div class="pilot-toolbar"><button type="button" class="btn small light" data-act="recalcGuidedDay">Actualizar el resumen</button><button type="button" class="btn small light" data-act="balanceGuidedDay">Recalcular con nuevos pesos y/o ingredientes</button><button type="button" class="btn" data-act="saveGuidedDay">Aprobar y enviar al alumno</button></div>':
 '<p class="pilot-hint">Guía aprobada: la publicación y el desbloqueo son un paso separado.</p><button type="button" class="btn" data-act="publishCoachStudentPlan">Publicar plan y habilitar MI DÍA</button>'):
 '<p class="pilot-notice">El ejemplo se genera después de calcular y aprobar el objetivo.</p>'))+'</section>';
}
function studentGuidedSection(){
 if(state.profile?.role!=="student"||!state.foodPlan?.guided_plan)return "";
 const guide=state.foodPlan.guided_plan,goal=state.goals.find(x=>x.id===state.foodPlan.guided_goal_id);
 if(!goal)return "";
 const stale=state.goals[0]?.id!==goal.id;
 return '<section class="card efg-guide-student"><span class="eyebrow">GUÍA APROBADA POR TU COACH</span><h2>🍽️ Mi día de alimentación, explicado</h2>'+
 '<p>Conocé un ejemplo de cinco comidas y cantidades. Podés comer algo distinto y seguir registrando normalmente.</p>'+
 (stale?'<div class="pilot-alert">Tu objetivo cambió después de este ejemplo: pedile al coach una nueva guía.</div>':'')+
 '<details><summary>Ver las cinco comidas de ejemplo</summary>'+guidedDayContents(guide,goal)+'</details>'+
 '<button type="button" class="btn small light" data-tab="planner">Resolver lo que me falta hoy</button></section>';
}
function baselinePreview(){
 const b=summarizeBaseline(state.coachProgressLogs,{todayISO:today(),limit:2});
 return '<section class="efg-guide-baseline"><h3>📋 Alimentación inicial del alumno</h3>'+
 (b.average?'<p>Promedio registrado en '+b.days.length+' día(s): <b>'+guideNumbers(b.average)+'</b></p><small>'+b.days.map(x=>escapeHTML(x.day)+' · '+x.mealsRecorded+' comidas').join(' / ')+'</small>':
 '<p>Antes de calcular, el alumno puede registrar uno o dos días habituales para describir su alimentación.</p>')+
 '<p class="pilot-hint">Es una muestra autodeclarada, no la ingesta habitual ni el gasto energético medido. Revisar aceite, bebidas, aderezos y alimentos omitidos.</p></section>';
}
function readGuidedEditor(){
 const draft=state.coachGuidedDraft;if(!draft)throw new Error("Primero generá un borrador.");
 for(const el of document.querySelectorAll("[data-guideqty]")){
  const [slot,index]=el.dataset.guideqty.split(":"),food=draft.meals.find(x=>x.slot===slot)?.items?.[Number(index)],qty=Number(el.value);
  if(!food||!el.value.trim()||!Number.isFinite(qty)||qty<guidedPortionBounds(food.id)[0]||qty>guidedPortionBounds(food.id)[1])throw new Error("Cantidad fuera de límites orientativos para ese alimento; revisá gramos o mililitros.");
  // Respect the coach's manual choice even if a browser skips an intermediate input event.
  if(food.qty!==qty){food.qty=qty;food.locked=true;}
 }
 draft.supplementNote=String(document.getElementById("guideSupplementNote")?.value||"").trim();
 return draft;
}
function updateGuidedTotalsUI(){
 const plan=state.coachGuidedDraft,goal=state.coachGoals[0];if(!plan||!goal)return;
 const sums=guideTotals(plan),dev=guideDeviation(plan,goal);
 const all=document.querySelector("[data-guideoverall]");if(all)all.textContent="Menú modelo: "+guideNumbers(sums.totals);
 const deviations=document.querySelector("[data-guidedeviations]");
 if(deviations)deviations.textContent="Desvíos: "+["k","p","c","f"].map(k=>(k==="k"?"Kcal":k==="p"?"P":k==="c"?"HC":"G")+" "+(dev[k].percent>0?"+":"")+num(dev[k].percent,1)+"%").join(" · ");
 const status=document.querySelector("[data-guidetargetstatus]");if(status)status.textContent=guidedTargetFeedback(dev);
 for(const m of sums.perMeal){
  const k=document.querySelector('[data-guidemealmetric="'+m.slot+'"]');if(k)k.textContent=num(m.totals.k)+" kcal";
  const t=document.querySelector('[data-guidemealnumbers="'+m.slot+'"]');if(t)t.textContent=guideNumbers(m.totals);
 }
}
function showGuidedEditor(){
 const node=document.getElementById("coachGuidedSlot");if(!node)return;
 const y=window.scrollY;
 node.outerHTML=coachGuidedSection();
 window.scrollTo({top:y,behavior:"instant"});
}
async function approveGuidedDay(){
 const student=state.selectedStudent,goal=state.coachGoals[0],draft=readGuidedEditor();
 if(!(state.profile.role==="coach"||(state.profile.role==="admin"&&state.org?.is_test&&state.org?.coach_id===state.session.user.id))||!state.consent?.accepted||!student||!goal)throw new Error("No tenés permiso para enviar esta guía.");
 validateGuidedDay(draft,goal);
 const latest=await sb.from("efg_goals").select("id").eq("student_id",student).order("approved_at",{ascending:false}).limit(1).single();
 if(latest.error)throw latest.error;
 if(latest.data.id!==goal.id)throw new Error("La meta cambió: recargá la ficha antes de generar la guía.");
 if(!window.confirm("¿Aprobar estas cinco comidas de ejemplo para el alumno? No se cargarán en su diario."))return;
 const updated={
  student_id:student,coach_id:state.session.user.id,
  approved_food_ids:state.coachFoodPlan?.approved_food_ids?.length?state.coachFoodPlan.approved_food_ids:FOOD_DEFAULTS,
  guided_plan:draft,guided_goal_id:goal.id,guided_plan_approved_at:new Date().toISOString(),updated_at:new Date().toISOString()
 };
 const result=await sb.from("efg_food_plans").upsert(updated,{onConflict:"student_id"}).select("*").single();
 if(result.error)throw result.error;
 state.coachGuidedDraft=null;state.coachFoodPlan=result.data;
 await loadStudentDetail(student);await render();
 const details=document.getElementById("coachStudentGoals");if(details){details.open=true;details.scrollIntoView({block:"start"});}
 notify("Guía aprobada y compartida con el alumno.");
}

function studentDetailView(p,consent){
 if(!consent?.accepted)return '<section class="card"><h2>'+escapeHTML(p.nickname)+'</h2><div class="pilot-alert" style="margin-top:13px">El alumno todavía no autorizó compartir su información nutricional. No es posible consultar sus registros ni asignar objetivos hasta que consienta.</div></section>';
 const latest=state.coachGoals[0];
 const intakeDraft=state.coachIntakePrefill?.studentId===p.user_id?state.coachIntakePrefill:null;
 const intakeValue=(key,fallback="")=>escapeHTML(intakeDraft?(intakeDraft.fields[key]??""):fallback);
 const intakeWarnings=intakeDraft?'<div class="efg-intake-prefill" role="status"><strong>Ficha aplicada a la calculadora · borrador</strong><p>Confirmá los valores antes de calcular; todavía no se envió ningún plan.</p><ul>'+intakeDraft.warnings.map(w=>'<li>'+escapeHTML(w)+'</li>').join("")+'</ul>'+
 (intakeDraft.preferredFoods?'<p><strong>Preferencias:</strong> '+escapeHTML(intakeDraft.preferredFoods)+'</p>':"")+
 (intakeDraft.dislikedFoods?'<p><strong>Evita por gusto:</strong> '+escapeHTML(intakeDraft.dislikedFoods)+'</p>':"")+
 (intakeDraft.mealRoutine?'<p><strong>Horarios:</strong> '+escapeHTML(intakeDraft.mealRoutine)+'</p>':"")+'</div>':"";
 return coachIntakeFlow.details(p.user_id)+'<section class="card coach-student-profile"><div class="coach-student-heading"><div><h2>'+escapeHTML(p.nickname)+'</h2><span class="pilot-pill">Consentimiento activo</span></div><span class="coach-profile-avatar">'+escapeHTML(p.nickname.slice(0,2).toUpperCase())+'</span></div><nav class="coach-profile-tabs" aria-label="Secciones del alumno"><button type="button" data-coachsection="coachStudentNutrition">Alimentación</button><button type="button" data-coachsection="coachStudentWeight">Evolución</button><button type="button" data-coachsection="coachStudentGoals">Objetivos</button></nav><div id="coachStudentNutrition"></div><div class="divider"></div>'+coachDailyReport(p)+nutritionProgressPanel(true)+
 coachRewardPanel()+
 '<details class="coach-profile-accordion" id="coachStudentWeight"><summary>⚖️ Evolución del peso corporal</summary>'+weightTrendChart(state.coachWeights)+
 '<h4 style="margin:15px 0 8px">Pesajes recientes</h4>'+(state.coachWeights.length?state.coachWeights.slice(0,5).map(w=>'<div class="pilot-macro"><span>'+escapeHTML(weightDateLabel(w))+'</span><b>'+num(w.kg,1)+' kg</b></div>').join(""):'<p class="pilot-hint">Sin pesajes aún.</p>')+
 '</details><details class="coach-profile-accordion" id="coachStudentGoals"><summary>🎯 Objetivos y plan nutricional</summary><h3>Historial de objetivos aprobados</h3>'+(state.coachGoals.length?state.coachGoals.map(g=>'<div class="pilot-macro"><span>'+escapeHTML(String(g.start_on||g.approved_at||"Sin fecha").slice(0,10))+' · '+escapeHTML(g.goal_type||"Objetivo")+'</span><b>'+num(g.kcal)+' kcal · P '+num(g.protein_g)+' g</b></div>').join(""):'<p class="pilot-hint">Sin objetivos anteriores.</p>')+'<div class="divider"></div><h3>Plan nutricional</h3>'+(latest?'<div class="pilot-notice" style="margin-top:10px"><strong>'+num(latest.kcal)+' kcal/día</strong><small>P '+latest.protein_g+' g · HC '+latest.carb_g+' g · G '+latest.fat_g+' g · Fibra '+latest.fiber_g+' g</small></div>':'<p class="pilot-hint">Sin plan aprobado.</p>')+
 coachGuidedSection()+baselinePreview()+goalRevisionSection(latest)+'<div class="divider"></div><p class="pilot-hint">El alumno tiene acceso automático a todo el catálogo. No hace falta autorizar alimentos uno por uno.</p>'+'<div class="divider"></div><h3>Calculadora de objetivos</h3><p class="pilot-hint">Estimación para adultos con Mifflin–St Jeor (general) o Ten Haaf (deportistas entrenados). Revisar el gasto real y la evolución del alumno.</p>'+
 intakeWarnings+'<div class="pilot-form"><div class="field-row"><div class="field"><label>Sexo de ecuación</label><select id="targetSex"><option value="">Seleccioná hombre o mujer</option><option value="male">Hombre</option><option value="female">Mujer</option></select></div><div class="field"><label>Objetivo</label><select id="targetGoal"><option value="">Confirmá el objetivo</option><option value="fat_loss" '+(intakeValue("targetGoal")==="fat_loss"?"selected":"") +'>Pérdida de grasa</option><option value="recomp" '+(intakeValue("targetGoal")==="recomp"?"selected":"") +'>Recomposición</option><option value="muscle_gain" '+(intakeValue("targetGoal")==="muscle_gain"?"selected":"") +'>Ganancia muscular</option></select></div></div><div class="field-row"><div class="field"><label>Edad</label><input type="number" min="18" max="90" value="'+intakeValue("targetAge","30")+'" id="targetAge"></div><div class="field"><label>Altura (cm)</label><input type="number" min="120" max="220" value="'+intakeValue("targetHeight","170")+'" id="targetHeight"></div></div><div class="field-row"><div class="field"><label>Peso (kg)</label><input type="number" min="35" max="300" value="'+intakeValue("targetWeight",state.coachWeights[0]?.kg||75)+'" id="targetWeight"></div><div class="field"><label>Actividad estimada</label><select id="targetActivity"><option value="">Confirmá la actividad</option>'+activityOptions(intakeDraft?(intakeDraft.fields.targetActivity??null):null)+'</select></div></div><div class="field-row"><div class="field"><label>Ecuación de gasto en reposo</label><select id="targetModel">'+equationOptions()+'</select></div>'+
 '<div class="field"><label>Proteínas</label><select id="targetProtein">'+proteinOptions()+'</select></div>'+
 '<div class="field"><label>Grasas</label><select id="targetFat">'+fatOptions(.9)+'</select></div></div>'+
 '<p class="pilot-hint">Mifflin–St Jeor contempla hombre o mujer. La proteína automática para recomposición y descenso parte de 2,0 g/kg y las grasas de 0,9 g/kg, ambas editables. El perfil deportivo no garantiza mayor precisión.</p>'+
 '<div class="field"><label>Recomposición · estrategia energética</label><select id="targetRecompMode">'+recompOptions("deficit05")+'</select></div>'+activityHint+recompHint+
 '<button class="btn block" data-act="calculateGoal">Calcular propuesta</button></div><div id="goalPreview" class="pilot-notice" style="margin-top:15px">Los resultados aparecerán aquí.</div><button class="btn block" data-act="approveGoal" id="approveGoalButton" disabled style="margin-top:10px">Guardar objetivo para revisar guía</button></details></section>';
}

function adminHomeView(){
 const orgs=state.orgs||[];
 return rootText("HOLA, "+escapeHTML(state.profile.nickname),"Tu centro de control EFG. Todos los espacios, en un único lugar.")+
 '<section class="efg-admin-banner"><span class="eyebrow">EFG NUTRITION PRO · ADMINISTRACIÓN</span><h2>Todo bajo control.</h2><p>Seguimiento de la plataforma, alumnos de prueba y tu propia alimentación.</p></section>'+
 '<div class="efg-coach-stat-grid"><div><strong>'+orgs.length+'</strong><span>Entrenadores</span></div><div><strong>'+orgs.filter(o=>["active","trial","grace"].includes(o.status)).length+'</strong><span>Licencias vigentes</span></div><div><strong>'+orgs.reduce((n,o)=>n+(Number(o.seat_limit)||0),0)+'</strong><span>Cupos comerciales</span></div></div>'+
 (state.org?.is_test?'<section class="card efg-seats-panel"><div class="section-head"><h2>MI LABORATORIO DE PRUEBA</h2><button type="button" class="btn small light" data-tab="testCoach">Ver alumnos</button></div><p><strong>'+Math.max(0,Number(state.org.seat_limit)-state.roster.filter(p=>p.active).length-state.testInvitations.filter(i=>i.role==="student"&&!i.claimed_by&&!i.revoked_at).length)+' cupos disponibles</strong> de '+Number(state.org.seat_limit)+' habilitados. No se cuentan como licencias comerciales.</p></section>':'')+
 '<section class="efg-menu-grid">'+[
 ["home","🍽️","MI DÍA","mint"],["testCoach","👥","Coach de prueba","blue"],
 ["reports","📈","Informes","peach"],["adminManage","⚙️","Organizaciones","lilac"],
 ["payments","💳","Pagos y licencias","cream"],["adminMore","☷","Más herramientas","mint"]
 ].map(x=>'<button type="button" class="efg-menu-card efg-menu-'+x[3]+'" data-tab="'+x[0]+'"><span class="efg-menu-emoji" aria-hidden="true">'+efgMenuIcon(x[0])+'</span><strong>'+x[2]+'</strong><span class="efg-menu-arrow">↗</span></button>').join("")+'</section>'+
 '<section class="card efg-content-card"><h2>Privacidad por diseño</h2><p class="pilot-hint">El administrador gestiona organizaciones y licencias, pero no accede automáticamente a los registros nutricionales privados de todos sus alumnos. Solo el seguimiento autorizado en el espacio de coach habilita la consulta.</p></section>';
}
function adminView(){
 const orgs=state.orgs;
 return rootText("Organizaciones y licencias","Gestioná entrenadores, cupos y permisos sin acceder a la información nutricional privada.")+
 '<div class="efg-roster-summary"><span class="pilot-pill">'+orgs.length+' entrenadores registrados</span><button type="button" class="btn small light" data-tab="admin">Volver al inicio</button></div>'+
 '<div class="pilot-kpis"><div class="card"><div class="metric-label">ENTRENADORES</div><div class="metric-value">'+orgs.length+'</div></div><div class="card"><div class="metric-label">LICENCIAS ACTIVAS</div><div class="metric-value">'+orgs.filter(o=>['active','grace'].includes(o.status)).length+'</div></div><div class="card"><div class="metric-label">LICENCIAS PENDIENTES</div><div class="metric-value">'+orgs.filter(o=>o.status==="trial").length+'</div></div><div class="card"><div class="metric-label">CUPO CONTRATADO TOTAL</div><div class="metric-value">'+orgs.reduce((n,o)=>n+o.seat_limit,0)+'</div></div><div class="card"><div class="metric-label">ALUMNOS VISIBLES POR EFG</div><div class="metric-value">0</div><p class="subtle">Privacidad por diseño</p></div></div>'+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Entrenadores habilitados</h2>'+(orgs.length?orgs.map(org=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(org.name)+'</strong><small>'+num(org.seat_limit)+' cupos · '+(org.license_fee_ars?num(org.license_fee_ars,2)+' ARS/mes · ':'Sin precio mensual · ')+escapeHTML(org.status==='active'&&org.paid_through>=today()?'Activa hasta '+org.paid_through:'Pendiente de pago / suspendida')+' · '+(org.coach_id?'Ingreso registrado':'Pendiente de ingreso')+'</small></div><div class="pilot-toolbar"><button class="btn small light" data-contract="'+org.id+'">Cambiar plan</button><button class="btn small light" data-activatecoach="'+org.id+'" '+(!org.coach_id?'disabled':'')+'>Activar tras pago</button>'+(org.status!=="suspended"?'<button class="btn small ghost" data-orgstatus="'+org.id+'">Suspender</button>':'')+'</div></div></div>').join(""):'<div class="empty">Todavía no se habilitaron entrenadores.</div>')+'</div><div class="card"><h2>Invitaciones de coaches</h2>'+ (state.invitations.length?state.invitations.filter(i=>i.role==="coach").map(i=>'<div class="pilot-record"><strong>'+escapeHTML(i.nickname)+'</strong><small>'+safePhoneEmail(i.email)+' · '+(i.claimed_by?'Activado':'Pendiente')+'</small>'+(!i.claimed_by&&!i.revoked_at?'<button class="btn small ghost" data-revokeinvite="'+i.id+'" style="margin-top:8px">Cancelar invitación</button>':'')+'</div>').join(""):'<p class="pilot-hint">Sin invitaciones comerciales.</p>')+'</div></div>'+
 '<div class="pilot-stack"><div class="card"><h2>ALTA COMERCIAL DE COACH</h2><p class="pilot-hint">Solo el administrador EFG habilita entrenadores. Escribí el cupo contratado; la cuenta nueva queda pendiente de activación hasta que verifiques el acuerdo y la transferencia.</p><div class="pilot-form"><div class="field"><label>Nombre / usuario profesional</label><input id="newCoachName" placeholder="Ej. CoachCarla" maxlength="70"></div><div class="field"><label>Correo electrónico</label><input id="newCoachEmail" type="email" placeholder="coach@email.com"></div><div class="field"><label for="newCoachSeats">Cupos contratados de alumnos (1 a 10.000)</label><input id="newCoachSeats" type="number" min="1" max="10000" required placeholder="Ej. 50"></div><div class="field"><label for="newCoachFee">Precio mensual acordado (ARS)</label><input id="newCoachFee" type="number" min="1" max="10000000" step=".01" placeholder="Importe del contrato"></div><button class="btn block" data-act="inviteCoach" '+(!state.platformAlias?'disabled':'')+'>Invitar coach · Pendiente de activación</button><small>'+(!state.platformAlias?'Primero configurá tu alias EFG.':'La invitación no activa la licencia hasta aprobar el pago.')+'</small></div></div><div class="card"><h2>ALIAS OFICIAL DE EFG</h2><p class="pilot-hint">Configurá tu alias para cobrar las licencias: se cargará automáticamente en «PAGAR MI LICENCIA A EFG» de todos los coaches. Nunca se modifica desde su cuenta.</p><div class="pilot-form"><div class="field"><label>Alias de cobro</label><input id="platformAlias" value="'+escapeHTML(state.platformAlias||"")+'" maxlength="100" placeholder="EFG.NUTRITION"></div><div class="field"><label for="platformAlias2">Alias alternativo 1 (opcional)</label><input id="platformAlias2" maxlength="100" value="'+escapeHTML(state.platformAliases?.[1]||"")+'"></div><div class="field"><label for="platformAlias3">Alias alternativo 2 (opcional)</label><input id="platformAlias3" maxlength="100" value="'+escapeHTML(state.platformAliases?.[2]||"")+'"></div><button class="btn" data-act="savePlatformAlias">Guardar alias de EFG</button></div></div><div class="card"><h2>Mi cuenta personal</h2><p class="pilot-hint">Como propietario podés usar también tu diario nutricional, pero no ver los diarios de otros entrenadores.</p><button class="btn light" data-tab="home">Abrir mi alimentación</button></div></div></div>';
}
function paymentCard(p){
 const isRecipient=p.recipient_id===state.session.user.id;
 const pupil=(state.roster||[]).find(x=>x.user_id===p.payer_id);
 const sender=pupil?coachDisplayName(pupil):p.payment_kind==="student_coach"?"Alumno":"Entrenador";
 const status={pending:"Pendiente de verificar",approved:"Aprobado",rejected:"Rechazado"}[p.status]||p.status;
 return '<div class="pilot-record efg-payment-item '+(isRecipient&&p.status==="pending"?"efg-payment-new":"")+'"><div class="between"><div><strong>'+num(p.amount_ars,2)+' ARS · '+escapeHTML(p.period_label)+'</strong><small>'+escapeHTML(isRecipient?"Recibido de "+sender:"Enviado al destinatario")+' · '+formatTime(p.created_at)+'</small></div><span class="pilot-pill '+(p.status==="pending"?"pending":p.status==="rejected"?"no":"")+'">'+escapeHTML(status)+'</span></div><div class="pilot-toolbar" style="margin-top:9px"><button class="btn small ghost" data-proof="'+escapeHTML(p.receipt_path)+'">Ver comprobante</button>'+(isRecipient&&p.status==="pending"?'<button class="btn small light" data-approve="'+p.id+'">Aprobar transferencia</button><button class="btn small ghost" data-reject="'+p.id+'">Rechazar</button>':'')+'</div></div>';
}
function paymentsView(){
 const role=state.profile.role,org=state.org;
 // El administrador sólo cobra licencias; su laboratorio de prueba puede cobrar
 // a sus propios alumnos sin convertirse en coach comercial.
 const coachWorkspace=role==="coach"||(role==="admin"&&org?.is_test===true&&org?.coach_id===state.session.user.id);
 const kind=role==="student"?"student_coach":role==="coach"?"coach_efg":null;
 const alias=kind==="student_coach"?org?.payment_alias:kind==="coach_efg"?state.platformAlias:null;
 const platformPicker=role==="coach"&&(state.platformAliases||[]).length?
 '<div class="field"><label for="platformPayAlias">Alias oficial de EFG para transferir</label><select id="platformPayAlias">'+
 state.platformAliases.map((v,i)=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+(i===0?' · Predeterminado':' · Alternativo')+'</option>').join('')+
 '</select></div>':'';
 const received=state.payments.filter(p=>p.recipient_id===state.session.user.id&&p.payment_kind==="student_coach"&&p.organization_id===org?.id);
 const adminLicenses=role==="admin"?state.payments.filter(p=>p.recipient_id===state.session.user.id&&p.payment_kind==="coach_efg"):[];
 const sent=state.payments.filter(p=>p.payer_id===state.session.user.id);
 const pending=received.filter(p=>p.status==="pending");
 const ownAlias=org?.payment_alias||"";
 const platformAlias=state.platformAlias||"";
 const aliasPanel=coachWorkspace?'<section class="card efg-payment-alias efg-payment-channel"><div class="eyebrow">CANAL 01 · COBROS</div><h2>COBRAR A MIS ALUMNOS</h2><p class="pilot-hint">Configurá tu alias profesional: EFG lo mostrará automáticamente en el panel de pagos de tus alumnos. Los comprobantes llegarán a esta misma sección, sin mezclarse con tu licencia.</p><div class="efg-alias-form"><div class="field"><label for="coachAlias">Mi alias para cobrar a los alumnos</label><input id="coachAlias" value="'+escapeHTML(ownAlias)+'" maxlength="100" placeholder="TU.ALIAS" autocomplete="off"></div><button type="button" class="btn" data-act="coachAlias">Guardar alias</button></div><small>Verificá los pagos en tu banco antes de aprobar comprobantes.</small></section>':'';
 const coachInfo=role==="coach"?'<section class="card efg-license-summary"><div class="eyebrow">LICENCIA PROFESIONAL EFG</div><h2>Mi contrato</h2><div class="efg-license-meta"><div><strong>'+num(Number(org?.seat_limit)||0)+'</strong><span>Cupos contratados</span></div><div><strong>'+escapeHTML(org?.status==="active"?"ACTIVA":org?.status==="trial"?"PENDIENTE":org?.status==="grace"?"PRÓRROGA":"PENDIENTE / SUSPENDIDA")+'</strong><span>Estado de licencia</span></div></div><p><strong>'+(org?.license_fee_ars?num(org.license_fee_ars,2)+' ARS/mes':'Importe a definir por EFG')+'</strong></p><p class="pilot-hint">Los cupos y la activación los determina EFG. '+(org?.paid_through?'Vigencia abonada hasta '+escapeHTML(org.paid_through)+'. ':'')+'El comprobante enviado no activa ni amplía automáticamente el servicio.</p></section>':'';
 const clientInbox=coachWorkspace?'<section class="card efg-payment-inbox"><div class="section-head"><h2>Comprobantes de mis alumnos</h2><button type="button" class="btn small light" data-act="refreshPayments">Actualizar comprobantes</button><span class="pilot-pill '+(pending.length?"pending":"")+'">'+pending.length+' pendientes</span></div>'+(received.length?received.map(paymentCard).join(""):'<div class="empty">Todavía no recibiste comprobantes de alumnos.</div>')+'</section>':'';
 const adminBilling=role==="admin"?'<section class="card efg-payment-channel"><div class="eyebrow">COBRANZAS DE LA PLATAFORMA</div><h2>COBRAR LICENCIAS DE COACHES</h2><p class="pilot-hint">Tu alias central se carga una sola vez y se muestra automáticamente a todos los coaches. Ellos no pueden editarlo.</p><div class="efg-payment-target"><strong>Alias oficial EFG: '+escapeHTML(platformAlias||"PENDIENTE DE CONFIGURAR")+'</strong></div><button type="button" class="btn light" data-tab="adminManage">'+(platformAlias?"Administrar alias EFG":"Configurar mi alias EFG")+'</button></section><section class="card efg-payment-inbox"><h2>Comprobantes de licencias EFG</h2><p class="pilot-hint">Revisá la acreditación bancaria antes de aprobar. La aprobación del comprobante no cambia por sí sola el estado de la licencia.</p>'+(adminLicenses.length?adminLicenses.map(paymentCard).join(""):'<div class="empty">Todavía no hay comprobantes de coaches.</div>')+'</section>':'';
 const transferPanel=kind?'<section class="card efg-payment-channel efg-payment-transfer"><div class="eyebrow">'+(role==="coach"?"CANAL 02 · LICENCIA EFG":"TRANSFERENCIA A TU COACH")+'</div><h2>'+(role==="coach"?"PAGAR MI LICENCIA A EFG":"PAGAR A MI COACH")+'</h2>'+(role==="coach"?'<p class="pilot-hint">La cuota depende de la cantidad de alumnos contratados. Transferí el importe acordado con EFG; la app no genera precios automáticos.</p>':'<p class="pilot-hint">Transferí al alias que configuró tu entrenador y luego adjuntá tu comprobante.</p>')+'<div class="pilot-notice efg-payment-target"><strong>Alias del destinatario: '+escapeHTML(alias||(role==="coach"?"EFG todavía debe configurar su alias":"Tu coach todavía debe configurar su alias"))+'</strong>'+(alias?'<button type="button" class="btn small light" '+(role==="coach"?'data-copyplatform="1"':'data-copyalias="1"')+'>Copiar alias</button>':'')+platformPicker+'<small>'+(role==="coach"?"Alias oficial del administrador, de solo lectura.":"El coach recibe tu comprobante y verifica el pago.")+'</small></div><div class="pilot-form"><div class="field"><label for="payAmount">Importe efectivamente transferido (ARS)</label><input id="payAmount" type="number" min="1" step=".01" placeholder="Importe según contrato" '+(role==="coach"&&Number(org?.license_fee_ars)>0?'value="'+Number(org.license_fee_ars)+'"':'')+'></div><div class="field"><label for="payPeriod">Mes / período del pago</label><input id="payPeriod" type="month" value="'+today().slice(0,7)+'"></div><div class="field"><label for="payFile">Comprobante (foto JPG, PNG o WebP, máximo 5 MB)</label><input id="payFile" type="file" accept="image/jpeg,image/png,image/webp"></div><button type="button" class="btn block" data-act="sendProof" '+(!alias?'disabled aria-disabled="true"':'')+'>Enviar comprobante</button></div><p class="pilot-hint">El envío no acredita el dinero ni renueva la licencia automáticamente; el destinatario verifica la transferencia.</p></section>':'';
 const sentPanel=kind?'<section class="card efg-payment-inbox"><h2>'+(role==="coach"?"Mis pagos a EFG":"Mis transferencias")+'</h2>'+(sent.length?sent.map(paymentCard).join(""):'<div class="empty">Todavía no enviaste comprobantes.</div>')+'</section>':'';
 return rootText("Pagos y comprobantes",role==="coach"?"Cobrá a tus alumnos y aboná tu licencia EFG en circuitos independientes.":role==="admin"?"Configurá el alias central y revisá los comprobantes de licencias profesionales.":"Transferí al alias de tu coach y registrá tu comprobante.")+
 coachInfo+aliasPanel+
 (coachWorkspace?'<section class="efg-payment-summary"><div><strong>'+pending.length+'</strong><span>Por verificar</span></div><div><strong>'+received.length+'</strong><span>Recibidos de alumnos</span></div><div><strong>'+sent.filter(p=>p.payment_kind==="coach_efg").length+'</strong><span>Enviados a EFG</span></div></section>':'')+
 clientInbox+adminBilling+transferPanel+sentPanel;
}
// Retain open sections and unsaved coach inputs only when the view identity is unchanged.
let lastRenderedViewKey=null;
const activeViewKey=()=>[state.session?.user?.id||"",state.profile?.role||"",state.tab,state.selectedStudent||""].join("|");
function captureViewContinuity(key){
 if(key!==lastRenderedViewKey||!state.profile)return null;
 const inputValues={};
 // Keep the user's unsaved form values while updating the data beneath them.
 // File inputs cannot be restored safely and are intentionally excluded.
 for(const el of root.querySelectorAll(".pilot-main input[id],.pilot-main select[id],.pilot-main textarea[id],.pilot-main [data-guideqty]")){
  if(el.type==="file"||el.type==="password")continue;
  const key=el.id?"id:"+el.id:el.dataset.guideqty?"guideqty:"+el.dataset.guideqty:null;
  if(!key)continue;
  inputValues[key]=el.type==="checkbox"||el.type==="radio"?el.checked:el.value;
 }
 return {openDetails:[...root.querySelectorAll("details")].map(d=>d.open),
  scrollX:window.scrollX,scrollY:window.scrollY,inputValues};
}
function restoreViewContinuity(snapshot){
 if(!snapshot)return;
 root.querySelectorAll("details").forEach((el,i)=>{if(i<snapshot.openDetails.length)el.open=!!snapshot.openDetails[i];});
 const controls=[...root.querySelectorAll(".pilot-main input[id],.pilot-main select[id],.pilot-main textarea[id],.pilot-main [data-guideqty]")];
 for(const el of controls){
  if(el.type==="file"||el.type==="password")continue;
  const key=el.id?"id:"+el.id:el.dataset.guideqty?"guideqty:"+el.dataset.guideqty:null;
  if(!key||!Object.prototype.hasOwnProperty.call(snapshot.inputValues,key))continue;
  const value=snapshot.inputValues[key];
  if(el.type==="checkbox"||el.type==="radio")el.checked=value;
  else el.value=value;
 }
 window.scrollTo(snapshot.scrollX,snapshot.scrollY);
 // iOS Safari may settle scroll dimensions after the newly rendered content lays out.
 requestAnimationFrame(()=>{if(lastRenderedViewKey===activeViewKey())window.scrollTo(snapshot.scrollX,snapshot.scrollY);});
}
async function render(){
 if(!state.profile)return loginView();
 if(state.welcomePending)return welcomeView();
 if(studentPlanPending()&&!["intake","messages","privacy","notifications"].includes(state.tab))state.tab="intake";
 const viewKey=activeViewKey(),snapshot=captureViewContinuity(viewKey);
 await ensureCurrentDay();
 if(state.plannerDraftDay!==today()){state.plannerDraftGrams={};state.plannerDraftDay=today();}
 state.renderedDay=today();
 let page={intake:coachIntakeFlow.view,notifications:notificationsView,messages:messagesView,home:homeView,planner:studentPlannerView,studentMore:state.profile.role==="coach"?coachPersonalMoreView:studentMoreView,recipes:studentRecipesView,supplements:studentSupplementsView,summaries:studentSummariesView,privacy:studentPrivacyView,adminMore:adminMoreView,weight:progressView,sport:sportView,coach:coachHomeView,coachIntake:coachIntakeView,coachStudents:coachView,coachTools:coachToolsView,testCoach:state.profile.role==="admin"?coachHomeView:homeView,reports:coachReportsView,admin:adminHomeView,adminManage:adminView,payments:paymentsView}[state.tab]||homeView;
 frame(page());
 lastRenderedViewKey=activeViewKey();
 if(lastRenderedViewKey===viewKey)restoreViewContinuity(snapshot);
 if(state.tab==="notifications")inbox.repaint();
 if(state.tab==="messages")messages.mount();
 if(state.tab==="planner")updatePlannerPreview();
 if(state.tab==="sport")updateSportHint();
}
function updateFoodHint(){
 const id=document.getElementById("mealFood")?.value||foods[0].id;
 let f=foods.find(x=>x.id===id)||foods[0],hint=document.getElementById("mealHint");
 if(hint)hint.textContent=num(f.k*100)+" kcal y "+num(f.p*100,1)+" g proteínas por 100 "+f.unit+". "+foodProvenance(f)+". "+f.source;
}
function updateSportHint(){
 const id=document.getElementById("sportItem")?.value||"gel";
 let f=sports.find(x=>x.id===id)||sports.find(x=>x.id==="gel"),hint=document.getElementById("sportInfo"),qty=document.getElementById("sportQty"),label=document.getElementById("sportQtyLabel");
 if(qty)qty.value=f.defaultQty;
 if(label)label.textContent="Cantidad ("+f.unit+")";
 if(hint)hint.textContent=f.source+". Porción de ejemplo: "+num(f.defaultQty)+" "+f.unit+", "+num(f.k*f.defaultQty)+" kcal.";
}
function previewGoalRevision(){
 const latest=state.coachGoals[0];
 if(!latest||!state.selectedStudent||!state.consent?.accepted)throw new Error("Seleccioná un alumno con un plan aprobado y consentimiento activo.");
 const goal=adjustNutritionGoal(latest,Number(document.getElementById("reviseGoalKcal")?.value),document.getElementById("reviseGoalMode")?.value);
 if(goal.kcal===Number(latest.kcal))throw new Error("Ingresá calorías distintas de la meta actual.");
 state.pendingGoalRevision={studentId:state.selectedStudent,baseId:latest.id,proposal:goal};
 document.getElementById("revisedGoalPreview").innerHTML=showGoalComparison(latest,goal);
 document.getElementById("approveGoalRevisionButton").disabled=false;
}
function adjustCalculatedGoal(){
 const base=state.calculatedGoalBase;
 if(!base||base.student_id!==state.selectedStudent)throw new Error("Calculá primero una propuesta para este alumno.");
 const goal=adjustNutritionGoal(base,Number(document.getElementById("proposalGoalKcal")?.value),document.getElementById("proposalGoalMode")?.value);
 state.pendingGoal={...goal,student_id:state.selectedStudent};
 document.getElementById("goalPreviewSummary").innerHTML=showGoalComparison(base,goal);
 regenerateCoachIntakeGuidePreview();
 document.getElementById("approveGoalButton").disabled=false;
}
async function approveGoalRevision(){
 const pending=state.pendingGoalRevision, latest=state.coachGoals[0];
 if(!pending||pending.studentId!==state.selectedStudent||!state.consent?.accepted||!latest||latest.id!==pending.baseId)throw new Error("Verificá la propuesta de revisión y los permisos del alumno.");
 const {data,error}=await sb.from("efg_goals").select("id").eq("student_id",pending.studentId).order("approved_at",{ascending:false}).limit(1).single();
 if(error)throw error;
 if(data.id!==pending.baseId)throw new Error("Ya existe un objetivo más reciente. Actualizá la ficha y recalculá.");
 if(!window.confirm("¿Aplicar ahora "+num(pending.proposal.kcal)+" kcal/día para este alumno? Podés volver a ajustarlo cuando haga falta; el objetivo previo se conserva en el historial."))return;
 const {error:saveError}=await sb.from("efg_goals").insert({...pending.proposal,student_id:pending.studentId,approved_by:state.session.user.id,start_on:today()});
 if(saveError)throw saveError;
 state.pendingGoalRevision=null;state.pendingGoal=null;state.calculatedGoalBase=null;
 await loadStudentDetail(pending.studentId);await render();
 notify("Nuevo objetivo aprobado. Plan anterior conservado.");
}
function regenerateCoachIntakeGuidePreview(){
 state.coachIntakeGuidePreview=null;
 document.getElementById("coachIntakeGeneratedGuide")?.remove();
 const e=document.getElementById("goalPreview");
 if(!e||!state.pendingGoal)return;
 const intakeDraft=state.coachIntakePrefill;
 if(intakeDraft?.studentId===state.selectedStudent&&state.consent?.accepted){
  if(coachGuidePreviewAllowed(intakeDraft,{studentId:state.selectedStudent,consent:true})){
   try{
    const sample=generateGuidedDay(foods,state.pendingGoal);
    state.coachIntakeGuidePreview={...sample,createdFrom:"coach_intake_unapproved_preview"};
    e.innerHTML+='<section id="coachIntakeGeneratedGuide"><h4>Ejemplo automático de cinco comidas · SIN APROBAR</h4>'+
     '<p class="pilot-hint">Propuesta orientativa: NO se envía ni se suma al diario. Verificá ingredientes, alergias y restricciones antes de aprobarla.</p>'+
     guidedDayContents(state.coachIntakeGuidePreview,state.pendingGoal,false)+'</section>';
   }catch(error){
    e.innerHTML+='<p class="pilot-hint">No se pudo preparar el menú automáticamente: '+escapeHTML(error.message)+'. Podés hacer la guía manual.</p>';
   }
  }else e.innerHTML+='<p class="pilot-hint">Este patrón alimentario requiere el motor dietético revisado. No generamos una guía genérica con alimentos posiblemente incompatibles.</p>';
 }
}
function calculateGoal(){
 state.coachIntakeGuidePreview=null;
 const get=(id)=>document.getElementById(id)?.value;
 const weight=Number(get("targetWeight")),height=Number(get("targetHeight")),age=Number(get("targetAge")),activity=Number(get("targetActivity")),sex=get("targetSex"),goal=get("targetGoal"),model=get("targetModel")||"mifflin";
 const proteinChoice=get("targetProtein")||"auto",fatChoice=Number(get("targetFat")||.8);
 const result=macroEstimate(age,height,weight,activity,sex,goal,model,proteinChoice==="auto"?null:Number(proteinChoice),fatChoice,get("targetRecompMode")||"deficit05");
 state.pendingGoal={student_id:state.selectedStudent,goal_type:goal,kcal:result.kcal,protein_g:result.protein,carb_g:result.carbs,fat_g:result.fat,fiber_g:result.fiber,estimation_method:result.model,activity_factor:result.activity,protein_per_kg:result.proteinFactor,fat_per_kg:result.fatFactor};
 state.calculatedGoalBase={...state.pendingGoal};
 const e=document.getElementById("goalPreview");
 e.innerHTML='<strong>'+num(result.kcal)+' kcal/día</strong><small>Proteínas '+result.protein+' g · Hidratos '+result.carbs+' g · Grasas '+result.fat+' g · Fibra '+result.fiber+' g</small>'+
 '<small>'+(result.model==="tenhaaf"?"Ten Haaf · perfil deportivo entrenado":"Mifflin–St Jeor · población general")+' · Metabolismo en reposo '+num(result.rmr)+' kcal · Mantenimiento '+num(result.maintenance)+' kcal.</small>'+
 '<small>Proteínas '+num(result.proteinFactor,1)+' g/kg · Grasas '+num(result.fatFactor,1)+' g/kg · Energía '+num(result.energyFactor*100)+'% del mantenimiento. Estimación inicial: comprobar evolución, adherencia y rendimiento; no es una medición de calorimetría.</small>'+scienceWarnings(result);
 e.innerHTML+='<div class="divider"></div><h4>Personalizar las calorías de esta propuesta</h4>'+
 '<div class="field-row"><div class="field"><label for="proposalGoalKcal">Calorías objetivo</label><input type="number" id="proposalGoalKcal" min="1200" max="10000" step="1" value="'+result.kcal+'"></div>'+
 '<div class="field"><label for="proposalGoalMode">Reparto de macros</label><select id="proposalGoalMode">'+revisionModeChoices()+'</select></div></div>'+
 '<button type="button" class="btn small light" data-act="adjustCalculatedGoal">Recalcular propuesta</button><div id="goalPreviewSummary" style="margin-top:8px"></div>';
 regenerateCoachIntakeGuidePreview();
 document.getElementById("approveGoalButton").disabled=false;
}
async function saveDiary(){
 const d=activeDiary();
 if(d.log_day!==today())throw new Error("Empezó un nuevo día. Volvé a registrar el alimento en la fecha actual.");
 if(isNutritionDayClosed(d.log_day))throw new Error("El día se cerró automáticamente a las 23:59, hora de Argentina. Los registros ya están guardados.");
 d.skipped=d.skipped||{};
 d.skipped._closed=false; // El día vigente permanece abierto hasta el horario automático.
 d.totals=dailyTotals(d);d.student_id=state.session.user.id;
 const {data,error}=await sb.from("efg_daily_logs").upsert({student_id:d.student_id,log_day:d.log_day,meals:d.meals,sports:d.sports,skipped:d.skipped,totals:d.totals,updated_at:new Date().toISOString()},{onConflict:"student_id,log_day"}).select().single();
 if(error)throw error;
 state.diary=data;
 const idx=state.progressLogs.findIndex(x=>x.log_day===data.log_day);
 if(idx>=0)state.progressLogs[idx]=data;else state.progressLogs.unshift(data);
 await render();
}
async function loadPersonalData(){
 const id=state.session.user.id;
 const results=await Promise.all([
 sb.from("efg_daily_logs").select("*").eq("student_id",id).eq("log_day",today()).maybeSingle(),
 sb.from("efg_daily_logs").select("log_day,meals,sports,skipped").eq("student_id",id).gte("log_day",(()=>{const d=new Date(today()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-89);return d.toISOString().slice(0,10)})()).order("log_day",{ascending:false}).limit(100),
 sb.from("efg_weights").select("*").eq("student_id",id).order("measured_on",{ascending:false}).limit(40),
 sb.from("efg_activities").select("*").eq("student_id",id).order("activity_day",{ascending:false}).limit(20),
 sb.from("efg_goals").select("*").eq("student_id",id).order("approved_at",{ascending:false}).limit(20),
 sb.from("efg_personal_targets").select("*").eq("user_id",id).maybeSingle(),
 sb.from("efg_food_plans").select("*").eq("student_id",id).maybeSingle()
 ]);
 const error=results.find(x=>x.error)?.error;
 if(error)throw error;
 state.diary=results[0].data||null;state.renderedDay=today();state.progressLogs=results[1].data||[];state.weights=results[2].data||[];state.activities=results[3].data||[];state.goals=results[4].data||[];state.personalTargets=results[5].data||null;state.foodPlan=results[6].data||null;
}
async function loadOrgAndPayments(){
 const id=state.session.user.id,role=state.profile.role;
 let orgResult;
 if(role==="coach")orgResult=await sb.from("efg_organizations").select("*").eq("coach_id",id).maybeSingle();
 if(role==="admin")orgResult=await sb.from("efg_organizations").select("*").eq("coach_id",id).eq("is_test",true).maybeSingle();
 if(role==="student")orgResult=await sb.from("efg_organizations").select("*").eq("id",state.profile.organization_id).maybeSingle();
 if(orgResult?.error)throw orgResult.error;
 state.org=orgResult?.data||null;
 const [pay,bill]=await Promise.all([sb.from("efg_payments").select("*").order("created_at",{ascending:false}).limit(70),sb.from("efg_billing_settings").select("alias,additional_aliases").eq("id",1).maybeSingle()]);
 if(pay.error)throw pay.error;
 if(bill.error)throw bill.error;
 state.payments=pay.data||[];state.platformAlias=bill.data?.alias||null;state.platformAliases=[state.platformAlias,...(bill.data?.additional_aliases||[])].filter(Boolean);
}
async function loadCoachIntakeGoals(){
 state.coachIntakeGoals={};state.coachIntakeVerified=false;
 const ids=(state.roster||[]).filter(p=>p.active&&coachRosterConsent[p.user_id]===true).map(p=>p.user_id);
 if(!ids.length){state.coachIntakeVerified=true;return;}
 try{
  // Only consented students. Database RLS remains authoritative for each row.
  const {data,error}=await sb.from("efg_goals").select("student_id,id").in("student_id",ids).limit(500);
  if(error)throw error;
  for(const goal of data||[])state.coachIntakeGoals[goal.student_id]=true;
  state.coachIntakeVerified=true;
 }catch(error){console.warn("EFG intake goal summary unavailable:",error.message);}
}
async function loadCoachRosterConsent(){
 // One source of truth for real coaches AND the admin's test-coach workspace.
 // Read only; never infer consent from enrollment or modify a student's decision.
 coachRosterConsent={};
 const ids=(state.roster||[]).map(p=>p.user_id).filter(Boolean);
 if(!ids.length)return;
 const {data,error}=await sb.from("efg_consents").select("student_id,accepted").in("student_id",ids);
 if(error)throw error;
 for(const consent of data||[])coachRosterConsent[consent.student_id]=consent.accepted===true;
}
async function loadRoleData(){
 const role=state.profile.role;
 if(role==="admin"){
  const [o,inv]=await Promise.all([sb.from("efg_organizations").select("*").order("created_at",{ascending:false}),sb.from("efg_invitations").select("*").eq("role","coach").order("created_at",{ascending:false})]);
  if(o.error||inv.error)throw o.error||inv.error;
  state.orgs=(o.data||[]).filter(o=>!o.is_test);state.invitations=inv.data||[];
  if(state.org?.is_test){
   const [students,pending]=await Promise.all([sb.from("efg_profiles").select("*").eq("organization_id",state.org.id).eq("role","student"),sb.from("efg_invitations").select("*").eq("organization_id",state.org.id).eq("role","student")]);
   if(students.error||pending.error)throw students.error||pending.error;
   state.roster=students.data||[];state.testInvitations=pending.data||[];
   await loadCoachRosterConsent();
   await loadCoachIntakeGoals();
   await coachIntakeFlow.loadCoach((state.roster||[]).filter(p=>p.active&&coachRosterConsent[p.user_id]===true).map(p=>p.user_id));
   if(state.selectedStudent&&state.roster.some(p=>p.user_id===state.selectedStudent))await loadStudentDetail(state.selectedStudent);
  }
 }
 if(role==="coach"){
  const org=state.org;
  if(!org)throw new Error("Tu espacio de entrenador todavía no está listo.");
  const [r,inv]=await Promise.all([sb.from("efg_profiles").select("*").eq("organization_id",org.id).eq("role","student"),sb.from("efg_invitations").select("*").eq("organization_id",org.id).eq("role","student")]);
  if(r.error||inv.error)throw r.error||inv.error;
  state.roster=r.data||[];state.invitations=inv.data||[];
  await loadCoachRosterConsent();
  await loadCoachIntakeGoals();
   await coachIntakeFlow.loadCoach((state.roster||[]).filter(p=>p.active&&coachRosterConsent[p.user_id]===true).map(p=>p.user_id));

  if(state.selectedStudent&&state.roster.some(p=>p.user_id===state.selectedStudent))await loadStudentDetail(state.selectedStudent);
 }
 if(role==="student"){
  const c=await sb.from("efg_consents").select("*").eq("student_id",state.session.user.id).maybeSingle();
  if(c.error)throw c.error;
  state.consent=c.data||null;
 }
}
async function loadStudentDetail(studentId){
 if(!state.roster.some(p=>p.user_id===studentId&&p.active))throw new Error("Alumno no autorizado.");
 state.selectedStudent=studentId;
 state.pendingGoal=null;state.calculatedGoalBase=null;state.pendingGoalRevision=null;state.coachGuidedDraft=null;state.coachIntakePrefill=null;state.coachIntakeGuidePreview=null;
 const c=await sb.from("efg_consents").select("*").eq("student_id",studentId).maybeSingle();
 if(c.error)throw c.error;
 state.consent=c.data;
 // Never reuse a previously cached shared intake after its consent or record changed.
 await coachIntakeFlow.refreshCoachDetail(studentId,c.data?.accepted===true);
 state.rewardApproval=null;state.rewardFeatureReady=false;
 state.coachFoodPlan=null;
 if(!c.data?.accepted){state.coachLogs=[];state.coachProgressLogs=[];state.coachWeights=[];state.coachGoals=[];state.coachActivities=[];return;}
 const results=await Promise.all([
 sb.from("efg_daily_logs").select("*").eq("student_id",studentId).order("log_day",{ascending:false}).limit(14),
 sb.from("efg_daily_logs").select("log_day,meals,sports,skipped").eq("student_id",studentId).gte("log_day",(()=>{const d=new Date(today()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-89);return d.toISOString().slice(0,10)})()).order("log_day",{ascending:false}).limit(100),
 sb.from("efg_weights").select("*").eq("student_id",studentId).order("measured_on",{ascending:false}).limit(20),
 sb.from("efg_activities").select("*").eq("student_id",studentId).order("activity_day",{ascending:false}).limit(15),
 sb.from("efg_goals").select("*").eq("student_id",studentId).order("approved_at",{ascending:false}).limit(20),
 sb.from("efg_food_plans").select("*").eq("student_id",studentId).maybeSingle()
 ]);
 const err=results.find(x=>x.error)?.error;if(err)throw err;
 state.coachLogs=results[0].data||[];state.coachProgressLogs=results[1].data||[];state.coachWeights=results[2].data||[];state.coachActivities=results[3].data||[];state.coachGoals=results[4].data||[];state.coachFoodPlan=results[5].data||null;
 await loadSundayPermission(studentId);
}
async function refresh(){
 if(state.loading)return;
 state.loading=true;
 try{
  const result=await sb.auth.getUser();
  if(result.error){
   // Un error de red no debe confundirse con ausencia de sesión.
   // No se muestran datos privados hasta que getUser valide la identidad.
   let savedSession=null;
   try{savedSession=(await sb.auth.getSession()).data?.session||null;}catch(_){}
   if(savedSession){sessionConnectionRetry();return;}
   state.profile=null;return loginView("Tu sesión no está disponible. Volvé a ingresar si hace falta.");
  }
  if(!result.data.user){state.profile=null;return loginView();}
  const id=result.data.user.id;
  const switchingUser=state.session?.user?.id!==id;
  if(switchingUser){state.habitualSelection={};state.selectedStudent=null;state.tab="home";state.rewardOpened=false;state.rewardApproval=null;state.rewardFeatureReady=false;}
  state.session={user:result.data.user};
  let claim=await sb.rpc("efg_claim_invitation");
  if(claim.error){state.profile=null;return unauthorized(claim.error.message);}
  let p=await sb.from("efg_profiles").select("*").eq("user_id",id).single();
  if(p.error)throw p.error;
  state.profile=p.data;
  if(switchingUser){state.tab=state.profile.role==="coach"?"coach":state.profile.role==="admin"?"admin":"home";}
  if(!state.profile.active){state.profile=null;return unauthorized("Tu cuenta está inactiva. Contactá al administrador correspondiente.");}
  await Promise.all([loadPersonalData(),loadOrgAndPayments()]);
  await Promise.all([loadCloudHabituales(),loadCloudRecipes(),loadMyWeeklyReports()]);
  await loadRoleData();
  if(state.profile.role==="student")await coachIntakeFlow.loadStudent();
  if(state.profile.role==="student")await loadSundayPermission(id);
  await inbox.refresh();
  if(state.profile.role==="student"&&state.consent&&!state.consent.accepted&&state.consent.updated_at===state.consent.created_at){
   // Autorización explícita en pantalla de código; nunca volver a activar si se revocó.
   const acceptedNotice=sessionStorage.getItem("efgNutritionCoachConsent:"+id)==="yes";
   if(acceptedNotice){const result=await sb.from("efg_consents").update({accepted:true,email_report_opt_in:false,updated_at:new Date().toISOString()}).eq("student_id",id).eq("accepted",false).select().maybeSingle();if(!result.error&&result.data)state.consent=result.data;sessionStorage.removeItem("efgNutritionCoachConsent:"+id);}
  }
  await loadWelcomeStatus();
  await render();
 }catch(e){fail(e);root.innerHTML='<div class="pilot-loader"><h2>Hubo un problema de conexión.</h2><button class="btn" data-act="retry">Reintentar</button><p>'+escapeHTML(e.message)+'</p></div>';}
 finally{state.loading=false;}
}
// Explicit pull-to-refresh: re-fetch role-authorized data but never navigate or reload the page.
let refreshingWorkspace=false;
async function refreshVisibleWorkspace(){
 if(refreshingWorkspace||state.loading)throw Error("Ya hay una actualización en curso.");
 if(!state.profile||!state.session?.user?.id||state.welcomePending)throw Error("Ingresá a tu cuenta para actualizar.");
 refreshingWorkspace=true;
 const id=state.session.user.id,originalView=activeViewKey();
 const selected=state.selectedStudent,goalId=state.coachGoals[0]?.id;
 const coachEdits={guided:state.coachGuidedDraft,pending:state.pendingGoal,
  base:state.calculatedGoalBase,revision:state.pendingGoalRevision};
 try{
  // This check is independent of the potentially slow data synchronization.
  void versionNotice.check({force:true});
  const user=await sb.auth.getUser();
  if(user.error||user.data?.user?.id!==id)throw Error("No se pudo validar la sesión. Revisá tu conexión e intentá nuevamente.");
  await Promise.all([loadPersonalData(),loadOrgAndPayments()]);
  await Promise.all([loadCloudHabituales(),loadCloudRecipes(),loadMyWeeklyReports()]);
  await loadRoleData();
  // loadStudentDetail clears drafts to protect switching pupils; restore ONLY for
  // the same pupil with active consent and the same approved nutritional goal.
  if(selected&&state.selectedStudent===selected&&state.consent?.accepted&&
     state.coachGoals[0]?.id===goalId&&activeViewKey()===originalView){
   state.coachGuidedDraft=coachEdits.guided;
   state.pendingGoal=coachEdits.pending;
   state.calculatedGoalBase=coachEdits.base;
   state.pendingGoalRevision=coachEdits.revision;
  }
  await inbox.refresh();
  if(state.tab==="messages"){
   // Leave the message composer mounted to avoid dropping the keyboard or draft.
   await messages.refresh();
  }else if(state.tab==="notifications"){
   inbox.repaint();
  }else{
   await render(); // Same-view continuity keeps accordions, draft inputs and scroll.
  }
 }finally{refreshingWorkspace=false;}
}
async function saveWeight(){
 const kg=Number(document.getElementById("weightKg")?.value),day=document.getElementById("weightDay")?.value,time=document.getElementById("weightTime")?.value;
 if(!(kg>=20&&kg<=400&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))throw new Error("Ingresá fecha, hora y peso válidos.");
 if(day>today())throw new Error("No se puede guardar un pesaje con fecha futura.");
 const parsed=new Date(day+"T12:00:00Z");
 if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==day)throw new Error("La fecha de pesaje no es válida.");
 const {error}=await sb.from("efg_weights").upsert({student_id:state.session.user.id,measured_on:day,measured_time:time,kg},{onConflict:"student_id,measured_on"});
 if(error)throw error;
 await loadPersonalData();await render();notify("Pesaje guardado con fecha y hora.");
}
async function saveActivity(){
 const steps=Number(document.getElementById("activitySteps").value),mins=Number(document.getElementById("activityMinutes").value),kind=document.getElementById("activityKind").value;
 if(!Number.isFinite(steps)||!Number.isFinite(mins)||steps<0||steps>100000||mins<0||mins>1440)throw new Error("Revisá los valores de pasos y ejercicio.");
 const {error}=await sb.from("efg_activities").upsert({student_id:state.session.user.id,activity_day:today(),steps,exercise_minutes:mins,kind},{onConflict:"student_id,activity_day"});
 if(error)throw error;notify("Actividad registrada.");await loadPersonalData();await render();
}
async function savePersonalTargets(){
 let n=id=>{const input=document.getElementById(id);return input.value.trim()===''?NaN:Number(input.value);};
 let vals={user_id:state.session.user.id,kcal:n("selfK"),protein_g:n("selfP"),carb_g:n("selfC"),fat_g:n("selfF"),fiber_g:n("selfFi"),updated_at:new Date().toISOString()};
 if(!Number.isFinite(vals.kcal)||vals.kcal<1200||vals.kcal>10000||Object.values(vals).slice(2,6).some(v=>!Number.isFinite(v)||v<0))throw new Error("Objetivos personales fuera de rango.");
 let {error}=await sb.from("efg_personal_targets").upsert(vals,{onConflict:"user_id"});
 if(error)throw error;state.personalTargets=vals;notify("Tus objetivos personales se actualizaron.");await render();
}
async function sendProof(){
 let input=document.getElementById("payFile"),file=input.files[0],amount=Number(document.getElementById("payAmount").value),period=document.getElementById("payPeriod").value;
 let kind=state.profile.role==="student"?"student_coach":"coach_efg";
 if(kind==="coach_efg"&&!state.platformAlias)throw new Error("EFG aún no configuró su alias oficial. No envíes un comprobante hasta verificar el destinatario.");
 if(kind==="student_coach"&&!state.org?.payment_alias)throw new Error("Tu coach todavía no configuró su alias.");
 if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880)throw new Error("Elegí una foto JPG, PNG o WebP menor a 5 MB.");
 if(!Number.isFinite(amount)||amount<=0||amount>10000000||!/^\d{4}-\d{2}$/.test(period))throw new Error("Revisá importe y período.");
 const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
 const name=state.session.user.id+"/"+crypto.randomUUID()+"."+ext;
 let upload=await sb.storage.from("efg-receipts").upload(name,file,{upsert:false,contentType:file.type});
 if(upload.error)throw upload.error;
 let payment=kind==="coach_efg"?await sb.rpc("efg_submit_coach_payment",{p_amount_ars:amount,p_period:period,p_receipt_path:name,p_alias:document.getElementById("platformPayAlias")?.value||state.platformAlias||""}):await sb.rpc("efg_submit_payment",{p_kind:kind,p_amount_ars:amount,p_period:period,p_receipt_path:name});
 if(payment.error)throw payment.error;
 await loadOrgAndPayments();await render();notify("Comprobante registrado. El destinatario deberá verificar la transferencia.");
}
async function onePaymentAction(id,status){
 const p=state.payments.find(x=>x.id===id);
 if(!p||p.recipient_id!==state.session.user.id||p.status!=="pending")throw new Error("No tenés permiso para esta operación.");
 const answer=window.confirm(status==="approved"?"¿Verificaste que el dinero está acreditado en tu cuenta bancaria?":"¿Rechazar este comprobante?");
 if(!answer)return;
 let r=await sb.rpc("efg_confirm_payment",{p_payment:id,p_status:status});if(r.error)throw r.error;
 await loadOrgAndPayments();await render();notify("Estado del comprobante actualizado.");
}
async function showProof(path){
 const payment=state.payments.find(p=>p.receipt_path===path);
 if(!payment)throw new Error("No se encontró el comprobante autorizado.");
 let r=await sb.storage.from("efg-receipts").createSignedUrl(path,60);
 if(r.error)throw r.error;
 window.open(r.data.signedUrl,"_blank","noopener,noreferrer");
}
async function mainClick(event){
 let el=event.target.closest("button");if(!el)return;
 if(state.renderedDay&&state.renderedDay!==today()){
  await ensureCurrentDay();await render();
  notify("Nuevo día: lo anterior sigue guardado en tu historial.");
  // El primer toque de navegación o de abrir una comida NO se descarta.
  // No continuar acciones que pudieran confirmar formularios antiguos.
  if(el.dataset.setmeal){if(studentPlanPending()){state.tab="intake";await render();return;}openMealDialog(el.dataset.setmeal);return;}
  if(el.dataset.tab){state.tab=studentPlanPending()&&!["intake","messages","privacy","notifications"].includes(el.dataset.tab)?"intake":el.dataset.tab;await render();window.scrollTo(0,0);return;}
  return;
 }
 if(el.dataset.act==="openWeeklyReward"){state.rewardOpened=!state.rewardOpened;await render();document.getElementById("efgRewardReveal")?.scrollIntoView({block:"nearest"});return;}
 if(el.dataset.rewardApproval){await updateSundayPermission(el.dataset.rewardApproval==="yes");return;}
 if(el.dataset.fitfilter){state.fitFilter=el.dataset.fitfilter;await render();document.querySelector(".efg-fit-library")?.scrollIntoView({block:"start"});return;}
 if(el.dataset.fitrecipe){return registerFitRecipe(el.dataset.fitrecipe);}
 if(el.dataset.copyalias||el.dataset.copyplatform){
 const isPlatform=el.dataset.copyplatform==="1";
 if(isPlatform&&state.profile.role!=="coach")throw new Error("Solo los coaches pueden copiar el alias oficial desde este acceso.");
 const alias=isPlatform?(document.getElementById("platformPayAlias")?.value||state.platformAlias):state.org?.payment_alias;
 if(!alias)throw new Error(isPlatform?"EFG todavía no configuró el alias central.":"Tu coach todavía no configuró un alias.");
 if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(alias);notify("Alias copiado.");}
 else window.prompt("Copiá el alias:",alias);
 return;
}
 if(el.dataset.progressRange){const next=Number(el.dataset.progressRange);if([7,30,90].includes(next)){state.progressRange=next;await render();document.querySelector(".efg-progress-dashboard")?.scrollIntoView({block:"start"});}return;}
 if(el.dataset.scrollto){const target=document.getElementById(el.dataset.scrollto);if(target){target.setAttribute("tabindex","-1");target.focus({preventScroll:true});target.scrollIntoView({behavior:"smooth",block:"start"});}return;}
 if(el.dataset.tab){
  state.tab=studentPlanPending()&&!["intake","messages","privacy","notifications"].includes(el.dataset.tab)?"intake":el.dataset.tab;
  if(state.tab==="payments")await loadOrgAndPayments();
  if(state.tab==="reports"&&!state.selectedStudent){
   const student=(state.roster||[]).find(p=>p.active);
   if(student)await loadStudentDetail(student.user_id);
  }
  await render();
  window.scrollTo(0,0);
  return;
}
 if(el.dataset.intakeMessage){
 const p=(state.roster||[]).find(p=>p.user_id===el.dataset.intakeMessage&&p.active);
 if(!p)throw new Error("Ese alumno no está en tu lista de ingresos.");
 messages.selectStudent(p.user_id);state.tab="messages";await render();return;
}
if(el.dataset.studentstatus){
 const student=state.roster.find(x=>x.user_id===el.dataset.studentstatus);
 if(!student)throw new Error("Ese alumno no pertenece a tus cupos.");
 const next=!student.active;
 if(!window.confirm(next
  ?"¿Reactivar a "+student.nickname+"? Volverá a ocupar un cupo y tendrá que autorizar de nuevo el seguimiento."
  :"¿Dar de baja a "+student.nickname+"? Liberará su cupo y se revocará el permiso del coach. Sus registros NO se borrarán."))return;
 const {error}=await sb.rpc("efg_set_student_active",{p_student:student.user_id,p_active:next});
 if(error)throw error;
 if(state.selectedStudent===student.user_id){state.selectedStudent=null;state.consent=null;state.coachLogs=[];state.coachGoals=[];state.coachWeights=[];state.coachActivities=[];state.coachFoodPlan=null;}
 await loadRoleData();await render();notify(next?"Alumno reactivado, pendiente de nuevo consentimiento.":"Alumno dado de baja y cupo recuperado; datos conservados.");return;
}
if(el.dataset.deleteinvite){
 const invs=state.profile.role==="admin"&&state.tab==="admin"?state.invitations:(state.profile.role==="admin"&&state.org?.is_test?state.testInvitations:state.invitations);
 const inv=invs.find(x=>x.id===el.dataset.deleteinvite);
 if(!inv||inv.claimed_by)throw new Error("El correo ya fue utilizado o no existe.");
 if(!window.confirm("¿Eliminar el correo "+inv.email+" de las invitaciones? Es definitivo y libera el cupo."))return;
 const {error}=await sb.rpc("efg_delete_pending_invitation",{p_invitation:inv.id});
 if(error)throw error;
 await loadRoleData();await render();notify("Correo eliminado de las invitaciones pendientes.");return;
}
if(el.dataset.reportstudent){
 const p=(state.roster||[]).find(p=>p.user_id===el.dataset.reportstudent&&p.active);
 if(!p)throw new Error("No tenés permiso para consultar este alumno.");
 state.reportDate=null;await loadStudentDetail(p.user_id);await render();
 document.getElementById("coachDailyReport")?.scrollIntoView?.({behavior:"smooth",block:"start"});return;
}
if(el.dataset.coachname){const id=el.dataset.coachname;const pupil=(state.roster||[]).find(p=>p.user_id===id);if(!pupil)return;const current=coachPreferredNames()[id]||"";const value=prompt("Nombre preferido (vacío para usar el original)",current);if(value===null)return;const clean=value.trim().slice(0,35);const names=coachPreferredNames();if(clean)names[id]=clean;else delete names[id];localStorage.setItem("efg-coach-names-"+(state.session?.user?.id||"local"),JSON.stringify(names));await render();notify("Nombre de visualización guardado en este dispositivo.");return;}
if(el.dataset.student){
 if(state.tab==="coach"||state.tab==="testCoach")state.tab="coachStudents";
 state.reportDate=null;
 await loadStudentDetail(el.dataset.student);
 await render();
 document.getElementById("studentFollowPanel")?.scrollIntoView?.({behavior:"smooth",block:"start"});
 notify("Ficha de "+(state.roster.find(p=>p.user_id===el.dataset.student)?.nickname||"alumno")+" abierta.");
 return;
}
if(el.dataset.foodbulk){
 const group=root.querySelector('.coach-food-group[data-foodgroup="'+el.dataset.foodbulk+'"]');
 if(!group)return;
 const checked=el.dataset.foodchecked==="yes";
 group.querySelectorAll('input[data-coachfood]').forEach(x=>x.checked=checked);
 updateCoachFoodCount();return;
}
 if(el.dataset.scrollplan){document.getElementById("planSuggestionCard")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
 if(el.dataset.act==="publishWeeklyReport"){await publishWeeklyReport();return;}
 if(el.dataset.act==="copyWeeklyDraft"){const draft=document.getElementById("weeklyCoachDraftText")?.value?.trim();if(!draft)throw Error("El borrador está vacío.");await navigator.clipboard.writeText(draft);notify("Texto revisado copiado. El envío al alumno queda a cargo del entrenador.");return;}
 if(el.dataset.coachsection){const sec=document.getElementById(el.dataset.coachsection);if(!sec)return;if(sec.tagName==="DETAILS")sec.open=true;sec.scrollIntoView({behavior:"smooth",block:"start"});return;}
 if(el.dataset.coachfilter){const target=document.getElementById("coachRosterSection");target?.scrollIntoView({behavior:"smooth",block:"start"});const btn=target?.querySelector('[data-rosterfilter="'+el.dataset.coachfilter+'"]');btn?.click();return;}
 if(el.dataset.coachjump){const target=document.getElementById(el.dataset.coachjump);if(target)target.scrollIntoView({behavior:"smooth",block:"start"});return;}
 if(el.dataset.rosterfilter){
  root.dataset.rosterFilter=el.dataset.rosterfilter;
  const search=document.getElementById("coachRosterSearch");
  if(search)search.dispatchEvent(new Event("input",{bubbles:true}));
  for(const button of root.querySelectorAll("[data-rosterfilter]")){button.classList.toggle("light",button.dataset.rosterfilter===el.dataset.rosterfilter);button.classList.toggle("ghost",button.dataset.rosterfilter!==el.dataset.rosterfilter);}
  return;
 }
 if(el.dataset.recipedelete){const recipe=cloudRecipes.find(r=>r.id===el.dataset.recipedelete);if(!recipe)return;if(!confirm("¿Eliminar la receta «"+recipe.name+"»? Los registros anteriores no se modificarán."))return;const {error}=await sb.from("efg_personal_recipes").delete().eq("id",recipe.id).eq("student_id",state.session.user.id);if(error)throw error;cloudRecipes=cloudRecipes.filter(r=>r.id!==recipe.id);notify("Receta eliminada.");return render();}
 if(el.dataset.act==="createPersonalRecipe"){await createPersonalRecipe();return;}
 if(el.dataset.act==="registerPersonalRecipe"){registerPersonalRecipe();return;}
 if(el.dataset.act==="confirmRecipeRegistration"){await confirmRecipeRegistration();return;}
 if(el.dataset.act==="closeRecipeRegistration"){closeRecipeRegistration();return;}
 if(el.dataset.habitualsave){await habitualAction(el.dataset.habitualsave,"save");return;}
 if(el.dataset.habitualapply){await applyChosenHabitual(el.dataset.habitualapply);return;}
 if(el.dataset.habitualdelete){await deleteChosenHabitual(el.dataset.habitualdelete);return;}
 if(el.dataset.habitualuse){await habitualAction(el.dataset.habitualuse,"use");return;}
 if(el.dataset.setmeal){openMealDialog(el.dataset.setmeal);return;}
 if(el.dataset.planmode){state.plannerMode=el.dataset.planmode==="both"?"both":"dinner";state.plannerDraftGrams={};return render();}
 if(el.dataset.planextra){
  const key=el.dataset.planextra,foodId=el.dataset.planfood;
  const parts=parsePlannerKey(key);
  if(!parts||!["vegetable","fat"].includes(parts[1]))throw new Error("Extra inválido.");
  const candidate=allPlannerFoods(foods,allowedFoods()).find(f=>f.id===foodId);
  if(!candidate)throw new Error("Este alimento no está disponible en tu catálogo.");
  const first=parts[0]+"|vegetable",second=parts[0]+"|fat";
  const target=state.plannerSelections[first]&&state.plannerSelections[first]!=="none"?second:first;
  state.plannerSelections[target]=candidate.id;
  refreshPlannerCard();
  return;
 }
 if(el.dataset.planadd){return addPlannedFood(el.dataset.planadd);}
 if(el.dataset.planopenmeal){return openPlannedFoodEditor(el.dataset.planopenmeal);}
 if(el.dataset.removefood){
  const [slot,indexValue]=el.dataset.removefood.split(":");
  const index=Number(indexValue),d=activeDiary();
  if(!mealSlots.some(m=>m[0]===slot)||!Number.isInteger(index)||index<0||index>=(d.meals?.[slot]?.length||0))throw new Error("No encontramos ese alimento.");
  d.meals[slot].splice(index,1);d.skipped=d.skipped||{};d.skipped._closed=false;
  await saveDiary();notify("Alimento eliminado. Los macros se actualizaron.");return;
 }
 if(el.dataset.removesupp!==undefined){
 const index=Number(el.dataset.removesupp),d=activeDiary(),item=d.sports?.[index];
 if(!Number.isInteger(index)||!item||!supplementRecord(item))throw new Error("No encontramos ese suplemento.");
 d.sports.splice(index,1);d.skipped=d.skipped||{};d.skipped._closed=false;
 await saveDiary();notify("Suplemento eliminado.");return;
}
 if(el.dataset.clearm){let d=activeDiary();d.meals[el.dataset.clearm]=[];d.skipped=d.skipped||{};d.skipped._closed=false;return saveDiary();}
 if(el.dataset.removesport!==undefined){let d=activeDiary();d.sports.splice(Number(el.dataset.removesport),1);d.skipped=d.skipped||{};d.skipped._closed=false;return saveDiary();}
 if(el.dataset.approve)return onePaymentAction(el.dataset.approve,"approved");
 if(el.dataset.reject)return onePaymentAction(el.dataset.reject,"rejected");
 if(el.dataset.proof)return showProof(el.dataset.proof);
 if(el.dataset.orgstatus){const org=state.orgs.find(x=>x.id===el.dataset.orgstatus);if(!org)throw Error("Organización no encontrada.");if(!window.confirm("¿Suspender la licencia de "+org.name+"? Los registros quedan intactos."))return;const {error}=await sb.rpc("efg_update_subscription",{p_org:org.id,p_status:"suspended"});if(error)throw error;await loadRoleData();await render();notify("Licencia suspendida.");return;}
 if(el.dataset.revokeinvite){if(!window.confirm("¿Cancelar esta invitación pendiente?"))return;const {error}=await sb.rpc(state.profile.role==="admin"&&state.org?.is_test?"efg_revoke_test_invitation":"efg_revoke_invitation",{p_invitation:el.dataset.revokeinvite});if(error)throw error;await loadRoleData();await render();notify("Invitación cancelada; el cupo quedó disponible.");return;}
 if(el.dataset.testseats){
  if(state.profile.role!=="admin"||!state.org?.is_test||state.org.coach_id!==state.session.user.id)throw new Error("No tenés permisos para modificar estos cupos de prueba.");
  const value=window.prompt("Nuevo límite de alumnos de prueba (1 a 10000):",String(state.org.seat_limit));
  if(value===null)return;
  const count=Number(value),used=state.roster.filter(p=>p.active).length+state.testInvitations.filter(i=>i.role==="student"&&!i.claimed_by&&!i.revoked_at).length;
  if(!Number.isInteger(count)||count<used||count>10000||count<1)throw new Error("Elegí un número entero que no sea menor que los cupos actualmente ocupados.");
  const {error}=await sb.rpc("efg_set_seats",{p_org:state.org.id,p_seats:count});if(error)throw error;
  state.org.seat_limit=count;await render();notify("Límite de alumnos de prueba actualizado.");return;
 }
 if(el.dataset.contract){
  if(state.profile.role!=="admin")throw Error("Solo EFG modifica contratos.");
  const org=state.orgs.find(x=>x.id===el.dataset.contract);if(!org)throw Error("Contrato no encontrado.");
  const a=window.prompt("Cupos contratados para "+org.name+":",String(org.seat_limit));if(a===null)return;
  const b=window.prompt("Precio mensual acordado (ARS):",String(org.license_fee_ars||""));if(b===null)return;
  const seats=Number(a),fee=Number(b);
  if(!Number.isInteger(seats)||seats<1||seats>10000||!Number.isFinite(fee)||fee<=0||fee>10000000)throw Error("Cupo o importe inválido.");
  if(!window.confirm("Cambiar plan puede suspender la licencia hasta comprobar el nuevo pago. ¿Continuar?"))return;
  const {error}=await sb.rpc("efg_set_coach_plan",{p_org:org.id,p_seats:seats,p_fee_ars:fee});
  if(error)throw error;await loadRoleData();await render();notify("Contrato actualizado; verificá el pago antes de activar.");return;
 }
 if(el.dataset.activatecoach){
  if(state.profile.role!=="admin")throw Error("Solo EFG activa licencias.");
  const org=state.orgs.find(x=>x.id===el.dataset.activatecoach);if(!org)throw Error("Coach no encontrado.");
  if(!window.confirm("¿Verificaste el pago acreditado y aprobado del contrato actual de "+org.name+"?"))return;
  const {error}=await sb.rpc("efg_activate_paid_coach",{p_org:org.id});
  if(error)throw error;await loadRoleData();await render();notify("Licencia activada para el período confirmado.");return;
 }
 const action=el.dataset.act;if(!action)return;
 if(action==="logout"){state.planAccess=null;state.studentIntake=null;state.planAccessSupported=false;state.coachIntakeForms={};state.coachIntakeAccess={};state.coachIntakePrefill=null;state.coachIntakeGuidePreview=null;await sb.auth.signOut();state.habitualSelection={};state.session=null;state.profile=null;state.tab="home";state.otpEmail=null;state.welcomePending=false;await inbox.refresh();return loginView();}
 if(action==="completeWelcome")return completeWelcome();
 if(action==="deleteStudentIntake")return coachIntakeFlow.deleteOwn();
 if(action==="publishCoachStudentPlan")return coachIntakeFlow.publish();
 if(action==="prepareCoachPlanFromIntake"){
  const eligible=state.profile?.role==="coach"||(state.profile?.role==="admin"&&state.org?.is_test);
  const studentId=state.selectedStudent;
  if(!eligible||!studentId||!state.roster.some(p=>p.active&&p.user_id===studentId))
   throw new Error("Solo podés preparar un plan de un alumno activo y autorizado.");
  await loadStudentDetail(studentId); // Revalidate RLS/consent; never trust cached intake.
  state.coachIntakePrefill=createCoachCalculatorPrefill({
   intake:state.coachIntakeForms?.[studentId],studentId,coachAuthorized:state.consent?.accepted===true
  });
  state.coachIntakeGuidePreview=null;
  state.tab="coachStudents";await render();
  const panel=document.getElementById("coachStudentGoals");
  if(panel){panel.open=true;panel.scrollIntoView?.({behavior:"smooth",block:"start"});}
  notify("Datos autorizados precargados. Confirmá y calculá la propuesta antes de aprobar.");
  return;
 }
 if(action==="checkCoachPlan"){await coachIntakeFlow.loadStudent();await render();return;}
 if(action==="loginBack"){state.otpEmail=null;return loginView();}
 if(action==="resendOtp"){return requestOtp(state.otpEmail);}
 if(action==="retry")return refresh();
 if(action==="refreshCoachReport"){
  if(!state.selectedStudent||!state.consent?.accepted)throw new Error("Seleccioná un alumno que haya autorizado el seguimiento.");
  await loadStudentDetail(state.selectedStudent);
  await render();
  document.getElementById("coachDailyReport")?.scrollIntoView?.({behavior:"smooth",block:"start"});
  notify("Informe actualizado con los consumos registrados.");
  return;
 }
 if(action==="copyDailyReport"){
  const p=state.roster.find(x=>x.user_id===state.selectedStudent);
  if(!p||!state.consent?.accepted)throw new Error("Acceso no autorizado.");
  const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
  const content=nutritionReportText(report,p.nickname,state.reportDate||report.today?.date||report.days[0]?.date);
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(content);notify("Informe del día copiado.");}
  else window.prompt("Copiá el informe:",content);
  return;
 }
 if(action==="closeMeal"){closeMealDialog();return;}
 if(action==="saveSelectedMeal"){return saveSelectedMeal();}
 if(action==="addDailySupplement"){return addDailySupplement();}
 if(action==="saveDayComment"){return saveDayComment();}
 if(action==="addSport"){let id=document.getElementById("sportItem").value,qty=Number(document.getElementById("sportQty").value),when=document.getElementById("sportTime").value,product=sports.find(x=>x.id===id);if(!product||supplementRecord(product)||product.id==="whey")throw new Error("Registrá ese producto en Mi alimentación.");if(!Number.isFinite(qty)||qty<=0||qty>3000)throw new Error("Cantidad inválida.");let d=activeDiary();d.sports.push(normItem(product,qty,when));d.skipped=d.skipped||{};d.skipped._closed=false;await saveDiary();notify("Consumo registrado.");return;}
 if(action==="revokeConsent"||action==="grantConsent"){
 const accepted=action==="grantConsent";

 const {data,error}=await sb.from("efg_consents").update({
  accepted,email_report_opt_in:false,updated_at:new Date().toISOString()
 }).eq("student_id",state.session.user.id).select().single();
 if(error)throw error;
 state.consent=data;await render();
 notify(!accepted?"Permisos revocados.":"Seguimiento autorizado dentro de EFG Nutrition.");
 return;
}
 if(action==="saveWeight")return saveWeight();
 if(action==="saveActivity")return saveActivity();
 if(action==="inviteCoach"){
  if(state.profile.role!=="admin")throw Error("Solo EFG puede contratar coaches.");
  const email=document.getElementById("newCoachEmail").value.trim(),name=document.getElementById("newCoachName").value.trim();
  const seats=Number(document.getElementById("newCoachSeats").value),fee=Number(document.getElementById("newCoachFee").value);
  if(!Number.isInteger(seats)||seats<1||seats>10000||!Number.isFinite(fee)||fee<=0||fee>10000000)throw Error("Definí la cantidad de cupos y el precio mensual del contrato.");
  if(!state.platformAlias)throw Error("Configurá primero el alias oficial de EFG.");
  if(!window.confirm("¿Invitar a "+name+" con "+seats+" cupos a "+fee+" ARS/mes? La licencia quedará pendiente."))return;
  const {error}=await sb.rpc("efg_offer_coach",{p_email:email,p_name:name,p_seats:seats,p_fee_ars:fee});
  if(error)throw error;await loadRoleData();await render();notify("Invitación enviada, licencia pendiente de pago y activación.");return;
 }
 if(action==="inviteStudent"){const email=document.getElementById("studentEmail").value.trim(),name=document.getElementById("studentName").value.trim();let r=await sb.rpc(state.profile.role==="admin"&&state.org?.is_test?"efg_invite_test_student":"efg_invite_student",{p_email:email,p_name:name});if(r.error)throw r.error;await loadRoleData();await render();notify("Alumno habilitado en los cupos de este coach.");return;}
 if(action==="coachAlias"){if(!(state.profile.role==="coach"||(state.profile.role==="admin"&&state.org?.is_test&&state.org.coach_id===state.session.user.id)))throw new Error("No tenés permiso para editar este alias.");let alias=document.getElementById("coachAlias").value.trim();let r=await sb.rpc("efg_set_coach_alias",{p_alias:alias});if(r.error)throw r.error;await loadOrgAndPayments();await render();notify("Alias de cobro guardado.");return;}
 if(action==="savePlatformAlias"){let alias=document.getElementById("platformAlias").value.trim(),two=document.getElementById("platformAlias2").value.trim(),three=document.getElementById("platformAlias3").value.trim();let r=await sb.rpc("efg_set_platform_aliases",{p_primary:alias,p_secondary:two||null,p_tertiary:three||null});if(r.error)throw r.error;await loadOrgAndPayments();await render();notify("Alias oficiales de EFG actualizados.");return;}
 if(action==="previewMacros"){const n=id=>Number(document.getElementById(id).value);const input={age:n("previewAge"),height:n("previewHeight"),weight:n("previewWeight"),activity:n("previewActivity"),sex:document.getElementById("previewSex").value,model:document.getElementById("previewModel").value,protein:document.getElementById("previewProtein").value,fat:n("previewFat"),recompMode:document.getElementById("previewRecompMode").value};state.macroPreview=["fat_loss","recomp","muscle_gain"].map(goal=>macroEstimate(input.age,input.height,input.weight,input.activity,input.sex,goal,input.model,input.protein==="auto"?null:Number(input.protein),input.fat,input.recompMode));state.macroInputs=input;await render();notify("Tres propuestas orientativas calculadas sin modificar planes reales.");return;}
 if(action==="copyStudentLink"){const link="https://efg-nutrition.onrender.com/pilot/";if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);notify("Enlace copiado; compartilo con el alumno habilitado.");}else{window.prompt("Copiá el enlace para tu alumno:",link);}return;}
 if(action==="makeGuidedDay"){
  const goal=state.coachGoals[0];
  if(!goal||!state.selectedStudent||!state.consent?.accepted)throw new Error("Primero aprobá la meta del alumno.");
  state.coachGuidedDraft=(!state.coachGuidedDraft&&state.coachFoodPlan?.guided_plan&&state.coachFoodPlan?.guided_goal_id===goal.id)?
     structuredClone(state.coachFoodPlan.guided_plan):generateGuidedDay(foods,goal,{includeWhey:!!document.getElementById("guideWhey")?.checked});
  showGuidedEditor();notify("Borrador generado: revisalo antes de enviarlo.");return;
 }
 if(action==="recalcGuidedDay"){readGuidedEditor();showGuidedEditor();notify("Resumen actualizado; el borrador sigue sin enviarse.");return;}
 if(action==="balanceGuidedDay"){
  const draft=readGuidedEditor(),goal=state.coachGoals[0];
  if(!goal)throw new Error("El alumno necesita un objetivo aprobado.");
  state.coachGuidedDraft=rebalanceGuidedDay(draft,goal);showGuidedEditor();
  notify("Recalculé el menú conservando tus pesos e ingredientes. Revisá los desvíos antes de aprobar.");return;
 }
 if(action==="saveGuidedDay")return approveGuidedDay();
 if(action==="calculateGoal")return calculateGoal();
 if(action==="adjustCalculatedGoal")return adjustCalculatedGoal();
 if(action==="previewGoalRevision")return previewGoalRevision();
 if(action==="approveGoalRevision")return approveGoalRevision();
 if(action==="saveCoachFoodPlan"){return saveCoachFoods();}
 if(action==="approveGoal"){
  if(!state.pendingGoal||state.pendingGoal.student_id!==state.selectedStudent||!state.consent?.accepted)
   throw new Error("Calculá primero una propuesta para un alumno autorizado.");
  const studentId=state.selectedStudent,guide=state.coachIntakeGuidePreview;
  if(state.coachIntakePrefill?.studentId===studentId){
   // Re-read the current revision and current consent before approving.
   const consentNow=await sb.from("efg_consents").select("accepted").eq("student_id",studentId).maybeSingle();
   if(consentNow.error)throw consentNow.error;
   if(consentNow.data?.accepted!==true)throw new Error("El alumno revocó el seguimiento. No se guardó el objetivo.");
   await coachIntakeFlow.refreshCoachDetail(studentId,true);
   const current=state.coachIntakeForms?.[studentId],source=state.coachIntakePrefill.sourceUpdatedAt;
   if(!current?.shared_at||!source||current.updated_at!==source)
    throw new Error("La ficha cambió o dejó de compartirse. Volvé a abrirla antes de aprobar.");
  }
  const {error}=await sb.from("efg_goals").insert({...state.pendingGoal,approved_by:state.session.user.id,start_on:today()});
  if(error)throw error;
  await loadStudentDetail(studentId);
  if(guide&&state.coachGoals[0])state.coachGuidedDraft=rebalanceGuidedDay(guide,state.coachGoals[0]);
  await render();
  if(guide)document.getElementById("coachGuidedSlot")?.scrollIntoView?.({behavior:"smooth",block:"start"});
  notify(guide?"Objetivo guardado: revisá y aprobá la guía antes de publicar el plan.":"Objetivo guardado: prepará la guía antes de publicar el plan.");
  return;
 }
 if(action==="checkAppVersion"){
  const label=document.getElementById("efgBuildStatus");
  if(label)label.textContent="Comprobando la versión publicada…";
  await versionNotice.check({force:true,reopen:true});
  const status=versionNotice.getStatus();
  if(label)label.textContent=status.working?"La comprobación sigue en curso. Probá de nuevo en unos segundos.":
   status.lastError?"No se pudo comprobar la versión. Revisá tu conexión e intentá otra vez.":
   status.hasUpdate?"Hay una nueva versión. Guardá tus cambios y volvé a abrir la aplicación para incorporarla.":
   status.lastChecked?"Estás al día. No hay una versión nueva para instalar.":"Todavía no pudimos comprobar la versión.";
  return;
 }
 if(action==="refreshPayments"){await loadOrgAndPayments();await render();notify("Comprobantes actualizados.");return;}
 if(action==="sendProof")return sendProof();
 if(action==="setSelfGoals"){return savePersonalTargets();}
}
async function updateAtDayChange(){
 if(!state.profile||!state.session||!state.renderedDay)return;
 if(state.renderedDay!==today()){
  await ensureCurrentDay();await render();
  notify("Nuevo día: empezamos en cero, sin borrar tus registros anteriores.");
  return;
 }
 if(state.profile.role==="student"&&isNutritionDayClosed(today())&&state.lastAutoCloseNotice!==today()){
  state.lastAutoCloseNotice=today();
  await render();notify("El registro de hoy se cerró automáticamente a las 23:59.");
 }
}
root.addEventListener("click",e=>{mainClick(e).catch(fail);});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateAtDayChange().catch(fail);});
window.addEventListener("focus",()=>updateAtDayChange().catch(fail));
setInterval(()=>updateAtDayChange().catch(fail),10000);
const invalidateCoachDraft=e=>{if(!e.target?.id)return;const id=e.target.id;if(!["targetSex","targetGoal","targetAge","targetHeight","targetWeight","targetActivity","targetModel","targetProtein","targetFat","targetRecompMode"].includes(id))return;state.pendingGoal=null;state.calculatedGoalBase=null;state.coachIntakeGuidePreview=null;document.getElementById("coachIntakeGeneratedGuide")?.remove();const approve=document.getElementById("approveGoalButton");if(approve)approve.disabled=true;const panel=document.getElementById("goalPreview");if(panel)panel.textContent="Cambiaste un dato de la propuesta. Recalculá antes de aprobarla.";};
root.addEventListener("change",e=>{invalidateCoachDraft(e);
  if(e.target.id==="efgIntakeShare"){
   const btn=document.getElementById("efgIntakeSubmitButton");
   if(btn)btn.textContent=intakeSaveButtonLabel({
    wasShared:!!state.studentIntake?.shared_at,willShare:!!e.target.checked
   });
   return;
  }
 if(e.target.id==="efgIntakeShare"){
  const button=document.getElementById("efgIntakeSubmitButton");
  if(button)button.textContent=e.target.checked?"Enviar mi ficha a mi coach":
   (state.studentIntake?.shared_at?"Guardar privada y retirar acceso":"Guardar ficha privada");
  return;
 }
 if(e.target.dataset.habitualchoice){updateHabitualPreview(e.target.dataset.habitualchoice);return;}if(["reviseGoalMode","proposalGoalMode"].includes(e.target.id)){if(e.target.id==="reviseGoalMode"){state.pendingGoalRevision=null;const btn=document.getElementById("approveGoalRevisionButton");if(btn)btn.disabled=true;}else{state.pendingGoal=null;const btn=document.getElementById("approveGoalButton");if(btn)btn.disabled=true;}}if(state.renderedDay&&state.renderedDay!==today()){updateAtDayChange().catch(fail);return;}if(e.target.dataset.guideswap){
 const draft=readGuidedEditor(),[slot,index]=e.target.dataset.guideswap.split(":");
 state.coachGuidedDraft=rebalanceGuidedDay(swapGuidedFood(draft,slot,Number(index),e.target.value,foods),state.coachGoals[0]);
 showGuidedEditor();
 notify("Ingrediente cambiado: recalculé automáticamente las porciones ajustables de las demás comidas.");return;
}if(e.target.dataset.guideqty){
 const draft=readGuidedEditor();
 state.coachGuidedDraft=rebalanceGuidedDay(draft,state.coachGoals[0]);
 showGuidedEditor();
 notify("Peso cambiado: recalculé automáticamente las porciones ajustables de las demás comidas.");return;
}if(e.target.id==="coachReportDate"){state.reportDate=e.target.value;render();document.getElementById("coachDailyReport")?.scrollIntoView?.({behavior:"smooth",block:"start"});return;}if(e.target.dataset.coachfood)updateCoachFoodCount();if(e.target.id==="sportItem")updateSportHint();if(e.target.id==="supplementItem")updateSupplementHint();if(e.target.id==="mealEditorFood")updateMealEntryMode(true);if(e.target.id==="mealEntryMode")updateMealEntryMode(false);if(e.target.id==="beverageMilkType")updateMealDialogHint();if(e.target.dataset.planselect){const key=e.target.dataset.planselect;state.plannerSelections[key]=e.target.value;delete state.plannerDraftGrams[key];e.target.blur();refreshPlannerCard(key);}if(e.target.dataset.skipmeal){const d=activeDiary();d.skipped=d.skipped||{};d.skipped[e.target.dataset.skipmeal]=e.target.checked;d.skipped._closed=false;saveDiary().catch(fail);}});
root.addEventListener("input",e=>{invalidateCoachDraft(e);if(["reviseGoalKcal","reviseGoalMode"].includes(e.target.id)){state.pendingGoalRevision=null;const btn=document.getElementById("approveGoalRevisionButton");if(btn)btn.disabled=true;}if(["proposalGoalKcal","proposalGoalMode"].includes(e.target.id)){state.pendingGoal=null;const btn=document.getElementById("approveGoalButton");if(btn)btn.disabled=true;}if(e.target.id==="coachRosterSearch"){const query=String(e.target.value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim();let visible=0;for(const row of root.querySelectorAll("[data-rostername]")){const name=String(row.dataset.rostername||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");const filter=root.dataset.rosterFilter||"all";const active=row.dataset.rosteractive==="yes";const accepted=row.dataset.rosterconsent==="yes";const status=filter==="all"||(filter==="active"&&active)||(filter==="inactive"&&!active)||(filter==="consent"&&active&&!accepted);const match=name.includes(query)&&status;row.hidden=!match;row.style.display=match?"":"none";if(match)visible++;}const counter=document.getElementById("coachRosterCount");if(counter)counter.textContent=visible+" alumnos encontrados";} if(e.target.dataset.guideqty){
  const [slot,index]=e.target.dataset.guideqty.split(":");
  const food=state.coachGuidedDraft?.meals?.find(x=>x.slot===slot)?.items?.[Number(index)];
  const qty=Number(e.target.value);
  if(food&&e.target.value.trim()&&Number.isFinite(qty)&&qty>0){food.qty=qty;food.locked=true;updateGuidedTotalsUI();}
 }
 if(e.target.id==="coachFoodSearch")filterCoachFoodLibrary();if(e.target.id==="mealFoodSearch")filterMealFoods();if(e.target.dataset.plansearch)filterPlannerFoods(e.target);if(e.target.id.startsWith("planQty_")){
 const key=e.target.id.slice("planQty_".length);
 const select=[...root.querySelectorAll("[data-planselect]")].find(x=>x.dataset.planselect===key);
 if(select)state.plannerDraftGrams[key]={foodId:select.value,grams:e.target.value};
 updatePlannerPreview();
}if(["mealEditorQty","beverageMilkMl","beverageSugarG"].includes(e.target.id))updateMealDialogHint();});
root.addEventListener("change",e=>{if(e.target.id==="mealWeightState"){const select=document.getElementById("mealEditorFood");if(!select)return;const pair=Object.values(FOOD_STATE_PAIRS).find(ids=>ids.includes(select.value));if(!pair)return;const target=e.target.value==="raw"?pair[1]:pair[0];if(![...select.options].some(o=>o.value===target)){notify("La ficha de ese estado no está habilitada por tu coach.");updateMealEntryMode(false);return;}select.value=target;updateMealEntryMode(false);}});
document.addEventListener("keydown",event=>{
 const dialog=document.querySelector("#mealDialogContainer .meal-popup")||document.querySelector("#efgRecipeRegisterOverlay .efg-recipe-register-card");
 if(!dialog)return;
 if(event.key==="Escape"){event.preventDefault();if(dialog.classList.contains("meal-popup"))closeMealDialog();else closeRecipeRegistration();return;}
 if(event.key!=="Tab")return;
 const items=[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
 if(!items.length)return;
 const first=items[0],last=items[items.length-1];
 if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
});
root.addEventListener("submit",e=>{
 if(e.target.id==="efgStudentIntakeForm"){e.preventDefault();coachIntakeFlow.save().catch(fail);return;}
 if(e.target.id==="pilot-login-form"){
  e.preventDefault();
  if(state.loggingIn)return;
  const email=e.target.querySelector("#loginEmail")?.value;
  requestOtp(email).catch(fail);
 }else if(e.target.id==="pilot-otp-form"){
  e.preventDefault();
  if(state.loggingIn)return;
  const token=e.target.querySelector("#loginOtp")?.value;
  confirmOtp(token).catch(fail);
 }
});
// Repeated SIGNED_IN events during a silent same-user session recovery must not redraw
// the coach's screen or reset the pending nutrition-guide draft.
function handleAuthStateChange(event,session){
 if(event==="SIGNED_IN"){
  const user=session?.user;
  if(user&&state.profile?.user_id===user.id&&state.session?.user?.id===user.id){
   state.session={user};
   return;
  }
  if(!state.loading)queueMicrotask(()=>refresh());
 }else if(event==="TOKEN_REFRESHED"&&session?.user?.id===state.session?.user?.id){
  state.session={user:session.user};
 }else if(event==="SIGNED_OUT"){
  state.session=null;state.profile=null;lastRenderedViewKey=null;loginView();
 }
}
// Never auto-reload after a release. Only warn the user, especially when editing.
let userHasUnconfirmedEdits=false;
const meaningfulField=el=>{
 if(!el?.matches?.("input,textarea,select,[contenteditable]"))return false;
 if(el.matches('input[type="search"],input[type="password"],input[type="email"]'))return false;
 if(el.id&&/search|filter|login|otp/i.test(el.id))return false;
 return !!el.closest(".pilot-main,#efgMessagesContent");
};
root.addEventListener("input",e=>{if(meaningfulField(e.target))userHasUnconfirmedEdits=true;},{capture:true});
root.addEventListener("change",e=>{if(meaningfulField(e.target))userHasUnconfirmedEdits=true;},{capture:true});
document.addEventListener("input",e=>{if(e.target?.id==="efgMessageText")userHasUnconfirmedEdits=true;},{capture:true});
const versionNotice=createVersionNotice({
 currentVersion:"20261028-version1",
 canShow:()=>!!state.profile&&!!state.session?.user?.id&&!state.welcomePending,
 hasUnsavedChanges:()=>userHasUnconfirmedEdits||
  !!state.coachGuidedDraft||!!state.pendingGoal||!!state.pendingGoalRevision||
  Object.keys(state.plannerDraftGrams||{}).length>0||
  !!document.getElementById("efgMessageText")?.value?.trim()||
  !!document.querySelector('input[type="file"]')?.files?.length
});
const pullRefresh=createPullToRefresh({
 canRefresh:()=>!!state.profile&&!!state.session?.user?.id&&!state.loading&&!refreshingWorkspace&&!state.welcomePending,
 refresh:refreshVisibleWorkspace
});
(async function init(){
 const {data,error}=await sb.auth.getSession();
 if(error)fail(error);
 if(data?.session)await refresh();else if(error)sessionConnectionRetry();else loginView();
 sb.auth.onAuthStateChange(handleAuthStateChange);
})();
