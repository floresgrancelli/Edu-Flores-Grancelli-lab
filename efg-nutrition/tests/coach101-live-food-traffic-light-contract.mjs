import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOOD_COMPATIBILITY_ENABLED} from '../pilot/food-compatibility.js';
import {profilePatternForCompatibility,reviewedRowsToCatalogEvidence,describeTrafficLight,loadReviewedFoodEvidence} from '../pilot/food-compatibility-adapter.js';
assert.equal(FOOD_COMPATIBILITY_ENABLED,true);
assert.equal(profilePatternForCompatibility('omnivore'),'balanced');
assert.equal(profilePatternForCompatibility('vegan'),'vegan');
assert.equal(profilePatternForCompatibility('unknown'),'balanced');
const food={id:'test_food',name:'Ejemplo',k:990,f:80};
assert.equal(describeTrafficLight(food,{pattern:'balanced'}).color,'neutral');
assert.equal(describeTrafficLight(food,{pattern:'vegan'}).color,'yellow');
for(const flag of ['celiac','sibo','lactose_intolerance','diabetes']){
 const r=describeTrafficLight(food,{pattern:'vegan',restrictions:[flag]});
 assert.equal(r.color,'yellow');assert.equal(r.canRecord,true);
}
const row={food_id:'test_food',rule:'pattern:vegan',status:'reviewed',
 catalog_review_id:'trusted_review_2026',catalog_version:'catalog2026',
 source_kind:'manufacturer_label',source_url:'https://example.org/label',
 ingredient_classes:['plant'],complete_ingredients:true,
 reviewed_at:'2026-10-01T00:00:00Z',expires_at:'2026-12-01T00:00:00Z'};
const evidence=reviewedRowsToCatalogEvidence([row]);
assert.equal(describeTrafficLight(food,{pattern:'vegan',evidence}).color,'green');
assert.equal(describeTrafficLight(food,{pattern:'vegan',restrictions:['celiac'],evidence}).color,'yellow');
assert.equal(describeTrafficLight(food,{pattern:'vegan',evidence:[{...evidence[0],ingredientClasses:['meat']}]}).color,'red');
assert.match(describeTrafficLight(food,{pattern:'vegan',inPlan:true,evidence}).details,/Incluido en mi plan/);
assert.deepEqual(reviewedRowsToCatalogEvidence([{...row,status:'draft'}]),[]);
let calls=0;
const query={select(){return this},in(){return this},eq(){return this},limit(){return Promise.resolve({data:[row],error:null})}};
const db={from(table){assert.equal(table,'efg_food_compatibility_evidence');calls++;return query}};
const found=await loadReviewedFoodEvidence(db,{foodIds:['test_food'],patterns:['vegan']});
assert.equal(found.length,1);assert.equal(calls,1);
assert.deepEqual(await loadReviewedFoodEvidence(db,{foodIds:['test_food'],patterns:['balanced']}),[]);
assert.equal(calls,1);
const down={from(){return {select(){return this},in(){return this},eq(){return this},limit(){return Promise.resolve({data:null,error:{message:'offline'}})}}}};
await assert.rejects(()=>loadReviewedFoodEvidence(down,{foodIds:['test_food'],patterns:['vegan']}),/revisiones/);
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../pilot/index.html',import.meta.url),'utf8');
for(const check of [/function foodTrafficLight\(food\)/,/function refreshFoodCompatibilityEvidence\(\)/,/groupedFoodOptions\(displayedWithSignals,slot\)/,/mealCompatibilityStatus/,/foodTrafficLight\(f\)\.symbol/,/await refreshFoodCompatibilityEvidence\(\)/])assert.match(app,check);
assert.match(app,/if\(switchingUser\)\{state\.foodCompatEvidence=\[\];/, 'No cached reviews from a previous user');
assert.match(app,/if\(action==="logout"\)\{[^\n]*state\.foodCompatEvidence=\[\];/, 'Logout clears review cache even when additional private pilot state is reset first');
assert.match(app,/Alimentos disponibles para planificar/);
assert.match(app,/Semáforo por patrón alimentario/);
assert.match(app,/Los colores no indican calorías y no impiden registrar alimentos/);
assert.match(app,/data-coachfood[\s\S]*foodTrafficLight\(f\)\.symbol/);
assert.match(html,/food-compatibility\.css\?v=20261030-coach101/);
assert.match(html,/pilot\.js\?v=20261030-coach117-legal-first/, 'PWA loads latest shared module while retaining traffic lights');
for(const name of ['green','yellow','red'])assert.ok(readFileSync(new URL('../pilot/food-compatibility.css',import.meta.url),'utf8').includes('.efg-compat-'+name));
console.log('PASS COACH101: reviewed-only green/red, missing or clinical yellow, no-restriction neutral, searchable food and coach plan badge.');
