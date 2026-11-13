import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/catalog-batch-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));

// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.
copyFileSync(resolve(root,'efg-nutrition/pilot/nutrition-daily-tip.js'),resolve(preview,'dist/efg-nutrition/pilot/nutrition-daily-tip.js'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');



const base='e2dc451f75d0b4d31fa9af3b39a83c62626c13c8';
const baselineCatalog=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/food-catalog.js'],{cwd:root,encoding:'utf8'});
const batch=JSON.parse(readFileSync(resolve(root,'efg-nutrition/docs/catalog-batch-20261113/review.json'))).records;
const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let baseline=false;
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await context.route('**/food-catalog.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselineCatalog}):r.continue());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();await page.evaluate(async role=>{const a=window.__NCC_R4_FULLAPP__;a.state.profile.role=role;a.state.foodPlan=null;a.state.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};await a.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);};
 const open=async()=>{await page.locator('[data-daymeal=almuerzo]').click();await page.locator('.student-meal-card [data-setmeal=almuerzo]').click();await page.locator('.meal-popup').waitFor();};
 const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});
 if(role==='student'){baseline=true;await load();await open();await page.locator('#mealFoodSearch').fill('espinaca');await page.waitForTimeout(150);assert.equal(await page.locator('[data-mealsuggestion=spinach_raw]').count(),0);await shot('production-spinach');baseline=false;}
 await load();await open();
 for(const food of batch){await page.locator('#mealFoodSearch').fill(food.name);await page.locator('[data-mealsuggestion="'+food.id+'"]').first().waitFor();}
 await page.locator('#mealFoodSearch').fill('espinaca');await page.locator('[data-mealsuggestion=spinach_raw]').first().waitFor();await shot('candidate-spinach');
 await page.locator('[data-mealsuggestion=spinach_raw]').first().click();
 await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEntryMode').selectOption('weight');await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEditorQty').fill('37.5');await shot('quantity');
 await page.locator('.ncc-entry-footer [data-act=saveSelectedMeal]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
 const items=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo);assert.equal(items.length,1);assert.equal(items[0].id,'spinach_raw');assert.equal(items[0].qty,37.5);await shot('registered');
 await page.evaluate(items=>{const s=window.__NCC_R4_FULLAPP__.state;localStorage.setItem('efg-nutrition-habitual-v2:'+s.session.user.id+':almuerzo',JSON.stringify([{name:'Espinaca cruda · prueba ficticia',items}]));},items);
 await open();await page.locator('[data-mealsource=recent]').click();await page.locator('#mealEntryShortcuts [data-mealsuggestion=spinach_raw]').click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'37.5');await shot('recent');
 await page.locator('[data-mealsource=habitual]').click();assert.match(await page.locator('#mealEntryShortcuts').innerText(),/Espinaca cruda/);await shot('habitual');await page.locator('[data-act=closeMeal]').first().click();
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));await page.locator('.ncc-day-plan-shortcut').click();await page.locator('[data-planmode=both]').click();await page.locator('[data-plannerslot=cena]').click();await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();
 const select=page.locator('[data-planselect="cena|protein"]');
 for(const food of batch)assert.equal(await select.locator('option[value="'+food.id+'"]').count(),1,food.id+' in planner');
 await page.locator('[data-plansearch="cena|protein"]').fill('pavo');await select.selectOption('turkey_breast_raw');await page.locator('[id="planQty_cena|protein"]').fill('123');await shot('planner');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before,'Planning is not registration');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 evidence.push({engine,width,role,search25:true,planner25:true,registeredExactGrams:true,recentQuantityPreserved:true,habitualAvailable:true,noPlannerDiaryMutation:true,noOverflow:true,baselineCompared:role==='student'});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS catalog full PWA',evidence.length);
}finally{server.close();}
