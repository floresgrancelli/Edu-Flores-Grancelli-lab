// NCC P1: read-only source packet for foods actually selected in a Coach guide.
// No network, Supabase writes, catalogue mutations, approvals or private profiles.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {GUIDE_MEALS} from '../pilot/guided-day.js';
import {EXTRA_FOODS} from '../pilot/food-catalog.js';

const text=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const json=p=>JSON.parse(text(p));
const nutrients=['k','p','c','f','fi'];
const slots=['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'];
const template=[...GUIDE_MEALS.slice(0,3),
 {slot:'media_tarde',items:[['yogurt',150],['banana',85],['cheese',25]]},
 ...GUIDE_MEALS.slice(3)];
const manifest=json('../docs/NCC_PILOT_17_SOURCE_REVIEW_20261103.json');
const archive=json('../docs/NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json');
const app=text('../pilot/pilot.js'),catalogSource=text('../pilot/food-catalog.js'),
 v2Source=text('../pilot/guided-day-v2.js');
const match=app.match(/const foods=\[([\s\S]*?)\]\.concat\(EXTRA_FOODS\)/);
assert.ok(match,'Legacy food source moved: no guessing from stale review records');
const legacy=[...match[1].matchAll(/^\s*\{id:"([A-Za-z0-9_-]+)",name:"([^"]+)",unit:"(g|ml)",k:([0-9.]+),p:([0-9.]+),c:([0-9.]+),f:([0-9.]+),fi:([0-9.]+)/gm)]
 .map(m=>({id:m[1],name:m[2],unit:m[3],
  ...Object.fromEntries(nutrients.map((n,i)=>[n,Number(m[i+4])]))}));
assert.ok(legacy.length>=20,'Incomplete initial PWA catalog');
assert.match(v2Source,/GUIDE_MEALS\.slice\(0,3\)/);
assert.match(v2Source,/slot:'media_tarde',label:'Media tarde',items:\[\['yogurt',150\],\['banana',85\],\['cheese',25\]\]/);
assert.match(v2Source,/GUIDE_MEALS\.slice\(3\)/);
assert.deepEqual(template.map(m=>m.slot),slots);
const allFoods=[...legacy,...EXTRA_FOODS],byId=new Map();
for(const f of allFoods){
 assert.ok(f?.id&&!byId.has(f.id),'Duplicate/missing PWA ID: '+f?.id);
 assert.ok(['g','ml'].includes(f.unit),'Unsupported PWA food unit: '+f.id);
 for(const n of nutrients)assert.ok(Number.isFinite(f[n])&&f[n]>=0,'Missing food rate: '+f.id+'.'+n);
 byId.set(f.id,f);
}
const templateIds=[...new Set(template.flatMap(m=>m.items.map(([id])=>id)))].sort();
assert.equal(templateIds.length,17);
const reviewById=new Map(manifest.foods.map(x=>[x.id,x]));
assert.equal(reviewById.size,17);
assert.deepEqual([...reviewById.keys()].sort(),templateIds);
assert.equal(manifest.dataGovernance?.notACatalogWhitelist,true);
assert.equal(manifest.dataGovernance?.approvedForPublication,false);
assert.equal(manifest.dataGovernance?.backendApprovedCount,0);
assert.ok(manifest.foods.every(f=>f.humanReview==='PENDING'&&!f.approvedForServer));
const archiveById=new Map(archive.records.map(f=>[f.foodId,f]));
const sourceFingerprint=createHash('sha256').update([app,catalogSource,v2Source].join('\nNCC-SOURCE\n')).digest('hex');
const rounded=n=>Math.round(n*10000)/10000;
function selectedMeals(guide){
 if(guide==null)return template.map(m=>({slot:m.slot,items:m.items.map(([id,qty])=>({
  id,qty,unit:byId.get(id)?.unit
 }))}));
 assert.ok(guide?.kind==='flexible_meal_guide'&&guide.version===2&&Array.isArray(guide.meals),
  'The optional guide must be an expanded flexible_meal_guide v2');
 assert.ok(guide.meals.length>=2&&guide.meals.length<=6);
 const seen=new Set();
 return guide.meals.map(meal=>{
  assert.ok(slots.includes(meal.slot)&&!seen.has(meal.slot),'Duplicate/unknown meal slot');
  seen.add(meal.slot);
  assert.ok(Array.isArray(meal.items)&&meal.items.length>=1&&meal.items.length<=15);
  return {slot:meal.slot,items:meal.items.map(item=>{
   assert.match(item?.id||'',/^[A-Za-z0-9_-]{1,100}$/,'Expand recipe ingredients first');
   const f=byId.get(item.id);
   assert.ok(f,'Unknown food: '+item.id+'; review is not a catalog whitelist');
   assert.equal(item.unit,f.unit,'Selected unit differs from PWA: '+item.id);
   assert.ok(Number.isFinite(item.qty)&&item.qty>0&&item.qty<=1000,'Invalid selected quantity');
   for(const n of nutrients)if(item[n]!==undefined)
    assert.ok(Number.isFinite(item[n])&&Math.abs(item[n]-f[n])<1e-9,
     'Selected macros no longer match actual PWA: '+item.id+'.'+n);
   return {id:item.id,unit:f.unit,qty:item.qty};
  })};
 });
}
function captured(row){
 if(!row?.sourcePer100g)return null;
 const pinned=archiveById.get(row.id);
 assert.ok(pinned,'Source capture not in pinned official-source review: '+row.id);
 assert.equal(String(pinned.fdcId),String(row.sourceFdcId),'FDC identifier drift');
 assert.equal(pinned.unit,row.sourceUnit,'Captured source-unit drift');
 assert.equal(pinned.canonicalRecordSha256,row.canonicalRecordSha256,'Pinned record digest drift');
 for(const n of nutrients)assert.equal(pinned.per100g[n],row.sourcePer100g[n],
  'Pinned source nutrient drift: '+row.id+'.'+n);
 return row.sourcePer100g;
}
export function preparePilotSourceReview({guide=null}={}){
 const meals=selectedMeals(guide),ids=[...new Set(meals.flatMap(m=>m.items.map(x=>x.id)))].sort();
 assert.ok(ids.length>0&&ids.length<=90);
 const counts={},foods=ids.map(id=>{
  const f=byId.get(id),row=reviewById.get(id)||null;
  const source=captured(row),status=row?.evidenceState||'NEW_SELECTED_ID_REQUIRES_SOURCE_REVIEW';
  const app100=Object.fromEntries(nutrients.map(n=>[n,rounded(f[n]*100)]));
  const delta=source&&row.sourceUnit===f.unit
   ?Object.fromEntries(nutrients.map(n=>[n,rounded(app100[n]-source[n])])):null;
  counts[status]=(counts[status]||0)+1;
  return {
   id,foodName:f.name,unit:f.unit,
   chosenIn:meals.filter(m=>m.items.some(x=>x.id===id)).map(m=>m.slot),
   partOfInitial17:reviewById.has(id),appSourceId:f.sourceId||null,
   appPer100Unit:app100,sourceFdcId:row?.sourceFdcId||null,
   sourceUnit:row?.sourceUnit||null,sourcePer100g:source,
   pinnedRecordSha256:row?.canonicalRecordSha256||null,
   deltaPer100ComparableUnits:delta,evidenceState:status,
   requiredHumanAction:row?.requiredHumanAction||
    'Selected outside the initial 17: match the exact food, preparation, unit and nutrient source, including expanded recipe ingredients.',
   humanReview:'PENDING',approvedForServer:false,approvedBy:null,approvedAt:null
  };
 });
 return {schemaVersion:1,kind:'NCC_GUIDE_SELECTED_SOURCE_REVIEW_ONLY',
  sourceCatalogFingerprintSha256:sourceFingerprint,actualCatalogSize:allFoods.length,
  sourceArchiveUrl:archive.sourceArchiveUrl,sourceArchiveSha256:archive.sourceArchiveSha256,
  selectedMeals:meals,selectedUniqueFoodCount:ids.length,countsByEvidenceState:counts,foods,
  approvalsGranted:0,sourceRecordsInserted:0,publishable:false,
  operatorReviewRequired:true,notACatalogWhitelist:true,
  note:'A source capture or numeric match is not approval. Every ingredient chosen in the final guide, including expanded recipes, needs operator-reviewed evidence. No PII, network calls or database writes.'};
}
const csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';
export function reviewCsv(packet){
 const columns=['food_id','food_name','unit','slots','pwa_kcal_per100','pwa_protein_per100',
  'pwa_carbs_per100','pwa_fat_per100','pwa_fiber_per100','fdc_id',
  'source_unit','source_kcal_per100g','delta_kcal_per100','delta_fiber_per100',
  'source_status','human_review','next_action'];
 const rows=packet.foods.map(f=>[
  f.id,f.foodName,f.unit,f.chosenIn.join('|'),f.appPer100Unit.k,f.appPer100Unit.p,
  f.appPer100Unit.c,f.appPer100Unit.f,f.appPer100Unit.fi,
  f.sourceFdcId,f.sourceUnit,f.sourcePer100g?.k,
  f.deltaPer100ComparableUnits?.k,f.deltaPer100ComparableUnits?.fi,
  f.evidenceState,f.humanReview,f.requiredHumanAction
 ].map(csv).join(','));
 return [columns.map(csv).join(','),...rows].join('\n')+'\n';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),outPos=args.indexOf('--output-dir'),guidePos=args.indexOf('--guide-json');
 assert.ok(outPos>=0&&args[outPos+1]&&args.length===(guidePos>=0?4:2),
  'Usage: --output-dir PATH [--guide-json PATH]');
 const guide=guidePos>=0?JSON.parse(readFileSync(resolve(args[guidePos+1]),'utf8')):null;
 const packet=preparePilotSourceReview({guide}),folder=resolve(args[outPos+1]);
 mkdirSync(folder,{recursive:true});
 writeFileSync(resolve(folder,'selected-food-review.json'),JSON.stringify(packet,null,2)+'\n');
 writeFileSync(resolve(folder,'selected-food-review.csv'),reviewCsv(packet));
 console.log('NCC REVIEW ONLY: '+packet.selectedUniqueFoodCount+' selected foods, 0 approvals, 0 DB writes.');
}
