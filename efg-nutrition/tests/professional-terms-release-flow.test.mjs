import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {createProfessionalTermsReleaseFlow} from '../pilot/professional-terms-release-flow.mjs';
import {createProfessionalTermsJournal} from '../pilot/professional-terms-journal.mjs';
import {professionalTermsBindingSha256} from '../pilot/professional-terms-validation.mjs';
import {fakeIDB} from './professional-terms-test-support.mjs';
const v=JSON.parse(readFileSync(new URL('./professional-terms-v2-fixture-vector.json',import.meta.url)));
function fixture(){
 const state={bundle:structuredClone(v.bundle),calls:[],receipts:new Map(),lost:false,active:true};
 const context={userId:v.bundle.actor_id,sessionId:'73000000-0000-4000-8000-000000000001',organizationId:v.bundle.organization_id,active:true};
 const transport={kind:'ncc-professional-terms-v2-sdk-candidate',async rpc(name,args){state.calls.push([name,args]);if(name.includes('legal_bundle'))return {data:structuredClone(state.bundle)};
 if(name.includes('accept_terms')){const result={contract_version:2,actor_id:context.userId,organization_id:context.organizationId,request_id:args.p_request_id,legal_ready:true,legal_binding_sha256:args.p_expected_binding_sha256};state.receipts.set(args.p_request_id,{operation:'acceptTerms',payload:{p_org:args.p_org,p_expected_binding_sha256:args.p_expected_binding_sha256},result});if(state.lost)throw Error('Lost response');return {data:result};}
 return {data:state.receipts.get(args.p_request_id)||null};}};
 const db=fakeIDB(),journal=createProfessionalTermsJournal(db);
 const make=()=>createProfessionalTermsReleaseFlow({enabled:true,backendOrigin:'https://ncc.example.com',transport,readContext:()=>state.active?context:null,journal,crypto:webcrypto});
 return {state,context,transport,make,db};
}
test('release acceptance OFF is no-I/O',async()=>{const f=createProfessionalTermsReleaseFlow();assert.equal(f.snapshot().status,'disabled');await assert.rejects(f.open(),/FEATURE_DISABLED/);});
test('release accepts exact displayed documents with two explicit checks and attributed receipt',async()=>{const f=fixture(),flow=f.make();await flow.open();await assert.rejects(flow.accept(),/EXPLICIT_ACCEPTANCE_REQUIRED/);flow.setSelection('terms',true);flow.setSelection('privacy',true);const r=await flow.accept();assert.equal(r.accepted,true);const dispatched=f.state.calls.find(([n])=>n.includes('accept_terms'));assert.equal(dispatched[1].p_expected_binding_sha256,v.bundle.binding_sha256);assert.equal(f.state.calls.some(([n])=>n.includes('_v1')&&!n.includes('receipt')),false);});
test('reload discovers uncertain request and reconciles without resend',async()=>{const f=fixture(),one=f.make();await one.open();one.setSelection('terms',true);one.setSelection('privacy',true);f.state.lost=true;await assert.rejects(one.accept(),e=>e.outcome==='uncertain');one.dispose();const two=f.make();assert.equal((await two.open()).status,'uncertain');assert.equal((await two.reconcile()).accepted,true);assert.equal(f.state.calls.filter(([n])=>n.includes('accept_terms')).length,1);});
test('receipt for different hash remains uncertain after reload',async()=>{const f=fixture(),flow=f.make();await flow.open();flow.setSelection('terms',true);flow.setSelection('privacy',true);f.state.lost=true;await assert.rejects(flow.accept());const r=[...f.state.receipts.values()][0];r.result.legal_binding_sha256='0'.repeat(64);await assert.rejects(flow.reconcile(),/INVALID_LEGAL_RECEIPT/);assert.equal(flow.snapshot().pending.state,'uncertain');});
test('changed SDK CAS wire error preserves durable reservation and clears checks',async()=>{const f=fixture(),original=f.transport.rpc;f.transport.rpc=async(n,a)=>{if(n.includes('accept_terms'))throw Object.assign(Error('changed'),{code:'22023',serverMessage:'NCC_LEGAL_BINDING_CHANGED'});return original(n,a);};const flow=f.make();await flow.open();flow.setSelection('terms',true);flow.setSelection('privacy',true);await assert.rejects(flow.accept(),e=>e.code==='LEGAL_BINDING_CHANGED'&&e.outcome==='uncertain');assert.deepEqual(flow.snapshot().checked,{terms:false,privacy:false});assert.equal(flow.snapshot().pending.state,'uncertain');});
test('corrupt body rejected before consent controls or request',async()=>{const f=fixture();f.state.bundle.documents[0].body+=' modified';await assert.rejects(f.make().open(),/LEGAL_BODY_HASH_MISMATCH/);assert.equal(f.state.calls.length,1);});
test('new current bundle does not silently reuse consent',async()=>{const f=fixture(),flow=f.make();await flow.open();flow.setSelection('terms',true);flow.setSelection('privacy',true);f.state.bundle.documents[0].version+='2';f.state.bundle.binding_sha256=await professionalTermsBindingSha256(f.state.bundle,webcrypto);const snapshot=await flow.open();assert.deepEqual(snapshot.checked,{terms:false,privacy:false});assert.equal(snapshot.canAccept,false);});
test('session change during response never returns previous view',async()=>{const f=fixture(),old=f.transport.rpc;f.transport.rpc=async(...a)=>{const r=await old(...a);f.context.sessionId='74000000-0000-4000-8000-000000000001';return r;};await assert.rejects(f.make().open(),/STALE_CONTEXT/);});
