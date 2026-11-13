import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/food-identity-thumbnails-review');
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



const base='9dad4de8e376d164e1c2d2eca5f9cbde1e8f372c';
const baselinePhotos=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/food-visuals-r2.js'],{cwd:root,encoding:'utf8'});
const batch=JSON.parse(readFileSync(resolve(root,'efg-nutrition/docs/food-thumbnails-20261113/generation-prompts.json'))).records;
const catalog=JSON.parse(readFileSync(resolve(root,'efg-nutrition/catalog/guide-catalog.json'))).foods;
const evidence=[];
const gallery=resolve(preview,'dist/efg-nutrition/pilot/thumbnail-review.html');
writeFileSync(gallery,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión de miniaturas</title><style>body{margin:20px;background:#0d1412;color:#f0f1e7;font:14px Arial}h1{font-size:22px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}article{background:#1b2422;border-radius:12px;padding:12px;min-height:160px}img,.ncc-family-photo{display:block;width:96px;height:96px;border-radius:16px;margin:0 auto 8px}p{line-height:1.3;margin:0}</style><h1>Miniaturas por alimento · candidata</h1><p>Galería de revisión con el mismo componente de la app. Imágenes ilustrativas.</p><main></main><script type="module">import {foodPhotoHTML} from './food-visuals-r2.js';const records=${JSON.stringify(batch)};const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');document.querySelector('main').innerHTML=records.map(x=>'<article>'+foodPhotoHTML(x,esc)+'<p>'+esc(x.name)+'</p></article>').join('');document.querySelectorAll('img').forEach(i=>i.loading='eager');</script></html>`);

try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{
 const galleryPage=await browser.newPage({viewport:{width:1100,height:844}});await galleryPage.goto(origin+'/efg-nutrition/pilot/thumbnail-review.html');await galleryPage.locator('article').nth(52).waitFor();await galleryPage.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await galleryPage.screenshot({path:resolve(out,engine+'-gallery-all53.png'),fullPage:true});await galleryPage.close();
 for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let baseline=false;
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await context.route('**/food-visuals-r2.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePhotos}):r.continue());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();await page.evaluate(async role=>{const a=window.__NCC_R4_FULLAPP__;a.state.profile.role=role;a.state.foodPlan=null;a.state.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};await a.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);};
 const open=async()=>{await page.locator('[data-daymeal=almuerzo]').click();await page.locator('.student-meal-card [data-setmeal=almuerzo]').click();await page.locator('.meal-popup').waitFor();};
 const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});
 const checkPhoto=async locator=>{const img=locator.locator('img.ncc-family-photo').first();if(await img.count()){await img.evaluate(async i=>{i.loading='eager';await i.decode();if(i.naturalWidth!==256||i.naturalHeight!==256)throw Error('Invalid thumbnail dimensions');});}else assert.ok(await locator.locator('.ncc-family-atlas').count());};
 if(role==='student'){baseline=true;await load();await open();await page.locator('#mealFoodSearch').fill('espinaca cruda');await page.locator('[data-mealsuggestion=spinach_raw]').first().waitFor();assert.equal(await page.locator('[data-mealsuggestion=spinach_raw] img').count(),0);await shot('production-spinach');baseline=false;}
 await load();await open();
 for(const food of batch){await page.locator('#mealFoodSearch').fill(food.name);const option=page.locator('[data-mealsuggestion="'+food.id+'"]').first();await option.waitFor();await checkPhoto(option);}
 await page.locator('#mealFoodSearch').fill('espinaca cruda');await page.locator('[data-mealsuggestion=spinach_raw]').first().waitFor();await shot('candidate-spinach');
 await page.locator('#mealFoodSearch').fill('atún');await page.locator('[data-mealsuggestion=tuna_oil_drained]').first().waitFor();await checkPhoto(page.locator('[data-mealsuggestion=tuna_oil_drained]').first());await shot('candidate-tuna');
 await page.locator('[data-mealsuggestion=tuna_oil_drained]').first().click();
 await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEntryMode').selectOption('weight');await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEditorQty').fill('62.5');await shot('quantity');
 await page.locator('.ncc-entry-footer [data-act=saveSelectedMeal]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
 const items=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo);assert.equal(items.length,1);assert.equal(items[0].id,'tuna_oil_drained');assert.equal(items[0].qty,62.5);await shot('registered');
 await page.evaluate(items=>{const s=window.__NCC_R4_FULLAPP__.state;localStorage.setItem('efg-nutrition-habitual-v2:'+s.session.user.id+':almuerzo',JSON.stringify([{name:'Atún en aceite · prueba ficticia',items}]));},items);
 await open();await page.locator('[data-mealsource=recent]').click();await page.locator('#mealEntryShortcuts [data-mealsuggestion=tuna_oil_drained]').click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'62.5');await shot('recent');
 await page.locator('[data-mealsource=habitual]').click();assert.match(await page.locator('#mealEntryShortcuts').innerText(),/Atún en aceite/);await shot('habitual');await page.locator('#mealEntryHabitualChoice_almuerzo').selectOption('local-0');page.once('dialog',dialog=>dialog.accept());await page.locator('.meal-popup [data-habitualapply=almuerzo]').click();await page.locator('.meal-popup').waitFor({state:'detached'});assert.deepEqual(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo),items,'Habitual application preserves exact catalog identity, quantity and nutrients');await shot('habitual-registered');
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));await page.locator('.ncc-day-plan-shortcut').click();await page.locator('[data-planmode=both]').click();await page.locator('[data-plannerslot=cena]').click();await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();
 const select=page.locator('[data-planselect="cena|protein"]');
 for(const food of batch)assert.equal(await select.locator('option[value="'+food.id+'"]').count(),1,food.id+' in planner');
 await page.locator('[data-plansearch="cena|protein"]').fill('picada cruda');await select.selectOption('ground_beef_90_10_raw');await page.locator('[id="planQty_cena|protein"]').fill('123');await shot('planner');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before,'Planning is not registration');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 if(role==='student'){
  await page.evaluate(async foods=>{const a=window.__NCC_R4_FULLAPP__,s=a.state;const goal={id:'fictional-thumbnail-goal',goal_type:'maintenance',kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};s.goals=[goal];s.foodPlan={guided_goal_id:goal.id,guided_plan:{kind:'flexible_meal_guide',version:2,meals:[{slot:'almuerzo',label:'Almuerzo',items:foods.map(f=>({...f,qty:62.5}))}]}};s.tab='planner';await a.render();},['spinach_raw','squid_raw','pita_white_unenriched'].map(id=>catalog[id]));
  await page.locator('#nccPlanDestinationSections [data-workspace-tab=guide]').click();await page.locator('#nccGuideSections [data-workspace-tab=meals]').click();await page.locator('.ncc-plan').waitFor();for(const img of await page.locator('.ncc-plan-photo img').all())await img.evaluate(i=>i.decode());await shot('guide');assert.equal(await page.locator('.ncc-plan-photo img').count(),3);assert.deepEqual(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo),items,'Guide display preserves registered amounts');
 }
 evidence.push({engine,width,role,search53Decoded:true,planner53:true,registeredExactGrams:true,recentQuantityPreserved:true,habitualAppliedExact:true,noPlannerDiaryMutation:true,noOverflow:true,guideCompared:role==='student',baselineCompared:role==='student'});await context.close();

 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS identity thumbnails full PWA',evidence.length);
}finally{server.close();}
