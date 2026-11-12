// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/student-plan-preview');
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

const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{
 const v=window.__NCC_R4_FULLAPP__,s=v.state;s.tab='planner';Object.assign(s.goals[0],{kcal:2100,protein_g:150,carb_g:240,fat_g:60});
 s.foodPlan.guided_plan.meals.find(m=>m.slot==='almuerzo').items=[{id:'chicken',name:'Pollo a la plancha',qty:150,unit:'g',k:1.65,p:.31,c:0,f:.036,fi:0},{id:'rice',name:'Arroz integral cocido',qty:180,unit:'g',k:1.3,p:.027,c:.28,f:.003,fi:.004},{id:'broccoli',category:'vegetable',name:'Vegetales',qty:150,unit:'g',k:.34,p:.028,c:.066,f:.004,fi:.026}];
 await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 });
 await page.addStyleTag({content:'[aria-label="Espacios de la cuenta · candidata"]{display:none!important}'});
 await page.locator('[data-studentguideslot="almuerzo"]').click();await page.locator('[data-studentguideregister="almuerzo"]').waitFor();
 assert.equal(await page.locator('.ncc-plan-meal').count(),1);assert.equal(await page.locator('.ncc-plan-food').count(),3);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('.ncc-plan-food img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 await page.screenshot({path:resolve(out,engine+'-'+width+'-plan.png')});
 const original=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.foodPlan));
 const open=async()=>{await page.locator('[data-studentguideregister="almuerzo"]').click();await page.locator('.ncc-plan-sheet').waitFor();};
 const writes=()=>page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes);
 await open();assert.equal(await page.locator('.pilot-nav').isVisible(),false);
 await page.locator('.ncc-plan-entry img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 await page.screenshot({path:resolve(out,engine+'-'+width+'-review.png')});
 await page.locator('[data-guideentryqty="0"]').fill('125,5');await page.locator('[data-guideentrycheck="2"]').uncheck();await page.keyboard.press('Escape');assert.equal(await writes(),0);
 await page.locator('[data-studentguideslot="cena"]').click();await page.locator('[data-studentguideslot="almuerzo"]').click();await open();
 assert.equal(await page.locator('[data-guideentryqty="0"]').inputValue(),'125,5');assert.equal(await page.locator('[data-guideentrycheck="2"]').isChecked(),false);
 await page.locator('[data-guideentryqty="0"]').fill('-1');await page.locator('[data-guidesave]').click();assert.equal(await writes(),0);assert.match(await page.locator('#nccPlanError').innerText(),/cantidades/);
 await page.locator('[data-guideentryqty="0"]').fill('125,5');
 await page.setViewportSize({width,height:430});await page.locator('[data-guideentryqty="0"]').focus();await page.locator('[data-guidesave]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.pilot-nav').isVisible(),false);await page.setViewportSize({width,height:950});
 await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true);await page.locator('[data-guidesave]').click();await page.waitForFunction(()=>document.querySelector('#nccPlanError')?.textContent.includes('rejected'));
 assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo?.length||0),0);
 await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.fail=false;c.hold=true;});await page.locator('[data-guidesave]').click();await page.waitForFunction(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===2);
 assert.equal(await page.locator('[data-guidesave]').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.ncc-plan-sheet').count(),1);
 await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.release());await page.waitForFunction(()=>!document.querySelector('.ncc-plan-sheet'));assert.equal(await writes(),2);
 const items=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo);assert.equal(items.length,2);assert.equal(items[0].qty,125.5);assert.equal(items[0].k,207.08);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.foodPlan)),original);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='home';await v.render();});assert.equal(await page.locator('[data-ncc-plan]').count(),0);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='planner';await v.render();});assert.equal(await page.locator('[data-studentguideslot="almuerzo"]').getAttribute('aria-pressed'),'true');
 await open();await page.evaluate(()=>{window.__NCC_R4_FULLAPP__.state.foodPlan.guided_plan.meals[0].label+=' changed';});await page.locator('[data-guidesave]').click();assert.match(await page.locator('#nccPlanError').innerText(),/guía cambió/);assert.equal(await writes(),2);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);evidence.push({engine,width,passed:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{server.close();}
