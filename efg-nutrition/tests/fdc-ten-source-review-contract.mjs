import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUIDE_FDC_IDS} from '../pilot/fdc-selected-export.js';
const manifest=JSON.parse(readFileSync(new URL('../docs/NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json',import.meta.url),'utf8'));
assert.equal(manifest.schemaVersion,1);
assert.equal(manifest.publishable,false);
assert.equal(manifest.rawSourceBackendSeeded,false);
assert.equal(manifest.readiness,'NOT_REVIEWED');
assert.match(manifest.sourceArchiveSha256,/^[a-f0-9]{64}$/);
assert.equal(manifest.records.length,10);
assert.deepEqual(new Set(manifest.records.map(x=>x.fdcId)).size,10);
for(const x of manifest.records){
 assert.equal(GUIDE_FDC_IDS[x.foodId],x.fdcId,'Pinned catalog FDC ID drift '+x.foodId);
 assert.match(x.canonicalRecordSha256,/^[a-f0-9]{64}$/);
 assert.equal(x.unit,'g','Official SR Legacy source quantity is per 100 g');
 assert.equal(x.reviewStatus,'pending_operator_review');
 assert.equal(x.canPublish,false);
 assert.ok(x.description?.length>=12);
 for(const key of ['k','p','c','f','fi'])
  assert.ok(Number.isFinite(x.per100g[key])&&x.per100g[key]>=0);
}
const record=id=>manifest.records.find(x=>x.foodId===id);
assert.equal(record('chicken').fdcId,171477);
assert.match(record('chicken').description,/\bbreast\b.*\broasted\b/);
assert.match(record('chicken').issue,/BLOCKED_GENERIC_CHICKEN/,'Generic chicken cannot inherit roasted-breast source');
assert.equal(record('milk_skim').issue,'MASS_VOLUME_CONVERSION_NEEDS_REVIEW');
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(app,/\{id:"chicken",name:"Pollo cocido sin piel \(estimación general\)"/,
 'Current PWA chicken is generic, NOT a specific roasted breast');
assert.match(app,/\{id:"oil",name:"Aceite de oliva \(gramos\)"/);
assert.match(app,/\{id:"brownrice",name:"Arroz integral cocido"/);
assert.match(app,/\{id:"potato",name:"Papa hervida sin piel y sin sal"/);
assert.match(app,/\{id:"banana",name:"Banana cruda sin cáscara"/);
console.log('PASS 02-03 official SR Legacy 10-record review manifest, generic-chicken mismatch and milk unit correction BLOCKED; no Coach publication.');
