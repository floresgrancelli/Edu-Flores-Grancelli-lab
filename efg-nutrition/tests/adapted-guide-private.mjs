import assert from 'node:assert/strict';
import {evaluateGuideFood,patternConflict} from '../pilot/guide-compatibility.js';
import {proposeAdaptedGuide} from '../pilot/adapted-guided-day.js';
import {food,catalog,goal,template,context,now} from './adapted-guide-fixtures.mjs';
let cases=0;
const test=(name,fn)=>{fn();cases++;console.log('PASS '+name);};
const evaluate=(f,changes={})=>evaluateGuideFood(f,{...context,goal,qty:100,...changes});
const propose=(changes={})=>proposeAdaptedGuide({catalog,goal,template,context,...changes});
test('fresh explicitly evidenced; no blanket category rule',()=>{
 assert.equal(evaluate(food('meat')).color,'green');
 const prepared=food('milanesa',{preparation:'breaded'});
 assert.equal(evaluate(prepared).color,'yellow');
 prepared.glutenEvidence.verdict='contains';prepared.glutenEvidence.preparation='breaded';
 assert.equal(evaluate(prepared).color,'red');
});
test('wheat bread excluded; verified GF product identity required',()=>{
 const f=food('bread',{preparation:'packaged',productId:'exact-product'});
 Object.assign(f.glutenEvidence,{verdict:'contains',preparation:'packaged',productId:'exact-product'});
 assert.equal(evaluate(f).color,'red');
 Object.assign(f.glutenEvidence,{verdict:'compatible',basis:'verified_product',preparation:'packaged',productId:'exact-product'});
 assert.equal(evaluate(f).color,'green');
 f.productId='another-product';assert.equal(evaluate(f).color,'yellow');
});
test('missing expired future and mismatched evidence fail closed',()=>{
 for(const alter of [f=>delete f.composition,f=>f.composition.expiresAt='2020-01-01',
  f=>f.composition.observedAt='2030-01-01',f=>f.c=.3,f=>delete f.fi,
  f=>delete f.glutenEvidence,f=>f.glutenEvidence.foodId='other']){
  const f=food('unknown');alter(f);assert.equal(evaluate(f).eligible,false);
 }
});
test('multiple restrictions unknown; no inferred diagnosis',()=>{
 assert.equal(evaluate(food('a'),{restrictions:['gluten','milk_allergy']}).color,'yellow');
 assert.equal(evaluate(food('a'),{restrictions:['gluten','gluten']}).color,'green');
});
test('keto by portion/budget, vegetables not blanket red',()=>{
 const vegetable=food('vegetable');assert.equal(evaluate(vegetable).color,'green');
 assert.equal(evaluate(vegetable,{qty:1600}).color,'red');
 assert.equal(evaluate(vegetable,{qty:undefined}).color,'yellow');
 assert.ok(patternConflict({...goal,carb_g:150},context.pattern));
 assert.ok(patternConflict(goal,{kind:'keto'}));
});
test('preferences select identities; disliked never reintroduced by optimizer',()=>{
 const r=propose({preferredIds:['preferred'],context:{...context,dislikedIds:['fresh_a']}});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(r.plan.meals.every(m=>m.items.some(i=>i.id==='preferred')));
 assert.ok(r.plan.meals.every(m=>m.items.every(i=>i.id!=='fresh_a')));
 assert.deepEqual(r.goal,goal);assert.equal(r.publishable,false);assert.equal(r.requiresCoachReview,true);
 assert.ok(r.decisions.every(d=>d.eligible));
});
test('no compatible options never emits a plan',()=>{
 const r=propose({context:{...context,dislikedIds:catalog.map(f=>f.id)}});
 assert.equal(r.code,'no_candidates');assert.equal(r.plan,null);
});
test('pattern conflict does not mutate targets',()=>{
 const g={...goal,carb_g:150,kcal:2750},before=structuredClone(g);
 assert.equal(propose({goal:g}).code,'pattern_conflict');assert.deepEqual(g,before);
});
test('unreachable targets are not fabricated',()=>{
 const r=propose({goal:{...goal,fiber_g:1000}});
 assert.equal(r.ok,false);assert.equal(r.plan,null);
});
test('inconsistent calories/macros do not silently change',()=>{
 assert.equal(propose({goal:{...goal,kcal:4000}}).code,'goal_conflict');
});
test('unknown composition and clinical evidence cannot be bypassed by preference',()=>{
 const broken=structuredClone(catalog);delete broken[2].composition;
 const r=propose({catalog:broken,preferredIds:['preferred']});
 assert.equal(r.ok,true);assert.ok(r.plan.meals.every(m=>m.items.every(i=>i.id!=='preferred')));
});
test('input snapshots immutable and deterministic',()=>{
 const input={catalog,goal,template,context};const before=structuredClone(input);
 assert.deepEqual(propose(),propose());assert.deepEqual(input,before);
});
test('unknown clock cannot produce compatible evidence',()=>{
 assert.equal(evaluate(food('clock'),{now:undefined}).eligible,false);
 assert.equal(evaluate(food('clock'),{now:now+86400000}).eligible,false);
});
console.log('Synthetic private guide cases: '+cases+'; not clinical validation or production approval.');
