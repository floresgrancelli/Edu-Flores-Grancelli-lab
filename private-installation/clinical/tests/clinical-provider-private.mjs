// All identities, clinical records and captures here are invented TEST_ONLY.
// No HTTP/JWT/SQL tests are claimed by this unit suite.
import assert from 'node:assert/strict';
import {createClinicalProvider,resolveEvidence,contextRestrictions,digest} from '../server/clinical-provider.mjs';
const now=Date.parse('2026-11-01T12:00:00Z');
function fixture(){
 const food={id:'TEST_ONLY-fresh',unit:'g',productId:null,preparation:'fresh_unseasoned',k:1,p:.1,c:.01,f:.05,fi:.01};
 food.composition={status:'verified',id:'TEST_ONLY-composition',url:'https://example.invalid/composition',foodId:food.id,productId:null,preparation:food.preparation,unit:'g',perUnit:{k:1,p:.1,c:.01,f:.05,fi:.01},observedAt:'2026-11-01T00:00:00Z',expiresAt:'2026-11-02T00:00:00Z'};
 const record={id:'TEST_ONLY-rule-v1',foodId:food.id,productId:null,preparation:food.preparation,unit:'g',restriction:'gluten',basis:'fresh_unseasoned',verdict:'compatible',singleIngredient:true,minQty:1,maxQty:200,conditions:['TEST_ONLY fresco sin agregados; revisar preparación.']};
 const raw='TEST_ONLY invented capture, not an official quotation';
 const source={raw,record,manifest:{active:true,environment:'test_only',captureMethod:'official_general_rule',sourceVersion:'TEST_ONLY-v1',pipelineVersion:'TEST_ONLY-parser-v1',sourceUrl:'https://www.argentina.gob.ar/TEST_ONLY',capturedAt:'2026-11-01T00:00:00Z',reviewAfter:'2026-11-02T00:00:00Z',rawDigest:digest(raw),normalizedDigest:digest(record)}};
 const state={context:{actorId:'coachA',authorizedCoachId:'coachA',sessionId:'sessionA',organizationId:'orgA',studentOrganizationId:'orgA',studentId:'studentA',active:true,processingConsent:true,followupConsent:true,shared:true,documentCurrent:true,revoked:false,healthRevision:1,intakeRevision:1,draftRevision:1,conditions:{celiac:'confirmed'},dislikedIds:[],goal:{carb_g:20},pattern:{kind:'general'},plan:{meals:[{slot:'test',items:[{id:food.id,qty:100,unit:'g'}]}]},now},foods:[food],sources:[source],receipt:null,reads:0,afterRead:null};
 const tx={clock:async()=>state.context.now,context:async()=>{state.reads++;if(state.afterRead)state.afterRead(state);return structuredClone(state.context);},foods:async()=>structuredClone(state.foods),evidence:async()=>structuredClone(state.sources),putReceipt:async r=>{state.receipt=structuredClone(r);},receipt:async()=>structuredClone(state.receipt)};
 const repo={transaction:fn=>fn(tx)};
 return {state,tx,provider:createClinicalProvider(repo,{testMode:true}),production:createClinicalProvider(repo),request:{studentId:'studentA',draftRevision:1}};
}
let groups=0;const pass=()=>groups++;
{
 const f=fixture(),r=await f.provider.bindSavedDraft(f.request);assert.equal(r.compatibilityReady,true);assert.equal(r.publishable,false);assert.equal(r.decisions[0].color,'green');assert.match(r.decisions[0].conditions[0],/preparación/);assert.equal((await f.provider.assertPublication(f.tx,f.request)).binding,r.binding);pass();
}
for(const change of [c=>c.actorId='coachB',c=>c.studentOrganizationId='orgB',c=>c.processingConsent=false,c=>c.followupConsent=false,c=>c.revoked=true,c=>c.documentCurrent=false,c=>c.sessionId='']){
 const f=fixture();change(f.state.context);await assert.rejects(()=>f.provider.bindSavedDraft(f.request),{code:'DENIED'});assert.equal(f.state.receipt,null);
}pass();
{
 const f=fixture();await assert.rejects(()=>f.provider.assess({...f.request,verified:true}),{code:'INVALID_REQUEST'});assert.equal(f.state.reads,0);pass();
}
for(const change of [s=>s.raw+='changed',s=>s.record.verdict='contains',s=>s.manifest.sourceUrl='https://evil.invalid/fake',s=>s.manifest.reviewAfter='2026-10-01',s=>s.manifest.active=false]){
 const f=fixture();change(f.state.sources[0]);assert.equal((await f.provider.assess(f.request)).compatibilityReady,false);
}pass();
for(const change of [r=>r.productId='other',r=>r.preparation='breaded',r=>r.unit='ml',r=>r.maxQty=90]){
 const f=fixture();change(f.state.sources[0].record);f.state.sources[0].manifest.normalizedDigest=digest(f.state.sources[0].record);assert.equal((await f.provider.assess(f.request)).compatibilityReady,false);
}pass();
{
 const f=fixture();f.state.foods[0].glutenEvidence={status:'verified',verdict:'compatible'};f.state.sources=[];const r=await f.provider.assess(f.request);assert.equal(r.decisions[0].color,'yellow');assert.equal(r.compatibilityReady,false);pass();
}
{
 const f=fixture();assert.equal((await f.production.assess(f.request)).compatibilityReady,false);f.state.context.conditions={lactose_intolerance:'confirmed'};assert.equal((await f.provider.assess(f.request)).compatibilityReady,false);pass();
}
for(const change of [c=>c.healthRevision++,c=>c.intakeRevision++,c=>c.goal.carb_g++,c=>c.plan.meals[0].items[0].qty=110,c=>c.sessionId='sessionNew']){
 const f=fixture();await f.provider.bindSavedDraft(f.request);change(f.state.context);await assert.rejects(()=>f.provider.assertPublication(f.tx,f.request),{code:'STALE_EVIDENCE'});
}pass();
{
 const f=fixture();await f.provider.bindSavedDraft(f.request);f.state.sources[0].manifest.sourceVersion='TEST_ONLY-v2';await assert.rejects(()=>f.provider.assertPublication(f.tx,f.request),{code:'STALE_EVIDENCE'});pass();
}
{
 const f=fixture();f.state.afterRead=s=>{if(s.reads===2)s.context.healthRevision++;};await assert.rejects(()=>f.provider.bindSavedDraft(f.request),{code:'STALE_CONTEXT'});assert.equal(f.state.receipt,null);pass();
}
{
 const f=fixture();f.state.context.conditions={};assert.throws(()=>contextRestrictions(f.state.context),{code:'MISSING_DECLARATION'});f.state.context.declaration={kind:'none_declared',declared_by:'studentA',source_revision:1};assert.deepEqual(contextRestrictions(f.state.context),[]);f.state.context.conditions={celiac:'not_reported'};assert.throws(()=>contextRestrictions(f.state.context),{code:'MISSING_DECLARATION'});pass();
}
{
 const f=fixture();f.state.context.conditions={};f.state.context.declaration={kind:'none_declared',declared_by:'studentA',source_revision:1};f.state.context.pattern={kind:'keto',coachConfirmed:true,maxCarbG:1};f.state.context.goal={carb_g:1};f.state.context.plan.meals.push(structuredClone(f.state.context.plan.meals[0]));const r=await f.provider.assess(f.request);assert.equal(r.compatibilityReady,false);assert.match(r.conflict,/totales/);pass();
}
{
 const f=fixture(),s=f.state.sources[0];s.record.basis='documented_ingredient';s.record.verdict='contains';s.manifest.normalizedDigest=digest(s.record);const r=await f.provider.bindSavedDraft(f.request);assert.equal(r.decisions[0].color,'red');await assert.rejects(()=>f.provider.assertPublication(f.tx,f.request),{code:'COMPATIBILITY_UNRESOLVED'});pass();
}
for(const qty of [0,-1,NaN,Infinity]){const f=fixture();f.state.context.plan.meals[0].items[0].qty=qty;await assert.rejects(()=>f.provider.assess(f.request),{code:'INVALID_RECIPE'});}pass();
{
 const f=fixture();f.state.afterRead=s=>{if(s.reads===2)s.context.now=Date.parse('2026-11-02T00:00:01Z');};await assert.rejects(()=>f.provider.bindSavedDraft(f.request),{code:'STALE_EVIDENCE'});assert.equal(f.state.receipt,null);pass();
}
{
 const f=fixture();await f.provider.bindSavedDraft(f.request);
 const savedReceipt=f.tx.receipt;f.tx.receipt=async()=>{const r=await savedReceipt();f.state.context.now=Date.parse('2026-11-02T00:00:01Z');return r;};
 await assert.rejects(()=>f.provider.assertPublication(f.tx,f.request),{code:'STALE_EVIDENCE'});pass();
}
console.log(JSON.stringify({groups,status:'PASS',scope:'TEST_ONLY provider units; no SQL/JWT/runtime deployment or real clinical catalog'}));
