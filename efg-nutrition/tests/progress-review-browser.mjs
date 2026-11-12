// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/progress-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.
copyFileSync(resolve(root,'efg-nutrition/pilot/nutrition-daily-tip.js'),resolve(preview,'dist/efg-nutrition/pilot/nutrition-daily-tip.js'));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_PROGRESS_QA__={setReports:v=>{myWeeklyReports=v;}};');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');


const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;const m=await import('/efg-nutrition/pilot/weekly-luxury-report.js');
 const end=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
 v.state.weights=[{measured_on:end,measured_at:end+'T10:00:00Z',kg:78.4}];
 v.state.progressLogs=Array.from({length:5},(_,i)=>{const d=new Date(end+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);return {log_day:d.toISOString().slice(0,10),meals:{almuerzo:[{name:'Pollo y arroz · DEMO',k:620,p:45,c:65,f:20}]}};});
 const model=m.buildLuxuryWeeklyReport({from:'2026-11-01',to:'2026-11-07',friday:'2026-11-08',studentName:'Alumno · DEMO',coachName:'Coach · DEMO',days:[],goals:[]});
 window.__NCC_PROGRESS_QA__.setReports([{week_ending:'2026-11-08',report_text:m.reportAsStoredText(model,'Vamos a sostener los hábitos y revisar tus registros en el próximo encuentro.','Un espacio para disfrutar con flexibilidad.')}]);
 v.state.tab='weight';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;});
 for(const section of ['summary','nutrition','reports']){
 await page.locator('.ncc-progress-main-tabs [data-progresssection='+section+']').click();
 assert.equal(await page.locator('[data-progresspanel]:visible').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(section==='reports'){await page.locator('#nccProgress-reports details').first().locator('summary').click();assert.equal(await page.locator('#nccProgress-reports [data-act=replyWeeklyReport]').count(),1);}
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+section+'.png'),fullPage:true});
 }
 await page.locator('.ncc-progress-main-tabs [data-progresssection=summary]').click();
 await page.locator('[data-progresssection=weight]').click();await page.locator('#weightKg').fill('79.2');
 await page.locator('.ncc-progress-main-tabs [data-progresssection=summary]').click();
 await page.locator('[data-progresssection=activity]').click();await page.locator('#activitySteps').fill('4321');
 await page.locator('.ncc-progress-main-tabs [data-progresssection=nutrition]').click();
 await page.locator('[data-progresspanel]:visible [data-progress-range="30"]').click();
 await page.locator('.ncc-progress-main-tabs [data-progresssection=summary]').click();
 await page.locator('[data-progresssection=weight]').click();assert.equal(await page.locator('#weightKg').inputValue(),'79.2');
 await page.locator('.ncc-progress-main-tabs [data-progresssection=summary]').click();
 await page.locator('[data-progresssection=activity]').click();assert.equal(await page.locator('#activitySteps').inputValue(),'4321');
 evidence.push({engine,width,threeSections:true,drafts:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS progress',evidence.length);
}finally{server.close();}
