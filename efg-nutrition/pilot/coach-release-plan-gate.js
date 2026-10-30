// COACH-66 · Release-only publication gate. OFF until server-side draft and
// atomic publish RPC BOTH verify the new versioned intake and consent.
// This is client defense-in-depth; PostgreSQL authorization remains mandatory.
import {COACH_RELAUNCH_ONBOARDING_ENABLED} from "./coach-relaunch-onboarding.js";
export const COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false;
export const COACH_RELAUNCH_LEGACY_PLAN_ACTIONS=Object.freeze([
 "approveGoal","approveGoalRevision","saveGuidedDay","saveCoachFoodPlan",
 "saveCoachFoods","publishCoachStudentPlan","saveCoachAtomicDraft",
 "publishCoachAtomicDraft","approveGuidedDay"
]);
export function assertCoachReleasePlanWriteAllowed({
 relaunchEnabled=COACH_RELAUNCH_ONBOARDING_ENABLED,
 versionedBackendVerified=COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED
}={}){
 if(relaunchEnabled===true&&versionedBackendVerified!==true)
  throw Error("El plan del relanzamiento todavía no puede guardarse ni publicarse: falta verificar en el servidor la nueva ficha por versión, su permiso y la aprobación conjunta de objetivo y guía. Se conserva el plan anterior.");
 return true;
}
