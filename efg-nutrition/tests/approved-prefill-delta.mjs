// Explicit, narrowly reviewed UI delta. Catalog invariants still freeze all other semantics.
export const OLD_PREFILL_ACTION="  state.coachIntakeGuidePreview=null;\n  state.tab=\"coachStudents\";await render();\n  selectCoachSection(\"coachStudentGoals\");\n";
export const NEW_PREFILL_ACTION="  state.coachIntakeGuidePreview=null;\n  const intakePrefill=state.coachIntakePrefill;\n  state.tab=\"coachStudents\";await render();\n  if(state.tab!==\"coachStudents\"||state.selectedStudent!==studentId||state.coachIntakePrefill!==intakePrefill)return;\n  // Explicitly applying this intake replaces only its mapped fields, after\n  // ordinary same-view draft restoration. Other unsaved controls stay intact.\n  for(const [id,value] of Object.entries(intakePrefill.fields)){\n   const control=root.querySelector(\"#coachPlanObjectives #\"+id);\n   if(control)control.value=value;\n  }\n  selectCoachSection(\"coachStudentGoals\");\n";
export function normalizeApprovedPrefillDelta(source){
 // Exact presentation-only Autogestión tab delta; other changes stay frozen.
 // Approved half-unit validation; retain exact comparison of all other logic.
 return source.replace('!Number.isInteger(next*2)||next<0.5||next>100','!Number.isInteger(next)||next>100').replace("   ['self','Autogestión',[main.querySelector('#nccAdminSelf')]],\n",'').replace(NEW_PREFILL_ACTION,OLD_PREFILL_ACTION).replace(/mealEntryStyles\.href='\.\/day-tools-r1\.css\?v=[A-Za-z0-9_-]+'/g,"mealEntryStyles.href='./day-tools-r1.css'");
}
