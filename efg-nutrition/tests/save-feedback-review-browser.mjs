import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/save-feedback-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_NOTICE_REVIEW__=notify;\n');
// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.
copyFileSync(resolve(root,'efg-nutrition/pilot/nutrition-daily-tip.js'),resolve(preview,'dist/efg-nutrition/pilot/nutrition-daily-tip.js'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');


const base='0f353af985a85b14cc87229c676ff30eed430315';
const gitRead=file=>execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',gitRead('pilot.js'),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/food-entry-sdk.mjs');
const baselineCss=gitRead('color-system.css'),evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  let baseline=engine==='chromium'&&width===390&&role==='student';
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.route('**/pilot.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePilot}):r.continue());
  await context.route('**/color-system.css*',r=>baseline?r.fulfill({contentType:'text/css',body:baselineCss}):r.continue());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const load=async()=>{
   await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
   await page.evaluate(async role=>{const a=window.__NCC_R4_FULLAPP__;if(role!=='student'){a.state.profile.role=role;a.state.foodPlan=null;a.state.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};await a.render();}document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
  };
  const prepare=async()=>{await page.locator('[data-daymeal=desayuno]').click();await page.locator('.student-meal-card [data-setmeal=desayuno]').first().click();await page.locator('#mealFoodSearch').fill('huevo');await page.locator('[data-mealsuggestion=egg]').first().click();await page.locator('#mealEditorQty').fill('2');};
  const shot=async name=>{await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});};
  if(baseline){await load();await prepare();await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true);await page.locator('[data-act=saveSelectedMeal]').click();await page.locator('#pilot-toast').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-act=saveSelectedMeal]').disabled);await shot('before-retry');baseline=false;}
  await load();await prepare();
  await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.hold=true);
  await page.locator('[data-act=saveSelectedMeal]').click();await page.waitForFunction(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===1);
  const toast=page.locator('#pilot-toast');assert.equal(await toast.isVisible(),false,'No success before the transport confirms');
  const save=page.locator('[data-act=saveSelectedMeal]');assert.equal(await save.innerText(),'Guardando…');assert.equal(await save.getAttribute('aria-busy'),'true');assert.equal(await save.isDisabled(),true);
  await page.locator('#mealEditorQty').dispatchEvent('input');assert.equal(await save.isDisabled(),true,'Input refresh cannot reenable a pending save');
  await page.evaluate(()=>document.querySelector('[data-act=saveSelectedMeal]').click());assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),1,'Repeated tap does not enqueue a second write');await shot('saving');
  await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});await page.locator('.meal-popup').waitFor({state:'detached'});await toast.waitFor({state:'visible'});
  await toast.evaluate(e=>e.scrollIntoView({block:'center'}));await page.mouse.move(0,0);
  assert.equal(await toast.evaluate(e=>getComputedStyle(e).position),'static');assert.equal(await toast.getAttribute('data-notice-kind'),'success');
  assert.equal(await page.locator('#pilot-toast').count(),1);
  const overlaps=await toast.evaluate(e=>{const a=e.getBoundingClientRect();return [...document.querySelectorAll('.pilot-main button,.pilot-nav')].filter(b=>!e.contains(b)&&b.getClientRects().length).filter(b=>{const r=b.getBoundingClientRect();return a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top;}).map(b=>b.outerHTML.slice(0,100));});assert.deepEqual(overlaps,[],'Confirmation has its own line, clear of actions/navigation');
  await shot('food-confirmed');await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-food-full.png'),fullPage:true});
  const confirmed=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
  await page.clock.install();
  await toast.locator('button').focus();await page.clock.fastForward(5000);assert.equal(await toast.isVisible(),true,'Focused confirmation remains readable');
  await page.locator('[data-daymeal=desayuno]').focus();await page.clock.fastForward(5000);assert.equal(await toast.isVisible(),false,'Confirmed success closes automatically after focus leaves: '+JSON.stringify(await toast.evaluate(e=>({active:document.activeElement?.outerHTML,hover:e.matches(':hover'),hidden:document.hidden,timer:window.__NCC_NOTICE_REVIEW__.timer}))));
  // Real rejection of a second write keeps the editor and error available.
  await prepare();await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true);await page.locator('[data-act=saveSelectedMeal]').click();
  await page.waitForFunction(()=>document.querySelector('#pilot-toast')?.dataset.noticeKind==='error');
  await page.clock.fastForward(60000);assert.equal(await toast.isVisible(),true);assert.equal(await toast.getAttribute('role'),'alert');assert.equal(await toast.evaluate(e=>getComputedStyle(e).position),'static','Persistent editor error must not overlay retry/save');assert.equal(await page.locator('.meal-popup').isVisible(),true);assert.equal(await page.locator('#mealEditorQty').inputValue(),'2');assert.equal(await save.innerText(),'Reintentar guardado');assert.equal(await save.getAttribute('aria-busy'),null);assert.equal(await save.isDisabled(),false);await shot('retry');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),confirmed,'Rejected write does not change confirmed diary');await shot('persistent-error');
  // Resolve by retrying the existing writer; exactly one new entry is committed.
  await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false);await page.locator('[data-act=saveSelectedMeal]').click();await page.locator('.meal-popup').waitFor({state:'detached'});assert.equal(await toast.getAttribute('data-notice-kind'),'success');
  await page.evaluate(async()=>window.__NCC_R4_FULLAPP__.render());assert.equal(await toast.isVisible(),true,'Same status element remounts after a normal render');
  await toast.locator('button').click();assert.equal(await toast.isVisible(),false);
  // An unclassified notice requiring attention never gets an inferred timeout.
  await page.evaluate(()=>window.__NCC_NOTICE_REVIEW__('Revisá el dato antes de continuar.'));await page.clock.fastForward(60000);assert.equal(await toast.isVisible(),true);await toast.locator('button').click();
  await page.evaluate(()=>{const a=window.__NCC_R4_FULLAPP__,uid=a.state.session.user.id;localStorage.setItem('efg-nutrition-habitual-v2:'+uid+':desayuno',JSON.stringify([{name:'Desayuno habitual',items:structuredClone(a.state.diary.meals.desayuno)}]));});
  await page.locator('.student-meal-card [data-setmeal=desayuno]').first().click();await page.locator('[data-mealsource=habitual]').click();
  const habitualWrites=await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.hold=true;return window.__NCC_FOOD_ENTRY_FIXTURE__.writes;});
  page.once('dialog',dialog=>dialog.accept());const habitual=page.locator('.meal-popup [data-habitualapply=desayuno]');await habitual.click();await page.waitForFunction(n=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===n+1,habitualWrites);
  assert.equal(await habitual.innerText(),'Guardando…');assert.equal(await habitual.getAttribute('aria-busy'),'true');assert.equal(await habitual.isDisabled(),true);await shot('habitual-saving');
  await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});await page.locator('.meal-popup').waitFor({state:'detached'});
  assert.equal(await toast.getAttribute('data-notice-kind'),'success');assert.match(await toast.innerText(),/Habitual/);await toast.evaluate(e=>e.scrollIntoView({block:'center'}));await shot('habitual-confirmed');
  const afterRetry=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));await page.locator('[data-daymeal=desayuno]').focus();await page.mouse.move(0,0);await page.clock.fastForward(5000);assert.equal(await toast.isVisible(),false);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),afterRetry,'Notice expiry never writes diary');
  if(engine==='chromium'&&width===390&&role==='student'){
   await page.locator('[data-editfood="desayuno:0"]').click();await page.locator('#diaryFoodQty').fill('3');
   const editWrites=await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=true;return c.writes;});const editSave=page.locator('[data-savefood]');await editSave.click();await page.waitForFunction(n=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===n+1,editWrites);assert.equal(await editSave.innerText(),'Guardando…');assert.equal(await editSave.getAttribute('aria-busy'),'true');await shot('edit-saving');
   await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.fail=true;c.hold=false;c.release();});await page.waitForFunction(()=>document.querySelector('#diaryFoodError')?.textContent.includes('rejected'));assert.equal(await editSave.innerText(),'Reintentar guardado');assert.equal(await page.locator('#diaryFoodQty').inputValue(),'3');await shot('edit-retry');
   await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false);await editSave.click();await page.locator('.ncc-food-edit').waitFor({state:'detached'});
   await page.locator('.ncc-day-plan-shortcut').click();await page.locator('[data-planmode=dinner]').click();await page.locator('#nccPlannerSections [data-workspace-tab=choose]').click();await page.locator('[data-plannerslot=cena]').click();await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();await page.locator('[id="planQty_cena|protein"]').fill('100');
   const planWrites=await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=true;return c.writes;});const planSave=page.locator('[data-planadd="cena|protein"]');await planSave.click();await page.waitForFunction(n=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===n+1,planWrites);assert.equal(await planSave.innerText(),'Guardando…');assert.equal(await planSave.getAttribute('aria-busy'),'true');await shot('planner-saving');
   await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.fail=true;c.hold=false;c.release();});await page.waitForFunction(()=>document.querySelector('[data-planadd="cena|protein"]')?.textContent==='Reintentar guardado');assert.equal(await page.locator('[id="planQty_cena|protein"]').inputValue(),'100');await shot('planner-retry');
   await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false);await planSave.click();await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.cena?.length===1);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  evidence.push({engine,width,role,savingLabelsFromAwait:true,retryLabelAfterFailure:true,noDoubleWrite:true,habitualBusy:true,confirmedOnly:true,ownLineNoActionOverlap:true,autoCloseSuccess:true,pauseOnFocus:true,errorsPersistent:true,unknownNoticesPersistent:true,rejectedWritePreservesDraft:true,rerenderSameNotice:true,noNoticeWrites:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS saving feedback',evidence.length);
}finally{server.close();}
