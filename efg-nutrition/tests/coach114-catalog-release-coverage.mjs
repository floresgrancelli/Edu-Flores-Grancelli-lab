// NCC 02-03: real PWA catalog audit, NOT a hosted food approval or a clinical review.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_FOODS} from '../pilot/food-catalog.js';
import {GUIDE_FDC_IDS} from '../pilot/fdc-selected-export.js';
import {VERIFIED_FOODS,VERIFIED_SOURCE_COUNT} from '../pilot/food-source-audit.js';
const byId=new Map(EXTRA_FOODS.map(x=>[x.id,x]));
assert.equal(byId.size,EXTRA_FOODS.length,'No duplicated PWA food IDs');
assert.ok(byId.size>150,'The complete catalog cannot shrink to a five-food guide');
assert.equal(VERIFIED_SOURCE_COUNT,Object.keys(VERIFIED_FOODS).length);
const sourceCounts={},statusCounts={},categories={};
for(const food of EXTRA_FOODS){
 assert.ok(food.id&&food.name,'No anonymous food row');
 for(const n of ['k','p','c','f','fi'])
  assert.ok(Number.isFinite(food[n])&&food[n]>=0,'Invalid '+n+' at '+food.id);
 const src=food.sourceType||'not_declared',state=food.validationStatus||'not_declared';
 sourceCounts[src]=(sourceCounts[src]||0)+1;
 statusCounts[state]=(statusCounts[state]||0)+1;
 categories[food.category]=(categories[food.category]||0)+1;
 if(src==='usda_fdc'||src==='usda_fdc_converted'){
  assert.match(String(food.sourceId||''),/^\d+$/,'FDC ID missing '+food.id);
  assert.ok(food.source?.includes('USDA'),'FDC source note missing '+food.id);
 }
 if(src==='usda_fdc_converted')
  assert.ok(food.unit==='ml'&&Number.isFinite(food.densityGramsPerMl)&&food.densityGramsPerMl>0,
   'Density conversion not separately described '+food.id);
}
const archiveFive=new Set(['apple','oats_raw','milk_skim','yogurt_greek_light','spinach_cooked']);
const pinned=Object.entries(GUIDE_FDC_IDS).map(([foodId,fdcId])=>{
 const food=byId.get(foodId)||null;
 if(food?.sourceId!=null)assert.equal(food.sourceId,String(fdcId),'FDC ID drift '+foodId);
 return {foodId,fdcId,frontendListed:Boolean(food),
  frontendSource:food?.sourceType||null,unit:food?.unit||null,
  archivedCapture:archiveFive.has(foodId),
  sourceReviewComplete:false,approvedForCoach:false,
  blocker:!archiveFive.has(foodId)?'official_source_bytes_not_pinned':
   food?.unit==='ml'?'density_or_label_review_required':
   'no_operator_review_or_hosted_source_receipt'};
});
assert.equal(pinned.length,10);
assert.equal(pinned.filter(x=>x.archivedCapture).length,5);
assert.equal(pinned.filter(x=>x.approvedForCoach).length,0);
const migration=readFileSync(new URL('../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',import.meta.url),'utf8');
assert.doesNotMatch(migration,/insert\s+into\s+efg_private\.coach_reviewed_foods/i,'No fake operator review seed');
assert.match(migration,/evidence_status='reviewed'/);
const report={kind:'NCC_02_03_CATALOG_COVERAGE',pwaFoodCount:byId.size,
 frontendAuditedUsdaReferences:VERIFIED_SOURCE_COUNT,
 frontendSourceTypes:sourceCounts,frontendStatuses:statusCounts,categories,
 pinnedCandidates:pinned,hostedReviewCount:'NOT_CHECKED_IN_THIS_TEST',
 releaseReady:false};
console.log('PASS 02-03: catalog scope audited; official five vs remaining five; no invented Coach approval.');
console.log('NCC_CATALOG_COVERAGE_JSON '+JSON.stringify(report));
