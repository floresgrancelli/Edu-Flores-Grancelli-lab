import {reportCoachName} from '../pilot/coach-report-models.js';
import {withReportFoodFrequency} from '../pilot/report-food-frequency.js';
import {createWeeklyPdfReview} from '../pilot/weekly-pdf-review.js';
import {normalizeReportTrendGoals,withReportTrendGoals} from '../pilot/report-trend-snapshot.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const base=new URL('../pilot/',import.meta.url);
const app=fs.readFileSync(new URL('pilot.js',base),'utf8');
const {buildLuxuryPeriodReport,renderLuxuryPeriodReport,periodReportAsStoredText}=await import(new URL('coach-report-models.js',base));
const from='2026-10-28',to='2026-11-06';
const report=buildLuxuryPeriodReport({from,to,friday:'2026-11-07',studentName:'Ficticio',coachName:'Coach ficticio',days:[{date:from,hasData:true,closed:true,mealCount:2,k:2000,p:100,c:250,f:60}]});
const elements={};
function el(id,value='') { return elements[id]={id,value,disabled:false,checked:false,textContent:'',innerHTML:'',addEventListener(name,fn){this[name]=fn;}}; }
const host=el('periodReportResult');host.isConnected=true;
for(const [id,value] of Object.entries({periodReportFrom:from,periodReportTo:to,periodReportConclusion:report.conclusion,periodReportFlexible:report.flexibleNote,periodReportReviewed:'',periodPublishButton:'',periodPublishStatus:'',periodLuxuryPreview:''}))el(id,value);
const VERSION='ncc-luxury-period-pdf-v4';
let current={userId:'coach',studentId:'student',epoch:1,allowed:true,canPublish:true,role:'coach'},calls=0,pdfCalls=0,failPdf=false,failSend=false,deferred,pdfDeferred;
const generatedSnapshots=[];const blobs=new Map(),revoked=[];let nextUrl=0;
function fakeDialog(){
 const fields={};
 const node=()=>({hidden:true,textContent:'',disabled:false,dataset:{},setAttribute(){},replaceChildren(){},clientWidth:380,addEventListener(name,fn){this[name]=fn;}});
 const dialog={classList:{add(){}},isConnected:false,open:false,innerHTML:'',setAttribute(){},addEventListener(name,fn){this[name]=fn;},showModal(){this.open=true;},remove(){this.open=false;this.isConnected=false;},querySelector(selector){
  selector=selector.replace('data-pdf-status','data-weekly-status').replace('data-pdf-close','data-weekly-close').replace('data-pdf-download','data-weekly-download');
  if(selector.startsWith('#')&&!this.innerHTML.includes('id="'+selector.slice(1)+'"'))return null;
  if(selector==='#periodReportReviewed')return elements.periodReportReviewed;
  if(selector==='#periodPublishButton')return elements.periodPublishButton;
  return fields[selector]||(fields[selector]=node());
 }};
 elements.periodReportReviewed.checked=false;elements.periodPublishButton.dataset={};elements.periodReportReviewed.setAttribute=()=>{};
 return dialog;
}
let returns=0;
const ctx={reportCoachName,state:{tab:'reports'},normalizeReportTrendGoals,withReportTrendGoals,withReportFoodFrequency,document:{getElementById:id=>elements[id],createElement:tag=>tag==='canvas'?{style:{},setAttribute(){},getContext:()=>({})}:fakeDialog()},root:{appendChild(d){d.isConnected=true;}},Blob,
 URL:{createObjectURL(blob){assert.equal(blob.type,'application/pdf');const url='blob:synthetic-'+(++nextUrl);blobs.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);blobs.delete(url);}},
 periodReportContext:()=>current,renderLuxuryPeriodReport,periodReportAsStoredText,PERIOD_PDF_RENDERER_VERSION:VERSION,
 async buildPeriodReportPdf(snapshot){pdfCalls++;assert.equal(snapshot.approvedByCoach,true);generatedSnapshots.push(JSON.stringify(snapshot));if(pdfDeferred)await pdfDeferred;if(failPdf)throw Error('pdf failed');return new TextEncoder().encode('%PDF-1.4 synthetic fixture only');},
 createCoachPublicationRequestId:()=> 'stable-id',el:{isConnected:true,focus(){}}};
Object.assign(globalThis,{document:ctx.document});Object.assign(URL,ctx.URL);
ctx.periodPdfReview=createWeeklyPdfReview({root:ctx.root,mode:'period',buildPdf:snapshot=>ctx.buildPeriodReportPdf(snapshot),loadDocument:async()=>({destroy:async()=>{},promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel(){}}),streamTextContent:()=>new ReadableStream({start(c){c.enqueue({items:[],styles:{},lang:null});c.close();}})})})})});
const complete=ctx.periodPdfReview.complete;ctx.periodPdfReview.complete=(...args)=>{const result=complete(...args);if(result)returns++;return result;};
vm.createContext(ctx);
vm.runInContext(app.slice(app.indexOf('function periodContextMatches'),app.indexOf('function coachPeriodReportPanel')),ctx);
const a=app.indexOf(" if(action==='printPeriodLuxury')"),b=app.indexOf(" if(action==='loadPeriodHistory')",a);
async function run(action){ctx.action=action;return vm.runInContext('(async()=>{'+app.slice(a,b)+'})()',ctx);}
function ready(){ctx.closePeriodPdfView(true);host.periodPdfSnapshot=null;Object.assign(host,{periodContext:{...current},periodModel:report,periodFrom:from,periodTo:to,periodPublished:false,periodPublishing:false,periodAttempt:null,periodPreviewText:null,periodClient:{async publish(r){calls++;assert.equal(JSON.stringify(r.model),generatedSnapshots.at(-1));assert.equal(r.requestId,'stable-id');if(deferred)await deferred;if(failSend)throw Error('uncertain');return {id:r.requestId};}}});elements.periodReportFrom.value=from;elements.periodReportTo.value=to;elements.periodReportConclusion.value=report.conclusion;elements.periodReportReviewed.checked=false;ctx.syncPeriodReportPreview();}
ready();assert.equal(elements.periodPublishButton.disabled,true);assert.match(elements.periodLuxuryPreview.innerHTML,/LUXURY PRO/);
await assert.rejects(run('publishPeriodLuxury'),/confirmación/);assert.equal(calls,0);
await run('printPeriodLuxury');assert.equal(pdfCalls,1);assert.equal(calls,0);assert.equal(blobs.size,1);assert.equal(host.periodPdfSnapshot.pdfRendererVersion,VERSION);
elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();assert.equal(elements.periodPublishButton.disabled,false);
elements.periodReportConclusion.value='Conclusión editada';ctx.syncPeriodReportPreview();assert.equal(elements.periodReportReviewed.checked,false);assert.match(elements.periodLuxuryPreview.innerHTML,/Conclusión editada/);assert.equal(elements.periodPublishButton.disabled,true);
await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();let release;deferred=new Promise(r=>release=r);const pending=run('publishPeriodLuxury');await run('publishPeriodLuxury');assert.equal(calls,1);release();await pending;deferred=null;await run('publishPeriodLuxury');assert.equal(calls,1);assert.equal(elements.periodReportFrom.disabled,false);assert.equal(vm.runInContext('activePeriodPdfView',ctx),null);assert.equal(blobs.size,0);assert.equal(returns,1);assert.equal(ctx.el.textContent,'Abrir PDF del informe compartido');
const sharedText=JSON.stringify(host.periodSharedSnapshot);await run('printPeriodLuxury');assert.equal(vm.runInContext('activePeriodPdfView.editable',ctx),false);assert.equal(vm.runInContext('activePeriodPdfView.serialized',ctx),sharedText);ctx.closePeriodPdfView();
ready();await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();failSend=true;const beforeFailure=returns;await assert.rejects(run('publishPeriodLuxury'),/uncertain/);assert.equal(returns,beforeFailure);assert.equal(vm.runInContext('activePeriodPdfView.dialog.open',ctx),true);assert.equal(elements.periodReportConclusion.disabled,true);failSend=false;await run('publishPeriodLuxury');assert.equal(host.periodPublished,true);assert.equal(calls,3);
ready();elements.periodReportTo.value='2026-11-05';ctx.invalidatePeriodReport();assert.equal(host.periodModel,null);await assert.rejects(run('printPeriodLuxury'),/fechas/);assert.equal(calls,3);
ready();current={...current,studentId:'other'};await assert.rejects(run('publishPeriodLuxury'),/alumno/);await assert.rejects(run('printPeriodLuxury'),/alumno/);
current={...current,studentId:'student'};ready();current={...current,allowed:false};await assert.rejects(run('publishPeriodLuxury'),/alumno/);current={...current,allowed:true};
ready();failPdf=true;await assert.rejects(run('printPeriodLuxury'),/pdf failed/);assert.equal(blobs.size,0);assert.ok(host.periodPdfSnapshot);await assert.rejects(run('publishPeriodLuxury'),/confirmación/);failPdf=false;
const retry=vm.runInContext('activePeriodPdfView.retry',ctx);await retry.click();for(let i=0;i<20;i++)await Promise.resolve();assert.equal(vm.runInContext('activePeriodPdfView.ready',ctx),true);elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();assert.equal(elements.periodPublishButton.disabled,false);await run('publishPeriodLuxury');assert.equal(host.periodPublished,true);
// Publication finishing after a student switch must not paint a success in the new view.
ready();await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();
deferred=new Promise(r=>release=r);const leaving=run('publishPeriodLuxury');
current={...current,studentId:'other'};elements.periodPublishStatus.textContent='New context';release();await leaving;deferred=null;
assert.equal(elements.periodPublishStatus.textContent,'New context');current={...current,studentId:'student'};
// Generation handler: deferred read cannot paint after context/date changes; repeated clicks are coalesced.
const ga=app.indexOf(' if(action==="generatePeriodReport")'),gb=app.indexOf(" if(action==='printPeriodLuxury')",ga);
let reads=0,resolveRead;const readPromise=new Promise(r=>resolveRead=r);
ctx.state={session:{},profile:{nickname:'Coach ficticio'},roster:[{user_id:'student',active:true,nickname:'Ficticio'}]};
ctx.validateReportPeriod=()=>{};ctx.today=()=>to;ctx.sb={from(){reads++;const q={select(){return q},eq(){return q},gte(){return q},lte(){return q},order(){return q},limit(){return readPromise}};return q;}};
ctx.normalizeReportTrendGoals=normalizeReportTrendGoals;ctx.withReportTrendGoals=withReportTrendGoals;ctx.loadPeriodReportGoals=async()=>[];ctx.buildNutritionReport=()=>({days:[report.days[0]]});ctx.mealSlots=[];ctx.dailyTotals=()=>{};ctx.buildLuxuryPeriodReport=buildLuxuryPeriodReport;ctx.escapeHTML=s=>s;ctx.createPeriodReportHistory=()=>({});
function generate(){ctx.action='generatePeriodReport';return vm.runInContext('(async()=>{'+app.slice(ga,gb)+'})()',ctx);}
ready();const generating=generate();await generate();assert.equal(reads,1);elements.periodReportFrom.value='2026-10-29';ctx.invalidatePeriodReport();resolveRead({data:[],error:null});await generating;assert.equal(host.periodModel,null);assert.equal(host.periodLoading,false);
ready();await generate();assert.ok(host.periodModel);assert.equal(host.periodContext.studentId,'student');assert.match(host.innerHTML,/Revisar PDF y enviar/);assert.doesNotMatch(host.innerHTML,/previewPeriodLuxury/);
ready();current={...current,role:'admin',allowed:false};await assert.rejects(generate(),/autorizado/);assert.equal(reads,2);
console.log('PASS synthetic actual-handler flows: generation/preview, explicit review, edited text, PDF cleanup, double publish, uncertain retry stable ID, dates, student/consent, in-flight stale response, coalesced generation, unauthorized admin denied before reads.');

const messages=fs.readFileSync(new URL('../pilot/messages-ui.js',import.meta.url),'utf8');const reply=messages.slice(messages.indexOf(' async function replyToPeriodReport'),messages.indexOf(' return {mount:'));
const drafts=new Map();let opened=0;
const replyCtx={resetIfChanged:()=>{},context:()=>({role:'student',userId:'student'}),contacts:()=>[{student:'student'}],drafts,selectedStudent:'student',formDraft:'',openStudent:async()=>{opened++;},document:{getElementById:()=>null}};
vm.runInNewContext(reply,replyCtx);await vm.runInNewContext("replyToPeriodReport('student','2026-10-26','2026-11-04')",replyCtx);assert.match(drafts.get('student'),/26\/10\/2026 al 04\/11\/2026/);assert.equal(opened,1);
drafts.set('student','Unsent draft');await vm.runInNewContext("replyToPeriodReport('student','2026-10-26','2026-11-04')",replyCtx);assert.equal(drafts.get('student'),'Unsent draft');await assert.rejects(vm.runInNewContext("replyToPeriodReport('other','2026-10-26','2026-11-04')",replyCtx),/coach/);
console.log('PASS period reply: own account and authorized contact, dated draft, existing message preserved, no automatic send.');


// Scoped layout contract: inherited inline labels must not shrink the mobile editor.
const css=fs.readFileSync(new URL('../pilot/weekly-luxury-report.css',import.meta.url),'utf8');
assert.match(app, /class="period-report-field">Mi devolución/);
assert.match(app,/periodPdfReview.requireReviewed/);assert.match(fs.readFileSync(new URL('../pilot/weekly-pdf-review.js',import.meta.url),'utf8'),/view.seen.size!==view.pdf\?\.numPages/);
assert.match(css, /#coachPeriodReport \.period-report-field\{display:flex;flex-direction:column/);
assert.match(css, /#coachPeriodReport \.period-report-field :is\(textarea,input\)\{[^}]*width:100%/);
console.log('PASS scoped mobile editor layout contract (not a browser rendering test).');

// Recovery integration: the actual history client determines INSERT vs READ outcome.
const {createPeriodReportHistory}=await import('../pilot/period-report-history.js');
const stored={id:'stable-id',student_id:'student',coach_id:'coach',report_text:periodReportAsStoredText({...report,pdfRendererVersion:VERSION},report.conclusion,report.flexibleNote)};
const lockedFields=['periodReportFrom','periodReportTo','periodReportConclusion','periodReportFlexible','periodReportReviewed'];
async function recoveryCase({insertError=null,readError=null,throwInsert=false,rejected=false}){
 current={userId:'coach',studentId:'student',epoch:1,allowed:true,canPublish:true,role:'coach'};
 ready();lockedFields.forEach(id=>elements[id].disabled=false);
 await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();
 let inserts=0,reads=0;
 const db={from(){return {async insert(row){inserts++;assert.equal(row.id,'stable-id');assert.equal(row.report_text,generatedSnapshots.at(-1));if(throwInsert)throw insertError;return {error:insertError};},select(){return {eq(){return {async single(){reads++;return {data:stored,error:readError};}};}};}};}};
 host.periodClient=createPeriodReportHistory({sb:db,context:()=>current});
 await assert.rejects(run('publishPeriodLuxury'));
 assert.equal(inserts,1);
 if(rejected){
  assert.equal(reads,0);assert.equal(host.periodAttempt,null);assert.equal(host.periodRequestId,null);assert.equal(host.periodReviewed,null);
  lockedFields.forEach(id=>assert.equal(elements[id].disabled,false));
  assert.equal(elements.periodReportReviewed.checked,false);assert.equal(elements.periodPublishButton.disabled,true);
  // Generation is possible again; a new review is required before sharing.
  await generate();assert.ok(host.periodModel);
 }else{
  assert.ok(host.periodAttempt);assert.equal(host.periodRequestId,'stable-id');
  lockedFields.forEach(id=>assert.equal(elements[id].disabled,true));
  assert.equal(elements.periodPublishButton.disabled,false);
  await assert.rejects(generate(),/pendiente/);
  insertError=null;readError=null;throwInsert=false;
  await run('publishPeriodLuxury');assert.equal(host.periodPublished,true);assert.equal(inserts,2);
 }
}
for(const code of ['42501','23502','23503','23514','22001','22P02','42P01','42703','PGRST204','PGRST205'])
 await recoveryCase({insertError:{code,message:'Synthetic rejected insert'},rejected:true});
await recoveryCase({insertError:{code:'NETWORK_TIMEOUT',message:'Uncertain insert'},throwInsert:true});
await recoveryCase({insertError:{code:'42501',message:'Thrown without a confirmed server response'},throwInsert:true});
await recoveryCase({insertError:{code:'UNKNOWN',message:'Unclassified result'}});
await recoveryCase({readError:{code:'42501',message:'Insert completed; read denied'}});
await recoveryCase({readError:{code:'NETWORK_TIMEOUT',message:'Insert completed; read timeout'}});
await recoveryCase({insertError:{code:'23505'},readError:{code:'42501',message:'Existing request; read denied'}});
console.log('PASS actual client + UI recovery: confirmed INSERT rejection unlocks/revokes review; unknown, transport, READ and duplicate/read failure preserve ID and locks.');

// A later rejection never erases uncertainty from an earlier attempt with this ID.
async function historicalUncertainty(firstTransportFailure,secondCode){
 current={userId:'coach',studentId:'student',epoch:1,allowed:true,canPublish:true,role:'coach'};
 ready();lockedFields.forEach(id=>elements[id].disabled=false);
 await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();
 let attempt=0,reads=0;
 const db={from(){return {
  async insert(row){assert.equal(row.id,'stable-id');assert.equal(row.report_text,generatedSnapshots.at(-1));attempt++;
   if(attempt===1){if(firstTransportFailure)throw Error('Transport uncertain');return {error:null};}
   if(attempt===2)return {error:{code:secondCode,message:'Later INSERT rejected'}};
   return {error:{code:'23505',message:'Same ID already exists'}};
  },
  select(){return {eq(key,id){assert.equal(id,'stable-id');return {async single(){reads++;
   if(attempt===1)return {data:null,error:{code:'NETWORK_TIMEOUT',message:'Readback uncertain'}};
   return {data:stored,error:null};
  }};}};}
 };}};
 host.periodClient=createPeriodReportHistory({sb:db,context:()=>current});
 await assert.rejects(run('publishPeriodLuxury'));
 const originalAttempt=host.periodAttempt;
 await assert.rejects(run('publishPeriodLuxury'));
 assert.equal(host.periodRequestId,'stable-id');assert.equal(host.periodAttempt,originalAttempt);
 lockedFields.forEach(id=>assert.equal(elements[id].disabled,true));
 await assert.rejects(generate(),/pendiente/);
 await run('publishPeriodLuxury');assert.equal(attempt,3);assert.equal(host.periodPublished,true);
 assert.equal(host.periodRequestId,'stable-id');assert.equal(reads,firstTransportFailure?1:2);
}
for(const code of ['42501','23514']){
 await historicalUncertainty(false,code);
 await historicalUncertainty(true,code);
}
console.log('PASS historical uncertainty: INSERT/read failure or transport failure + later rejection keeps same ID/locks until exact readback.');

// PDF-specific lifecycle uses actual dialog helpers; DOM and byte generator remain synthetic here.
current={userId:'coach',studentId:'student',epoch:1,allowed:true,canPublish:true,role:'coach'};
ready();await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();
assert.ok(host.periodReviewed);const openUrl=vm.runInContext('activePeriodPdfView.url',ctx);
ctx.closePeriodPdfView();assert.equal(host.periodReviewed,null);assert.equal(host.periodPdfSnapshot,null);assert.ok(revoked.includes(openUrl));
await assert.rejects(run('publishPeriodLuxury'),/confirmación/);
ready();let finishPdf;pdfDeferred=new Promise(r=>finishPdf=r);
const preparingPdf=run('printPeriodLuxury');current={...current,studentId:'other'};finishPdf();await preparingPdf;pdfDeferred=null;
assert.equal(blobs.size,0);assert.equal(host.periodPdfSnapshot,null);current={...current,studentId:'student'};
ready();pdfDeferred=new Promise(r=>finishPdf=r);const oldPdf=run('printPeriodLuxury'),newPdf=run('printPeriodLuxury');finishPdf();await Promise.all([oldPdf,newPdf]);pdfDeferred=null;
assert.equal(blobs.size,1);assert.equal(vm.runInContext('activePeriodPdfView.ready',ctx),true);
elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();host.periodPdfSnapshot.conclusion='Tampered after PDF generation';await assert.rejects(run('publishPeriodLuxury'),/confirmación/);
ready();await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();failSend=true;
await assert.rejects(run('publishPeriodLuxury'),/uncertain/);const retryId=host.periodRequestId,retryText=host.periodAttempt;
ctx.closePeriodPdfView();await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();failSend=false;
await run('publishPeriodLuxury');assert.equal(host.periodRequestId,retryId);assert.equal(host.periodAttempt,retryText);assert.equal(host.periodPublished,true);
ctx.closePeriodPdfView(true);
const historySnapshot=JSON.parse(stored.report_text);
await ctx.openPeriodPdfView({model:historySnapshot,context:{...current},current:()=>true,opener:null});
assert.equal(vm.runInContext('activePeriodPdfView.ready',ctx),true);
assert.doesNotMatch(vm.runInContext('activePeriodPdfView.dialog.innerHTML',ctx),/publishPeriodLuxury|periodReportReviewed/);
assert.equal(generatedSnapshots.at(-1),stored.report_text);
ctx.closePeriodPdfView(true);assert.equal(blobs.size,0);
console.log('PASS PDF lifecycle: exact snapshot binding, close revokes approval/URL, stale and repeated async opens, tamper rejection, uncertain close/reopen stable retry, read-only history uses same snapshot.');

// End-to-end synthetic byte contract: real PDF renderer + real client + real UI helpers.
if(!process.argv.includes('--skip-pdf-generation')){
const {buildPeriodReportPdf}=await import('../pilot/period-report-pdf.js');
ctx.buildPeriodReportPdf=buildPeriodReportPdf;
ready();await run('printPeriodLuxury');
const previewUrl=vm.runInContext('activePeriodPdfView.url',ctx);
const previewBytes=new Uint8Array(await blobs.get(previewUrl).arrayBuffer());
assert.equal(new TextDecoder().decode(previewBytes.slice(0,5)),'%PDF-');
let persistedRow;
const db={from(){return {async insert(row){persistedRow={...row};return {error:null};},select(){return {eq(){return {async single(){return {data:persistedRow,error:null};}};}};}};}};
host.periodClient=createPeriodReportHistory({sb:db,context:()=>current});
elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();await run('publishPeriodLuxury');
assert.equal(JSON.parse(persistedRow.report_text).pdfRendererVersion,VERSION);
assert.deepEqual(await buildPeriodReportPdf(JSON.parse(persistedRow.report_text)),previewBytes,'Student PDF must be byte-identical to the reviewed approved snapshot');
ctx.closePeriodPdfView(true);
await ctx.openPeriodPdfView({model:JSON.parse(persistedRow.report_text),context:{...current},current:()=>true});
const historyUrl=vm.runInContext('activePeriodPdfView.url',ctx);
assert.deepEqual(new Uint8Array(await blobs.get(historyUrl).arrayBuffer()),previewBytes);
ctx.closePeriodPdfView(true);
console.log('PASS real PDF/client/UI byte contract: reviewed bytes equal student history bytes from exact persisted versioned JSON.');
}else console.log('NOT RUN unchanged real PDF generation/parity block (--skip-pdf-generation).');
ready();
const emptyReport=buildLuxuryPeriodReport({from,to,friday:'2026-11-07',studentName:'Ficticio',coachName:'Coach ficticio',days:[]});
host.periodModel=emptyReport;elements.periodReportConclusion.value=emptyReport.conclusion;elements.periodReportFlexible.value=emptyReport.flexibleNote;ctx.syncPeriodReportPreview();
await run('printPeriodLuxury');assert.equal(elements.periodReportReviewed.disabled,true);assert.equal(elements.periodPublishButton.disabled,true);
assert.match(vm.runInContext("activePeriodPdfView.dialog.querySelector('[data-pdf-status]').textContent",ctx),/No hay registros/);
await assert.rejects(run('publishPeriodLuxury'),/confirmación/);ctx.closePeriodPdfView(true);
console.log('PASS empty-period PDF remains viewable but cannot be reviewed for sharing.');

// No return or error paint from a closed/replaced review or changed source.
for(const change of ['close','replacement','tab','student','epoch']){
 current={userId:'coach',studentId:'student',epoch:1,allowed:true,canPublish:true,role:'coach'};ctx.state.tab='reports';
 ready();await run('printPeriodLuxury');elements.periodReportReviewed.checked=true;elements.periodReportReviewed.change?.();ctx.syncPeriodReportPreview();
 const beforeReturn=returns;deferred=new Promise(r=>release=r);const pending=run('publishPeriodLuxury');
 if(change==='close'||change==='replacement')ctx.closePeriodPdfView(true);
 if(change==='replacement')await ctx.openPeriodPdfView({model:JSON.parse(stored.report_text),context:{...current},current:()=>true});
 if(change==='tab')ctx.state.tab='messages';
 if(change==='student')current={...current,studentId:'other'};
 if(change==='epoch')current={...current,epoch:2};
 elements.periodPublishStatus.textContent='New source owns this view';release();await pending;deferred=null;
 assert.equal(returns,beforeReturn,change+' must not return late');assert.equal(host.periodPublished,false);
 assert.equal(elements.periodPublishStatus.textContent,'New source owns this view');
 if(change==='replacement')assert.equal(vm.runInContext('activePeriodPdfView.dialog.open',ctx),true);
 ctx.closePeriodPdfView(true);
}
console.log('PASS R12 period return: exact confirmed success closes; failure and uncertainty remain; same-ID reconciliation closes; forced close, newer viewer, tab, student and epoch never return late.');
