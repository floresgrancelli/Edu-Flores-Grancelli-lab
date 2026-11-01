// PRIVATE offline demonstration. No backend, client trust, publication, source downloads or real people.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {importSelectedFdcExport} from '../pilot/fdc-selected-export.js';
import {proposeAdaptedGuide,GUIDE_TARGET_TOLERANCE} from '../pilot/adapted-guided-day.js';
import {evaluateGuideFood} from '../pilot/guide-compatibility.js';
import {createGuideEditor,updateGuideEditor,reviewEditedGuide} from '../pilot/adapted-guide-editor.js';
import {guideTotals} from '../pilot/guided-day.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const [archivePath,extraPath,approvedExtraDigest]=process.argv.slice(2);
assert.ok(archivePath&&extraPath&&/^[a-f0-9]{64}$/.test(approvedExtraDigest||''),
 'Usage: node official-complete-guide-private.mjs EXISTING_OFFICIAL_ZIP ADDITIONAL_FIVE_JSON REVIEWED_SHA256');
const old=JSON.parse(execFileSync('python3',[fileURLToPath(new URL('../tools/read-pinned-fdc-archive.py',import.meta.url)),archivePath],
 {encoding:'utf8',maxBuffer:2*1024*1024}));
const extraBytes=readFileSync(extraPath);assert.equal(sha(extraBytes),approvedExtraDigest,'Unapproved capture bundle');
const extra=JSON.parse(extraBytes);
assert.equal(extra.schemaVersion,1);assert.ok(Array.isArray(extra.records));
assert.deepEqual(extra.records.map(r=>r.fdcId).sort((a,b)=>a-b),[169704,170440,171413,171477,173944]);
const oldMeta=old.manifests.flatMap(m=>m.records);
assert.deepEqual(oldMeta.map(r=>r.fdcId).sort((a,b)=>a-b),[168463,170894,171688,173432,173904]);
const records=new Map(oldMeta.map(m=>[m.fdcId,{fdcId:m.fdcId,rawJSON:old.records[m.fdcId].raw,
 sha256:old.records[m.fdcId].sha256,captureCompletedAtUTC:m.captureCompletedAtUTC,
 expectedDescription:JSON.parse(old.records[m.fdcId].raw).description,
 sourceUrl:`https://api.nal.usda.gov/fdc/v1/food/${m.fdcId}`} ]));
for(const r of extra.records){
 assert.equal(r.httpStatus,200);assert.match(r.contentType,/^application\/json(?:;|$)/i);
 assert.equal(r.sourceUrl,`https://api.nal.usda.gov/fdc/v1/food/${r.fdcId}`);
 assert.equal(typeof r.rawJSON,'string');assert.equal(sha(Buffer.from(r.rawJSON)),r.sha256);
 const parsed=JSON.parse(r.rawJSON);assert.equal(parsed.fdcId,r.fdcId);
 // expectedDescription must be pinned by the reviewer after source identity/preparation inspection.
 assert.equal(parsed.description,r.expectedDescription);assert.equal(parsed.dataType,'SR Legacy');
 records.set(r.fdcId,r);
}
const mappings=[['apple',171688,'raw'],['oats_raw',173904,'raw'],['spinach_cooked',168463,'cooked'],
 ['yogurt_greek_light',170894,'as_sold'],['chicken',171477,'cooked'],['oil',171413,'as_sold'],
 ['brownrice',169704,'cooked'],['potato',170440,'cooked'],['banana',173944,'raw']];
for(const [,id] of mappings)assert.ok(Number.isFinite(Date.parse(records.get(id).captureCompletedAtUTC)));
const now=Math.max(...mappings.map(([,id])=>Date.parse(records.get(id).captureCompletedAtUTC)))+60000;
const expiresAt=new Date(now+3600000).toISOString(); // TEST import-review window, not USDA expiry.
const catalog=[];
for(const [foodId,fdcId,preparation] of mappings){
 const captured=records.get(fdcId),record=JSON.parse(captured.rawJSON),retrievedAt=captured.captureCompletedAtUTC;
 assert.equal(record.fdcId,fdcId);assert.equal(sha(Buffer.from(captured.rawJSON)),captured.sha256);
 const mapping={schemaVersion:1,version:'private-complete-nine-v1',matchMethod:'pinned_record',
  foodId,fdcId,dataType:'SR Legacy',expectedDescription:captured.expectedDescription,
  preparation,preparationEvidenceId:`FDC-${fdcId}-description`,unit:'g',basisGrams:100};
 const imported=await importSelectedFdcExport({bytes:new TextEncoder().encode(captured.rawJSON),mappings:[mapping],
  now:Date.parse(retrievedAt)+1,metadata:{format:'fdc-detail-json-v1',release:'SR Legacy',sourceUrl:captured.sourceUrl,
   retrievedAt,validUntil:new Date(Date.parse(retrievedAt)+3600000).toISOString(),
   basis:'per100g',basisEvidence:'FDC_SR_LEGACY_PER_100G'}});
 const c=imported.results?.[0]?.result;assert.equal(c?.status,'normalized_candidate',foodId);
 // Trusted OFFLINE test harness only, anchored in separately reviewed capture bytes.
 // No production provider consumes this object. Source capture and local review times remain distinct.
 const composition={status:'verified',id:'sha256:'+captured.sha256,url:captured.sourceUrl,
  foodId,productId:null,preparation,unit:'g',perUnit:c.perUnit,observedAt:new Date(now).toISOString(),expiresAt,
  sourceCapturedAt:retrievedAt,sourcePublishedAt:record.publicationDate,
  verificationScope:'PRIVATE_OFFICIAL_CAPTURE_REPLAY',expiryBasis:'TEST_ONLY_IMPORT_REVIEW_1H',reviewedBy:null};
 catalog.push({id:foodId,name:record.description,preparation,unit:'g',...c.perUnit,composition,
  glutenEvidence:null,lactoseEvidence:null});
}
// Explicit alternative test template, NOT a silent replacement of GUIDE_MEALS or its 16 identities.
// All quantities are edible grams, no milk/coffee ml conversion or brand equivalence.
const group=(ids,qty)=>({ids,qty});
const fruit=qty=>group(['apple','banana'],qty);
const template=[
 {slot:'desayuno',label:'Desayuno',groups:[group(['yogurt_greek_light'],200),group(['oats_raw'],50),fruit(130)]},
 {slot:'media_manana',label:'Media mañana',groups:[group(['yogurt_greek_light'],200),fruit(130)]},
 {slot:'almuerzo',label:'Almuerzo',groups:[group(['chicken'],175),group(['brownrice'],185),group(['spinach_cooked'],150),group(['oil'],10)]},
 {slot:'merienda',label:'Merienda',groups:[group(['yogurt_greek_light'],200),group(['oats_raw'],30),fruit(130)]},
 {slot:'cena',label:'Cena',groups:[group(['chicken'],175),group(['potato'],230),group(['spinach_cooked'],150),group(['oil'],10)]}
];
const goal={kcal:2100,protein_g:190,carb_g:240,fat_g:45,fiber_g:32}; // fictional scenario, no clinical recommendation
const context={now,restrictions:[],dislikedIds:[],pattern:{kind:'general'}};
const environment={catalog,goal,context};
const generate=(changes={})=>proposeAdaptedGuide({catalog,template,goal,context,...changes});
const initial=generate();assert.equal(initial.ok,true,JSON.stringify(initial));
assert.equal(initial.plan.meals.length,5);assert.equal(initial.publishable,false);assert.equal(initial.requiresCoachReview,true);
assert.equal(reviewEditedGuide(initial.plan,environment).readyForReview,true);
const withoutApple=generate({context:{...context,dislikedIds:['apple']}});
assert.equal(withoutApple.ok,true,JSON.stringify(withoutApple));
assert.ok(withoutApple.plan.meals.flatMap(m=>m.items).every(i=>i.id!=='apple'));
assert.ok(withoutApple.plan.meals.flatMap(m=>m.items).some(i=>i.id==='banana'));
// The release contract is five percent for EACH daily target, not an average.
assert.equal(GUIDE_TARGET_TOLERANCE,.05);
const targets={k:goal.kcal,p:goal.protein_g,c:goal.carb_g,f:goal.fat_g,fi:goal.fiber_g};
const maxDeviation=proposal=>Math.max(...Object.keys(targets).map(k=>Math.abs(proposal.totals[k]-targets[k])/targets[k]));
assert.ok(maxDeviation(initial)<=.05,JSON.stringify(initial.totals));
assert.ok(maxDeviation(withoutApple)<=.05,JSON.stringify(withoutApple.totals));
assert.equal(reviewEditedGuide(withoutApple.plan,{...environment,context:{...context,dislikedIds:['apple']}}).readyForReview,true);
// An editor review with exactly 6% excess fiber must fail; changing target is TEST ONLY.
const sixPercentGoal={...goal,fiber_g:initial.totals.fi/1.06};
const sixPercentReview=reviewEditedGuide(initial.plan,{...environment,goal:sixPercentGoal});
assert.ok(Math.abs((sixPercentReview.totals.fi-sixPercentGoal.fiber_g)/sixPercentGoal.fiber_g-.06)<1e-10);
assert.equal(sixPercentReview.readyForReview,false);
assert.ok(sixPercentReview.issues.some(i=>i.code==='targets'));
// Callers cannot restore the old 10% rule or widen it to 5.01%.
for(const tolerance of [.0501,.10]){
 assert.equal(generate({tolerance}).code,'invalid_goal');
 const review=reviewEditedGuide(initial.plan,{...environment,tolerance});
 assert.equal(review.readyForReview,false);assert.ok(review.issues.some(i=>i.code==='goal'));
}
// Arithmetic-only fictitious food, deliberately NOT USDA evidence or a usable food.
// k/fi=10 is invariant at all quantities. With k target2000 and fiber target180,
// energy needs >=190g but fiber permits <=189g: no plan can meet both within5%.
const syntheticNutrients={k:10,p:1,c:1,f:2/9,fi:1};
const synthetic={id:'TEST_ONLY_RATIO',name:'Fictitious ratio test, NOT FOOD',unit:'g',preparation:'raw',...syntheticNutrients,
 composition:{id:'TEST_ONLY_RATIO',foodId:'TEST_ONLY_RATIO',preparation:'raw',unit:'g',status:'verified',
 url:'https://example.invalid/TEST_ONLY',observedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+1000).toISOString(),perUnit:{...syntheticNutrients}}};
const syntheticTemplate=template.map(m=>({slot:m.slot,label:m.label,groups:[{ids:[synthetic.id],qty:40}]}));
const syntheticGoal={kcal:2000,protein_g:200,carb_g:200,fat_g:400/9,fiber_g:180};
const impossible=proposeAdaptedGuide({catalog:[synthetic],template:syntheticTemplate,goal:syntheticGoal,context});
assert.equal(impossible.ok,false);assert.equal(impossible.code,'no_solution_found');assert.equal(impossible.plan,null);
const refused=generate({context:{...context,dislikedIds:['chicken']}});
assert.equal(refused.ok,false);assert.equal(refused.code,'no_candidates');assert.equal(refused.plan,null);
let editor=createGuideEditor(initial,environment);const original=structuredClone(editor.committed);
editor=updateGuideEditor(editor,{type:'begin'},environment);
const meal=editor.working.meals.find(m=>m.slot==='desayuno'),index=meal.items.findIndex(i=>i.id==='apple');
assert.ok(index>=0);
const apple=meal.items[index],banana=catalog.find(f=>f.id==='banana');
const replacement={type:'replace',slot:'desayuno',index,id:'banana',qty:apple.qty,unit:'g'};
editor=updateGuideEditor(editor,replacement,environment);
const changedTotals=guideTotals(editor.review.normalizedPlan).totals;
const beforeTotals=guideTotals(original).totals;
assert.ok(Math.abs(changedTotals.k-(beforeTotals.k+(banana.k-apple.k)*apple.qty))<1e-7);
const count=editor.working.meals[0].items.length;
editor=updateGuideEditor(editor,replacement,environment);assert.equal(editor.working.meals[0].items.length,count);
editor=updateGuideEditor(editor,{type:'cancel'},environment);assert.deepEqual(editor.committed,original);
editor=updateGuideEditor(editor,{type:'begin'},environment);
const oldQty=editor.working.meals[0].items[index].qty;
const qtyDelta=oldQty>=220?-1:1;
editor=updateGuideEditor(editor,{type:'replace',slot:'desayuno',index,id:'apple',qty:oldQty+qtyDelta,unit:'g'},environment);
assert.ok(Math.abs(editor.review.totals.k-(beforeTotals.k+apple.k*qtyDelta))<1e-7);
assert.equal(editor.review.readyForReview,true);editor=updateGuideEditor(editor,{type:'save'},environment);
assert.equal(editor.origin,'edited_draft');assert.equal(editor.publishable,false);
editor=updateGuideEditor(editor,{type:'restore'},environment);assert.deepEqual(editor.committed,original);
const clinicalEnv={...environment,context:{...context,restrictions:['gluten']}};
editor=updateGuideEditor(editor,{type:'refresh'},clinicalEnv);assert.equal(editor.review.readyForReview,false);
assert.ok(catalog.every(f=>{const d=evaluateGuideFood(f,{...clinicalEnv.context,goal,qty:100});return d.color==='yellow'&&!d.eligible;}));
assert.equal(generate({context:clinicalEnv.context}).code,'no_candidates');
assert.deepEqual(goal,{kcal:2100,protein_g:190,carb_g:240,fat_g:45,fiber_g:32});
console.log(JSON.stringify({status:'PASS_OFFICIAL_NINE_PRIVATE_SCENARIO',sourceRecords:catalog.length,
 ...(process.env.EFG_EXPORT_PRIVATE_GUIDE_INPUT==='1'?{qaInput:{synthetic:true,catalog,template,goal,context,now}}:{}),
 originalTemplateCoverage:'alternative five-meal template; not full16/43 coverage',completeDraft:initial,
 excludedAppleDraft:withoutApple,editSubstitutionRecalculationCancelRestore:'PASS',
 targetTolerance:GUIDE_TARGET_TOLERANCE,initialMaxDeviation:maxDeviation(initial),withoutAppleMaxDeviation:maxDeviation(withoutApple),
 fivePercentNegatives:'PASS: six-percent edit, widened parameter and impossible generator ratios rejected',
 varietyLimitation:'Repeated yogurt/chicken across the day; this fixture is not a varied menu or clinical approval.',
 unknownClinicalEvidence:'rejected',publishable:false,backendWrites:0,
 evidence:catalog.map(f=>({id:f.id,description:f.name,preparation:f.preparation,unit:f.unit,
  perUnit:f.composition.perUnit,source:f.composition.url,capturedAt:f.composition.sourceCapturedAt,
  publishedAt:f.composition.sourcePublishedAt,evidenceId:f.composition.id}))},null,2));
