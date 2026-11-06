import test from 'node:test';
import assert from 'node:assert/strict';
import {API, createDualWorkspaceClient, occupancy, seatLimit} from '../pilot/dual-workspace-candidate.mjs';
import {createSyntheticService, seed} from './dual-workspace-fixture.mjs';
let sequence = 0;
function harness(userId='admin', service=createSyntheticService(), overrides={}) {
  let session={userId,sessionId:'session-'+userId};
  const client=createDualWorkspaceClient({enabled:true, rpc:(n,a)=>service.call(session.userId,n,a),
    readSession:()=>session, requestId:()=> 'request-'+(++sequence), ...overrides});
  return {client,service,session:value=>{session=value;}};
}
const request=(email='learner@example.invalid',seats=3)=>({email,name:'Coach DEMO',seats});
const pause=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function enable(h,seats=3) {
 await h.client.refresh();const result=await h.client.createPilot(request(undefined,seats));
 await h.service.call('learner',API.acceptTerms,{p_org:result.organization_id,p_terms_version:'synthetic-terms-v1',p_privacy_version:'synthetic-privacy-v1',p_request_id:'terms-'+(++sequence)});
 return result;
}

test('default OFF performs no RPC',async()=>{
  let calls=0;
  const c=createDualWorkspaceClient({readSession:()=>({userId:'admin',sessionId:'x'}),rpc:()=>{calls++;}});
  await assert.rejects(c.refresh(),{code:'FEATURE_DISABLED'});
  assert.equal(calls,0);
});
test('seat validation rejects coercions, fractions and bounds',()=>{
  for(const x of [null,undefined,true,false,{},[],0,-1,10001,1.2,NaN,Infinity,'','  ','1.2','1e2','0x10'])
    assert.throws(()=>seatLimit(x),{code:'INVALID_SEATS'});
  assert.equal(seatLimit(' 12 '),12);assert.equal(seatLimit(1),1);assert.equal(seatLimit(10000),10000);
});
test('existing student gains independent pilot, original relationship/history unchanged',async()=>{
  const h=harness();const before=h.service.inspect();const result=await enable(h,7);const after=h.service.inspect();
  assert.equal(result.seat_limit,7);assert.equal(result.student_link_preserved,true);
  assert.deepEqual(after.profiles,before.profiles);assert.deepEqual(after.consents,before.consents);assert.deepEqual(after.history,before.history);
  assert.equal(h.service.canReadStudent('mentor','learner'),true);
  assert.equal(h.service.canReadStudent('learner','other-student'),false);
  assert.equal(h.service.canReadStudent('admin','learner'),false);
  const learner=harness('learner',h.service);const state=await learner.client.refresh();
  assert.equal(state.contexts.profile_role,'student');assert.equal(state.contexts.student_context.organization_id,'original');
  assert.equal(state.choices.length,2);assert.equal(state.selected,'student');
  learner.client.select('coach:'+result.organization_id);learner.client.select('student');
  assert.deepEqual(h.service.inspect().profiles,before.profiles);
});
test('new pilot creates pending invitation, never a new auth account nor email send',async()=>{
  const h=harness();await h.client.refresh();const before=h.service.inspect().profiles;
  const r=await h.client.createPilot(request('new-coach@example.invalid',22));const db=h.service.inspect();
  assert.equal(r.state,'pending_verified_account');assert.equal(db.pendingCoaches.length,1);
  assert.deepEqual(db.profiles,before);assert.equal(db.organizations.find(o=>o.id===r.organization_id).coach_id,null);
});
test('inactive/unverified/admin/existing owner targets rejected atomically',async()=>{
  for(const target of ['admin@example.invalid','mentor@example.invalid']) {
    const h=harness();await h.client.refresh();const before=h.service.inspect();
    await assert.rejects(h.client.createPilot(request(target)));assert.deepEqual(h.service.inspect(),before);
  }
  for(const field of ['active','confirmed']) {
    const h=harness();h.service.arrange(db=>{db.profiles.find(p=>p.user_id==='learner')[field]=false;});
    await h.client.refresh();const before=h.service.inspect();await assert.rejects(h.client.createPilot(request()));
    assert.deepEqual(h.service.inspect(),before);
  }
});
test('no privilege from payload, UI tamper, foreign org or anonymous actor',async()=>{
  const h=harness();const r=await enable(h);const learner=harness('learner',h.service);await learner.client.refresh();
  assert.throws(()=>learner.client.createPilot(request('new@example.invalid')),{code:'ADMIN_REQUIRED'});
  await assert.rejects(h.service.call('learner',API.create,{p_email:'new@example.invalid',p_name:'Fake',p_seats:2,p_request_id:'forged',role:'admin'}),{code:'ADMIN_REQUIRED'});
  await assert.rejects(h.service.call('other',API.invite,{p_org:r.organization_id,p_email:'x@example.invalid',p_name:'Fake',p_request_id:'foreign'}),{code:'DENIED'});
  await assert.rejects(h.service.call(null,API.contexts,{}),{code:'DENIED'});
  assert.throws(()=>learner.client.select('coach:other-org'),{code:'WRONG_WORKSPACE'});
  assert.throws(()=>learner.client.inviteStudent({email:'x@example.invalid',name:'Alumno DEMO'}),{code:'WRONG_WORKSPACE'});
});
test('quota includes active students and pending, excludes inactive and revoked',()=>{
  assert.deepEqual(occupancy([{organization_id:'x',role:'student',active:true},
    {organization_id:'x',role:'student',active:false},{organization_id:'y',role:'student',active:true}],
    [{organization_id:'x',role:'student'},{organization_id:'x',role:'student',claimed_by:'a'},
     {organization_id:'x',role:'student',revoked_at:'now'}],'x'),{active:1,pending:1,used:2});
});
test('synthetic transaction queue allows exactly one of two last-seat requests',async()=>{
  const h=harness();const r=await enable(h,1);
  const run=(n)=>h.service.call('learner',API.invite,{p_org:r.organization_id,p_email:`pupil-${n}@example.invalid`,p_name:'Alumno DEMO',p_request_id:'seat-'+n});
  const results=await Promise.allSettled([run(1),run(2)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'SEAT_LIMIT_REACHED');
  assert.equal(h.service.inspect().invitations.length,1);
});
test('admin cannot lower occupied quota; can edit other candidate pilot',async()=>{
  const h=harness();const r=await enable(h,3);
  for(let n=0;n<2;n++)await h.service.call('learner',API.invite,{p_org:r.organization_id,p_email:`student-${n}@example.invalid`,p_name:'Alumno DEMO',p_request_id:'occupy-'+n});
  await assert.rejects(h.client.setSeats({organizationId:r.organization_id,seats:1}),{code:'SEATS_OCCUPIED'});
  const out=await h.client.setSeats({organizationId:r.organization_id,seats:2});assert.equal(out.seat_limit,2);
});
test('server receipt is scoped by actor and rejects ID reuse with different content',async()=>{
  const h=harness();const input={p_email:'learner@example.invalid',p_name:'Coach DEMO',p_seats:2,p_request_id:'idem'};
  const a=await h.service.call('admin',API.create,input),b=await h.service.call('admin',API.create,input);
  assert.deepEqual(a,b);assert.equal(h.service.inspect().capabilities.length,1);
  await assert.rejects(h.service.call('admin',API.create,{...input,p_seats:3}),{code:'IDEMPOTENCY_CONFLICT'});
  assert.equal((await h.service.call('other',API.receipt,{p_request_id:'idem'})).data,null);
});
test('double submit shares operation and creates exactly one capability',async()=>{
  const service=createSyntheticService(),gate=pause();
  const h=harness('admin',service,{rpc:async(n,a)=>{if(n===API.create)await gate.promise;return service.call('admin',n,a);}});
  await h.client.refresh();const a=h.client.createPilot(request()),b=h.client.createPilot(request());gate.resolve();
  assert.deepEqual(await a,await b);assert.equal(service.count[API.create],1);
});
test('lost response retains ID; retry checks receipt without sending a second creation',async()=>{
  const service=createSyntheticService();let failOnce=true;
  const h=harness('admin',service,{rpc:async(n,a)=>{const r=await service.call('admin',n,a);
    if(n===API.create&&failOnce){failOnce=false;throw Error('Lost response');}return r;}});
  await h.client.refresh();await assert.rejects(h.client.createPilot(request()),/Lost response/);
  await assert.rejects(h.client.createPilot(request(undefined,6)),{code:'RESOLVE_PENDING'});
  const out=await h.client.createPilot(request());assert.equal(out.state,'enabled_existing');
  assert.equal(service.count[API.create],1);assert.equal(service.count[API.receipt],1);
});
test('transport failure before mutation checks receipt then retries same ID',async()=>{
  const service=createSyntheticService();let failOnce=true;const ids=[];
  const h=harness('admin',service,{rpc:async(n,a)=>{if(n===API.create){ids.push(a.p_request_id);
    if(failOnce){failOnce=false;throw Error('Before request');}}return service.call('admin',n,a);}});
  await h.client.refresh();await assert.rejects(h.client.createPilot(request()));await h.client.createPilot(request());
  assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(service.inspect().capabilities.length,1);
});
test('session change rejects late data and clears selected context',async()=>{
  const service=createSyntheticService(),gate=pause();let slow=false;
  const h=harness('admin',service,{rpc:async(n,a)=>{const r=await service.call('admin',n,a);if(slow)await gate.promise;return r;}});
  await h.client.refresh();slow=true;const pending=h.client.refresh();
  h.session({userId:'other',sessionId:'new-session'});gate.resolve();
  await assert.rejects(pending,{code:'STALE_CONTEXT'});
  assert.equal(h.client.snapshot().contexts,null);assert.equal(h.client.snapshot().selected,null);
});
test('latest refresh wins; forged server context fails closed',async()=>{
  const service=createSyntheticService(),gate=pause();let calls=0;
  const h=harness('admin',service,{rpc:async(n,a)=>{const r=await service.call('admin',n,a);if(++calls===1)await gate.promise;return r;}});
  const first=h.client.refresh();await h.client.refresh();gate.resolve();await assert.rejects(first,{code:'STALE_CONTEXT'});
  const bad=harness('admin',service,{rpc:async()=>({data:{user_id:'learner',active:true,profile_role:'admin',coach_contexts:[]}})});
  await assert.rejects(bad.client.refresh(),{code:'INVALID_CONTEXT'});
  const missing=harness('learner',service,{rpc:async()=>({data:{user_id:'learner',active:true,profile_role:'student',student_context:null,coach_contexts:[]}})});
  await assert.rejects(missing.client.refresh(),{code:'INVALID_CONTEXT'});
});
test('revocation or pilot suspension keeps original student relationship but removes coach access',async()=>{
  const h=harness();const r=await enable(h);const learner=harness('learner',h.service);await learner.client.refresh();
  learner.client.select('coach:'+r.organization_id);
  h.service.arrange(db=>{db.organizations.find(o=>o.id===r.organization_id).status='suspended';});
  const state=await learner.client.refresh();assert.equal(state.selected,'student');assert.equal(state.contexts.coach_contexts.length,0);
  assert.equal(h.service.canReadStudent('mentor','learner'),true);
  h.service.arrange(db=>{db.consents.find(c=>c.student_id==='learner').accepted=false;});
  assert.equal(h.service.canReadStudent('mentor','learner'),false);
  assert.equal(h.service.canReadStudent('learner','learner'),true);
});
test('fixture refuses real emails and transactional error changes nothing',async()=>{
  const h=harness();await h.client.refresh();const before=h.service.inspect();
  await assert.rejects(h.client.createPilot(request('someone@real-domain.com')),{code:'SYNTHETIC_ONLY'});
  assert.deepEqual(h.service.inspect(),before);
});
test('new coach can claim only matching verified identity, idempotently',async()=>{
 const h=harness();await h.client.refresh();const invite=await h.client.createPilot(request('new-coach@example.invalid',9));
 h.service.arrange(db=>db.accounts.push({user_id:'new-coach',email:'new-coach@example.invalid',confirmed:true}));
 const coach=harness('new-coach',h.service);const result=await coach.client.claimPilot();
 assert.equal(result.organization_id,invite.organization_id);assert.equal(result.seat_limit,9);
 const again=await coach.client.claimPilot();assert.deepEqual(result,again);
 assert.equal(h.service.inspect().profiles.filter(p=>p.user_id==='new-coach').length,1);
 assert.equal(h.service.inspect().capabilities.filter(p=>p.user_id==='new-coach').length,1);
 const context=await coach.client.refresh();assert.equal(context.contexts.profile_role,'coach');
 assert.equal(context.contexts.coach_contexts.length,1);
});
test('claim rejects wrong/unverified identity and revoked invitation with no side effects',async()=>{
 const h=harness();await h.client.refresh();await h.client.createPilot(request('pending@example.invalid'));
 h.service.arrange(db=>db.accounts.push({user_id:'pending',email:'pending@example.invalid',confirmed:false}));
 let before=h.service.inspect();const candidate=harness('pending',h.service);
 await assert.rejects(candidate.client.claimPilot(),{code:'DENIED'});assert.deepEqual(h.service.inspect(),before);
 const wrong=harness('other',h.service);await assert.rejects(wrong.client.claimPilot(),{code:'NO_INVITATION'});
 h.service.arrange(db=>{db.accounts.find(a=>a.user_id==='pending').confirmed=true;db.pendingCoaches[0].revoked_at='now';});
 before=h.service.inspect();await assert.rejects(candidate.client.claimPilot(),{code:'NO_INVITATION'});assert.deepEqual(h.service.inspect(),before);
});
test('account that became a student before claiming keeps student role and organization',async()=>{
 const h=harness();await h.client.refresh();await h.client.createPilot(request('pending@example.invalid',4));
 h.service.arrange(db=>{db.accounts.push({user_id:'pending',email:'pending@example.invalid',confirmed:true});
  db.profiles.push({user_id:'pending',email:'pending@example.invalid',nickname:'Alumno DEMO',role:'student',organization_id:'original',active:true,confirmed:true});
  db.consents.push({student_id:'pending',organization_id:'original',accepted:true});});
 const before=h.service.inspect();const student=harness('pending',h.service);const result=await student.client.claimPilot();
 assert.equal(result.student_link_preserved,true);assert.deepEqual(h.service.inspect().profiles,before.profiles);
 assert.deepEqual(h.service.inspect().consents,before.consents);assert.equal(h.service.canReadStudent('mentor','pending'),true);
});
test('revoked capability cannot invite from a previously selected context or reclaim itself',async()=>{
 const h=harness();const r=await enable(h);const student=harness('learner',h.service);await student.client.refresh();
 student.client.select('coach:'+r.organization_id);h.service.arrange(db=>{db.capabilities[0].active=false;});
 await assert.rejects(student.client.inviteStudent({email:'late@example.invalid',name:'Alumno DEMO'}),{code:'DENIED'});
 assert.equal(h.service.inspect().invitations.length,0);assert.equal(h.service.canReadStudent('mentor','learner'),true);
});
