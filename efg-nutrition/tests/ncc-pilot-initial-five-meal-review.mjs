// 02-03: proposal-only selected five-meal menu; NEVER a nutrition or server-approval record.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_FOODS} from '../pilot/food-catalog.js';
import {approvedFoodGuide} from '../pilot/coach-food-selection.js';
const read=name=>JSON.parse(readFileSync(new URL('../docs/'+name,import.meta.url),'utf8'));
const menu=read('NCC_PILOT_INITIAL_FIVE_MEAL_REVIEW_20261102.json');
const source=read('NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json');
assert.equal(menu.status,'PENDING_OPERATOR_REVIEW');
assert.equal(menu.publishable,false);
assert.equal(menu.backendApprovedCount,0);
assert.deepEqual([...new Set(menu.candidateFoodIds)].length,9);
assert.equal(menu.servingUnit,'g');
assert.deepEqual(menu.meals.map(x=>x.slot),['desayuno','media_manana','almuerzo','merienda','cena']);
assert.ok(menu.blockedMappings.some(x=>x.catalogFoodId==='chicken'));
assert.ok(menu.blockedMappings.some(x=>x.catalogFoodId==='milk_skim'));
const matches=new Map(source.records.map(x=>[x.foodId,x]));
const pwaById=new Map(EXTRA_FOODS.map(x=>[x.id,x]));
const chickenPwa=pwaById.get('chicken_breast_roasted');
assert.ok(chickenPwa,'FNDDS chicken must be present in the actual PWA catalog');
assert.equal(chickenPwa.unit,'g');
assert.equal(chickenPwa.sourceId,'2705956');
assert.equal(chickenPwa.k,1.61);
assert.equal(chickenPwa.p,.3022);
assert.equal(chickenPwa.c,0);
assert.equal(chickenPwa.f,.0352);
assert.equal(chickenPwa.fi,0);
assert.notEqual(chickenPwa.validationStatus,'reviewed','PWA source reference is not an operator approval');
const legacy=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
for(const id of ['brownrice','potato','banana','oil']){
 assert.ok(legacy.includes('{id:"'+id+'",name:'),'Missing PWA legacy food '+id);
}
for(const id of menu.candidateFoodIds){
 assert.ok(pwaById.has(id)||['brownrice','potato','banana','oil'].includes(id),
  'Selected ID is not in legacy or extended PWA catalog: '+id);
}
// This is a simulated draft. Never call a hosted RPC or set review flags.
const proposal={kind:'five_meal_example',version:1,meals:menu.meals.map(x=>({
 slot:x.slot,items:x.items.map(i=>({id:i.foodId,unit:'g',qty:i.grams}))
}))};
assert.deepEqual(approvedFoodGuide(proposal,menu.candidateFoodIds,
 {knownIds:[...pwaById.keys(),'brownrice','potato','banana','oil']}).approvedFoodIds,
 [...menu.candidateFoodIds].sort());
assert.throws(()=>approvedFoodGuide(proposal,
 menu.candidateFoodIds.filter(id=>id!=='chicken_breast_roasted'),
 {knownIds:[...pwaById.keys(),'brownrice','potato','banana','oil']}),/no está seleccionado/);

assert.equal(source.readiness,'NOT_REVIEWED');
assert.equal(source.publishable,false);
assert.equal(source.rawSourceBackendSeeded,false);
const precise=menu.preciseChickenCandidate;
assert.equal(precise.fdcId,2705956);
assert.equal(precise.publishable,false);
assert.equal(precise.needsPrimarySourceCaptureAndHumanReview,true);
assert.equal(matches.get('chicken').fdcId,171477);
assert.notEqual(precise.foodId,'chicken');
assert.equal(precise.foodId,'chicken_breast_roasted');
assert.equal(precise.pwaCatalogIdAlreadyExists,true);
assert.equal(precise.fdcIdentityAlreadyListed,true);
const totals={k:0,p:0,c:0,f:0,fi:0};
const named=new Set(menu.candidateFoodIds);
for(const meal of menu.meals){
 assert.ok(meal.items.length>0);
 for(const item of meal.items){
  assert.ok(named.has(item.foodId));
  assert.ok(!['chicken','milk_skim'].includes(item.foodId));
  assert.ok(Number.isInteger(item.grams)&&item.grams>=1&&item.grams<=500);
  const record=item.foodId===precise.foodId?precise:matches.get(item.foodId);
  assert.ok(record,'Faltan fuente e identidad de '+item.foodId);
  if(item.foodId!==precise.foodId){
   assert.equal(record.reviewStatus,'pending_operator_review');
   assert.equal(record.canPublish,false);
   assert.equal(record.unit,'g');
  }
  for(const field of Object.keys(totals)){
   const value=record.per100g[field];
   assert.ok(Number.isFinite(value)&&value>=0,item.foodId+':'+field);
   totals[field]+=value*item.grams/100;
  }
 }
}
assert.equal(source.records.filter(x=>menu.candidateFoodIds.includes(x.foodId)).length,8);
assert.ok(totals.k>0&&totals.p>0&&totals.fi>0);
console.log('PASS 02-03 REVIEW-ONLY: five meals / gram-based preliminary totals '+JSON.stringify(Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Math.round(v*10)/10])))+'; no operator approval and NO backend writes.');
