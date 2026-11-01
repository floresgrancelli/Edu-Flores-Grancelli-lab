import assert from 'node:assert/strict';
import {compositionVerified,evaluateGuideFood} from '../pilot/guide-compatibility.js';
import {createGuideEditor,updateGuideEditor,reviewEditedGuide} from '../pilot/adapted-guide-editor.js';
import {catalog,goal,template,context,food} from './adapted-guide-fixtures.mjs';
const drink=food('drink',{unit:'ml'}),bread=food('wheat');bread.glutenEvidence.verdict='contains';
const unknown=food('unknown');delete unknown.glutenEvidence;
const env={catalog:[...catalog,drink,bread,unknown],goal,context};
const plan={version:1,kind:'five_meal_example',supplementNote:'',meals:template.map(m=>({
 slot:m.slot,label:m.label,items:[catalog[0],catalog[1]].map(f=>({...f,qty:100}))}))};
const fresh=()=>createGuideEditor({ok:true,plan},env);
const act=(s,a,e=env)=>updateGuideEditor(s,a,e);
const edit=(s,changes={},e=env)=>act(s,{type:'replace',slot:'desayuno',index:0,id:'fresh_a',qty:110,unit:'g',...changes},e);
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
test('review: absent and blank preparation never verifies composition',()=>{
 for(const value of [undefined,'',' ','unknown']){
  const f=food('prep');f.preparation=value;f.composition.preparation=value;
  assert.equal(compositionVerified(f,context.now),false);
 }
});
test('review: contains from other product or preparation is unknown, not red',()=>{
 for(const change of [e=>e.preparation='cooked',e=>e.productId='other']){
  const f=food('identity');f.glutenEvidence.verdict='contains';change(f.glutenEvidence);
  assert.equal(evaluateGuideFood(f,{...context,goal,qty:100}).color,'yellow');
 }
});
test('edit recalculates from source, never old draft nutrient numbers',()=>{
 const original=fresh();const s=edit(act(original,{type:'begin'}));
 assert.ok(Math.abs(s.review.totals.k-2252.3)<1e-8);assert.ok(Math.abs(s.review.totals.c-20.2)<1e-8);
 assert.equal(s.review.readyForReview,true);assert.equal(original.working.meals[0].items[0].qty,100);
 const forged=structuredClone(plan);forged.meals[0].items[0].k=99999;
 assert.equal(reviewEditedGuide(forged,env).totals.k,2230);
 const saved=act(s,{type:'save'});assert.equal(saved.origin,'edited_draft');assert.equal(saved.publishable,false);
});
test('cancel and restore retain correct draft and recalculate',()=>{
 let s=act(edit(act(fresh(),{type:'begin'})),{type:'save'});
 s=edit(act(s,{type:'begin'}),{qty:120});s=act(s,{type:'cancel'});
 assert.equal(s.working.meals[0].items[0].qty,110);
 s=act(s,{type:'restore'});assert.equal(s.working.meals[0].items[0].qty,100);
 assert.equal(s.review.totals.k,2230);assert.equal(s.origin,'automatic_draft');
});
test('repeat replaces one row; duplicate ingredient rejected',()=>{
 let s=act(fresh(),{type:'begin'});s=edit(s);s=edit(s);
 assert.equal(s.working.meals[0].items.length,2);
 s=edit(s,{id:'fresh_b'});assert.equal(s.review.readyForReview,false);
 assert.ok(s.review.issues.some(x=>x.code==='duplicate'));
});
test('zero negative missing NaN Infinity string and wrong units cannot save',()=>{
 for(const changes of [{qty:0},{qty:-1},{qty:null},{qty:NaN},{qty:Infinity},{qty:'100'},{unit:'kg'}]){
  let s=edit(act(fresh(),{type:'begin'}),changes);assert.equal(s.review.totals,null);
  s=act(s,{type:'save'});assert.equal(s.mode,'editing');assert.equal(s.origin,'automatic_draft');
 }
});
test('ml explicit, no implicit conversion from g',()=>{
 let s=edit(act(fresh(),{type:'begin'}),{id:'drink',qty:100,unit:'g'});
 assert.equal(s.review.totals,null);
 s=edit(s,{id:'drink',qty:100,unit:'ml'});assert.equal(s.review.readyForReview,true);
 assert.equal(s.review.totals.k,2230);assert.equal(s.review.normalizedPlan.meals[0].items[0].unit,'ml');
});
test('incompatible and unknown ingredients never become validated draft',()=>{
 for(const id of ['wheat','unknown']){
  let s=edit(act(fresh(),{type:'begin'}),{id});assert.equal(s.review.readyForReview,false);
  s=act(s,{type:'save'});assert.equal(s.mode,'editing');assert.equal(s.publishable,false);
 }
});
test('daily keto budget enforced even when each portion fits',()=>{
 const changed={...env,context:{...context,pattern:{kind:'keto',coachConfirmed:true,maxCarbG:20}}};
 const s=edit(act(fresh(),{type:'begin'},changed),{},changed);
 assert.ok(s.review.issues.some(x=>x.code==='daily_pattern'));
});
test('restriction change revalidates edits and cancel/restore; lactose unsupported',()=>{
 const general={...env,context:{...context,restrictions:[]}};
 let s=edit(act(fresh(),{type:'begin'},general),{id:'wheat',qty:100},general);
 assert.equal(s.review.readyForReview,true);
 s=act(s,{type:'refresh'},env);assert.equal(s.review.readyForReview,false);
 const unsupported={...env,context:{...context,restrictions:['gluten','lactose_intolerance']}};
 assert.equal(act(s,{type:'cancel'},unsupported).review.readyForReview,false);
 assert.equal(act(s,{type:'restore'},unsupported).review.readyForReview,false);
});
test('changed goal/pattern conflict never changes target or silently rescales edits',()=>{
 const e={...env,goal:{...goal,carb_g:150,kcal:2750}},before=structuredClone(e.goal);
 const s=act(fresh(),{type:'refresh'},e);
 assert.ok(s.review.issues.some(x=>x.code==='pattern'));assert.deepEqual(e.goal,before);
 assert.equal(s.working.meals[0].items[0].qty,100);
});
console.log('Private editor cases: '+count+'; synthetic, no approval or persistence.');
