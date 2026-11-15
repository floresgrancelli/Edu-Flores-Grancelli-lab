import assert from 'node:assert/strict';
import {MICRONUTRIENT_CATALOG as base} from '../pilot/micronutrient-catalog.js';
import {MICRONUTRIENT_CATALOG as c,NEW_MICRONUTRIENT_ESTIMATES as added} from '../pilot/micronutrient-expanded-catalog.js';
import {EXTRA_FOODS,FOOD_UNIT_PORTIONS} from '../pilot/food-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../pilot/micronutrient-expanded-catalog.js',import.meta.url),'utf8').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const MICRONUTRIENT_CATALOG=')[0];
assert.equal(c.version,'ncc-micro-'+createHash('sha256').update(raw).digest('hex').slice(0,16));
assert.equal(c.foodCount,853);assert.equal(Object.keys(added).length,235);
for(const [id,f] of Object.entries(base.foods))assert.deepEqual(c.foods[id],f,'Previous composition preserved '+id);
const newFoods=EXTRA_FOODS.filter(f=>f.restaurant||f.alcohol);assert.equal(newFoods.length,235);
for(const f of newFoods){const m=added[f.id];assert.ok(m);assert.equal(m.unit,f.unit);assert.ok(m.approximation);assert.match(m.mappingNote,/ESTIMACIÓN/);assert.ok(m.ingredients.length);
 for(const [n,v] of Object.entries(m.perUnit))assert.ok(v===null||Number.isFinite(v)&&v>=0,f.id+' '+n);
}
const model=(id,qty)=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:c.foods[id].unit,sourceId:c.foods[id].catalogSourceId}]}},catalog:c,referenceMode:'general'});
for(const f of newFoods){const qty=f.servingGrams||f.servingMl;const one=model(f.id,qty),half=model(f.id,qty/2);assert.equal(one.nutrients.find(n=>n.id==='magnesium').foodKnown,1,f.id);
 for(let i=0;i<one.nutrients.length;i++){const a=one.nutrients[i],b=half.nutrients[i];assert.equal(a.total===null?null:a.total/2,b.total,f.id+' '+a.id);assert.equal(a.partial,b.partial);}
}
for(const id of ['rest_sushiclub_combo_30','rest_fabric_combo_15','rest_ishidan_combo_salmon_12']){
 const m=model(id,FOOD_UNIT_PORTIONS[id].grams);assert.ok(m.nutrients.find(n=>n.id==='epa_dha').total>0);assert.ok(m.nutrients.find(n=>n.id==='b12').total>0);assert.ok(m.nutrients.find(n=>n.id==='iron').total>0);
}
const milk=added.rest_starbucks_latte;assert.ok(milk.perUnit.calcium>0);assert.ok(added.alc_beer_lager.perUnit.magnesium>0);
assert.ok(added.rest_mc_big_mac.perUnit.iron>0);assert.ok(added.rest_mc_big_mac.perUnit.zinc>0);
assert.ok(newFoods.every(f=>added[f.id].incompleteNutrients.length===0),'All restaurant models now have estimates; synthetic missing-data regression is in bulk tests');

const daily=(meals,sports=[])=>estimate({
 diary:{log_day:'2026-11-15',meals:{desayuno:meals},sports,skipped:{}},
 catalog:c,referenceMode:'general'
});
const micro=(m,id)=>m.nutrients.find(n=>n.id===id);
const within=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

// Regression: the diary saves a personalized drink's ingredients as
// {milk_id,milk_ml,sugar_g}. Its minerals/B12 must match those amounts, not
// generic coffee-with-milk or a second independent milk entry.
const drink={id:'coffee_milk',qty:250,unit:'ml',name:'Café con leche personalizado',
 ingredients:{milk_id:'milk_skim',milk_ml:150,sugar_g:10}};
const coffee=daily([drink]);
for(const id of ['magnesium','calcium','iron','zinc','b12','ala','epa_dha']){
 const per=(food,key)=>c.foods[food].perUnit[key];
 const calc=key=>100*per('coffee_black',key)+150*per('milk_skim',key)+10*per('sugar',key);
 const expected=id==='epa_dha'?calc('epa')+calc('dha'):calc(id);
 within(micro(coffee,id).food,expected);
 assert.equal(micro(coffee,id).foodKnown,1);
 assert.equal(micro(coffee,id).partial,false);
}
within(micro(coffee,'calcium').percent,100*micro(coffee,'calcium').total/1300);
const historical=daily([{id:'coffee_milk',qty:250,unit:'ml'}]);
within(micro(historical,'calcium').food,250*c.foods.coffee_milk.perUnit.calcium);
assert.ok(micro(coffee,'calcium').food>micro(historical,'calcium').food);
const malformed=daily([{...drink,ingredients:{milk_id:'unknown_milk',milk_ml:150,sugar_g:10}}]);
assert.equal(micro(malformed,'calcium').total,null);
const missingMilk=structuredClone(c);delete missingMilk.foods.milk_skim;
const partial=estimate({diary:{log_day:'2026-11-15',meals:{desayuno:[drink]}},catalog:missingMilk,referenceMode:'general'});
assert.equal(micro(partial,'calcium').partial,true);
assert.equal(micro(partial,'calcium').difference,null);

// Mixed day: one 30-piece sushi combo is counted by stored equivalent grams,
// once, plus the label-backed supplement doses. The bar's denominator is the
// displayed general daily reference, not a value inferred from the food.
const comboId='rest_sushiclub_combo_30',grams=FOOD_UNIT_PORTIONS[comboId].grams;
const supplementLabel=(doseUnit,amounts)=>({confirmed:true,source:'Etiqueta de prueba transcrita',doseQuantity:2,doseUnit,amounts});
const mixed=daily([
 {id:comboId,unit:'g',qty:grams,displayQty:1,displayUnit:'combo de 30 piezas'},
 drink
],[
 {id:'omega3_gentech_epa_dha',kind:'supplement',qty:2,unit:'cápsulas',
  micronutrientLabel:supplementLabel('cápsulas',{epa:{value:920,unit:'mg'},dha:{value:360,unit:'mg'}})},
 {id:'geomagnesium_bisglycinate_1400',kind:'supplement',qty:2,unit:'comprimidos',
  micronutrientLabel:supplementLabel('comprimidos',{magnesium:{value:197,unit:'mg'},b12:{value:500,unit:'µg'}})}
]);
within(micro(mixed,'epa_dha').food,grams*(c.foods[comboId].perUnit.epa+c.foods[comboId].perUnit.dha));
within(micro(mixed,'epa_dha').supplements,1280);
within(micro(mixed,'magnesium').supplements,197);
within(micro(mixed,'b12').supplements,500);
within(micro(mixed,'epa_dha').percent,100*micro(mixed,'epa_dha').total/250);
within(micro(mixed,'calcium').percent,100*micro(mixed,'calcium').total/1300);
assert.equal(mixed.foodEntries,2);
assert.equal(mixed.supplementEntries,2);
const before=JSON.stringify(drink);daily([drink]);assert.equal(JSON.stringify(drink),before);

console.log('PASS: 235 new estimates, all 618 previous compositions preserved, fractions, nine combos, traceability and partial data');
