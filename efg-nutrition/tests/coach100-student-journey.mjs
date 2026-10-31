// COACH100: exact signed-server-data-shaped policy with fictional IDs. NO data access.
import assert from 'node:assert/strict';
import {
 COACH_STUDENT_JOURNEY_ENABLED,COACH_STUDENT_JOURNEY_STEPS,
 resolveCoachStudentJourney,renderCoachPlanWaiting
} from '../pilot/coach-student-journey.js';
assert.equal(COACH_STUDENT_JOURNEY_ENABLED,false,'Cannot enable before hosted RLS and persistence verified');
assert.deepEqual(COACH_STUDENT_JOURNEY_STEPS.map(x=>x.id),['participation','intake','review','ready']);
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',org='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const goal='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const profile={user_id:uid,organization_id:org,role:'student',active:true};
const participation={user_id:uid,version:'coach_pilot_2026_demo1',participation_accepted:true,
 sharing_accepted:true,accepted_at:'2026-10-30T11:00:00Z',revoked_at:null};
const intake={student_id:uid,organization_id:org,completed_version:'coach_major_2026_r1',
 revision:1,updated_at:'2026-10-30T12:00:00Z',shared_at:'2026-10-30T12:00:00Z',
 health_section_confirmed:true};
const plan={student_id:uid,organization_id:org,status:'published',
 published_goal_id:goal,published_at:'2026-10-30T15:00:00Z'};
const guide={student_id:uid,guided_goal_id:goal,guided_plan_approved_at:'2026-10-30T15:00:00Z'};
const params={userId:uid,profile,identityVerified:true,participation,participationFetched:true,
 intake,intakeFetched:true,plan,planFetched:true,guide,guideFetched:true};
const gate=change=>resolveCoachStudentJourney({...params,...change});
assert.deepEqual(gate({}),{route:'ready',reason:'Tu objetivo y guía de alimentación ya están aprobados.',canLogMeals:true});
const mustDeny=[
 [{identityVerified:false},'verify'],
 [{participationFetched:false},'verify'],
 [{participation:null},'participation'],
 [{participation:{...participation,sharing_accepted:false}},'participation'],
 [{participation:{...participation,participation_accepted:false}},'participation'],
 [{participation:{...participation,revoked_at:'2026-10-30T16:00:00Z'}},'participation'],
 [{participation:{...participation,user_id:org}},'participation'],
 [{participation:{...participation,version:'old'}},'participation'],
 [{intakeFetched:false},'verify'],
 [{intake:null},'intake'],
 [{intake:{...intake,completed_version:'legacy_pilot'}},'intake'],
 [{intake:{...intake,health_section_confirmed:false}},'intake'],
 [{intake:{...intake,revision:0}},'intake'],
 [{intake:{...intake,shared_at:null}},'intake'],
 [{intake:{...intake,organization_id:uid}},'intake'],
 [{planFetched:false},'verify'],
 [{guideFetched:false},'verify'],
 [{plan:null},'review'],
 [{plan:{...plan,status:'pending'}},'review'],
 [{plan:{...plan,published_at:'2026-10-30T10:00:00Z'}},'review'],
 [{plan:{...plan,organization_id:uid}},'review'],
 [{guide:null},'review'],
 [{guide:{...guide,guided_goal_id:uid}},'review'],
 [{guide:{...guide,organization_id:uid}},'review'],
 [{guide:{...guide,guided_plan_approved_at:'2026-10-30T10:00:00Z'}},'review'],
 [{profile:{...profile,active:false}},'verify'],
 [{profile:{...profile,role:'coach'}},'verify']
];
for(const [change,expected]of mustDeny){
 const value=gate(change);
 assert.equal(value.route,expected,'Unexpected access for '+JSON.stringify(change));
 assert.equal(value.canLogMeals,false,'Unauthorized students cannot log meals');
}
assert.equal(gate({guide:{...guide,organization_id:org}}).route,'ready',
 'Matching guide organization must preserve diary access');
assert.match(renderCoachPlanWaiting(),/Tu coach está preparando tu plan/);
assert.match(renderCoachPlanWaiting(),/una guía de cinco comidas/);
assert.match(renderCoachPlanWaiting(),/mensajería/i);
assert.match(renderCoachPlanWaiting(),/Tus comidas, peso y planes anteriores no se borraron/);
console.log('PASS COACH100: both consents, fresh shared health intake and current atomic goal+guide mandatory before MI DÍA. All legacy/stale/cross-tenant routes denied (synthetic only).');
