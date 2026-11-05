// Execute the actual application read guard and mapper. Synthetic identities only.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {readVerifiedCoachRestrictionScope} from '../pilot/coach-guide-restriction-scope.js';
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const actor='22222222-2222-4222-8222-222222222222',student='11111111-1111-4111-8111-111111111111',organization='33333333-3333-4333-8333-333333333333';
const profileReader=app.slice(app.indexOf('function currentCoachGuideProfile'),app.indexOf('function coachGuidedSection'));
const helper=app.slice(app.indexOf('function ownsCoachHealthWorkspace'),app.indexOf('function foodTrafficLight'));
const loadStart=app.indexOf(' if(PRIVATE_HEALTH_DECLARATION_UI_ENABLED&&ownsCoachHealthWorkspace()');
assert.ok(loadStart>0,'Test must execute the mounted student-detail health read');
const load=app.slice(loadStart,app.indexOf(' if(!c.data?.accepted)',loadStart));
function fixture(role='admin',modify=()=>{}){
 const state={profile:{role,active:true,user_id:actor},session:{user:{id:actor}},org:{id:organization,coach_id:actor,is_test:true},selectedStudent:student,consent:{accepted:true},coachIntakeForms:{[student]:{shared_at:'2026-11-04'}}};
 const row={student_id:student,viewer_id:actor,organization_id:organization,shared_with_coach:true,processing_consent:true,followup_consent:true,revision:7,conditions:{celiac:'confirmed'}};
 const trace={reads:0};
 const c={state,row,trace,studentId:student,coachId:actor,PRIVATE_HEALTH_DECLARATION_UI_ENABLED:true,profilePatternForCompatibility:x=>x,c:{data:{accepted:true}},contextRead:async x=>x,readVerifiedCoachRestrictionScope,console:{warn(){}},sb:{auth:{getUser:async()=>({data:{user:{id:actor}}})},rpc:async()=>{trace.reads++;return {data:c.row};}}};
 modify(c);vm.createContext(c);vm.runInContext(helper+profileReader+'\nasync function loadHealth(){'+load+'}',c);return c;
}
for(const role of ['coach','admin'])test(role+' owner reads only shared, identity-verified restrictions',async()=>{
 const c=fixture(role);await c.loadHealth();assert.equal(c.trace.reads,1);assert.equal(c.state.coachGuideHealth.revision,7);assert.deepEqual([...c.foodCompatibilityRestrictions()],['celiac']);const p=c.currentCoachGuideProfile();assert.equal(p.restrictionSource.revision,7);assert.equal(p.restrictionSource.organizationId,organization);assert.equal(p.restrictionStatus,'declared');
});
for(const [name,change] of [
 ['foreign organization',c=>c.state.org.coach_id=student],
 ['non-test admin organization',c=>c.state.org.is_test=false],
 ['inactive admin',c=>c.state.profile.active=false],
 ['mismatched signed profile',c=>c.state.profile.user_id=student],
 ['student role',c=>c.state.profile.role='student'],
 ['missing follow-up consent',c=>c.c.data.accepted=false],
 ['unshared general intake',c=>c.state.coachIntakeForms[student].shared_at=null]
])test(name+' never starts the private health RPC',async()=>{const c=fixture('admin',change);await c.loadHealth();assert.equal(c.trace.reads,0);assert.equal(c.state.coachGuideHealth,undefined);});
for(const [name,change] of [
 ['foreign viewer',c=>c.row.viewer_id=student],
 ['foreign student',c=>c.row.student_id=actor],
 ['foreign organization response',c=>c.row.organization_id=actor],
 ['private-only declaration',c=>c.row.shared_with_coach=false],
 ['missing processing consent',c=>c.row.processing_consent=false],
 ['revoked declaration',c=>c.row.revoked=true]
])test(name+' is not cached as usable health data',async()=>{const c=fixture('admin',change);await c.loadHealth();assert.equal(c.state.coachGuideHealth,undefined);assert.deepEqual([...c.foodCompatibilityRestrictions()],['health_status_unknown']);});
test('cached restrictions do not follow an admin into another organization',async()=>{const c=fixture();await c.loadHealth();c.state.org={id:actor,coach_id:student,is_test:true};assert.deepEqual([...c.foodCompatibilityRestrictions()],['health_status_unknown']);});
test('stale auth context during health RPC propagates and is never cached',async()=>{const c=fixture();c.contextRead=async x=>{await x;throw Object.assign(Error('stale'),{code:'STALE_AUTH_CONTEXT'});};await assert.rejects(c.loadHealth(),{code:'STALE_AUTH_CONTEXT'});assert.equal(c.state.coachGuideHealth,undefined);});
