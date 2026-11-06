import assert from 'node:assert/strict';
import {withReportFoodFrequency} from '../pilot/report-food-frequency.js';
import {buildLuxuryWeeklyReport,reportAsStoredText} from '../pilot/weekly-luxury-report.js';
import {buildLuxuryPeriodReport,periodReportAsStoredText} from '../pilot/period-luxury-report.js';
const a='2026-10-30',b='2026-10-31',args={from:a,to:'2026-11-05',friday:'2026-11-06',studentName:'Ficticio',coachName:'Ficticio',days:[a,b].map(date=>({date,hasData:true,closed:true,k:1800,p:100,c:210,f:55,mealCount:2})),goals:[]};
const recipe=name=>({id:'custom-recipe',name});
const logs=[{log_day:a,meals:{breakfast:[recipe('Receta Á ficticia'),recipe('Receta B ficticia')],lunch:[recipe('  RECETA   Á FICTICIA  '),{id:'custom-recipe:99',name:'Receta Á ficticia'},{id:'avena',name:'Avena FICTICIA'}],dinner:[recipe('Omitida')]},skipped:{dinner:true},sports:[recipe('No alimento')]},{log_day:b,meals:{lunch:[recipe('Receta A\u0301 ficticia'),{id:'avena',name:'Avena FICTICIA'}]}},{log_day:'2026-11-06',meals:{lunch:[recipe('Fuera de rango')]}}];
for(const [build,serialize]of [[buildLuxuryWeeklyReport,reportAsStoredText],[buildLuxuryPeriodReport,periodReportAsStoredText]]){
 const old=build({...args,logs}),oldJSON=JSON.stringify(old),corrected=withReportFoodFrequency(old,logs);
 assert.equal(corrected.topFoods.find(x=>x.name==='Receta Á ficticia'&&x.days===2)?.days,2);
 assert.equal(corrected.topFoods.find(x=>x.name==='Receta B ficticia')?.days,1);
 assert.equal(corrected.topFoods.filter(x=>x.name==='Receta Á ficticia').length,2,'Specific recipe ID remains separate from generic name fallback');
 assert.equal(corrected.topFoods.find(x=>x.name==='Avena FICTICIA')?.days,2);
 assert.equal(corrected.topFoods.length,4);assert.equal(JSON.stringify(old),oldJSON,'No mutation of existing snapshot');
 const stored=JSON.parse(serialize(corrected,corrected.conclusion,corrected.flexibleNote));assert.deepEqual(stored.topFoods,corrected.topFoods);
 assert.ok(!stored.topFoods.some(x=>/Omitida|No alimento|Fuera/.test(x.name)));
}
const many=withReportFoodFrequency(buildLuxuryWeeklyReport({...args,logs:[]}),[{log_day:a,meals:{lunch:Array.from({length:9},(_,i)=>({id:String(i),name:'Alimento ficticio '+i}))}}]);assert.equal(many.topFoods.length,5);
console.log('PASS new weekly/period frequency: distinct generic recipes, normalized saved-name fallback, persistent IDs separate, repeated meals count once/date, dates/omitted/sports excluded, top5, historical model not mutated. Homonymous generic recipes cannot be distinguished.');
