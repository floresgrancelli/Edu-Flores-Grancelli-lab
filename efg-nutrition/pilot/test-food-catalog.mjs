// EFG Nutrition: comprobaciones locales reproducibles del catálogo (sin conectar a producción).
// Ejecutar desde la raíz: node efg-nutrition/pilot/test-food-catalog.mjs
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

// El catálogo se carga sin exigir cambios de package.json del sitio, cuyo frontend usa módulos ESM.
const source=await readFile(new URL("./food-catalog.js",import.meta.url),"utf8");
const {EXTRA_FOODS,FOOD_UNIT_PORTIONS}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const foods=new Map(EXTRA_FOODS.map(food=>[food.id,food]));
assert.equal(foods.size,EXTRA_FOODS.length,"Hay IDs de alimentos duplicados");
for(const food of EXTRA_FOODS){
 assert.ok(food.id && food.name && food.source && food.unit,"Faltan campos del alimento "+food.id);
 assert.ok(["g","ml"].includes(food.unit),"Unidad inválida de "+food.id);
 for(const field of ["k","p","c","f","fi"])assert.ok(Number.isFinite(food[field]) && food[field]>=0,"Valor inválido "+food.id+" "+field);
 assert.ok(food.validationStatus,"No se clasifica la procedencia de "+food.id);
}
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<0.0001, message+"; obtenido "+actual);
const gobinda=foods.get("milanesa_soy_gobinda");
assert.ok(gobinda,"Falta Gobinda");
assert.equal(gobinda.sourceType,"etiqueta_fabricante");
assert.equal(gobinda.validationStatus,"rotulo_fotografiado");
close(gobinda.k*125,312,"Gobinda: energía por milanesa");
close(gobinda.p*125,20.67,"Gobinda: proteína por milanesa");
close(gobinda.c*125,32.33,"Gobinda: hidratos por milanesa");
close(gobinda.f*125,11.15,"Gobinda: grasas por milanesa");
close(gobinda.fi*125,7.5,"Gobinda: fibra por milanesa");
close(gobinda.k*250,624,"Gobinda: 2 milanesas");
close(FOOD_UNIT_PORTIONS.milanesa_soy_gobinda.grams,125,"Gobinda: peso por unidad");
const refs=[["apple","171688",52],["carrot_raw","170393",41],["spinach_cooked","168463",23],["tomato","170457",18],["rice_dry","169756",365],["pasta_dry","168927",371],["oats_raw","173904",379],["yogurt_greek_light","170894",59],["chicken_breast_raw","171077",120],["chicken_breast_roasted","2705956",161],["chicken_thigh_cooked","172388",179],["egg_white","747997",55]];
for(const [id,fdcId,kcal100] of refs){
 const food=foods.get(id);
 assert.ok(food,"Falta registro USDA "+id);
 assert.equal(food.sourceType,"usda_fdc");
 assert.equal(food.sourceId,fdcId);
 close(food.k*100,kcal100,"USDA "+id+": energía por 100 g");
}
const fritolim=foods.get("huevo_frito_fritolim");
const friedOil=foods.get("huevo_frito");
assert.ok(fritolim && friedOil,"Ambas preparaciones de huevo deben existir");
assert.equal(fritolim.validationStatus,"receta_estimado");
assert.equal(fritolim.oilIncluded,false);
assert.equal(friedOil.oilIncluded,true);
close(FOOD_UNIT_PORTIONS.huevo_frito_fritolim.grams,50,"Huevo con rocío: unidad sin cáscara");
close(fritolim.k*50,74,"Huevo con Fritolim (base del huevo sin aerosol)");
close(fritolim.p*50,6.2,"Huevo con Fritolim: proteína");
close(fritolim.f*50,4.98,"Huevo con Fritolim: grasa");
assert.ok(friedOil.k*50>fritolim.k*50,"Huevo con aceite promedio debe diferir del de rocío mínimo");
assert.ok(friedOil.source.includes("ya incluido"),"El huevo frito con aceite debe evitar doble conteo");
close(foods.get("milk_whole").k*100,62.83,"Leche entera: conversión de gramos a 100 ml");
close(foods.get("milk_skim").k*100,36.05,"Leche descremada: conversión de gramos a 100 ml");
assert.equal(foods.get("milk_whole").validationStatus,"tabla_convertida_densidad");
assert.equal(foods.get("milk_skim").validationStatus,"tabla_convertida_densidad");
close(foods.get("yogurt_greek_light").k*100,59,"Yogur griego natural descremado USDA");
assert.equal(foods.get("yogurt_greek_light").sourceId,"170894");
const fruitSalad=foods.get("fruit_salad_basic");
assert.ok(fruitSalad,"Debe existir ensalada de frutas sin azúcar añadida");
assert.equal(fruitSalad.validationStatus,"receta_estimado");
assert.equal(fruitSalad.sourceType,"recipe_estimate");
assert.equal(FOOD_UNIT_PORTIONS.fruit_salad_basic.grams,200,"Bol de referencia");
close(fruitSalad.k*200,122.85,"Fruta combinada: kcal por bol de referencia");
close(fruitSalad.c*200,30.875,"Fruta combinada: hidratos por bol");
close(fruitSalad.fi*200,4.6,"Fruta combinada: fibra por bol");
const appText=await readFile(new URL("./pilot.js",import.meta.url),"utf8");
for(const id of ["748967","2708408","170440","2647437","169737","171413","173944","171705"]){
 assert.ok(appText.includes('sourceId:"'+id+'"'),"Falta FDC_ID "+id+" en alimentos principales");
}
assert.ok(appText.includes("f.oilIncluded?"),"El aviso de aceite debe distinguir preparación con aceite incluido");
assert.ok(appText.includes("setFruitSaladNutrition();")&&appText.includes("fruitSaladRecipeHTML()"),"El alumno debe ver la mezcla de ensalada y el cálculo desde ingredientes");
assert.notEqual(foods.get("milanesa_soy_baked").k,gobinda.k,"No mezclar genérica con Gobinda");
// Control global: las entradas principales y ampliadas forman un catálogo sin IDs repetidos.
const pStart=appText.indexOf("const foods=[");
const pEnd=appText.indexOf("].concat(EXTRA_FOODS);",pStart);
assert.ok(pStart>=0&&pEnd>pStart,"No se pudo localizar el arreglo principal");
const primary=vm.runInNewContext(appText.slice(pStart+"const foods=".length,pEnd+1),{});
const all=[...primary,...EXTRA_FOODS];
const seen=new Set();
for(const food of all){
 assert.ok(!seen.has(food.id),"ID duplicado en catálogo completo "+food.id);
 seen.add(food.id);
 assert.ok(food.source,"Ficha sin descripción de origen "+food.id);
 for(const n of ["k","p","c","f","fi"])assert.ok(Number.isFinite(food[n])&&food[n]>=0,"Composición inválida "+food.id+": "+n);
 if(!food.validationStatus)assert.ok(food.id==="cake"||!food.sourceId||food.sourceType==="usda_fdc","Falta estado de fuente "+food.id);
}
assert.equal(all.length,371,"Revisar altas/bajas de alimentos y generar nuevamente el informe CSV");
assert.ok(appText.includes("foodProvenance(f)"),"El alumno debe poder ver procedencia de ficha en el editor");
assert.ok(appText.includes("sourceType:p.sourceType"),"Conservar procedencia en registros futuros");
const whey=foods.get("whey_powder");
assert.ok(whey&&FOOD_UNIT_PORTIONS.whey_powder.grams===30,"Un scoop de whey representa 30 g");
close(whey.p*30,24,"Un scoop genérico de whey aporta 24 g de proteínas");
close(whey.p*60,48,"Dos scoops de whey aportan 48 g de proteínas");
assert.ok(appText.includes('"media_manana"')&&appText.includes('"media_tarde"'),"El menú debe permitir ambas colaciones");
console.log("EFG Nutrition: auditoría de "+all.length+" alimentos, sin IDs duplicados ni valores inválidos. Orígenes y etiquetas visibles; ver informe CSV para fuentes pendientes.");
