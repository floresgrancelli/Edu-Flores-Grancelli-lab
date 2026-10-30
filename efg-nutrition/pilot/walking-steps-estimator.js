// SPORT-STEP-01 · conservative estimates for logged DAILY walking steps.
// 2024 Adult Compendium walking level/firm ground: codes 17152,17190,17200.
// https://pacompendium.com/walking/
// NET/active kcal, excluding baseline rest: (MET-1)*mass(kg)*hours.
// No automatic calorie-credit to the diet/TDEE or sports total.
// Individual step length is NOT directly measured: height*0.415 is rough,
// or a 0.70 m population-neutral fallback. Speed/duration are inferred.
export const WALKING_PACES=Object.freeze({
 slow:Object.freeze({label:'Suave',kmh:3.5,met:2.8,code:'17152'}),
 moderate:Object.freeze({label:'Moderado',kmh:5.0,met:3.8,code:'17190'}),
 brisk:Object.freeze({label:'Rápido',kmh:6.0,met:4.8,code:'17200'})
});
const valid=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const round=(x,digits)=>Number(x.toFixed(digits));
export function estimateWalkingSteps({steps,pace=null,heightCm=null,weightKg=null}={}){
 if(!Number.isSafeInteger(steps)||steps<0||steps>100000)
  throw Error('Ingresá una cantidad válida de pasos (0 a 100.000).');
 if(heightCm!==null&&!valid(heightCm,100,250))
  throw Error('La altura debe estar entre 100 y 250 cm.');
 if(weightKg!==null&&!valid(weightKg,20,400))
  throw Error('El peso debe estar entre 20 y 400 kg.');
 if(pace!==null&&!Object.hasOwn(WALKING_PACES,pace))
  throw Error('El ritmo de caminata es inválido.');
 const stepLengthM=heightCm===null?0.70:heightCm*0.415/100;
 const distanceKm=steps*stepLengthM/1000;
 const setting=pace===null?null:WALKING_PACES[pace];
 const durationMinutes=setting&&steps>0?distanceKm/setting.kmh*60:null;
 const activeKcal=setting&&weightKg!==null&&steps>0?
  (setting.met-1)*weightKg*(durationMinutes/60):null;
 return Object.freeze({
  steps,pace,paceLabel:setting?.label??null,
  distanceKm:round(distanceKm,2),
  durationMinutes:durationMinutes===null?null:Math.round(durationMinutes),
  activeKcal:activeKcal===null?null:Math.round(activeKcal),
  usedDefaultStepLength:heightCm===null,
  stepLengthCm:round(stepLengthM*100,2),
  met:setting?.met??null,kmh:setting?.kmh??null,
  noAutomaticDietCredit:true
 });
}
export function estimateStoredWalkingActivity(row){
 if(!row||typeof row!=='object'||row.steps===null||row.steps===undefined)return null;
 const steps=Number(row.steps);
 if(!Number.isSafeInteger(steps)||steps<0||steps>100000)return null;
 const pace=Object.hasOwn(WALKING_PACES,row.walking_pace)?row.walking_pace:null;
 const heightCm=row.walking_height_cm===undefined||row.walking_height_cm===null?null:Number(row.walking_height_cm);
 const weightKg=row.walking_weight_kg===undefined||row.walking_weight_kg===null?null:Number(row.walking_weight_kg);
 try{return estimateWalkingSteps({steps,pace,heightCm,weightKg});}catch(_){return null;}
}
