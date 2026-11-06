// Existing synthetic QA fixture only. No source approval, backend or real data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyQaReviewedSources} from '../pilot/qa-reviewed-sources.js';
import {rebalanceGuidedDay,guideDeviation,guideTotals,guidedPortionBounds} from '../pilot/guided-day.js';
import {guidedCountablePortion,normalizeGuidedCountableQuantity} from '../pilot/guided-countable-portions.js';
test('infeasible 2% repair limits worst real deviation without disguising it or changing locked counts',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./evidence/p29c-qa-guide-v1.json',import.meta.url)));
 const plan=applyQaReviewedSources(fixture.guide),snapshot=structuredClone(plan);
 const result=rebalanceGuidedDay(plan,fixture.goal,{targetTolerance:.02});
 const deviations=Object.values(guideDeviation(result,fixture.goal)).map(d=>Math.abs(d.percent));
 assert.ok(Math.max(...deviations)<4,'Every actual deviation must remain below existing 4% gate');
 assert.ok(Math.max(...deviations)>2,'Do not falsely report infeasible 2% as achieved');
 assert.deepEqual(plan,snapshot);
 const original=plan.meals.flatMap(m=>m.items),items=result.meals.flatMap(m=>m.items);
 assert.deepEqual(items.map(({qty,...rest})=>rest),original.map(({qty,...rest})=>rest));
 items.forEach((item,index)=>{
  if(item.locked||item.recipeComponent)assert.deepEqual(item,original[index]);
  if(item.recipeComponent)return;
  const [min,max]=guidedPortionBounds(item.id),rule=guidedCountablePortion(item.id);
  assert.ok(item.qty>=min&&item.qty<=max,item.id);
  if(rule)assert.ok(Math.abs(item.qty/rule.grams-Math.round(item.qty/rule.grams))<1e-8,item.id);
  if(rule?.preserveCount)assert.equal(item.qty,normalizeGuidedCountableQuantity(original[index]));
 });
 for(const k of ['k','p','c','f','fi'])assert.equal(guideTotals(result).totals[k],items.reduce((n,x)=>n+x.qty*x[k],0));
});
