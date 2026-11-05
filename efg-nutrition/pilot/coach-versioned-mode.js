// Both onboarding routes use the same versioned Coach backend.
// This does not enable either route or certify deployment prerequisites.
import {COACH_RELAUNCH_ONBOARDING_ENABLED} from "./coach-relaunch-onboarding.js?v=ncc-pilot-3a40474052be-guide-return-r6";
import {COACH_STUDENT_JOURNEY_ENABLED} from "./coach-student-journey.js?v=ncc-pilot-3a40474052be-guide-return-r6";
export function usesVersionedCoachIntake({relaunchEnabled=false,studentJourneyEnabled=false}={}){
 return relaunchEnabled===true||studentJourneyEnabled===true;
}
export const COACH_VERSIONED_INTAKE_ENABLED=usesVersionedCoachIntake({
 relaunchEnabled:COACH_RELAUNCH_ONBOARDING_ENABLED,
 studentJourneyEnabled:COACH_STUDENT_JOURNEY_ENABLED
});
