// P28: exercise the production-default OFF route against the actual hosted
// table set. Synthetic transport, zero network and no personal records.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCoachIntakeFlow} from '../pilot/coach-intake-flow.js';
const state={profile:{role:'student',organization_id:'org-A'},session:{user:{id:'student-A'}},
 coachIntakeForms:{},coachIntakeAccess:{}};
let row=null,error=null,resolveRead=null;
const reads=[];
const sb={from(table){
 reads.push(table);
 assert.equal(table,'efg_student_plan_access','OFF startup must not query an absent legacy intake');
 const q={select(){return q},eq(){return q},in(){return q},
  maybeSingle:async()=>resolveRead?await new Promise(r=>{resolveRead=r}):({data:row,error}),
  limit:async()=>({data:row?[{student_id:'student-A',...row}]:[],error})};
 return q;
},rpc(){throw Error('No legacy publication RPC is installed');}};
const flow=createCoachIntakeFlow({sb,state,escapeHTML:String,rootText:(a,b)=>a+b});
await flow.loadStudent();
assert.equal(state.studentIntake,null);
assert.equal(state.legacyIntakeUnavailable,true);
assert.equal(state.planAccessSupported,false);
assert.equal(state.planAccess,null,'Do not invent pending or published status for existing accounts');
assert.equal(flow.pending(),false);
assert.doesNotMatch(flow.view(),/id="efgStudentIntakeForm"/);
for(const status of ['pending','published']){
 row={status,published_goal_id:status==='published'?'old-goal':null};
 await flow.loadStudent();
 assert.equal(state.planAccessSupported,true);
 assert.equal(state.planAccess.status,status);
 assert.equal(flow.pending(),status!=='published');
}
for(const action of ['save','deleteOwn','publish'])await assert.rejects(()=>flow[action](),/no está disponible/);
state.profile.role='coach';state.session.user.id='coach-A';
state.coachIntakeForms={'student-A':{notes:'stale private data'}};
await flow.loadCoach(['student-A']);
assert.deepEqual(state.coachIntakeForms,{});
assert.equal(state.coachIntakeAccess['student-A'].status,'published');
await flow.refreshCoachDetail('student-A',true);
assert.equal(state.coachIntakeForms['student-A'],undefined);
error={code:'42501',message:'permission denied'};
await assert.rejects(()=>flow.loadCoach(['student-A']),e=>e.code==='42501');
state.profile.role='student';state.session.user.id='student-A';
await assert.rejects(()=>flow.loadStudent(),e=>e.code==='42501');
assert.equal(state.planAccessSupported,false);
error=null;resolveRead=true;
const pending=flow.loadStudent();
state.session.user.id='student-B';state.studentIntake={notes:'B only'};
resolveRead({data:{status:'published'},error:null});
await assert.rejects(pending,/sesión cambió/);
assert.equal(state.studentIntake.notes,'B only');
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(app,/if\(PRIVATE_HEALTH_DECLARATION_UI_ENABLED&&state.profile\?\.role==="coach"/,
 'Basic restriction reads follow their own consent UI gate, not the advanced clinical module');
assert.doesNotMatch(app,/if\(CLINICAL_GUIDE_CONNECTION_ENABLED&&state.profile\?\.role==="coach"/);
console.log('PASS P28: OFF startup has zero legacy requests; existing/no-row and explicit pending/published states; no legacy writes; permission and session-race failures; independent restriction gate. Synthetic transport only.');
