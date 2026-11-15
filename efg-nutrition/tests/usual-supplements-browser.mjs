// Actual PWA, isolated loopback fixtures; no hosted users or writes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-supplement-preview-'+process.pid,out=resolve(root,'artifacts/usual-supplements-preview');
mkdirSync(out,{recursive:true});
const prep=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prep.status,0,prep.stderr);
const config=resolve(preview,'dist/efg-nutrition/pilot/micronutrients-config.js');
writeFileSync(config,readFileSync(config,'utf8').replace('MICRONUTRIENTS_ENABLED = false','MICRONUTRIENTS_ENABLED = true'));
const sdk=resolve(preview,'dist/efg-nutrition/tests/student-day-visual-sdk.mjs');
let adapter=readFileSync(sdk,'utf8').replace('const filters=[];',"const filters=[];let requireRoutine=false;").replace("row&&filters.every", "row&&(!requireRoutine||row.skipped?._supplementRoutineV1)&&filters.every").replace('gte(){return q;}',"not(){requireRoutine=true;return q;},gte(){return q;}").replace('upsert(row){',"upsert(row){if(window.__FAIL_SUPPLEMENT_SAVE__)throw Object.assign(new Error('Synthetic save rejected'),{status:403});");
writeFileSync(sdk,adapter);
const previewPilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(previewPilot,readFileSync(previewPilot,'utf8')+'\nglobalThis.__NCC_R4_FULLAPP__.loadUsualSupplements=loadUsualSupplements;\n');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright'),evidence=[];
try{for(const engine of (process.env.NCC_TEST_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 for(const role of ['student','coach','admin']){
  await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__,s=v.state;s.profile.role=role;s.tab='supplements';s.diary.sports=[];s.diary.skipped={};s.supplementRoutine=null;s.supplementRoutineOwner=null;await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
  await page.locator('#supplementItem').selectOption('creatine');await page.locator('#supplementQty').fill('5');await page.locator('#supplementMoment').selectOption('desayuno');await page.locator('[data-act="addDailySupplement"]').click();
  await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length===1&&!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
  await page.locator('#supplementItem').selectOption('geomagnesium_bisglycinate_1400');await page.locator('#supplementQty').fill('2');await page.locator('#supplementMoment').selectOption('cena');await page.locator('[data-act="addDailySupplement"]').click();
  await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length===2&&!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
  await page.locator('[data-workspace-tab="usual"]').click();
  if(role==='student'){
   await page.evaluate(()=>{window.__FAIL_SUPPLEMENT_SAVE__=true;});
   await page.locator('[data-act="saveUsualSupplements"]').click();
   await page.waitForFunction(()=>!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.skipped._supplementRoutineV1),undefined,'Rejected save restores template metadata');
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length),2,'Rejected template save preserves consumed supplements');
   await page.evaluate(()=>{window.__FAIL_SUPPLEMENT_SAVE__=false;});
  }
  await page.locator('[data-act="saveUsualSupplements"]').click();
  await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__.state.diary.skipped._supplementRoutineV1&&!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
  await page.locator('[data-workspace-tab="usual"]').click();assert.match(await page.locator('.supplement-routine').textContent(),/5.*g.*Desayuno/);assert.match(await page.locator('.supplement-routine').textContent(),/2.*comprimidos.*Cena/);
  if(role==='student'){
   await page.reload();await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
   await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.loadUsualSupplements();v.state.tab='supplements';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;});
   await page.locator('[data-workspace-tab="usual"]').click();
   assert.equal(await page.locator('.supplement-routine li').count(),2,'Routine recovered through account query after reload');
  }
  // Simulate a fresh day's diary; the cloud-loaded account template persists.
  await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__,s=v.state;s.diary.sports=[{id:'water',kind:'sport',qty:500,unit:'ml',when:'other',k:0,p:0,c:0,f:0,fi:0}];s.diary.skipped={_comment:'conservar'};await v.render();});
  assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length),1,'Routine never auto-registers');
  await page.locator('[data-act="applyUsualSupplements"]').click();await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length===3&&!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
  const recorded=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary);assert.equal(recorded.skipped._comment,'conservar');assert.equal(recorded.sports[0].id,'water');assert.ok(recorded.sports.find(x=>x.id==='geomagnesium_bisglycinate_1400').micronutrientLabel);
  await page.locator('[data-act="applyUsualSupplements"]').dblclick();assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length),3);
  await page.locator('.supplement-routine').screenshot({path:resolve(out,engine+'-'+width+'-'+role+'.png')});
  // Replacing the template must not erase meals or today's sports.
  await page.locator('[data-act="saveUsualSupplements"]').click();await page.waitForFunction(()=>!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
  await page.locator('[data-act="clearUsualSupplements"]').click();await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.diary.skipped._supplementRoutineV1.items.length===0&&!window.__NCC_R4_FULLAPP__.state.diaryWritePending);
  assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.sports.length),3);
  assert.equal(await page.locator('[data-act="applyUsualSupplements"]').count(),0);
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);evidence.push({engine,width,status:'PASS',scope:'save, explicit use, repeated taps, quantity/time/label, replace, delete, three roles'});await context.close();
 }}finally{await browser.close();}
}}finally{server.close();writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));}
console.log(JSON.stringify(evidence));
