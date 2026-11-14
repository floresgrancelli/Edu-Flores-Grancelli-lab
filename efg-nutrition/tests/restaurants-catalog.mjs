import assert from 'node:assert/strict';
import {EXTRA_FOODS,FOOD_UNIT_PORTIONS,foodSearchText} from '../pilot/food-catalog.js';
import {RESTAURANT_MODELS,RESTAURANT_OFFICIAL,buildRestaurantCatalog} from '../pilot/food-restaurants-20261114.js';
import {exportGuideCatalog} from '../tools/export-guide-catalog.mjs';
import {resizeDiaryFood} from '../pilot/diary-food-edit.js';
const rows=EXTRA_FOODS.filter(f=>f.restaurant),by=id=>rows.find(f=>f.id===id);
assert.equal(rows.length,161);assert.equal(new Set(rows.map(f=>f.brand)).size,15);assert.equal(new Set(EXTRA_FOODS.map(f=>f.id)).size,EXTRA_FOODS.length);
for(const f of rows){
 for(const key of ['k','p','c','f','fi'])assert.ok(Number.isFinite(f[key])&&f[key]>=0,f.id+' '+key);
 assert.ok(f.k>0);assert.equal(FOOD_UNIT_PORTIONS[f.id].grams,f.servingGrams);assert.ok(f.sourceUrl.startsWith('https://'));assert.ok(f.source.length<1600);assert.equal(f.diaryOnly,true);
 if(f.validationStatus==='receta_estimado'){assert.match(f.name,/estimación/);assert.match(f.source,/no tabla de la cadena/);assert.match(f.source,/SUPUESTOS/);}
 else assert.equal(f.validationStatus,'rotulo_web_fabricante');
}
assert.equal(RESTAURANT_OFFICIAL.length,43);assert.equal(RESTAURANT_MODELS.length,118);
const big=by('rest_mc_big_mac');assert.equal(big.k*214,505);assert.equal(big.p*214,26);assert.notEqual(big.k,big.p*4+big.c*4+big.f*9);
for(const [id,query] of [['rest_mc_big_mac','mc donalds'],['rest_bk_whopper','burguer king'],['rest_starbucks_latte','sturbucks'],['rest_sushiclub_phila','sushi club'],['rest_fabric_fabric','fabric'],['rest_ishidan_milanga','ishidan']])assert.ok(foodSearchText(by(id)).toLowerCase().includes(query));
assert.equal(FOOD_UNIT_PORTIONS.rest_ishidan_phila.grams,30);assert.equal(by('rest_fabric_feel').recipeParts.sushi_philadelphia,undefined,'No rice proxy in a no-rice roll');
assert.equal(Object.keys(exportGuideCatalog().foods).length,618,'Prescribed backend catalog remains unchanged');
console.log('PASS: 161 restaurant records, 15 chains, 43 official facts, explicit estimates, units and search');

assert.equal(rows.filter(f=>f.comboPieces).length,9);for(const f of rows.filter(f=>f.comboPieces)){assert.match(FOOD_UNIT_PORTIONS[f.id].label,/combo de/);assert.ok(f.comboPieces>=10);assert.ok(f.k*f.servingGrams>200);}
