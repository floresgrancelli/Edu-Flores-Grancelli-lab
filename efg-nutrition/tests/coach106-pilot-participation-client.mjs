// COACH106: real adapter contract with fake Supabase, NOT hosted JWT A/B.
import assert from 'node:assert/strict';
import {acceptPilotParticipation,loadPilotParticipationReceipt,revokePilotParticipation} from '../pilot/pilot-participation-client.js';
import {PILOT_PARTICIPATION_VERSION as version} from '../pilot/pilot-participation-demo.js';
const studentA='11111111-1111-4111-8111-111111111111';
const studentB='22222222-2222-4222-8222-222222222222';
const org='33333333-3333-4333-8333-333333333333';
let principal=studentA,receipt=null,acceptCalls=0,revokeCalls=0;
const sb={
 auth:{async getUser(){return {data:{user:{id:principal}},error:null}}},
 from(table){
  assert.equal(table,'efg_pilot_participation_receipts');
  const chain={select(){return chain},eq(){return chain},
   async maybeSingle(){return {data:receipt,error:null}}};return chain;
 },
 async rpc(method,params){
  if(method==='efg_accept_pilot_participation'){
   acceptCalls++;
   assert.equal(typeof params.p_sharing,'boolean');
   assert.deepEqual(params,{p_version:version,p_participation:true,p_sharing:params.p_sharing});
   receipt={student_id:studentA,organization_id:org,version,
    participation_accepted:true,sharing_accepted:params.p_sharing,
    acceptance_method:'two_explicit_checkboxes',accepted_at:'2026-10-30T21:10:00Z',
    revoked_at:null,updated_at:'2026-10-30T21:10:00Z'};
   return {data:receipt.accepted_at,error:null};
  }
  if(method==='efg_revoke_pilot_participation'){
   revokeCalls++; assert.deepEqual(params,{p_version:version});
   receipt={...receipt,revoked_at:'2026-10-30T21:11:00Z'};
   return {data:true,error:null};
  }
  throw Error('Unexpected RPC');
 }
};
const choice={version,participationRequested:true,sharingRequested:true,persisted:false,legalAcceptance:false};
await assert.rejects(acceptPilotParticipation(sb,choice),/clic explícito/);
await assert.rejects(acceptPilotParticipation(sb,{...choice,sharingRequested:null},{explicitSubmit:true}),/dos autorizaciones/);
assert.equal(acceptCalls,0,'Unchecked or automatic accept must never send RPC');
assert.equal((await loadPilotParticipationReceipt(sb)).accepted,false);
const privateChoice={...choice,sharingRequested:false};
const privateOk=await acceptPilotParticipation(sb,privateChoice,{explicitSubmit:true});
assert.equal(privateOk.accepted,true);
assert.equal(privateOk.sharingAccepted,false);
assert.equal((await loadPilotParticipationReceipt(sb)).participation.sharing_accepted,false);
const ok=await acceptPilotParticipation(sb,choice,{explicitSubmit:true});
assert.equal(ok.accepted,true);
assert.equal(ok.healthConsent,false);
assert.equal(ok.legalAcceptance,false);
assert.equal(acceptCalls,2);
const loaded=await loadPilotParticipationReceipt(sb,{expectedOrganizationId:org});
await assert.rejects(loadPilotParticipationReceipt(sb,{expectedOrganizationId:studentB}),/otra organización/);
assert.equal(loaded.accepted,true);
assert.equal(loaded.participation.user_id,studentA);
principal=studentB;
await assert.rejects(loadPilotParticipationReceipt(sb),/otra cuenta/);
principal=studentA;
await assert.rejects(revokePilotParticipation(sb),/confirmación expresa/);
assert.equal(revokeCalls,0);
const stopped=await revokePilotParticipation(sb,{explicitSubmit:true});
assert.equal(stopped.accepted,false);
assert.equal(stopped.revoked,true);
assert.equal((await loadPilotParticipationReceipt(sb)).accepted,false);
assert.equal(revokeCalls,1);
console.log('PASS COACH106: signed independent private/share decisions, owner readback, revocation; hosted staging still required.');
