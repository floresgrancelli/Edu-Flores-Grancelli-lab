// EFG Nutrition Pro · Coach intake → existing calculator, pure and backend-free.
// A frontend prefill is NOT proof of authorization; caller must re-read intake
// through server-enforced RLS for the currently selected student on every click.
// No automatic publishing, clinical clearance or inferred physiological sex.
const ACTIVITY={low:1.2,light:1.35,moderate:1.5};
const GOALS=new Set(["fat_loss","recomp","muscle_gain"]);
const numberIn=(v,min,max,integer=false)=>{
 if(v===null||v===undefined||v==="")return null;
 const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max&&(!integer||Number.isInteger(n))?n:null;
};
export function createCoachCalculatorPrefill({intake,studentId,coachAuthorized=false}={}){
 if(!coachAuthorized||typeof studentId!=="string"||!studentId||
    !intake||intake.student_id!==studentId||!intake.shared_at)
  throw Error("No hay una ficha de ese alumno compartida y autorizada para preparar su plan.");
 const warnings=[],fields={};
 const required=[
  ["age_years","targetAge",18,90,true,"edad"],
  ["height_cm","targetHeight",120,220,false,"altura"],
  ["weight_kg","targetWeight",35,300,false,"peso"]
 ];
 for(const [src,target,min,max,integer,label] of required){
  const value=numberIn(intake[src],min,max,integer);
  if(value===null)warnings.push("Falta confirmar "+label+" válida para la calculadora.");
  else fields[target]=String(value);
 }
 if(GOALS.has(intake.objective))fields.targetGoal=intake.objective;
 else warnings.push("El objetivo de la ficha necesita adaptación o confirmación manual; no se transforma en un objetivo distinto.");
 if(Object.hasOwn(ACTIVITY,intake.activity_level)){
  fields.targetActivity=String(ACTIVITY[intake.activity_level]);
  warnings.push("Actividad orientativa tomada de la ficha: revisar trabajo, pasos y entrenamiento para evitar doble conteo.");
 }else warnings.push("El nivel de actividad no tiene equivalencia directa en la calculadora; elegilo manualmente.");
 // The initial intake intentionally does not collect the physiological variable
 // required by this calculation. Never infer it from gender/name/account or text.
 warnings.push("Seleccioná el parámetro fisiológico requerido por la ecuación antes de calcular; no se infiere del nombre.");
 const pattern=intake.dietary_pattern||"unknown";
 const eligibleForGeneralExample=pattern==="omnivore";
 if(!eligibleForGeneralExample)warnings.push(
  "La guía genérica de cinco comidas contiene alimentos animales y no se genera para este patrón sin un motor dietético revisado.");
 else warnings.push("La ficha general no certifica ausencia de alergias o restricciones: la guía será solo un ejemplo para revisar, nunca un menú declarado seguro.");
 const context={
  studentId,fields,objective:intake.objective||null,pattern,
  preferredFoods:String(intake.preferred_foods||"").slice(0,400),
  dislikedFoods:String(intake.disliked_foods||"").slice(0,400),
  mealRoutine:String(intake.meal_routine||"").slice(0,400),
  eligibleForGeneralExample,readyForAutomaticCalculation:false,
  warnings
 };
 return context;
}
export function coachGuidePreviewAllowed(context,{studentId,consent=false}={}){
 return !!(context&&context.studentId===studentId&&consent===true&&context.eligibleForGeneralExample);
}
