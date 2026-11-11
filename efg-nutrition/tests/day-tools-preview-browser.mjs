// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/day-tools-preview');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const browser=await engines.chromium.launch({headless:true});
const evidence=[];
try{
for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();
 await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();
 await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{
  const v=window.__NCC_R4_FULLAPP__,s=v.state;
  s.diary.meals.desayuno=[{id:'demo',name:'Otros registros ficticios',qty:1,unit:'porción',k:730,p:42,c:90,f:26,fi:4}];
  s.diary.meals.almuerzo=[{id:'chicken',name:'Pollo a la plancha',qty:150,unit:'g',k:248,p:46,c:0,f:5,fi:0},{id:'rice',name:'Arroz integral',qty:180,unit:'g',k:272,p:7,c:50,f:3,fi:2}];
  Object.assign(s.goals[0],{kcal:2100,protein_g:150,carb_g:230,fat_g:70});s.lastEditedMeal='almuerzo';
  await v.render();
  document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 });
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 // Students keep their existing optional comment and unsaved text.
 await page.locator('.efg-optional-panel > summary').click();await page.locator('#dayComment').fill('Borrador conservado');
 await page.locator('#nccDayTools > summary').click();
 await page.locator('#nccDayTools > summary').click();
 assert.equal(await page.locator('#dayComment').inputValue(),'Borrador conservado');
 await page.locator('[data-daymeal="cena"]').click();await page.locator('[data-daymeal="almuerzo"]').click();
 assert.equal(await page.locator('#dayComment').inputValue(),'Borrador conservado');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
 // Personal professional view uses the same markup; no assigned coach required.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__,s=v.state;s.profile.role='admin';s.personalTargets={kcal:2100,protein_g:150,carb_g:230,fat_g:70,fiber_g:28,updated_at:new Date().toISOString()};s.tab='home';await v.render();});
 assert.equal(await page.locator('#dayComment').count(),0);
 assert.equal(await page.locator('.efg-optional-panel').count(),0);
 await page.evaluate(()=>{document.querySelector('#nccDayTools').open=false;scrollTo(0,0)});
 await page.screenshot({path:resolve(out,width+'-closed.png'),fullPage:true});
 await page.locator('#nccDayTools > summary').click();
 await page.screenshot({path:resolve(out,width+'-open.png'),fullPage:true});
 const sizes=await page.locator('#nccDayTools summary,#nccDayTools button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height));
 assert.ok(sizes.every(h=>h>=44));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#nccDayGoals > summary').click();await page.locator('#selfK').fill('2150');
 await page.locator('#nccDayTools > summary').click();await page.locator('#nccDayTools > summary').click();assert.equal(await page.locator('#selfK').inputValue(),'2150');
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.diary.meals.almuerzo[0].name='Huevo frito con Fritolín / Fritolim (rocío vegetal mínimo)';await v.render();});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(out,width+'-long-name.png'),fullPage:true});
 evidence.push({width,drafts:true,noOverflow:true,touchTargets:true,professionalCommentAbsent:true});
 await context.close();
}
writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));
}finally{await browser.close();server.close();}
