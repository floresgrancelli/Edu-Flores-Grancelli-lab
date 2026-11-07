import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {PROFESSIONAL_RECONCILIATION_ENABLED,createProfessionalMutationJournal as create,
  createMemoryJournalDriver as memory,createIndexedDBJournalDriver as idb,
  isProfessionalMutationJournal as genuine,digestProfessionalPayload as digest} from '../pilot/professional-mutation-journal.mjs?v=ncc-professional-reconciliation-r1-20261107';
const uid='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001',student='30000000-0000-4000-8000-000000000001';
const scope={userId:uid,organizationId:org};
const input={scope,action:'sendMessage',studentId:student,payloadDigest:'a'.repeat(64)};
const state=()=>({value:{version:1,records:[]}});
const journal=(store,extra={})=>create({enabled:true,syntheticEnvironment:()=>true,backendNamespace:'fixture:journal-tests',crypto:webcrypto,driver:memory({state:store}),...extra});
const code=expected=>error=>error.code===expected;

test('default OFF and synthetic gate cause zero storage calls; brand cannot be spoofed',async()=>{
  assert.equal(PROFESSIONAL_RECONCILIATION_ENABLED,false);
  let calls=0;const driver={transaction(){calls++;}};
  const off=create({driver});
  for(const call of [()=>off.reserve(input),()=>off.list(scope),()=>off.finish({})])await assert.rejects(call,code('FEATURE_DISABLED'));
  await assert.rejects(journal(state(),{syntheticEnvironment:()=>false,driver}).reserve(input),code('SYNTHETIC_ONLY'));
  assert.equal(calls,0);assert.equal(genuine(off),true);assert.equal(genuine({...off}),false);
});
test('atomic lane reservation across two instances and reload, isolated scopes',async()=>{
  const store=state(),a=journal(store),b=journal(store);
  const settled=await Promise.allSettled([a.reserve(input),b.reserve(input)]);
  assert.equal(settled.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(settled.find(x=>x.status==='rejected').reason.code,'OUTCOME_UNCERTAIN');
  const recovered=await journal(store).list(scope);
  assert.equal(recovered.length,1);assert.equal(recovered[0].operationId,settled.find(x=>x.status==='fulfilled').value.operationId);
  assert.deepEqual(await a.list({...scope,userId:student}),[]);
  await assert.rejects(journal(store).reserve(input),code('OUTCOME_UNCERTAIN'));
  assert.deepEqual(await journal(store,{backendNamespace:'fixture:other'}).list(scope),[]);
});
test('finish exact only, absence/stale/replacement and failed completion preserve blockade',async()=>{
  const store=state(),j=journal(store),first=await j.reserve(input);
  await assert.rejects(j.finish({...first,payloadDigest:'b'.repeat(64)}),code('JOURNAL_RECORD_MISMATCH'));
  store.failure='quota';await assert.rejects(j.finish(first),code('JOURNAL_UNAVAILABLE'));delete store.failure;
  await assert.rejects(j.reserve(input),code('OUTCOME_UNCERTAIN'));
  assert.equal(await j.finish(first),true);
  await assert.rejects(j.finish(first),code('JOURNAL_RECORD_MISMATCH'));
  const newer=await j.reserve(input);await assert.rejects(j.finish(first),code('JOURNAL_RECORD_MISMATCH'));
  assert.equal((await j.list(scope))[0].operationId,newer.operationId);
  await assert.rejects(journal(store,{backendNamespace:'fixture:other'}).finish(newer),code('JOURNAL_RECORD_MISMATCH'));
});
test('unknown/corrupt metadata or records and denied storage always fail closed',async()=>{
  for(const corrupt of [undefined,null,{version:2,records:[]},{version:1,records:[],body:'secret'},{version:1,records:[{}]}]){
    const j=journal({value:corrupt});
    await assert.rejects(j.list(scope),code('INVALID_JOURNAL_DATA'));
    await assert.rejects(j.reserve(input),code('INVALID_JOURNAL_DATA'));
  }
  for(const failure of ['denied','quota','abort']){
    const store=state();store.failure=failure;
    await assert.rejects(journal(store).reserve(input),code('JOURNAL_UNAVAILABLE'));assert.equal(store.value.records.length,0);
  }
});
test('strict input, actions, scope, digest and read ID contradictions',async()=>{
  const bad=[{scope:{...scope,sessionId:'forbidden'}},{scope:{...scope,userId:[uid]}},{studentId:uid},{studentId:'bad'},
    {action:'delete'},{action:'setAlias'},{payloadDigest:['a'.repeat(64)]},{payloadDigest:'x'},
    {body:'do not persist'},{readIds:[student]},{action:'markRead'},
    {action:'markRead',readIds:[]},{action:'markRead',readIds:[student,student]},
    {action:'markRead',readIds:['bad']}];
  for(const changes of bad)await assert.rejects(journal(state()).reserve({...input,...changes}),code('INVALID_JOURNAL_DATA'));
  const j=journal(state());await j.reserve({...input,action:'setAlias',studentId:null});
  await j.reserve({...input,action:'markRead',readIds:[student]});
});
test('digest only persistence; no payload/session/profile, and corrupt lane denied',async()=>{
  const store=state(),j=journal(store);const payloadDigest=await digest({body:'secret message',alias:'secret alias'},webcrypto);
  const r=await j.reserve({...input,payloadDigest});
  assert.match(payloadDigest,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(store).includes('secret'),false);
  assert.deepEqual(Object.keys(r).sort(),['version','backendNamespace','scope','lane','operationId','action','studentId','createdAt','payloadDigest'].sort());
  store.value.records[0].scope.userId=student;
  await assert.rejects(j.list(scope),code('INVALID_JOURNAL_DATA'));
});
test('namespace permits fixture or exact loopback origin only',async()=>{
  for(const backendNamespace of ['https://production.example','http://localhost/path','http://localhost?token=x','http://user:pw@localhost','fixture:x/secret','http://127.0.0.2','http://localhost/#x','http://localhost/'])
    await assert.rejects(journal(state(),{backendNamespace}).reserve(input),code('INVALID_NAMESPACE'));
  for(const backendNamespace of ['fixture:abc','http://localhost:8080','http://127.0.0.1:1234','https://[::1]'])
    assert.ok(await journal(state(),{backendNamespace}).reserve(input));
});
test('UUID collision across lanes and oversized envelopes fail without clearing reservations',async()=>{
  const store=state(),j=journal(store,{crypto:{randomUUID:()=>uid}});
  await j.reserve(input);
  await assert.rejects(j.reserve({...input,action:'setAlias',studentId:null}),code('INVALID_JOURNAL_DATA'));
  assert.equal(store.value.records.length,1);
  store.value.records=Array(10001).fill(store.value.records[0]);
  await assert.rejects(j.list(scope),code('INVALID_JOURNAL_DATA'));assert.equal(store.value.records.length,10001);
});
test('late IDB open success after blocked closes the orphan connection',async()=>{
  let request,closed=0;
  const api={open(){request={};queueMicrotask(()=>request.onblocked());return request;}};
  await assert.rejects(journal(state(),{driver:idb({indexedDB:api})}).reserve(input),code('JOURNAL_UNAVAILABLE'));
  request.result={close(){closed++;}};request.onsuccess();assert.equal(closed,1);
});

// Minimal IDB protocol double: exposes separate request-success and commit boundaries.
// Atomic shared-instance behavior is covered above; this double does not claim browser QA.
function fakeIDB({abort=false,missing=false}={}) {
  const store={value:missing?undefined:{version:1,records:[]}},events=[];
  let complete;
  const db={close(){},transaction(name,mode,options){
    events.push([name,mode,options]);
    const tx={abort(){queueMicrotask(()=>tx.onabort());},objectStore(){return {
      get(){const req={};queueMicrotask(()=>{req.result=structuredClone(store.value);req.onsuccess();});return req;},
      put(next){events.push('put');complete=()=>{if(abort)tx.onabort();else{store.value=next;tx.oncomplete();}};}
    };}};return tx;
  }};
  return {events,store,commit:()=>complete(),api:{open(){const req={};queueMicrotask(()=>{req.result=db;req.onsuccess();});return req;}}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('IDB reserves in readwrite strict transaction and waits for commit',async()=>{
  const fake=fakeIDB(),j=journal(state(),{driver:idb({indexedDB:fake.api})});
  let resolved=false;const promise=j.reserve(input).then(x=>{resolved=true;return x;});
  await tick();assert.equal(resolved,false);assert.equal(fake.store.value.records.length,0);
  assert.deepEqual(fake.events[0],['journal','readwrite',{durability:'strict'}]);
  fake.commit();const result=await promise;assert.equal(fake.store.value.records[0].operationId,result.operationId);
});
test('IDB abort after put never dispatches a successful reservation; missing metadata fails closed',async()=>{
  const fake=fakeIDB({abort:true}),j=journal(state(),{driver:idb({indexedDB:fake.api})});
  const promise=j.reserve(input),rejection=assert.rejects(promise,code('JOURNAL_UNAVAILABLE'));
  await tick();fake.commit();await rejection;assert.equal(fake.store.value.records.length,0);
  const absent=fakeIDB({missing:true});await assert.rejects(journal(state(),{driver:idb({indexedDB:absent.api})}).list(scope),code('INVALID_JOURNAL_DATA'));
});
