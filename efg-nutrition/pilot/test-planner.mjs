// EFG Nutrition · regresiones: catálogo completo, elección libre, porciones y aviso de faltantes.
// Ejecutar: node efg-nutrition/pilot/test-planner.mjs
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const at=new URL("./",import.meta.url);
const load=async name=>await readFile(new URL(name,at),"utf8");
const js=await load("planner.js");
const {FOOD_GROUPS,optionsFor,allPlannerFoods,proposeMeal,makePlan}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
const catalog=await import("data:text/javascript;base64,"+Buffer.from(await load("food-catalog.js")).toString("base64"));
const gobinda=catalog.EXTRA_FOODS.find(x=>x.id==="milanesa_soy_gobinda");
const salad=catalog.EXTRA_FOODS.find(x=>x.id==="fruit_salad_basic");
assert.ok(gobinda&&salad);
assert.equal(gobinda.k*125,312);
assert.equal(salad.validationStatus,"receta_estimado");
assert.ok(FOOD_GROUPS.protein.includes(gobinda.id));
assert.ok(optionsFor([salad],[salad.id],"carbs").some(x=>x.id===salad.id));
const chicken={id:"chicken",name:"Pollo cocido",category:"protein",unit:"g",k:1.65,p:.31,c:0,f:.036,fi:0};
const rice={id:"rice",name:"Arroz cocido",category:"carb",unit:"g",k:1.29,p:.0267,c:.2799,f:.0028,fi:.004};
const potato={id:"potato",name:"Papa",category:"carb",unit:"g",k:.86,p:.0171,c:.2001,f:.001,fi:.018};
const oil={id:"oil",name:"Aceite de oliva",category:"fat",unit:"g",k:8.84,p:0,c:0,f:1,fi:0};
const fruit={id:"orange",name:"Naranja",category:"fruit",unit:"g",k:.52,p:.009,c:.118,f:.001,fi:.024};
const drink={id:"water",name:"Agua",category:"drink",unit:"ml",k:0,p:0,c:0,f:0,fi:0};
const foodList=[chicken,rice,potato,oil,gobinda,salad,fruit,drink];
const ids=foodList.map(f=>f.id);
assert.equal(allPlannerFoods(foodList,ids).length,foodList.length,"Todo el catálogo disponible, no listas reducidas");
assert.ok(allPlannerFoods(foodList,ids).some(x=>x.id==="orange"),"Frutas también disponibles");
assert.ok(allPlannerFoods(foodList,ids).some(x=>x.id==="milanesa_soy_gobinda"),"Productos comerciales disponibles");
const remaining={k:800,p:65,c:105,f:30,fi:14};
const choice={"cena|protein":"chicken","cena|carbs":"rice","cena|vegetable":"none","cena|fat":"none"};
const p=proposeMeal({foods:foodList,approved:ids,slot:"cena",remaining,selections:choice});
assert.equal(p.rows.length,4);
assert.deepEqual(p.rows.map(x=>x.food?.id||"none"),["chicken","rice","none","none"]);
assert.ok(p.rows[0].grams>0&&p.rows[0].grams<=350,"Pollo en una porción realista");
assert.ok(p.rows[1].grams>=100&&p.rows[1].grams<=400,"Arroz sin aceite no debe limitarse erróneamente a 20 g");
assert.ok(p.estimate.f<remaining.f,"Debe avisar que faltan grasas");
assert.ok(p.estimate.p>0&&p.estimate.c>0&&p.estimate.k>0,"Considera proteínas, hidratos y calorías");
const soyMeal=proposeMeal({foods:foodList,approved:ids,slot:"cena",remaining,
 selections:{"cena|protein":"milanesa_soy_gobinda","cena|carbs":"potato","cena|vegetable":"none","cena|fat":"none"}});
assert.equal(soyMeal.rows[0].food.id,"milanesa_soy_gobinda");
assert.ok(soyMeal.estimate.c>soyMeal.rows[1].grams*potato.c,"La soja aporta hidratos además de proteínas");
assert.ok(soyMeal.estimate.f>0,"La soja también aporta grasas");
const mixed=proposeMeal({foods:foodList,approved:ids,slot:"cena",remaining,
 selections:{"cena|protein":"orange","cena|carbs":"milanesa_soy_gobinda","cena|vegetable":"none","cena|fat":"oil"}});
assert.equal(mixed.rows[0].food.id,"orange","Los alimentos no están limitados por grupos del selector");
assert.equal(mixed.rows[1].food.id,"milanesa_soy_gobinda","Un comercial puede estar en el segundo espacio");
assert.ok(mixed.rows[3].grams<=20,"El aceite tiene tope de porción");
const none=proposeMeal({foods:foodList,approved:ids,slot:"cena",remaining,
 selections:{"cena|protein":"none","cena|carbs":"none","cena|vegetable":"none","cena|fat":"none"}});
assert.equal(none.estimate.k,0);
assert.equal(none.rows.filter(x=>x.food).length,0);
const plan=makePlan({foods:foodList,approved:ids,diary:{meals:{},skipped:{}},
 goals:remaining,totals:{k:0,p:0,c:0,f:0,fi:0},dinnerOnly:true,selections:choice});
assert.equal(plan.slots[0],"cena");
// Cálculo corregido: proteína, luego hidratos, extras únicamente para calorías.
const egg=catalog.EXTRA_FOODS.find(f=>f.id==="egg_boiled");
assert.ok(egg,"Debe existir huevo duro en el catálogo");
const target={k:1508.4,p:93.6,c:170.4,f:49.6,fi:0};
const eggDinner=proposeMeal({foods:[egg,rice,oil],approved:[egg.id,rice.id,oil.id],
 slot:"cena",remaining:target,
 selections:{"cena|protein":egg.id,"cena|carbs":"rice","cena|vegetable":"none","cena|fat":"none"}});
assert.equal(eggDinner.rows[0].targetNutrient,"p");
assert.equal(eggDinner.rows[1].targetNutrient,"c");
assert.equal(eggDinner.rows[2].targetNutrient,"k");
assert.equal(eggDinner.rows[0].grams,150,"Tres huevos como límite orientativo");
assert.ok(eggDinner.rows[0].neededGrams>700,"Necesidad teórica visible: más de 700 g de huevo");
assert.equal(eggDinner.rows[0].capped,true,"No confundir porción realista con meta completa");
assert.ok(eggDinner.rows[1].neededGrams>400,"El hidrato se calcula descontando el huevo");
assert.equal(eggDinner.rows[2].grams,0,"Sin extras no se añade aceite");
const withOil=proposeMeal({foods:[egg,rice,oil],approved:[egg.id,rice.id,oil.id],
 slot:"cena",remaining:target,
 selections:{"cena|protein":egg.id,"cena|carbs":"rice","cena|vegetable":"oil","cena|fat":"none"}});
assert.ok(withOil.rows[2].grams>0&&withOil.rows[2].grams<=20,"Extra calórico con tope");
const noCalories=proposeMeal({foods:[egg,rice,oil],approved:[egg.id,rice.id,oil.id],
 slot:"cena",remaining:{k:100,p:93.6,c:170.4,f:49.6},
 selections:{"cena|protein":egg.id,"cena|carbs":"rice","cena|vegetable":"oil","cena|fat":"none"}});
assert.equal(noCalories.rows[2].grams,0,"No dar extras cuando no faltan calorías");

assert.ok(plan.projectedLeft.f>0&&plan.projectedLeft.k>=0,"Macros pendientes positivos");
assert.ok(Math.abs(plan.projectedLeft.f-(remaining.f-p.estimate.f))<.001);
const ui=await load("pilot.js"),style=await load("pilot.css");
assert.ok(ui.includes("allPlannerFoods(foods,allowedFoods())"),"Catálogo completo en pantalla");
assert.ok(ui.includes("groupedFoodOptions(available,meal.slot)"),"Mismas categorías que al registrar comidas");
assert.ok(ui.includes('data-plansearch='),"Buscador para cada alimento");
assert.ok(ui.includes("No agregar"),"Extras opcionales");
assert.ok(ui.includes("Faltan estos macros para completar el día"),"Aviso de faltantes");
assert.ok(ui.includes("function updatePlannerPreview()"),"Vista previa reactiva");
assert.ok(ui.includes("if(e.target.dataset.plansearch)filterPlannerFoods(e.target)"),"Buscador conectado");
assert.ok(ui.includes("if(e.target.id.startsWith(\"planQty_\"))updatePlannerPreview()"),"Cantidades actualizan balance");
assert.ok(ui.includes("data-planadd=")&&ui.includes("function addPlannedFood("),"Registro de cantidades reales intacto");
assert.ok(ui.includes("function openPlannedFoodEditor("),"Bebidas personalizables sin macros engañosos");
assert.ok(style.includes(".planner-food-search"),"Maquetación de buscador");

assert.ok(ui.includes('protein:"Proteína"')&&ui.includes('carbs:"Hidratos"'),"Etiquetas por macro");
assert.ok(ui.includes("Extra para calorías"),"Extras vinculados a calorías");
assert.ok(ui.includes("row.neededGrams")&&ui.includes("row.capped"),"Razón del tope de porciones");
assert.ok(!ui.includes("const oldQty=new Map"),"No reutilizar gramos obsoletos al cambiar alimento");
assert.ok(ui.includes("pendientes (informativo)"),"Grasas pendientes solo informativas");

assert.ok(!ui.includes("Alternativa B")&&!ui.includes("data-planalt")&&!ui.includes("data-usealternative"),"No se vuelve a mostrar B");
console.log("EFG Nutrition: catálogo integral, pollo+arroz, soja, límites, extras opcionales, aviso y registro OK");
