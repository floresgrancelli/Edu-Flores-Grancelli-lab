// P26M: REAL six-slot Coach engine + REAL PWA catalog -> HUMAN REVIEW PACKET.
// Synthetic adult goal only by default. NOT a P26 RLS fixture, clinical approval,
// persisted student guide, actual Supabase query, or permission to publish.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateFlexibleGuidedDay,SIX_GUIDE_SLOTS} from '../pilot/guided-day-v2.js';
import {validateGuidedDay,guideTotals} from '../pilot/guided-day.js';
import {sourceReviewCatalogForSyntheticCoach,preparePilotSourceReview,
 reviewCsv,operatorReviewCsv,recipeComponentReviewCsv} from './prepare-ncc-source-review-batch.mjs';
export const P26M_SYNTHETIC_GOAL=Object.freeze({goal_type:'recomp',kcal:2250,
 protein_g:155,carb_g:250,fat_g:70,fiber_g:24});
export function prepareRealGuideHumanReview({goal=P26M_SYNTHETIC_GOAL,guide=null,source='synthetic_six_slot_case'}={}){
 const catalog=sourceReviewCatalogForSyntheticCoach();
 assert.ok(catalog.length>=100,'Real PWA catalog not loaded');
 assert.ok(goal&&Number.isFinite(goal.kcal)&&goal.kcal>=1200,'Goal requires Coach review');
 const proposal=guide||generateFlexibleGuidedDay(catalog,goal,{
  patternId:'balanced',windowId:'regular',restrictionStatus:'unknown'});
 assert.equal(proposal?.kind,'flexible_meal_guide','Not a real six-slot Coach guide');
 assert.equal(proposal.version,2);
 if(!guide)assert.deepEqual(proposal.meals.map(x=>x.slot),SIX_GUIDE_SLOTS.map(x=>x[0]));
 assert.ok(proposal.meals.every(m=>m.items.length&&m.items.every(i=>i.qty>0)));
 assert.doesNotMatch(JSON.stringify(proposal),/P26_RLS_ONLY_NOT_A_NUTRITION_PLAN|qa_fixture/);
 validateGuidedDay(proposal,goal);
 const review=preparePilotSourceReview({guide:proposal});
 const chosen=[...new Set(proposal.meals.flatMap(m=>m.items.map(i=>i.id)))].sort();
 assert.deepEqual(review.foods.map(x=>x.id).sort(),chosen,
  'Every actually selected PWA ID needs exact source/operator review');
 assert.ok(review.selectedGuideFingerprintSha256&&review.sourceCatalogFingerprintSha256);
 assert.equal(review.publishable,false);assert.equal(review.approvalsGranted,0);
 assert.equal(review.sourceRecordsInserted,0);
 assert.ok(review.foods.every(f=>f.humanReview==='PENDING'&&f.approvedForServer===false));
 return {kind:'NCC_P26M_REAL_ENGINE_REVIEW_NOT_APPROVED',source,
  goal,guide:proposal,guideTotals:guideTotals(proposal).totals,review,
  humanApproval:false,hostedWrite:false,mayPublish:false};
}
// Export only the nutritional choices needed for independent human review.
// IDs, intake/consent details and free-text health notes stay inside the
// authorized application and never enter a downloadable QA packet.
function reviewOnlyGoal(goal){
 const fields=['kcal','protein_g','carb_g','fat_g','fiber_g'];
 const types=['fat_loss','recomp','muscle_gain','maintenance'];
 return {goal_type:types.includes(goal.goal_type)?goal.goal_type:'unclassified_for_review',
  ...Object.fromEntries(fields.filter(key=>typeof goal[key]==='number'&&Number.isFinite(goal[key]))
   .map(key=>[key,goal[key]]))};
}
function reviewOnlyGuide(guide){
 assert.equal(guide?.kind,'flexible_meal_guide');
 return {kind:guide.kind,version:guide.version,meals:guide.meals.map(meal=>({
  slot:meal.slot,items:meal.items.map(item=>({
   id:item.id,unit:item.unit,qty:item.qty,k:item.k,p:item.p,c:item.c,f:item.f,fi:item.fi,
   ...(item.recipeComponent===true?{recipeComponent:true}:{})
  }))
 }))};
}
export function writeHumanReviewFiles(caseResult,outputDir){
 assert.ok(caseResult?.review?.publishable===false&&caseResult?.humanApproval===false);
 const folder=resolve(outputDir);mkdirSync(folder,{recursive:true});
 const write=(n,x)=>writeFileSync(resolve(folder,n),x);
 const sourceKind=caseResult.source==='coach_supplied_unapproved_draft'
  ?'coach_supplied_unapproved_draft':'synthetic_or_unspecified';
 write('coach-guide-unapproved.json',JSON.stringify({source:sourceKind,
  goal:reviewOnlyGoal(caseResult.goal),guide:reviewOnlyGuide(caseResult.guide),
  guideTotals:caseResult.guideTotals,
  selectedGuideFingerprintSha256:caseResult.review.selectedGuideFingerprintSha256,
  privacy:'NUTRITION_FIELDS_ONLY_NO_STUDENT_IDENTIFIERS',
  separateRestrictedProfileReviewRequired:true,
  approval:'PENDING_HUMAN_REVIEW',mayPublish:false},null,2)+'\n');
 write('selected-food-review.json',JSON.stringify(caseResult.review,null,2)+'\n');
 write('selected-food-review.csv',reviewCsv(caseResult.review));
 write('operator-review-worklist.csv',operatorReviewCsv(caseResult.review));
 write('recipe-component-review-worklist.csv',recipeComponentReviewCsv(caseResult.review));
 return {outputDir:folder,selectedFoodCount:caseResult.review.selectedUniqueFoodCount,
  selectedGuideFingerprintSha256:caseResult.review.selectedGuideFingerprintSha256,
  approvals:0,sourceRowsWritten:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),at=x=>args.indexOf(x);
 const out=at('--output-dir'),g=at('--goal-json'),guide=at('--guide-json');
 assert.ok(out>=0&&args[out+1],'Usage: --output-dir PATH [--goal-json PATH --guide-json PATH]');
 assert.equal(g>=0,guide>=0,'A real final draft requires both its exact Goal and exact Guide');
 const mode=guide>=0?'coach_supplied_unapproved_draft':'synthetic_engine_specimen';
 const goal=g>=0?JSON.parse(readFileSync(resolve(args[g+1]),'utf8')):P26M_SYNTHETIC_GOAL;
 const input=guide>=0?JSON.parse(readFileSync(resolve(args[guide+1]),'utf8')):null;
 const data=prepareRealGuideHumanReview({goal,guide:input,source:mode});
 console.log(JSON.stringify(writeHumanReviewFiles(data,args[out+1])));
}
