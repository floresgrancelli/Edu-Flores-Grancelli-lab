// Prepared only. Fake timers test presentation control; no SQL/RPC/browser execution.
import assert from 'node:assert/strict';
import {createServerCompatibilityClient} from '../../../efg-nutrition/pilot/server-compatibility-client.js';
let mono=0,wall=100000,timer,changes=0;
let scope={role:'coach',active:true,userId:'c',profileId:'c',sessionId:'s',organizationId:'o',studentId:'a',studentActive:true,ownerId:'c',studentOrganizationId:'o',consent:true,consentStudentId:'a',consentOrganizationId:'o',sourceEpoch:1};
const plan={meals:['desayuno','media_manana','almuerzo','merienda','cena'].map(slot=>({slot,items:[{id:'TEST_ONLY',qty:10,unit:'g'}]}))};
const row=()=>({viewer_id:'c',session_id:'s',student_id:'a',organization_id:'o',publishable:false,draft_revision:1,intake_revision:1,health_revision:1,catalog_digest:'TEST_ONLY',goal:{kcal:2000},restriction_declaration:'none_declared',guide:plan,evaluated_at:'2026-11-02T00:00:00Z',compatibility:{actorId:'c',studentId:'a',organizationId:'o',draftRevision:1,binding:'TEST_ONLY',publishable:false,compatibilityReady:true,validUntil:'2026-11-02T00:00:01Z',pattern:{kind:'general'},decisions:plan.meals.map(()=>({foodId:'TEST_ONLY',qty:10,unit:'g',color:'green',eligible:true,reason:'TEST_ONLY',conditions:['TEST_ONLY']}))}});
const client=createServerCompatibilityClient({enabled:true,readScope:()=>scope,readSaved:async()=>row(),monotonicNow:()=>mono,wallNow:()=>wall,schedule:fn=>{timer=fn;return 1;},cancel:()=>{timer=null;}});
const observed=[];client.subscribe(()=>{changes++;const state=client.status();const review=client.review({issues:[],decisions:[],normalizedPlan:plan},plan);observed.push({state,ready:review.readyForReview});});
await client.refreshSaved(plan);await Promise.resolve();assert.equal(client.status(),'available');assert.ok(observed.some(x=>x.state==='pending'&&!x.ready),'Pending renderer review stays unapproved without cancelling its request');assert.ok(observed.some(x=>x.state==='available'&&x.ready));
mono=1001;timer();await Promise.resolve();assert.equal(client.status(),'expired');assert.ok(changes>=2);assert.equal(client.bindingFor(plan),null);
assert.equal(client.review({issues:[],decisions:[],normalizedPlan:plan},plan).readyForReview,false);
mono=0;wall=200000;client.invalidate();await client.refreshSaved(plan);
// Simulate background throttling/sleep: monotonic timer does not run, wall advances.
wall+=1001;client.checkFreshness();await Promise.resolve();assert.equal(client.status(),'expired');
client.invalidate();wall=300000;await client.refreshSaved(plan);scope={...scope,studentId:'b'};client.checkFreshness();assert.equal(client.status(),'unavailable');
client.dispose();assert.equal(timer,null);
console.log('PASS expiration state, notification, background wake, context and disposal (TEST_ONLY)');
