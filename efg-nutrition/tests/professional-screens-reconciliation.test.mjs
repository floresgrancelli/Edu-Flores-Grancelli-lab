import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessionalScreens,createProfessionalMutationGuard} from '../pilot/professional-screens-candidate.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {createProfessionalMutationJournal,createMemoryJournalDriver} from '../pilot/professional-mutation-journal.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {createProfessionalFixture,IDS} from './professional-screens-fixture.mjs';
const scope={userId:IDS.dual,organizationId:IDS.professional};
const code=expected=>e=>e.code===expected;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function setup(){
 const fixture=createProfessionalFixture(),storage={value:{version:1,records:[]}};
 function create({transport=fixture.transport,driver=createMemoryJournalDriver({state:storage}),reconciliationEnabled=true,journalMissing=false}={}){
  const journal=createProfessionalMutationJournal({enabled:true,syntheticEnvironment:()=>true,backendNamespace:'fixture:reconciliation-tests',driver});
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,reconciliationEnabled,
   mutationGuard:createProfessionalMutationGuard({journal:journalMissing?undefined:journal}),transport,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace});
  return {adapter,journal};
 }
 const wrapped=fn=>({kind:fixture.transport.kind,perform:(action,args,s)=>fn(action,args,s,()=>fixture.transport.perform(action,args,s))});
 return {fixture,storage,create,wrapped};
}
async function select(instance){await instance.adapter.open();instance.adapter.selectStudent(IDS.pupil);return instance;}
async function lostSend(h,{apply=true}={}){
 const instance=await select(h.create({transport:h.wrapped(async(action,args,s,run)=>{if(action==='sendMessage'){if(apply)await run();throw Error('Synthetic response lost');}return run();})}));
 instance.adapter.setDraft('message','CUERPO FICTICIO PRIVADO');await assert.rejects(instance.adapter.sendMessage());return instance;
}
test('reconciliation OFF retains RAM-only behavior and makes no journal call',async()=>{
 const h=setup(),driver={transaction(){throw Error('Must not be called');}},i=await select(h.create({driver,reconciliationEnabled:false}));
 i.adapter.setDraft('message','FICTICIO');await i.adapter.sendMessage();assert.equal(h.fixture.count.sendMessage,1);assert.deepEqual(h.storage.value.records,[]);
});
test('lost response survives full guard replacement and readback confirms exact UUID without resend',async()=>{
 const h=setup(),before=h.fixture.personalSnapshot(),first=await lostSend(h);const saved=structuredClone(h.storage.value.records[0]);
 assert.equal(saved.operationId,h.fixture.db.messages.at(-1).id);assert.equal(JSON.stringify(h.storage).includes('CUERPO FICTICIO PRIVADO'),false);
 first.adapter.dispose();h.fixture.session.epoch++;const second=await select(h.create());assert.equal(second.adapter.snapshot().uncertain,true);
 second.adapter.setDraft('message','OTRO BORRADOR');await assert.rejects(second.adapter.sendMessage(),code('OUTCOME_UNCERTAIN'));assert.equal(h.fixture.count.sendMessage,1);
 const recovered=await second.adapter.reconcileMessage();assert.equal(recovered.status,'confirmed');assert.equal(recovered.message.id,saved.operationId);
 assert.equal(h.storage.value.records.length,0);assert.equal(second.adapter.snapshot().uncertain,false);assert.equal(second.adapter.snapshot().messageDraft,'OTRO BORRADOR');
 assert.equal(h.fixture.count.sendMessage,1);assert.deepEqual(h.fixture.personalSnapshot(),before);
});
test('empty exact readback stays uncertain and never resends; a later row can be confirmed',async()=>{
 const h=setup();await lostSend(h,{apply:false});const i=await select(h.create()),saved=h.storage.value.records[0];
 assert.deepEqual(await i.adapter.reconcileMessage(),{status:'unresolved',reason:'NOT_VISIBLE'});assert.equal(h.storage.value.records.length,1);assert.equal(h.fixture.count.sendMessage,undefined);
 h.fixture.db.messages.push({id:saved.operationId,student_id:IDS.pupil,coach_id:IDS.dual,sender_id:IDS.dual,body:'CUERPO FICTICIO PRIVADO',created_at:'2026-11-07T05:00:00Z',read_at:null});
 assert.equal((await i.adapter.reconcileMessage()).status,'confirmed');assert.equal(h.fixture.count.sendMessage,undefined);
});
for(const [label,change] of [['ID',row=>({...row,id:IDS.message})],['sender',row=>({...row,sender_id:IDS.pupil})],['body',row=>({...row,body:'CONTENIDO DIFERENTE'})],['pair',row=>({...row,student_id:IDS.second})]])test('reconciliation rejects wrong '+label+' without clearing the record',async()=>{
 const h=setup();await lostSend(h);const i=await select(h.create({transport:h.wrapped(async(a,args,s,run)=>{const result=await run();return a==='messageReceipt'?{data:change(result.data)}:result;})}));
 await assert.rejects(i.adapter.reconcileMessage());assert.equal(h.storage.value.records.length,1);assert.equal(h.fixture.count.sendMessage,1);
});
test('message receipt lookup does not depend on latest-200 history',async()=>{
 const h=setup();await lostSend(h);for(let n=0;n<201;n++)h.fixture.db.messages.push({id:'aaaaaaaa-bbbb-4ccc-8ddd-'+String(n).padStart(12,'0'),student_id:IDS.pupil,coach_id:IDS.dual,sender_id:IDS.pupil,body:'Posterior ficticio',created_at:'2026-11-08T00:00:00Z',read_at:null});
 const i=await select(h.create());assert.equal((await i.adapter.reconcileMessage()).status,'confirmed');assert.equal(h.fixture.count.messages,undefined);
});
test('revocation during readback keeps journal and removes displayed private data',async()=>{
 const h=setup();await lostSend(h);const i=await select(h.create({transport:h.wrapped(async(a,args,s,run)=>{if(a==='messageReceipt')throw Object.assign(Error('Denied'),{code:'DENIED',outcome:'not_applied'});return run();})}));
 await assert.rejects(i.adapter.reconcileMessage(),code('DENIED'));assert.equal(h.storage.value.records.length,1);assert.equal(i.adapter.snapshot().status,'error');assert.deepEqual(i.adapter.snapshot().messages,[]);
});
test('late readback from an old auth epoch cannot resolve or repaint',async()=>{
 const h=setup();await lostSend(h);const wait=deferred(),started=deferred();const i=await select(h.create({transport:h.wrapped(async(a,args,s,run)=>{const data=await run();if(a==='messageReceipt'){started.resolve();await wait.promise;}return data;})}));
 const promise=i.adapter.reconcileMessage();await started.promise;h.fixture.session.epoch++;wait.resolve();await assert.rejects(promise);assert.equal(h.storage.value.records.length,1);assert.deepEqual(i.adapter.snapshot().messages,[]);
});
test('alias equality after a lost response is not a receipt and stays blocked after reload',async()=>{
 const h=setup(),first=await select(h.create({transport:h.wrapped(async(a,args,s,run)=>{const data=await run();if(a==='setAlias')throw Error('Lost');return data;})}));
 first.adapter.setDraft('alias','IGUAL.FICTICIO');await assert.rejects(first.adapter.setAlias());const next=await select(h.create());assert.equal(next.adapter.snapshot().organization.payment_alias,'IGUAL.FICTICIO');
 next.adapter.setDraft('alias','OTRO.FICTICIO');await assert.rejects(next.adapter.setAlias(),code('OUTCOME_UNCERTAIN'));assert.equal(h.fixture.count.setAlias,1);assert.equal(h.storage.value.records[0].action,'setAlias');assert.equal(JSON.stringify(h.storage).includes('IGUAL.FICTICIO'),false);
});
test('read_at observed after a lost response does not resolve authorship or remove reservation',async()=>{
 const h=setup(),first=await select(h.create({transport:h.wrapped(async(a,args,s,run)=>{const data=await run();if(a==='markRead')throw Error('Lost');return data;})}));
 await first.adapter.loadMessages();await assert.rejects(first.adapter.markRead());const next=await select(h.create());await next.adapter.loadMessages();assert.ok(next.adapter.snapshot().messages[0].read_at);
 assert.deepEqual(await next.adapter.markRead(),[]);assert.equal(h.storage.value.records[0].action,'markRead');assert.equal(next.adapter.snapshot().uncertain,true);
});
test('a valid zero-row read response releases reservation but confirms zero rows',async()=>{
 const h=setup(),i=await select(h.create({transport:h.wrapped((a,args,s,run)=>a==='markRead'?{data:[]}:run())}));await i.adapter.loadMessages();assert.deepEqual(await i.adapter.markRead(),[]);assert.equal(h.storage.value.records.length,0);assert.equal(i.adapter.snapshot().messages[0].read_at,null);
});
for(const failure of ['missing','quota','corrupt'])test('journal '+failure+' blocks mutation while authorized queries remain available',async()=>{
 const h=setup();if(failure==='quota')h.storage.failure='quota';if(failure==='corrupt')h.storage.value={version:99,records:[]};
 const i=await select(h.create({journalMissing:failure==='missing'}));assert.match(i.adapter.snapshot().recoveryProblem,/escrituras siguen bloqueadas/);await i.adapter.loadRecipes();assert.equal(i.adapter.snapshot().recipes.length,1);
 i.adapter.setDraft('message','NO DEBE ENVIARSE');await assert.rejects(i.adapter.sendMessage());assert.equal(h.fixture.count.sendMessage,undefined);
});
test('durable transaction completion precedes dispatch and excludes another instance',async()=>{
 const h=setup(),base=createMemoryJournalDriver({state:h.storage}),gate=deferred(),reserved=deferred();
 const driver={transaction:async fn=>{const result=await base.transaction(fn);if(result?.operationId){reserved.resolve();await gate.promise;}return result;}};
 const first=await select(h.create({driver})),second=await select(h.create());first.adapter.setDraft('message','UNO FICTICIO');const sending=first.adapter.sendMessage();await reserved.promise;
 assert.equal(h.fixture.count.sendMessage,undefined);second.adapter.setDraft('message','DOS FICTICIO');await assert.rejects(second.adapter.sendMessage(),code('OUTCOME_UNCERTAIN'));assert.equal(h.fixture.count.sendMessage,undefined);
 gate.resolve();await sending;assert.equal(h.fixture.count.sendMessage,1);assert.equal(h.storage.value.records.length,0);
});
test('storage failure after a valid receipt retains reservation for later readback',async()=>{
 const h=setup(),first=await select(h.create({transport:h.wrapped(async(a,args,s,run)=>{const result=await run();if(a==='sendMessage')h.storage.failure='quota';return result;})}));
 first.adapter.setDraft('message','CUERPO FICTICIO PRIVADO');await assert.rejects(first.adapter.sendMessage());assert.equal(h.storage.value.records.length,1);assert.equal(h.fixture.count.sendMessage,1);
 delete h.storage.failure;const next=await select(h.create());assert.equal((await next.adapter.reconcileMessage()).status,'confirmed');assert.equal(h.fixture.count.sendMessage,1);
});
test('proved pre-dispatch denial can release a durable reservation',async()=>{
 const h=setup(),i=await select(h.create({transport:h.wrapped((a,args,s,run)=>{if(a==='sendMessage')throw Object.assign(Error('Denied before dispatch'),{code:'DENIED',outcome:'not_applied'});return run();})}));
 i.adapter.setDraft('message','FICTICIO');await assert.rejects(i.adapter.sendMessage(),code('DENIED'));assert.equal(h.storage.value.records.length,0);assert.equal(h.fixture.count.sendMessage,undefined);
});
test('cancel, dispose and a new session do not erase pending records',async()=>{
 const h=setup(),i=await lostSend(h);i.adapter.cancelDrafts();i.adapter.dispose();h.fixture.session.epoch+=10;const next=await select(h.create());assert.equal(next.adapter.snapshot().recovery.length,1);assert.equal(h.storage.value.records.length,1);
});

test('same-instance readback clears only the matching lost-send draft',async()=>{
 const h=setup(),i=await lostSend(h);assert.equal(i.adapter.snapshot().messageDraft,'CUERPO FICTICIO PRIVADO');assert.equal((await i.adapter.reconcileMessage()).status,'confirmed');assert.equal(i.adapter.snapshot().messageDraft,'');assert.equal(h.fixture.count.sendMessage,1);
});
test('another tab resolution remains verifiable in original guard without trusting journal absence',async()=>{
 const h=setup(),a=await lostSend(h),b=await select(h.create());assert.equal((await b.adapter.reconcileMessage()).status,'confirmed');assert.equal(h.storage.value.records.length,0);
 a.adapter.cancelDrafts();await a.adapter.open();a.adapter.selectStudent(IDS.pupil);assert.equal(a.adapter.snapshot().uncertain,true);assert.equal(a.adapter.snapshot().recovery.length,1);
 const before=h.fixture.count.messageReceipt;assert.equal((await a.adapter.reconcileMessage()).status,'confirmed');assert.equal(h.fixture.count.messageReceipt,before+1);assert.equal(a.adapter.snapshot().uncertain,false);assert.equal(h.fixture.count.sendMessage,1);
});
test('old RAM readback never deletes a newer reservation in the same lane',async()=>{
 const h=setup(),a=await lostSend(h),b=await select(h.create());await b.adapter.reconcileMessage();const second=await lostSend(h);const newer=h.storage.value.records[0].operationId;
 a.adapter.cancelDrafts();await a.adapter.open();a.adapter.selectStudent(IDS.pupil);const receipt=await a.adapter.reconcileMessage();assert.notEqual(receipt.message.id,newer);assert.equal(h.storage.value.records[0].operationId,newer);assert.equal(a.adapter.snapshot().uncertain,true);assert.equal(h.fixture.count.sendMessage,2);
 assert.equal((await a.adapter.reconcileMessage()).message.id,newer);assert.equal(h.storage.value.records.length,0);second.adapter.dispose();
});
test('journal absence alone never clears original guard when exact row is not visible',async()=>{
 const h=setup(),a=await lostSend(h),b=await select(h.create());await b.adapter.reconcileMessage();h.fixture.db.messages=h.fixture.db.messages.filter(row=>row.id===IDS.message);
 a.adapter.cancelDrafts();await a.adapter.open();a.adapter.selectStudent(IDS.pupil);assert.equal((await a.adapter.reconcileMessage()).status,'unresolved');assert.equal(a.adapter.snapshot().uncertain,true);assert.equal(a.adapter.snapshot().recovery.length,1);
});
