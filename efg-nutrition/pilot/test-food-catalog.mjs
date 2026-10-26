// EFG Nutrition: comprobaciones locales reproducibles del catálogo (sin conectar a producción).
// Ejecutar desde la raíz: node efg-nutrition/pilot/test-food-catalog.mjs
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

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
const refs=[["oats_raw","173904",379],["chicken_breast_raw","171077",120],["chicken_breast_roasted","2705956",161],["chicken_thigh_cooked","172388",179],["egg_white","747997",55]];
for(const [id,fdcId,kcal100] of refs){
 const food=foods.get(id);
 assert.ok(food,"Falta registro USDA "+id);
 assert.equal(food.sourceType,"usda_fdc");
 assert.equal(food.sourceId,fdcId);
 close(food.k*100,kcal100,"USDA "+id+": energía por 100 g");
}
assert.notEqual(foods.get("milanesa_soy_baked").k,gobinda.k,"No mezclar genérica con Gobinda");
console.log("EFG Nutrition: catálogo ampliado revisado ("+foods.size+" fichas, IDs únicos, valores finitos, productos FDC y etiqueta Gobinda).");
