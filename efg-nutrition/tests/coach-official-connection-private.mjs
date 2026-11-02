import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareGuideIntake,createGuideIntakeSource} from '../pilot/coach-guide-intake-adapter.js';
import {createOfficialTestProvider} from './coach-official-provider-private.mjs';
import {scope as original} from './coach-guide-intake-fixture.mjs';
const result=JSON.parse(readFileSync(process.argv[2],'utf8'));
assert.equal(result.status,'PASS_OFFICIAL_NINE_PRIVATE_SCENARIO');
const input=result.qaInput;assert.equal(input.catalog.length,9);
let scope=structuredClone(original);
const p=createOfficialTestProvider(()=>scope,input),s=()=>p.currentScope();
let prepared=prepareGuideIntake(await p.readBundle(s()),s());
assert.deepEqual(prepared.context.restrictions,[]);
assert.equal(prepared.provenance.foodEvidence,'official_capture_private_replay');
assert.equal(prepared.provenance.publishable,false);
p.setExplicit(false);
let pending=await p.readBundle(s());assert.throws(()=>prepareGuideIntake(pending,s()),e=>e.code==='unknown_declaration');
p.setCeliac(true);pending=await p.readBundle(s());assert.throws(()=>prepareGuideIntake(pending,s()),e=>e.code==='no_candidates');
p.reset();pending=await p.readBundle(s());pending.health.data.restriction_declaration.source_revision=2;
assert.throws(()=>prepareGuideIntake(pending,s()),e=>e.code==='unknown_declaration');
pending=await p.readBundle(s());pending.general.data.restriction_declaration={kind:'none_declared'};
assert.throws(()=>prepareGuideIntake(pending,s()),e=>e.code==='general_channel');
for(const [mutate,code] of [
 [b=>b.health.data.processing_consent=false,'unknown_declaration'],
 [b=>b.health.data.restriction_declaration.confirmed_at='invalid','unknown_declaration'],
 [b=>b.health.data.restriction_declaration.confirmed_at=new Date(b.now+1).toISOString(),'unknown_declaration'],
 [b=>b.health.binding.organizationId='other-org','scope_mismatch'],
 [b=>b.catalog.data.foods[0].composition.verificationScope='CLIENT_VERIFIED','evidence_missing']
]){
 const b=structuredClone(await p.readBundle(s()));mutate(b);
 assert.throws(()=>prepareGuideIntake(b,s()),e=>e.code===code);
}
const source=createGuideIntakeSource({readScope:s,readBundle:x=>p.readBundle(x)}),unsubscribe=p.subscribe(()=>source.invalidate());
await source.load();source.assertCurrent();p.revoke();assert.throws(()=>source.assertCurrent(),e=>e.code==='stale');
p.reset();p.hold();const opening=source.load();scope={...scope,studentId:'student-b',consentStudentId:'student-b'};p.changeStudent();p.release();
await assert.rejects(opening,e=>e.code==='stale');unsubscribe();
console.log('PASS official composition -> explicit separate declaration -> five-meal proposal; missing/stale declaration, clinical unknown, general-channel leak, revocation and late student switch rejected. PRIVATE ONLY.');
