// EFG Nutrition: lote de rótulos del usuario - pruebas SIN conexión a usuarios ni producción.
// Chocolate Colonial 80% cacao extraído de las fotografías del frente y dorso.
import assert from "node:assert/strict";
import {EXTRA_FOODS,FOOD_UNIT_PORTIONS,foodSearchText} from "../pilot/food-catalog.js";
import {USER_PHOTO_LABEL_FOODS,USER_PHOTO_LABEL_PORTIONS} from "../pilot/user-photo-labels.js";

assert.equal(new Set(EXTRA_FOODS.map(f=>f.id)).size,EXTRA_FOODS.length,"No duplicate food IDs");
assert.equal(USER_PHOTO_LABEL_FOODS.length,1,"Only the pictured chocolate is fully quantified; do not fabricate the mix");
const chocolate=EXTRA_FOODS.find(x=>x.id==="colonial_chocolate_organico_80_cacao");
assert.ok(chocolate,"Photo-labeled product must be in normal food search catalogue");
assert.equal(chocolate.brand,"Chocolate Colonial");
assert.equal(chocolate.category,"dessert");
assert.equal(chocolate.unit,"g");
assert.equal(chocolate.sourceType,"etiqueta_fabricante");
assert.equal(chocolate.validationStatus,"rotulo_fotografiado");
assert.ok(chocolate.source.includes("fotografiado"));
assert.ok(foodSearchText(chocolate).toLowerCase().includes("colonial"));
assert.ok(foodSearchText(chocolate).toLowerCase().includes("80%"));

const close=(value,expected,subject)=>assert.ok(Math.abs(value-expected)<0.001,subject+": "+value);
for(const [key,value] of Object.entries({k:598,p:11.7,c:30,f:43,fi:11.9})){
 close(chocolate[key]*100,value,key+" per 100g");
}
for(const [key,value] of Object.entries({sugarPer100g:21,addedSugarPer100g:20,saturatedFatPer100g:26,transFatPer100g:0,sodiumMgPer100g:16})){
 close(chocolate[key],value,key+" label");
}
close(chocolate.k*25,149.5,"25g from per100g energy (rounds to 150)");
close(chocolate.p*25,2.925,"protein by 25g");
close(chocolate.c*25,7.5,"carbohydrates by 25g");
close(chocolate.f*25,10.75,"fat by 25g");
assert.deepEqual(chocolate.declaredServing,{
 grams:25,energyKcal:150,carbsG:7,sugarsG:5.3,addedSugarsG:4.9,
 proteinG:2.9,fatG:11,saturatedFatG:6.6,transFatG:0,fiberG:3.0,sodiumMg:0
});
assert.equal(chocolate.servingGrams,25);
assert.equal(chocolate.packageGrams,100);
assert.equal(chocolate.servingsPerPackage,4);
assert.equal(FOOD_UNIT_PORTIONS[chocolate.id].grams,25);
assert.equal(USER_PHOTO_LABEL_PORTIONS[chocolate.id].grams,25);
assert.match(chocolate.source,/redondeo/);
assert.ok(!USER_PHOTO_LABEL_FOODS.some(f=>/mix/i.test(f.name)),"No nutritional assumptions about user mix");
console.log("PASS: Chocolate Colonial 80% cacao; photograph label, portion 25g, 100g nutrients, accurate rounding and source; no mix fabricated.");
