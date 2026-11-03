// NUT-61 · Draft self-reported nutrition intake for independent Personal accounts.
// No network, localStorage, medical diagnosis, food blocking or Coach sharing.
// Not wired: approved legal text, specific sensitive-data consent and vetted backend are required.
export const PERSONAL_INTAKE_ENABLED=false;
export const PERSONAL_INTAKE_GOALS=Object.freeze([
 ["","Todavía no lo definí"],["fat_loss","Reducir grasa corporal"],["recomp","Recomposición corporal"],
 ["muscle_gain","Aumentar masa muscular"],["maintenance","Mantener mi peso"],["general","Mejorar mis hábitos"]
]);
export const PERSONAL_INTAKE_PATTERNS=Object.freeze([
 ["","Sin preferencia definida"],["omnivore","Omnívora"],["mediterranean","Mediterránea"],
 ["vegetarian","Vegetariana"],["vegan","Vegana"],["pescatarian","Pescetariana"],["other","Otra"]
]);
export const PERSONAL_HEALTH_FLAGS=Object.freeze([
 ["celiac","Celiaquía"],["diabetes","Diabetes"],["hypertension","Hipertensión"],
 ["high_cholesterol","Colesterol elevado"],["fatty_liver","Hígado graso"],
 ["food_allergy","Alergia alimentaria"],["lactose_intolerance","Intolerancia a la lactosa"],
 ["sibo","SIBO (confirmado o en estudio; sin dieta automática)"],
 ["kidney_disease","Enfermedad renal"],["other_health","Otra condición que requiere evaluación"]
]);
const html=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const options=(all,value)=>all.map(([code,label])=>'<option value="'+code+'"'+(value===code?' selected':'')+'>'+label+'</option>').join("");
const numOrNull=(value,min,max,field)=>{
 if(value===undefined||value===null||value==="")return null;
 if(typeof value!=="number"&&typeof value!=="string")throw Error("Valor inválido para "+field);
 const n=Number(value);
 if(!Number.isFinite(n)||n<min||n>max)throw Error("Revisá "+field+".");
 return n;
};
const text=(value,limit,field)=>{
 if(value===undefined||value===null)return "";
 if(typeof value!=="string"||value.length>limit)throw Error("Revisá "+field+".");
 return value.trim();
};
const codes=(values,allowed,field)=>{
 if(!Array.isArray(values)||values.length>allowed.length||values.some(x=>typeof x!=="string"||!allowed.includes(x))||
  new Set(values).size!==values.length)throw Error("Selección inválida para "+field+".");
 return [...values];
};
export function parsePersonalIntake(values={}){
 if(!values||typeof values!=="object"||Array.isArray(values))throw Error("Ficha nutricional inválida.");
 const goal=String(values.goal??""),pattern=String(values.dietary_pattern??"");
 if(!PERSONAL_INTAKE_GOALS.some(x=>x[0]===goal)||!PERSONAL_INTAKE_PATTERNS.some(x=>x[0]===pattern))
  throw Error("Objetivo o patrón alimentario no reconocido.");
 const activity=String(values.activity_level??"");
 if(!["","low","light","moderate"].includes(activity))throw Error("Actividad no reconocida.");
 const sex=String(values.sex_for_equation??"");
 if(!["","male","female"].includes(sex))throw Error("Sexo de ecuación no reconocido.");
 const flags=codes(values.health_flags===undefined?[]:values.health_flags,PERSONAL_HEALTH_FLAGS.map(x=>x[0]),"condiciones autodeclaradas");
 const age=numOrNull(values.age_years,18,100,"edad");
 if(age!==null&&!Number.isInteger(age))throw Error("La edad debe indicarse en años enteros.");
 const allergyDetails=text(values.allergy_details,250,"detalle de alergias");
 if(allergyDetails&&!flags.includes("food_allergy"))
  throw Error("Marcá alergia alimentaria antes de añadir un detalle.");
 const intake={
  goal,age_years:age,height_cm:numOrNull(values.height_cm,100,250,"altura"),
  weight_kg:numOrNull(values.weight_kg,20,400,"peso"),activity_level:activity,
  sex_for_equation:sex,dietary_pattern:pattern,health_flags:Object.freeze(flags),
  allergy_details:allergyDetails,
  preferred_foods:text(values.preferred_foods,400,"alimentos preferidos"),
  disliked_foods:text(values.disliked_foods,400,"alimentos no preferidos"),
  meal_routine:text(values.meal_routine,400,"horarios"),
  notes:text(values.notes,800,"observaciones")
 };
 // Explicitly do NOT derive contraindications, treatment, banned foods or nutrition goals.
 // The client must not send medically sensitive values to an unreviewed endpoint.
 return Object.freeze(intake);
}
export function personalIntakeSafety(intake){
 if(!intake||!Array.isArray(intake.health_flags))throw Error("Ficha nutricional incompleta.");
 const flags=new Set(intake.health_flags);
 const needsProfessional=flags.size>0||intake.goal==="general";
 const hasEstimatorInputs=Number.isInteger(intake.age_years)&&intake.age_years>=18&&
  typeof intake.height_cm==="number"&&typeof intake.weight_kg==="number"&&
  !!intake.sex_for_equation&&!!intake.activity_level&&
  ["fat_loss","recomp","muscle_gain"].includes(intake.goal);
 return {requiresProfessionalReview:needsProfessional,automaticGuideAllowed:false,
  canPreviewGeneralEnergyEstimate:hasEstimatorInputs&&!needsProfessional,
  note:needsProfessional?"Las condiciones declaradas necesitan una evaluación individual. No se genera una dieta automática.":
   "La ficha es autodeclarada; cualquier estimación sería orientativa y necesitaría revisión según el caso."};
}
export function renderPersonalIntakeDraft(initial={}){
 const data=parsePersonalIntake(initial);
 const input=(id,label,value,step,min,max)=>'<div class="field"><label for="efgSelf_'+id+'">'+label+' (opcional)</label>'+
  '<input id="efgSelf_'+id+'" type="number" inputmode="decimal" min="'+min+'" max="'+max+'" step="'+step+'" value="'+html(value??"")+'"></div>';
 const select=(id,label,items,value)=>'<div class="field"><label for="efgSelf_'+id+'">'+label+'</label>'+
  '<select id="efgSelf_'+id+'">'+options(items,value)+'</select></div>';
 const textarea=(id,label,value,max)=>'<div class="field"><label for="efgSelf_'+id+'">'+label+'</label>'+
  '<textarea id="efgSelf_'+id+'" maxlength="'+max+'" rows="2">'+html(value)+'</textarea></div>';
 return '<section class="card efg-personal-intake-draft" aria-labelledby="efgSelfIntakeHeading">'+
  '<span class="eyebrow">Nutrición Con-Ciencia · Autogestión</span>'+
  '<h2 id="efgSelfIntakeHeading">Mi ficha nutricional</h2>'+
  '<p>Completá lo que conozcas. No es un diagnóstico y la información sensible no se comparte con ningún coach.</p>'+
  '<div role="note" class="pilot-hint">Esta ficha está en preparación y todavía no se guarda. No ingreses información médica real en esta versión de prueba.</div>'+
  select("goal","Mi objetivo",PERSONAL_INTAKE_GOALS,data.goal)+
  '<div class="field-row">'+input("age","Edad en años",data.age_years,1,18,100)+
  input("height","Altura en centímetros",data.height_cm,.1,100,250)+
  input("weight","Peso en kilogramos",data.weight_kg,.1,20,400)+'</div>'+
  select("activity","Actividad habitual",[["","Elegir actividad"],["low","Mayormente sentado"],["light","Ligera"],["moderate","Moderada"]],data.activity_level)+
  select("sex","Sexo para la ecuación energética (si elegís calcular)",[["","No informado"],["male","Ecuación masculina"],["female","Ecuación femenina"]],data.sex_for_equation)+
  select("diet","Patrón de alimentación",PERSONAL_INTAKE_PATTERNS,data.dietary_pattern)+
  '<fieldset class="efg-self-health"><legend>Condiciones autodeclaradas (opcionales)</legend>'+
  '<p class="pilot-hint">Seleccionar una condición no produce alimentos «permitidos» o «prohibidos». Hace falta evidencia específica revisada.</p>'+
  PERSONAL_HEALTH_FLAGS.map(([code,label])=>'<label class="efg-self-check"><input type="checkbox" name="efgSelfHealth" value="'+code+'"'+
   (data.health_flags.includes(code)?' checked':'')+'><span>'+label+'</span></label>').join("")+'</fieldset>'+
  textarea("allergies","Detalle de alergias, si corresponde",data.allergy_details,250)+
  textarea("preferred","Alimentos que me gustan",data.preferred_foods,400)+
  textarea("disliked","Alimentos que prefiero evitar por gusto",data.disliked_foods,400)+
  textarea("routine","Horarios de mis comidas",data.meal_routine,400)+
  textarea("notes","Otras preferencias no clínicas",data.notes,800)+
  '<p class="pilot-hint">La futura autorización de datos sensibles y los Términos y Privacidad serán acciones separadas y nunca preseleccionadas.</p>'+
  '<p class="efg-self-muted">Vista de formulario de pruebas · sin guardado ni envío de datos</p></section>';
}
