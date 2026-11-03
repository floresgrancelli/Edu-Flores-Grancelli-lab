// Actual PWA food rates and the real six-slot Coach engine; synthetic identity/goal.
// Does not run JWT, hosted RLS, write SQL, approve food or publish a guide.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareRealGuideHumanReview,writeHumanReviewFiles,P26M_SYNTHETIC_GOAL}
 from '../tools/ncc-p26m-real-guide-review.mjs';
const p=prepareRealGuideHumanReview();
assert.equal(p.guide.meals.length,6);assert.equal(p.guide.kind,'flexible_meal_guide');
assert.ok(p.review.selectedUniqueFoodCount>=12);
assert.equal(p.review.operatorReviewRequired,true);
assert.ok(p.guide.profileReviewNotes.some(x=>/Restricciones sin verificar/.test(x)),
 'No health declaration cannot become unrestricted green');
assert.equal(p.goal.kcal,P26M_SYNTHETIC_GOAL.kcal);
const dir=mkdtempSync(join(tmpdir(),'ncc-p26m-review-'));
try{
 const saved=writeHumanReviewFiles(p,dir);
 assert.equal(saved.approvals,0);assert.equal(saved.sourceRowsWritten,0);
 const guide=JSON.parse(readFileSync(join(dir,'coach-guide-unapproved.json'),'utf8'));
 const source=JSON.parse(readFileSync(join(dir,'selected-food-review.json'),'utf8'));
 assert.equal(guide.selectedGuideFingerprintSha256,source.selectedGuideFingerprintSha256);
 assert.equal(guide.approval,'PENDING_HUMAN_REVIEW');
 assert.equal(source.publishable,false);assert.equal(source.approvalsGranted,0);
 const csv=readFileSync(join(dir,'operator-review-worklist.csv'),'utf8');
 assert.match(csv,/operator_decision_BLANK/);assert.match(csv,/PENDING/);
 assert.equal(csv.trim().split('\n').length,p.review.selectedUniqueFoodCount+1);
 // Privacy guard: real Coach drafts may include confidential identifiers
 // or health notes. Export only the exact nutritional selection and totals.
 const sentinel='NCC_TEST_PRIVATE_IDENTIFIERS_MUST_NOT_EXPORT';
 const draftWithPrivateExtras=structuredClone(p.guide);
 draftWithPrivateExtras.studentId=sentinel;
 draftWithPrivateExtras.coachId=sentinel;
 draftWithPrivateExtras.profileReviewNotes=[sentinel];
 draftWithPrivateExtras.meals[0].label=sentinel;
 draftWithPrivateExtras.meals[0].items[0].name=sentinel;
 draftWithPrivateExtras.meals[0].items[0].studentNotes=sentinel;
 const privateGoal={...P26M_SYNTHETIC_GOAL,student_id:sentinel,health_intake:sentinel};
 const privacyCase=prepareRealGuideHumanReview({
  goal:privateGoal,guide:draftWithPrivateExtras,source:sentinel});
 writeHumanReviewFiles(privacyCase,dir);
 for(const name of ['coach-guide-unapproved.json','selected-food-review.json',
   'selected-food-review.csv','operator-review-worklist.csv',
   'recipe-component-review-worklist.csv']){
  assert.doesNotMatch(readFileSync(join(dir,name),'utf8'),new RegExp(sentinel),
   'Private fields leaked into '+name);
 }
 const redacted=JSON.parse(readFileSync(join(dir,'coach-guide-unapproved.json'),'utf8'));
 assert.deepEqual(redacted.goal,P26M_SYNTHETIC_GOAL);
 assert.deepEqual(redacted.guide.meals.map(m=>m.slot),p.guide.meals.map(m=>m.slot));
 assert.equal(redacted.guide.meals[0].items[0].id,p.guide.meals[0].items[0].id);
 assert.equal(redacted.selectedGuideFingerprintSha256,privacyCase.review.selectedGuideFingerprintSha256);
 assert.equal(redacted.privacy,'NUTRITION_FIELDS_ONLY_NO_STUDENT_IDENTIFIERS');
 assert.equal(redacted.separateRestrictedProfileReviewRequired,true);
 assert.equal(redacted.approval,'PENDING_HUMAN_REVIEW');
 assert.equal(redacted.mayPublish,false);
 const fake={...p.guide,meals:[...p.guide.meals.slice(0,1),
  {...p.guide.meals[1],items:[{...p.guide.meals[1].items[0],id:'P26_RLS_ONLY_NOT_A_NUTRITION_PLAN'}]},
  ...p.guide.meals.slice(2)]};
 assert.throws(()=>prepareRealGuideHumanReview({guide:fake}),/qa_fixture|P26_RLS_ONLY_NOT_A_NUTRITION_PLAN|Not|Invalid|Food|unknown/i);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('PASS P26M: actual six-slot engine + all PWA selected foods bound to pending independent review; no approvals or DB writes.');
