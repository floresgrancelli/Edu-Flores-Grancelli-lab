// PR37 safety stopgap — fail closed for every cohort with the new plan-access schema.
// This is a CLIENT guard against accidental early writes, NOT backend authorization.
// The final release must save goal+guide as draft and publish atomically in a reviewed RPC.
const SCHEMA_MISSING=new Set(["42P01","PGRST205"]);
export async function assertCoachGoalWriteSafe(sb,{studentId,fromSharedIntake=false}={}){
 if(!sb?.from||typeof studentId!=="string"||!studentId.trim())
  throw new Error("No se pudo verificar a qué alumno corresponde la propuesta.");
 const {data,error}=await sb.from("efg_student_plan_access").select("student_id,status").eq("student_id",studentId).maybeSingle();
 if(error){
  if(SCHEMA_MISSING.has(String(error.code))&&!fromSharedIntake)return {legacy:true};
  if(SCHEMA_MISSING.has(String(error.code)))
   throw new Error("Objetivo no guardado: la ficha compartida necesita el backend de borradores y aprobación antes de activarse.");
  throw error; // Never infer 'legacy' from connection, RLS, or other database failures.
 }
 // An absent row is NOT proof of an old account once the new schema exists.
 // Published legacy users with a row must also preserve their previously approved goal.
 throw new Error("Objetivo no guardado: falta el circuito transaccional de borrador, aprobación de guía y publicación. La meta vigente del alumno permanece intacta.");
}
