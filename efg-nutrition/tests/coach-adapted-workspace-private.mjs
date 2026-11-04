import assert from 'node:assert/strict';
import {adaptedScopeKey,createCoachAdaptedWorkspace} from '../pilot/coach-adapted-workspace.js';
const scope={userId:'coach-a',profileId:'coach-a',role:'coach',active:true,organizationId:'org-a',ownerId:'coach-a',
 studentId:'student-a',studentActive:true,studentOrganizationId:'org-a',consent:true,
 consentStudentId:'student-a',consentOrganizationId:'org-a'};
assert.ok(adaptedScopeKey(scope));
for(const change of [{userId:'coach-b'},{studentOrganizationId:'org-b'},{consentOrganizationId:'org-b'},
 {consentStudentId:'student-b'},{role:'student'},{consent:false},{studentActive:false}])
 assert.equal(adaptedScopeKey({...scope,...change}),null);
console.log('PASS preview scope rejects cross-org, mismatched consent/session and non-coach');
let called=0;
const off=createCoachAdaptedWorkspace({readScope:()=>scope,loadInput:async()=>{called++;}});
await assert.rejects(()=>off.open(null));assert.equal(called,0);
const absent=createCoachAdaptedWorkspace({enabled:true,readScope:()=>scope});
assert.equal(absent.available(),false);await assert.rejects(()=>absent.open(null));
console.log('PASS disabled preview/missing adapter cannot load data');
const real=createCoachAdaptedWorkspace({enabled:true,readScope:()=>scope,loadInput:async()=>({synthetic:false})});
await assert.rejects(()=>real.open(null),/adaptador real/);
console.log('PASS real inputs rejected until dedicated adapter is implemented');
let current={...scope},release;
const race=createCoachAdaptedWorkspace({enabled:true,readScope:()=>current,loadInput:()=>new Promise(r=>{release=r;})});
const pending=race.open(null);current={...scope,studentId:'student-b',consentStudentId:'student-b'};release({synthetic:true});
await assert.rejects(()=>pending,/Cambió/);assert.equal(race.snapshot(),null);
console.log('PASS changing student during async load rejects stale result');
