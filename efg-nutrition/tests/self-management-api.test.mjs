import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelfManagementHandler} from '../self-management/backend/api.mjs';
const id='00000000-0000-4000-8000-000000000001';
function fixture(extra={}){
 const calls=[];const repository={
  readAccount:async uid=>({user_id:uid,mode:'independent',active:true}),
  readIntake:async uid=>({user_id:uid,revision:1,data:{weight_kg:82}}),
  readGeneralIntake:async uid=>({student_id:uid,revision:2,age_years:41,height_cm:174}),
  saveIntake:async p=>{calls.push(p);return {userId:p.userId,requestId:p.requestId,persisted:true,intake:{user_id:p.userId,revision:p.expectedRevision+1,data:p.fields}};},
  register:async uid=>({user_id:uid,mode:'independent',active:true}),
 };
 const handler=createSelfManagementHandler({enabled:true,verifyBearer:async token=>token==='signed-test-token'?{id}:null,
  repository,readCatalog:async()=>({}),requireAccess:async()=>true,requireLegalReceipt:async()=> 'qa_only',...extra});
 const request=(body,headers={})=>new Request('https://example.test/api',{method:'POST',
  headers:{Authorization:'Bearer signed-test-token','Content-Type':'application/json',Origin:'https://efg-nutrition.onrender.com',...headers},body:JSON.stringify(body)});
 return {handler,request,calls};
}
test('authenticated context reads own private and previous general intake',async()=>{
 const f=fixture(),r=await f.handler(f.request({action:'context'}));assert.equal(r.status,200);
 const d=await r.json();assert.equal(d.userId,id);assert.equal(d.intake.data.weight_kg,82);
 assert.equal(d.generalIntake.height_cm,174);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('caller cannot submit another user ID or service credential',async()=>{
 const f=fixture();for(const change of [{userId:'other'},{serviceRole:'bad'}])
  assert.equal((await f.handler(f.request({action:'context',...change}))).status,400);
 assert.equal(f.calls.length,0);
});
test('missing/invalid Auth, foreign origin, inactive feature, missing access or legal callback fail closed',async()=>{
 const f=fixture();assert.equal((await f.handler(f.request({action:'context'},{Authorization:'Bearer invalid'}))).status,401);
 assert.equal((await f.handler(f.request({action:'context'},{Origin:'https://foreign.test'}))).status,403);
 assert.equal((await fixture({enabled:false}).handler(f.request({action:'context'}))).status,503);
 assert.equal((await fixture({requireAccess:undefined}).handler(f.request({action:'context'}))).status,503);
 assert.equal((await fixture({requireLegalReceipt:undefined}).handler(f.request({action:'context'}))).status,503);
});
test('save derives owner from verified bearer and preserves expected version',async()=>{
 const f=fixture();const r=await f.handler(f.request({action:'save_intake',fields:{weight_kg:79,processingConsent:true},expectedRevision:1,requestId:'request_001'}));
 assert.equal(r.status,200);assert.equal(f.calls[0].userId,id);assert.equal(f.calls[0].expectedRevision,1);
});
test('mode changes or student accounts do not enter the independent path',async()=>{
 const f=fixture({repository:{readAccount:async()=>({user_id:id,mode:'coach_linked',active:true})}});
 assert.equal((await f.handler(f.request({action:'context'}))).status,403);
});
test('switching identity during read cannot return previous private intake',async()=>{
 let count=0;const f=fixture({verifyBearer:async()=>({id:++count===1?id:'other_user'})});
 assert.equal((await f.handler(f.request({action:'context'}))).status,409);
});
test('registration requires explicit choice, does not rewrite existing app role',async()=>{
 const f=fixture();assert.equal((await f.handler(f.request({action:'register',explicitChoice:false}))).status,400);
 assert.equal((await f.handler(f.request({action:'register',explicitChoice:true}))).status,200);
});
