// Walking energy estimates for Nutrición Con-Ciencia.
// Based on the 2024 Adult Compendium, level-ground walking pace METs.
// Active kcal = (MET - 1) × kg × walking hours: no automatic dietary calorie credit.
// Heart rate is contextual only; it NEVER changes kcal without individual calibration.
// One per-day activity summary; walking time is separate from other exercise minutes.
export const WALKING_PACES=Object.freeze({
 slow:Object.freeze({label:'Suave',kmh:3.5,met:2.8,code:'17152'}),
 moderate:Object.freeze({label:'Moderado',kmh:5.0,met:3.8,code:'17190'}),
 brisk:Object.freeze({label:'Rápido',kmh:6.0,met:4.8,code:'17200'})
});
const valid=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const round=(x,digits)=>Number(x.toFixed(digits));
function paceFromSpeed(kmh){
 // Coarse population-level intensity bands, not personalized HR zones.
 if(kmh<4.2)return WALKING_PACES.slow;
 if(kmh<=5.5)return WALKING_PACES.moderate;
 if(kmh<=7.5)return WALKING_PACES.brisk;
 return null; // Running or contradictory data: never label as walking kcal.
}
export function estimateWalkingSteps({
 steps,pace=null,heightCm=null,weightKg=null,
 distanceKm=null,durationMinutes=null,avgHeartRateBpm=null
}={}){
 if(!Number.isSafeInteger(steps)||steps<0||steps>100000)
  throw Error('Ingresá una cantidad válida de pasos (0 a 100.000).');
 if(heightCm!==null&&!valid(heightCm,100,250))throw Error('La altura debe estar entre 100 y 250 cm.');
 if(weightKg!==null&&!valid(weightKg,20,400))throw Error('El peso debe estar entre 20 y 400 kg.');
 if(pace!==null&&!Object.hasOwn(WALKING_PACES,pace))throw Error('El ritmo de caminata es inválido.');
 if(distanceKm!==null&&!valid(distanceKm,0.01,100))throw Error('La distancia debe estar entre 0,01 y 100 km.');
 if(durationMinutes!==null&&(!Number.isSafeInteger(durationMinutes)||durationMinutes<1||durationMinutes>1440))
  throw Error('Los minutos de caminata deben estar entre 1 y 1.440.');
 if(avgHeartRateBpm!==null&&(!Number.isSafeInteger(avgHeartRateBpm)||avgHeartRateBpm<35||avgHeartRateBpm>220))
  throw Error('La frecuencia cardíaca media debe estar entre 35 y 220 lpm.');
 const stepLengthM=heightCm===null?0.70:heightCm*0.415/100;
 const setting=pace===null?null:WALKING_PACES[pace];
 const stepsDistance=steps>0?steps*stepLengthM/1000:0;
 const haveWalking=steps>0||distanceKm!==null||durationMinutes!==null;
 const distanceSource=distanceKm!==null?'reported':steps>0?'steps_estimated':
  durationMinutes!==null&&setting?'pace_inferred':'none';
 const distance=distanceKm!==null?distanceKm:
  steps>0?stepsDistance:durationMinutes!==null&&setting?setting.kmh*durationMinutes/60:0;
 const durationSource=durationMinutes!==null?'reported':distance>0&&setting?'pace_inferred':'none';
 const minutes=durationMinutes!==null?durationMinutes:
  distance>0&&setting?distance/setting.kmh*60:null;
 const measuredSpeed=minutes!==null&&minutes>0&&distance>0?distance/(minutes/60):null;
 // Use observed distance + elapsed time when both were entered. Else use
 // the chosen pace (including legacy step-only records), without inventing HR zones.
 const measuredIntensity=durationMinutes!==null&&distanceKm!==null;
 const measuredPace=measuredIntensity?paceFromSpeed(measuredSpeed):null;
 const selected=measuredIntensity?measuredPace:setting;
 const activeKcal=haveWalking&&selected&&weightKg!==null&&minutes!==null?
  (selected.met-1)*weightKg*(minutes/60):null;
 return Object.freeze({
  steps,pace,paceLabel:selected?.label??setting?.label??null,
  distanceKm:round(distance,2),
  durationMinutes:minutes===null?null:Math.round(minutes),
  activeKcal:activeKcal===null?null:Math.round(activeKcal),
  usedDefaultStepLength:distanceSource==='steps_estimated'&&heightCm===null,
  stepLengthCm:round(stepLengthM*100,2),
  distanceSource,durationSource,
  heartRateBpm:avgHeartRateBpm,
  speedKmh:measuredSpeed===null?null:round(measuredSpeed,2),
  invalidWalkingSpeed:measuredIntensity&&!measuredPace,
  heartRateAffectsCalories:false,
  met:selected?.met??null,kmh:selected?.kmh??null,
  noAutomaticDietCredit:true
 });
}
export function estimateStoredWalkingActivity(row){
 if(!row||typeof row!=='object')return null;
 const steps=row.steps===null||row.steps===undefined?0:Number(row.steps);
 const distanceKm=row.walking_distance_km==null?null:Number(row.walking_distance_km);
 const durationMinutes=row.walking_duration_minutes==null?null:Number(row.walking_duration_minutes);
 const avgHeartRateBpm=row.walking_avg_heart_rate_bpm==null?null:Number(row.walking_avg_heart_rate_bpm);
 if(!Number.isSafeInteger(steps)||steps<0||steps>100000)return null;
 if(steps===0&&distanceKm===null&&durationMinutes===null)return null;
 const pace=Object.hasOwn(WALKING_PACES,row.walking_pace)?row.walking_pace:null;
 const heightCm=row.walking_height_cm==null?null:Number(row.walking_height_cm);
 const weightKg=row.walking_weight_kg==null?null:Number(row.walking_weight_kg);
 try{return estimateWalkingSteps({steps,pace,heightCm,weightKg,distanceKm,durationMinutes,avgHeartRateBpm});}
 catch(_){return null;}
}
