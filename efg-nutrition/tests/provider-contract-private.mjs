import assert from 'node:assert/strict';
import {createCoachHealthResponseProvider} from '../pilot/coach-health-response-provider.js';
import {normalizeFdcComposition,ingestFdcPayload} from '../pilot/official-composition-candidate.js';
import {scope} from './coach-guide-intake-fixture.mjs';
let current={...scope};
const row={viewer_id:scope.userId,student_id:scope.studentId,organization_id:scope.organizationId,
 revision:2,processing_consent:true,followup_consent:true,shared_with_coach:true,conditions:{celiac:'suspected'}};
let response=row;
const p=createCoachHealthResponseProvider({readScope:()=>current,readHealth:async()=>response});
assert.equal((await p.read({expectedRevision:2})).status,'available');
for(const [key,value] of [['organization_id','org-b'],['student_id','other'],['viewer_id','coach-b']]){
 response={...row,[key]:value};assert.equal((await p.read()).status,'scope_mismatch');
}
for(const key of ['processing_consent','followup_consent','shared_with_coach']){
 response={...row,[key]:false};assert.equal((await p.read()).status,'no_permission');
}
response=null;assert.equal((await p.read()).status,'missing_or_denied');
response=row;assert.equal((await p.read({expectedRevision:3})).status,'stale');
let release;const delayed=createCoachHealthResponseProvider({readScope:()=>current,readHealth:()=>new Promise(r=>{release=r;})});
let pending=delayed.read();current={...scope,sourceEpoch:2};release(row);assert.equal((await pending).status,'stale');
current={...scope};pending=delayed.read();delayed.invalidate();release(row);assert.equal((await pending).status,'stale');
console.log('PASS scoped response: org/user/student, permissions, revisions, revocation and delayed response');
// FICTIONAL nutrient values and digest. Never an official capture.
const mapping={schemaVersion:1,version:'synthetic-v1',matchMethod:'pinned_record',fdcId:123,
 dataType:'SR Legacy',expectedDescription:'FICTIONAL cooked food',foodId:'fixture',unit:'g',basisGrams:100,
 preparation:'cooked',preparationEvidenceId:'synthetic-preparation'};
const record={fdcId:123,dataType:'SR Legacy',description:mapping.expectedDescription,
 foodNutrients:[1008,1003,1005,1004,1079].map((id,i)=>({nutrient:{id,unitName:i?'g':'kcal'},amount:[200,10,20,8,3][i]}))};
const receipt={provider:'usda_fdc',sourceId:'123',sourceUrl:'https://fdc.nal.usda.gov/food-details/123/nutrients',
 payloadDigest:'sha256:'+'0'.repeat(64),parserVersion:'synthetic-v1',retrievedAt:'2026-11-01T00:00:00Z',validUntil:'2026-11-02T00:00:00Z'};
const args={mapping,record,receipt,now:Date.parse('2026-11-01T12:00:00Z')};
const out=normalizeFdcComposition(args);assert.equal(out.status,'normalized_candidate');assert.equal(out.perUnit.k,2);
assert.equal(out.composition,null);assert.equal(out.glutenEvidence,null);assert.equal(out.publishable,false);
assert.equal(out.provenance.reviewedBy,null);
for(const change of [{fdcId:124},{preparation:null},{unit:'ml'},{expectedDescription:'other'},{productId:'brand-x'}])
 assert.equal(normalizeFdcComposition({...args,mapping:{...mapping,...change}}).status,'unknown');
assert.equal(normalizeFdcComposition({...args,receipt:{...receipt,validUntil:'2020-01-01'}}).status,'unknown');
assert.equal(normalizeFdcComposition({...args,record:{...record,foodNutrients:record.foodNutrients.slice(0,4)}}).status,'unknown');
assert.equal(normalizeFdcComposition({...args,record:{...record,foodNutrients:[...record.foodNutrients,record.foodNutrients[0]]}}).status,'unknown');
console.log('PASS composition normalization: exact identity/preparation/unit, no invented nutrients or clinical verification');
const captured=await ingestFdcPayload({bytes:new TextEncoder().encode(JSON.stringify(record)),mapping,
 retrievedAt:receipt.retrievedAt,validUntil:receipt.validUntil,now:args.now});
assert.match(captured.provenance.payloadDigest,/^sha256:[a-f0-9]{64}$/);
assert.notEqual(captured.provenance.payloadDigest,receipt.payloadDigest);
assert.equal(captured.status,'normalized_candidate');assert.equal(captured.composition,null);
console.log('PASS raw capture hash computed; capture integrity does not certify source authenticity');
