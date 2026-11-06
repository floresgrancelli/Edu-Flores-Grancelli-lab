// New copy/presentation with synthetic records only. Old renderers and snapshots stay intact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as current from '../pilot/coach-report-models.js';
import * as weeklyOld from '../pilot/weekly-luxury-report.js';
import * as periodOld from '../pilot/period-luxury-report.js';
import {buildWeeklyReportPdf,WEEKLY_PDF_RENDERER_VERSION} from '../pilot/weekly-report-pdf.js';
import {buildPeriodReportPdf,PERIOD_PDF_RENDERER_VERSION} from '../pilot/period-report-pdf.js';
import {buildWeeklyReportPdf as weeklyV1} from '../pilot/weekly-report-pdf-v1.js';
import {buildPeriodReportPdf as periodV1} from '../pilot/period-report-pdf-v1.js';
import {buildPeriodReportPdf as periodV2} from '../pilot/period-report-pdf-v2.js';
import {withReportTrendGoals} from '../pilot/report-trend-snapshot.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const frozen={
 'weekly-report-pdf-v1.js':'e965be9fe78e315e1ca0e60fc84323b94c5bc2b6e94dd3d5ef5abbdf6038fa6a',
 'period-report-pdf-v1.js':'14b614b99b313e465eb5cf3fd3362eb32eac2fff8533133197337f5d56f486c3',
 'period-report-pdf-v2.js':'5349cac0c09c4e2a74806a3569739819669b56834c4836737f9e0d3a7eecef93',
 'weekly-legacy-pdf.js':'51c568f5112a5f2df813cf23e61deacd5861894d29eb6091c24f5697fc307a3e',
 'weekly-luxury-report.js':'3f73d85214852df9de3edb0bd19f83dcf9292f544daf454c89f3d639ec752504',
 'period-luxury-report.js':'43f9f593c9849b45d98159681161aa35e1c8f377476177250cd6e07be4883e22'};
for(const [file,hash]of Object.entries(frozen))assert.equal(sha(readFileSync(new URL('../pilot/'+file,import.meta.url))),hash,'Published asset changed: '+file);
const date=i=>{const d=new Date('2026-08-09T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);};
function input(count,{recorded=count,k=1900,p=100,c=240,f=55,goals=true,name='Coach FICTICIO'}={}){
 return {from:date(0),to:date(count-1),friday:date(count),studentName:'María José Núñez · FICTICIO',coachName:name,
  days:Array.from({length:recorded},(_,i)=>({date:date(i),hasData:true,closed:i%2===0,mealCount:3,k,p,c,f,fi:24})),
  logs:[],goals:goals?[{start_on:date(0),kcal:2100,protein_g:120,carb_g:250,fat_g:65,fiber_g:28}]:[]};
}
const api=kind=>kind==='weekly'?{build:current.buildLuxuryWeeklyReport,old:weeklyOld,legacyBuild:weeklyOld.buildLuxuryWeeklyReport,store:current.reportAsStoredText,legacyStore:weeklyOld.reportAsStoredText,render:current.renderLuxuryWeeklyReport,legacyRender:weeklyOld.renderLuxuryWeeklyReport,pdf:buildWeeklyReportPdf,version:WEEKLY_PDF_RENDERER_VERSION}:{build:current.buildLuxuryPeriodReport,old:periodOld,legacyBuild:periodOld.buildLuxuryPeriodReport,store:current.periodReportAsStoredText,legacyStore:periodOld.periodReportAsStoredText,render:current.renderLuxuryPeriodReport,legacyRender:periodOld.renderLuxuryPeriodReport,pdf:buildPeriodReportPdf,version:PERIOD_PDF_RENDERER_VERSION};
const controlled=/\bEFG\b|(?:con|a|junto a) tu coach|El coach debe|Conclusión revisada por tu coach|REVISADO POR/i;
const dataKeys=['kind','from','to','friday','daysRecorded','daysClosed','daysWithMeasuredMeals','daysWithMultipleMeals','days','averages','targets','fiber','topFoods'];
for(const kind of ['weekly','period']){
 const a=api(kind),count=kind==='weekly'?7:10;
 for(const options of [{},{recorded:0},{recorded:2},{p:30,k:900,f:10},{p:130,k:1400,c:70},{k:3000},{goals:false}]){
  const args=input(count,options),m=a.build(args),old=a.legacyBuild(args);
  for(const key of dataKeys)assert.deepEqual(m[key],old[key],kind+' numeric/coverage rule '+key);
  assert.deepEqual(m.evidence.comparisons,old.evidence.comparisons);
  assert.doesNotMatch([m.conclusion,m.flexibleNote,...m.focus,m.evidence.rule].join(' '),controlled);
  assert.match(m.conclusion,/Te propongo/);assert.match(m.flexibleNote,/No hace falta ganárselos ni compensarlos/);
  const saved=JSON.parse(a.store({...m,pdfRendererVersion:a.version},m.conclusion,m.flexibleNote));
  assert.doesNotMatch(a.render(saved).replace(/<[^>]+>/g,' '),controlled);
  assert.match(a.render(saved),/Mi devolución para vos/);assert.match(a.render(saved),/Coach FICTICIO · Tu coach/);
  const historic=JSON.parse(a.legacyStore(old,old.conclusion,old.flexibleNote)),text=JSON.stringify(historic);
  assert.equal(a.render(historic),a.legacyRender(historic));assert.match(a.render(historic),/EFG/);assert.equal(JSON.stringify(historic),text);
  const unknown={...saved,coachVoiceVersion:'unknown'};assert.equal(a.render(unknown),'');assert.throws(()=>a.store(unknown,unknown.conclusion,unknown.flexibleNote),/inválidos/);
 }
 const m=a.build(input(count));const manual='Texto manual FICTICIO EFG.\n\nHablé con mi coach y prefiero conservar esta frase.';
 const saved=JSON.parse(a.store(m,manual,'Nota manual con EFG.'));assert.equal(saved.conclusion,manual);assert.equal(saved.flexibleNote,'Nota manual con EFG.');
 assert.match(a.render(saved),/Texto manual FICTICIO EFG/);
 const noName=a.build(input(count,{name:''}));assert.equal(noName.coachName,'Tu coach');assert.doesNotMatch(a.render(noName),/Tu coach · Tu coach/);
}
const identity={session:{user:{id:'owner'}},org:{coach_id:'owner'},profile:{user_id:'owner',role:'coach',active:true,nickname:'María José FICTICIA'}};
assert.equal(current.reportCoachName(identity),'María José FICTICIA');
assert.equal(current.reportCoachName({...identity,profile:{...identity.profile,nickname:'',full_name:'Nombre FICTICIO'}}),'Nombre FICTICIO');
assert.equal(current.reportCoachName({...identity,profile:{...identity.profile,nickname:'Entrenador EFG'}}),'Tu coach');
assert.equal(current.reportCoachName({...identity,profile:{...identity.profile,nickname:'Ana EFG'}}),'Ana EFG','Do not silently rewrite a legitimate/manual name');
for(const variant of [{profile:{...identity.profile,user_id:'other'}},{org:{coach_id:'other'}},{profile:{...identity.profile,role:'admin'}},{profile:{...identity.profile,nickname:'',full_name:''}},{profile:{...identity.profile,active:false}}])assert.equal(current.reportCoachName({...identity,...variant}),'Tu coach');
assert.equal(current.reportCoachName({...identity,profile:{...identity.profile,role:'admin'},org:{coach_id:'owner',is_test:true}}),'María José FICTICIA');
// Old unversioned snapshots continue selecting literal historical v1, even after current constants advance.
for(const kind of ['weekly','period']){
 const a=api(kind),old=a.legacyBuild(input(kind==='weekly'?7:10)),m=JSON.parse(a.legacyStore(old,old.conclusion,old.flexibleNote));
 assert.deepEqual(await a.pdf(m),await(kind==='weekly'?weeklyV1:periodV1)(m));
 if(kind==='period')assert.deepEqual(await a.pdf({...m,pdfRendererVersion:'ncc-luxury-period-pdf-v2'}),await periodV2({...m,pdfRendererVersion:'ncc-luxury-period-pdf-v2'}));
}
const {createCanvas,DOMMatrix,ImageData,Path2D}=createRequire(import.meta.url)('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const pdfjs=await import('../pilot/vendor/pdfjs-5.6.205/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../pilot/vendor/pdfjs-5.6.205/pdf.worker.min.mjs',import.meta.url).href;
const out=new URL('../../artifacts/report-share-return-r12/',import.meta.url);mkdirSync(out,{recursive:true});const results=[];
for(const [label,kind,count,long]of [['weekly','weekly',7,false],['weekly-long','weekly',7,true],['period-one','period',1,false],['period-ten','period',10,false],['period-ninety','period',90,true]]){
 const a=api(kind),args=input(count,{name:long?'María José Álvarez Núñez · Coach FICTICIA con nombre largo para revisión':'Coach FICTICIO'}),draft=withReportTrendGoals(a.build(args),args.goals);
 if(long){draft.conclusion=('Te propongo revisar tus registros con calma. Á é í ó ú ñ ü.\n\n').repeat(30)+'FIN DEVOLUCIÓN';draft.flexibleNote=('Podemos conversar sobre tus preferencias, sin compensaciones.\n').repeat(10)+'FIN NOTA';}
 const snapshot=JSON.parse(a.store({...draft,pdfRendererVersion:a.version},draft.conclusion,draft.flexibleNote));
 const bytes=await a.pdf(snapshot);assert.deepEqual(await a.pdf(JSON.parse(JSON.stringify(snapshot))),bytes,'Coach/student exact bytes '+label);
 await assert.rejects(a.pdf({...snapshot,pdfRendererVersion:'unknown'}),/Versión/);
 await assert.rejects(a.pdf({...snapshot,coachVoiceVersion:'unknown'}),/válido/);
 await assert.rejects(a.pdf({...snapshot,approvedByCoach:false}),/válido/);
 await assert.rejects(a.pdf({...snapshot,conclusion:'Unsupported 🧬'}),/carácter/);
 writeFileSync(new URL(label+'.pdf',out),bytes);writeFileSync(new URL(label+'-snapshot.json',out),JSON.stringify(snapshot,null,2));
 const doc=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:false,isEvalSupported:false}).promise;
 assert.equal((await doc.getMetadata()).info.Author,snapshot.coachName);let text='';
 for(let n=1;n<=doc.numPages;n++){
  const page=await doc.getPage(n),viewport=page.getViewport({scale:1.1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  writeFileSync(new URL(label+'-page-'+n+'.png',out),canvas.toBuffer('image/png'));
  text+=(await page.getTextContent()).items.map(x=>x.str).join(' ')+'\n';
 }
 assert.doesNotMatch(text,controlled);assert.match(text,/Mi devolución para vos/);assert.match(text,/Tu coach/);assert.match(text,/no sustituye asesoramiento médico/);
 if(long){assert.match(text,/FIN DEVOLUCIÓN/);assert.match(text,/FIN NOTA/);}else assert.match(text,/Te propongo/);
 writeFileSync(new URL(label+'-text.txt',out),text);results.push({label,version:a.version,pages:doc.numPages,bytes:bytes.length,sha256:sha(bytes),coachStudentParity:true});await doc.destroy();
}
writeFileSync(new URL('results.json',out),JSON.stringify({scope:'Synthetic Node PDF pixels, not browser/device/live RLS',tone:'USER_APPROVED_COACH_TO_STUDENT_COPY_NOT_RELEASE_APPROVAL',results},null,2));
console.log('PASS coach voice: exact numeric parity, all advice branches, verified attribution/fallback, manual copy untouched, old HTML/bytes unchanged, current weekly v2 and period v3 PDF text/pixels/parity. '+JSON.stringify(results));
