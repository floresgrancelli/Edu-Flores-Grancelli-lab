// PRIVATE follow-up: no SQL, network, users, permissions or target changes.
// Run from repository root. Node24 requires type:module in the isolated copy.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=process.cwd();
const moduleAt=p=>import(pathToFileURL(resolve(root,p)).href);
const {estimateMacros}=await moduleAt('efg-nutrition/pilot/macro-engine.js');
const {adjustNutritionGoal}=await moduleAt('efg-nutrition/pilot/goal-adjustments.js');
const {proposeAdaptedGuide}=await moduleAt('efg-nutrition/pilot/adapted-guided-day.js');
const {reviewEditedGuide}=await moduleAt('efg-nutrition/pilot/adapted-guide-editor.js');
const {rebalanceGuidedDay,guidedPortionBounds}=await moduleAt('efg-nutrition/pilot/guided-day.js');
const options=process.versions.node.split('.')[0]==='22'?['--experimental-default-type=module']:[];
const original=JSON.parse(execFileSync(process.execPath,[...options,'efg-nutrition/tests/official-complete-guide-private.mjs',
 'efg-nutrition/tests/evidence/fdc-official-20261101.zip','efg-nutrition/tests/evidence/fdc-additional-five-20261101.json',
 'a2160a75e37bf36dd2fc4b267a6efd17a15558c48949762da09ad3ec69da3f39'],
 {env:{...process.env,EFG_EXPORT_PRIVATE_GUIDE_INPUT:'1'},encoding:'utf8',maxBuffer:2*1024*1024}));
assert.equal(original.status,'PASS_OFFICIAL_NINE_PRIVATE_SCENARIO');
const input=original.qaInput;
const result=estimateMacros({age:40,height:175,weight:86.4,activity:1.5,sex:'male',goal:'fat_loss',model:'mifflin',proteinPerKg:2.2,fatPerKg:.6,recompMode:'deficit05'});
const calculated={goal_type:'fat_loss',kcal:result.kcal,protein_g:result.protein,carb_g:result.carbs,fat_g:result.fat,fiber_g:result.fiber};
const goal=adjustNutritionGoal(calculated,2100,'proportional');
const catalog=input.catalog.map(f=>{const perUnit=Object.fromEntries(['k','p','c','f','fi'].map(k=>[k,Number(f[k].toFixed(6))]));
 return {...f,...perUnit,composition:{...f.composition,perUnit}};});
const proposal=proposeAdaptedGuide({...input,catalog,goal,preferredIds:['banana'],context:{...input.context,restrictions:[],dislikedIds:['apple'],pattern:{kind:'general'}}});
assert.deepEqual(calculated,{goal_type:'fat_loss',kcal:2380,protein_g:190,carb_g:288,fat_g:52,fiber_g:33});
assert.deepEqual(Object.fromEntries(['kcal','protein_g','carb_g','fat_g','fiber_g'].map(k=>[k,goal[k]])),
 {kcal:2100,protein_g:168,carb_g:254,fat_g:46,fiber_g:29});
assert.equal(proposal.ok,true,JSON.stringify(proposal));
assert.equal(proposal.publishable,false);
assert.equal(proposal.requiresCoachReview,true);
assert.equal(proposal.plan.meals.length,5);
const targets={k:2100,p:168,c:254,f:46,fi:29};
const deviations=Object.fromEntries(Object.entries(targets).map(([k,t])=>[k,(proposal.totals[k]-t)/t]));
assert.ok(Object.values(deviations).every(d=>Math.abs(d)<=.05),JSON.stringify(deviations));
const context={...input.context,restrictions:[],dislikedIds:['apple'],pattern:{kind:'general'}};
assert.equal(reviewEditedGuide(proposal.plan,{catalog,goal,context}).readyForReview,true);
for(const meal of proposal.plan.meals)for(const item of meal.items){
 assert.notEqual(item.id,'apple');
 const [min,max]=guidedPortionBounds(item.id);
 assert.ok(item.qty>=min&&item.qty<=max);
 assert.ok(catalog.some(f=>f.id===item.id));
 if(item.id==='oats_raw')assert.equal(item.qty%10,0);
}
const locked=structuredClone(proposal.plan);
for(const meal of locked.meals)for(const item of meal.items)item.locked=true;
assert.deepEqual(rebalanceGuidedDay(locked,goal,{targetTolerance:.05}),locked);
assert.throws(()=>rebalanceGuidedDay(locked,goal,{targetTolerance:.0501}));
assert.throws(()=>rebalanceGuidedDay(locked,goal,{targetTolerance:NaN}));
const snapshot=structuredClone(proposal.plan);
const repeated=proposeAdaptedGuide({...input,catalog,goal,preferredIds:['banana'],context});
assert.deepEqual(repeated,proposal);
assert.deepEqual(proposal.plan,snapshot);
console.log(JSON.stringify({status:'PASS_SDK_GOAL_FEASIBILITY',calculated,goal,totals:proposal.totals,deviations,
 priorOfficialRegression:original.status,publishable:false,scope:'OFFLINE_ONLY_NOT_SDK_OR_SQL'},null,2));
