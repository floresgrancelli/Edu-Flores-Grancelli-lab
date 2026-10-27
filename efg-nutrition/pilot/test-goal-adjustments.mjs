// EFG Nutrition — regresión del ajuste de calorías por coach.
// Ejecución: node efg-nutrition/pilot/test-goal-adjustments.mjs
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const code=await readFile(new URL("./goal-adjustments.js",import.meta.url),"utf8");
const {adjustNutritionGoal,goalForDate}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const base={goal_type:"recomp",kcal:2530,protein_g:144,carb_g:345,fat_g:64,fiber_g:35,estimation_method:"mifflin",activity_factor:1.5,approved_at:"2026-09-01T12:00:00Z",start_on:"2026-09-01",id:"historico"};
const proportional=adjustNutritionGoal(base,2200,"proportional");
const protectedGoal=adjustNutritionGoal(base,2200,"protect_protein");
const proteinBalanced=adjustNutritionGoal(base,2200,"protect_protein_balanced");
assert.deepEqual([proportional.kcal,proportional.protein_g,proportional.carb_g,proportional.fat_g],[2200,125,299,56]);
assert.deepEqual([protectedGoal.kcal,protectedGoal.protein_g,protectedGoal.carb_g,protectedGoal.fat_g],[2200,144,262,64]);
assert.deepEqual([proteinBalanced.kcal,proteinBalanced.protein_g,proteinBalanced.carb_g,proteinBalanced.fat_g],[2200,144,287,53]);
// Los hidratos y las grasas disminuyen con factores muy similares. La proteína no cambia.
assert.equal(proteinBalanced.protein_g,base.protein_g);
assert.ok(proteinBalanced.carb_g<base.carb_g && proteinBalanced.fat_g<base.fat_g);
assert.ok(Math.abs(proteinBalanced.carb_g/base.carb_g-proteinBalanced.fat_g/base.fat_g)<.02,"Hidratos y grasas se ajustan proporcionalmente");
for(const g of [proportional,protectedGoal,proteinBalanced]){
 assert.ok(Math.abs(g.kcal-(g.protein_g*4+g.carb_g*4+g.fat_g*9))<=2,"Los macros deben aproximar las calorías");
 assert.ok(!("id" in g)&&!("approved_at" in g)&&!("start_on" in g),"Los datos de identificación e históricos nunca se heredan");
}
assert.deepEqual([base.kcal,base.protein_g,base.carb_g,base.fat_g],[2530,144,345,64],"La meta previa permanece sin cambios");
assert.throws(()=>adjustNutritionGoal(base,1100),"Objetivo demasiado bajo");
assert.throws(()=>adjustNutritionGoal(base,"hola"),"Valor incorrecto");
assert.throws(()=>adjustNutritionGoal({...base,protein_g:260,fat_g:75},1200,"protect_protein"),"Macros no viables");
assert.throws(()=>adjustNutritionGoal({...base,protein_g:330,fat_g:75},1200,"protect_protein_balanced"),"Proteína incompatible con objetivo");
assert.throws(()=>adjustNutritionGoal(base,2200,"unknown_mode"),"No aceptar otros modos");
const revised={...protectedGoal,start_on:"2026-10-26",approved_at:"2026-10-26T22:00:00Z",id:"nuevo"};
assert.equal(goalForDate([revised,base],"2026-10-01").id,"historico","Las fechas pasadas conservan la meta previa");
assert.equal(goalForDate([revised,base],"2026-10-26").id,"nuevo","La nueva meta se aplica desde la fecha aprobada");
const ui=await readFile(new URL("./pilot.js",import.meta.url),"utf8");
assert.ok(ui.includes("previewGoalRevision()")&&ui.includes("approveGoalRevision()"),"Acciones de revisión disponibles");
assert.ok(ui.includes('value="protect_protein_balanced"')&&ui.includes("function revisionModeChoices()"),"El tercer modo aparece en propuesta y revisión");
assert.ok(ui.includes('goalForDate(state.coachGoals,selected.date)'),"Informes históricos usan la meta vigente en la fecha");
assert.ok(ui.includes('.insert({...pending.proposal,student_id:pending.studentId,approved_by:state.session.user.id,start_on:today()})'),"Se insertan metas nuevas sin sobrescribir las anteriores");
console.log("EFG Nutrition: reajuste de calorías, distribución de macros e historial: OK");
