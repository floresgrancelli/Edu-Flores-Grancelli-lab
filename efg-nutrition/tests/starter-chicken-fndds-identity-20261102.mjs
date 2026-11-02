// NCC 02-03: exact FNDDS protein identity vs PWA; not a server approval.
// All values are per edible gram; actual source bytes/provenance still require review.
import assert from 'node:assert/strict';
import {EXTRA_FOODS} from '../pilot/food-catalog.js';
import {GUIDE_FDC_IDS} from '../pilot/fdc-selected-export.js';
import {readFileSync} from 'node:fs';
const foods=EXTRA_FOODS.filter(x=>x.id==='chicken_breast_roasted');
assert.equal(foods.length,1,'Unique preparation-specific food ID required');
const item=foods[0];
assert.equal(item.sourceType,'usda_fdc');
assert.equal(item.sourceId,'2705956');
assert.equal(item.unit,'g');
assert.equal(item.validationStatus,'tabla_referenciada');
assert.match(item.name,/pechuga.*horno.*sin piel/i);
assert.match(item.source,/FNDDS 2021-2023/);
const expected={k:1.61,p:.3022,c:0,f:.0352,fi:0};
for(const [k,v] of Object.entries(expected))assert.ok(Math.abs(item[k]-v)<1e-10,'FNDDS source value drift '+k);
const m=JSON.parse(readFileSync(new URL('../docs/NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json',import.meta.url),'utf8'));
const other=m.records.find(x=>x.foodId==='chicken');
assert.equal(other.fdcId,171477);
assert.equal(GUIDE_FDC_IDS.chicken,171477);
assert.notEqual(Number(item.sourceId),other.fdcId);
assert.equal(other.canPublish,false);
assert.equal(other.reviewStatus,'pending_operator_review');
console.log('NCC_STARTER_PROTEIN '+JSON.stringify({
 foodId:item.id,sourceType:'FNDDS',fdcId:Number(item.sourceId),
 preparation:'baked broiled or roasted, skin not eaten, from raw',
 per100g:{k:161,p:30.22,c:0,f:3.52,fi:0},
 contrast:{foodId:'chicken',sourceType:'SR Legacy',fdcId:171477,equivalent:false},
 identityInPwa:true,independentOriginalSourceCapture:false,
 sourceHumanReviewed:false,backendApproved:false,publishable:false
}));
console.log('PASS: exact FNDDS protein reference is present and distinct from generic SR Legacy chicken; NO review fabricated.');
