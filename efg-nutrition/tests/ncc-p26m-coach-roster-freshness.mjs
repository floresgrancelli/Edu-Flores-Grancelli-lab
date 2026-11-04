// Synthetic behavioral proof only: NOT hosted JWT or physical browser QA.
import assert from 'node:assert/strict';
import {createCoachRosterRefresh} from '../pilot/coach-roster-freshness.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',org='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const student='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const state={profile:{user_id:uid,role:'coach'},session:{user:{id:uid}},org:{id:org},authContextEpoch:1,
 selectedStudent:student,consent:{student_id:student,accepted:true},
 coachIntakeForms:{[student]:{revision:3,updated_at:'2026-11-03T15:00:00Z',shared_at:'2026-11-03T15:00:00Z'}},
 coachGuidedDraft:{kind:'flexible_meal_guide',version:2,meals:[{slot:'desayuno',items:[]}]}};
let grant=true,profileOrg=org,authUid=uid,detailLoads=0,closes=0,consents={};
const fetches=[];
const sb={auth:{getUser:async()=>({data:{user:{id:authUid}},error:null})},
 from(name){fetches.push(name);const q={select(){return this},eq(){return this},in(){return this},
 then(resolve){resolve({data:name==='efg_profiles'?[{user_id:student,organization_id:profileOrg,role:'student',active:true}]:
 name==='efg_invitations'?[]:[{student_id:student,accepted:grant}],error:null})}};return q;}};
const refresh=createCoachRosterRefresh({sb,state,setConsents:x=>{consents=x},
 loadForms:async()=>{},loadGoals:async()=>{},loadDraftStatuses:async()=>{},
 loadDetail:async()=>{detailLoads++},closeWorkspace:()=>{closes++}});
const priorDraft=state.coachGuidedDraft;
const a=await refresh();
assert.deepEqual(a,{rosterCount:1,authorizedCount:1,source:'signed_rls_read_only'});
assert.equal(detailLoads,0,'Reopen must not reload the same student and erase unsaved editor');
assert.equal(state.coachGuidedDraft,priorDraft);
assert.equal(consents[student],true);
assert.ok(fetches.includes('efg_profiles')&&fetches.includes('efg_consents'));
profileOrg=uid;await assert.rejects(refresh(),/fuera de la organización/);
assert.equal(state.coachGuidedDraft,priorDraft,'Invalid cross-org roster leaves draft unchanged');
profileOrg=org;authUid=org;await assert.rejects(refresh(),/identidad/);
assert.equal(state.coachGuidedDraft,priorDraft,'Switched auth may not mutate old Coach draft');
authUid=uid;grant=false;await refresh();
assert.equal(state.selectedStudent,null,'Revocation closes selected private student');
assert.equal(state.coachGuidedDraft,null,'Revoked data cannot remain available');
assert.equal(closes,1);assert.equal(consents[student],false);
console.log('PASS P26M: read-only roster freshness and revocation, drafts survive unchanged authorized navigation; synthetic only.');
