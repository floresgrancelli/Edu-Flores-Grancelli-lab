import {reportCoachName} from '../pilot/coach-report-models.js';
import {withReportFoodFrequency} from '../pilot/report-food-frequency.js';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeReportTrendGoals,withReportTrendGoals,reportTrendGoals} from '../pilot/report-trend-snapshot.js';
import {loadReportTrendGoals} from '../pilot/report-trend-goals.js';
import {buildReportTrendCharts} from '../pilot/report-trend-charts.js';
import {buildLuxuryWeeklyReport,reportAsStoredText,parseLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';
import {buildLuxuryPeriodReport,periodReportAsStoredText} from '../pilot/period-luxury-report.js';
import {buildWeeklyReportPdf} from '../pilot/weekly-report-pdf.js';
import {buildPeriodReportPdf} from '../pilot/period-report-pdf.js';
import {PERIOD_PDF_RENDERER_VERSION} from '../pilot/period-report-pdf-v2.js'; // Frozen R11 regression.
import {buildPeriodReportPdf as immutableV1} from '../pilot/period-report-pdf-v1.js';
const date=i=>{const d=new Date('2026-08-09T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);};
const goal=(start_on,kcal=2200,approved_at='2026-07-01T12:00:00Z')=>({start_on,kcal,protein_g:125,carb_g:270,fat_g:65,fiber_g:30,approved_at});
const original=[goal(date(0),1800),goal(date(0),2200,'2026-07-02T12:00:00Z'),goal(date(3),2500)];
const history=normalizeReportTrendGoals(original);assert.equal(history.length,2);assert.equal(history[0].kcal,2200);assert.equal(original[0].kcal,1800);
function draft(count=7,goals=history){
 const days=Array.from({length:count},(_,i)=>({date:date(i),hasData:i%7!==2,closed:i%4!==0,mealCount:2,k:i===0?0:1800+(i%6)*110,p:i===0?0:90+i%12,c:i===0?0:200+i%24,f:i===0?0:45+i%8}));
 const args={from:date(0),to:date(count-1),friday:date(count),studentName:'Alumna de prueba · FICTICIO',coachName:'Coach ficticio',days,logs:[],goals:goals||[]};
 return withReportTrendGoals(count===7?buildLuxuryWeeklyReport(args):buildLuxuryPeriodReport(args),goals);
}
function approved(model){const serialize=model.kind==='efg_luxury_weekly_v1'?reportAsStoredText:periodReportAsStoredText;return JSON.parse(serialize(model,'Conclusión FICTICIA: revisar hábitos de forma sostenible.','Disfrutar también importa.'));}
const weekly=approved(draft()),charts=buildReportTrendCharts(weekly);assert.equal(charts.length,4);assert.deepEqual(charts.map(c=>c.key),['k','p','c','f']);
assert.equal(charts[0].points[0].value,0);assert.equal(charts[0].points[0].closed,false);assert.equal(charts[0].dataSegments.some(([a,b])=>a.i===1&&b.i===3),false);assert.equal(charts[0].targets[2].value,2200);assert.equal(charts[0].targets[3].value,2500);
assert.equal(weekly.targets.k,(2200*2+2500*4)/6,'The mean and graph must use the same normalized revisions');
assert.equal(charts[0].last.date,date(6));assert.ok(charts.every(c=>Number.isFinite(c.min)&&Number.isFinite(c.max)&&c.max>c.min));
const ninety=approved(draft(90));ninety.pdfRendererVersion=PERIOD_PDF_RENDERER_VERSION;
const all=buildReportTrendCharts(ninety);assert.equal(all.length,12);assert.equal(all.filter(c=>c.key==='k').reduce((sum,c)=>sum+c.days.length,0),90);assert.equal(all.at(-1).to,date(89));assert.ok(JSON.stringify(ninety).length<=64000);
const noDays={...weekly,days:[]};assert.throws(()=>withReportTrendGoals(noDays,[]),/fechas/);
const single=approved(draft(1));const one=buildReportTrendCharts(single);assert.equal(one[0].points.length,1);assert.equal(one[0].dataSegments.length,0);assert.ok(one[0].max>one[0].min);
const noData={...weekly,days:weekly.days.map(d=>({...d,hasData:false,k:null,p:null,c:null,f:null}))};assert.ok(buildReportTrendCharts(noData).every(c=>c.points.length===0&&c.last===null));
const zeros={...weekly,days:weekly.days.map(d=>({...d,hasData:true,k:0,p:0,c:0,f:0}))};assert.ok(buildReportTrendCharts(zeros).every(c=>c.points.length===7&&c.min>=0&&c.max>c.min));
const large={...weekly,days:weekly.days.map(d=>({...d,hasData:true,k:999999,p:99999.9,c:88888.8,f:77777.7}))};assert.ok(buildReportTrendCharts(large).every(c=>Number.isFinite(c.max)&&c.max>c.min));
const missing=approved(draft(7,null));assert.equal(missing.targets.k,null);assert.equal(reportTrendGoals(missing).available,false);assert.ok(buildReportTrendCharts(missing).every(c=>c.targets.every(t=>t.value===null)));
const historical={...weekly};delete historical.trendGoals;assert.equal(reportTrendGoals(historical).available,false);assert.ok(buildReportTrendCharts(historical).every(c=>c.goalSegments.length===0));
const conflict=normalizeReportTrendGoals([goal(date(0)),goal(date(3),1800),goal(date(3),2400)]);assert.equal(conflict[1].kcal,null);assert.equal(conflict[1].protein_g,125);const ambiguous=draft(7,conflict);assert.equal(ambiguous.targets.k,null);assert.equal(reportTrendGoals(ambiguous).days[3][0],null);assert.equal(reportTrendGoals(ambiguous).days[2][0],2200);
assert.deepEqual(normalizeReportTrendGoals([goal('2026-02-30')]),[]);assert.equal(normalizeReportTrendGoals([goal(date(0)),{...goal(date(0),1800),approved_at:'invalid'}])[0].kcal,null);
for(const ext of [{...weekly.trendGoals,v:999},{...weekly.trendGoals,to:date(8)},{...weekly.trendGoals,extra:1},{...weekly.trendGoals,rows:[[1,2200,125,270,65]]},{...weekly.trendGoals,rows:[[0,Infinity,125,270,65]]},{...weekly.trendGoals,rows:[[0,2200,125,270,65],[0,2300,125,270,65]]},{...weekly.trendGoals,rows:[[0,2200,125,270,65],[7,2300,125,270,65]]}])assert.throws(()=>buildReportTrendCharts({...weekly,trendGoals:ext}),/metas|secuencia/);
const baseText=reportAsStoredText(weekly,weekly.conclusion,weekly.flexibleNote);const padded={...weekly,testPadding:'x'.repeat(8000-baseText.length-17)};
let exact=reportAsStoredText(padded,padded.conclusion,padded.flexibleNote);padded.testPadding+='x'.repeat(8000-exact.length);exact=reportAsStoredText(padded,padded.conclusion,padded.flexibleNote);assert.equal(exact.length,8000);assert.ok(parseLuxuryWeeklyReport(exact));padded.testPadding+='x';assert.throws(()=>reportAsStoredText(padded,padded.conclusion,padded.flexibleNote),/grande|extenso|8000|límite|tamaño|capacidad/);assert.equal(padded.testPadding.length,8001-baseText.length-17);
// Query all tied baseline records and all changes; validate context at every await.
const rows=[{...goal('2025-01-01',1800),id:'old'},{...goal('2025-01-01',2200,'2026-07-02T12:00:00Z'),id:'new'},...Array.from({length:121},(_,i)=>({...goal(date(1)),id:String(i)}))];let reads=0,stale=false;
const sb={from(){const filters=[];const q={select(){return q;},eq(k,v){filters.push(r=>k==='student_id'||r[k]===v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},order(){return q;},async limit(){reads++;return {data:[rows[0]]};},async range(a,b){reads++;return {data:rows.filter(r=>filters.every(f=>f(r))).slice(a,b+1)};}};return q;}};
const loaded=await loadReportTrendGoals(sb,'ficticio',date(0),date(6));assert.equal(loaded.length,123);assert.equal(reads,4);assert.equal(normalizeReportTrendGoals(loaded)[0].kcal,2200);
reads=0;await assert.rejects(loadReportTrendGoals(sb,'ficticio',date(0),date(6),()=>{if(reads)throw Object.assign(Error('changed'),{code:'STALE_AUTH_CONTEXT'});}),{code:'STALE_AUTH_CONTEXT'});assert.equal(reads,1,'No page reads after baseline changes context');
// Actual weekly builder checks proof scope and uses the same normalized list for all sections.
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8'),a=app.indexOf('function buildCurrentLuxuryModel(){'),b=app.indexOf('function luxuryEditorContext(',a);
const state={selectedStudent:'s',session:{user:{id:'c'}},org:{id:'o'},authContextEpoch:1,coachGoals:[goal(date(0),9999)],coachLogs:[],profile:{nickname:'Ficticio'},roster:[{user_id:'s',nickname:'Ficticio'}],coachReportGoals:{studentId:'s',userId:'c',orgId:'o',epoch:1,from:date(0),to:date(6),goals:history}};
const ctx={reportCoachName,state,buildLuxuryWeeklyReport,withReportFoodFrequency,withReportTrendGoals,weeklyReportWindow:()=>({from:date(0),to:date(6),friday:date(7)}),buildNutritionReport:()=>({days:weekly.days}),mealSlots:[],dailyTotals(){},today:()=>date(7)};vm.createContext(ctx);vm.runInContext(app.slice(a,b)+';this.build=buildCurrentLuxuryModel;',ctx);assert.equal(ctx.build().targets.k,weekly.targets.k);
for(const key of ['studentId','userId','orgId','epoch','from','to']){const value=state.coachReportGoals[key];state.coachReportGoals[key]='wrong';assert.equal(ctx.build().targets.k,null,key);assert.equal(ctx.build().trendGoals.rows,null,key);state.coachReportGoals[key]=value;}
assert.match(app,/loadPeriodReportGoals\(sb,studentId,reportWindow.from,reportWindow.to,assertCurrent\)/);assert.match(app,/assertCurrent\(\);state.coachReportGoals=null/);
// Deterministic actual PDFs and immutable v1, even after v2 shares the jsPDF runtime.
const old={...ninety};delete old.pdfRendererVersion;delete old.trendGoals;const oldBefore=await immutableV1(old);
const weeklyBytes=await buildWeeklyReportPdf(weekly),periodBytes=await buildPeriodReportPdf(ninety),singleBytes=await buildPeriodReportPdf({...single,pdfRendererVersion:PERIOD_PDF_RENDERER_VERSION});
assert.deepEqual(weeklyBytes,await buildWeeklyReportPdf(JSON.parse(reportAsStoredText(weekly,weekly.conclusion,weekly.flexibleNote))));assert.deepEqual(periodBytes,await buildPeriodReportPdf(JSON.parse(JSON.stringify(ninety))));
assert.deepEqual(await buildPeriodReportPdf(old),oldBefore);assert.deepEqual(await buildPeriodReportPdf({...old,pdfRendererVersion:'ncc-luxury-period-pdf-v1'}),oldBefore);
await assert.rejects(buildPeriodReportPdf({...ninety,trendGoals:{v:2}}),/metas/);await assert.rejects(buildWeeklyReportPdf({...weekly,trendGoals:{v:2}}),/metas/);
const out=new URL('../../artifacts/report-trends/',import.meta.url);mkdirSync(out,{recursive:true});
for(const [name,bytes]of [['weekly',weeklyBytes],['period-90',periodBytes],['period-one',singleBytes]])writeFileSync(new URL(name+'.pdf',out),bytes);
writeFileSync(new URL('synthetic-snapshots.json',out),JSON.stringify({weekly,ninety,single},null,2));
console.log('PASS four trend series: full90, gaps/zero/partial/closed, historical stepped goals, normalized means, ambiguity/nulls, malformed extension,8000/8001, baseline ties/pages/stale, source proof scopes, exact shared PDF bytes, v1 after v2. Synthetic data only.');
// Rasterize the real chart-bearing PDF pages for visual review, with no browser.
const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
const {createCanvas,DOMMatrix,ImageData,Path2D}=require('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const pdfjs=await import('../pilot/vendor/pdfjs-5.6.205/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../pilot/vendor/pdfjs-5.6.205/pdf.worker.min.mjs',import.meta.url).href;
const visual=[];
for(const [name,data,chartPages]of [['weekly',weeklyBytes,2],['period-90',periodBytes,6],['period-one',singleBytes,2]]){
 const pdf=await pdfjs.getDocument({data:data.slice(),isEvalSupported:false,useSystemFonts:false,useWasm:false}).promise;let full='';
 for(let n=1;n<=pdf.numPages;n++){
  const page=await pdf.getPage(n);full+=(await page.getTextContent()).items.map(x=>x.str).join(' ')+'\n';
  if(n>pdf.numPages-chartPages){const viewport=page.getViewport({scale:1.3}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;writeFileSync(new URL(name+'-page-'+n+'.png',out),canvas.toBuffer('image/png'));}
 }
 assert.match(full,/Calorías/);assert.match(full,/Proteínas/);assert.match(full,/Carbohidratos/);assert.match(full,/Grasas/);assert.match(full,/Punto lleno: día cerrado/);assert.match(full,/Tus alimentos más elegidos/);assert.match(full,/No representa gramos ni porciones/);
 if(name==='period-90')assert.match(full,/06\/11\/2026/);
 visual.push({name,pages:pdf.numPages,renderedChartPages:chartPages,bytes:data.length});writeFileSync(new URL(name+'-text.txt',out),full);await pdf.destroy();
}
writeFileSync(new URL('pixel-results.json',out),JSON.stringify(visual,null,2));console.log('PASS actual PDF.js pixels: weekly + 90-day + 1-day graphs, all four series, food-frequency label, final date. Not browser/device certification.');
