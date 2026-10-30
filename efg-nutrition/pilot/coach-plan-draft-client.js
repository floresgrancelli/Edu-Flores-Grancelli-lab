// EFG Nutrition Pro · Coach private draft client (PR37, OFF until backend/JWT/legal QA).
// Only the server's RLS and transactional RPC enforce access; UI guards help avoid accidents.
// Never insert new goals or guides directly. No edits to student diary, login or sessions.
import {COACH_RELAUNCH_ONBOARDING_ENABLED} from "./coach-relaunch-onboarding.js";
import {assertCoachReleasePlanWriteAllowed} from "./coach-release-plan-gate.js";
export const COACH_ATOMIC_PLAN_UI_ENABLED=false;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLOTS=new Set(["desayuno","media_manana","almuerzo","merienda","cena"]);
const TYPES=new Set(["fat_loss","recomp","muscle_gain","maintenance"]);
const numBounds={kcal:[1200,10000],protein_g:[0,1000],carb_g:[0,2000],fat_g:[0,1000],fiber_g:[0,150]};
const fieldErr="La propuesta todavía no cumple los requisitos de revisión de la guía.";

export function validateCoachPlanProposal(goal,guide){
 if(!goal||!TYPES.has(goal.goal_type))throw Error(fieldErr);
 const clean={goal_type:goal.goal_type};
 for(const [field,[min,max]] of Object.entries(numBounds)){
  const n=goal[field];
  if(!Number.isInteger(n)||n<min||n>max)throw Error("Revisá "+field+"; los objetivos deben ser números enteros dentro del rango.");
  clean[field]=n;
 }
 if(!guide||guide.kind!=="five_meal_example"||guide.version!==1||
   !Array.isArray(guide.meals)||guide.meals.length!==5)throw Error("La guía debe incluir exactamente cinco comidas.");
 const seen=new Set();
 for(const meal of guide.meals){
  if(!SLOTS.has(meal?.slot)||seen.has(meal.slot)||
    !Array.isArray(meal.items)||meal.items.length<1||meal.items.length>15)throw Error("Revisá las cinco comidas y sus alimentos.");
  seen.add(meal.slot);
  for(const item of meal.items){
   if(typeof item?.id!=="string"||!/^[a-z0-9_-]{1,100}$/i.test(item.id)||
      !["g","ml"].includes(item.unit)||!Number.isFinite(item.qty)||item.qty<=0||item.qty>1000||
      ["k","p","c","f","fi"].some(k=>!Number.isFinite(item[k])||item[k]<0))
    throw Error("Revisá cantidades, unidades y nutrientes de los alimentos.");
  }
 }
 if(guide.supplementNote!==undefined&&
    (typeof guide.supplementNote!=="string"||guide.supplementNote.length>300))
  throw Error("La nota de suplementos supera los 300 caracteres.");
 if(JSON.stringify(guide).length>28000||JSON.stringify(clean).length>7000)throw Error("La propuesta es demasiado extensa.");
 return {goal:clean,guide:structuredClone(guide)};
}

export function createCoachPlanDraftClient({sb,enabled=COACH_ATOMIC_PLAN_UI_ENABLED,relaunchEnabled=COACH_RELAUNCH_ONBOARDING_ENABLED}={}){
 const check=()=>{
  assertCoachReleasePlanWriteAllowed({relaunchEnabled});
  if(enabled!==true)throw Error("Borradores seguros aún no habilitados. El objetivo y la guía existentes permanecen intactos.");
  if(typeof sb?.rpc!=="function"||typeof sb?.from!=="function")
   throw Error("No se pudo verificar la conexión segura.");
 };
 const idCheck=id=>{if(typeof id!=="string"||!UUID.test(id))throw Error("Identificador de alumno inválido.");};
 const currentIntake=async(studentId,expectedUpdatedAt=null)=>{
  const consent=await sb.from("efg_consents").select("accepted").eq("student_id",studentId).maybeSingle();
  if(consent.error)throw consent.error;
  if(consent.data?.accepted!==true)throw Error("El alumno no autorizó el seguimiento.");
  const r=await sb.from("efg_student_intakes")
   .select("student_id,organization_id,updated_at,shared_at,dietary_pattern")
   .eq("student_id",studentId).not("shared_at","is",null).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data?.shared_at||!r.data.updated_at)throw Error("El alumno no compartió una ficha vigente.");
  if(expectedUpdatedAt!==null&&r.data.updated_at!==expectedUpdatedAt)
   throw Error("La ficha fue modificada; abrila nuevamente antes de guardar.");
  return r.data;
 };
 async function load(studentId){
  check();idCheck(studentId);
  await currentIntake(studentId);
  const r=await sb.from("efg_coach_plan_drafts")
   .select("student_id,coach_id,organization_id,source_intake_updated_at,goal_proposal,guide_proposal,draft_revision,status,updated_at")
   .eq("student_id",studentId).maybeSingle();
  if(r.error)throw r.error;
  return r.data||null;
 }
 async function save({studentId,sourceUpdatedAt,goal,guide,expectedRevision=null}={}){
  check();idCheck(studentId);
  if(typeof sourceUpdatedAt!=="string"||!Number.isFinite(Date.parse(sourceUpdatedAt)))
   throw Error("Recargá la ficha compartida antes de preparar el borrador.");
  if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1))
   throw Error("Revisión de borrador inválida.");
  const p=validateCoachPlanProposal(goal,guide);
  await currentIntake(studentId,sourceUpdatedAt);
  const r=await sb.rpc("efg_save_coach_plan_draft",{
   p_student:studentId,p_goal:p.goal,p_guide:p.guide,
   p_intake_updated_at:sourceUpdatedAt,p_expected_revision:expectedRevision
  });
  if(r.error)throw r.error;
  const revision=Number(r.data);
  if(!Number.isSafeInteger(revision)||revision<1)throw Error("El servidor no confirmó la revisión. Volvé a consultar el borrador.");
  return {studentId,revision,sourceUpdatedAt};
 }
 async function publish({studentId,expectedRevision,requestId,confirmed=false}={}){
  check();idCheck(studentId);
  if(confirmed!==true)throw Error("La publicación requiere aprobación explícita del coach.");
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)
   throw Error("La versión del borrador no es válida.");
  if(typeof requestId!=="string"||!UUID.test(requestId))throw Error("Identificador único de publicación inválido.");
  await currentIntake(studentId);
  // The DB rechecks consent, intake/version and reviewed evidence inside ONE transaction.
  const r=await sb.rpc("efg_publish_coach_plan_draft",{
   p_student:studentId,p_expected_revision:expectedRevision,p_request_id:requestId
  });
  if(r.error)throw r.error;
  if(typeof r.data!=="string"||!UUID.test(r.data))
   throw Error("El servidor no confirmó la meta aprobada. Consultá el estado antes de reintentar.");
  return {studentId,goalId:r.data,requestId,revision:expectedRevision};
 }
 return {load,save,publish};
}
