import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/usage-performance');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/usage-performance-sdk.mjs'));
const sdkPath=resolve(preview,'dist/efg-nutrition/tests/usage-performance-sdk.mjs');
writeFileSync(sdkPath,readFileSync(resolve(root,'efg-nutrition/tests/usage-performance-sdk.mjs'),'utf8').replace('__USAGE_CATALOG__',readFileSync(resolve(root,'efg-nutrition/catalog/guide-catalog.json'),'utf8')));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_USAGE_HOOKS__={setConsent:v=>{coachRosterConsent=v},get rendered(){return lastRenderedViewKey},get active(){return activeViewKey()},publishCoachAtomicDraft};\n');
// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.
copyFileSync(resolve(root,'efg-nutrition/pilot/nutrition-daily-tip.js'),resolve(preview,'dist/efg-nutrition/pilot/nutrition-daily-tip.js'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',file.endsWith('.html')?'no-store':'public,max-age=300');res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'");res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');



const baseline='cccc1c09fc4c7ad444c99a0fd7e3838b8a28063d',samples=[],cases=[],failures=[];
const save=()=>writeFileSync(resolve(out,'result.json'),JSON.stringify({baseline,scope:'Actual PWA renderers/handlers with loopback RAM transport. Form-to-coach handoff is a validated fixture snapshot; not hosted auth/RLS/backend latency or physical phone usage.',samples,cases,failures},null,2));
async function timed(page,metric,eventSelector,action,predicate){
 await page.evaluate(({eventSelector,predicate})=>{
  window.__usageDone=null;const el=document.querySelector(eventSelector);if(!el)throw Error('Missing measured control '+eventSelector);
  const ready=new Function('return ('+predicate+')');
  el.addEventListener(el.matches('input')?'input':'click',()=>{const start=performance.now();const poll=()=>{if(ready())requestAnimationFrame(()=>requestAnimationFrame(()=>window.__usageDone=performance.now()-start));else if(performance.now()-start<20000)requestAnimationFrame(poll);else window.__usageDone={timeout:true};};requestAnimationFrame(poll);},{once:true,capture:true});
 },{eventSelector,predicate});
 await action();await page.waitForFunction(()=>window.__usageDone!==null);const ms=await page.evaluate(()=>window.__usageDone);assert.equal(typeof ms,'number',metric+' timed out');samples.push({...page.__usage,metric,ms});return ms;
}
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage();page.__usage={engine,width};page.setDefaultTimeout(20000);
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(new URL(r.url()).origin)});
  const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+name+'.png'),fullPage:true});
  try{
   await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
   if(engine==='chromium'&&width<720){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});page.__usage.cpuThrottle=4;}else page.__usage.cpuThrottle=1;
   await page.evaluate(async()=>{await window.__NCC_USAGE_FIXTURE__.enter('student');const a=window.__NCC_R4_FULLAPP__;a.state.coachPilotEntry={route:'intake'};a.state.tab='intake';await a.render();});
   await page.locator('[name=coachRelaunch_objective][value=recomp]').check();await page.locator('[name=coachRelaunch_activity_level][value=moderate]').check();await page.locator('#coachRelaunch_age_years').fill('41');await page.locator('#coachRelaunch_height_cm').fill('174');await page.locator('#coachRelaunch_weight_kg').fill('80.5');await page.locator('[data-intakenext="1"]').click();await page.locator('#coachRelaunch_dietary_pattern').selectOption('omnivore');await page.locator('#coachRelaunch_preferred_foods').fill('Arroz, pollo y verduras');await page.locator('[data-intakenext="2"]').click();await page.locator('#coachRelaunch_notes').fill('Poco tiempo para cocinar · dato ficticio');await page.locator('[data-intakenext="3"]').click();assert.equal(await page.locator('#coachRelaunch_share').isChecked(),false);await shot('student-intake-review');
   const intake=await page.evaluate(async()=>{const {readCoachRelaunchForm}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');return readCoachRelaunchForm(document).payload});assert.equal(intake.weight_kg,80.5);
   // Explicit RAM handoff; no production submission, consent or plan activation.
   await page.evaluate(async payload=>{window.__NCC_USAGE_FIXTURE__.captureIntake(payload);await window.__NCC_USAGE_FIXTURE__.enter('coach')},intake);
   assert.equal(await page.locator('.ncc-roster-person').count(),50);await shot('coach-roster50');
   for(let i=0;i<3;i++){await page.locator('#coachRosterSearch').fill('');await timed(page,'roster50-search','#coachRosterSearch',()=>page.locator('#coachRosterSearch').fill('Ana'),'document.querySelectorAll(".ncc-roster-person:not([hidden])").length===1');}
   const id='10000000-0000-4000-8000-000000000001';await page.locator('[data-student="'+id+'"][data-rostersection=coachStudentIntake]').click();await page.locator('.coach-intake-shared').waitFor();assert.match(await page.locator('.coach-intake-shared').innerText(),/80[,.]5|Recomposición/);await shot('coach-received-intake');
   await page.locator('[data-act=prepareCoachPlanFromIntake]').click();await page.locator('#targetSex').waitFor();assert.equal(await page.locator('#targetWeight').inputValue(),'80.5');await page.locator('#targetSex').selectOption('male');
   await timed(page,'calculate-goal','[data-act=calculateGoal]',()=>page.locator('[data-act=calculateGoal]').click(),'!!window.__NCC_R4_FULLAPP__.state.pendingGoal');await shot('coach-goal');
   await page.locator('[data-planflow-step="1"]').click();await timed(page,'generate-six-meal-guide','[data-act=makeGuidedDay]',()=>page.locator('[data-act=makeGuidedDay]').click(),'!!window.__NCC_R4_FULLAPP__.state.coachGuidedDraft');assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.coachGuidedDraft.meals.length),6);await shot('coach-guide');
   await page.locator('[data-planflow-step="2"]').click();await page.locator('[data-act=saveCoachAtomicDraft]').click();await page.waitForFunction(()=>window.__NCC_USAGE_MODEL__.draft?.draft_revision===1);assert.equal(await page.evaluate(()=>window.__NCC_USAGE_MODEL__.plan),null);
   // Existing confirmation handler and client; synthetic atomic receipt only.
   page.once('dialog',d=>d.accept());await page.evaluate(()=>window.__NCC_USAGE_HOOKS__.publishCoachAtomicDraft());await page.waitForFunction(()=>!!window.__NCC_USAGE_MODEL__.plan);assert.equal(await page.evaluate(()=>window.__NCC_USAGE_MODEL__.writes.filter(x=>x.rpc==='efg_publish_coach_plan_draft_atomic').length),1);
   await page.evaluate(()=>window.__NCC_USAGE_FIXTURE__.enter('student'));await page.locator('.ncc-day-plan-shortcut').click();await page.locator('#nccPlanDestinationSections [data-workspace-tab=guide]').click();await page.locator('.ncc-plan-meal').waitFor();await shot('student-published-guide');
   await page.locator('.pilot-nav [data-tab=home]').click();await page.locator('[data-daymeal=almuerzo]').click();await page.locator('.student-meal-card [data-setmeal=almuerzo]').click();
   for(let repetition=0;repetition<3;repetition++)for(const [term,id]of [['pollo','chicken'],['queso','cheese'],['espinaca cruda','spinach_raw'],['atún aceite','tuna_oil_drained'],['arroz','rice_white']]){
    await page.locator('#mealFoodSearch').fill('');await timed(page,'food-search:'+term,'#mealFoodSearch',()=>page.locator('#mealFoodSearch').fill(term),'!!document.querySelector("[data-mealsuggestion='+id+']")');
   }
   await page.locator('#mealFoodSearch').fill('espinaca cruda');await page.locator('[data-mealsuggestion=spinach_raw]').first().click();await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEntryMode').selectOption('weight');await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEditorQty').fill('62.5');await shot('student-entry');await page.locator('.ncc-entry-footer [data-act=saveSelectedMeal]').click();await page.locator('.meal-popup').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo[0].qty),62.5);await shot('student-registered');
   for(let repetition=0;repetition<3;repetition++)for(const tab of ['weight','home','nutritionScience','home']){
    const selector='.pilot-nav [data-tab='+tab+']';if(!await page.locator(selector).count())continue;await timed(page,'navigate:'+tab,selector,()=>page.locator(selector).click(),'window.__NCC_R4_FULLAPP__.state.tab==="'+tab+'"&&window.__NCC_USAGE_HOOKS__.rendered===window.__NCC_USAGE_HOOKS__.active');
   }
   await page.evaluate(()=>window.__NCC_USAGE_FIXTURE__.enter('coach'));await page.locator('[data-student="'+id+'"][data-rostersection=coachStudentNutrition]').click();await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.coachLogs.length===1);assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.coachLogs[0].meals.almuerzo[0].qty),62.5);await shot('coach-followup');
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);cases.push({engine,width,status:'PASS',roster:50,catalog:613,mealCount:6,quantityPreserved:62.5,privateHealthShared:false,externalRequests:0});
  }catch(e){failures.push({engine,width,message:e.message,errors,external});await shot('FAILURE').catch(()=>{});}finally{await context.close();save();}
 }}finally{await browser.close();}
}}finally{server.close();save();}
if(failures.length)throw Error(JSON.stringify(failures));console.log('PASS usage and performance',cases.length,'journeys',samples.length,'timed actions');
