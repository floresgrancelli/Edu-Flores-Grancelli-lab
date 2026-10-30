// COACH-RELAUNCH · synthetic versioned re-entry contract, no database/auth service.
import assert from "node:assert/strict";
import {COACH_RELAUNCH_ONBOARDING_ENABLED,COACH_RELEASE_INTAKE_VERSION,
 EMPTY_COACH_RELAUNCH_INTAKE,resolveCoachRelaunchEntry,initialCoachRelaunchIntake}
 from "../pilot/coach-relaunch-onboarding.js";
assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false,"Release gate must stay OFF before legal/backend QA.");
const studentId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const organizationId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const profile={user_id:studentId,role:"student",active:true,organization_id:organizationId};
const legalStatus=[{kind:"terms",document_id:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",version:"2026-11",sha256:"a".repeat(64),accepted:true},
 {kind:"privacy",document_id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",version:"2026-11",sha256:"b".repeat(64),accepted:true}];
const base={userId:studentId,profile,identityVerified:true,legalStatus,legalStatusFetched:true,
 onboardingStatusFetched:true,requiredVersion:COACH_RELEASE_INTAKE_VERSION};
const route=patch=>resolveCoachRelaunchEntry({...base,...patch}).route;
const completed={student_id:studentId,organization_id:organizationId,completed_version:COACH_RELEASE_INTAKE_VERSION,revision:1};
assert.equal(route({onboardingStatus:null}),"intake",
 "Old pilot student with no current record MUST revisit a fresh intake.");
assert.equal(route({onboardingStatus:{...completed,completed_version:"coach_old_version"}}),"intake",
 "Old student intake must never satisfy new version, even when plan is published.");
assert.equal(route({onboardingStatus:completed}),"ready");
for(const revision of [undefined,null,0,-1,1.5,"1",Number.MAX_SAFE_INTEGER+1]){
 assert.equal(route({onboardingStatus:{...completed,revision}}),"retry",
  "A matching version without a committed positive integer revision must NOT unlock student navigation.");
}
assert.equal(route({legalStatus:[{...legalStatus[0],kind:"terms"},{...legalStatus[1],kind:"terms"}],onboardingStatus:completed}),"legal",
 "Two accepted Terms cannot substitute for a separate Privacy acceptance.");
assert.equal(route({legalStatus:[{...legalStatus[0],sha256:"" },legalStatus[1]],onboardingStatus:completed}),"legal",
 "An incomplete legal document hash cannot satisfy re-onboarding.");
assert.equal(route({legalStatus:[{...legalStatus[0],document_id:legalStatus[1].document_id},legalStatus[1]],onboardingStatus:completed}),"legal",
 "Duplicate legal document IDs cannot satisfy separate documents.");
assert.equal(route({onboardingStatus:completed,profile:{...profile,role:"coach"}}),"other_role");
assert.equal(route({onboardingStatus:completed,profile:{...profile,role:"admin"}}),"other_role");
assert.equal(route({onboardingStatus:completed,profile:{...profile,role:"personal"}}),"other_role");
assert.equal(route({identityVerified:false,onboardingStatus:completed}),"verify");
assert.equal(route({userId:"not-a-uuid",onboardingStatus:completed}),"verify");
assert.equal(route({profile:{...profile,user_id:organizationId},onboardingStatus:completed}),"verify");
assert.equal(route({profile:{...profile,organization_id:null},onboardingStatus:completed}),"verify");
assert.equal(route({profile:{...profile,active:false},onboardingStatus:completed}),"inactive");
assert.equal(route({legalStatusFetched:false,onboardingStatus:completed}),"retry");
assert.equal(route({legalStatus:[legalStatus[0]],onboardingStatus:completed}),"legal");
assert.equal(route({legalStatus:[{...legalStatus[0],accepted:false},legalStatus[1]],onboardingStatus:completed}),"legal");
assert.equal(route({legalStatus:[legalStatus[0],legalStatus[0]],onboardingStatus:completed}),"legal");
assert.equal(route({onboardingStatusFetched:false,onboardingStatus:completed}),"retry",
 "Network failure cannot become ready by legacy plan status.");
assert.equal(route({onboardingStatus:{...completed,student_id:organizationId}}),"retry");
assert.equal(route({onboardingStatus:{...completed,organization_id:studentId}}),"retry");
assert.equal(route({onboardingStatus:{...completed,completed_version:22}}),"retry");
const fresh=initialCoachRelaunchIntake({
 draftVersion:"old_2026",currentVersionDraft:{
  age_years:41,objective:"recomp",health_flags:["celiac"],shareWithCoach:true,
  preferred_foods:"Pan integral"
 }
});
assert.deepEqual(fresh,{...EMPTY_COACH_RELAUNCH_INTAKE,health_flags:[]},
 "New revision must NEVER prefill last year's medical or private data.");
assert.equal(fresh.shareWithCoach,false);
const resumed=initialCoachRelaunchIntake({
 draftVersion:COACH_RELEASE_INTAKE_VERSION,currentVersionDraft:{
  age_years:42,objective:"recomp",health_flags:["celiac"],
  shareWithCoach:true,student_id:studentId,
  approved:true
 }});
assert.equal(resumed.age_years,42);
assert.deepEqual(resumed.health_flags,["celiac"]);
assert.equal(resumed.shareWithCoach,false,"Old sharing permission never prechecks new consent.");
assert.ok(!("student_id" in resumed));
assert.ok(!("approved" in resumed));
resumed.health_flags.push("diabetes");
assert.deepEqual(EMPTY_COACH_RELAUNCH_INTAKE.health_flags,[]);
assert.equal(route({onboardingStatus:{...completed,completed_version:"other_2027"}}),"intake",
 "A future-version marker does not prove THIS version complete.");
const appSource=await (await import("node:fs/promises")).readFile(
 new URL("../pilot/pilot.js",import.meta.url),"utf8");
assert.match(appSource,/await coachIntakeFlow\.loadStudent\(\)/);
assert.match(appSource,/if\(!\["student","coach","admin"\]\.includes\(state\.profile\.role\)\)return render\(\)/);
console.log("PASS Coach relaunch DRAFT: returning pilot must repeat CURRENT version even when previously onboarded; Terms first, no cross-role, no stale sharing, owner isolation and no data deletion.");
