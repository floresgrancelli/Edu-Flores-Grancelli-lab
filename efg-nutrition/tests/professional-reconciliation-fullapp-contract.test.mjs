import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const options={enabled:true,professionalScreens:true,professionalFixture:true,professionalReconciliation:true};
test('reconciliation and fictional backend persistence stay OFF on disk and by default',()=>{
 for(const [path,file,marker] of [
  ['/efg-nutrition/pilot/professional-mutation-journal.mjs','../pilot/professional-mutation-journal.mjs','export const PROFESSIONAL_RECONCILIATION_ENABLED'],
  ['/efg-nutrition/tests/professional-screens-fullapp-sdk.mjs','professional-screens-fullapp-sdk.mjs','const PERSIST_FICTIONAL_BACKEND']]){
  const text=source(file);assert.ok(text.includes(marker+' = false;'));
  assert.ok(syntheticResponse(path,text).includes(marker+' = false;'));
  assert.ok(syntheticResponse(path,text,options).includes(marker+' = true;'));
 }
 assert.throws(()=>syntheticResponse('/anything','',{professionalReconciliation:true}),/complete synthetic fixture/);
});
test('runner is opt-in, isolated, reloads, blocks external requests and always closes resources',()=>{
 const runner=source('professional-reconciliation-fullapp-browser.mjs');
 for(const required of ['professionalReconciliation:true','page.reload','browser.newContext','context.route','route.abort','context?.close()','browser?.close()','server?.close()','Verificar envío pendiente','Cancelar borradores','Cerrar sesión ficticia'])assert.ok(runner.includes(required),required);
 assert.doesNotMatch(runner,/--no-sandbox|ignoreHTTPSErrors|grantPermissions/);
});
test('fictional persistence stores only backend rows and counters; never actor or session',()=>{
 const sdk=source('professional-screens-fullapp-sdk.mjs');
 assert.match(sdk,/JSON.stringify\(\{version:1,db:data.db,count:data.count\}\)/);
 assert.match(sdk,/ncc-professional-fixture-backend-v1/);
 assert.match(sdk,/persistBackend\(\);if\(loss==='after-persist'\)lost\(\)/);
 assert.match(sdk,/revoke\(\)\{restoreBackend\(\);data.db.capability=false;persistBackend\(\);\}/);
});
test('SDK simulated reload preserves only fictional rows/counters and revocation, not authentication',async()=>{
 const savedGlobals=Object.fromEntries(['location','localStorage','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const values=new Map();
 Object.assign(globalThis,{location:{hostname:'127.0.0.1',origin:'http://127.0.0.1:12345'},
  localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
  document:{createElement:()=>({style:{},append(){},addEventListener(){},setAttribute(){}}),body:{prepend(){}}}});
 let nonce=0;
 async function load(enabled=true){
  const raw=source('professional-screens-fullapp-sdk.mjs');
  const text=syntheticResponse('/efg-nutrition/tests/professional-screens-fullapp-sdk.mjs',raw,enabled?options:{})
   .replaceAll("'./professional-screens-fixture.mjs'",JSON.stringify(new URL('./professional-screens-fixture.mjs',import.meta.url).href))
   .replaceAll("'../pilot/dual-workspace-candidate.mjs'",JSON.stringify(new URL('../pilot/dual-workspace-candidate.mjs',import.meta.url).href));
  const sdk=await import('data:text/javascript;base64,'+Buffer.from(text+'\n// instance '+(++nonce)).toString('base64'));
  const state={};sdk.bindApp({state,resetPrivateSession(){},today:()=> '2026-11-07',render:async()=>{},frame:{ready:async()=>{}}});
  return {...sdk,client:sdk.createClient(location.origin)};
 }
 const payload={id:'99999999-9999-4999-8999-999999999999',student_id:'33333333-3333-4333-8333-333333333333',coach_id:'11111111-1111-4111-8111-111111111111',sender_id:'11111111-1111-4111-8111-111111111111',body:'FICTICIO'};
 try{
  let sdk=await load();await sdk.fixture.loginAs();sdk.fixture.loseResponse();
  await assert.rejects(async()=>await sdk.client.from('efg_messages').insert(payload).select('*').single(),/perdida/);
  assert.deepEqual(sdk.fixture.counters(),{attempts:1,inserts:1,rows:1});
  sdk=await load();assert.equal((await sdk.client.auth.getUser()).data.user,null);
  await sdk.fixture.loginAs();
  const receipt=await sdk.client.from('efg_messages').select('*').eq('id',payload.id).eq('student_id',payload.student_id).eq('coach_id',payload.coach_id).maybeSingle();
  assert.equal(receipt.data.id,payload.id);assert.equal(receipt.data.body,payload.body);
  assert.deepEqual(sdk.fixture.counters(),{attempts:1,inserts:1,rows:1});
  sdk.fixture.loseResponse('without-row');
  await assert.rejects(async()=>await sdk.client.from('efg_messages').insert({...payload,id:'88888888-8888-4888-8888-888888888888'}).select('*').single(),/perdida/);
  assert.deepEqual(sdk.fixture.counters(),{attempts:2,inserts:1,rows:1});
  sdk.fixture.revoke();sdk=await load();await sdk.fixture.loginAs();
  await assert.rejects(async()=>await sdk.client.from('efg_messages').select('*').eq('id',payload.id).eq('student_id',payload.student_id).eq('coach_id',payload.coach_id).maybeSingle(),/negó/);
  assert.equal(sdk.fixture.inspect().capability,false);
  const stored=JSON.parse(values.get('ncc-professional-fixture-backend-v1'));
  assert.deepEqual(Object.keys(stored).sort(),['count','db','version']);
  assert.doesNotMatch(JSON.stringify(stored),/access_token|session_id|synthetic-session-one/);
  const ordinary=await load(false);assert.equal(ordinary.fixture.inspect().capability,true);
  assert.deepEqual(ordinary.fixture.counters(),{attempts:0,inserts:0,rows:0});
 }finally{for(const [key,descriptor] of Object.entries(savedGlobals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
