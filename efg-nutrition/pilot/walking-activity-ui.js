// SPORT-STEP-03 · premium walking steps UI, shared by Mi progreso and Deportes.
// No account writes: caller saves the checked fields in efg_activities.
import {WALKING_PACES,estimateWalkingSteps,estimateStoredWalkingActivity} from './walking-steps-estimator.js';
const n=(x,dp=0)=>Number(x).toLocaleString('es-AR',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const fmt=(x)=>typeof x==='number'&&Number.isFinite(x)?String(x):'';
const html=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS=['Entrenamiento de fuerza','Running','Cardio','Caminata','Otro'];
const val=(doc,id)=>doc.getElementById(id)?.value??'';
function requiredInt(doc,id,min,max){
 const raw=val(doc,id).trim();
 if(raw===''||!/^\d+$/.test(raw))throw Error(id==='activitySteps'?
  'Ingresá los pasos con un número entero.':'Revisá los minutos de ejercicio.');
 const x=Number(raw);
 if(!Number.isSafeInteger(x)||x<min||x>max)
  throw Error(id==='activitySteps'?'Los pasos deben estar entre 0 y 100.000.':'Los minutos deben estar entre 0 y 1.440.');
 return x;
}
function optionalNumber(doc,id,min,max){
 const raw=val(doc,id).trim();
 if(raw==='')return null;
 const x=Number(raw);
 if(!Number.isFinite(x)||x<min||x>max||Math.round(x*10)!==x*10)
  throw Error(id==='activityHeightCm'?'Ingresá una altura válida (100–250 cm).':'Ingresá un peso válido (20–400 kg).');
 return x;
}
export function readWalkingActivityForm(doc){
 if(!doc||typeof doc.getElementById!=='function')throw Error('No se puede leer el registro de movimiento.');
 // Historical workflow also allowed a strength/cardio workout with no steps.
 // Keep that path: blank steps are zero and do NOT imply a walking session.
 const steps=val(doc,'activitySteps').trim()===''?0:requiredInt(doc,'activitySteps',0,100000);
 // Walking duration is calculated independently and never added to exercise_minutes.
 const minutesInput=doc.getElementById('activityMinutes');
 const exerciseMinutes=minutesInput?.value?.trim()?requiredInt(doc,'activityMinutes',0,1440):0;
 const pace=val(doc,'activityPace');
 const heightCm=optionalNumber(doc,'activityHeightCm',100,250);
 const weightKg=optionalNumber(doc,'activityWeightKg',20,400);
 if(!Object.hasOwn(WALKING_PACES,pace))throw Error('Seleccioná un ritmo de caminata válido.');
 const kind=val(doc,'activityKind');
 if(!KINDS.includes(kind))throw Error('El tipo de actividad no es válido.');
 return Object.freeze({steps,exercise_minutes:exerciseMinutes,kind,
  walking_pace:steps>0?pace:null,
  walking_height_cm:steps>0?heightCm:null,
  walking_weight_kg:steps>0?weightKg:null,
  estimate:estimateWalkingSteps({steps,pace:steps>0?pace:null,
   heightCm:steps>0?heightCm:null,weightKg:steps>0?weightKg:null})});
}
export function walkingEstimateMarkup(estimate){
 if(!estimate)return '<div class="efg-walk-empty">Completá los pasos para ver la estimación.</div>';
 return '<div class="efg-walk-kpis" aria-label="Resumen aproximado de caminata">'+
  '<div><span>Distancia</span><strong>'+n(estimate.distanceKm,2)+' <small>km</small></strong></div>'+
  '<div><span>Duración estimada</span><strong>'+(estimate.durationMinutes===null?'—':n(estimate.durationMinutes))+' <small>min</small></strong></div>'+
  '<div><span>Calorías activas</span><strong>'+(estimate.activeKcal===null?'—':n(estimate.activeKcal))+' <small>kcal</small></strong></div></div>'+
  '<p class="pilot-hint">'+(estimate.steps===0?'Todavía no hay pasos registrados.':estimate.activeKcal===null?
    'Indicá tu peso para estimar calorías activas. Sin ritmo, los registros antiguos muestran solo distancia.':
    'Calorías activas netas estimadas según peso, ritmo y tiempo inferido; no incluyen el gasto en reposo.')+'</p>'+
  '<p class="pilot-hint">'+(estimate.usedDefaultStepLength?
   'Distancia usando 70 cm/paso como valor orientativo: ingresá tu altura para personalizar.':
   'Distancia usando una longitud de paso aproximada de '+n(estimate.stepLengthCm,1)+' cm basada en tu altura.')+
  ' No se descuenta nada de tu objetivo calórico ni se suma al gasto del entrenamiento.</p>';
}
export function renderWalkingActivityCard({todayActivity=null,lastWeightKg=null}={}){
 const a=todayActivity||{};
 const selectedPace=Object.hasOwn(WALKING_PACES,a.walking_pace)?a.walking_pace:'moderate';
 const steps=a.steps===null||a.steps===undefined?'':fmt(Number(a.steps));
 const minutes=a.exercise_minutes===null||a.exercise_minutes===undefined?'':fmt(Number(a.exercise_minutes));
 const height=a.walking_height_cm===null||a.walking_height_cm===undefined?'':fmt(Number(a.walking_height_cm));
 const weight=a.walking_weight_kg!==null&&a.walking_weight_kg!==undefined?fmt(Number(a.walking_weight_kg)):
  (lastWeightKg!==null&&Number.isFinite(Number(lastWeightKg))?fmt(Number(lastWeightKg)):'');
 const kind=KINDS.includes(a.kind)?a.kind:'Caminata';
 let preview=null;
 try{preview=steps===''?null:estimateWalkingSteps({steps:Number(steps),
  pace:selectedPace,heightCm:height===''?null:Number(height),weightKg:weight===''?null:Number(weight)});}
 catch(_){}
 return '<section class="card efg-walk-card" aria-labelledby="efgWalkTitle">'+
  '<div class="efg-walk-heading"><div><span class="eyebrow">ACTIVIDAD · MOVIMIENTO</span><h2 id="efgWalkTitle">👟 Mis pasos de hoy</h2><p>Convertí tus pasos en una estimación de kilómetros, minutos y calorías.</p></div><span class="efg-walk-emblem" aria-hidden="true">↗</span></div>'+
  '<div class="pilot-form"><div class="field-row">'+
  '<div class="field"><label for="activitySteps">Pasos del día</label><input id="activitySteps" type="number" min="0" max="100000" step="1" inputmode="numeric" placeholder="Ej.: 8000" value="'+html(steps)+'"></div>'+
  '<div class="field"><label for="activityPace">Ritmo de caminata</label><select id="activityPace">'+
  Object.entries(WALKING_PACES).map(([key,p])=>'<option value="'+key+'"'+(selectedPace===key?' selected':'')+'>'+p.label+' · '+n(p.kmh,1)+' km/h</option>').join('')+'</select></div></div>'+
  '<div class="field-row"><div class="field"><label for="activityHeightCm">Altura (cm) · opcional</label><input id="activityHeightCm" type="number" inputmode="decimal" min="100" max="250" step="0.1" placeholder="Mejora distancia" value="'+html(height)+'"></div>'+
  '<div class="field"><label for="activityWeightKg">Peso (kg) · para calorías</label><input id="activityWeightKg" type="number" inputmode="decimal" min="20" max="400" step="0.1" placeholder="Ej.: 78" value="'+html(weight)+'"></div></div>'+
  '<div class="efg-walk-preview" id="walkingActivityPreview" role="status" aria-live="polite">'+walkingEstimateMarkup(preview)+'</div>'+
  '<details class="efg-walk-details"><summary>Más detalles de ejercicio</summary><div class="field-row">'+
  '<div class="field"><label for="activityMinutes">Minutos de otro ejercicio</label><input id="activityMinutes" type="number" min="0" max="1440" step="1" inputmode="numeric" placeholder="Ej.: 60" value="'+html(minutes)+'"></div>'+
  '<div class="field"><label for="activityKind">Tipo de entrenamiento</label><select id="activityKind">'+
  KINDS.map(k=>'<option'+(kind===k?' selected':'')+'>'+html(k)+'</option>').join('')+'</select></div></div>'+
  '<p class="pilot-hint">Los minutos de ejercicio quedan como registro independiente. No sumamos la caminata dos veces.</p></details>'+
  '<button type="button" class="btn block" data-act="saveActivity">Guardar pasos y actividad</button>'+
  '<p class="pilot-hint">Ritmo moderado preseleccionado: cambialo si caminaste más suave o más rápido. Es una estimación para terreno llano, no una medición GPS. Si tus pasos incluyen running u otras actividades, las calorías pueden variar. El gasto por caminar ya puede estar contemplado en tu nivel de actividad (TDEE).</p></div></section>';
}
export function refreshWalkingActivityPreview(doc){
 const target=doc?.getElementById?.('walkingActivityPreview');
 if(!target)return;
 try{target.innerHTML=walkingEstimateMarkup(readWalkingActivityForm(doc).estimate);}
 catch(err){target.textContent=err.message||'Revisá los datos de caminata.';}
}
export function renderWalkingActivityHistory(row){
 if(!row)return '';
 const e=estimateStoredWalkingActivity(row);
 if(!e)return '';
 return '<small class="efg-walk-history">'+n(e.distanceKm,2)+' km aprox.'+
  (e.paceLabel?' · '+html(e.paceLabel):' · ritmo sin registrar')+
  (e.activeKcal!==null?' · '+n(e.activeKcal)+' kcal activas aprox.':' · kcal sin estimar')+
  '</small>';
}
