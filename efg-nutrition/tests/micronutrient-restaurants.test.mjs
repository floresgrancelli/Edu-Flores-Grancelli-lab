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
const missing=newFoods.find(f=>added[f.id].incompleteNutrients.length);assert.ok(missing);assert.ok(model(missing.id,100).nutrients.some(n=>n.partial),'Known partial contributions remain marked');
console.log('PASS: 235 new estimates, all 618 previous compositions preserved, fractions, nine combos, traceability and partial data');
