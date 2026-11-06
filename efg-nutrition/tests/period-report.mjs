import {normalizeReportTrendGoals,withReportTrendGoals} from '../pilot/report-trend-snapshot.js';
import {withReportFoodFrequency} from '../pilot/report-food-frequency.js';
import {buildLuxuryPeriodReport,renderLuxuryPeriodReport} from '../pilot/period-luxury-report.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildPeriodReport,validateReportPeriod} from '../pilot/period-report.js';
const food={k:100,p:10,c:10,f:2,fi:1},day=date=>({log_day:date,meals:{desayuno:[food]},sports:[]});
const totalOf=()=>food;
const args={from:'2026-10-26',to:'2026-11-04',today:'2026-11-04',studentName:'QA',totalOf};
const report=buildPeriodReport({...args,logs:[day('2026-10-25'),day('2026-10-26'),day('2026-11-04'),day('2026-11-05')]});
assert.equal(report.days,10);assert.equal(report.daysRecorded,2);assert.equal(report.averages.k.value,100);assert.match(report.text,/hoy sigue en curso/);assert(report.text.length<2000);
assert.throws(()=>validateReportPeriod('2026-11-04','2026-10-26',args.today));assert.throws(()=>validateReportPeriod('2026-10-26','2026-11-05',args.today));assert.throws(()=>validateReportPeriod('2026-02-30','2026-03-01',args.today));
assert.throws(()=>buildPeriodReport({...args,logs:[day('2026-11-04'),day('2026-11-04')]}),/duplicados/);
const missing=day('2026-11-04');missing.meals.desayuno=[{k:100,p:10,c:10,f:2}];assert.equal(buildPeriodReport({...args,logs:[missing]}).averages.fi.value,null);
const empty=buildPeriodReport({...args,logs:[]});assert.equal(empty.averages.k.value,null);assert.equal(empty.daysRecorded,0);
assert.equal(validateReportPeriod('2026-08-07','2026-11-04',args.today),90);
assert.throws(()=>validateReportPeriod('2026-08-06','2026-11-04',args.today),/90/);
// Execute actual app handler: stale session/alumno must not receive async response.
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const start=app.indexOf(' if(action==="generatePeriodReport")'),end=app.indexOf(" if(action==='printPeriodLuxury')",start);
assert(start>=0&&end>start,'The generation handler must have explicit, present extraction boundaries.');
const helperStart=app.indexOf('function periodReportContext()'),helperEnd=app.indexOf('function coachPeriodReportPanel()',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'The period helper extraction boundaries must be present.');
async function run(stale){
 const host={isConnected:true,textContent:'',innerHTML:''},inputs={periodReportFrom:{value:args.from},periodReportTo:{value:args.to},periodReportResult:host};
 const state={selectedStudent:'A',session:{user:{id:'coach-qa'}},authContextEpoch:1,profile:{role:'coach'},roster:[{user_id:'A',active:true,nickname:'QA'}],consent:{accepted:true}};
 const query={};for(const name of ['select','eq','gte','lte','order'])query[name]=()=>query;
 query.limit=async limit=>{assert.equal(limit,91);if(stale)state.selectedStudent='B';return {data:[day('2026-11-04')],error:null};};
 const previewInputs={periodReportConclusion:{get value(){return host.periodModel?.conclusion||'';}},periodReportFlexible:{get value(){return host.periodModel?.flexibleNote||'';}},periodReportReviewed:{checked:false},periodLuxuryPreview:{innerHTML:''},periodPublishButton:{disabled:true}};
 const context={normalizeReportTrendGoals,withReportTrendGoals,withReportFoodFrequency,createPeriodReportHistory:()=>({}),loadPeriodReportGoals:async()=>[],state,document:{getElementById:id=>inputs[id]||previewInputs[id]},sb:{from:()=>query},today:()=>args.today,validateReportPeriod,buildPeriodReport,dailyTotals:totalOf,buildLuxuryPeriodReport,renderLuxuryPeriodReport,mealSlots:[],buildNutritionReport:logs=>({days:logs.map(x=>({date:x.log_day,hasData:true,closed:false,mealCount:1,...food}))}),escapeHTML:x=>x,Symbol,action:'generatePeriodReport'};
 await vm.runInNewContext('(async()=>{'+app.slice(helperStart,helperEnd)+app.slice(start,end)+'})()',context);
 assert.equal(host.innerHTML.includes('periodReportConclusion'),!stale);
}
await run(false);await run(true);
console.log('PASS period report: inclusive ten/90 days, missing is unknown, no truncation to14, duplicate/future/invalid rejected, stale student response ignored.');
// Actual message draft preparer: preserves existing text, checks contact, never sends.
const messages=readFileSync(new URL('../pilot/messages-ui.js',import.meta.url),'utf8');
const prep=messages.slice(messages.indexOf(' function prepareReportDraft'),messages.indexOf(' async function replyToWeeklyReport'));
const drafts=new Map(),ctx={drafts,selectedStudent:'A',formDraft:'',resetIfChanged:()=>{},isCoach:()=>true,contacts:()=>[{student:'A'}]};
vm.runInNewContext(prep+'; prepareReportDraft("A","Informe revisable");',ctx);assert.equal(drafts.get('A'),'Informe revisable');
assert.throws(()=>vm.runInNewContext('prepareReportDraft("A","Otro")',ctx),/sin enviar/);
assert.throws(()=>vm.runInNewContext('prepareReportDraft("B","Otro")',ctx),/autorización/);
console.log('PASS period report draft: consented contact only, no automatic send, existing draft retained.');
