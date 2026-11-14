// Actual PWA, isolated loopback fixtures; no hosted users or writes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-micro-preview-'+process.pid,out=resolve(root,'artifacts/micronutrients-bars-preview');
mkdirSync(out,{recursive:true});
const prep=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prep.status,0,prep.stderr);
const config=resolve(preview,'dist/efg-nutrition/pilot/micronutrients-config.js');
writeFileSync(config,readFileSync(config,'utf8').replace('MICRONUTRIENTS_ENABLED = false','MICRONUTRIENTS_ENABLED = true'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright'),evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{
  const v=window.__NCC_R4_FULLAPP__,s=v.state;
  const {MICRONUTRIENT_CATALOG:c}=await import('./micronutrient-catalog.js');
  const entry=(id,qty)=>({id,name:c.foods[id].name,qty,unit:c.foods[id].unit,k:qty*1.1,p:qty*.06,c:qty*.12,f:qty*.03,fi:qty*.01,sourceId:c.foods[id].sourceId});
  s.diary.meals.desayuno=[entry('milk_skim',250),entry('oats_raw',50),entry('apple',150)];
  s.diary.meals.almuerzo=[entry('spinach_raw',80),{id:'recipe-demo',name:'Plato casero · datos incompletos',qty:120,unit:'g',k:300,p:20,c:30,f:10,fi:4}];
  s.profile.role='admin';s.selfManagementOwn={owner:s.session.user.id,epoch:s.authContextEpoch||0,fields:{age_years:41,sex_for_equation:'male',dietary_pattern:'omnivore',pregnantOrBreastfeeding:false,clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',health_flags:[]}};
  await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 });
 const card=page.locator('.ncc-micronutrients').first();await card.waitFor();
 assert.equal(await card.locator('[data-micronutrient]').count(),7);assert.equal(await card.locator('.ncc-micro-expand').getAttribute('open'),null);
 const colors=await card.locator('[data-micronutrient]').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).getPropertyValue('--micro-color').trim()));assert.equal(new Set(colors).size,7);
 const bar=()=>page.locator('[data-micronutrient=magnesium] .ncc-micro-food').first();const old=await bar().evaluate(e=>e.style.width);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.diary.meals.desayuno[0].qty=500;await v.render();});assert.notEqual(await bar().evaluate(e=>e.style.width),old);
 await page.locator('.ncc-micronutrients').first().screenshot({path:resolve(out,engine+'-'+width+'-barras-con-referencia.png')});
 const saved=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 for(const role of ['student','coach','admin']){
  await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__;v.state.profile.role=role;v.state.selfManagementOwn=null;await v.render();},role);
  const block=page.locator('.ncc-micronutrients').first();assert.equal(await block.locator('[data-micronutrient]').count(),7);assert.equal(await block.locator('.ncc-micro-rows [data-scale=unscaled]').count(),7);
  assert.equal(await block.locator('.ncc-micro-food').count(),0);assert.ok((await block.textContent()).includes('sin referencia'));
  const backgrounds=await block.locator('.ncc-micro-track').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundImage));assert.ok(backgrounds.every(x=>x.includes('gradient')));
  await block.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-barras-sin-referencia.png')});
  await block.locator('.ncc-micro-expand > summary').click();assert.equal(await block.locator('[data-micro-detail]').count(),7);
  await block.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-detalle.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),saved);
 }
 assert.deepEqual(errors,[]);evidence.push({engine,width,allSevenVisible:true,sevenColors:true,referenceFillRecalculates:true,noFalsePercentWithoutReference:true,threeRoles:true,detailsPreserved:true,readOnly:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{server.close();}
