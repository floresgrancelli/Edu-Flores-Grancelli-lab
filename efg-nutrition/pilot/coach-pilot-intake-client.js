// COACH112: real general-intake client for the optional Coach PILOT, distinct
// from old draft T&C and from clinical/sensitive medical data. OFF in the PWA.
import {COACH_RELEASE_INTAKE_VERSION} from './coach-relaunch-onboarding.js';
import {loadPilotParticipationReceipt} from './pilot-participation-client.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS=new Set(['objective','age_years','height_cm','weight_kg','activity_level',
 'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes']);
const SENSITIVE=new Set(['health_flags','allergy_details','diagnosis','conditions',
 'sibo','lactose_intolerance','celiac','glucose','cholesterol','medications']);
// Mirror the COACH107 server contract for immediate feedback. PostgreSQL
// remains authoritative for ranges, RLS and concurrent revisions.
const OPTIONS={objective:new Set(['fat_loss','recomp','muscle_gain','maintenance','general']),
 activity_level:new Set(['low','light','moderate','high']),
 dietary_pattern:new Set(['omnivore','mediterranean','dash','vegetarian','vegan',
 'pescatarian','flexitarian','portfolio','low_carb','keto','other']),
 eating_window:new Set(['regular','12_12','14_10','16_8'])};
const NUMERIC={age_years:[18,100,true],height_cm:[100,250,false],weight_kg:[20,400,false]};
const LIMITS={preferred_foods:400,disliked_foods:400,meal_routine:400,notes:1000};
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
  if(value!==null){
   if(Object.hasOwn(NUMERIC,key)){
    const [min,max,integer]=NUMERIC[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||
       (integer&&!Number.isInteger(value)))throw Error('Valor numérico de ficha inválido: '+key);
   }else{
    if(typeof value!=='string'||(OPTIONS[key]&&value!==''&&!OPTIONS[key].has(value))||
      (LIMITS[key]!==undefined&&value.length>LIMITS[key]))
      throw Error('Opción o texto de ficha inválido: '+key);
   }
  }
  out[key]=value;
 }
 if(Object.keys(out).length===0)throw Error('La ficha no contiene datos.');
 return out;
}
async function requireSameSession(sb,userId){
 const current=await sb.auth.getUser();
 if(current?.error||current?.data?.user?.id!==userId)
  throw Error('La sesión cambió mientras gestionabas la ficha. Volvé a verificar tu cuenta.');
}
async function check(sb,profile){
 if(typeof sb?.auth?.getUser!=='function')throw Error('Falta una sesión autenticada.');
 const u=await sb.auth.getUser();
 const userId=u?.data?.user?.id;
 if(u?.error)throw Error('No se verificó la sesión.');
 identity(profile,userId);
 const pilot=await loadPilotParticipationReceipt(sb,{expectedOrganizationId:profile.organization_id});
 if(!pilot.accepted||pilot.userId!==userId)throw Error('Confirmá antes las dos opciones del piloto.');
 await requireSameSession(sb,userId);
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
 const intake=await readCurrent(sb,userId,profile.organization_id);
 await requireSameSession(sb,userId);
 return {userId,intake};
}
// Sharing must be an explicit boolean from the current form, never an API default.
export async function submitCoachPilotGeneralIntake(sb,{profile,payload,shareWithCoach,
 expectedRevision=0,explicitSubmit=false}={}){
 if(explicitSubmit!==true)throw Error('La ficha requiere confirmación expresa.');
 const general=fieldsOnly(payload);
 if(typeof shareWithCoach!=='boolean'||!Number.isSafeInteger(expectedRevision)||
  expectedRevision<0)throw Error('Permisos o versión de ficha inválidos.');
 const userId=await check(sb,profile);
 const before=await readCurrent(sb,userId,profile.organization_id);
 if((before?.revision??0)!==expectedRevision)
  throw Error('La ficha cambió en otro dispositivo: volvé a cargarla.');
 await requireSameSession(sb,userId);
 const res=await sb.rpc('efg_submit_coach_relaunch_intake',{
  p_completed_version:COACH_RELEASE_INTAKE_VERSION,p_payload:general,
  p_expected_revision:expectedRevision,p_share_with_coach:shareWithCoach
 });
 if(res.error)throw Error(res.error.code==='PT409'?'La ficha cambió mientras la editabas. Volvé a cargarla.':'No fue posible guardar la ficha nueva.');
 if(res.data!==expectedRevision+1)throw Error('El servidor no confirmó la nueva revisión.');
 const after=await readCurrent(sb,userId,profile.organization_id);
 await requireSameSession(sb,userId);
 if(after?.revision!==res.data||Boolean(after.shared_at)!==shareWithCoach)
  throw Error('No se pudo verificar que la ficha y el permiso quedaron guardados.');
 return {userId,intake:after,shared:shareWithCoach,medicalConsent:false};
}

// Privacy actions use the same authenticated versioned RPC and CAS as editing.
// Only the general-intake fields are sent; plans, diaries and messages are untouched.
export async function manageCoachPilotGeneralIntake(sb,{profile,expectedRevision,
 action,explicitSubmit=false}={}){
 if(explicitSubmit!==true||!['unshare','clear'].includes(action))
  throw Error('Confirmá expresamente el cambio de tu ficha.');
 const {intake}=await loadCoachPilotGeneralIntake(sb,{profile});
 if(!intake||intake.revision!==expectedRevision)
  throw Error('La ficha cambió en otro dispositivo: volvé a cargarla.');
 const payload={};
 for(const key of FIELDS){
  payload[key]=action==='clear'?(key==='eating_window'?'regular':LIMITS[key]?'':null)
   :(intake[key]??(key==='eating_window'?'regular':LIMITS[key]?'':null));
 }
 return submitCoachPilotGeneralIntake(sb,{profile,payload,shareWithCoach:false,
  expectedRevision,explicitSubmit:true});
}
