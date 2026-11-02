// 02-03: fictional FDC records. Checks source location/ID contract only.
import assert from 'node:assert/strict';
import {importSelectedFdcExport} from '../pilot/fdc-selected-export.js';
const now=Date.parse('2026-11-02T12:00:00Z');
const make=(fdcId,description)=>({fdcId,dataType:'SR Legacy',description,publicationDate:'2019-04-01',
 foodNutrients:[[1008,'Energy','KCAL',120],[1003,'Protein','G',8],
 [1005,'Carbohydrate, by difference','G',16],[1004,'Total lipid (fat)','G',3],
 [1079,'Fiber, total dietary','G',4]].map(([id,name,unitName,amount])=>({nutrient:{id,name,unitName},amount}))});
const apple=make(171688,'Synthetic apple'),oats=make(173904,'Synthetic oats');
const mapping=(record,foodId)=>({schemaVersion:1,version:'fictional-v1',matchMethod:'pinned_record',
 foodId,fdcId:record.fdcId,dataType:'SR Legacy',expectedDescription:record.description,
 preparation:'raw',preparationEvidenceId:'synthetic-capture',unit:'g',basisGrams:100});
const meta={format:'fdc-detail-json-v1',release:'SR Legacy',retrievedAt:'2026-11-02T11:00:00Z',
 validUntil:'2026-11-03T11:00:00Z',basis:'per100g',basisEvidence:'FDC_SR_LEGACY_PER_100G'};
const read=(records,sourceUrl,mappings)=>importSelectedFdcExport({
 bytes:new TextEncoder().encode(JSON.stringify(records)),
 mappings,metadata:{...meta,sourceUrl},now});
const good=await read(apple,'https://api.nal.usda.gov/fdc/v1/food/171688',[mapping(apple,'apple')]);
assert.equal(good.status,'import_report');
assert.equal(good.results[0].result.status,'normalized_candidate');
assert.equal(good.results[0].result.perUnit.fi,.04);
assert.equal(good.results[0].result.publishable,false);
assert.equal(good.results[0].capture.originVerified,false);
for(const url of [
 'https://api.nal.usda.gov/fdc/v1/food/173904',
 'https://api.nal.usda.gov/fdc/v1/foods',
 'https://api.nal.usda.gov/fdc/v1/foods/search',
 'https://api.nal.usda.gov:444/fdc/v1/food/171688',
 'https://fdc.nal.usda.gov/food-details/171688/nutrients',
 'https://api.nal.usda.gov.evil.test/fdc/v1/food/171688',
 'https://api.nal.usda.gov/fdc/v1/food/171688?api_key=not-a-real-key'
]){
 const rejected=await read(apple,url,[mapping(apple,'apple')]);
 assert.equal(rejected.status,'unknown',url);
 assert.equal(rejected.publishable,false);
}
const batch=await read([apple,oats],'https://api.nal.usda.gov/fdc/v1/foods',
 [mapping(apple,'apple'),mapping(oats,'oats_raw')]);
assert.equal(batch.status,'import_report');
assert.deepEqual(batch.results.map(r=>r.fdcId),[171688,173904]);
assert.ok(batch.results.every(r=>r.result.status==='normalized_candidate'));
assert.equal(batch.publishable,false);
for(const bad of [
 'https://api.nal.usda.gov/fdc/v1/food/171688',
 'https://api.nal.usda.gov/fdc/v1/foods/search'
])assert.equal((await read([apple,oats],bad,
 [mapping(apple,'apple'),mapping(oats,'oats_raw')])).status,'unknown');
assert.equal((await read([apple,oats],'https://api.nal.usda.gov/fdc/v1/foods',
 [mapping(apple,'apple'),{...mapping(oats,'oats_raw'),fdcId:171688}])).status,'unknown');
const chicken=make(171477,'Chicken, broilers or fryers, breast, meat only, cooked, roasted');
const chickenResult=await read(chicken,'https://api.nal.usda.gov/fdc/v1/food/171477',
 [mapping(chicken,'chicken')]);
assert.equal(chickenResult.status,'unknown');
assert.equal(chickenResult.reason,'preparation_mismatch_generic_chicken');
assert.equal(chickenResult.publishable,false);
// An exact roasted breast record cannot silently validate generic chicken
// merely because the protein/calorie estimate happens to be similar.
console.log('PASS 02-03: official FDC endpoint/ID binding; unknown URLs rejected; fictional captures remain non-publishable.');