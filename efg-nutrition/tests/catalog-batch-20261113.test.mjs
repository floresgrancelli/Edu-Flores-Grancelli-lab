import {normalizeApprovedPrefillDelta} from './approved-prefill-delta.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CATALOG_BATCH_FOODS as batch,CATALOG_BATCH_PORTIONS as portions} from '../pilot/food-catalog-batch-20261113.js';
import {EXTRA_FOODS,foodSearchText,FOOD_UNIT_PORTIONS} from '../pilot/food-catalog.js';
import {exportGuideCatalog} from '../tools/export-guide-catalog.mjs';
import {FOOD_PHOTO_MAP,resolveFoodVisual} from '../pilot/food-visuals-r2.js';
import {applyCoachCatalog} from '../pilot/coach-catalog-guide.js';
import {validateCoachPlanProposal} from '../pilot/coach-plan-draft-client.js';
import {assessDietarySignal} from '../pilot/dietary-traffic-light.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),folder=new URL('../docs/catalog-batch-20261113/',import.meta.url);
const old=JSON.parse(readFileSync(new URL('baseline-catalog.json',folder))),review=JSON.parse(readFileSync(new URL('review.json',folder))),now=exportGuideCatalog();
assert.equal(Object.keys(old.foods).length,560);assert.ok(Object.keys(now.foods).length>=585);assert.equal(batch.length,25);
for(const [id,row] of Object.entries(old.foods))assert.deepEqual(now.foods[id],row,id+' published row must remain exact');
assert.equal(new Set(EXTRA_FOODS.map(x=>x.id)).size,EXTRA_FOODS.length);assert.equal(new Set(batch.map(x=>x.name)).size,25);
const goal={goal_type:'maintenance',kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};
for(const food of batch){
 assert.ok(!old.foods[food.id]);assert.equal(food.unit,'g');const evidence=review.records.find(x=>x.id===food.id);assert.equal(String(evidence.fdcId),food.sourceId);
 for(const key of ['k','p','c','f','fi'])assert.equal(food[key],evidence.nutrientsPer100g[key]/100,food.id+' '+key);
 assert.deepEqual(FOOD_UNIT_PORTIONS[food.id],portions[food.id]);assert.match(portions[food.id].label,new RegExp(portions[food.id].grams+' g'));assert.ok(Object.hasOwn(FOOD_PHOTO_MAP,food.id));assert.equal(resolveFoodVisual(food),FOOD_PHOTO_MAP[food.id]);
 assert.equal(assessDietarySignal({foodId:food.id,restrictions:['celiac'],reviewedRows:[]}).color,'yellow','Nutrient references never certify clinical compatibility');
 const guide={kind:'flexible_meal_guide',version:2,meals:[{slot:'almuerzo',items:[{...food,qty:37.5,locked:true}]},{slot:'cena',items:[{...now.foods.chicken,qty:100,locked:true}]}]};
 const copy=structuredClone(guide),canonical=applyCoachCatalog(guide,{version:now.version,foods:[now.foods[food.id],now.foods.chicken]});assert.deepEqual(guide,copy);assert.equal(canonical.meals[0].items[0].qty,37.5);assert.doesNotThrow(()=>validateCoachPlanProposal(goal,canonical));
}
for(const [term,id] of [['espinaca cruda','spinach_raw'],['pelon','nectarine_raw'],['burgol seco','bulgur_dry'],['leche en polvo','milk_powder_skim_instant'],['jugo tomate','tomato_juice_unsalted_weight']]){
 const f=batch.find(x=>x.id===id),norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();assert.ok(term.split(' ').every(w=>norm(foodSearchText(f)).includes(w)),id+' searchable');
}
// Existing catalog dependencies keep their formulas/semantics. New feature modules and the app entry are validated by their own flow/security suites, not frozen to this historical catalog batch.
const paths=execFileSync('git',['-c','safe.directory='+root,'diff','--diff-filter=M','--name-only','e2dc451f75d0b4d31fa9af3b39a83c62626c13c8','--','efg-nutrition/pilot'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const path of paths.filter(x=>/\.m?js$/.test(x)&&!x.endsWith('/pilot.js')&&!x.endsWith('/version-notice.js')&&!x.endsWith('/notifications-ui.js')&&!x.endsWith('/food-visuals-r2.js')&&!x.endsWith('/food-catalog.js')&&!x.endsWith('/food-catalog-batch-20261113.js')&&!x.endsWith('/food-catalog-batch-two-20261113.js'))){
 const prior=execFileSync('git',['-c','safe.directory='+root,'show','e2dc451f75d0b4d31fa9af3b39a83c62626c13c8:'+path],{cwd:root,encoding:'utf8'}),current=readFileSync(resolve(root,path),'utf8');const strip=s=>normalizeApprovedPrefillDelta(s).replace(/\?v=[A-Za-z0-9_-]+/g,'?v=IDENTITY');assert.equal(strip(current),strip(prior),'Only import identities may change: '+path);
}
console.log('PASS additive catalog: 25 exact source rows, 560 unchanged foods, at least585 identities, quantities, guide draft compatibility, conservative restrictions and explicit identity thumbnails');
