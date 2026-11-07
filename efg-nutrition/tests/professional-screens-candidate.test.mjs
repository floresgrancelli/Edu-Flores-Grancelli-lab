import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProfessionalScreens,professionalScreenScope,PROFESSIONAL_SCREENS_RELEASE_ENABLED,SYNTHETIC_SCREEN_TRANSPORT} from '../pilot/professional-screens-candidate.mjs?v=ncc-professional-screens-r1-20261107';
import {createProfessionalFixture,IDS} from './professional-screens-fixture.mjs';
const code=expected=>error=>error.code===expected;
function harness(overrides={}){
 const fixture=createProfessionalFixture();
 const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
  mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:fixture.transport,...overrides});
 return {fixture,adapter};
}
async function selected(overrides){const result=harness(overrides);await result.adapter.open();result.adapter.selectStudent(IDS.pupil);return result;}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function wrapped(fixture,perform){return {kind:SYNTHETIC_SCREEN_TRANSPORT,perform:(action,args,scope)=>perform(action,args,scope,()=>fixture.transport.perform(action,args,scope))};}

 test('release flag is OFF and default adapter performs zero I/O',async()=>{
  assert.equal(PROFESSIONAL_SCREENS_RELEASE_ENABLED,false);let calls=0;
  const adapter=createProfessionalScreens({transport:{perform(){calls++;}}});
  await assert.rejects(adapter.open(),code('FEATURE_DISABLED'));assert.equal(calls,0);
 });
 test('enabled alone cannot connect a nonfixture transport',async()=>{
  let calls=0;const {adapter}=harness({transport:{perform(){calls++;}}});
  await assert.rejects(adapter.open(),code('SYNTHETIC_ONLY'));assert.equal(calls,0);
 });
 test('synthetic environment opt-in is mandatory',async()=>{
  const {adapter,fixture}=harness({syntheticEnvironment:()=>false});
  await assert.rejects(adapter.open(),code('SYNTHETIC_ONLY'));assert.deepEqual(fixture.count,{});
 });
 test('dual student scope uses professional org but preserves original role and relationship',async()=>{
  const {adapter,fixture}=await selected();const before=fixture.personalSnapshot();
  assert.equal(adapter.snapshot().scope.organizationId,IDS.professional);
  adapter.setDraft('alias','NUEVO.DEMO');await adapter.setAlias();
  await adapter.loadRecipes();await adapter.loadMessages();adapter.setDraft('message','Respuesta FICTICIA');await adapter.sendMessage();await adapter.markRead();
  assert.deepEqual(fixture.personalSnapshot(),before);assert.equal(fixture.db.profile.role,'student');
  assert.equal(fixture.db.organization.seat_limit,2);assert.equal(fixture.db.students.length,2);
  assert.equal(adapter.snapshot().organization.payment_alias,'NUEVO.DEMO');
 });
 test('managed coach also works without changing the role to gain access',async()=>{
  const {adapter,fixture}=harness();fixture.db.profile.role='coach';await adapter.open();assert.equal(fixture.db.profile.role,'coach');
 });
 for(const [label,change,expected] of [
  ['admin does not inherit recipe access',f=>{f.db.profile.role='admin';},'INVALID_CONTEXT'],
  ['inactive profile',f=>{f.db.profile.active=false;},'INVALID_CONTEXT'],
  ['personal organization reused',f=>{f.db.profile.organization_id=IDS.professional;f.db.personalOrganization.id=IDS.professional;},'PERSONAL_CONTEXT_MISMATCH'],
  ['personal relation changed',f=>{f.db.personalOrganization.id=IDS.foreign;},'PERSONAL_CONTEXT_MISMATCH'],
  ['foreign professional owner',f=>{f.db.organization.coach_id=IDS.mentor;},'PROFESSIONAL_CONTEXT_REQUIRED'],
  ['non-test workspace',f=>{f.db.organization.is_test=false;},'PROFESSIONAL_CONTEXT_REQUIRED'],
  ['grace workspace',f=>{f.db.organization.status='grace';},'PROFESSIONAL_CONTEXT_REQUIRED'],
  ['missing professional terms',f=>{f.db.organization.legal_ready=false;},'PROFESSIONAL_CONTEXT_REQUIRED'],
  ['personal selected',f=>f.navigate(false),'PROFESSIONAL_CONTEXT_REQUIRED'],
  ['missing session',f=>{f.session.sessionId='';},'LOGIN_REQUIRED']
 ])test(label+' fails closed before transport',async()=>{
  const {adapter,fixture}=harness();change(fixture);await assert.rejects(adapter.open(),code(expected));assert.deepEqual(fixture.count,{});
 });
 test('navigation generation is mandatory and snapshot inputs remain unmodified',()=>{
  const fixture=createProfessionalFixture(),session=fixture.readSession(),workspace=fixture.readWorkspace(),before=structuredClone(workspace);
  Object.freeze(workspace.view.originalProfile);professionalScreenScope(session,workspace);assert.deepEqual(workspace,before);
  delete workspace.navigationEpoch;assert.throws(()=>professionalScreenScope(session,workspace),code('INVALID_CONTEXT'));
 });
 for(const key of ['capability','marker','confirmed','professionalTerms','professionalPrivacy'])
  test('server fixture denies missing '+key+' despite a plausible local selection',async()=>{
   const {adapter,fixture}=await selected();fixture.db[key]=false;
   await assert.rejects(adapter.loadMessages(),code('DENIED'));const state=adapter.snapshot();
   assert.equal(state.status,'error');assert.deepEqual(state.messages,[]);assert.deepEqual(state.students,[]);
  });
 test('student must belong to the selected roster and retain consent',async()=>{
  const {adapter,fixture}=harness();fixture.db.students[1].consent_accepted=false;await adapter.open();
  assert.throws(()=>adapter.selectStudent(IDS.outsider),code('STUDENT_REQUIRED'));
  assert.throws(()=>adapter.selectStudent(IDS.second),code('STUDENT_REQUIRED'));
 });
 test('alias trims and preserves boolean RPC contract, full seats do not block it',async()=>{
  const {adapter,fixture}=harness();await adapter.open();adapter.setDraft('alias','  ALIAS.DEMO  ');
  await adapter.setAlias();assert.equal(fixture.db.organization.payment_alias,'ALIAS.DEMO');assert.equal(adapter.snapshot().aliasDraft,'');
  adapter.setDraft('alias','ab');assert.throws(()=>adapter.setAlias(),code('INVALID_ALIAS'));
  adapter.setDraft('alias','😀'.repeat(100));await adapter.setAlias();assert.equal(Array.from(fixture.db.organization.payment_alias).length,100);
  assert.throws(()=>adapter.setDraft('alias','a'.repeat(101)),code('INVALID_DRAFT'));
 });
 test('alias false is not silently treated as success',async()=>{
  const fixture=createProfessionalFixture(),adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,(action,args,scope,run)=>action==='setAlias'?{data:false}:run())});
  await adapter.open();adapter.setDraft('alias','DEMO.ALIAS');await assert.rejects(adapter.setAlias(),code('INVALID_RECEIPT'));
  assert.equal(fixture.db.organization.payment_alias,'PROFESIONAL.DEMO');assert.equal(adapter.snapshot().uncertain,true);
 });
 test('successful alias is not replayed from a receipt after revocation',async()=>{
  const {adapter,fixture}=harness();await adapter.open();adapter.setDraft('alias','DEMO.ALIAS');await adapter.setAlias();
  fixture.db.capability=false;adapter.setDraft('alias','DEMO.ALIAS');await assert.rejects(adapter.setAlias(),code('DENIED'));
  assert.equal(fixture.count.setAlias,2);assert.equal(fixture.db.audit.length,1);
 });
 test('recipes return only a validated projection and empty is a valid denial',async()=>{
  const {adapter,fixture}=await selected();fixture.db.recipes[0].unwanted='NOT CACHED';
  const rows=await adapter.loadRecipes();assert.equal(rows.length,1);assert.equal(rows[0].unwanted,undefined);
  for(const gate of ['recipeSharing','intakeShared','studentLegal','coachLegal']){
   fixture.db[gate]=false;assert.deepEqual(await adapter.loadRecipes(),[]);fixture.db[gate]=true;
  }
 });
 for(const [label,mutate] of [
  ['foreign student',rows=>rows[0].student_id=IDS.outsider],['foreign organization',rows=>rows[0].organization_id=IDS.foreign],
  ['infinite nutrients',rows=>rows[0].totals.k=Infinity],['duplicate id',rows=>rows.push(structuredClone(rows[0]))],
  ['invalid ingredient',rows=>rows[0].ingredients[0].grams=-1],['too many rows',rows=>{while(rows.length<31)rows.push(structuredClone(rows[0]));}]
 ])test('recipe response rejects '+label+' without retaining previous data',async()=>{
  const fixture=createProfessionalFixture();let corrupt=false;
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,
   readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    const result=await run();if(action==='recipes'&&corrupt)mutate(result.data);return result;})});
  await adapter.open();adapter.selectStudent(IDS.pupil);await adapter.loadRecipes();corrupt=true;
  await assert.rejects(adapter.loadRecipes(),code('INVALID_RECIPES'));assert.deepEqual(adapter.snapshot().recipes,[]);
 });
 test('message sender is the actual dual identity, never original mentor',async()=>{
  const {adapter,fixture}=await selected();adapter.setDraft('message','  Mensaje FICTICIO  ');const row=await adapter.sendMessage();
  assert.equal(row.sender_id,IDS.dual);assert.equal(row.coach_id,IDS.dual);assert.equal(row.student_id,IDS.pupil);
  assert.equal(row.body,'Mensaje FICTICIO');assert.equal(adapter.snapshot().messageDraft,'');
  assert.equal(fixture.db.personalMessages[0].coach_id,IDS.mentor);
 });
 test('message response from a foreign pair is rejected in full',async()=>{
  const fixture=createProfessionalFixture();const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    const result=await run();if(action==='messages')result.data[0].coach_id=IDS.mentor;return result;})});
  await adapter.open();adapter.selectStudent(IDS.pupil);await assert.rejects(adapter.loadMessages(),code('INVALID_MESSAGES'));
  assert.deepEqual(adapter.snapshot().messages,[]);
 });
 test('mark-read changes only confirmed incoming IDs, never sender-owned rows',async()=>{
  const {adapter,fixture}=await selected();await adapter.loadMessages();adapter.setDraft('message','Mensaje saliente FICTICIO');const sent=await adapter.sendMessage();
  const receipts=await adapter.markRead();assert.equal(receipts.length,1);assert.equal(receipts[0].id,IDS.message);
  assert.equal(adapter.snapshot().messages.find(row=>row.id===sent.id).read_at,null);
  assert.equal(fixture.db.messages.find(row=>row.id===sent.id).read_at,null);
 });
 test('zero-row read receipt does not mark anything read',async()=>{
  const fixture=createProfessionalFixture(),adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,(action,args,scope,run)=>action==='markRead'?{data:[]}:run())});
  await adapter.open();adapter.selectStudent(IDS.pupil);await adapter.loadMessages();assert.deepEqual(await adapter.markRead(),[]);
  assert.equal(adapter.snapshot().messages[0].read_at,null);
 });
 test('unconfirmed or foreign read receipts fail closed',async()=>{
  const fixture=createProfessionalFixture(),adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,(action,args,scope,run)=>action==='markRead'?{data:[{id:IDS.recipe,read_at:'2026-11-06T14:00:00Z'}]}:run())});
  await adapter.open();adapter.selectStudent(IDS.pupil);await adapter.loadMessages();await assert.rejects(adapter.markRead(),code('INVALID_RECEIPT'));
 });
 test('unsaved drafts block student switch, refresh and close until explicit cancellation',async()=>{
  const {adapter}=await selected();adapter.setDraft('message','Borrador FICTICIO');
  assert.throws(()=>adapter.selectStudent(IDS.second),code('UNSAVED_DRAFT'));
  await assert.rejects(adapter.open(),code('UNSAVED_DRAFT'));assert.throws(()=>adapter.close(),code('UNSAVED_DRAFT'));
  adapter.cancelDrafts();adapter.selectStudent(IDS.second);assert.equal(adapter.snapshot().messageDraft,'');adapter.close();
 });
 for(const [label,change] of [
  ['student switch',({adapter})=>adapter.selectStudent(IDS.second)],
  ['new session',({fixture})=>fixture.session.sessionId='new-synthetic-session'],
  ['same account relogin',({fixture})=>fixture.session.epoch++],
  ['workspace away and back',({fixture})=>{fixture.navigate(false);fixture.navigate(true);}],
  ['explicit dismissal',({adapter})=>adapter.close({discard:true})]
 ])test('late recipes discarded after '+label,async()=>{
  const fixture=createProfessionalFixture(),wait=deferred();
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,
   readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    const result=await run();if(action==='recipes')await wait.promise;return result;})});
  await adapter.open();adapter.selectStudent(IDS.pupil);const result=adapter.loadRecipes();await Promise.resolve();
  change({adapter,fixture});wait.resolve();await assert.rejects(result,code('STALE_CONTEXT'));assert.deepEqual(adapter.snapshot().recipes,[]);
 });
 test('older recipe read cannot replace a newer read for same student',async()=>{
  const fixture=createProfessionalFixture(),wait=deferred();let read=0;
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,
   readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    const result=await run();if(action==='recipes'&&++read===1)await wait.promise;return result;})});
  await adapter.open();adapter.selectStudent(IDS.pupil);const older=adapter.loadRecipes();
  fixture.db.recipes[0].name='Nombre nuevo FICTICIO';await adapter.loadRecipes();wait.resolve();
  await assert.rejects(older,code('STALE_CONTEXT'));assert.equal(adapter.snapshot().recipes[0].name,'Nombre nuevo FICTICIO');
 });
 test('inflight duplicate sends share one operation, conflicting send is blocked',async()=>{
  const fixture=createProfessionalFixture(),wait=deferred();const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    if(action==='sendMessage')await wait.promise;return run();})});
  await adapter.open();adapter.selectStudent(IDS.pupil);adapter.setDraft('message','Mensaje FICTICIO');
  const first=adapter.sendMessage(),second=adapter.sendMessage();assert.equal(first,second);
  adapter.setDraft('message','Cambio FICTICIO');assert.throws(()=>adapter.sendMessage(),code('OPERATION_PENDING'));
  wait.resolve();await first;assert.equal(fixture.count.sendMessage,1);assert.equal(adapter.snapshot().messageDraft,'Cambio FICTICIO');
 });
 test('a send timeout is not automatically retried, even after close and reopen',async()=>{
  const fixture=createProfessionalFixture();let attempts=0;
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,
   readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    if(action==='sendMessage'){attempts++;await run();throw new Error('Synthetic timeout after commit');}return run();})});
  await adapter.open();adapter.selectStudent(IDS.pupil);adapter.setDraft('message','FICTICIO');await assert.rejects(adapter.sendMessage(),/timeout/);
  assert.equal(adapter.snapshot().uncertain,true);assert.throws(()=>adapter.sendMessage(),code('OUTCOME_UNCERTAIN'));
  adapter.close({discard:true});await adapter.open();adapter.selectStudent(IDS.pupil);adapter.setDraft('message','FICTICIO');
  assert.throws(()=>adapter.sendMessage(),code('OUTCOME_UNCERTAIN'));assert.equal(attempts,1);assert.equal(fixture.db.messages.length,2);
 });
 test('pending send survives local close as a guard against accidental duplicate',async()=>{
  const fixture=createProfessionalFixture(),wait=deferred();const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    if(action==='sendMessage')await wait.promise;return run();})});
  await adapter.open();adapter.selectStudent(IDS.pupil);adapter.setDraft('message','FICTICIO');const first=adapter.sendMessage();
  adapter.close({discard:true});await adapter.open();adapter.selectStudent(IDS.pupil);adapter.setDraft('message','OTRO FICTICIO');
  assert.throws(()=>adapter.sendMessage(),code('OPERATION_PENDING'));wait.resolve();await assert.rejects(first,code('STALE_CONTEXT'));
  assert.equal(adapter.snapshot().messageDraft,'OTRO FICTICIO');assert.equal(adapter.snapshot().uncertain,true);
 });
 test('older message read does not erase a newer confirmed send',async()=>{
  const fixture=createProfessionalFixture(),wait=deferred();const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,
   mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    const result=await run();if(action==='messages')await wait.promise;return result;})});
  await adapter.open();adapter.selectStudent(IDS.pupil);const old=adapter.loadMessages();adapter.setDraft('message','NUEVO FICTICIO');
  await adapter.sendMessage();wait.resolve();await assert.rejects(old,code('STALE_CONTEXT'));
  assert.equal(adapter.snapshot().messages[0].body,'NUEVO FICTICIO');
 });
 test('snapshot cannot be used to mutate private state',async()=>{
  const {adapter}=await selected();const view=adapter.snapshot();view.students.length=0;view.organization.payment_alias='INJECTED';
  assert.equal(adapter.snapshot().students.length,2);assert.equal(adapter.snapshot().organization.payment_alias,'PROFESIONAL.DEMO');
 });
 test('disposing prevents callbacks and future actions',async()=>{
  const {adapter}=await selected();adapter.dispose();assert.throws(()=>adapter.snapshot(),code('DISPOSED'));await assert.rejects(adapter.open(),code('DISPOSED'));
 });
 test('detached runtime contains no network, personal storage or role assignment',async()=>{
  const source=await readFile(new URL('../pilot/professional-screens-candidate.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(source,/\.role\s*=(?!=)/);assert.doesNotMatch(source,/efg_personal_recipes/);
 });
 test('ON requires a host-owned mutation guard',async()=>{
  const {adapter}=harness({mutationGuard:undefined});await assert.rejects(adapter.open(),code('HOST_GUARD_REQUIRED'));
 });
 test('host guard retains uncertain send across dispose and new mount',async()=>{
  const fixture=createProfessionalFixture();let attempts=0;
  const options={enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,
   readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,
   transport:wrapped(fixture,async(action,args,scope,run)=>{if(action==='sendMessage'){attempts++;await run();throw Error('Synthetic timeout');}return run();})};
  const first=createProfessionalScreens(options);await first.open();first.selectStudent(IDS.pupil);first.setDraft('message','FICTICIO');
  await assert.rejects(first.sendMessage(),/timeout/);first.dispose();
  const next=createProfessionalScreens(options);await next.open();next.selectStudent(IDS.pupil);next.setDraft('message','FICTICIO');
  assert.throws(()=>next.sendMessage(),code('OUTCOME_UNCERTAIN'));assert.equal(attempts,1);assert.equal(fixture.db.messages.length,2);
 });
 test('host guard retains pending send across dispose and new mount',async()=>{
  const fixture=createProfessionalFixture(),wait=deferred();
  const options={enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,
   readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,
   transport:wrapped(fixture,async(action,args,scope,run)=>{if(action==='sendMessage')await wait.promise;return run();})};
  const first=createProfessionalScreens(options);await first.open();first.selectStudent(IDS.pupil);first.setDraft('message','FICTICIO');
  const pending=first.sendMessage();first.dispose();const next=createProfessionalScreens(options);
  await next.open();next.selectStudent(IDS.pupil);next.setDraft('message','FICTICIO');
  assert.throws(()=>next.sendMessage(),code('OPERATION_PENDING'));wait.resolve();await assert.rejects(pending,code('DISPOSED'));
  assert.equal(fixture.count.sendMessage,1);assert.equal(next.snapshot().uncertain,true);
 });
 test('message read started during send cannot erase the later confirmed message',async()=>{
  const fixture=createProfessionalFixture(),sendGate=deferred(),readGate=deferred(),readCaptured=deferred();
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,
   readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    if(action==='sendMessage')await sendGate.promise;
    const result=await run();if(action==='messages'){readCaptured.resolve();await readGate.promise;}return result;
   })});
  await adapter.open();adapter.selectStudent(IDS.pupil);adapter.setDraft('message','NUEVO FICTICIO');const sending=adapter.sendMessage();
  const reading=adapter.loadMessages();await readCaptured.promise;sendGate.resolve();await sending;readGate.resolve();
  await assert.rejects(reading,code('STALE_CONTEXT'));assert.equal(adapter.snapshot().messages[0].body,'NUEVO FICTICIO');
 });
 test('message read started during markRead cannot undo a confirmed receipt',async()=>{
  const fixture=createProfessionalFixture(),markGate=deferred(),readGate=deferred(),readCaptured=deferred();let delayRead=false;
  const adapter=createProfessionalScreens({enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,
   readSession:fixture.readSession,readWorkspace:fixture.readWorkspace,transport:wrapped(fixture,async(action,args,scope,run)=>{
    if(action==='markRead')await markGate.promise;
    const result=await run();if(action==='messages'&&delayRead){readCaptured.resolve();await readGate.promise;}return result;
   })});
  await adapter.open();adapter.selectStudent(IDS.pupil);await adapter.loadMessages();const marking=adapter.markRead();
  delayRead=true;const reading=adapter.loadMessages();await readCaptured.promise;markGate.resolve();await marking;readGate.resolve();
  await assert.rejects(reading,code('STALE_CONTEXT'));
  assert.ok(fixture.db.messages[0].read_at);assert.equal(adapter.snapshot().messages.length,1);assert.ok(adapter.snapshot().messages[0].read_at);
 });
