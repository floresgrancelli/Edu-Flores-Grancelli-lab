import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_FOODS,foodSearchText,FOOD_UNIT_PORTIONS} from '../pilot/food-catalog.js';
import {exportGuideCatalog} from '../tools/export-guide-catalog.mjs';
import {ACHURAS_FOODS} from '../pilot/food-achuras-20261113.js';
import {guideFoodSignal} from '../pilot/guided-day-v2.js';
import {MICRONUTRIENT_CATALOG} from '../pilot/micronutrient-catalog.js';
const baseline=JSON.parse(readFileSync(new URL('../docs/achuras-20261113/baseline-catalog.json',import.meta.url))),now=exportGuideCatalog();
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
test('four additions preserve every one of the 613 published identities and quantities',()=>{
 assert.equal(Object.keys(now.foods).length,617);assert.equal(new Set(EXTRA_FOODS.map(f=>f.id)).size,EXTRA_FOODS.length);
 for(const [id,food] of Object.entries(baseline.foods))assert.deepEqual(now.foods[id],food,id);
 assert.equal(EXTRA_FOODS.filter(f=>f.id==='chorizo_cooked').length,1);assert.equal(EXTRA_FOODS.filter(f=>f.id==='morcilla_cooked').length,1);
});
test('all six foods can be found through achuras and their usual names',()=>{
 for(const [term,id] of [['chorizo','chorizo_cooked'],['morcilla','morcilla_cooked'],['chinchulin','chinchulines_grilled'],['rinon','kidney_beef_grilled'],['molleja','sweetbreads_beef_grilled'],['morcilla vasca','morcilla_vasca_estimate']]){
  const food=EXTRA_FOODS.find(f=>f.id===id);assert.ok(norm(foodSearchText(food)).includes(term));assert.ok(norm(foodSearchText(food)).includes('achuras'));assert.ok(FOOD_UNIT_PORTIONS[id].grams>0);
 }
});
test('cooked organ references match SARA 2; vasca remains an explicit recipe estimate',()=>{
 for(const [id,expected] of [['chinchulines_grilled',[270,13.8,0,23.9,0]],['kidney_beef_grilled',[151,27.3,0,4.7,0]],['sweetbreads_beef_grilled',[312,21.9,0,25,0]]]){
  const row=now.foods[id];for(const [i,k] of ['k','p','c','f','fi'].entries())assert.ok(Math.abs(row[k]*100-expected[i])<1e-8);assert.equal(row.sourceType,'sara2');
 }
 const v=now.foods.morcilla_vasca_estimate;assert.equal(v.dataQuality,'estimated');assert.equal(v.sourceType,'recipe_estimate');assert.ok(v.fi>0);assert.match(v.source,/NO una receta verificada ni etiqueta/);
});
test('new animal foods stay outside vegetarian and vegan guides and do not invent micronutrients',()=>{
 for(const food of ACHURAS_FOODS){
  for(const patternId of ['vegetarian','vegan'])assert.equal(guideFoodSignal(food,{patternId,restrictionStatus:'none_declared',restrictions:[]}).status,'avoid');
  assert.equal(MICRONUTRIENT_CATALOG.foods[food.id],undefined);
 }
 assert.equal(MICRONUTRIENT_CATALOG.foodCount,63);
});
