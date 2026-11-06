import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildLuxuryWeeklyReport,reportAsStoredText} from '../pilot/weekly-luxury-report.js';
import {buildWeeklyReportPdf} from '../pilot/weekly-report-pdf.js';
import {buildLuxuryPeriodReport,periodReportAsStoredText} from '../pilot/period-luxury-report.js';
import {buildPeriodReportPdf,PERIOD_PDF_RENDERER_VERSION} from '../pilot/period-report-pdf.js';
import {readPdfPageText} from '../pilot/pdf-page-text.js';
const require=createRequire(import.meta.url),{createCanvas,DOMMatrix,ImageData,Path2D}=require('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const m=buildLuxuryPeriodReport({from:'2026-10-22',to:'2026-10-31',friday:'2026-11-01',studentName:'Persona FICTICIA',coachName:'Coach FICTICIO',days:[{date:'2026-10-22',hasData:true,closed:true,k:1800,p:110,c:210,f:55,mealCount:2}],goals:[],logs:[]});
const period=JSON.parse(periodReportAsStoredText(m,m.conclusion,m.flexibleNote));
const weeklyDraft=buildLuxuryWeeklyReport({from:'2026-10-23',to:'2026-10-29',friday:'2026-10-30',studentName:'Persona FICTICIA',coachName:'Coach FICTICIO',days:[{date:'2026-10-23',hasData:true,closed:true,k:1800,p:110,c:210,f:55,mealCount:2}],goals:[],logs:[]});
const cases=[['period-v2',await buildPeriodReportPdf({...period,pdfRendererVersion:PERIOD_PDF_RENDERER_VERSION})],['period-v1',await buildPeriodReportPdf(period)],['weekly',await buildWeeklyReportPdf(JSON.parse(reportAsStoredText(weeklyDraft,weeklyDraft.conclusion,weeklyDraft.flexibleNote)))],['plain-legacy',await buildWeeklyReportPdf({kind:'efg_legacy_weekly_text_v1',reportText:'Texto histórico FICTICIO. Sin datos actuales.',friday:'2026-10-30'})]];
const descriptor=Object.getOwnPropertyDescriptor(ReadableStream.prototype,Symbol.asyncIterator);
try{
 assert.equal(delete ReadableStream.prototype[Symbol.asyncIterator],true);
 const pdfjs=await import('../pilot/vendor/pdfjs-5.6.205/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../pilot/vendor/pdfjs-5.6.205/pdf.worker.min.mjs',import.meta.url).href;
 assert.equal(typeof ReadableStream.prototype[Symbol.asyncIterator],'undefined','Legacy vendor does not supply this platform API');
 for(const [label,bytes]of cases){
  const pdf=await pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:false,useWasm:false}).promise;
  try{
   const page=await pdf.getPage(1);
   await assert.rejects(page.getTextContent(),/async iterable/,label);
   const viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const actual=await readPdfPageText(page);
   Object.defineProperty(ReadableStream.prototype,Symbol.asyncIterator,descriptor);
   let expected;try{expected=await page.getTextContent();}finally{delete ReadableStream.prototype[Symbol.asyncIterator];}
   assert.deepEqual(actual,expected,label+': exact PDF text items/styles/lang');assert.match(actual.items.map(x=>x.str).join(' '),/FICTICI/);
   assert.equal(typeof ReadableStream.prototype[Symbol.asyncIterator],'undefined','Application does not install a global polyfill');
  }finally{await pdf.destroy();}
 }
}finally{Object.defineProperty(ReadableStream.prototype,Symbol.asyncIterator,descriptor);}
const chunks=[{items:[],styles:{},lang:null},{items:[{str:'Uno'}],styles:{a:{name:'font-a'}},lang:'es'},{items:[{str:'Dos'}],styles:{b:{name:'font-b'}},lang:'en'}];
const merged=await readPdfPageText({streamTextContent:()=>new ReadableStream({start(c){chunks.forEach(x=>c.enqueue(x));c.close();}})});
assert.deepEqual(merged.items,[{str:'Uno'},{str:'Dos'}]);assert.equal(merged.lang,'es');assert.deepEqual({...merged.styles},{a:{name:'font-a'},b:{name:'font-b'}});
const empty=await readPdfPageText({streamTextContent:()=>new ReadableStream({start(c){c.close();}})});assert.deepEqual(empty.items,[]);assert.equal(empty.lang,null);
// Cancellation and read errors release the lock, without returning a partial page
// that could enable approval after context changed or text extraction failed.
let current=true,cancelled=0,released=0,detach=0,resolve;
const fake={streamTextContent:()=>({getReader:()=>({read:()=>new Promise(r=>resolve=r),cancel:async()=>{cancelled++;},releaseLock(){released++;}})})};
const pending=readPdfPageText(fake,{isCurrent:()=>current,onReader:()=>()=>detach++});current=false;resolve({done:false,value:{items:[{str:'STALE'}],styles:{}}});assert.equal(await pending,null);assert.equal(cancelled,1);assert.equal(released,1);assert.equal(detach,1);
let reads=0;assert.equal(await readPdfPageText({streamTextContent(){reads++;}},{isCurrent:()=>false}),null);assert.equal(reads,0);
const failed={streamTextContent:()=>({getReader:()=>({read:async()=>{throw Error('synthetic extraction failure');},releaseLock(){released++;}})})};await assert.rejects(readPdfPageText(failed),/extraction/);assert.equal(released,2);
console.log('PASS real PDF with ReadableStream asyncIterator absent: vendor convenience API reproduces failure, render+reader succeeds with identical items/styles/lang, no global patch; stale/error cleanup blocks partial review. API emulation, not physical Safari certification.');
