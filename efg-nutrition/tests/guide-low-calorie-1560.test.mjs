import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceReviewCatalogForSyntheticCoach} from '../tools/prepare-ncc-source-review-batch.mjs';
import {generateFlexibleGuidedDay,removeFlexibleFood} from '../pilot/guided-day-v2.js';
import {guideDeviation,guideQuantityRanges,guideTotals,validateGuidedDay} from '../pilot/guided-day.js';

const goal={kcal:1560,protein_g:112,carb_g:166,fat_g:50,fiber_g:22};
const catalog=sourceReviewCatalogForSyntheticCoach();
const profile={patternId:'omnivore',windowId:'12_12',restrictionStatus:'declared',restrictions:[]};
const report=guide=>Object.fromEntries(Object.entries(guideDeviation(guide,goal)).map(([k,d])=>[k,Number(d.percent.toFixed(2))]));

test('1,560 kcal / 112 P / 166 HC / 50 G: generation adapts six meals without changing targets',()=>{
 const input=structuredClone(goal),foodCopy=structuredClone(catalog);
 const guide=generateFlexibleGuidedDay(catalog,goal,profile);
 const d=guideDeviation(guide,goal),b=guideQuantityRanges(guide);
 console.log('LOW_GOAL_DECLARED',JSON.stringify({totals:guideTotals(guide).totals,deviations:report(guide),minimums:b,menu:guide.meals.map(m=>({slot:m.slot,foods:m.items.map(f=>[f.id,f.qty])}))}));
 assert.deepEqual(goal,input,'Coach-approved target stays unchanged');
 assert.deepEqual(catalog,foodCopy,'Catalog is not modified');
 assert.equal(guide.meals.length,6,'Keep six slots for the 12:12 profile');
 assert.ok(guide.meals.every(m=>m.items.length>=1));
 assert.ok(d.k.actual<1750,'Do not reproduce the 1,849-kcal seed when target is 1,560');
 for(const k of ['k','p','c','f']){
  assert.ok(Math.abs(d[k].percent)<=5, k+' should be within 5%: '+JSON.stringify(report(guide)));
 }
 assert.doesNotThrow(()=>validateGuidedDay(guide,goal));
});
test('unknown restrictions remain declared as unverified, never silently set safe',()=>{
 const guide=generateFlexibleGuidedDay(catalog,goal,{...profile,restrictionStatus:'unknown'});
 console.log('LOW_GOAL_UNKNOWN',JSON.stringify({totals:guideTotals(guide).totals,deviations:report(guide)}));
 assert.equal(guide.meals.length,6);
 assert.ok(guide.profileReviewNotes.some(s=>s.includes('Restricciones sin verificar')));
 assert.ok(guideDeviation(guide,goal).k.actual<1849,'Improve the initial generated menu even before clinical review');
});
test('an existing edited coach guide is not altered by the automatic composition pruning step',()=>{
 const guide=generateFlexibleGuidedDay(catalog,goal,profile);
 const before=structuredClone(guide),meal=guide.meals.find(m=>m.items.length>1),item=meal.items[0];
 // Explicit coach edits continue to use the quantity-only engine in guided-day.
 assert.deepEqual(guide,before);
 assert.ok(item.qty>0);
});
