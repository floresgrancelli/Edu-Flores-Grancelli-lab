// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/personal-space-review');
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


const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__,s=v.state;s.profile.role=role;s.tab=role==='admin'?'adminMore':'studentMore';s.personalTargets={kcal:2200,protein_g:150,carb_g:250,fat_g:65,fiber_g:30};s.goals=[{...s.personalTargets}];s.foodPlan=null;if(role!=='student')s.diary.sports=[{kind:'supplement',id:'creatine',name:'Creatina monohidratada',qty:3,unit:'g',k:0,p:0,c:0,f:0}];await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
 const shot=async name=>{await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png'),fullPage:true});};
 await page.locator('#nccPersonalSections [data-workspace-tab=tools]').click();
 assert.equal(await page.locator('.ncc-personal-menu [data-tab=supplements]').isVisible(),true);
 assert.equal(await page.locator('.ncc-space-goals').isVisible(),true);await shot('space');
 await page.locator('.ncc-personal-menu [data-tab=supplements]').click();
 await page.locator('#supplementItem').selectOption('creatine');await page.locator('#supplementQty').fill('3');
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 await page.locator('#nccSupplementSections [data-workspace-tab=today]').click();
 assert.equal(await page.locator(role==='student'?'.meal-food-empty':'.supplement-entries').isVisible(),true);await shot('consumed');
 await page.locator('#nccSupplementSections [data-workspace-tab=register]').click();
 assert.equal(await page.locator('#supplementQty').inputValue(),'3');assert.equal(await page.locator('#supplementItem').inputValue(),'creatine');await shot('supplements');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='planner';await v.render();});
 const nav=page.locator('#nccPlannerSections');await nav.waitFor();
 const qty=page.locator('[id="planQty_cena|protein"]');await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();await qty.fill('123');assert.equal((await page.locator('[data-suggestionpanel=cena] > summary .pilot-pill').innerText()).replace(' kcal',''),(await page.locator('[data-plan-energy=cena] [data-plan-energy-selected]').innerText()).replace(' kcal',''));
 const foodNav=page.locator('#nccPlannerFood-cena');
 await foodNav.locator('[data-workspace-tab=carbs]').click();assert.equal(await page.locator('[data-planselect="cena|carbs"]').isVisible(),true);
 await foodNav.locator('[data-workspace-tab=extras]').click();assert.equal(await page.locator('[data-plannerextras=cena]').isVisible(),true);
 await foodNav.locator('[data-workspace-tab=protein]').click();assert.equal(await qty.inputValue(),'123');await shot('planner');
 await nav.locator('[data-workspace-tab=balance]').click();assert.equal(await page.locator('#plannerPendingNotice').isVisible(),true);await shot('balance');
 await nav.locator('[data-workspace-tab=choose]').click();assert.equal(await qty.inputValue(),'123');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 evidence.push({engine,width,role,supplementDraftPreserved:true,plannerDraftPreserved:true,noTabMutation:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS personal space',evidence.length);
}finally{server.close();}
