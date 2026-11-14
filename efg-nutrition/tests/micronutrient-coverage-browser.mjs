// Actual PWA, isolated loopback fixtures; no hosted users or writes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-micro-preview-'+process.pid,out=resolve(root,'artifacts/micronutrient-coverage-preview');
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
try{for(const engine of (process.env.NCC_TEST_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.NCC_CHROMIUM_EXECUTABLE?{executablePath:process.env.NCC_CHROMIUM_EXECUTABLE}:{})});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{
  const v=window.__NCC_R4_FULLAPP__,s=v.state;
  const {MICRONUTRIENT_CATALOG:c}=await import('./micronutrient-catalog.js');
  const entry=(id,qty)=>({id,name:c.foods[id].name,qty,unit:c.foods[id].unit,k:qty*1.1,p:qty*.06,c:qty*.12,f:qty*.03,fi:qty*.01,sourceId:c.foods[id].catalogSourceId??c.foods[id].sourceId});
  s.diary.meals.desayuno=[entry('milk_skim',250),entry('oats_raw',50),entry('apple',150)];
  s.diary.meals.almuerzo=[entry('beef_tenderloin',150),entry('kidney_beef_grilled',100),entry('spinach_raw',80),entry('fish_hake',150),entry('ham_cooked',50),entry('egg',60),entry('chicken_breast_roasted',100),entry('rice',100),entry('mixed_nuts',25),entry('egg_white',100),entry('oat_flour',50),entry('sushi_sashimi_salmon',100),entry('sushi_sashimi_atun',100),{id:'recipe-demo',name:'Plato casero · datos incompletos',qty:120,unit:'g',k:300,p:20,c:30,f:10,fi:4}];
  s.profile.role='admin';s.selfManagementOwn={owner:s.session.user.id,epoch:s.authContextEpoch||0,fields:{age_years:41,sex_for_equation:'male',dietary_pattern:'omnivore',pregnantOrBreastfeeding:false,clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',health_flags:[]}};
  await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 });
 const card=page.locator('.ncc-micronutrients').first();await card.waitFor();
 assert.equal(await card.locator('[data-micronutrient]').count(),7);assert.equal(await card.locator('.ncc-micro-expand').getAttribute('open'),null);
 const colors=await card.locator('[data-micronutrient]').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).getPropertyValue('--micro-color').trim()));assert.equal(new Set(colors).size,7);
 const bar=()=>page.locator('[data-micronutrient=magnesium] .ncc-micro-food').first();
 const displayed=()=>page.locator('[data-micronutrient=magnesium] .ncc-micro-value').first().textContent();
 const oldAmount=await displayed();
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.diary.meals.desayuno[0].qty=500;await v.render();});
 assert.notEqual(await displayed(),oldAmount,'amount must update even when the bar is capped at 100%');
 const fullDiary=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;for(const meal of Object.values(v.state.diary.meals))for(const food of meal)food.qty/=10;await v.render();});
 const under=await bar().evaluate(e=>parseFloat(e.style.width));assert.ok(under>0&&under<100);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.diary.meals.desayuno[0].qty*=2;await v.render();});
 assert.ok(await bar().evaluate(e=>parseFloat(e.style.width))>under,'below target the bar must grow');
 await page.evaluate(async diary=>{const v=window.__NCC_R4_FULLAPP__;v.state.diary=JSON.parse(diary);await v.render();},fullDiary);
 await page.locator('.ncc-micronutrients').first().screenshot({path:resolve(out,engine+'-'+width+'-barras-con-referencia.png')});
 const saved=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 for(const role of ['student','coach','admin']){
  await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__;v.state.profile.role=role;v.state.selfManagementOwn=null;await v.render();},role);
  const block=page.locator('.ncc-micronutrients').first();assert.equal(await block.locator('[data-micronutrient]').count(),7);assert.equal(await block.locator('.ncc-micro-rows [data-scale=reference]').count(),7);
  assert.ok(await block.locator('.ncc-micro-food').count()>0);assert.ok((await block.textContent()).includes('Referencia diaria general'));assert.match(await block.locator('[data-micronutrient=magnesium] .ncc-micro-value').textContent(),/\/ 420 mg/);assert.match(await block.locator('[data-micronutrient=magnesium] .ncc-micro-progress').textContent(),/%/);
  assert.equal(await block.locator('.ncc-micro-rows [data-scale=unscaled]').count(),0);
  await block.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-referencia-general.png')});
  await block.locator('.ncc-micro-expand > summary').click();assert.equal(await block.locator('[data-micro-detail]').count(),7);
  assert.match(await block.locator('[data-micro-detail=iron]').textContent(),/Lomo vacuno cocido/);assert.match(await block.locator('[data-micro-detail=calcium]').textContent(),/Clara de huevo/);assert.match(await block.locator('[data-micro-detail=epa_dha]').textContent(),/Sashimi de salmón/);
  assert.match(await block.locator('[data-micro-detail=iron]').textContent(),/Riñón/);assert.match(await block.locator('[data-micro-detail=iron]').textContent(),/Merluza cocida/);assert.match(await block.locator('[data-micronutrient=epa_dha] .ncc-micro-value').textContent(),/250 mg/);
  await block.locator('[data-micro-detail=iron] .ncc-micro-sources > summary').click();
  await block.locator('[data-micro-detail=iron]').screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-hierro-lomo.png')});
  await block.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-detalle.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),saved);
 }
 assert.deepEqual(errors,[]);evidence.push({engine,width,allSevenVisible:true,sevenColors:true,referenceFillRecalculates:true,generalReferencesWithoutProfile:true,threeRoles:true,detailsPreserved:true,readOnly:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{server.close();}
