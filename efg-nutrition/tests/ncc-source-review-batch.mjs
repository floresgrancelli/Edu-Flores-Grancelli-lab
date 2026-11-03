// NCC P1 selected-source evidence: exact six-slot review and arbitrary coach
// substitutions, including canonical recipe ingredients. No hosted writes.
import assert from 'node:assert/strict';
import {preparePilotSourceReview,reviewCsv,operatorReviewCsv,recipeComponentReviewCsv,
 sourceReviewCatalogForSyntheticCoach} from '../tools/prepare-ncc-source-review-batch.mjs';
import {generateFlexibleGuidedDay,removeFlexibleMeal,replaceFlexibleFood}
 from '../pilot/guided-day-v2.js';
const packet=preparePilotSourceReview();
const get=id=>packet.foods.find(x=>x.id===id);
assert.equal(packet.kind,'NCC_GUIDE_SELECTED_SOURCE_REVIEW_ONLY');
assert.equal(packet.schemaVersion,1);
assert.equal(packet.selectedMeals.length,6);
assert.deepEqual(packet.selectedMeals.map(x=>x.slot),
 ['desayuno','media_manana','almuerzo','media_tarde','merienda','cena']);
assert.equal(packet.selectedUniqueFoodCount,17);
assert.equal(packet.foods.length,17);
assert.ok(packet.actualCatalogSize>150);
assert.match(packet.sourceCatalogFingerprintSha256,/^[a-f0-9]{64}$/);
assert.match(packet.selectedGuideFingerprintSha256,/^[a-f0-9]{64}$/);
const operatorDefault=operatorReviewCsv(packet);
assert.equal(operatorDefault.split('\n').filter(Boolean).length,18,
 'Default operator worklist includes exactly 17 selected foods');
assert.match(operatorDefault,/official_fdc_record_url/);
assert.match(operatorDefault,/operator_decision_BLANK/);
assert.match(operatorDefault,/source_fi_per100g/);
assert.match(operatorDefault,/delta_p_per100_comparable/);
assert.match(operatorDefault,/reviewed_at_utc_BLANK/);
assert.match(operatorDefault,/food-details\/171688\/nutrients/);
assert.doesNotMatch(operatorDefault,/"APPROVED"/);
assert.match(packet.pinnedEvidenceFingerprintSha256,/^[a-f0-9]{64}$/);
assert.equal(packet.publishable,false);
assert.equal(packet.notACatalogWhitelist,true);
assert.equal(packet.approvalsGranted,0);
assert.equal(packet.sourceRecordsInserted,0);
assert.ok(packet.foods.every(x=>x.humanReview==='PENDING'&&!x.approvedForServer&&
 x.approvedBy===null&&x.approvedAt===null));
assert.deepEqual(packet.countsByEvidenceState,{
 CATALOG_FDC_REFERENCE_ONLY:2,
 NO_EXACT_PRIMARY_SOURCE:7,
 BLOCKED_UNIT_MASS_VS_VOLUME:1,
 RECONCILIATION_REQUIRED:1,
 BLOCKED_PREPARATION:1,
 ARCHIVE_CAPTURE_PENDING_OPERATOR:5
});
assert.equal(packet.foods.filter(x=>x.sourcePer100g!==null).length,8);
assert.equal(get('milk_skim').unit,'ml');
assert.equal(get('milk_skim').sourceUnit,'g');
assert.equal(get('milk_skim').deltaPer100ComparableUnits,null);
assert.equal(get('milk_skim').evidenceState,'BLOCKED_UNIT_MASS_VS_VOLUME');
assert.equal(get('chicken').evidenceState,'BLOCKED_PREPARATION');
assert.equal(get('chicken').sourceFdcId,'171477');
assert.equal(get('egg').sourceFdcId,'748967');
assert.equal(get('egg').sourcePer100g,null,'A catalog FDC ID is not an independent official capture');
assert.equal(get('yogurt').sourcePer100g,null);
assert.equal(get('apple').appPer100Unit.k,52);
assert.equal(get('apple').sourcePer100g.k,52);
assert.equal(get('apple').deltaPer100ComparableUnits.k,0);
assert.equal(get('oats_raw').appPer100Unit.k,379);
assert.equal(get('oats_raw').sourcePer100g.k,379);
assert.equal(get('oats_raw').deltaPer100ComparableUnits.k,0);
assert.equal(get('oats_raw').deltaPer100ComparableUnits.f,-0.02);
assert.equal(get('apple').deltaPer100ComparableUnits.c,0.01);
assert.equal(get('brownrice').appPer100Unit.fi,1.8);
assert.equal(get('brownrice').sourcePer100g.fi,1.6);
assert.equal(get('brownrice').deltaPer100ComparableUnits.fi,0.2);
assert.equal(get('oil').appPer100Unit.k,884);
assert.equal(get('oil').sourcePer100g.k,884);
assert.equal(get('oil').humanReview,'PENDING',
 'Even an exact source match requires human review');
assert.equal(get('bread').sourceFdcId,null);
assert.ok(reviewCsv(packet).split('\n').length>=18);

// A real Coach is free to choose items OUTSIDE the initial 17, including the
// canonical ingredients of a Fit or permitted personal recipe.
const extra={kind:'flexible_meal_guide',version:2,student_id:'MUST_NOT_LEAK',
 profileReviewNotes:['MUST_NOT_LEAK_SENSITIVE_PROFILE'],meals:[
 {slot:'desayuno',items:[
  {id:'egg',unit:'g',qty:50},
  {id:'banana',unit:'g',qty:70},
  {id:'raisins',unit:'g',qty:15}]},
 {slot:'cena',items:[
  {id:'chicken_breast_roasted',unit:'g',qty:150},
  {id:'rice',unit:'g',qty:120}]}
]};
const expanded=preparePilotSourceReview({guide:extra});
assert.equal(expanded.selectedUniqueFoodCount,5);
assert.equal(expanded.selectedMeals.length,2);
assert.ok(expanded.foods.some(x=>x.id==='raisins'&&!x.partOfInitial17));
assert.ok(expanded.foods.some(x=>x.id==='chicken_breast_roasted'&&!x.partOfInitial17));
assert.equal(expanded.foods.find(x=>x.id==='raisins').evidenceState,
 'NEW_SELECTED_ID_REQUIRES_SOURCE_REVIEW');
assert.equal(expanded.foods.find(x=>x.id==='chicken_breast_roasted').humanReview,'PENDING');
assert.equal(expanded.notACatalogWhitelist,true);
assert.doesNotMatch(JSON.stringify(expanded),/MUST_NOT_LEAK/);
assert.equal(expanded.approvalsGranted,0);
const again=preparePilotSourceReview({guide:extra});
assert.deepEqual(again,expanded,'Same selected foods and local source must yield identical evidence');
for(const [bad,reason] of [
 [{...extra,meals:[{slot:'desayuno',items:[{id:'egg',unit:'ml',qty:1}]}]},/2 and 6|slot count/],
 [{...extra,meals:[{slot:'desayuno',items:[{id:'egg',unit:'ml',qty:1}]},
  extra.meals[1]]},/unit differs/],
 [{...extra,meals:[{slot:'desayuno',items:[{id:'unknown_catalog_item',unit:'g',qty:50}]},
  extra.meals[1]]},/Unknown food/],
 [{...extra,meals:[{slot:'desayuno',items:[{id:'egg',unit:'g',qty:50,k:999}]},
  extra.meals[1]]},/macros no longer match/],
 [{...extra,meals:[{slot:'desayuno',items:[{id:'fit-recipe:dessert',unit:'g',qty:1}]},
  extra.meals[1]]},/Expand recipe ingredients/],
 [{...extra,meals:[extra.meals[0],extra.meals[0]]},/Duplicate\/unknown meal slot/]
])assert.throws(()=>preparePilotSourceReview({guide:bad}),reason);

const exactSourceCandidate={kind:'flexible_meal_guide',version:2,meals:[
 {slot:'desayuno',items:[{id:'oats_raw',unit:'g',qty:50},{id:'yogurt_greek_light',unit:'g',qty:200},{id:'banana',unit:'g',qty:100}]},
 {slot:'media_manana',items:[{id:'apple',unit:'g',qty:120},{id:'yogurt_greek_light',unit:'g',qty:125}]},
 {slot:'almuerzo',items:[{id:'chicken_breast_roasted',unit:'g',qty:170},{id:'brownrice',unit:'g',qty:180},
  {id:'spinach_cooked',unit:'g',qty:120},{id:'oil',unit:'g',qty:10}]},
 {slot:'media_tarde',items:[{id:'banana',unit:'g',qty:100},{id:'yogurt_greek_light',unit:'g',qty:180}]},
 {slot:'merienda',items:[{id:'oats_raw',unit:'g',qty:45},{id:'yogurt_greek_light',unit:'g',qty:180}]},
 {slot:'cena',items:[{id:'chicken_breast_roasted',unit:'g',qty:150},{id:'potato',unit:'g',qty:200},
  {id:'spinach_cooked',unit:'g',qty:100},{id:'oil',unit:'g',qty:10}]}
]};
const exactReview=preparePilotSourceReview({guide:exactSourceCandidate});
assert.equal(exactReview.selectedUniqueFoodCount,9);
assert.match(exactReview.selectedGuideFingerprintSha256,/^[a-f0-9]{64}$/);
const operatorNine=operatorReviewCsv(exactReview);
assert.equal(operatorNine.split('\n').filter(Boolean).length,10);
assert.match(operatorNine,/food-details\/2705956\/nutrients/);
assert.match(operatorNine,/food-details\/170894\/nutrients/);
assert.match(operatorNine,/food-details\/168463\/nutrients/);
assert.match(operatorNine,/FNDDS_CAPTURE_PENDING_OPERATOR/);
assert.match(operatorNine,/RECONCILIATION_REQUIRED/);
assert.doesNotMatch(operatorNine,/"APPROVED"/);
assert.doesNotMatch(operatorNine,/MUST_NOT_LEAK/);
const changedQty=structuredClone(exactSourceCandidate);
changedQty.meals[0].items[0].qty+=1;
assert.notEqual(preparePilotSourceReview({guide:changedQty}).selectedGuideFingerprintSha256,
 exactReview.selectedGuideFingerprintSha256,
 'Operator fingerprint must change whenever a guide portion changes');
assert.throws(()=>operatorReviewCsv({...exactReview,publishable:true}));
assert.throws(()=>operatorReviewCsv({...exactReview,approvalsGranted:1}));
assert.ok(exactReview.foods.every(f=>f.sourcePer100g!==null),
 'Optional nine-food case should reuse all already captured official source records');
assert.equal(exactReview.foods.find(f=>f.id==='yogurt_greek_light').sourceFdcId,'170894');
assert.equal(exactReview.foods.find(f=>f.id==='spinach_cooked').sourceFdcId,'168463');
assert.equal(exactReview.foods.find(f=>f.id==='chicken_breast_roasted').sourceFdcId,'2705956');
assert.equal(exactReview.foods.find(f=>f.id==='chicken_breast_roasted').evidenceState,'FNDDS_CAPTURE_PENDING_OPERATOR');
assert.equal(exactReview.foods.find(f=>f.id==='brownrice').deltaPer100ComparableUnits.fi,0.2);
assert.equal(exactReview.foods.find(f=>f.id==='chicken_breast_roasted').deltaPer100ComparableUnits.p,0.02);
assert.ok(exactReview.foods.every(f=>f.humanReview==='PENDING'&&!f.approvedForServer));
assert.equal(exactReview.publishable,false);
assert.equal(exactReview.approvalsGranted,0);
assert.equal(exactReview.sourceRecordsInserted,0);
assert.equal(exactReview.notACatalogWhitelist,true);
const validIds=exactReview.foods.map(x=>x.id);
assert.doesNotThrow(()=>preparePilotSourceReview({guide:{...exactSourceCandidate,approvedFoodIds:validIds}}));
for(const wrong of [[...validIds,'chicken'],validIds.slice(1),[...validIds.slice(1),validIds[1]]])
 assert.throws(()=>preparePilotSourceReview({guide:{...exactSourceCandidate,approvedFoodIds:wrong}}),
  /approvedFoodIds must equal actual selected ingredients/);

// P18: actual auto-generated Coach proposal, actual editing, then source review.
// This is a FICTIONAL local guide, never a review of a particular student's diet.
{
 const catalog=sourceReviewCatalogForSyntheticCoach();
 const goal={kcal:2100,protein_g:140,carb_g:225,fat_g:65,fiber_g:28};
 const autogenerated=generateFlexibleGuidedDay(catalog,goal,{
  patternId:'balanced',restrictionStatus:'unknown'
 });
 assert.equal(autogenerated.meals.length,6);
 const first=preparePilotSourceReview({guide:autogenerated});
 const revised=replaceFlexibleFood(autogenerated,'almuerzo',0,
  {id:'chicken_breast_roasted',qty:170},catalog,goal);
 const final=removeFlexibleMeal(revised,'media_tarde',goal);
 const packet=preparePilotSourceReview({guide:final});
 assert.equal(packet.selectedMeals.length,5);
 assert.ok(packet.foods.some(row=>row.id==='chicken_breast_roasted'));
 assert.deepEqual(packet.foods.map(row=>row.id).sort(),
  [...new Set(final.meals.flatMap(m=>m.items.map(item=>item.id)))].sort());
 assert.notEqual(packet.selectedGuideFingerprintSha256,first.selectedGuideFingerprintSha256);
 assert.equal(packet.operatorReviewRequired,true);
 assert.equal(packet.approvalsGranted,0);
 assert.equal(packet.sourceRecordsInserted,0);
 assert.ok(packet.foods.every(row=>row.humanReview==='PENDING'&&!row.approvedForServer));
 assert.equal(packet.notACatalogWhitelist,true);
 const afterChange=structuredClone(final);
 afterChange.meals[0].items[0].qty+=1;
 assert.notEqual(preparePilotSourceReview({guide:afterChange}).selectedGuideFingerprintSha256,
  packet.selectedGuideFingerprintSha256,
  'Coach quantity edit must invalidate previous source review worklist');
 assert.ok(!operatorReviewCsv(packet).includes('APPROVED'));
 // Live composite recipes must be calculated from canonical ingredients:
 // an old raw catalog value cannot silently authorize its food source.
 const byId=new Map(catalog.map(f=>[f.id,f]));
 const composite={kind:'flexible_meal_guide',version:2,meals:[
  {slot:'almuerzo',items:[{...byId.get('tarta_atun_horno'),qty:160}]},
  {slot:'cena',items:[{...byId.get('pizza_margarita'),qty:110}]}
 ]};
 const componentPacket=preparePilotSourceReview({guide:composite});
 assert.ok(componentPacket.recipeComponents.some(x=>
  x.parentFoodId==='tarta_atun_horno'&&x.ingredientFoodId==='tapa_tarta'));
 assert.ok(componentPacket.recipeComponents.some(x=>
  x.parentFoodId==='pizza_margarita'&&x.ingredientFoodId==='pizza_base_efg'&&
   x.evidenceStatus==='UNVERIFIED_PROXY_NOT_IN_PWA_CATALOG'));
 assert.ok(componentPacket.unverifiedRecipeProxyCount>=1);
 assert.match(componentPacket.recipeComponentsFingerprintSha256,/^[a-f0-9]{64}$/);
 const componentCsv=recipeComponentReviewCsv(componentPacket);
 assert.match(componentCsv,/operator_decision_BLANK/);
 assert.match(componentCsv,/UNVERIFIED_PROXY_NOT_IN_PWA_CATALOG/);
 assert.doesNotMatch(componentCsv,/"APPROVED"/);
 const changedRecipe=structuredClone(composite);changedRecipe.meals[1].items[0].qty+=1;
 assert.notEqual(preparePilotSourceReview({guide:changedRecipe}).recipeComponentsFingerprintSha256,
  componentPacket.recipeComponentsFingerprintSha256,
  'Recipe component quantities are tied to exact selected serving');
 const cakeGuide={kind:'flexible_meal_guide',version:2,meals:[
  {slot:'desayuno',items:[{...byId.get('cake'),qty:82.5}]},
  {slot:'almuerzo',items:[{...byId.get('egg'),qty:100}]}
 ]};
 const cakePacket=preparePilotSourceReview({guide:cakeGuide});
 assert.equal(cakePacket.selectedUniqueFoodCount,2,
  'Review only selected PWA dish IDs; recipe components remain explicit rows');
 assert.equal(cakePacket.recipeComponents.filter(x=>x.parentFoodId==='cake').length,5);
 assert.ok(cakePacket.recipeComponents.some(x=>x.parentFoodId==='cake'&&x.ingredientFoodId==='whey_powder'));
 assert.equal(cakePacket.unverifiedRecipeProxyCount,0);
 console.log('PASS NCC P18 auto Coach draft -> edits -> source review, PWA composite macro parity, expanded modeled recipes and proxy evidence NEVER auto-approved.');
}

console.log('PASS NCC P1 selected sources + reviewer worklist: default17, optional9/6 with pinned evidence, per-nutrient PWA/source deltas, guide-bound fingerprint, empty approvals and no server writes.');
