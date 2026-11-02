// NCC / pilot starter foods: compare archived USDA SR Legacy source metadata
// with the current PWA food catalog. NO operator approval, DB writes or publication.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_FOODS} from '../pilot/food-catalog.js';
import {GUIDE_FDC_IDS} from '../pilot/fdc-selected-export.js';
const doc=JSON.parse(readFileSync(new URL('../docs/NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json',import.meta.url),'utf8'));
const pwa=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const extras=new Map(EXTRA_FOODS.map(x=>[x.id,x]));
const nutrients=['k','p','c','f','fi'],maxDelta={k:10,p:1,c:1,f:.5,fi:.5};
const prep={
 apple:/manzana.*cáscara/i,oats_raw:/avena.*seca/i,
 yogurt_greek_light:/yogur.*0%/i,
 spinach_cooked:/hervid[ao].*escurrid[ao].*sin sal/i,
 oil:/aceite de oliva/i,
 brownrice:/arroz integral.*grano largo.*cocido/i,
 potato:/papa hervida sin piel y sin sal/i,
 banana:/banana cruda sin cáscara/i
};
function lookup(id){
 if(extras.has(id))return extras.get(id);
 assert.match(id,/^[a-z_]+$/);
 const re=new RegExp('\\{id:"'+id+'",name:"([^"]+)",unit:"([^"]+)",k:([0-9.]+),p:([0-9.]+),c:([0-9.]+),f:([0-9.]+),fi:([0-9.]+)','g');
 const matches=[...pwa.matchAll(re)];
 assert.equal(matches.length,1,'PWA identity must be unique: '+id);
 const m=matches[0];
 return {id,name:m[1],unit:m[2],k:+m[3],p:+m[4],c:+m[5],f:+m[6],fi:+m[7]};
}
assert.equal(doc.records.length,10);
const rows=doc.records.map(r=>{
 assert.equal(GUIDE_FDC_IDS[r.foodId],r.fdcId);
 assert.equal(r.reviewStatus,'pending_operator_review');
 assert.equal(r.canPublish,false);
 assert.match(r.canonicalRecordSha256,/^[a-f0-9]{64}$/);
 const f=lookup(r.foodId),delta={};
 for(const k of nutrients)delta[k]=Number((f[k]*100-r.per100g[k]).toFixed(4));
 const numericPass=nutrients.every(k=>Math.abs(delta[k])<=maxDelta[k]);
 const issues=[];
 if(f.unit!=='g')issues.push('UNIT_NOT_GRAMS');
 if(r.foodId==='chicken')issues.push('GENERIC_CHICKEN_NOT_ROASTED_BREAST_171477');
 if(r.foodId==='milk_skim')issues.push('ML_TO_G_DENSITY_NOT_VERIFIED');
 if(!numericPass)issues.push('NUTRIENT_VALUES_NEED_RECONCILIATION');
 if(prep[r.foodId]&&!prep[r.foodId].test(f.name))
  issues.push('PREPARATION_LABEL_NEEDS_REVIEW');
 return {
  foodId:r.foodId,fdcId:r.fdcId,sourceDescription:r.description,
  sourceRecordSha256:r.canonicalRecordSha256,
  appName:f.name,appUnit:f.unit,sourceUnit:r.unit,
  sourcePer100g:r.per100g,appPer100g:Object.fromEntries(nutrients.map(k=>[k,Number((f[k]*100).toFixed(4))])),
  differencePer100g:delta,issues,
  preliminaryMatch:issues.length===0,
  operatorReviewed:false,serverEvidenceSeeded:false,publishable:false
 };
});
assert.equal(rows.length,10);
assert.equal(new Set(rows.map(x=>x.foodId)).size,10);
assert.ok(rows.every(x=>x.publishable===false&&!x.operatorReviewed&&!x.serverEvidenceSeeded));
assert.ok(rows.some(x=>x.foodId==='chicken'&&!x.preliminaryMatch));
assert.ok(rows.some(x=>x.foodId==='milk_skim'&&!x.preliminaryMatch));
console.log('NCC_STARTER_FOOD_REPORT '+JSON.stringify({
 kind:'SOURCE_TO_APP_PRE_REVIEW_NOT_APPROVAL',sourceArchiveSha256:doc.sourceArchiveSha256,
 numericScreenTolerancePer100g:maxDelta,
 counts:{candidateReview:rows.filter(x=>x.preliminaryMatch).length,
  needsAttention:rows.filter(x=>!x.preliminaryMatch).length,
  humanApproved:0,published:0},
 rows
}));
console.log('PASS 10 sources checked without assigning approval or changing data.');
