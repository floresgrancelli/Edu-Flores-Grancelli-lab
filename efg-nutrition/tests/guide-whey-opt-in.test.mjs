import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceReviewCatalogForSyntheticCoach} from '../tools/prepare-ncc-source-review-batch.mjs';
import {generateFlexibleGuidedDay,guideFoodSignal} from '../pilot/guided-day-v2.js';
import {guideTotals,guideDeviation,validateGuidedDay} from '../pilot/guided-day.js';

const catalog=sourceReviewCatalogForSyntheticCoach();
const goal={kcal:1560,protein_g:112,carb_g:166,fat_g:50,fiber_g:22};
const profile={patternId:'omnivore',windowId:'12_12',restrictionStatus:'declared',restrictions:[]};
const wheyItems=plan=>plan.meals.flatMap(meal=>meal.items.filter(item=>item.id==='whey_powder')
 .map(item=>({slot:meal.slot,qty:item.qty,locked:item.locked,k:item.k,p:item.p})));
test('optional whey stays optional, but selected 30 g survives 1560 kcal composition fitting',()=>{
 assert.ok(catalog.some(f=>f.id==='whey_powder'),'Whey must be present in the reviewed synthetic catalog');
 const goalCopy=structuredClone(goal),foodsCopy=structuredClone(catalog);
 const without=generateFlexibleGuidedDay(catalog,goal,profile);
 assert.equal(wheyItems(without).length,0);
 const withWhey=generateFlexibleGuidedDay(catalog,goal,{...profile,includeWhey:true});
 assert.deepEqual(wheyItems(withWhey).map(({slot,qty,locked})=>({slot,qty,locked})),
  [{slot:'media_manana',qty:30,locked:true}]);
 assert.equal(withWhey.meals.length,6);
 const nutrients=guideTotals(withWhey).totals,scoop=wheyItems(withWhey)[0];
 assert.ok(nutrients.p>=scoop.p*30);
 assert.ok(nutrients.k>=scoop.k*30);
 assert.ok(Number.isFinite(guideDeviation(withWhey,goal).k.percent));
 assert.doesNotThrow(()=>validateGuidedDay(withWhey,goal));
 assert.deepEqual(goal,goalCopy);assert.deepEqual(catalog,foodsCopy);
});
test('missing clinical verification is amber review, never silent removal or safety claim',()=>{
 const guide=generateFlexibleGuidedDay(catalog,goal,{...profile,includeWhey:true,restrictionStatus:'unknown'});
 assert.equal(wheyItems(guide).length,1);
 assert.equal(wheyItems(guide)[0].qty,30);
 assert.ok(guide.profileReviewNotes.some(s=>s.includes('Restricciones sin verificar')));
 assert.ok(guide.profileReviewNotes.some(s=>s.includes('Scoop de whey')&&s.includes('verificación')));
 assert.equal(guideFoodSignal(catalog.find(f=>f.id==='whey_powder'),{...profile,restrictionStatus:'unknown'}).status,'review');
});
test('16:8 schedules the requested scoop in an existing afternoon snack',()=>{
 const guide=generateFlexibleGuidedDay(catalog,goal,{...profile,includeWhey:true,windowId:'16_8'});
 assert.equal(guide.meals.length,4);
 assert.deepEqual(wheyItems(guide).map(({slot,qty,locked})=>({slot,qty,locked})),
  [{slot:'media_tarde',qty:30,locked:true}]);
});
test('known incompatibilities and missing whey block visibly',()=>{
 assert.throws(()=>generateFlexibleGuidedDay(catalog,goal,{...profile,includeWhey:true,patternId:'vegan'}),/No se agregó whey/);
 assert.throws(()=>generateFlexibleGuidedDay(catalog,goal,{...profile,includeWhey:true,restrictions:['lactose_intolerance']}),/No se agregó whey/);
 assert.throws(()=>generateFlexibleGuidedDay(catalog.filter(f=>f.id!=='whey_powder'),goal,{...profile,includeWhey:true}),/no está disponible/);
});
