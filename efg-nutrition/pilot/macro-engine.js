// EFG Nutrition Pro — estimador orientativo para adultos: sin datos, red ni escrituras.
// Mifflin-St Jeor: estimar energía de reposo; factores orientativos: calibrar con evolución real.
export const ACTIVITY_LEVELS=Object.freeze([
 {value:1.2,label:"Baja · mayormente sentado",detail:"Poco movimiento fuera del trabajo y actividades cotidianas"},
 {value:1.35,label:"Ligera · movimiento cotidiano",detail:"Caminatas o ejercicio ligero, sin actividad sostenida todo el día"},
 {value:1.5,label:"Moderada · ejercicio y movimiento",detail:"Entrenamiento y/o traslados frecuentes, no determinado solo por entrenar"}
]);
export const RECOMP_STRATEGIES=Object.freeze([
 {id:"maintenance",factor:1,label:"Mantenimiento (0%)"},
 {id:"deficit05",factor:.95,label:"Déficit suave (−5%)"},
 {id:"deficit10",factor:.9,label:"Déficit moderado (−10%)"}
]);
const valid=n=>typeof n==="number"&&Number.isFinite(n);
export function estimateMacros({age,height,weight,activity,sex,goal,model="mifflin",proteinPerKg=null,fatPerKg=.9,recompMode="deficit05"}={}){
 if(!valid(age)||age<18||age>90||!valid(height)||height<120||height>220||!valid(weight)||weight<35||weight>300)throw new Error("Completá edad, altura y peso válidos para un adulto.");
 if(!ACTIVITY_LEVELS.some(x=>x.value===activity))throw new Error("Elegí un nivel de actividad ofrecido por la aplicación (hasta 1,50).");
 if(!["male","female"].includes(sex)||!["mifflin","tenhaaf"].includes(model)||!["fat_loss","recomp","muscle_gain"].includes(goal))throw new Error("Seleccioná una ecuación, sexo y objetivo válidos.");
 if(!RECOMP_STRATEGIES.some(x=>x.id===recompMode))throw new Error("Estrategia de recomposición inválida.");
 const proteinFactor=proteinPerKg===null?(goal==="muscle_gain"?1.8:2):Number(proteinPerKg);
 const fatFactor=Number(fatPerKg);
 if(!valid(proteinFactor)||proteinFactor<1.6||proteinFactor>2.2||!valid(fatFactor)||fatFactor<.6||fatFactor>1)throw new Error("Proteína: 1,6–2,2 g/kg; grasas: 0,6–1,0 g/kg. Ajustá al caso individual.");
 const mifflin=10*weight+6.25*height-5*age+(sex==="male"?5:-161);
 const tenHaaf=29.279+11.936*weight+587.728*(height/100)-8.129*age+(sex==="male"?191.027:0);
 const rmr=model==="tenhaaf"?tenHaaf:mifflin,maintenance=Math.round(rmr*activity);
 const coef=goal==="recomp"?RECOMP_STRATEGIES.find(x=>x.id===recompMode).factor:goal==="fat_loss"?.9:1.07;
 const kcal=Math.round(maintenance*coef/10)*10;
 const protein=Math.round(weight*proteinFactor),fat=Math.round(weight*fatFactor),carbs=Math.round((kcal-protein*4-fat*9)/4);
 if(kcal<1400||carbs<0)throw new Error("No alcanza la energía calculada para este reparto de macros. Revisá la propuesta con un profesional.");
 const fiber=Math.round(kcal*.014),fatEnergyPct=fat*9/kcal*100,carbsPerKg=carbs/weight;
 const warnings=[];
 if(fatEnergyPct<20)warnings.push("Grasas por debajo del 20% de la energía: revisá el reparto antes de aprobar.");
 if(fatEnergyPct>35)warnings.push("Grasas por encima del 35% de la energía: revisá calidad, preferencias y reparto.");
 if((goal==="recomp"||goal==="fat_loss")&&carbsPerKg>4.5)warnings.push("Hidratos elevados para una primera propuesta: verificá el gasto estimado y la actividad. No es un límite fisiológico.");
 if(activity===1.5)warnings.push("La actividad moderada no se determina solo por las sesiones de gimnasio: considerá pasos y movimiento de toda la jornada.");
 return {goal,kcal,protein,carbs,fat,fiber,maintenance,rmr,model,proteinFactor,fatFactor,activity,sex,recompMode:goal==="recomp"?recompMode:null,energyFactor:coef,fatEnergyPct,carbsPerKg,warnings};
}
