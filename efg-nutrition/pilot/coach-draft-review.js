import {COACH_VERSIONED_INTAKE_ENABLED} from "./coach-versioned-mode.js";
// EFG Nutrition Pro · Coach NUT-50 review contract (pure; no DB, no medical safety claims).
// A persisted draft must match the exact currently edited goal and guide.
// The RPC still revalidates identity, intake revision, evidence and legal consent.
import {validateCoachPlanProposal} from "./coach-plan-draft-client.js";
import {COACH_RELEASE_INTAKE_VERSION} from "./coach-relaunch-onboarding.js";

// COACH-RELEASE-REV-01: the intake revision is authoritative when the new
// versioned Coach onboarding is active. Identical timestamps are NOT enough:
// two edits can share a timestamp or a stale response may be replayed.
// This is only a UI guard; the server still has to recheck the revision in RPC.
export function coachDraftSourceCurrent(intake,savedDraft,{
 versioned=COACH_VERSIONED_INTAKE_ENABLED
}={}){
 if(!intake?.shared_at||!intake.updated_at||
    !savedDraft||savedDraft.source_intake_updated_at!==intake.updated_at)
  return false;
 if(!versioned)return true; // Preserve legacy Coach flow while feature is OFF.
 return intake.completed_version===COACH_RELEASE_INTAKE_VERSION&&
   Number.isSafeInteger(intake.revision)&&intake.revision>=1&&
   Number.isSafeInteger(savedDraft.source_intake_revision)&&
   savedDraft.source_intake_revision===intake.revision;
}

function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
export function assessCoachDraftPublication({studentId,intake,savedDraft,goal,guide,
 versioned=COACH_VERSIONED_INTAKE_ENABLED}={}){
 const no=(reason)=>({ready:false,reason});
 if(!studentId||!intake?.shared_at)return no("La ficha ya no está compartida con este coach.");
 if(!savedDraft||savedDraft.student_id!==studentId||savedDraft.status!=="draft"||
    !Number.isSafeInteger(savedDraft.draft_revision)||savedDraft.draft_revision<1)
  return no("Todavía no existe un borrador privado guardado para este alumno.");
 if(!coachDraftSourceCurrent(intake,savedDraft,{versioned}))
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

/** Confirm the actual server record, never just a local revision counter. */
export function verifyCoachDraftReadback({studentId,intake,savedDraft,expectedRevision,goal,guide,
 versioned=COACH_VERSIONED_INTAKE_ENABLED}={}){
 const match=assessCoachDraftPublication({studentId,intake,savedDraft,goal,guide,versioned});
 if(!match.ready||match.revision!==expectedRevision)
  throw Error("No se pudo confirmar el contenido y la revisión del borrador en el servidor. Abrí la ficha nuevamente antes de publicar.");
 // JSONB returned from the server must not retain a mutable reference to the editor.
 return structuredClone(savedDraft);
}

/** Ignore asynchronous results after switching student, session or intake view. */
export function coachDraftWorkspaceCurrent({state,studentId,intake,sessionUserId,previousDraft}={}){
 return !!(state?.session?.user?.id&&state.session.user.id===sessionUserId&&
  state.selectedStudent===studentId&&
  state.coachIntakeForms?.[studentId]===intake&&
  state.coachPlanDraftRecord===previousDraft&&state.consent?.accepted===true);
}
