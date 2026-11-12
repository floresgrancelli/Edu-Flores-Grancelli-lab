import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/food-entry-batch-review');
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


const base='4150b4f68ea02627b5b361f70320af6a561fdd9c';
const gitRead=file=>execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',gitRead('pilot.js'),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/food-entry-sdk.mjs');
const baselineCss=gitRead('day-tools-r1.css'),evidence=[],slots=['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const [wi,width] of [320,390,1280].entries())for(const [ri,role] of ['student','coach','admin'].entries()){
  const slot=slots[(ri*2+wi+(engine==='webkit'?3:0))%6];
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  let baseline=engine==='chromium'&&width===390&&role==='student';
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.route('**/pilot.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePilot}):r.continue());
  await context.route('**/day-tools-r1.css*',r=>baseline?r.fulfill({contentType:'text/css',body:baselineCss}):r.continue());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();await page.evaluate(async role=>{const a=window.__NCC_R4_FULLAPP__;if(role!=='student'){a.state.profile.role=role;a.state.foodPlan=null;a.state.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};await a.render();}document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);};
  const open=async()=>{await page.locator('[data-daymeal="'+slot+'"]').click();await page.locator('.student-meal-card [data-setmeal="'+slot+'"]').click();await page.locator('.meal-popup').waitFor();};
  const food=async(term,id,qty,weight=false)=>{await page.locator('#mealFoodSearch').fill(term);await page.locator('[data-mealsuggestion="'+id+'"]').first().click();if(weight)await page.locator('#mealEntryMode').selectOption('weight');await page.locator('#mealEditorQty').fill(qty);};
  const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+slot+'-'+name+'.png')});
  if(baseline){await load();await open();await food('huevo','egg','2');assert.equal(await page.locator('.ncc-entry-footer [data-act=saveSelectedMealContinue]').count(),0);await shot('before');baseline=false;}
  await load();await open();await food('huevo','egg','2');
  const otherSlots=await page.evaluate(slot=>JSON.stringify(Object.fromEntries(Object.entries(window.__NCC_R4_FULLAPP__.state.diary.meals).filter(([k])=>k!==slot))),slot);
  const keep=page.locator('.ncc-entry-footer [data-act=saveSelectedMealContinue]'),finish=page.locator('.ncc-entry-footer [data-act=saveSelectedMeal]');
  assert.equal(await page.locator('[data-act=saveSelectedMealContinue]').count(),1,'One existing continuation control, moved rather than duplicated');assert.equal(await keep.isVisible(),true);assert.equal(await finish.isVisible(),true);assert.equal(await keep.isDisabled(),false);assert.equal(await keep.evaluate(e=>e.getBoundingClientRect().height>=44),true);await shot('choices');
  await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.hold=true);await keep.click();await page.waitForFunction(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===1);assert.equal(await keep.isDisabled(),true);assert.equal(await finish.isDisabled(),true);assert.equal(await page.locator('#mealEditorQty').isDisabled(),true);assert.equal(await keep.getAttribute('aria-busy'),'true');
  await page.evaluate(()=>document.querySelector('[data-act=saveSelectedMeal]').click());assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),1);assert.equal(await page.locator('#pilot-toast').isVisible(),false,'No success before transport confirmation');await shot('saving');
  await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});await page.waitForFunction(()=>document.querySelector('#mealFoodSearch')?.value===''&&document.querySelector('#pilot-toast')?.dataset.noticeKind==='success');
  assert.equal(await page.locator('.meal-popup').count(),1);assert.equal(await page.locator('#mealEntrySlot').inputValue(),slot);assert.equal(await page.locator('#mealQuantityCard').isVisible(),false);assert.equal(await finish.isDisabled(),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'mealFoodSearch');assert.equal(await page.evaluate(slot=>window.__NCC_R4_FULLAPP__.state.diary.meals[slot].length,slot),1);await shot('next-food');
  await food('banana','banana','100',true);await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true);await keep.click();await page.waitForFunction(()=>document.querySelector('#pilot-toast')?.dataset.noticeKind==='error');
  assert.equal(await keep.textContent(),'Reintentar y seguir');assert.equal(await page.locator('#mealEditorQty').inputValue(),'100');assert.equal(await page.locator('#mealEditorQty').isDisabled(),false);assert.equal(await page.locator('#mealEntrySlot').inputValue(),slot);assert.equal(await page.evaluate(slot=>window.__NCC_R4_FULLAPP__.state.diary.meals[slot].length,slot),1);await shot('retry');
  await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false);await keep.click();await page.waitForFunction(()=>document.querySelector('#mealFoodSearch')?.value==='');assert.equal(await page.locator('#mealEntrySlot').inputValue(),slot);assert.equal(await page.evaluate(slot=>window.__NCC_R4_FULLAPP__.state.diary.meals[slot].length,slot),2);
  await food('huevo','egg','1');await finish.click();await page.locator('.meal-popup').waitFor({state:'detached'});assert.equal(await page.evaluate(slot=>window.__NCC_R4_FULLAPP__.state.diary.meals[slot].length,slot),3,'Three explicit successful saves, despite duplicate tap and failed attempt');assert.equal(await page.evaluate(slot=>JSON.stringify(Object.fromEntries(Object.entries(window.__NCC_R4_FULLAPP__.state.diary.meals).filter(([k])=>k!==slot))),slot),otherSlots);await shot('finished');
  if(engine==='chromium'&&width===390&&role==='student'){
   await open();await food('huevo','egg','1');const writes=await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=true;return c.writes;});await keep.click();await page.waitForFunction(n=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===n+1,writes);await page.getByRole('button',{name:'Cerrar ventana de alimentos',exact:true}).click();await page.locator('.meal-popup').waitFor({state:'detached'});await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});await page.waitForFunction(slot=>window.__NCC_R4_FULLAPP__.state.diary.meals[slot].length===4,slot);await page.waitForFunction(()=>!window.__NCC_R4_FULLAPP__.state.diaryWritePending);assert.equal(await page.locator('.meal-popup').count(),0,'Explicitly closed editor is not reopened by a late successful response');await shot('closed-during-save');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  evidence.push({engine,width,role,slot,oneContinueControl:true,explicitChoiceUnchanged:true,threeExplicitSaves:true,noDuplicateOnPendingTap:true,retryKeepsFoodAndQuantity:true,actualConfirmationBeforeNext:true,sameSchedule:true,otherSchedulesUnchanged:true,normalAddStillCloses:true,closedPendingDoesNotReopen:engine==='chromium'&&width===390&&role==='student'});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS consecutive food entry',evidence.length);
}finally{server.close();}
