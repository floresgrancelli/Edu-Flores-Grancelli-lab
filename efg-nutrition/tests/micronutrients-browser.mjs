// Actual PWA, isolated loopback fixtures; no hosted users or writes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-micro-preview-'+process.pid,out=resolve(root,'artifacts/micronutrients-preview');
mkdirSync(out,{recursive:true});
const prep=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prep.status,0,prep.stderr);
const config=resolve(preview,'dist/efg-nutrition/pilot/micronutrients-config.js');
writeFileSync(config,readFileSync(config,'utf8').replace('MICRONUTRIENTS_ENABLED = false','MICRONUTRIENTS_ENABLED = true'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),evidence=[];
try{
 for(const width of [390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',isMobile:true,hasTouch:true});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/efg-nutrition/pilot/');
  await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();
  await page.locator('.ncc-focus-summary').waitFor();
  await page.evaluate(async()=>{
   const v=window.__NCC_R4_FULLAPP__,s=v.state;
   const {MICRONUTRIENT_CATALOG:c}=await import('./micronutrient-catalog.js?v=ncc-micro-r1-20261113');
   // Macronutrients are synthetic fixture values; micronutrients come from the actual sidecar.
   const entry=(id,qty,name)=>({id,name,qty,unit:c.foods[id].unit,k:qty*1.1,p:qty*.06,c:qty*.12,f:qty*.03,fi:qty*.01,sourceId:c.foods[id].sourceId});
   s.diary.meals.desayuno=[entry('milk_skim',250,'Leche descremada'),entry('oats_raw',50,'Avena'),entry('apple',150,'Manzana')];
   s.diary.meals.almuerzo=[entry('spinach_raw',80,'Espinaca cruda'),entry('potato',180,'Papa'),{id:'recipe-demo',name:'Plato casero · datos incompletos',qty:120,unit:'g',k:300,p:20,c:30,f:10,fi:4}];
   s.diary.meals.merienda=[entry('banana',120,'Banana')];
   s.selfManagementOwn={owner:s.session.user.id,epoch:s.authContextEpoch||0,goal:{kcal:2100,protein_g:150,carb_g:230,fat_g:70},fields:{age_years:41,sex_for_equation:'male',dietary_pattern:'omnivore',pregnantOrBreastfeeding:false,clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',health_flags:[]}};
   Object.assign(s.goals[0],{kcal:2100,protein_g:150,carb_g:230,fat_g:70});
   await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
   const banner=document.createElement('div');banner.textContent='VISTA PREVIA · DATOS FICTICIOS';banner.style.cssText='text-align:center;color:#bacb9a;font:11px system-ui;padding:8px';document.body.prepend(banner);
  });
  const block=page.locator('.ncc-micronutrients').first();await block.waitFor();
  assert.equal(await block.locator('h2').first().textContent(),'Micronutrientes');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const diary=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
  await page.locator('.efg-optional-panel > summary').click();await page.locator('#dayComment').fill('Borrador conservado');
  await block.locator('.ncc-micro-expand > summary').click();await block.locator('.ncc-micro-expand > summary').click();
  assert.equal(await page.locator('#dayComment').inputValue(),'Borrador conservado');
  await page.locator('.efg-optional-panel > summary').click();
  await page.addStyleTag({content:'[aria-label="Espacios de la cuenta · candidata"]{display:none!important}'});
  await block.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(out,width+'-mi-dia.png'),fullPage:true});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:resolve(out,width+'-mi-dia-resumen.png')});
  await block.screenshot({path:resolve(out,width+'-micronutrientes.png')});
  const compactHeight=await block.evaluate(e=>e.getBoundingClientRect().height);
  await block.locator('.ncc-micro-expand > summary').click();
  await block.screenshot({path:resolve(out,width+'-detalle.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),diary);
  const touch=await block.locator('summary').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height));assert.ok(touch.every(h=>h>=44));
  await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.selfManagementOwn.fields=null;await v.render();});
  assert.ok((await page.locator('.ncc-micronutrients').first().textContent()).includes('Completá los datos de referencia en tu ficha.'));
  await page.evaluate(async()=>{
   const {micronutrientPeriod}=await import('./micronutrient-engine.js?v=ncc-micro-r1-20261113');
   const {renderMicronutrientPeriod}=await import('./micronutrient-view.js?v=ncc-micro-r1-20261113');
   const {MICRONUTRIENT_CATALOG:catalog}=await import('./micronutrient-catalog.js?v=ncc-micro-r1-20261113');
   const d=structuredClone(window.__NCC_R4_FULLAPP__.state.diary);
   const model=micronutrientPeriod({logs:[d],catalog,profile:{age:41,referenceSex:'male',lifeStage:'adult'},from:d.log_day,to:d.log_day});
   const host=document.createElement('section');host.id='micro-period-preview';host.style.cssText='margin:16px;padding:16px;background:#111b12;color:#eeeee1;border-radius:16px';host.innerHTML='<p>VISTA PREVIA · DATOS FICTICIOS</p>'+renderMicronutrientPeriod(model);document.body.append(host);
  });
  await page.locator('#micro-period-preview').screenshot({path:resolve(out,width+'-por-fecha.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  evidence.push({width,noOverflow:true,readOnly:true,draftPreserved:true,missingProfileSafe:true,compactHeight,pageErrors:errors});
  await context.close();
 }
 writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));
}finally{await browser.close();server.close();}
