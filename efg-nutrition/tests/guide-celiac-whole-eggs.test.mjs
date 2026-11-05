// Independent regression: no legacy 65 g egg lock, network or patient data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceReviewCatalogForSyntheticCoach} from '../tools/prepare-ncc-source-review-batch.mjs';
import {generateFlexibleGuidedDay,guideFoodSignal} from '../pilot/guided-day-v2.js';
import {guideDeviation,rebalanceGuidedDay} from '../pilot/guided-day.js';
test('celiac 2100 kcal generation keeps every target strictly within 2%, including fiber',()=>{
 const goal={kcal:2100,protein_g:126,carb_g:271,fat_g:57,fiber_g:29};
 const profile={restrictions:['celiac'],restrictionStatus:'declared'};
 const fresh=generateFlexibleGuidedDay(sourceReviewCatalogForSyntheticCoach(),goal,profile);
 const deviations=guideDeviation(fresh,goal);
 console.log('Celiac fixture deviations (%)',Object.fromEntries(Object.entries(deviations).map(([k,d])=>[k,d.percent])));
 assert.equal(fresh.meals.length,6);
 assert.ok(Object.values(deviations).every(d=>Math.abs(d.percent)<2),JSON.stringify(deviations));
 assert.ok(fresh.meals.every(m=>m.items.length>=2));
 for(const item of fresh.meals.flatMap(m=>m.items)){
  assert.notEqual(guideFoodSignal(item,profile).status,'avoid');
  if(item.id==='egg')assert.equal(item.qty%50,0);
 }
 const before=structuredClone(fresh),repaired=rebalanceGuidedDay(fresh,goal,{targetTolerance:.0199});
 const metadata=p=>p.meals.map(m=>m.items.map(({qty,...rest})=>rest));
 assert.deepEqual(metadata(repaired),metadata(fresh));
 assert.deepEqual(fresh,before);
 assert.deepEqual(repaired.meals.flatMap(m=>m.items.filter(i=>i.id==='egg').map(i=>i.qty)),fresh.meals.flatMap(m=>m.items.filter(i=>i.id==='egg').map(i=>i.qty)));
});
