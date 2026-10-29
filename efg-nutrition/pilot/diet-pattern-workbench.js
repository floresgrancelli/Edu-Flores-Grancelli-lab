// EFG Nutrition Pro · future shared Coach / Personal nutrition workbench.
// DRAFT, isolated pure functions. Not wired to production UI/database/medical care.
// Pattern selection is distinct from meal timing; neither silently modifies kcal.
export const DIET_PATTERNS=Object.freeze([
 {id:"balanced",label:"Equilibrada y flexible",review:"general",description:"Patrón variado, ajustable a alimentos y preferencias"},
 {id:"mediterranean",label:"Mediterránea",review:"general",description:"Verduras, legumbres, cereales integrales, aceite de oliva y proteínas variadas"},
 {id:"dash",label:"DASH",review:"needs_nutrient_data",description:"Patrón alimentario que requiere datos reales de sodio y valoración individual"},
 {id:"vegetarian",label:"Vegetariana ovo-lacto",review:"general",description:"Planificación de proteína, hierro, B12 y otros nutrientes"},
 {id:"vegan",label:"Vegana",review:"nutrient_review",description:"Requiere fuente fiable de vitamina B12 y atención a nutrientes esenciales"},
 {id:"pescatarian",label:"Pescetariana",review:"general",description:"Verificar inclusión de pescado/mariscos y alergias"},
 {id:"flexitarian",label:"Flexitariana",review:"general",description:"Predominio vegetal sin exclusión obligatoria de todos los alimentos animales"},
 {id:"portfolio",label:"Portfolio vegetal",review:"needs_nutrient_data",description:"Alimentos vegetales ricos en fibras solubles, frutos secos y proteína vegetal"},
 {id:"low_carb",label:"Moderada en hidratos",review:"professional_individualization",description:"No hay un porcentaje universal de hidratos"},
 {id:"keto",label:"Cetogénica (keto)",review:"clinical_screening",description:"Patrón muy bajo en hidratos; requiere evaluación de seguridad y seguimiento"}
].map(x=>Object.freeze(x)));
export const EATING_WINDOWS=Object.freeze([
 {id:"regular",label:"Sin restricción horaria",hours:null},
 {id:"12_12",label:"12:12",hours:12},
 {id:"14_10",label:"14:10",hours:10},
 {id:"16_8",label:"16:8",hours:8}
].map(x=>Object.freeze(x)));
const modes=["coach","coached_student","personal","admin"];
// Critical: front-end convenience only. UI and REST MUST enforce server-verified
// subscription/care-mode; never infer Personal rights from a student role or URL.
export function capabilitiesFor({role,mode,serverVerifiedPersonal=false}={}){
 if(!modes.includes(mode))return Object.freeze({calculator:false,canApproveStudentPlan:false});
 if(role==="coach"&&mode==="coach")return Object.freeze({calculator:true,canApproveStudentPlan:true});
 if(role==="student"&&mode==="personal"&&serverVerifiedPersonal===true)
  return Object.freeze({calculator:true,canApproveStudentPlan:false});
 return Object.freeze({calculator:false,canApproveStudentPlan:false});
}
export function evaluatePattern({patternId,healthFlags=[],medicationFlags=[],age=null}={}){
 const pattern=DIET_PATTERNS.find(x=>x.id===patternId);
 if(!pattern)throw Error("Patrón alimentario no reconocido.");
 const h=new Set(healthFlags),m=new Set(medicationFlags);
 if(pattern.id!=="keto")return {status:pattern.review,requiresReview:pattern.review!=="general",reasons:[]};
 const reasons=[];
 if(age!==null&&(!Number.isFinite(age)||age<18))reasons.push("Edad menor de 18 años o edad inválida: no ofrecer keto automática.");
 for(const flag of ["pregnancy","lactation","eating_disorder","kidney_disease","type1_diabetes"]){
  if(h.has(flag))reasons.push("Requiere valoración profesional por condición: "+flag);
 }
 if(m.has("sglt2"))reasons.push("SGLT2: evitar patrón cetogénico por riesgo de cetoacidosis.");
 if(h.has("diabetes")||m.has("insulin")||m.has("sulfonylurea"))
  reasons.push("Diabetes o tratamiento hipoglucemiante: evaluar medicación y control clínico.");
 return {status:reasons.length?"blocked_pending_clinical_review":"requires_professional_review",
  requiresReview:true,reasons};
}
const finite=(n)=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
const minute=(hhmm)=>{if(typeof hhmm!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm))
 throw Error("Hora inválida; usar HH:MM.");const [h,m]=hhmm.split(":").map(Number);return h*60+m;};
const time=(minutes)=>String(Math.floor(minutes/60)).padStart(2,"0")+":"+String(minutes%60).padStart(2,"0");
const tenth=(v)=>Math.round(v*10)/10;
export function distributeDailyTargets({targets,windowId="regular",startTime="08:00",mealCount=3,weights=null}={}){
 const keys=["k","p","c","f"];
 if(!keys.every(k=>finite(targets?.[k]))||targets.k<=0)throw Error("Faltan objetivos diarios válidos de energía y macros.");
 const window=EATING_WINDOWS.find(x=>x.id===windowId);
 if(!window)throw Error("Ventana horaria desconocida.");
 if(!Number.isInteger(mealCount)||mealCount<2||mealCount>4)throw Error("Elegí entre dos y cuatro comidas orientativas.");
 const start=minute(startTime),duration=window.hours??(24-start/60);
 const end=start+duration*60;
 // Midnight-crossing schedules need deliberate multi-date diary mapping.
 if(end>1440)throw Error("Ventanas que cruzan medianoche requieren control de fechas del diario.");
 const w=weights??(mealCount===2?[.48,.52]:mealCount===3?[.35,.25,.4]:[.25,.3,.2,.25]);
 if(!Array.isArray(w)||w.length!==mealCount||w.some(x=>!finite(x))||
  Math.abs(w.reduce((a,b)=>a+b,0)-1)>0.000001||w.some(x=>x===0))
  throw Error("La distribución entre comidas debe ser positiva y sumar 100 %.");
 const remainder={...targets};
 const meals=w.map((share,i)=>{
  const total={};
  for(const key of keys){total[key]=i===mealCount-1?tenth(remainder[key]):tenth(targets[key]*share);
   remainder[key]=tenth(remainder[key]-total[key]);}
  let at=start;
  if(mealCount===2)at=start+(i===0?30:duration*60-30);
  if(mealCount===3)at=start+Math.round([0,.5,1-30/(duration*60)][i]*duration*60);
  if(mealCount===4)at=start+Math.round([0,1/3,2/3,1-30/(duration*60)][i]*duration*60);
  return {index:i+1,time:time(at),share,targets:total};
 });
 // Preserve the original kcal/macros exactly (to 0.1) and never infer a deficit.
 const macroKcal=targets.p*4+targets.c*4+targets.f*9;
 return {windowId,startTime,endTime:time(end%1440),mealCount,meals,
  dailyTargets:{...targets},preserved:true,macroEnergyDifference:tenth(macroKcal-targets.k),
  note:"Horario flexible: no sustituye la revisión de objetivos ni prescribe ayuno."};
}
