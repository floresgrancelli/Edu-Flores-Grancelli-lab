import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildLuxuryWeeklyReport,reportAsStoredText,parseLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';
import {buildWeeklyReportPdf} from '../pilot/weekly-report-pdf.js';
import {WEEKLY_PDF_RENDERER_VERSION} from '../pilot/weekly-report-pdf-v1.js'; // Frozen R11 regression.
const require=createRequire(import.meta.url);
const days=Array.from({length:5},(_,i)=>({date:'2026-10-'+(30+i<32?30+i:'01'),hasData:true,closed:true,mealCount:2,k:1900,p:110,c:240,f:55}));
for(let i=0;i<days.length;i++){const d=new Date('2026-10-30T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);days[i].date=d.toISOString().slice(0,10);}
const generated=buildLuxuryWeeklyReport({from:'2026-10-30',to:'2026-11-05',friday:'2026-11-06',studentName:'María José Núñez · FICTICIO',coachName:'Coach ficticio',days,goals:[{start_on:'2026-01-01',kcal:2100,protein_g:120,carb_g:250,fat_g:60}],logs:days.map(d=>({log_day:d.date,meals:{desayuno:[{id:'avena',name:'Avena con yogur y arándanos',fi:8}]},sports:[]}))});
const text=reportAsStoredText({...generated,pdfRendererVersion:WEEKLY_PDF_RENDERER_VERSION},'¡Hola, María José!\n\nConclusión semanal FICTICIA con acentos: á é í ó ú ñ ü.\nRevisamos cinco días, sin inventar los ausentes.','Disfrutar sin premios ni compensaciones.');
const snapshot=parseLuxuryWeeklyReport(text);assert.ok(text.length<=8000);assert.equal(snapshot.pdfRendererVersion,WEEKLY_PDF_RENDERER_VERSION);
const bytes=await buildWeeklyReportPdf(snapshot),studentBytes=await buildWeeklyReportPdf(parseLuxuryWeeklyReport(text));
assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');assert.deepEqual(studentBytes,bytes,'Student gets byte-identical PDF from the exact stored snapshot');
const legacy={...snapshot};delete legacy.pdfRendererVersion;assert.deepEqual(await buildWeeklyReportPdf(legacy),bytes);
await assert.rejects(buildWeeklyReportPdf({...snapshot,pdfRendererVersion:'unknown'}),/Versión/);
await assert.rejects(buildWeeklyReportPdf({...snapshot,approvedByCoach:false}),/válido/);
await assert.rejects(buildWeeklyReportPdf({...snapshot,conclusion:'Unsupported 🧬'}),/carácter/);
const out=new URL('../../artifacts/weekly-preview/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('weekly-synthetic.pdf',out),bytes);writeFileSync(new URL('weekly-snapshot.json',out),JSON.stringify(snapshot,null,2));
const max={...snapshot,conclusion:('Texto largo ficticio con acentos y saltos de línea.\n\n').repeat(42).slice(0,2170)+'\nFIN CONCLUSIÓN',flexibleNote:('Sin culpa ni compensaciones.\n').repeat(24)+'FIN NOTA'};
const maxText=reportAsStoredText(max,max.conclusion,max.flexibleNote);assert.ok(maxText.length<=8000);
const maxBytes=await buildWeeklyReportPdf(JSON.parse(maxText));writeFileSync(new URL('weekly-synthetic-long.pdf',out),maxBytes);
const plain={kind:'efg_legacy_weekly_text_v1',reportText:'Informe anterior FICTICIO.\nTexto histórico íntegro.\nSin reconstruir datos actuales.',friday:'2026-01-02'};
await assert.rejects(buildWeeklyReportPdf({...plain,friday:'2026-02-30'}),/Fecha/);
const plainBytes=await buildWeeklyReportPdf(plain);assert.deepEqual(await buildWeeklyReportPdf(plain),plainBytes);writeFileSync(new URL('weekly-synthetic-legacy.pdf',out),plainBytes);
// Real PDF.js decode/render of the actual generated PDF, using a native canvas in Node.
// This verifies pixels/embedded text, NOT browser behavior or an actual mobile device.
const {createCanvas,DOMMatrix,ImageData,Path2D}=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const pdfjs=await import('../pilot/vendor/pdfjs-5.6.205/pdf.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../pilot/vendor/pdfjs-5.6.205/pdf.worker.min.mjs',import.meta.url).href;
let normalPages=0;
for(const [label,data]of [['normal',bytes],['long',maxBytes],['legacy',plainBytes]]){
 const pdf=await pdfjs.getDocument({data:data.slice(),isEvalSupported:false,useSystemFonts:false}).promise;
 if(label==='normal')normalPages=pdf.numPages;
 let full='';
 for(let n=1;n<=pdf.numPages;n++){
  const page=await pdf.getPage(n),viewport=page.getViewport({scale:1.3}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  writeFileSync(new URL(label+'-page-'+n+'.png',out),canvas.toBuffer('image/png'));
  full+=(await page.getTextContent()).items.map(i=>i.str).join(' ')+'\n';
 }
 writeFileSync(new URL(label+'-text.txt',out),full);
 if(label==='normal'){assert.match(full,/Tu semana,/);assert.match(full,/María José Núñez/);assert.match(full,/Conclusión semanal FICTICIA/);assert.match(full,/Sin datos/);assert.match(full,/REVISADO POR/);}
 if(label==='long'){assert.match(full,/FIN CONCLUSIÓN/);assert.match(full,/FIN NOTA/);}
 if(label==='legacy')assert.match(full,/Texto histórico íntegro/);
 await pdf.destroy();
}
console.log('PASS weekly PDF: exact coach/student bytes; '+normalPages+' real rendered pages; bounded JSON; accents; multiline; long text; legacy conversion; unknown versions rejected. Node PDF.js pixels, not mobile certification.');
