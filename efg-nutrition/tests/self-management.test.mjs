import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateSelfManagedPlan, selfManagementEligibility, createSelfManagementService } from '../pilot/self-management-engine.js';
import { guidedCountablePortion } from '../pilot/guided-countable-portions.js';
const catalog = JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url)));
const base = () => ({ age_years:35,height_cm:175,weight_kg:80,activity_level:'light',sex_for_equation:'male',
  objective:'fat_loss',dietary_pattern:'omnivore',processingConsent:true,pregnantOrBreastfeeding:false,
  clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',
  health_flags:[],disliked_food_ids:[],eating_window:'regular' });
let generated;
test('existing calculator + existing catalog generate six meals automatically, not recorded consumption or coach approval', () => {
  const input=base(),before=structuredClone(input),beforeCatalog=structuredClone(catalog);
  generated=generateSelfManagedPlan(input,catalog);
  assert.deepEqual(input,before);assert.deepEqual(catalog,beforeCatalog);
  assert.equal(generated.goal.kcal,2090);assert.equal(generated.guide.meals.length,6);
  assert.equal(generated.guide.createdFrom,'self_managed_estimate');assert.equal(generated.guide.coachReviewed,false);
  assert.ok(Object.values(generated.deviations).every(d=>Math.abs(d.percent)<2));
  assert.equal(generated.diary,undefined);
  for(const item of generated.guide.meals.flatMap(m=>m.items)){
    const rule=guidedCountablePortion(item.id);
    if(rule)assert.ok(Math.abs(item.qty/rule.grams-Math.round(item.qty/rule.grams))<1e-7);
  }
});
test('missing consent, physiological input, activity and unknown restrictions are not defaulted',()=>{
  for(const change of [{processingConsent:false},{sex_for_equation:''},{activity_level:'unknown'},
    {restrictionDeclaration:'unknown'},{pregnantOrBreastfeeding:undefined},{health_flags:undefined}]){
    assert.throws(()=>selfManagementEligibility({...base(),...change}));
  }
});
test('minors, pregnancy, clinical adaptations, eating-disorder history and underweight do not get generic automatic diets',()=>{
  for(const change of [{age_years:17},{pregnantOrBreastfeeding:true},{clinicalCareRequired:true},
    {eatingDisorderHistory:true},{weight_kg:40},{health_flags:['diabetes']}])
    assert.throws(()=>generateSelfManagedPlan({...base(),...change},catalog));
});
test('unsupported keto/fasting not converted to a different pattern and preferences are validated',()=>{
  for(const change of [{dietary_pattern:'keto'},{eating_window:'16_8'},
    {disliked_food_ids:['unknown']},{disliked_food_ids:['egg','egg']}])
    assert.throws(()=>generateSelfManagedPlan({...base(),...change},catalog));
});
test('poor or empty catalog is never treated as successful menu',()=>{
  assert.throws(()=>generateSelfManagedPlan(base(),{version:catalog.version,foods:{}}));
  assert.throws(()=>generateSelfManagedPlan(base(),{version:'unverified',foods:catalog.foods}));
});
test('explicit food exclusion survives generation without changing requested calories',()=>{
  const r=generateSelfManagedPlan({...base(),disliked_food_ids:['chicken']},catalog);
  assert.equal(r.goal.kcal,2090);assert.ok(!r.guide.meals.flatMap(m=>m.items).some(f=>f.id==='chicken'));
});

function fixture(extra={}){
  let user='self_user',saved=null,writes=0;
  const deps={readIdentity:async()=>({id:user}),
    readAccount:async id=>({user_id:id,mode:'independent',active:true,coach_id:null}),
    readIntake:async id=>({user_id:id,revision:1,data:base()}),readCatalog:async()=>catalog,
    saveAtomic:async p=>{writes++;saved={userId:p.userId,requestId:p.requestId,intakeRevision:1,result:p.result};return {...saved,persisted:true};},
    readSaved:async()=>saved,...extra};
  return {service:createSelfManagementService(deps),writes:()=>writes,setUser:id=>{user=id;}};
}
test('self service derives account identity from server and persists goal+guide together without coach RPC',async()=>{
  const f=fixture();const r=await f.service.generate({requestId:'request_0001',userId:'another_user'});
  assert.equal(r.userId,'self_user');assert.equal(r.intakeRevision,1);assert.equal(f.writes(),1);
  assert.ok(r.result.goal&&r.result.guide);
});
test('coach-bound, inactive, foreign intake and unauthenticated accounts cannot generate through self service',async()=>{
  for(const extra of [{readIdentity:async()=>null},
    {readAccount:async()=>({user_id:'self_user',mode:'coach_active',active:true,coach_id:'coach'})},
    {readAccount:async()=>({user_id:'self_user',mode:'independent',active:false,coach_id:null})},
    {readIntake:async()=>({user_id:'someone_else',revision:1,data:base()})}]){
    const f=fixture(extra);await assert.rejects(f.service.generate({requestId:'request_0001'}));assert.equal(f.writes(),0);
  }
});
test('no success without persistence confirmation or independently readable matching receipt',async()=>{
  const notSaved=fixture({saveAtomic:async()=>({persisted:false})});
  await assert.rejects(notSaved.service.generate({requestId:'request_0001'}),/confirmar el guardado/);
  const wrong=fixture({readSaved:async()=>({userId:'someone_else'})});
  await assert.rejects(wrong.service.generate({requestId:'request_0001'}),/releer/);
});
