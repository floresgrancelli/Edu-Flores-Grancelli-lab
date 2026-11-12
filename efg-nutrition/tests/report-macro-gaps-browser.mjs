// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/report-macro-gaps');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/macro-stats-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/macro-stats-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/macro-stats-sdk.mjs'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:1600},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-12T12:00:00Z')});
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='weight';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;window.__NCC_MACRO_FIXTURE__.enabled=true;});
 await page.locator('#macroStatsFrom').fill('2026-11-09');await page.locator('#macroStatsTo').fill('2026-11-11');await page.locator('[data-act="loadMacroStats"]').click();
 await page.locator('.ncc-gap-report').waitFor();assert.match(await page.locator('.ncc-gap-summary').innerText(),/30 g faltantes/);
 const owner=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.session.user.id);
 assert.ok(await page.evaluate(id=>window.__NCC_MACRO_FIXTURE__.reads.every(r=>r.id===id),owner));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Capture an actual phone-sized viewport, without hiding header or bottom navigation.
 await page.setViewportSize({width,height:width===390?844:740});
 await page.evaluate(()=>{const report=document.querySelector('.ncc-gap-report'),header=document.querySelector('.efg-mobile-header');window.scrollBy(0,report.getBoundingClientRect().top-(header?.getBoundingClientRect().bottom||0)-8);});
 const compact=await page.locator('.ncc-gap-card').evaluateAll(cards=>cards.map(e=>({height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e.querySelector('strong')).fontSize)})));
 assert.ok(compact.every(c=>c.height<105&&c.font>=20&&c.font<=22),'Compact readable summary cards');
 assert.equal(await page.locator('.pilot-nav').isVisible(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(out,engine+'-'+width+'-student-summary-phone.png'),fullPage:false});
 await page.setViewportSize({width,height:1600});
 await page.evaluate(()=>window.scrollTo(0,0));await page.locator('.ncc-gap-report').screenshot({path:resolve(out,engine+'-'+width+'-student-summary.png')});
 await page.locator('.ncc-gap-switch label').filter({hasText:'Por día'}).click();assert.match(await page.locator('.ncc-gap-daily').innerText(),/Sin registros/);assert.equal(await page.locator('.ncc-gap-summary').isVisible(),false);
 assert.equal(await page.locator('.ncc-gap-day').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth)),true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.locator('.ncc-gap-report').screenshot({path:resolve(out,engine+'-'+width+'-student-daily.png')});
 await page.evaluate(async()=>{const model=window.__NCC_R4_FULLAPP__.state.macroStats.model;const {renderLuxuryPeriodReport}=await import('/efg-nutrition/pilot/coach-report-models.js');document.getElementById('macroStatsResult').innerHTML=renderLuxuryPeriodReport(model);});
 await page.evaluate(()=>window.scrollTo(0,0));await page.locator('.ncc-gap-report').screenshot({path:resolve(out,engine+'-'+width+'-coach-summary.png')});
 await page.locator('.ncc-gap-switch label').filter({hasText:'Por día'}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.locator('.ncc-gap-report').screenshot({path:resolve(out,engine+'-'+width+'-coach-daily.png')});
 await page.locator('.ncc-gap-switch label').filter({hasText:'Devolución'}).click();assert.equal(await page.locator('.ncc-gap-feedback').isVisible(),true);
 await page.locator('#macroStatsTo').fill('2026-11-10');assert.equal(await page.locator('.ncc-gap-report').count(),0);
 await page.evaluate(()=>{window.__NCC_MACRO_FIXTURE__.hold=true;});await page.locator('[data-act="loadMacroStats"]').click();await page.waitForFunction(()=>!!window.__NCC_MACRO_FIXTURE__.release);
 await page.evaluate(()=>{window.__NCC_R4_FULLAPP__.state.authContextEpoch++;window.__NCC_MACRO_FIXTURE__.hold=false;window.__NCC_MACRO_FIXTURE__.release();});
 await page.waitForFunction(()=>!document.getElementById('macroStatsResult').loading);assert.equal(await page.locator('.ncc-gap-report').count(),0);
 assert.deepEqual(errors,[]);evidence.push({engine,width,passed:true,ownUserScope:true,staleResultRejected:true});await context.close();
 }}finally{await browser.close();}
}}finally{server.close();}
writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(evidence);
