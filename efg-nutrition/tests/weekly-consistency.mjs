import assert from "node:assert/strict";
import {calculateWeeklyConsistency,classifyNutritionDay,weeklyConsistencyPanel,WEEKLY_RANGES} from "../pilot/weekly-consistency.js";
const day=(date,k,p)=>({log_day:date,meals:{desayuno:[{k,p,c:100,f:40,fi:10}]},sports:[],skipped:{}});
const totals=log=>log.meals.desayuno[0];
const goal={start_on:"2026-10-01",kcal:2000,protein_g:150};
const history=(items,at="2026-10-28",goals=[goal])=>calculateWeeklyConsistency({today:at,logs:items,goals,totalOf:totals,goalForDate:(gs,d)=>gs.filter(g=>g.start_on<=d).at(-1)||null});
assert.equal(WEEKLY_RANGES.ideal,.05);
assert.equal(WEEKLY_RANGES.acceptable,.10);
assert.equal(classifyNutritionDay({k:1900,p:135},goal).status,"ideal","-5% is ideal, protein 90%");
assert.equal(classifyNutritionDay({k:2100,p:135},goal).status,"ideal","+5% is ideal");
assert.equal(classifyNutritionDay({k:1800,p:150},goal).status,"achieved","-10% accepted, not ideal");
assert.equal(classifyNutritionDay({k:2200,p:150},goal).status,"achieved","+10% accepted, not ideal");
assert.equal(classifyNutritionDay({k:2000,p:134.9},goal).status,"outside","protein below 90% blocks both");
assert.equal(classifyNutritionDay({k:1700,p:150},goal).status,"outside","-15% outside");
assert.equal(classifyNutritionDay({k:0,p:150},goal).status,"unavailable","missing intake not counted");
assert.equal(classifyNutritionDay({k:2000,p:150},null).status,"unavailable","no goal not counted");
const score=history([
 day("2026-10-26",2000,150),day("2026-10-27",1850,145),
 day("2026-10-28",2000,150)
]);
assert.equal(score.days.length,6);
assert.deepEqual(score.days.map(x=>x.label),["L","M","X","J","V","S"]);
assert.equal(score.days[0].status,"ideal");
assert.equal(score.days[1].status,"achieved");
assert.equal(score.days[2].status,"today","never award during an unfinished day");
assert.equal(score.days[3].status,"future");
assert.equal(score.ideal,1);
assert.equal(score.acceptable,2,"5% also counts in inclusive 10% track");
assert.equal(score.evaluated,2);
const html=weeklyConsistencyPanel(score);
assert.equal((html.match(/efg-streak-trackhead/g)||[]).length,2);
assert.equal((html.match(/efg-streak-daylabel/g)||[]).length,12,"two bars × Monday-Saturday");
assert.match(html,/ZONA IDEAL/);
assert.match(html,/OBJETIVO CUMPLIDO/);
assert.match(html,/1\/6/);
assert.match(html,/2\/6/);
assert.match(html,/Domingo: alimentación flexible según las indicaciones de tu coach/);
assert.match(html,/Basado en evidencia científica/);
assert.match(html,/bandas prácticas inspiradas en esos hallazgos/);
assert.match(html,/no como límites clínicos universales/);
assert.ok(!html.includes(">D</span>"),"Sunday must never be in six-day bar");
const sunday=history([
 day("2026-10-26",1990,150),day("2026-10-27",1990,150),
 day("2026-10-28",1990,150),day("2026-10-29",1990,150),
 day("2026-10-30",1990,150),day("2026-10-31",1990,150),
 day("2026-11-01",1990,150)
],"2026-11-01");
assert.equal(sunday.days.length,6);
assert.equal(sunday.ideal,6,"Sunday consumption should not alter six daily prizes");
assert.ok(sunday.hasTodaySunday);
assert.match(weeklyConsistencyPanel(sunday),/Hoy es domingo/);

const unopened=weeklyConsistencyPanel(sunday);
assert.match(unopened,/ABRIR PREMIO/,"6/6 must reveal a premium reward action");
assert.doesNotMatch(unopened,/autorizó expresamente/,"No automatic permission before opening reward");
const revealedNoPermission=weeklyConsistencyPanel(sunday,{opened:true,verified:false,approved:true});
assert.match(revealedNoPermission,/NO constituye una autorización automática/,"Unverified approval must be ignored");
assert.doesNotMatch(revealedNoPermission,/Tu coach autorizó expresamente/);
const revealedByCoach=weeklyConsistencyPanel(sunday,{opened:true,verified:true,approved:true});
assert.match(revealedByCoach,/Tu coach autorizó expresamente/,"Verified coach approval is required");
assert.match(revealedByCoach,/aria-live="polite"/,"Reward is announced accessibly");
assert.match(weeklyConsistencyPanel(score,{opened:true,verified:true,approved:true}),/2\/6/);
assert.doesNotMatch(weeklyConsistencyPanel(score,{opened:true,verified:true,approved:true}),/ABRIR PREMIO/,"No early reward");
assert.doesNotMatch(unopened,/penalizad[oa]|castigo/i,"A reward is not a penalty");

const noData=history([day("2026-10-26",1990,150)],"2026-10-29",[]);
assert.equal(noData.ideal,0);
assert.equal(noData.acceptable,0);
assert.equal(noData.evaluated,0,"no coach-approved goal, no award");
const changedGoals=history([day("2026-10-26",2100,150),day("2026-10-27",2000,150)],"2026-10-28",[
 {start_on:"2026-10-01",kcal:2100,protein_g:150},
 {start_on:"2026-10-27",kcal:2000,protein_g:150}
]);
assert.equal(changedGoals.ideal,2,"Historical day uses effective goal, not today's target");

const professionalReward=weeklyConsistencyPanel(sunday,{personal:true,opened:true,verified:true,approved:true});
assert.match(professionalReward,/Reconocimiento personal por tu constancia semanal/);
assert.doesNotMatch(professionalReward,/Tu coach autorizó expresamente/,"A coach cannot grant themselves free meals");
assert.match(professionalReward,/Domingo: descanso de la evaluación semanal/);
const selfGoalNotRetroactive=history([day("2026-10-26",2000,150),day("2026-10-27",2000,150)],"2026-10-28",[
 {start_on:"2026-10-27",kcal:2000,protein_g:150}
]);
assert.equal(selfGoalNotRetroactive.evaluated,1,"Professional personal targets must not be retroactively applied before saved date");
console.log("PASS: independent ±5/±10 Mon–Sat tracks, inclusive nesting, protein ≥90%, Sunday discretionary, provisional today, historical approved goals, no false awards.");
