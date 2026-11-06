// SPORT-STEP-03 · premium walking steps UI, shared by Mi progreso and Deportes.
// No account writes: caller saves the checked fields in efg_activities.
import {WALKING_PACES,estimateWalkingSteps,estimateStoredWalkingActivity} from './walking-steps-estimator.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
const n=(x,dp=0)=>Number(x).toLocaleString('es-AR',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const fmt=(x)=>typeof x==='number'&&Number.isFinite(x)?String(x):'';
const html=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS=['Entrenamiento de fuerza','Running','Cardio','Caminata','Otro'];
const val=(doc,id)=>doc.getElementById(id)?.value??'';
function optionalWalkingDecimal(doc,id,min,max,places=2){
 const raw=val(doc,id).trim().replace(',','.');
 if(!raw)return null;
 const value=Number(raw),scale=10**places;
 if(!Number.isFinite(value)||value<min||value>max||
    Math.abs(value*scale-Math.round(value*scale))>1e-6)
  throw Error(id==='activityDistanceKm'?'Distancia inválida: ingresá km entre 0,01 y 100.':'Revisá el valor.');
 return value;
}
function optionalWalkingInt(doc,id,min,max){
 const raw=val(doc,id).trim();
 if(!raw)return null;
 if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||
    Number(raw)<min||Number(raw)>max)
  throw Error(id==='activityWalkingMinutes'?
   'Ingresá minutos de caminata entre 1 y 1.440.':
   'La frecuencia cardíaca media debe estar entre 35 y 220 lpm.');
 return Number(raw);
}
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
 const distanceKm=optionalWalkingDecimal(doc,'activityDistanceKm',0.01,100);
 const durationMinutes=optionalWalkingInt(doc,'activityWalkingMinutes',1,1440);
 const avgHeartRateBpm=optionalWalkingInt(doc,'activityHeartRateBpm',35,220);
 const hasWalk=steps>0||distanceKm!==null||durationMinutes!==null;
 if(avgHeartRateBpm!==null&&!hasWalk)
  throw Error('Para registrar pulsaciones de caminata, ingresá pasos, distancia o minutos.');
 if(!Object.hasOwn(WALKING_PACES,pace))throw Error('Seleccioná un ritmo de caminata válido.');
 const kind=val(doc,'activityKind');
 if(!KINDS.includes(kind))throw Error('El tipo de actividad no es válido.');
 return Object.freeze({steps,exercise_minutes:exerciseMinutes,kind,
  walking_pace:hasWalk?pace:null,
  walking_height_cm:hasWalk?heightCm:null,
  walking_weight_kg:hasWalk?weightKg:null,
  walking_distance_km:hasWalk?distanceKm:null,
  walking_duration_minutes:hasWalk?durationMinutes:null,
  walking_avg_heart_rate_bpm:hasWalk?avgHeartRateBpm:null,
  estimate:estimateWalkingSteps({steps,pace:hasWalk?pace:null,
   heightCm:hasWalk?heightCm:null,weightKg:hasWalk?weightKg:null,
   distanceKm,durationMinutes,avgHeartRateBpm})});
}
export function walkingEstimateMarkup(estimate){
 if(!estimate)return '<div class="efg-walk-empty">Completá pasos, distancia o minutos para ver la estimación.</div>';
 return '<div class="efg-walk-kpis" aria-label="Resumen aproximado de caminata">'+
  '<div><span>'+(estimate.distanceSource==='reported'?'Distancia ingresada':'Distancia estimada')+'</span><strong>'+n(estimate.distanceKm,2)+' <small>km</small></strong></div>'+
  '<div><span>'+(estimate.durationSource==='reported'?'Tiempo ingresado':'Duración estimada')+'</span><strong>'+(estimate.durationMinutes===null?'—':n(estimate.durationMinutes))+' <small>min</small></strong></div>'+
  '<div><span>Calorías activas</span><strong>'+(estimate.activeKcal===null?'—':n(estimate.activeKcal))+' <small>kcal</small></strong></div></div>'+
  '<p class="pilot-hint">'+(estimate.activeKcal===null?
    (estimate.invalidWalkingSpeed?'La distancia y el tiempo implican un ritmo que no corresponde a caminata; revisá esos datos.':
     estimate.distanceKm===0?'Ingresá pasos, km o minutos para calcular movimiento.':
     'Para estimar calorías activas, indicá el peso y el ritmo de caminata.'):
    'Calorías activas netas aproximadas: no incluyen el gasto en reposo ni modifican el objetivo de alimentación.')+'</p>'+
  '<p class="pilot-hint">'+(estimate.distanceSource==='reported'?'Se usa la distancia que ingresaste; no se vuelve a calcular desde pasos.':
   estimate.distanceSource==='steps_estimated'?
    (estimate.usedDefaultStepLength?'Distancia orientativa: 70 cm por paso. Agregá altura para personalizar.':
     'Distancia inferida: longitud aproximada '+n(estimate.stepLengthCm,1)+' cm por paso.') :
    estimate.distanceSource==='pace_inferred'?'Distancia aproximada a partir del tiempo y ritmo elegido.':
     'Sin caminata registrada.')+
   (estimate.heartRateBpm!==null?' · FC media: '+n(estimate.heartRateBpm)+' lpm (informativa, no se usa para ajustar kcal).':'')+
   ' Evitá sumar estas kcal otra vez al gasto estimado por tu actividad diaria.</p>';
}
export function renderWalkingActivityCard({todayActivity=null,lastWeightKg=null}={}){
 const a=todayActivity||{};
 const selectedPace=Object.hasOwn(WALKING_PACES,a.walking_pace)?a.walking_pace:'moderate';
 const steps=a.steps===null||a.steps===undefined?'':fmt(Number(a.steps));
 const minutes=a.exercise_minutes===null||a.exercise_minutes===undefined?'':fmt(Number(a.exercise_minutes));
 const height=a.walking_height_cm===null||a.walking_height_cm===undefined?'':fmt(Number(a.walking_height_cm));
 const weight=a.walking_weight_kg!==null&&a.walking_weight_kg!==undefined?fmt(Number(a.walking_weight_kg)):
  (lastWeightKg!==null&&Number.isFinite(Number(lastWeightKg))?fmt(Number(lastWeightKg)):'');
 const distance=a.walking_distance_km==null?'':fmt(Number(a.walking_distance_km));
 const walkingMinutes=a.walking_duration_minutes==null?'':fmt(Number(a.walking_duration_minutes));
 const heartRate=a.walking_avg_heart_rate_bpm==null?'':fmt(Number(a.walking_avg_heart_rate_bpm));
 const kind=KINDS.includes(a.kind)?a.kind:'Caminata';
 let preview=null;
 try{preview=steps===''&&distance===''&&walkingMinutes===''?null:estimateWalkingSteps({steps:steps===''?0:Number(steps),
  pace:selectedPace,heightCm:height===''?null:Number(height),weightKg:weight===''?null:Number(weight),
  distanceKm:distance===''?null:Number(distance),durationMinutes:walkingMinutes===''?null:Number(walkingMinutes),
  avgHeartRateBpm:heartRate===''?null:Number(heartRate)});}
 catch(_){}
 return '<section class="card efg-walk-card" aria-labelledby="efgWalkTitle">'+
  '<div class="efg-walk-heading"><div><span class="eyebrow">ACTIVIDAD · MOVIMIENTO</span><h2 id="efgWalkTitle">👟 Mi caminata y pasos</h2><p>Registrá lo que sepas: pasos, kilómetros, tiempo y pulso. Calculamos un gasto aproximado.</p></div><span class="efg-walk-emblem" aria-hidden="true">↗</span></div>'+
  '<div class="pilot-form"><div class="field-row">'+
  '<div class="field"><label for="activitySteps">Pasos del día</label><input id="activitySteps" type="number" min="0" max="100000" step="1" inputmode="numeric" placeholder="Ej.: 8000" value="'+html(steps)+'"></div>'+
  '<div class="field"><label for="activityPace">Ritmo de caminata</label><select id="activityPace">'+
  Object.entries(WALKING_PACES).map(([key,p])=>'<option value="'+key+'"'+(selectedPace===key?' selected':'')+'>'+p.label+' · '+n(p.kmh,1)+' km/h</option>').join('')+'</select></div></div>'+
  '<div class="field-row">'+
  '<div class="field"><label for="activityDistanceKm">Distancia real (km) · opcional</label><input id="activityDistanceKm" type="number" min="0.01" max="100" step="0.01" inputmode="decimal" placeholder="Ej.: 5.2" value="'+html(distance)+'"></div>'+
  '<div class="field"><label for="activityWalkingMinutes">Minutos caminados · opcional</label><input id="activityWalkingMinutes" type="number" min="1" max="1440" step="1" inputmode="numeric" placeholder="Ej.: 65" value="'+html(walkingMinutes)+'"></div></div>'+
  '<div class="field-row"><div class="field"><label for="activityHeightCm">Altura (cm) · opcional</label><input id="activityHeightCm" type="number" inputmode="decimal" min="100" max="250" step="0.1" placeholder="Mejora distancia" value="'+html(height)+'"></div>'+
  '<div class="field"><label for="activityWeightKg">Peso (kg) · para calorías</label><input id="activityWeightKg" type="number" inputmode="decimal" min="20" max="400" step="0.1" placeholder="Ej.: 78" value="'+html(weight)+'"></div></div>'+
  '<div class="field"><label for="activityHeartRateBpm">Frecuencia cardíaca media (lpm) · opcional</label><input id="activityHeartRateBpm" type="number" min="35" max="220" step="1" inputmode="numeric" placeholder="Ej.: 118" value="'+html(heartRate)+'"><small>Se registra como referencia; no cambia el cálculo de calorías.</small></div>'+
  '<div class="efg-walk-preview" id="walkingActivityPreview" role="status" aria-live="polite">'+walkingEstimateMarkup(preview)+'</div>'+
  '<details class="efg-walk-details"><summary>Más detalles de ejercicio</summary><div class="field-row">'+
  '<div class="field"><label for="activityMinutes">Minutos de otro ejercicio</label><input id="activityMinutes" type="number" min="0" max="1440" step="1" inputmode="numeric" placeholder="Ej.: 60" value="'+html(minutes)+'"></div>'+
  '<div class="field"><label for="activityKind">Tipo de entrenamiento</label><select id="activityKind">'+
  KINDS.map(k=>'<option'+(kind===k?' selected':'')+'>'+html(k)+'</option>').join('')+'</select></div></div>'+
  '<p class="pilot-hint">Los minutos de ejercicio quedan como registro independiente. No sumamos la caminata dos veces.</p></details>'+
  '<button type="button" class="btn block" data-act="saveActivity">Guardar pasos y actividad</button>'+
  '<p class="pilot-hint">Ingresá distancia o pasos, y si sabés cuánto duró, también minutos. Si cargás km y minutos se usa la velocidad resultante para estimar intensidad; el ritmo elegido sirve cuando falta un dato. Son estimaciones para terreno llano, no mediciones clínicas. El gasto ya puede estar incluido en tu actividad habitual (TDEE).</p></div></section>';
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
 return '<small class="efg-walk-history">'+n(e.distanceKm,2)+(e.distanceSource==='reported'?' km registrados':' km aprox.')+
  (e.paceLabel?' · '+html(e.paceLabel):' · ritmo sin registrar')+
  (e.activeKcal!==null?' · '+n(e.activeKcal)+' kcal activas aprox.':' · kcal sin estimar')+
  (e.heartRateBpm!==null?' · FC '+n(e.heartRateBpm)+' lpm':'')+
  '</small>';
}
