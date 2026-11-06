// Actual weekly pilot handlers + PDF module, synthetic in-memory transport only.
// CI Chromium/WebKit emulation, NOT certification on physical iPhone/Android.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),base=resolve(new URL('../..',import.meta.url).pathname);
const app=readFileSync(resolve(base,'efg-nutrition/pilot/pilot.js'),'utf8');
function between(start,end){const a=app.indexOf(start),b=app.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return app.slice(a,b);}
function line(start){const lines=app.split('\n').filter(l=>l.startsWith(start));assert.equal(lines.length,1,start);return lines[0];}
const fixture=`
import {buildLuxuryWeeklyReport,reportAsStoredText,parseLuxuryWeeklyReport,renderLuxuryWeeklyReport} from '/efg-nutrition/pilot/weekly-luxury-report.js';
import {buildNutritionReport} from '/efg-nutrition/pilot/daily-report.js';
import {createLuxuryWeeklyEditor} from '/efg-nutrition/pilot/weekly-luxury-editor.js';
import {createWeeklyReportDelivery} from '/efg-nutrition/pilot/weekly-report-delivery.js';
import {createWeeklyPdfReview} from '/efg-nutrition/pilot/weekly-pdf-review.js';
import {buildWeeklyReportPdf,WEEKLY_PDF_RENDERER_VERSION} from '/efg-nutrition/pilot/weekly-report-pdf.js';
import {withReportTrendGoals} from '/efg-nutrition/pilot/report-trend-snapshot.js';
import {withReportFoodFrequency} from '/efg-nutrition/pilot/report-food-frequency.js';
const root=document.getElementById('app'),today=()=> '2026-11-06';
const coach='coach-ficticio',student='alumna-ficticia';
const state={profile:{role:'coach',nickname:'Coach FICTICIO'},org:{id:'org-ficticia',is_test:true,coach_id:coach},session:{user:{id:coach}},selectedStudent:student,consent:{accepted:true},roster:[{user_id:student,active:true,nickname:'María José Núñez · FICTICIO'}],authContextEpoch:1,coachHistory:[],coachGoals:[{start_on:'2026-01-01',kcal:2100,protein_g:120,carb_g:250,fat_g:60}],coachLogs:[]};
state.coachReportGoals={userId:coach,orgId:'org-ficticia',studentId:student,epoch:1,from:'2026-10-30',to:'2026-11-05',goals:state.coachGoals};
state.coachLogs=[0,1,2,3,4].map(i=>{const d=new Date('2026-10-30T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return {log_day:d.toISOString().slice(0,10),meals:{desayuno:[{id:'avena',name:'Avena FICTICIA',k:700,p:35,c:90,f:20,fi:8}]},sports:[],skipped:{}};});
const trace={rows:[],errors:[],created:[],revoked:[],prints:0,inserts:0,failInsert:false,failRead:false,failPdf:false};
let myWeeklyReports=[],gate=null,release=null,lastView=null,insertGate=null,releaseInsert=null;
window.print=()=>trace.prints++;
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const u=create(blob);trace.created.push(u);return u;};URL.revokeObjectURL=u=>{trace.revoked.push(u);return revoke(u);};
const luxuryWeeklyEditor=createLuxuryWeeklyEditor();
const weeklyPdfReview=createWeeklyPdfReview({root,buildPdf:async snapshot=>{if(gate)await gate;if(trace.failPdf){trace.failPdf=false;throw Error('SYNTHETIC_PDF_FAILURE');}return buildWeeklyReportPdf(snapshot);}});
const actualOpen=weeklyPdfReview.open;weeklyPdfReview.open=options=>{lastView=actualOpen(options);return lastView;};
const notify=()=>{},periodHistoryPanel=()=>'';
const sb={from(table){if(table!=='efg_weekly_reports')throw Error('Unexpected table');const q={async insert(row){trace.inserts++;if(insertGate)await insertGate;if(trace.failInsert){trace.failInsert=false;return {error:Object.assign(Error('SYNTHETIC_INSERT_FAILURE'),{code:'42501'})};}trace.rows.push(structuredClone(row));return {error:null};},select(){return q;},eq(){return q;},order(){return q;},async limit(){return trace.failRead?{error:Error('SYNTHETIC_REFRESH_FAILURE')}:{data:structuredClone(trace.rows)};}};return q;}};
${line('const escapeHTML=')}
${line('const mealSlots=')}
${line('const values=')}
${line('const dailyTotals=')}
${between('function weeklyStudentPanel(){','const luxuryWeeklyEditor=createLuxuryWeeklyEditor();')}
${between('function buildCurrentLuxuryModel(){','function periodReportContext(){')}
async function render(){weeklyPdfReview.close(true);root.innerHTML=state.profile.role==='student'?weeklyStudentPanel():weeklyCoachDraft()+coachLuxuryHistoryPanel();}
async function act(el){
${between(' if(el.dataset.act==="previewLuxuryReport"){',' if(el.dataset.coachsection)')}
}
root.addEventListener('click',event=>{const el=event.target.closest('[data-act]');if(el)act(el).catch(e=>trace.errors.push(e.message));});
root.addEventListener('input',e=>{
${between(' if(["weeklyCoachConclusion","weeklyCoachFlexibleNote"].includes(e.target.id)){',' invalidateCoachDraft(e);')}
});
window.qa={state,trace,render,view:()=>lastView,publish:publishWeeklyReport,
 holdPdf(){gate=new Promise(r=>release=r);},releasePdf(){release();gate=null;},
 holdInsert(){insertGate=new Promise(r=>releaseInsert=r);},releaseInsert(){releaseInsert();insertGate=null;},
 close(){weeklyPdfReview.close();},invalidate(){state.authContextEpoch++;weeklyPdfReview.close(true);luxuryWeeklyEditor.reset();},
 student(){weeklyPdfReview.close(true);state.profile.role='student';state.session={user:{id:student}};state.authContextEpoch++;myWeeklyReports=structuredClone(trace.rows);return render();},
 coach(){weeklyPdfReview.close(true);state.profile.role='coach';state.session={user:{id:coach}};state.selectedStudent=student;state.authContextEpoch++;state.coachHistory=structuredClone(trace.rows);return render();}
};render();
`;
if(process.argv.includes('--check-fixture')){const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:fixture,encoding:'utf8'});assert.equal(checked.status,0,checked.stderr);console.log('PASS exact-source weekly browser fixture syntax only; browser not launched.');process.exit(0);}
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/efg-nutrition/styles.css"><link rel="stylesheet" href="/efg-nutrition/fresh.css"><link rel="stylesheet" href="/efg-nutrition/pilot/pilot.css"><link rel="stylesheet" href="/efg-nutrition/pilot/weekly-luxury-report.css"><link rel="stylesheet" href="/efg-nutrition/pilot/weekly-pdf-review.css"></head><body><main id="app"></main><nav style="position:fixed;bottom:0;background:#ded8c9;width:100%;height:80px;z-index:999">Barra móvil FICTICIA</nav><script type="module" src="/fixture.js"></script></body></html>';
const server=createServer((req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/fixture.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end(fixture);}if(path==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end(html);}const file=resolve(base,'.'+path);assert.ok(file.startsWith(base+'/efg-nutrition/'));res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp'})[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const out=resolve(base,'artifacts/weekly-preview');mkdirSync(out,{recursive:true});
const engine=process.env.EFG_QA_ENGINE||'chromium';assert.ok(['chromium','webkit'].includes(engine));let browser;
const results=[];
try{
 const pw=require('playwright');browser=await pw[engine].launch({headless:true,...(process.env.EFG_QA_BROWSER_PATH?{executablePath:process.env.EFG_QA_BROWSER_PATH}:{})});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,deviceScaleFactor:1,isMobile:width<600});
  const external=[];await context.route('**/*',route=>{if((route.request().url().startsWith(origin+'/')||route.request().url().startsWith('blob:'+origin+'/')))return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(origin);await page.locator('[data-act="previewLuxuryReport"]').waitFor();
  const open=async()=>{await page.locator('[data-act="previewLuxuryReport"]').tap();await page.locator('.weekly-pdf-stage canvas').waitFor();await page.waitForFunction(()=>qa.view().ready);};
  const review=async()=>{while(await page.locator('[data-weekly-next]').isEnabled()){await page.locator('[data-weekly-next]').tap();await page.waitForFunction(()=>qa.view().ready&&!qa.view().rendering);}await page.locator('#weeklyPdfReviewed').check();assert.equal(await page.locator('#weeklyLuxuryPublishButton').isEnabled(),true);};
  const bytes=async()=>Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await (await fetch(document.querySelector('[data-weekly-download]').href)).arrayBuffer()))));
  // The modal is visible in the original touch while PDF generation is deliberately delayed.
  await page.evaluate(()=>qa.holdPdf());await page.locator('[data-act="previewLuxuryReport"]').tap();assert.equal(await page.locator('.weekly-pdf-dialog').isVisible(),true);assert.equal(await page.locator('#weeklyLuxuryPublishButton').isDisabled(),true);
  await page.locator('[data-weekly-close]').tap();await page.evaluate(()=>qa.releasePdf());await page.waitForTimeout(100);assert.equal(await page.locator('.weekly-pdf-dialog').count(),0);assert.equal(await page.evaluate(()=>qa.trace.inserts),0);
  await page.locator('#weeklyCoachConclusion').fill('Conclusión FICTICIA\n\nTexto revisado desde el PDF real.');
  await open();assert.equal(await page.locator('#weeklyPdfReviewed').isDisabled(),true);assert.equal(await page.locator('#weeklyLuxuryPublishButton').isDisabled(),true);
  const fit=await page.locator('.weekly-pdf-stage canvas').evaluate(e=>e.getBoundingClientRect().width);
  await page.locator('[data-weekly-zoom]').tap();await page.waitForFunction(()=>qa.view().ready);assert.ok(await page.locator('.weekly-pdf-stage canvas').evaluate(e=>e.getBoundingClientRect().width)>fit*1.5);
  await page.locator('[data-weekly-zoom]').tap();await page.waitForFunction(()=>qa.view().ready);await review();
  const layout=await page.locator('#weeklyLuxuryPublishButton').evaluate(el=>{const r=el.getBoundingClientRect();return {height:r.height,width:r.width,left:r.left,right:r.right,bottom:r.bottom,top:r.top,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  assert.ok(layout.height>=44&&layout.left>=0&&layout.right<=width+1&&layout.bottom<=844&&layout.top>=0&&layout.hit,JSON.stringify(layout));
  await page.screenshot({path:resolve(out,engine+'-'+width+'-review.png')});
  const coachBytes=await bytes();assert.equal(coachBytes.subarray(0,5).toString(),'%PDF-');writeFileSync(resolve(out,engine+'-'+width+'-coach.pdf'),coachBytes);
  await page.evaluate(()=>qa.trace.failInsert=true);await page.locator('#weeklyLuxuryPublishButton').tap();await page.getByText('SYNTHETIC_INSERT_FAILURE',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>qa.trace.rows.length),0);assert.equal(await page.locator('#weeklyLuxuryPublishButton').isEnabled(),true);
  await page.evaluate(()=>{qa.holdInsert();qa.trace.failRead=true;});await page.locator('#weeklyLuxuryPublishButton').tap();assert.equal(await page.locator('#weeklyLuxuryPublishButton').isDisabled(),true);assert.equal(await page.locator('[data-weekly-close]').isDisabled(),true);
  const duplicate=await page.evaluate(async()=>{try{await qa.publish();return '';}catch(e){return e.message;}});assert.match(duplicate,/publicación anterior/);
  await page.evaluate(()=>qa.releaseInsert());await page.getByText('Informe de esta semana ya compartido · historial protegido',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>qa.trace.rows.length),1);
  await page.locator('#coachReportWeek [data-act="printLuxuryReport"]').tap();await page.waitForFunction(()=>qa.view().ready);assert.equal(await page.locator('#weeklyLuxuryPublishButton').count(),0);assert.deepEqual(await bytes(),coachBytes);await page.locator('[data-weekly-close]').tap();
  await page.evaluate(()=>qa.student());await page.locator('details.pilot-record > summary').first().tap();await page.locator('[data-act="printLuxuryReport"]').tap();await page.waitForFunction(()=>qa.view().ready);assert.deepEqual(await bytes(),coachBytes,'Student PDF must match reviewed coach bytes');assert.equal(await page.locator('#weeklyLuxuryPublishButton').count(),0);await page.screenshot({path:resolve(out,engine+'-'+width+'-student.png')});await page.locator('[data-weekly-close]').tap();
  // Old JSON has no PDF version. Reopening is identified as a new conversion.
  await page.evaluate(()=>{const m=JSON.parse(qa.trace.rows[0].report_text);delete m.pdfRendererVersion;qa.trace.rows[0].report_text=JSON.stringify(m);});await page.evaluate(()=>qa.coach());await page.locator('#coachReportWeek [data-act="printLuxuryReport"]').tap();await page.waitForFunction(()=>qa.view().ready);assert.match(await page.locator('[data-weekly-status]').innerText(),/conversión a PDF/);await page.locator('[data-weekly-close]').tap();
  await page.evaluate(()=>{qa.trace.rows[0].report_text='Texto histórico FICTICIO. Sin datos actuales.';});await page.evaluate(()=>qa.coach());assert.equal(await page.locator('#weeklyLuxuryPreview .lux-report').count(),0);await page.locator('#coachReportWeek [data-act="printLuxuryReport"]').tap();await page.waitForFunction(()=>qa.view().ready);assert.match(await page.locator('[data-weekly-text]').innerText(),/Texto histórico FICTICIO/);assert.equal(await page.locator('#weeklyLuxuryPublishButton').count(),0);await page.locator('[data-weekly-close]').tap();
  // Generation error -> retry preserves draft and cannot accidentally send.
  await page.evaluate(()=>{qa.trace.rows=[];qa.trace.failPdf=true;});await page.evaluate(()=>qa.coach());await page.locator('[data-act="previewLuxuryReport"]').tap();await page.locator('[data-weekly-retry]').waitFor({state:'visible'});assert.equal(await page.locator('#weeklyLuxuryPublishButton').isDisabled(),true);await page.locator('[data-weekly-retry]').tap();await page.waitForFunction(()=>qa.view().ready);
  await page.evaluate(()=>qa.invalidate());assert.equal(await page.locator('.weekly-pdf-dialog').count(),0);assert.equal(await page.evaluate(()=>qa.trace.created.every(u=>qa.trace.revoked.includes(u))),true);
  assert.equal(await page.evaluate(()=>qa.trace.prints),0);assert.deepEqual(await page.evaluate(()=>qa.trace.errors),[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({engine,width,layout,coachPdfSha256:createHash('sha256').update(coachBytes).digest('hex'),sameStudentBytes:true,actualPdfCanvas:true,syntheticTransport:true,physicalDevice:false});await context.close();
 }
 writeFileSync(resolve(out,'browser-'+engine+'.json'),JSON.stringify(results,null,2));console.log('PASS weekly PDF touch review/history/student exact bytes ('+engine+'), RAM transport only. Not a physical-device/RLS certification.');
}finally{await browser?.close();server.close();}
