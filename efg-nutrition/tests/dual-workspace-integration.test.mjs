import test from 'node:test';
import assert from 'node:assert/strict';
import {API,createDualWorkspaceClient} from '../pilot/dual-workspace-candidate.mjs';
import {createWorkspaceGateway} from '../pilot/dual-workspace-integration.mjs';
import {mountDualWorkspacePanel} from '../pilot/dual-workspace-panel.mjs';
import {createSyntheticService} from './dual-workspace-fixture.mjs';
let sequence=0;
test('integration panel is inert by default without reading DOM/session or calling RPC',async()=>{
 const forbidden=()=>{throw Error('Disabled panel accessed a resource');};
 const panel=mountDualWorkspacePanel({rpc:forbidden,readSession:forbidden,readLegacyPersonal:forbidden,
   get root(){return null;}});
 assert.deepEqual(await panel.ready,{disabled:true});panel.dispose();
});
const next=()=>`r2-${++sequence}`;
async function fixture(){
 const service=createSyntheticService();
 const org=(await service.call('admin',API.create,{p_email:'learner@example.invalid',p_name:'Coach DEMO',p_seats:3,p_request_id:next()})).data;
 const client=createDualWorkspaceClient({enabled:true,readSession:()=>({userId:'learner',sessionId:'session'}),requestId:next,rpc:(n,a)=>service.call('learner',n,a)});
 const legacy={profile:structuredClone(service.inspect().profiles.find(p=>p.user_id==='learner')),organization:{id:'original'}};
 let dirty=false;const gateway=createWorkspaceGateway({client,readLegacyPersonal:()=>legacy,hasUnsavedDraft:()=>dirty});
 await gateway.refresh();return {service,client,legacy,gateway,org:org.organization_id,dirty:v=>{dirty=v;}};
}
async function legal(h){h.gateway.enter('coach:'+h.org);await h.client.acceptSyntheticTerms({accepted:true,termsVersion:'synthetic-terms-v1',privacyVersion:'synthetic-privacy-v1'});await h.gateway.refresh();}
test('new dual coach does not inherit personal legal/consent acceptance',async()=>{
 const h=await fixture();h.gateway.enter('coach:'+h.org);
 assert.equal(h.gateway.view().professionalState,'professional_terms');
 assert.throws(()=>h.client.inviteStudent({email:'pupil@example.invalid',name:'Alumno DEMO'}),{code:'PROFESSIONAL_TERMS_REQUIRED'});
 await assert.rejects(h.service.call('learner',API.invite,{p_org:h.org,p_email:'bypass@example.invalid',p_name:'Alumno DEMO',p_request_id:next()}),{code:'PROFESSIONAL_TERMS_REQUIRED'});
 assert.equal(h.service.inspect().invitations.length,0);
 h.service.arrange(db=>{db.profiles.push({user_id:'own-pupil',nickname:'Ficticio',email:'own-pupil@example.invalid',role:'student',organization_id:h.org,active:true});db.consents.push({student_id:'own-pupil',organization_id:h.org,accepted:true});});
 assert.equal(h.service.canReadStudent('learner','own-pupil'),false);
});
test('terms require explicit owner acceptance of both current synthetic versions',async()=>{
 const h=await fixture();h.gateway.enter('coach:'+h.org);
 for(const args of [{accepted:false,termsVersion:'synthetic-terms-v1',privacyVersion:'synthetic-privacy-v1'},
  {accepted:true,termsVersion:'old',privacyVersion:'synthetic-privacy-v1'}])assert.throws(()=>h.client.acceptSyntheticTerms(args),{code:'EXPLICIT_ACCEPTANCE_REQUIRED'});
 await assert.rejects(h.service.call('admin',API.acceptTerms,{p_org:h.org,p_terms_version:'synthetic-terms-v1',p_privacy_version:'synthetic-privacy-v1',p_request_id:next()}),{code:'DENIED'});
 const personalBefore=structuredClone(h.legacy);await legal(h);
 assert.equal(h.gateway.view().professionalState,'candidate_roster');assert.deepEqual(h.legacy,personalBefore);
});
test('changing spaces preserves original profile/org and protects unsaved personal draft',async()=>{
 const h=await fixture(),before=structuredClone(h.legacy);h.dirty(true);
 assert.throws(()=>h.gateway.enter('coach:'+h.org),{code:'UNSAVED_PERSONAL_DRAFT'});
 assert.equal(h.gateway.view().selected,'student');h.dirty(false);
 for(let n=0;n<3;n++){h.gateway.enter('coach:'+h.org);h.gateway.enter('student');}
 assert.deepEqual(h.legacy,before);assert.equal(h.legacy.profile.role,'student');
});
test('legacy personal mismatch fails closed rather than switching profile role',async()=>{
 const h=await fixture();h.legacy.organization.id='foreign';
 assert.throws(()=>h.gateway.enter('coach:'+h.org),{code:'LEGACY_CONTEXT_MISMATCH'});
 assert.equal(h.legacy.profile.role,'student');
});
test('professional roster contains metadata only; unrelated or health fields are rejected',async()=>{
 const h=await fixture();await legal(h);
 h.service.arrange(db=>{db.profiles.push({user_id:'pupil',nickname:'Alumno DEMO',email:'pupil@example.invalid',role:'student',organization_id:h.org,active:true,confirmed:true});db.consents.push({student_id:'pupil',organization_id:h.org,accepted:false});});
 const rows=await h.gateway.roster();assert.equal(rows.length,1);assert.equal(rows[0].consent_accepted,false);
 assert.deepEqual(Object.keys(rows[0]).sort(),['active','consent_accepted','nickname','organization_id','user_id']);
 assert.throws(()=>h.gateway.privateStudentData('pupil'),{code:'PROFESSIONAL_DATA_NOT_INTEGRATED'});
 h.gateway.enter('student');assert.equal(h.gateway.view().roster,null);
 const bad=createDualWorkspaceClient({enabled:true,readSession:()=>({userId:'learner',sessionId:'x'}),rpc:async(n,a)=>n===API.roster?{data:[{...rows[0],health:'must not appear'}]}:h.service.call('learner',n,a)});
 await bad.refresh();bad.select('coach:'+h.org);await assert.rejects(bad.roster(),{code:'INVALID_ROSTER'});
});
test('response after workspace switch cannot repaint personal scope or lose receipt',async()=>{
 const h=await fixture();await legal(h);let resolve;const gate=new Promise(r=>{resolve=r;});
 const client=createDualWorkspaceClient({enabled:true,readSession:()=>({userId:'learner',sessionId:'late'}),requestId:next,
  rpc:async(n,a)=>{const result=await h.service.call('learner',n,a);if(n===API.invite)await gate;return result;}});
 await client.refresh();client.select('coach:'+h.org);const pending=client.inviteStudent({email:'late@example.invalid',name:'Alumno DEMO'});
 client.select('student');resolve();await assert.rejects(pending,{code:'STALE_WORKSPACE'});
 assert.equal(client.snapshot().selected,'student');assert.equal(h.service.inspect().invitations.length,1);
 client.select('coach:'+h.org);const replay=await client.inviteStudent({email:'late@example.invalid',name:'Alumno DEMO'});
 assert.equal(replay.organization_id,h.org);assert.equal(h.service.inspect().invitations.length,1);
});
test('revoked legal version blocks direct service use and keeps personal mentor access',async()=>{
 const h=await fixture();await legal(h);
 h.service.arrange(db=>{db.capabilities[0].privacy_version='retired';});
 await assert.rejects(h.client.roster(),{code:'PROFESSIONAL_TERMS_REQUIRED'});
 assert.equal(h.service.canReadStudent('mentor','learner'),true);
});
test('late receipt also respects workspace boundary and never repeats confirmed invitation',async()=>{
 const h=await fixture();await legal(h);let lost=true,delayReceipt=false,resolve;
 const gate=new Promise(r=>{resolve=r;});
 const client=createDualWorkspaceClient({enabled:true,readSession:()=>({userId:'learner',sessionId:'receipt'}),requestId:next,
  rpc:async(n,a)=>{const result=await h.service.call('learner',n,a);
   if(n===API.invite&&lost){lost=false;throw Error('Lost response');}
   if(n===API.receipt&&delayReceipt)await gate;return result;}});
 await client.refresh();client.select('coach:'+h.org);const input={email:'receipt@example.invalid',name:'Alumno DEMO'};
 await assert.rejects(client.inviteStudent(input),/Lost response/);delayReceipt=true;
 const waiting=client.inviteStudent(input);client.select('student');resolve();
 await assert.rejects(waiting,{code:'STALE_WORKSPACE'});assert.equal(h.service.inspect().invitations.length,1);
 client.select('coach:'+h.org);await client.inviteStudent(input);assert.equal(h.service.inspect().invitations.length,1);
});
