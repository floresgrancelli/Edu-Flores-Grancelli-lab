// EFG Nutrition Pro · Coach NUT-50 review contract (pure; no DB, no medical safety claims).
// A persisted draft must match the exact currently edited goal and guide.
// The RPC still revalidates identity, intake revision, evidence and legal consent.
import {validateCoachPlanProposal} from "./coach-plan-draft-client.js";

function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
export function assessCoachDraftPublication({studentId,intake,savedDraft,goal,guide}={}){
 const no=(reason)=>({ready:false,reason});
 if(!studentId||!intake?.shared_at)return no("La ficha ya no está compartida con este coach.");
 if(!savedDraft||savedDraft.student_id!==studentId||savedDraft.status!=="draft"||
    !Number.isSafeInteger(savedDraft.draft_revision)||savedDraft.draft_revision<1)
  return no("Todavía no existe un borrador privado guardado para este alumno.");
 if(!intake.updated_at||savedDraft.source_intake_updated_at!==intake.updated_at)
  return no("La ficha del alumno cambió. Volvé a cargarla y revisar el plan.");
 if(!goal||!guide)return no("Primero prepará el objetivo y las cinco comidas.");
 try{
  const current=validateCoachPlanProposal(goal,guide);
  const stored=validateCoachPlanProposal(savedDraft.goal_proposal,savedDraft.guide_proposal);
  if(JSON.stringify(canonical(current))!==JSON.stringify(canonical(stored)))
   return no("Hay cambios sin guardar en el objetivo o la guía. Guardá una nueva revisión antes de publicar.");
 }catch(_){
  return no("La propuesta actual no cumple los requisitos de revisión.");
 }
 return {ready:true,reason:"Borrador coincidente con la versión guardada.",revision:savedDraft.draft_revision};
}
