// NOT EXECUTED. Transport-only TEST_ONLY race tests, not server authorization proof.
import assert from 'node:assert/strict';
import {createServerCompatibilityClient} from '../../../efg-nutrition/pilot/server-compatibility-client.js';
const plan={meals:['desayuno','media_manana','almuerzo','merienda','cena'].map(slot=>({slot,items:[{id:'TEST_ONLY',qty:10,unit:'g'}]}))};
let scope={role:'coach',active:true,userId:'c',profileId:'c',sessionId:'s',organizationId:'o',studentId:'a',studentActive:true,ownerId:'c',studentOrganizationId:'o',consent:true,consentStudentId:'a',consentOrganizationId:'o',sourceEpoch:1};
const envelope=(recipe,key,revision=1)=>({viewer_id:'c',session_id:'s',student_id:'a',organization_id:'o',publishable:false,draft_revision:revision,intake_revision:1,health_revision:1,catalog_digest:'TEST_ONLY',goal:{kcal:2000},restriction_declaration:'none_declared',guide:recipe,recipe_projection:recipe,request_key:key,evaluated_at:'2026-11-02T00:00:00Z',compatibility:{actorId:'c',studentId:'a',organizationId:'o',draftRevision:revision,binding:'TEST_ONLY',publishable:false,compatibilityReady:true,validUntil:'2026-11-02T00:01:00Z',pattern:{kind:'general'},decisions:recipe.meals.flatMap(m=>m.items.map(i=>({foodId:i.id,qty:i.qty,unit:i.unit,color:'green',eligible:true,reason:'TEST_ONLY',conditions:['TEST_ONLY']})))}});
const pending=[];
const client=createServerCompatibilityClient({enabled:true,readScope:()=>scope,readSaved:async()=>envelope(plan),evaluateProposal:req=>new Promise(resolve=>pending.push({req,resolve})),monotonicNow:()=>0,wallNow:()=>0,schedule:()=>1,cancel:()=>{}});
await client.refreshSaved(plan);
const edited=structuredClone(plan);edited.meals[0].items[0].qty=11;
const a=client.assessEdit(plan).catch(e=>e.code),b=client.assessEdit(edited);
pending[1].resolve(envelope(edited,pending[1].req.requestKey));await b;
pending[0].resolve(envelope(plan,pending[0].req.requestKey));assert.equal(await a,'STALE_RESPONSE');
assert.equal(client.bindingFor(plan),null);assert.equal(client.bindingFor(edited),'TEST_ONLY');
const changed=client.assessEdit(edited).catch(e=>e.code);pending[2].resolve(envelope(edited,pending[2].req.requestKey,2));assert.equal(await changed,'SOURCE_REVISION_CHANGED');assert.equal(client.status(),'unavailable');
client.invalidate();await client.refreshSaved(plan);
const old=client.assessEdit(plan).catch(e=>e.code);scope={...scope,studentId:'b',sourceEpoch:2};client.checkFreshness();pending[3].resolve(envelope(plan,pending[3].req.requestKey));assert.equal(await old,'STALE_RESPONSE');assert.equal(client.status(),'unavailable');
client.dispose();console.log('PASS TEST_ONLY recipe ordering, revision and student invalidation');
