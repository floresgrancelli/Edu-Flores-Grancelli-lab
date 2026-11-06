// Reproduce P28V using actual catalog rates and entirely fictional targets.
// No hosted data, writes, nutrition approvals or publication.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sourceReviewCatalogForSyntheticCoach} from '../tools/prepare-ncc-source-review-batch.mjs';
import {generateFlexibleGuidedDay,removeFlexibleFood} from '../pilot/guided-day-v2.js';
import {rebalanceGuidedDay,guideQuantityRanges,guideTotals,guideDeviation} from '../pilot/guided-day.js';
const goal={kcal:2500,protein_g:150,carb_g:322,fat_g:68,fiber_g:35};
const lower={kcal:2100,protein_g:126,carb_g:271,fat_g:57,fiber_g:29};
let plan=JSON.parse(readFileSync(new URL('./guide-p28v-synthetic-fixture.json',import.meta.url),'utf8'));
plan.meals[0].items[0].qty=65;plan.meals[0].items[0].locked=true;
assert.throws(()=>rebalanceGuidedDay(plan,goal),/unidades enteras/,'Legacy fractional egg lock requires explicit Coach correction');
plan.meals[0].items[0].qty=100;
plan=rebalanceGuidedDay(rebalanceGuidedDay(plan,goal),lower);
// The historical input is unchanged. Real whole fruit/white quantities change
// its former 166.7885 g result; do not preserve that number by hiding fractions.
const independentlySummedProtein=plan.meals.flatMap(m=>m.items).reduce((sum,item)=>sum+item.qty*item.p,0);
assert.ok(Math.abs(independentlySummedProtein-167.301)<1e-8,'Whole-unit historical reproduction');
assert.ok(Math.abs(guideTotals(plan).totals.p-independentlySummedProtein)<1e-8);
const original=structuredClone(plan),range=guideQuantityRanges(plan);
// Independent physical minimum using catalog rates and legal whole counts.
// Eggs/whites preserve their chosen counts; bananas, apple and mandarin have
// one whole unit as their minimum. Divisible foods retain existing gram floors.
const physicalMinimumProtein=300*.124+136*.107+480*.0109+150*.0026+90*.008+
 80*.12+30*.001+160*.31+100*.027+140*.01+160*.24+120*.0171+40*.026;
assert.ok(Math.abs(physicalMinimumProtein-162.916)<1e-8);
assert.ok(Math.abs(range.p.min-physicalMinimumProtein)<1e-8);
assert.ok(range.p.min>lower.protein_g*1.05,'Quantity-only adjustment cannot meet this target');
assert.deepEqual(plan,original,'Diagnostics cannot mutate the draft');
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const feedback=app.slice(app.indexOf('function guidedTargetFeedback('),app.indexOf('function currentCoachRecipeScope('));
const context={guideQuantityRanges,num:(v,d)=>Number(v).toFixed(d)};vm.createContext(context);
vm.runInContext(feedback,context);
assert.match(context.guidedTargetFeedback(guideDeviation(plan,lower),plan),/Recalcular cantidades no alcanza/);
assert.match(context.guidedTargetFeedback(guideDeviation(plan,lower),plan),/162.9/);
const revised=removeFlexibleFood(plan,'almuerzo',0,lower);
assert.ok(['k','p','c','f'].every(k=>Math.abs(guideDeviation(revised,lower)[k].percent)<1.5));
assert.equal(revised.meals[0].items[0].qty,100,'Manual whole units survive removal and redistribution');
assert.equal(revised.meals.length,6);
assert.deepEqual(plan,original,'Original version remains intact');
const invalid=structuredClone(plan);invalid.meals[0].items[0].qty=500;
assert.throws(()=>rebalanceGuidedDay(invalid,lower),/cantidad fijada/);
assert.equal(invalid.meals[0].items[0].qty,500,'Invalid lock is reported, never silently overwritten');
const recipe=structuredClone(plan);
Object.assign(recipe.meals[0].items[0],{qty:15,recipeComponent:true,locked:true});
assert.equal(rebalanceGuidedDay(recipe,lower).meals[0].items[0].qty,15);
console.log('PASS P28W: exact 167.301g reproduction, infeasible 162.916g floor, actionable UI diagnostic, manual/recipe locks, removal redistribution <1.5%, original preserved. Isolated only.');

const fresh=generateFlexibleGuidedDay(sourceReviewCatalogForSyntheticCoach(),lower,{restrictions:['celiac'],restrictionStatus:'declared'});
assert.equal(fresh.meals.length,6);
assert.ok(Object.values(guideDeviation(fresh,lower)).every(d=>Math.abs(d.percent)<2));
assert.ok(fresh.meals.every(m=>m.items.length>=2),'Composition repair preserves populated meals');
console.log('PASS P28X: fresh celiac 2100 generation fits every target within 2%, six meals retained.');
