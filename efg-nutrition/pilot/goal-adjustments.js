// EFG Nutrition: distribución editorial de macros después de modificar calorías.
// No aplica cambios a la base de datos ni modifica registros históricos.
export function adjustNutritionGoal(base,targetCalories,mode="proportional"){
 if(!base||!["fat_loss","recomp","muscle_gain","maintenance"].includes(base.goal_type))throw new Error("Primero calculá o elegí un plan vigente.");
 const baseline=Number(base.kcal),target=Number(targetCalories);
 if(!Number.isFinite(baseline)||baseline<1200||!Number.isFinite(target)||!Number.isInteger(target)||target<1200||target>10000)throw new Error("Ingresá calorías enteras entre 1200 y 10000; los valores extremos requieren evaluación profesional.");
 if(!["proportional","protect_protein"].includes(mode))throw new Error("Seleccioná una forma de redistribuir macronutrientes.");
 for(const key of ["protein_g","carb_g","fat_g"])if(!Number.isFinite(Number(base[key]))||Number(base[key])<0)throw new Error("El plan inicial no tiene una distribución válida.");
 const ratio=target/baseline;
 const protein=mode==="proportional"?Math.round(Number(base.protein_g)*ratio):Math.round(Number(base.protein_g));
 const fat=mode==="proportional"?Math.round(Number(base.fat_g)*ratio):Math.round(Number(base.fat_g));
 const carbs=Math.round((target-4*protein-9*fat)/4);
 if(protein<0||protein>1000||fat<0||fat>1000||carbs<0||carbs>2000)throw new Error("No se pueden distribuir esos macros con estas calorías. Subí el objetivo o elegí el ajuste proporcional.");
 const energy=protein*4+carbs*4+fat*9;
 if(Math.abs(target-energy)>2)throw new Error("La distribución de macronutrientes no coincide con el objetivo energético.");
 return {
  goal_type:base.goal_type,kcal:target,protein_g:protein,carb_g:carbs,fat_g:fat,
  fiber_g:Math.min(150,Math.round(target*.014)),
  estimation_method:base.estimation_method||null,
  activity_factor:base.activity_factor===undefined?null:base.activity_factor,
  protein_per_kg:null,fat_per_kg:null
 };
}
export function goalForDate(history,day){
 const d=String(day||"");
 return (history||[]).filter(g=>g.start_on<=d).sort((a,b)=>b.start_on.localeCompare(a.start_on)||new Date(b.approved_at)-new Date(a.approved_at))[0]||null;
}
