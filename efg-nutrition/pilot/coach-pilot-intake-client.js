// COACH112: real general-intake client for the optional Coach PILOT, distinct
// from old draft T&C and from clinical/sensitive medical data. OFF in the PWA.
import {COACH_RELEASE_INTAKE_VERSION} from './coach-relaunch-onboarding.js';
import {loadPilotParticipationReceipt} from './pilot-participation-client.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS=new Set(['objective','age_years','height_cm','weight_kg','activity_level',
 'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes']);
const SENSITIVE=new Set(['health_flags','allergy_details','diagnosis','conditions',
 'sibo','lactose_intolerance','celiac','glucose','cholesterol','medications']);
function identity(profile,userId){
 if(!UUID.test(userId||'')||profile?.role!=='student'||!profile.active||
   profile.user_id!==userId||!UUID.test(profile.organization_id||''))
  throw Error('La identidad de alumno no está validada.');
}
function fieldsOnly(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Ficha inválida.');
 const out={};
 for(const [key,value] of Object.entries(payload)){
  if(SENSITIVE.has(key)||!FIELDS.has(key))throw Error('Este campo no pertenece a la ficha nutricional general.');
  if(value!==null&&typeof value!=='string'&&typeof value!=='number')throw Error('Campo de ficha inválido.');
  out[key]=value;
 }
 if(Object.keys(out).length===0)throw Error('La ficha no contiene datos.');
 return out;
}
async function check(sb,profile){
 if(typeof sb?.auth?.getUser!=='function')throw Error('Falta una sesión autenticada.');
 const u=await sb.auth.getUser();
 const userId=u?.data?.user?.id;
 if(u?.error)throw Error('No se verificó la sesión.');
 identity(profile,userId);
 const pilot=await loadPilotParticipationReceipt(sb);
 if(!pilot.accepted||pilot.userId!==userId)throw Error('Confirmá antes las dos opciones del piloto.');
 return userId;
}
async function readCurrent(sb,userId,org){
 const q=await sb.from('efg_coach_relaunch_intakes')
  .select('student_id,organization_id,completed_version,revision,shared_at,updated_at,objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,eating_window,preferred_foods,disliked_foods,meal_routine,notes')
  .eq('student_id',userId).eq('completed_version',COACH_RELEASE_INTAKE_VERSION).maybeSingle();
 if(q.error)throw Error('No se pudo recuperar tu ficha nueva.');
 const row=q.data||null;
 if(row&&(row.student_id!==userId||row.organization_id!==org||
  row.completed_version!==COACH_RELEASE_INTAKE_VERSION||
  !Number.isSafeInteger(row.revision)||row.revision<1))
  throw Error('La ficha recibida no pertenece a tu sesión actual.');
 return row;
}
export async function loadCoachPilotGeneralIntake(sb,{profile}={}){
 const userId=await check(sb,profile);
 return {userId,intake:await readCurrent(sb,userId,profile.organization_id)};
}
export async function submitCoachPilotGeneralIntake(sb,{profile,payload,shareWithCoach=true,
 expectedRevision=0,explicitSubmit=false}={}){
 if(explicitSubmit!==true)throw Error('La ficha requiere confirmación expresa.');
 const general=fieldsOnly(payload);
 if(typeof shareWithCoach!=='boolean'||!Number.isSafeInteger(expectedRevision)||
  expectedRevision<0)throw Error('Permisos o versión de ficha inválidos.');
 const userId=await check(sb,profile);
 const before=await readCurrent(sb,userId,profile.organization_id);
 if((before?.revision??0)!==expectedRevision)
  throw Error('La ficha cambió en otro dispositivo: volvé a cargarla.');
 const res=await sb.rpc('efg_submit_coach_relaunch_intake',{
  p_completed_version:COACH_RELEASE_INTAKE_VERSION,p_payload:general,
  p_expected_revision:expectedRevision,p_share_with_coach:shareWithCoach
 });
 if(res.error)throw Error(res.error.code==='PT409'?'La ficha cambió mientras la editabas. Volvé a cargarla.':'No fue posible guardar la ficha nueva.');
 if(res.data!==expectedRevision+1)throw Error('El servidor no confirmó la nueva revisión.');
 const after=await readCurrent(sb,userId,profile.organization_id);
 if(after?.revision!==res.data||Boolean(after.shared_at)!==shareWithCoach)
  throw Error('No se pudo verificar que la ficha y el permiso quedaron guardados.');
 return {userId,intake:after,shared:shareWithCoach,medicalConsent:false};
}
