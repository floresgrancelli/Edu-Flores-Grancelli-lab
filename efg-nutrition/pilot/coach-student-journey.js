// COACH100 — mandatory guided Coach journey contract (PILOT STAGING ONLY).
// This is an extra UI guard, NOT authorization and NOT a data migration.
// All reads MUST be server-authenticated/RLS verified. Never infer consents
// from OTP, existing goals, a legacy intake or the locally saved form.
// Medical conditions are NOT stored or shared by this module.
import {COACH_RELEASE_INTAKE_VERSION} from './coach-relaunch-onboarding.js';
import {PILOT_PARTICIPATION_VERSION} from './pilot-participation-demo.js';
export const COACH_STUDENT_JOURNEY_ENABLED=false;
export const COACH_STUDENT_JOURNEY_STEPS=Object.freeze([
 {id:'participation',label:'Participación y autorización de compartir ficha'},
 {id:'intake',label:'Ficha inicial de salud y nutrición'},
 {id:'review',label:'El coach prepara y aprueba tu plan'},
 {id:'ready',label:'MI DÍA habilitado'}
]);
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const stamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const result=(route,reason)=>Object.freeze({route,reason,canLogMeals:route==='ready'});
export function resolveCoachStudentJourney({
 profile,userId,identityVerified=false,participation,participationFetched=false,
 intake,intakeFetched=false,plan,planFetched=false,guide,guideFetched=false
}={}){
 if(!uuid(userId)||!profile||profile.user_id!==userId||identityVerified!==true)
  return result('verify','La identidad no está verificada.');
 if(profile.role!=='student'||profile.active!==true||!uuid(profile.organization_id))
  return result('verify','La cuenta de alumno no está habilitada.');
 if(!participationFetched)return result('verify','No se pudo consultar tu participación.');
 if(!participation||participation.user_id!==userId||
   participation.version!==PILOT_PARTICIPATION_VERSION||
   participation.participation_accepted!==true||
   participation.sharing_accepted!==true||
   participation.revoked_at!=null||!stamp(participation.accepted_at))
  return result('participation','Confirmá la participación y el permiso para compartir tu ficha.');
 if(!intakeFetched)return result('verify','No se pudo verificar tu ficha nueva.');
 if(!intake||intake.student_id!==userId||intake.organization_id!==profile.organization_id||
   intake.completed_version!==COACH_RELEASE_INTAKE_VERSION||
   !Number.isSafeInteger(intake.revision)||intake.revision<1||
   !stamp(intake.updated_at)||!stamp(intake.shared_at)||
   intake.health_section_confirmed!==true)
  return result('intake','Completá y enviá tu ficha de salud y nutrición al coach.');
 if(!planFetched||!guideFetched)return result('verify','No se pudo comprobar el estado de tu plan.');
 if(!plan||plan.student_id!==userId||plan.organization_id!==profile.organization_id||
   plan.status!=='published'||!uuid(plan.published_goal_id)||!stamp(plan.published_at)||
   Date.parse(plan.published_at)<Date.parse(intake.updated_at)||
   !guide||guide.student_id!==userId||
   guide.guided_goal_id!==plan.published_goal_id||!stamp(guide.guided_plan_approved_at)||
   Date.parse(guide.guided_plan_approved_at)<Date.parse(intake.updated_at))
  return result('review','Tu coach recibió la ficha y está preparando tu plan de alimentación.');
 return result('ready','Tu objetivo y guía de alimentación ya están aprobados.');
}
export function renderCoachPlanWaiting(){
 return '<section class="card efg-coach-waiting" role="status" aria-live="polite">'+
 '<span class="eyebrow">NUTRICIÓN CON-CIENCIA · MI INGRESO</span>'+
 '<h2>Tu coach está preparando tu plan</h2>'+
 '<p>Tu ficha fue enviada. El coach debe revisar tus datos y aprobar tu objetivo y una guía de cinco comidas. Te avisaremos cuando puedas comenzar a registrar tus comidas.</p>'+
 '<p class="pilot-hint">Mientras tanto podés usar la mensajería. Tus comidas, peso y planes anteriores no se borraron.</p>'+
 '<button class="btn" type="button" data-act="openMessages">Hablar con mi coach</button>'+
 '<button class="btn light" type="button" data-act="retry">Comprobar si mi plan está listo</button>'+
 '</section>';
}
