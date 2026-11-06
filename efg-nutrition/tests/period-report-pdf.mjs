import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {buildLuxuryPeriodReport,periodReportAsStoredText,parseLuxuryPeriodReport} from '../pilot/period-luxury-report.js';
import {buildPeriodReportPdf,PERIOD_PDF_RENDERER_VERSION} from '../pilot/period-report-pdf.js';
const day=i=>{const d=new Date('2026-08-09T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);};
function model(count){
 const days=Array.from({length:count},(_,i)=>({date:day(i),hasData:i%7!==2,closed:i%5!==0,mealCount:3,k:1900+i*3,p:100+i/4,c:250,f:60,fi:28}));
 const logs=days.filter(d=>d.hasData).map(d=>({log_day:d.date,meals:{desayuno:[{id:'avena',name:'Avena con yogur y arándanos',fi:28}]},sports:[]}));
 const generated=buildLuxuryPeriodReport({from:day(0),to:day(count-1),friday:day(count),studentName:'María José Núñez · FICTICIO',coachName:'Coach ficticio',days,logs,goals:[{start_on:'2026-01-01',kcal:2200,protein_g:125,carb_g:280,fat_g:65,fiber_g:30}]});
 const conclusion='¡Hola, María José! Esta es una revisión ficticia de tus registros.\n\nProteínas, energía y hábitos: disfrutá tu alimentación con flexibilidad. ¿Cómo te sentiste esta semana?\nPróximo paso: elegí una acción pequeña y sostenible, sin presión ni compensaciones.';
 return {...parseLuxuryPeriodReport(periodReportAsStoredText(generated,conclusion,generated.flexibleNote)),pdfRendererVersion:PERIOD_PDF_RENDERER_VERSION};
}
const m=model(10),a=await buildPeriodReportPdf(m),b=await buildPeriodReportPdf(JSON.parse(JSON.stringify(m)));
assert.ok(a instanceof Uint8Array);assert.equal(new TextDecoder().decode(a.slice(0,5)),'%PDF-');assert.deepEqual(a,b,'Same approved snapshot must generate byte-identical PDFs');
const old={...m};delete old.pdfRendererVersion;assert.deepEqual(await buildPeriodReportPdf(old),a,'Legacy can be converted explicitly using current renderer');
await assert.rejects(buildPeriodReportPdf({...m,pdfRendererVersion:'future-v999'}),/Versión/);
await assert.rejects(buildPeriodReportPdf({...m,approvedByCoach:false}),/válido/);
await assert.rejects(buildPeriodReportPdf({...m,conclusion:m.conclusion+' 🧬'}),/carácter/,'Unsupported characters must never silently disappear');
const long=model(90);long.conclusion=('Texto largo ficticio con acentos: á é í ó ú ñ ü.\n\n'+ 'Una explicación extensa conserva cada palabra y cada salto de línea para revisar sin perder contenido. ').repeat(12).slice(0,2100)+'\nFIN CONCLUSIÓN';
long.flexibleNote=('Disfrutar también importa.\nPodés conversar con tu coach sobre tus preferencias. ').repeat(8)+'\nFIN NOTA';
const max=await buildPeriodReportPdf(long);assert.deepEqual(max,await buildPeriodReportPdf(long));
const output=new URL('../../output/pdf/',import.meta.url);mkdirSync(output,{recursive:true});
writeFileSync(new URL('luxury-period-ficticio-10-dias.pdf',output),a);
writeFileSync(new URL('luxury-period-ficticio-90-dias.pdf',output),max);
writeFileSync(new URL('snapshots.json',output),JSON.stringify({normal:m,long},null,2));
console.log('PASS real PDF: deterministic approved snapshots, legacy explicit conversion, unknown version/approval/unsupported Unicode blocked, 10/90-day fixtures.');
