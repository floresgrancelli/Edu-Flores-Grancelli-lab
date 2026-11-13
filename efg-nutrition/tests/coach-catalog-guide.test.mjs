import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyCoachCatalog,loadCoachCatalogGuide} from '../pilot/coach-catalog-guide.js';
import {exportGuideCatalog} from '../tools/export-guide-catalog.mjs';
import {validateCoachPlanProposal} from '../pilot/coach-plan-draft-client.js';
const snapshot=JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url)));
const goal={goal_type:'maintenance',kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};
const fixture=(ids=['chicken','pork'])=>({kind:'flexible_meal_guide',version:2,meals:ids.map((id,i)=>({slot:i?'cena':'almuerzo',items:[{...snapshot.foods[id],qty:123,locked:true,sourceApprovalId:'false-approval'}]})),supplementNote:'Nota del coach'});
const rows=ids=>({version:snapshot.version,foods:ids.map(id=>snapshot.foods[id])});
test('snapshot exactly matches 585 application foods and preserves the 560 published rows',()=>{
 assert.deepEqual(exportGuideCatalog(),snapshot);assert.equal(Object.keys(snapshot.foods).length,585);
 const baseline=JSON.parse(readFileSync(new URL('../docs/catalog-batch-20261113/baseline-catalog.json',import.meta.url)));for(const [id,food] of Object.entries(baseline.foods))assert.deepEqual(snapshot.foods[id],food,'Published food remains exact: '+id);
 assert.ok(Object.values(snapshot.foods).filter(f=>f.dataQuality==='estimated').length>500);
});
test('chicken and pork use canonical composition without fabricated independent approval',()=>{
 const original=fixture(),copy=structuredClone(original),guide=applyCoachCatalog(original,rows(['chicken','pork']));
 assert.deepEqual(original,copy);assert.equal(guide.catalogVersion,snapshot.version);assert.equal(guide.catalogHasEstimates,true);
 for(const meal of guide.meals){const item=meal.items[0];assert.equal(item.qty,123);assert.equal(item.locked,true);assert.equal(item.sourceApprovalId,undefined);assert.equal(item.k,snapshot.foods[item.id].k);}
 assert.equal(guide.supplementNote,'Nota del coach');assert.equal(validateCoachPlanProposal(goal,guide).guide.catalogVersion,snapshot.version);
});
test('existing Unicode catalog IDs remain publishable',()=>{
 const guide=applyCoachCatalog(fixture(['lasaña_bolognesa','pork']),rows(['lasaña_bolognesa','pork']));
 assert.doesNotThrow(()=>validateCoachPlanProposal(goal,guide));
});
test('recipe egg fractions, locks and private restriction provenance are preserved',()=>{
 const original=fixture(['egg','pork']);Object.assign(original.meals[0].items[0],{qty:12.5,recipeComponent:true});original.restrictionSource={revision:3,status:'declared'};
 const guide=applyCoachCatalog(original,rows(['egg','pork']));assert.equal(guide.meals[0].items[0].qty,12.5);assert.equal(guide.meals[0].items[0].recipeComponent,true);assert.deepEqual(guide.restrictionSource,original.restrictionSource);
});
test('incomplete, duplicate, unknown or wrong-unit responses cannot replace the draft',()=>{
 for(const mutate of [r=>r.foods.pop(),r=>r.foods.push(r.foods[0]),r=>r.foods[0].k=NaN,r=>r.foods[0].unit='pieces',r=>r.version='invalid']){
  const original=fixture(),copy=structuredClone(original),r=rows(['chicken','pork']);r.foods=structuredClone(r.foods);mutate(r);assert.throws(()=>applyCoachCatalog(original,r));assert.deepEqual(original,copy);
 }
});
test('RPC requests only selected IDs and rejects stale session/student responses',async()=>{
 let current=true;const original=fixture();await assert.rejects(loadCoachCatalogGuide({rpc:async(name,args)=>{assert.equal(name,'efg_coach_guide_catalog');assert.deepEqual(args.p_food_ids,['chicken','pork']);current=false;return {data:rows(args.p_food_ids)};}},{studentId:'synthetic',guide:original,isCurrent:()=>current}),/Cambió la sesión/);
});
test('server rejection preserves the original draft',async()=>{
 const original=fixture(),copy=structuredClone(original);await assert.rejects(loadCoachCatalogGuide({rpc:async()=>({error:{message:'denied'}})},{studentId:'synthetic',guide:original,isCurrent:()=>true}),/se conserva/);assert.deepEqual(original,copy);
});
