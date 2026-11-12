// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/plan-tabs-review');
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


const base='f4260c2266178d6d90a9a1305788f552f521a561';
const beforeAssets=new Map(['workspace-tabs.js','workspace-tabs.css'].map(file=>[file,execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root})]));
const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 let baseline=true;
 await context.route('**/workspace-tabs.*',async route=>{const file=new URL(route.request().url()).pathname.split('/').pop();if(baseline&&beforeAssets.has(file))await route.fulfill({status:200,contentType:file.endsWith('.js')?'text/javascript':'text/css',body:beforeAssets.get(file)});else await route.continue();});
 const page=await context.newPage();
 const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async role=>{const a=window.__NCC_R4_FULLAPP__;if(role!=='student'){a.state.profile.role=role;a.state.foodPlan=null;a.state.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};await a.render();}document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
};
 await load();await page.locator('.ncc-day-plan-shortcut').click();await page.evaluate(()=>scrollTo(0,0));
 const firstSearch=()=>page.locator('.planner-food-search:visible').first();
 const baselineSearchY=await firstSearch().evaluate(el=>el.getBoundingClientRect().top+scrollY);
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-before-full.png'),fullPage:true});
 baseline=false;await load();
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 const shortcut=page.locator('.ncc-day-plan-shortcut');assert.equal(await shortcut.locator('svg').count(),2);
 const sizes=await shortcut.locator('svg').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));assert.ok(sizes.every(w=>w>0&&w<=20));
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-day-shortcut.png')});
 await page.locator('.ncc-day-plan-shortcut').click();
 const candidateSearchY=await firstSearch().evaluate(el=>el.getBoundingClientRect().top+scrollY);
 assert.ok(candidateSearchY<baselineSearchY-150,`Food choice must move up: ${baselineSearchY} → ${candidateSearchY}`);
 const help=page.locator('.ncc-planner-help');assert.equal(await help.count(),1);assert.equal(await help.getAttribute('open'),null);
 assert.match(await help.textContent(),/incompatibilidades conocidas/);assert.match(await help.textContent(),/grasas se contabilizan/);
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-compact.png')});
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-compact-full.png'),fullPage:true});
 await help.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await help.getAttribute('open'),'');
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-help.png')});
 await page.keyboard.press('Enter');assert.equal(await help.getAttribute('open'),null);
 assert.equal(await page.locator('#nccPlanDestinationSections [data-workspace-tab=planning]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#nccPlannerSections [data-workspace-tab=choose]').getAttribute('aria-pressed'),'true');
 await page.locator('.pilot-nav [data-tab=home]').click();await page.locator('.pilot-nav [data-tab=planner]').click();
 const nav=page.locator('#nccPlanDestinationSections');await nav.waitFor();
 const shot=async name=>{await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});};
 await nav.locator('[data-workspace-tab=guide]').click();assert.equal(await page.locator('#nccPlanDestinationSections-guide').isVisible(),true);await shot('guide');
 await nav.locator('[data-workspace-tab=planning]').click();assert.equal(await page.locator('#planSuggestionCard').isVisible(),true);
 await page.locator('[data-planmode=both]').click();await page.locator('#nccPlannerSections [data-workspace-tab=choose]').click();
 assert.equal(await page.locator('[data-suggestionpanel=merienda]').count(),1);assert.equal(await page.locator('[data-suggestionpanel=cena]').count(),1);
 await page.locator('[data-plannerslot=cena]').click();const qty=page.locator('[id="planQty_cena|protein"]');await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();await qty.fill('123');
 await help.locator('summary').click();await help.locator('summary').click();assert.equal(await qty.inputValue(),'123');
 await page.locator('#nccPlannerSections [data-workspace-tab=balance]').click();assert.equal(await page.locator('#plannerRealNumbers').isVisible(),true);
 await page.locator('#nccPlannerSections [data-workspace-tab=choose]').click();assert.equal(await qty.inputValue(),'123');
 await page.locator('#nccPlanDestinationSections [data-workspace-tab=guide]').click();await page.locator('#nccPlanDestinationSections [data-workspace-tab=planning]').click();assert.equal(await qty.inputValue(),'123');await shot('planning-both');
 await page.locator('[data-planmode=dinner]').click();assert.equal(await page.locator('#planSuggestionCard').isVisible(),true);assert.equal(await page.locator('[data-suggestionpanel=merienda]').count(),0);await shot('planning-dinner');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 evidence.push({engine,width,role,baselineSearchY,candidateSearchY,helpKeyboardAccessible:true,dayShortcutDirect:true,realNavWorks:true,bothModes:true,draftPreserved:true,noDiaryMutation:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS Plan destinations',evidence.length);
}finally{server.close();}
