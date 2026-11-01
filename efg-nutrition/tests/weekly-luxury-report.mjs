import assert from 'node:assert/strict';
import './weekly-metrics.mjs'; // 05-01/05-03 coverage and historical targets
import './weekly-luxury-editor.mjs';
import {buildLuxuryWeeklyReport,reportAsStoredText,parseLuxuryWeeklyReport,renderLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';
const from='2026-10-23',to='2026-10-29',friday='2026-10-30';
const inputs=[
 ['2026-10-23',1940,140,192,68],
 ['2026-10-24',2110,146,224,70],
 ['2026-10-26',2059,149,215,67],
 ['2026-10-28',2163,142,230,75],
 ['2026-10-29',2178,148,239,70]
];
const days=inputs.map(([date,k,p,c,f])=>({date,k,p,c,f,hasData:true,closed:true}));
const goals=[{start_on:'2026-10-22',kcal:2300,protein_g:150,carb_g:265,fat_g:71}];
const logs=inputs.map(([log_day],i)=>({log_day,meals:{
 desayuno:[{id:'egg',name:'Huevos'},{id:'bread',name:'Pan integral'}],
 almuerzo:[{id:'chicken',name:'Pollo'},{id:i===2?'potato':'rice',name:i===2?'Papa':'Arroz integral'}],
 cena:i<3?[{id:'banana',name:'Banana'}]:[]
}}));
const data={from,to,friday,studentName:'Sofía DEMO',coachName:'Coach EFG DEMO',days,goals,logs};
assert.throws(()=>buildLuxuryWeeklyReport({...data,days:[...days,{...days[0],k:9999}]}),/registros diarios duplicados/);
const model=buildLuxuryWeeklyReport(data);
assert.equal(model.daysRecorded,5);
assert.equal(model.daysClosed,5);
assert.equal(model.days.filter(d=>!d.hasData).length,2);
assert.equal(model.averages.k,2090);
assert.equal(model.averages.p,145);
assert.equal(model.averages.c,220);
assert.equal(model.averages.f,70);
assert.equal(model.targets.k,2300);
assert.equal(model.topFoods[0].days,5);
assert.equal(model.topFoods.some(x=>x.name==='Arroz integral'&&x.days===4),true);
assert.ok(model.focus.some(x=>x.includes('carbohidratos')),'Protein nearly met + carbohydrate deficit => check carbs');
assert.ok(!model.conclusion.toLowerCase().includes('incumplimiento'));
assert.ok(!model.flexibleNote.toLowerCase().includes('merec'));

assert.equal(model.evidence.grade,'orientativa');
assert.match(model.evidence.dataBasis,/5 de 7 días/);
assert.match(model.evidence.dailyGoals,/vigentes en cada fecha/);
assert.match(model.evidence.rule,/NO son umbrales clínicos/);
assert.deepEqual(model.evidence.scientificSources,['ACSM-2016','ISSN-PROTEIN-2017']);
assert.equal(model.evidence.comparisons.energyPct,91);
assert.equal(model.evidence.comparisons.proteinPct,97);
assert.equal(model.evidence.comparisons.carbsPct,83);
assert.match(model.conclusion,/¡Hola, Sofía!/);
assert.match(model.conclusion,/Registraste comidas en 5 de 7 días/);
assert.match(model.conclusion,/2\.090 kcal frente a 2\.300 kcal/);
assert.match(model.conclusion,/no miden por sí solos todo lo que comiste/);
assert.doesNotMatch(model.conclusion,/premio|trampa|culpa por comer|te merecés/i);
assert.match(model.flexibleNote,/helado/);
assert.match(model.flexibleNote,/No hace falta ganárselos ni compensarlos/);

const html=renderLuxuryWeeklyReport(model,{demo:true});
assert.match(html,/MODELO · DATOS FICTICIOS/);
assert.match(html,/5 \/ 7/);
assert.match(html,/2\.090/);
assert.match(html,/Los días sin datos/);
assert.match(html,/¿Cómo llegamos a esta conclusión\?/);
assert.match(html,/Academy\/DC\/ACSM/);
assert.match(html,/10\.1186\/s12970-017-0177-8/);
assert.match(html,/Espacio para disfrutar/);
assert.match(html,/lux-report-flex/);

assert.doesNotMatch(html,/<script|javascript:/);
const payload=reportAsStoredText(model,'Comentario <script>alert(1)</script> del coach','Si disfrutás un postre, es parte de tu flexibilidad.');
const parsed=parseLuxuryWeeklyReport(payload);
assert.equal(parsed.conclusion,'Comentario <script>alert(1)</script> del coach');
assert.doesNotMatch(renderLuxuryWeeklyReport(parsed),/<script>/,'User/coach input must be escaped');
assert.equal(parseLuxuryWeeklyReport('Informe anterior en texto plano'),null);
assert.equal(parseLuxuryWeeklyReport(JSON.stringify({...parsed,approvedByCoach:false})),null);
// 05-01/05-03: malformed historical JSON must not crash MI DÍA or coach history.
const brokenDay={...parsed,days:[null,...parsed.days.slice(1)]};
assert.equal(parseLuxuryWeeklyReport(JSON.stringify(brokenDay)),null);
assert.equal(renderLuxuryWeeklyReport(brokenDay),'');
assert.equal(parseLuxuryWeeklyReport(JSON.stringify({...parsed,averages:{...parsed.averages,k:'2300'}})),null);
assert.equal(parseLuxuryWeeklyReport(JSON.stringify({...parsed,focus:[null]})),null);
assert.equal(parseLuxuryWeeklyReport(JSON.stringify({...parsed,topFoods:[{name:'Pollo',days:-4}]})),null);
assert.throws(()=>reportAsStoredText(brokenDay,'Texto revisado','Disfrutar'),/datos inválidos/);
const duplicateIncomplete={...data,days:[...days,{...days[0],k:null}]};
assert.throws(()=>buildLuxuryWeeklyReport(duplicateIncomplete),/registros diarios duplicados/,
 'Incomplete second copy must not conceal a duplicate date');
assert.throws(()=>reportAsStoredText(model,'',null),/debe revisar/);
assert.throws(()=>buildLuxuryWeeklyReport({...data,to:'2026-10-28'}),/siete días/);
const scant=buildLuxuryWeeklyReport({...data,days:days.slice(0,2)});
assert.match(scant.conclusion,/todavía nos falta información/);
assert.match(scant.conclusion,/un día vacío no significa que no hayas comido/);
assert.equal(scant.evidence.grade,'insuficiente');
assert.equal(scant.evidence.comparisons.energyPct,88);
assert.doesNotMatch(scant.conclusion,/energía registrada quedó por debajo/);
assert.ok(!scant.focus.some(x=>x.includes('carbohidratos')),'Do not suggest macros from two days');
const noGoals=buildLuxuryWeeklyReport({...data,goals:[]});
assert.equal(noGoals.targets.k,null);
assert.ok(!noGoals.focus.some(x=>x.includes('porciones de carbohidratos')),'No unsupported target-based priorities');
const changedGoals=buildLuxuryWeeklyReport({...data,goals:[
 {start_on:'2026-10-22',kcal:2300,protein_g:140,carb_g:270,fat_g:72},
 {start_on:'2026-10-27',kcal:2500,protein_g:160,carb_g:300,fat_g:75}
]});
assert.equal(changedGoals.targets.k,(2300*3+2500*2)/5);
assert.equal(changedGoals.targets.p,(140*3+160*2)/5);

const incomplete=buildLuxuryWeeklyReport({...data,days:days.map((row,i)=>({...row,closed:i<2}))});
assert.equal(incomplete.evidence.grade,'insuficiente');
assert.doesNotMatch(incomplete.conclusion,/proteína registrada se ubicó por debajo/);
const withNoGoalForTwoDays=buildLuxuryWeeklyReport({...data,goals:[
 {...goals[0],start_on:'2026-10-27'}
]});
assert.equal(withNoGoalForTwoDays.targets.k,null);
assert.doesNotMatch(withNoGoalForTwoDays.conclusion,/objetivo promedio vigente en esos días/);


// REPORT-LUX: null/blank measurements are UNKNOWN, not 0 kcal/macros or measured meals.
const absentEnergy=buildLuxuryWeeklyReport({...data,days:days.map((row,i)=>i===0?{...row,k:null}:row)});
assert.equal(absentEnergy.daysRecorded,4,'Null energy must not enter the weekly average as a zero');
assert.equal(absentEnergy.days[0].hasData,false,'Incomplete day must appear without energy values');
assert.equal(absentEnergy.averages.k,(2110+2059+2163+2178)/4);
const blankProtein=buildLuxuryWeeklyReport({...data,days:days.map((row,i)=>i===0?{...row,p:'   '}:row)});
assert.equal(blankProtein.daysRecorded,4,'Blank protein is missing, not zero protein intake');
const absentMealCount=buildLuxuryWeeklyReport({...data,days:days.map((row,i)=>({...row,mealCount:i===0?null:3}))});
assert.equal(absentMealCount.daysWithMeasuredMeals,4,'Null meal count must remain unknown');
assert.equal(absentMealCount.daysWithMultipleMeals,4);
for(const invalid of ['2026-02-30','2026-13-01','2026-00-01']){
 assert.throws(()=>buildLuxuryWeeklyReport({...data,from:invalid}),/Período semanal no válido|siete días/,
  'Invalid calendar date must not be normalized silently');
}

const sparseMeals=buildLuxuryWeeklyReport({...data,days:days.map(d=>({...d,mealCount:1}))});
assert.equal(sparseMeals.daysRecorded,5);
assert.equal(sparseMeals.daysWithMultipleMeals,0);
assert.equal(sparseMeals.evidence.grade,'insuficiente');
assert.doesNotMatch(sparseMeals.conclusion,/La proteína registrada se ubicó/);
const richMeals=buildLuxuryWeeklyReport({...data,days:days.map(d=>({...d,mealCount:3}))});
assert.equal(richMeals.daysWithMultipleMeals,5);
assert.equal(richMeals.evidence.grade,'orientativa');

const bad=buildLuxuryWeeklyReport({...data,studentName:'<img src=x onerror=alert(1)>'});
assert.doesNotMatch(renderLuxuryWeeklyReport(bad),/<img src=x onerror=/,'Student-supplied markup must be escaped; legitimate brand image is allowed');
assert.match(renderLuxuryWeeklyReport(bad),/&lt;img src=x onerror=alert\(1\)&gt;/);
console.log('PASS REPORT-LUX: numbers/goal-by-date, top-food-day, low-data, XSS, legacy, privacy-friendly guidance and serialization.');
