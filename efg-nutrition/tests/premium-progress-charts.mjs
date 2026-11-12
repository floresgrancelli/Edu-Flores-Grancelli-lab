import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("efg-nutrition/pilot/progress-charts.js","utf8");
const {summarizeLog,progressDashboard,recordedProgress}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const example={log_day:"2026-10-27",meals:{
 desayuno:[{k:300,p:20,c:35,f:10,fi:4}],
 media_manana:[],almuerzo:[{k:600,p:50,c:50,f:20,fi:7}],
 media_tarde:[],merienda:[{k:240,p:15,c:20,f:10,fi:2}],cena:[{k:500,p:45,c:40,f:15,fi:6}]
},sports:[],skipped:{}};
const goal={kcal:2000,protein_g:145,carb_g:210,fat_g:70,fiber_g:30};
const sum=summarizeLog(example);
assert.equal(sum.totals.k,1640);
assert.equal(sum.totals.p,130);
assert.equal(sum.slotTotals.length,6);
const skipped=summarizeLog({...example,skipped:{almuerzo:true}});
assert.equal(skipped.totals.k,1040);
const rendered=progressDashboard([example],[goal],7,"2026-10-27",()=>goal);
for(const marker of ["Energía y macronutrientes","Objetivos nutricionales","Constancia de registro","Energía por comida","1.640","Semana","Mes","90 días",'data-progress-range="7"','data-progress-range="30"',"Desayuno","Cena"])assert.ok(rendered.includes(marker),"Missing "+marker);
assert.ok(!rendered.includes("masa muscular")&&!rendered.includes("grasa corporal"));
const noData=progressDashboard([],[],30,"2026-10-27",()=>null);
assert.ok(noData.includes("Todavía no hay comidas registradas"));
assert.ok(noData.includes("0 de 30 días"));
assert.ok(!noData.includes("1640"));
const noGoal=progressDashboard([example],[],7,"2026-10-27",()=>null);
assert.ok(noGoal.includes("El coach todavía no estableció"));
const old=progressDashboard([example],[goal],7,"2026-11-20",()=>goal);
assert.ok(old.includes("Todavía no hay comidas registradas"));
console.log("Premium 3.3 chart contracts passed: real logs, skipped meals, goals, missing data, 7/30/90 filters.");

const duplicate={...example,meals:{desayuno:[{k:100}]}};
const emptyDay={log_day:'2026-10-26',meals:{},sports:[]};
const omitted={log_day:'2026-10-25',meals:{desayuno:[{k:100}]},skipped:{desayuno:true}};
const supplement={log_day:'2026-10-24',meals:{},sports:[{k:80}]};
assert.deepEqual(recordedProgress([example,duplicate,emptyDay,omitted,supplement,{...example,log_day:'2026-09-01'},{...example,log_day:'2026-10-28'}],7,'2026-10-27'),{days:7,recordedDays:2,meals:1,lastDate:'2026-10-27'});
assert.deepEqual(recordedProgress([],30,'2026-10-27'),{days:30,recordedDays:0,meals:0,lastDate:null});
const spaced=[1,3,5,7,9,11,13].map(d=>({...example,log_day:'2026-10-'+String(d).padStart(2,'0')}));
assert.equal(recordedProgress(spaced,30,'2026-10-27').recordedDays,7);
assert.ok(progressDashboard(spaced,[],30,'2026-10-27',()=>null).includes('siete días con registros'));
const hidden=progressDashboard([example],[],7,'2026-10-27',()=>null,'student',{showHighlights:false});
assert.ok(hidden.includes('Mostrar reconocimientos'));
assert.ok(!hidden.includes('ncc-progress-facts'));
assert.ok(!progressDashboard([example],[],7,'2026-10-27',()=>null,'coach').includes('ncc-progress-highlights'));
console.log('EV07: duplicate dates, empty/omitted days, supplements, range boundaries and optional recognitions passed.');
