// RELEASE 01-01 — mandatory fresh intake for every Coach student.
// Synthetic only: DO NOT touch or mutate historic Supabase rows.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COACH_RELAUNCH_ONBOARDING_ENABLED,COACH_RELEASE_INTAKE_VERSION,
 EMPTY_COACH_RELAUNCH_INTAKE,resolveCoachRelaunchEntry,initialCoachRelaunchIntake}
 from "../pilot/coach-relaunch-onboarding.js";
import {validateCoachPilotEntryResponse,fetchCoachPilotEntry}
 from "../pilot/coach-pilot-entry-client.js";
import {resolveCoachStudentJourney} from "../pilot/coach-student-journey.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const uid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const org="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const goal="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const profile={user_id:uid,organization_id:org,role:"student",active:true};
const legal=[{kind:"terms",document_id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",version:"r1",sha256:"a".repeat(64),accepted:true},
 {kind:"privacy",document_id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",version:"r1",sha256:"b".repeat(64),accepted:true}];
assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false,"Do not activate before hosted GO.");
const existing={
 historical_diary_count:19,historical_goals:[goal],historical_messages:8,
 legacy_intake:{completed_version:"coach_legacy_2026",revision:34,shared_at:"2026-10-01T12:00:00Z"},
 legacy_published_plan:{published_goal_id:goal,published_at:"2026-10-25T12:00:00Z"}
};
const copy=JSON.stringify(existing);
const gate=(onboardingStatus,legalStatus=legal)=>resolveCoachRelaunchEntry({
 profile,userId:uid,identityVerified:true,
 legalStatus,legalStatusFetched:true,
 onboardingStatus,onboardingStatusFetched:true
});
for(const userType of ["nuevo","actual_con_historial"]){
 // Existing approved plans must not confer this release's intake completion.
 const intake=userType==="nuevo"?null:existing.legacy_intake;
 assert.equal(gate(intake).route,"intake",userType+" must fill current release intake");
 assert.equal(gate(intake,[{...legal[0],accepted:false},legal[1]]).route,"legal",
  userType+" must first accept CURRENT legal documents");
 const draft=initialCoachRelaunchIntake({
  draftVersion:userType==="nuevo"?null:existing.legacy_intake?.completed_version,
  currentVersionDraft:userType==="nuevo"?null:{age_years:41,notes:"legacy note",shareWithCoach:true,
    health_flags:["celiac"],objective:"recomp"}
 });
 assert.deepEqual(draft,{...EMPTY_COACH_RELAUNCH_INTAKE,health_flags:[]},
  "Never prefill stale health data, existing meals, notes or sharing permission.");
 assert.equal(draft.shareWithCoach,false,"Sharing must never be inherited.");
}
assert.equal(JSON.stringify(existing),copy,"No historical diary, plan or message may be rewritten.");
assert.equal(gate({student_id:uid,organization_id:org,
 completed_version:COACH_RELEASE_INTAKE_VERSION,revision:2}).route,"ready");
assert.equal(gate({student_id:uid,organization_id:org,
 completed_version:"coach_legacy_2026",revision:2}).route,"intake");
const signedNew={route:"intake",can_log_meals:false,required_pilot_version:"coach_pilot_2026_demo1",
 required_intake_version:COACH_RELEASE_INTAKE_VERSION,
 participation_confirmed:true,general_intake_shared:false,
 requires_separate_health_consent:true,legal_current_accepted:true};
assert.equal(validateCoachPilotEntryResponse(signedNew).route,"intake");
assert.equal(validateCoachPilotEntryResponse({...signedNew,route:"ready",can_log_meals:true}).route,"verify",
 "Legacy published plan must not make an incomplete new intake ready.");
let calls=[];
const client={auth:{getUser:async()=>({data:{user:{id:uid}},error:null})},
 rpc:async function(name){calls.push(name);return {data:signedNew,error:null}}};
const result=await fetchCoachPilotEntry(client,{profile});
assert.equal(result.route,"intake");
assert.equal(result.canLogMeals,false);
assert.deepEqual(calls,["efg_coach_pilot_entry_status"]);
assert.equal((await fetchCoachPilotEntry(client,{profile:{...profile,organization_id:uid}})).canLogMeals,false);
const priorApproval="2026-10-26T12:00:00Z";
const currentUpdated="2026-10-30T12:00:00Z";
const participation={user_id:uid,version:"coach_pilot_2026_demo1",
 participation_accepted:true,sharing_accepted:true,
 accepted_at:"2026-10-30T10:00:00Z",revoked_at:null};
const intake={student_id:uid,organization_id:org,completed_version:COACH_RELEASE_INTAKE_VERSION,
 revision:1,updated_at:currentUpdated,shared_at:currentUpdated,health_section_confirmed:true};
const proposed={userId:uid,profile,identityVerified:true,
 participation,participationFetched:true,intake,intakeFetched:true,
 plan:{student_id:uid,organization_id:org,status:"published",
  published_goal_id:goal,published_at:priorApproval},
 planFetched:true,guide:{student_id:uid,guided_goal_id:goal,
  guided_plan_approved_at:priorApproval},guideFetched:true};
const checked=resolveCoachStudentJourney(proposed);
assert.equal(checked.route,"review");
assert.equal(checked.canLogMeals,false,
 "A prior published plan MUST NOT unlock MI DÍA before the current intake is reapproved.");
const schema=read("../migrations/20261030_coach_relaunch_general_pilot_intake.sql");
const initial=read("../migrations/20261030_coach_pilot_student_entry_status.sql");
const legalGate=read("../migrations/20261030_coach116_legal_first_student_status.sql");
assert.match(schema,/primary key\(student_id,completed_version\)/);
assert.match(schema,/revision integer not null default 1 check \(revision between 1 and 100000\)/);
assert.match(schema,/completed_at timestamptz not null default now\(\)/);
assert.match(schema,/updated_at timestamptz not null default now\(\)/);
assert.match(schema,/No direct PostgREST INSERT\/UPDATE\/DELETE grant/);
assert.match(initial,/v_intake\.revision is null or v_intake\.revision<1/);
for(const sql of [initial,legalGate]){
 assert.match(sql,/i\.completed_version='coach_major_2026_r1'/);
 assert.match(sql,/v_plan\.published_at >= v_intake\.updated_at/);
 assert.match(sql,/v_guide_at>=v_intake\.updated_at/);
 assert.match(sql,/v_guide_goal=v_plan\.published_goal_id/);
 assert.doesNotMatch(sql,/\b(?:update|delete|truncate)\s+(?:from\s+)?public\.efg_(?:goals|daily_logs|messages|food_plans)/i);
}
assert.match(legalGate,/v_current_legal_count<>2/);
console.log("PASS 01-01: new + returning students repeat versioned form, legacy plans/history preserved, separate legal, no silent sharing; synthetic only, hosted OFF.");
