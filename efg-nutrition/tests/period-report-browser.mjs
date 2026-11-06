// Focused integration of actual pilot handlers in a real browser, not a second UI.
// Synthetic RAM transport only. Native headless PDF pixels are NOT asserted.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const base=resolve(new URL('../..',import.meta.url).pathname);
const app=readFileSync(resolve(base,'efg-nutrition/pilot/pilot.js'),'utf8');
const out=resolve(base,'artifacts/period-report-pdf');mkdirSync(out,{recursive:true});
function between(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Actual pilot source markers must exist: '+start);
 assert.equal(app.indexOf(start,a+start.length),-1,'Start marker must be unique: '+start);
 return app.slice(a,b);
}
function sourceLine(start){const lines=app.split('\n').filter(line=>line.startsWith(start));assert.equal(lines.length,1,start);return lines[0];}
const fixture=`
import {buildLuxuryPeriodReport,renderLuxuryPeriodReport,parseLuxuryPeriodReport,periodReportAsStoredText} from '/efg-nutrition/pilot/period-luxury-report.js';
import {buildPeriodReportPdf as renderPdf,PERIOD_PDF_RENDERER_VERSION} from '/efg-nutrition/pilot/period-report-pdf.js';
import {createPeriodReportHistory} from '/efg-nutrition/pilot/period-report-history.js';
import {loadPeriodReportGoals} from '/efg-nutrition/pilot/period-report-goals.js';
import {validateReportPeriod} from '/efg-nutrition/pilot/period-report.js';
import {buildNutritionReport} from '/efg-nutrition/pilot/daily-report.js';
const root=document.getElementById('app'),today=()=> '2026-11-06';
const coach='22222222-2222-4222-8222-222222222222',student='11111111-1111-4111-8111-111111111111';
const state={profile:{role:'coach',nickname:'Coach ficticio'},session:{user:{id:coach}},selectedStudent:student,consent:{accepted:true},roster:[{user_id:student,active:true,nickname:'María José Núñez · FICTICIO'}],authContextEpoch:1};
const trace={errors:[],rows:[],inserts:0,reads:[],created:[],revoked:[],pdfRequests:0};
let pdfGate=null,releasePdf=null,insertGate=null,releaseInsert=null;
const createUrl=URL.createObjectURL.bind(URL),revokeUrl=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=createUrl(blob);trace.created.push({url,type:blob.type,size:blob.size});return url;};
URL.revokeObjectURL=url=>{trace.revoked.push(url);revokeUrl(url);};
async function buildPeriodReportPdf(model){trace.pdfRequests++;if(pdfGate)await pdfGate;return renderPdf(model);}
const logs=[0,1,3,5,8].map(i=>({student_id:student,log_day:'2026-10-'+String(22+i).padStart(2,'0'),meals:{desayuno:[{id:'avena',name:'Avena con yogur y arándanos',k:580,p:31,c:75,f:17,fi:10}],almuerzo:[{id:'pollo',name:'Pollo con verduras',k:650,p:42,c:60,f:24,fi:9}]},sports:[],skipped:{}}));
const goal={id:'33333333-3333-4333-8333-333333333333',student_id:student,start_on:'2026-01-01',approved_at:'2026-01-01T12:00:00Z',kcal:2100,protein_g:120,carb_g:260,fat_g:65,fiber_g:28};
const sb={from(table){
 if(!['efg_daily_logs','efg_goals','efg_period_reports'].includes(table))throw Error('Unexpected synthetic table: '+table);
 const filters=[];let cap=Infinity,offset=0;
 const rows=()=>{trace.reads.push(table);let rows=table==='efg_daily_logs'?logs:table==='efg_goals'?[goal]:trace.rows;return rows.filter(row=>filters.every(([op,k,v])=>op==='eq'?row[k]===v:op==='gt'?row[k]>v:op==='gte'?row[k]>=v:row[k]<=v)).slice(offset,offset+cap);};
 const q={select(){return q;},eq(k,v){filters.push(['eq',k,v]);return q;},gt(k,v){filters.push(['gt',k,v]);return q;},gte(k,v){filters.push(['gte',k,v]);return q;},lte(k,v){filters.push(['lte',k,v]);return q;},order(){return q;},limit(n){cap=n;return q;},range(a,b){offset=a;cap=b-a+1;return q;},then(resolve){resolve({data:structuredClone(rows()),error:null});},async single(){return {data:structuredClone(rows()[0]||null),error:null};},async insert(row){trace.inserts++;if(insertGate)await insertGate;trace.rows.push(structuredClone(row));return {error:null};}};
 return q;
}};
${sourceLine('const escapeHTML=')}
${sourceLine('const mealSlots=')}
${sourceLine('const values=')}
${sourceLine('const dailyTotals=')}
${between('function createCoachPublicationRequestId(', 'function coachPublicationFailureMessage(')}
${between('function periodReportContext(){','function coachReportsView(){')}
async function run(action,el){
${between(' if(action==="generatePeriodReport")',' if(action==="copyDailyReport")')}
 throw Error('Unexpected fixture action: '+action);
}
root.addEventListener('click',event=>{const el=event.target.closest('[data-act]');if(el)run(el.dataset.act,el).catch(error=>trace.errors.push(error.message));});
${between("root.addEventListener('input',e=>{",'root.addEventListener("input",e=>{')}
window.qa={state,trace,run,version:PERIOD_PDF_RENDERER_VERSION,
 view:()=>activePeriodPdfView&&({url:activePeriodPdfView.url,ready:activePeriodPdfView.ready,snapshot:activePeriodPdfView.snapshot,serialized:activePeriodPdfView.serialized}),
 holdPdf(){pdfGate=new Promise(r=>releasePdf=r);},releasePdf(){releasePdf();pdfGate=null;},
 holdInsert(){insertGate=new Promise(r=>releaseInsert=r);},releaseInsert(){releaseInsert();insertGate=null;},
 coach(){closePeriodPdfView(true);state.profile.role='coach';state.session={user:{id:coach}};state.selectedStudent=student;state.consent.accepted=true;root.innerHTML=coachPeriodReportPanel();document.getElementById('periodReportFrom').value='2026-10-22';document.getElementById('periodReportTo').value='2026-10-31';},
 student(){closePeriodPdfView(true);state.profile.role='student';state.session={user:{id:student}};state.authContextEpoch++;root.innerHTML=periodHistoryPanel();},
 snapshot:()=>document.getElementById('periodReportResult')?.periodPdfSnapshot,
 approved:()=>!!document.getElementById('periodReportResult')?.periodReviewed
};
qa.coach();
`;
// This mode does not launch/install a browser or imply browser coverage.
if(process.argv.includes('--check-fixture')){
 const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:fixture,encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);console.log('PASS fixture syntax and exact-source extraction only; browsers not run.');
 process.exit(0);
}
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF sintético · QA aislado</title>
<link rel="stylesheet" href="/efg-nutrition/styles.css"><link rel="stylesheet" href="/efg-nutrition/fresh.css"><link rel="stylesheet" href="/efg-nutrition/pilot/pilot.css"><link rel="stylesheet" href="/efg-nutrition/pilot/weekly-luxury-report.css"></head><body><main id="app"></main><script type="module" src="/fixture.js"></script></body></html>`;
const server=createServer((req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/fixture.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end(fixture);}
 if(path==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end(html);}
 const file=resolve(base,'.'+path);assert.ok(file.startsWith(base+'/efg-nutrition/'));
 res.writeHead(200,{'content-type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engine=process.env.EFG_QA_ENGINE||'chromium';assert.ok(['chromium','webkit'].includes(engine));
const results=[];let browser,page;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function inspectPdf(bytes){
 const text=bytes.toString('latin1');assert.ok(bytes.length>10000,'Embedded-font PDF has substantial bytes');
 assert.match(text,/^%PDF-1\.[3-7]/);assert.match(text,/%%EOF\s*$/);
 const offset=Number(text.match(/startxref\s+(\d+)\s+%%EOF\s*$/)?.[1]);assert.ok(Number.isInteger(offset)&&offset>0);assert.equal(text.slice(offset,offset+4),'xref');
 assert.match(text,/\/Type \/Catalog\b/);assert.match(text,/\/FontFile2\b/);assert.match(text,/ncc-luxury-period-pdf-v1/);
 const pages=(text.match(/\/Type \/Page\b/g)||[]).length;assert.ok(pages>=2,'Real multipage report, not HTML print or a magic-byte stub');
 return {bytes:bytes.length,sha256:sha(bytes),pages,header:text.slice(0,8),xrefOffset:offset};
}
try{
 const {chromium,webkit}=await import('playwright');browser=await ({chromium,webkit}[engine]).launch({headless:true});
 for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const external=[],pageErrors=[];
  await ctx.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();external.push(url);return route.abort();});
  page=await ctx.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>window.qa);
  const screenshot=label=>page.screenshot({path:resolve(out,`${engine}-${width}-${label}.png`),fullPage:true});
  const generate=async()=>{await page.getByRole('button',{name:'Generar informe del período',exact:true}).click();await page.locator('[data-act="printPeriodLuxury"]').waitFor();};
  const open=async()=>{await page.getByRole('button',{name:'Revisar PDF y enviar',exact:true}).click();await page.waitForFunction(()=>qa.view()?.ready);};
  const close=async()=>{await page.locator('[data-pdf-close]').click();await page.locator('.period-pdf-dialog').waitFor({state:'detached'});};
  const download=async label=>{
   const pending=page.waitForEvent('download');await page.locator('[data-pdf-download]').click();const d=await pending;
   assert.equal(d.suggestedFilename(),'informe-2026-10-22-2026-10-31.pdf');assert.equal(await d.failure(),null);
   const path=resolve(out,`${engine}-${width}-${label}.pdf`);await d.saveAs(path);const bytes=readFileSync(path);return {bytes,details:inspectPdf(bytes)};
  };
  const urlRevoked=async url=>{
   assert.ok(await page.evaluate(url=>qa.trace.revoked.includes(url),url),'Actual revokeObjectURL was called');
   assert.equal(await page.evaluate(async url=>{try{await fetch(url);return false;}catch{return true;}},url),true,'Revoked URL cannot be read');
  };
  await generate();
  await page.getByText('Versión HTML accesible del borrador (no es el PDF)',{exact:true}).click();
  assert.match(await page.locator('#periodLuxuryPreview').innerText(),/María José Núñez/);await screenshot('accessible-html');
  await open();assert.equal(await page.locator('#periodPublishButton').isDisabled(),true);assert.equal(await page.locator('#periodReportReviewed').isChecked(),false);
  assert.match(await page.evaluate(()=>qa.run('publishPeriodLuxury',document.getElementById('periodPublishButton')).then(()=>'',e=>e.message)),/confirmación/,'Handler also refuses unreviewed send');
  const pdf=await page.evaluate(async()=>{const v=qa.view(),r=await fetch(v.url);return {url:v.url,type:r.headers.get('content-type'),size:(await r.arrayBuffer()).byteLength,snapshot:v.snapshot,serialized:v.serialized};});
  assert.equal(pdf.type,'application/pdf');assert.equal(pdf.snapshot.pdfRendererVersion,'ncc-luxury-period-pdf-v1');assert.equal(pdf.snapshot.approvedByCoach,true);
  assert.equal(await page.locator('.period-pdf-dialog iframe').getAttribute('src'),pdf.url);assert.equal(await page.locator('.period-pdf-dialog iframe').isVisible(),true);
  assert.equal(await page.locator('[data-pdf-open]').getAttribute('href'),pdf.url);assert.equal(await page.locator('[data-pdf-open]').getAttribute('target'),'_blank');assert.equal(await page.locator('[data-pdf-open]').getAttribute('rel'),'noopener');
  assert.equal(await page.locator('[data-pdf-download]').getAttribute('href'),pdf.url);
  const dialogBox=await page.locator('.period-pdf-dialog').boundingBox();assert.ok(dialogBox.x>=0&&dialogBox.x+dialogBox.width<=width+1);
  const controls=await page.locator('.period-pdf-dialog .btn').evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>n.getBoundingClientRect().height));assert.ok(controls.every(h=>h>=44));
  await screenshot('coach-dialog-unreviewed');
  const preview=await download('coach-reviewed');assert.equal(preview.bytes.length,pdf.size);
  // WebKit may download instead of creating a PDF-viewer page. Exercise the
  // actual anchor and require either real browser outcome, never native pixels.
  const openOutcome=Promise.race([
   ctx.waitForEvent('page').then(popup=>({kind:'new-target',popup})),
   page.waitForEvent('download').then(file=>({kind:'download-fallback',file}))
  ]);
  await page.locator('[data-pdf-open]').click();const opened=await openOutcome;
  const popupEvidence={outcome:opened.kind,nativePdfRendering:'not asserted in headless'};
  if(opened.popup){popupEvidence.initialUrl=opened.popup.url();await opened.popup.close().catch(()=>{});}
  else{assert.equal(await opened.file.failure(),null);const path=resolve(out,`${engine}-${width}-open-fallback.pdf`);await opened.file.saveAs(path);assert.deepEqual(readFileSync(path),preview.bytes);}
  assert.equal(await page.evaluate(()=>qa.trace.inserts),0,'Opening/downloading cannot publish');
  await page.locator('#periodReportReviewed').check();assert.equal(await page.locator('#periodPublishButton').isDisabled(),false);
  await close();await urlRevoked(pdf.url);assert.equal(await page.evaluate(()=>qa.approved()),false);assert.equal(await page.evaluate(()=>qa.snapshot()),null);
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.act),'printPeriodLuxury','Close restores focus to opener');
  await page.locator('#periodReportConclusion').fill('¡Hola, María José! Conclusión EDITADA de prueba.\n\nElegí una acción pequeña y sostenible, sin presión ni compensaciones.');
  await open();assert.equal(await page.locator('#periodReportReviewed').isChecked(),false);assert.equal(await page.locator('#periodPublishButton').isDisabled(),true);
  const edited=await download('coach-edited');assert.notEqual(edited.details.sha256,preview.details.sha256);
  // Editing while a dialog exists can occur through app updates; it must revoke the snapshot too.
  await page.locator('#periodReportReviewed').check();const editedUrl=await page.evaluate(()=>qa.view().url);
  await page.evaluate(()=>{const field=document.getElementById('periodReportConclusion');field.value+='\nSegunda edición ficticia.';field.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('.period-pdf-dialog').waitFor({state:'detached'});await urlRevoked(editedUrl);assert.equal(await page.evaluate(()=>qa.approved()),false);
  await open();await page.locator('#periodReportReviewed').check();const finalSnapshot=await page.evaluate(()=>qa.view().serialized);const approved=await download('coach-final');
  await screenshot('coach-dialog-approved');await page.evaluate(()=>qa.holdInsert());
  await page.locator('#periodPublishButton').click();await page.waitForFunction(()=>qa.trace.inserts===1);
  assert.equal(await page.locator('#periodPublishButton').isDisabled(),true);assert.equal(await page.locator('[data-pdf-close]').isDisabled(),true);
  await page.evaluate(()=>qa.run('publishPeriodLuxury',document.getElementById('periodPublishButton')));assert.equal(await page.evaluate(()=>qa.trace.inserts),1,'Concurrent request is coalesced');
  await page.evaluate(()=>qa.releaseInsert());await page.waitForFunction(()=>document.getElementById('periodReportResult').periodPublished);
  assert.equal(await page.evaluate(()=>qa.trace.rows[0].report_text),finalSnapshot,'Persist precisely the snapshot used to create reviewed PDF');
  await page.evaluate(()=>qa.run('publishPeriodLuxury',document.getElementById('periodPublishButton')));assert.equal(await page.evaluate(()=>qa.trace.inserts),1);
  await screenshot('coach-confirmed');
  const coachUrl=await page.evaluate(()=>qa.view().url);await page.evaluate(()=>qa.student());await urlRevoked(coachUrl);
  await page.getByRole('button',{name:'Consultar historial',exact:true}).click();
  // Each report contains its own evidence <details>; select the history row,
  // not every nested disclosure. Keep strict uniqueness and exact period checks.
  const historyRow=page.locator('#periodHistory > details.pilot-record');
  await historyRow.waitFor();assert.equal(await historyRow.count(),1);
  const historySummary=page.locator('#periodHistory > details.pilot-record > summary');
  assert.equal(await historySummary.innerText(),'2026-10-22 — 2026-10-31');await historySummary.click();
  await screenshot('student-history-html');await historyRow.getByRole('button',{name:'Abrir PDF',exact:true}).click();await page.waitForFunction(()=>qa.view()?.ready);
  assert.equal(await page.locator('#periodPublishButton,#periodReportReviewed').count(),0,'Student PDF is read-only');
  assert.equal(await page.evaluate(()=>qa.view().serialized),finalSnapshot);const studentPdf=await download('student');assert.deepEqual(studentPdf.bytes,approved.bytes,'Student download is byte-identical to approved coach download');
  await screenshot('student-dialog');const studentUrl=await page.evaluate(()=>qa.view().url);await page.keyboard.press('Escape');await page.locator('.period-pdf-dialog').waitFor({state:'detached'});await urlRevoked(studentUrl);
  // Real rendering delayed at the dependency boundary: stale responses cannot install a PDF.
  await page.evaluate(()=>qa.coach());await generate();await page.evaluate(()=>{qa.holdPdf();window.stale=qa.run('printPeriodLuxury',document.querySelector('[data-act="printPeriodLuxury"]'));qa.state.selectedStudent='other-synthetic-student';qa.releasePdf();});
  await page.evaluate(()=>window.stale);assert.equal(await page.locator('.period-pdf-dialog').count(),0);assert.equal(await page.evaluate(()=>qa.snapshot()),null);
  await page.evaluate(()=>qa.coach());await generate();
  await page.evaluate(()=>{qa.holdPdf();window.twice=Promise.all([qa.run('printPeriodLuxury',document.querySelector('[data-act="printPeriodLuxury"]')),qa.run('printPeriodLuxury',document.querySelector('[data-act="printPeriodLuxury"]'))]);qa.releasePdf();});
  await page.evaluate(()=>window.twice);await page.waitForFunction(()=>qa.view()?.ready);assert.equal(await page.locator('.period-pdf-dialog').count(),1);
  const liveUrls=await page.evaluate(()=>qa.trace.created.filter(x=>!qa.trace.revoked.includes(x.url)));assert.equal(liveUrls.length,1,'Only newest PDF URL survives repeated opens');
  await close();assert.equal(await page.evaluate(()=>qa.trace.created.filter(x=>!qa.trace.revoked.includes(x.url)).length),0);
  // Closed while generation is pending: no late dialog/URL or approval reappears.
  await page.evaluate(()=>{qa.holdPdf();window.closedPending=qa.run('printPeriodLuxury',document.querySelector('[data-act="printPeriodLuxury"]'));});
  await close();await page.evaluate(()=>qa.releasePdf());await page.evaluate(()=>window.closedPending);assert.equal(await page.locator('.period-pdf-dialog').count(),0);assert.equal(await page.evaluate(()=>qa.snapshot()),null);
  assert.deepEqual(await page.evaluate(()=>qa.trace.errors),[]);assert.deepEqual(pageErrors,[]);assert.deepEqual(external,[],'No CDN, backend or other external network requests');
  writeFileSync(resolve(out,`${engine}-${width}-snapshot.json`),finalSnapshot+'\n');
  results.push({engine,width,status:'PASS',scope:'Actual extracted pilot handlers, DOM events and CSS; real local PDF renderer and history client; RAM transport only',nativePdfRendering:'NOT VALIDATED: headless may not paint the embedded PDF. PNGs validate dialog/HTML controls only; downloaded PDF bytes are independently checked.',popupEvidence,coach:approved.details,student:studentPdf.details,checks:['actual generation and accessible HTML','application/pdf Blob and iframe binding','open in new tab and native download','explicit review gate','close/Escape restore and revoke','edit revokes approval and changes PDF','exact snapshot persisted once','student identical snapshot/version/bytes','stale student response ignored','double open leaves one live URL','close during pending PDF','no external requests']});
  writeFileSync(resolve(out,`results-${engine}.json`),JSON.stringify(results,null,2));await ctx.close();page=null;
 }
 console.log(JSON.stringify(results,null,2));
}catch(error){
 if(page&&!page.isClosed())await page.screenshot({path:resolve(out,`${engine}-failure.png`),fullPage:true}).catch(()=>{});
 writeFileSync(resolve(out,`failure-${engine}.json`),JSON.stringify({error:error.stack,completed:results},null,2));throw error;
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
