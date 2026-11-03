// COACH 01-05 / GU-02: synthetic restriction-consent and guide-choice regressions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readVerifiedCoachRestrictionScope,reviewCoachGuideFoodChange,
 UNVERIFIED_RESTRICTIONS_NOTICE} from '../pilot/coach-guide-restriction-scope.js';
import {guideFoodSignal} from '../pilot/guided-day-v2.js';
const student='11111111-1111-4111-8111-111111111111';
const coach='22222222-2222-4222-8222-222222222222';
const org='33333333-3333-4333-8333-333333333333';
const foreign='44444444-4444-4444-8444-444444444444';
const scope={studentId:student,coachId:coach,organizationId:org};
const row={student_id:student,viewer_id:coach,organization_id:org,revision:2,
 processing_consent:true,followup_consent:true,shared_with_coach:true,
 conditions:{celiac:'confirmed',lactose_intolerance:'suspected',diabetes:'not_reported'}};
const read=(r=row,s=scope)=>readVerifiedCoachRestrictionScope(r,s);
const valid=read();
assert.equal(valid.verified,true);
assert.equal(valid.restrictionStatus,'declared');
assert.deepEqual(valid.restrictions,['celiac','lactose_intolerance']);
assert.ok(valid.reviewNotes.some(x=>x.includes('sospechadas')));
const profile={patternId:'balanced',restrictionStatus:'declared',restrictions:valid.restrictions};
assert.equal(reviewCoachGuideFoodChange({id:'bread',name:'Pan integral'},profile).status,'avoid');
assert.equal(reviewCoachGuideFoodChange({id:'cheese',name:'Port Salut convencional'},profile).needsReview,true);
assert.equal(reviewCoachGuideFoodChange({id:'bread_glutenfree',name:'Pan sin gluten'},profile).status,'review');
assert.equal(reviewCoachGuideFoodChange({id:'banana',name:'Banana'},profile).needsReview,false);
for(const bad of [
 {...row,student_id:foreign},{...row,viewer_id:foreign},
 {...row,organization_id:foreign},{...row,shared_with_coach:false},
 {...row,processing_consent:false},{...row,followup_consent:false},
 {...row,revoked:true},{...row,revision:0},
 {...row,conditions:{unknown_condition:'confirmed'}},
 {...row,conditions:{celiac:true}},{...row,conditions:[]},{...row,conditions:null}
]){
 const result=read(bad);
 assert.equal(result.verified,false);
 assert.equal(result.restrictionStatus,'unknown');
 assert.deepEqual(result.restrictions,[]);
}
assert.equal(read(row,{...scope,coachId:foreign}).verified,false);
assert.equal(read(row,{...scope,organizationId:foreign}).verified,false);
assert.equal(read({...row,conditions:{}}).restrictionStatus,'unknown');
assert.equal(read({...row,conditions:{celiac:'not_reported'}}).restrictionStatus,'unknown');
const negative={kind:'none_declared',version:1,declared_by:student,source_revision:2,
 confirmed_at:new Date(Date.now()-10000).toISOString()};
const none=read({...row,conditions:{},restriction_declaration:negative});
assert.equal(none.verified,true);
assert.equal(none.restrictionStatus,'none_declared');
assert.deepEqual(none.restrictions,[]);
for(const wrong of [
 {...negative,declared_by:foreign},{...negative,source_revision:1},
 {...negative,kind:'invalid'},
 {...negative,confirmed_at:new Date(Date.now()+3600000).toISOString()}
])assert.equal(read({...row,conditions:{},restriction_declaration:wrong}).verified,false);
assert.equal(guideFoodSignal({id:'banana',name:'Banana'},{restrictionStatus:'unknown'}).status,'review');
assert.equal(guideFoodSignal({id:'banana',name:'Banana'},{restrictionStatus:'none_declared'}).status,'possible');
assert.match(UNVERIFIED_RESTRICTIONS_NOTICE,/no presupongas ausencia/);
const ui=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
for(const anchor of ['readVerifiedCoachRestrictionScope(h,','restrictionStatus:verified?shared.restrictionStatus:"unknown"',
 'reviewCoachGuideFoodChange(candidate,currentCoachGuideProfile())',
 'reviewCoachGuideFoodChange(x,currentCoachGuideProfile())'])
 assert.ok(ui.includes(anchor),'Missing real Coach UI policy: '+anchor);
assert.match(ui,/if\(signal\.needsReview&&!window\.confirm\(signal\.message\)\)/);
assert.match(ui,/flagged\.length&&!window\.confirm\(/);
console.log('PASS 01-05: signed scoped conditions, no implicit none, suspected status, revoke, swapped and added guide food review. SYNTHETIC only, clinical OFF.');
