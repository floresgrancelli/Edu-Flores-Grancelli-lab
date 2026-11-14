import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ALCOHOL_FOODS,ALCOHOL_PORTIONS} from '../pilot/food-alcohol-20261114.js';
import {EXTRA_FOODS,FOOD_UNIT_PORTIONS,foodSearchText} from '../pilot/food-catalog.js';
const by=id=>ALCOHOL_FOODS.find(x=>x.id==='alc_'+id);
assert.equal(ALCOHOL_FOODS.length,74);assert.equal(new Set(EXTRA_FOODS.map(x=>x.id)).size,EXTRA_FOODS.length);
for(const f of ALCOHOL_FOODS){
 assert.equal(EXTRA_FOODS.find(x=>x.id===f.id).k,f.k);assert.equal(f.unit,'ml');assert.equal(FOOD_UNIT_PORTIONS[f.id].grams,f.servingMl);
 for(const key of ['k','p','c','f','fi','ethanol_g_per_ml'])assert.ok(Number.isFinite(f[key])&&f[key]>=0);
 assert.ok(Math.abs(f.k-(f.p*4+f.c*4+f.f*9+f.ethanol_g_per_ml*7))<1e-9);assert.ok(f.k>0);assert.ok(f.source.includes('ESTIMACIÓN'));assert.ok(f.source.length<1600);
 for(const portions of [.5,1,1.5,2])assert.ok(f.k*ALCOHOL_PORTIONS[f.id].grams*portions>0);
}
assert.equal(by('whisky').p+by('whisky').c+by('whisky').f,0);assert.ok(by('whisky').k*45>90&&by('whisky').k*45<105);
for(const [regular,zero] of [['fernet_cola','fernet_zero'],['gin_tonic','gin_tonic_zero'],['cuba_libre','cuba_libre_zero']]){
 const a=by(regular),b=by(zero);assert.equal(a.ethanol_g_per_ml,b.ethanol_g_per_ml);assert.ok(a.k>b.k);assert.ok(b.k>0);
}
for(const [id,query] of [['penicillin','penicilin'],['fernet_zero','coca'],['caipirinha','caipirinha'],['pisco_sour','pisco']])assert.ok(foodSearchText(by(id)).toLowerCase().includes(query));
const pilot=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');assert.match(pilot,/return selectableFoods\(\)\.filter\(food=>!food.alcohol&&/);
console.log('PASS: 74 alcohol entries, portions, provenance, energy and zero variants');

for(const id of ['almonds','walnuts','cashews','pistachios','hazelnuts','pecans','brazil_nuts','macadamia_nuts','peanuts']){assert.equal(FOOD_UNIT_PORTIONS[id].grams,25);assert.ok(EXTRA_FOODS.some(f=>f.id===id));}
console.log('PASS: nine individual nuts with edible 25 g portions');
