import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/achuras-review');
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



const cases=[['chorizo','chorizo_cooked'],['morcilla','morcilla_cooked'],['chinchulin','chinchulines_grilled'],['rinon','kidney_beef_grilled'],['molleja','sweetbreads_beef_grilled'],['morcilla vasca','morcilla_vasca_estimate']];
const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();await page.evaluate(async role=>{const a=window.__NCC_R4_FULLAPP__;a.state.profile.role=role;a.state.foodPlan=null;a.state.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};await a.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
 await page.locator('[data-daymeal=almuerzo]').click();await page.locator('.student-meal-card [data-setmeal=almuerzo]').click();await page.locator('.meal-popup').waitFor();
 for(const [term,id] of cases){await page.locator('#mealFoodSearch').fill(term);await page.locator('[data-mealsuggestion="'+id+'"]').first().waitFor();}
 await page.locator('#mealFoodSearch').fill('achuras');for(const [,id] of cases)await page.locator('[data-mealsuggestion="'+id+'"]').first().waitFor();
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-achuras.png')});
 await page.locator('[data-mealsuggestion=kidney_beef_grilled]').first().click();await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEntryMode').selectOption('weight');await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEditorQty').fill('75');
 await page.locator('.ncc-entry-footer [data-act=saveSelectedMeal]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
 const items=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo);assert.equal(items.length,1);assert.equal(items[0].id,'kidney_beef_grilled');assert.equal(items[0].qty,75);assert.ok(Math.abs(items[0].k*75-113.25)<1e-8);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 evidence.push({engine,width,role,allSixSearchable:true,exactGramsRecorded:true,oldIdentitiesPreserved:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS achuras mounted PWA',evidence.length);
}finally{server.close();}
