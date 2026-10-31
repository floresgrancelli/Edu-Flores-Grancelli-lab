// COACH-INGRESOS-01: classify a private Coach draft using only signed RLS readback.
// A legacy goal, a local form or a pending invitation is never proof of publication.
export function currentCoachIntakeDraft(draft,intake,{studentId,organizationId,coachId}={}){
 if(!draft||!intake||typeof studentId!=='string'||typeof organizationId!=='string'||
    typeof coachId!=='string')return false;
 return draft.status==='draft'&&Number.isSafeInteger(draft.draft_revision)&&
  draft.draft_revision>=1&&Number.isSafeInteger(draft.source_intake_revision)&&
  draft.source_intake_revision===intake.revision&&
  draft.student_id===studentId&&draft.organization_id===organizationId&&
  draft.coach_id===coachId&&intake.student_id===studentId&&
  intake.organization_id===organizationId&&intake.shared_at!=null&&
  Number.isSafeInteger(intake.revision)&&intake.revision>=1;
}
