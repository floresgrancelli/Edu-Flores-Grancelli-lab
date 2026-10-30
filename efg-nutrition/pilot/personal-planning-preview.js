// NUT-62 · Personal intake -> scientific estimate -> five-meal EDUCATIONAL preview.
// Pure functions only; never stores or transmits health information, never approves a
// goal or generates a medical meal plan. All real Personal access stays OFF.
import {parsePersonalIntake,personalIntakeSafety} from "./personal-intake-draft.js";
import {estimateMacros,ACTIVITY_LEVELS} from "./macro-engine.js";
import {PERSONAL_MEALS} from "./personal-workspace.js";

export const PERSONAL_PLANNING_PREVIEW_ENABLED=false;
export const PERSONAL_PREVIEW_SHARES=Object.freeze([
 {slot:"desayuno",share:.22},
 {slot:"media_manana",share:.13},
 {slot:"almuerzo",share:.29},
 {slot:"media_tarde",share:.14},
 {slot:"cena",share:.22}
]);
const activity=Object.freeze({low:1.2,light:1.35,moderate:1.5});
const keys=["kcal","protein_g","carb_g","fat_g","fiber_g"];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const int=n=>typeof n==="number"&&Number.isInteger(n)&&n>=0;
const spanish=n=>Number(n).toLocaleString("es-AR",{maximumFractionDigits:0});

function shareInteger(total,weights){
 if(!int(total)||total>10000||!Array.isArray(weights)||weights.length!==5||
    weights.some(x=>typeof x!=="number"||!Number.isFinite(x)||x<=0)||
    Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-8)
  throw Error("No se puede distribuir un objetivo sin cinco proporciones válidas.");
 const floor=weights.map(x=>Math.floor(total*x));
 let remainder=total-floor.reduce((a,b)=>a+b,0);
 const rank=weights.map((x,index)=>({index,fraction:total*x-floor[index]}))
  .sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
 for(const item of rank.slice(0,remainder))floor[item.index]++;
 return floor;
}
export function createPersonalPlanningPreview(rawIntake,{explicitPreviewRequest=false}={}){
 if(explicitPreviewRequest!==true)
  throw Error("La vista previa requiere una solicitud expresa; no se calcula al abrir la ficha.");
 const intake=parsePersonalIntake(rawIntake);
 const review=personalIntakeSafety(intake);
 if(review.requiresProfessionalReview)
  throw Error("La ficha declara condiciones o preferencias que requieren revisión profesional; no se calcula una propuesta automática.");
 if(!review.canPreviewGeneralEnergyEstimate)
  throw Error("Completá los datos generales de un adulto y seleccioná un objetivo admitido para obtener una estimación orientativa.");
 // Match the existing evidence-limited engine input bounds, not just the looser
 // intake-form bounds. Missing clinical flags != demonstrated absence of illness.
 if(intake.age_years>90||intake.height_cm<120||intake.height_cm>220||
    intake.weight_kg<35||intake.weight_kg>300||
    !ACTIVITY_LEVELS.some(x=>x.value===activity[intake.activity_level]))
  throw Error("Los datos están fuera del rango validado del estimador; se requiere revisión individual.");
 const estimate=estimateMacros({
  age:intake.age_years,height:intake.height_cm,weight:intake.weight_kg,
  activity:activity[intake.activity_level],sex:intake.sex_for_equation,
  goal:intake.goal,model:"mifflin",recompMode:"deficit05"
 });
 const totals={kcal:estimate.kcal,protein_g:estimate.protein,
  carb_g:estimate.carbs,fat_g:estimate.fat,fiber_g:estimate.fiber};
 const distributions=Object.fromEntries(keys.map(key=>[
  key,shareInteger(totals[key],PERSONAL_PREVIEW_SHARES.map(x=>x.share))
 ]));
 const meals=PERSONAL_PREVIEW_SHARES.map(({slot,share},index)=>({
  slot,label:PERSONAL_MEALS.find(x=>x.id===slot).label,share,
  targets:Object.fromEntries(keys.map(k=>[k,distributions[k][index]]))
 }));
 return Object.freeze({
  previewOnly:true,approved:false,persistent:false,coachAccess:false,
  clinicalClearance:false,canGenerateFoodGuide:false,
  method:"mifflin_st_jeor",goal:intake.goal,
  maintenance:estimate.maintenance,rmr:estimate.rmr,energyFactor:estimate.energyFactor,
  totals,meals,
  warnings:Object.freeze([
   "Estimación inicial para adultos basada en datos autodeclarados; no es una medición ni una prescripción.",
   "No se evaluaron medicación, embarazo, historial de trastornos alimentarios ni otras contraindicaciones no declaradas.",
   "Las porciones son distribuciones aritméticas, no alimentos seleccionados ni horarios obligatorios.",
   "Las necesidades deben contrastarse con evolución, actividad real y revisión profesional cuando corresponda.",
   ...estimate.warnings
  ])
 });
}
export function renderPersonalPlanningPreview(preview){
 if(!preview||preview.previewOnly!==true||preview.approved!==false||
    preview.persistent!==false||preview.coachAccess!==false||
    preview.canGenerateFoodGuide!==false||
    !keys.every(k=>int(preview.totals?.[k]))||
    !Array.isArray(preview.meals)||preview.meals.length!==5||
    !Array.isArray(preview.warnings)||preview.warnings.length<4)
  throw Error("La vista previa no es un resultado verificado de cálculo educativo.");
 const order=PERSONAL_MEALS.map(x=>x.id);
 if(preview.meals.some((m,i)=>m.slot!==order[i]||!keys.every(k=>int(m.targets?.[k])))||
  keys.some(k=>preview.meals.reduce((sum,m)=>sum+m.targets[k],0)!==preview.totals[k]))
  throw Error("Los totales por comida no coinciden con los objetivos.");
 const lines=preview.meals.map(m=>'<tr><th scope="row">'+esc(m.label)+'</th>'+
  '<td>'+spanish(m.targets.kcal)+' kcal</td>'+
  '<td>'+spanish(m.targets.protein_g)+' g</td>'+
  '<td>'+spanish(m.targets.carb_g)+' g</td>'+
  '<td>'+spanish(m.targets.fat_g)+' g</td></tr>').join("");
 return '<section class="efg-self-plan-preview" aria-labelledby="efgSelfPreviewHeading">'+
  '<span class="eyebrow">CÁLCULO DE PRUEBA · SIN GUARDAR</span>'+
  '<h3 id="efgSelfPreviewHeading">Ejemplo orientativo de objetivos</h3>'+
  '<p><strong>'+spanish(preview.totals.kcal)+' kcal</strong> · '+
   spanish(preview.totals.protein_g)+' g de proteínas · '+
   spanish(preview.totals.carb_g)+' g de hidratos · '+
   spanish(preview.totals.fat_g)+' g de grasas · '+
   spanish(preview.totals.fiber_g)+' g de fibra</p>'+
  '<p class="pilot-hint">Mifflin–St Jeor: gasto de reposo estimado '+
   spanish(preview.rmr)+' kcal; mantenimiento aproximado '+
   spanish(preview.maintenance)+' kcal. No se aplicó ninguna etiqueta de alimento apto/prohibido.</p>'+
  '<div class="efg-self-plan-scroll"><table><caption>Reparto ilustrativo en cinco comidas; no implica una dieta prescripta</caption>'+
  '<thead><tr><th>Comida</th><th>Energía</th><th>Proteínas</th><th>Hidratos</th><th>Grasas</th></tr></thead>'+
  '<tbody>'+lines+'</tbody></table></div>'+
  '<ul class="efg-self-plan-disclaimers">'+preview.warnings.map(w=>'<li>'+esc(w)+'</li>').join("")+'</ul>'+
  '<p class="efg-self-muted">Este ejemplo no se envía a un coach, no se guarda como objetivo y no genera una dieta guía automática.</p></section>';
}
