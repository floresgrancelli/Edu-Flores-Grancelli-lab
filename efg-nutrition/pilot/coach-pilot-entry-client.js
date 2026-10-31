// COACH111: new Coach pilot entry adapter. OFF until atomic publishing and
// server-side diary write gate are validated, then enabled as one release.
import {COACH_RELEASE_INTAKE_VERSION} from './coach-relaunch-onboarding.js';
import {PILOT_PARTICIPATION_VERSION} from './pilot-participation-demo.js';
export const COACH_PILOT_ENTRY_BACKEND_VERSION='coach116';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUTES=new Set(['legal','participation','intake','private','review','ready','verify']);
const deny=()=>Object.freeze({route:'verify',canLogMeals:false,reason:'No pudimos verificar tu acceso actual. Reintentá.'});
export function validateCoachPilotEntryResponse(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!ROUTES.has(raw.route)||
   typeof raw.can_log_meals!=='boolean')return deny();
 if(raw.route==='verify')return deny();
 if(typeof raw.legal_current_accepted!=='boolean'||
   raw.required_pilot_version!==PILOT_PARTICIPATION_VERSION||
   raw.required_intake_version!==COACH_RELEASE_INTAKE_VERSION||
   raw.requires_separate_health_consent!==true||
   typeof raw.participation_confirmed!=='boolean'||
   typeof raw.general_intake_shared!=='boolean')return deny();
 if(raw.route==='legal'&&(raw.legal_current_accepted!==false||raw.can_log_meals||
   raw.participation_confirmed||raw.general_intake_shared))return deny();
 if(raw.route!=='legal'&&raw.legal_current_accepted!==true)return deny();
 if(raw.route==='participation'&&(raw.participation_confirmed!==false||raw.can_log_meals))return deny();
 if(raw.route==='intake'&&(raw.participation_confirmed!==true||raw.can_log_meals))return deny();
 if(raw.route==='private'&&(!raw.participation_confirmed||raw.general_intake_shared||raw.can_log_meals))return deny();
 if(raw.route==='review'&&(!raw.participation_confirmed||!raw.general_intake_shared||raw.can_log_meals))return deny();
 if(raw.route==='ready'&&(!raw.participation_confirmed||!raw.general_intake_shared||!raw.can_log_meals))return deny();
 return Object.freeze({route:raw.route,canLogMeals:raw.route==='ready',
  currentLegalAccepted:raw.legal_current_accepted,
  participationConfirmed:raw.participation_confirmed,
  generalIntakeShared:raw.general_intake_shared,
  medicalPermission:false,
  reason:raw.route==='legal'?'Leé y aceptá los Términos y Privacidad actuales para continuar.':
   raw.route==='private'?'Tu ficha está guardada de forma privada. El coach no puede consultarla.':
   raw.route==='review'?'Tu coach está preparando tu plan.':
   raw.route==='intake'?'Completá tu ficha general. Compartirla es opcional.':
   raw.route==='participation'?'Confirmá tu participación; compartir datos es opcional.':
   'Tu acceso está listo.'});
}
export async function fetchCoachPilotEntry(sb,{profile}={}){
 if(typeof sb?.auth?.getUser!=='function'||typeof sb?.rpc!=='function')return deny();
 const identity=await sb.auth.getUser();
 const userId=identity?.data?.user?.id;
 if(identity?.error||!UUID.test(userId||'')||
   profile?.user_id!==userId||profile?.role!=='student'||
   profile?.active!==true||!UUID.test(profile?.organization_id||''))return deny();
 const res=await sb.rpc('efg_coach_pilot_entry_status');
 if(res.error)return deny();
 // The current PWA user can change while the server verifies readiness.
 // Never disclose the former pupil's ready/MI DIA status to a new session.
 const after=await sb.auth.getUser();
 if(after?.error||after?.data?.user?.id!==userId)return deny();
 return validateCoachPilotEntryResponse(res.data);
}
