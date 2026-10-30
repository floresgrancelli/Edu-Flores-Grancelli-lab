// COACH-RELAUNCH · versioned student onboarding gate · DRAFT / OFF.
// The server must verify auth.uid, organization, legal versions and intake revision
// via RLS-backed tables/RPC. This pure selector is NOT a security boundary and is
// NOT yet wired to production or a hosted migration.
export const COACH_RELAUNCH_ONBOARDING_ENABLED=false;
export const COACH_RELEASE_INTAKE_VERSION="coach_major_2026_r1";
const isUuid=id=>typeof id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export const EMPTY_COACH_RELAUNCH_INTAKE=Object.freeze({
 objective:"",age_years:null,height_cm:null,weight_kg:null,activity_level:"",
 dietary_pattern:"",preferred_foods:"",disliked_foods:"",meal_routine:"",notes:"",
 health_flags:Object.freeze([]),allergy_details:"",shareWithCoach:false
});
function legalAccepted(status){
 return Array.isArray(status)&&status.length===2&&
  status.every(x=>x&&typeof x.document_id==="string"&&x.document_id.length>0&&
   typeof x.version==="string"&&x.version.length>0&&x.accepted===true)&&
  new Set(status.map(x=>x.document_id)).size===2;
}
export function resolveCoachRelaunchEntry({
 userId,profile,identityVerified=false,legalStatus,legalStatusFetched=false,
 onboardingStatus,onboardingStatusFetched=false,
 requiredVersion=COACH_RELEASE_INTAKE_VERSION
}={}){
 if(!isUuid(userId)||identityVerified!==true||!profile||profile.user_id!==userId)
  return {route:"verify",reason:"La identidad no fue validada por el servidor."};
 if(profile.active!==true)return {route:"inactive",reason:"Cuenta inactiva."};
 if(profile.role!=="student")return {route:"other_role",reason:"Esta ficha corresponde solamente a alumnos Coach."};
 if(!isUuid(profile.organization_id))return {route:"verify",reason:"No se pudo validar la organización de la cuenta."};
 if(!legalStatusFetched)return {route:"retry",reason:"No se pudo consultar el estado legal actual."};
 if(!legalAccepted(legalStatus))return {route:"legal",reason:"Revisar Términos y Privacidad actuales por separado."};
 if(!onboardingStatusFetched)return {route:"retry",reason:"No se pudo consultar la revisión de la ficha."};
 if(typeof requiredVersion!=="string"||!/^[a-z0-9_]{5,80}$/.test(requiredVersion))
  return {route:"retry",reason:"Versión de ficha inválida."};
 if(onboardingStatus!==null&&(
   !onboardingStatus||onboardingStatus.student_id!==userId||
   onboardingStatus.organization_id!==profile.organization_id||
   typeof onboardingStatus.completed_version!=="string"
  ))return {route:"retry",reason:"La respuesta de la ficha no corresponde a este alumno."};
 if(onboardingStatus?.completed_version!==requiredVersion)
  return {route:"intake",reason:"Completar/revisar la ficha nueva de Nutrition Coach."};
 return {route:"ready",reason:"La revisión de ficha actual está confirmada."};
}
// Begin the MAJOR release intake with a fresh form, without deleting legacy
// records or silently carrying forward old sharing/medical consent.
export function initialCoachRelaunchIntake({
 requiredVersion=COACH_RELEASE_INTAKE_VERSION,
 draftVersion=null,currentVersionDraft=null
}={}){
 if(draftVersion!==requiredVersion||!currentVersionDraft||
    typeof currentVersionDraft!=="object"||Array.isArray(currentVersionDraft))
  return {...EMPTY_COACH_RELAUNCH_INTAKE,health_flags:[]};
 // A draft from THIS release may be offered back to its verified owner, after
 // the server's ownership/consent checks. Never precheck any share permission.
 const allowed=Object.keys(EMPTY_COACH_RELAUNCH_INTAKE).filter(k=>k!=="shareWithCoach");
 const form={...EMPTY_COACH_RELAUNCH_INTAKE,health_flags:[]};
 for(const key of allowed)if(Object.prototype.hasOwnProperty.call(currentVersionDraft,key))
  form[key]=key==="health_flags"
   ?(Array.isArray(currentVersionDraft[key])?[...currentVersionDraft[key]]:[])
   :currentVersionDraft[key];
 form.shareWithCoach=false;
 return form;
}
