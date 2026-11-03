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
 const fake={...p.guide,meals:[...p.guide.meals.slice(0,1),
  {...p.guide.meals[1],items:[{...p.guide.meals[1].items[0],id:'P26_RLS_ONLY_NOT_A_NUTRITION_PLAN'}]},
  ...p.guide.meals.slice(2)]};
 assert.throws(()=>prepareRealGuideHumanReview({guide:fake}),/qa_fixture|P26_RLS_ONLY_NOT_A_NUTRITION_PLAN|Not|Invalid|Food|unknown/i);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('PASS P26M: actual six-slot engine + all PWA selected foods bound to pending independent review; no approvals or DB writes.');
