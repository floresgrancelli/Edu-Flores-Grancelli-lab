import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/habitual-recent-review');
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


const base='b019913f7c9135451993c6a7368409eff91d3973';
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/pilot.js'],{cwd:root,encoding:'utf8'}),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/food-entry-sdk.mjs');
const evidence=[],slots=['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const [wi,width] of [320,390,1280].entries())for(const [ri,role] of ['student','coach','admin'].entries()){
  const slot=slots[(ri*2+wi+(engine==='webkit'?3:0))%6];
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  let baseline=engine==='chromium'&&width===390&&role==='student';
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.route('**/pilot.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePilot}):r.continue());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();await page.evaluate(async({role,slot})=>{
   const app=window.__NCC_R4_FULLAPP__,s=app.state,uid=s.session.user.id;
   if(role!=='student'){s.profile.role=role;s.foodPlan=null;s.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};}
   const egg=(qty,units)=>({id:'egg',name:'Huevo entero sin cáscara (referencia crudo)',qty,unit:'g',displayQty:units,displayUnit:'huevo mediano',k:qty*1.48,p:qty*.124,c:qty*.0096,f:qty*.0996,fi:0});
   const banana={id:'banana',name:'Banana cruda sin cáscara',qty:100,unit:'g',k:89,p:1.1,c:22.8,f:.3,fi:2.6};
   s.progressLogs=[{student_id:uid,log_day:'2026-01-01',meals:{[slot]:[egg(450,9)]}},{student_id:'another-owner',log_day:'2026-12-31',meals:{[slot]:[egg(500,10)]}},{student_id:uid,log_day:'2026-02-01',meals:{[slot]:[egg(100,2),egg(150,3)]}}];
   localStorage.setItem('efg-nutrition-habitual-v2:'+uid+':'+slot,JSON.stringify([{name:'Mi opción huevo',items:[egg(100,2)]},{name:'Mi opción banana',items:[banana]}]));
   await app.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
  },{role,slot});};
  const open=async(which=slot)=>{await page.locator('[data-daymeal="'+which+'"]').click();await page.locator('.student-meal-card [data-setmeal="'+which+'"]').click();await page.locator('.meal-popup').waitFor();};
  const source=async name=>page.locator('[data-mealsource="'+name+'"]').click();
  const shot=async name=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(img=>img.complete).map(img=>img.decode().catch(()=>{})));const sources=[...document.querySelectorAll('.ncc-family-atlas')].map(el=>getComputedStyle(el).backgroundImage).filter(value=>value.startsWith('url(')).map(value=>value.slice(4,-1).replace(/^["']|["']$/g,''));await Promise.all([...new Set(sources)].map(src=>new Promise((resolve,reject)=>{const img=new Image(),limit=setTimeout(()=>reject(new Error('Local atlas load timeout')),10000);img.onload=()=>{clearTimeout(limit);resolve();};img.onerror=()=>{clearTimeout(limit);reject(new Error('Local atlas failed to load'));};img.src=src;})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+slot+'-'+name+'.png')});};
  if(baseline){await load();await open();await source('recent');await shot('before');baseline=false;}
  await load();await open();const diaryBefore=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
  assert.match(await page.locator('[data-mealsource="recent"]').innerText(),/\(1\)/);assert.match(await page.locator('[data-mealsource="habitual"]').innerText(),/\(2\)/);
  await source('recent');const recent=page.locator('#mealEntryShortcuts [data-mealsuggestion="egg"]');assert.match(await recent.innerText(),/Elegir con 3 un\./);assert.equal(await page.locator('#mealEntryShortcuts [data-mealsuggestion]').count(),1);await shot('recent');
  await recent.click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'3');assert.equal(await page.locator('#mealEntryMode').inputValue(),'units');assert.equal(await page.locator('#mealEntrySlot').inputValue(),slot);assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),0);await shot('last-quantity');
  await page.locator('#mealEditorQty').fill('5');await source('habitual');await source('recent');assert.equal(await page.locator('#mealEditorQty').inputValue(),'5','Manual draft wins when changing sources');
  await source('habitual');assert.equal(await page.locator('[data-act=saveSelectedMeal]').isDisabled(),true,'Manual draft cannot be added while reviewing a habitual');assert.equal(await page.locator('.efg-habitual-controls').evaluate(e=>e.nextElementSibling?.classList.contains('efg-habitual-preview-host')),true,'Habitual actions are immediately after its selector');const choice=page.locator('#mealEntryHabitualChoice_'+slot);await choice.selectOption('local-1');assert.match(await page.locator('#mealEntryHabitualPreview_'+slot).innerText(),/Banana/);
  await source('recent');await source('habitual');assert.equal(await choice.inputValue(),'local-1','Switching sources preserves explicit habitual selection');await page.locator('#mealFoodSearch').fill('banana');assert.equal(await choice.inputValue(),'local-1');await shot('habitual');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),diaryBefore,'Browsing, searching and reviewing never register food');
  await page.getByRole('button',{name:'Cerrar ventana de alimentos',exact:true}).click();await open();await source('habitual');assert.equal(await choice.inputValue(),'local-1','Reopening retains chosen habitual');
  await page.locator('.meal-popup [data-habitualapply="'+slot+'"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),1);assert.equal(await page.evaluate(slot=>window.__NCC_R4_FULLAPP__.state.diary.meals[slot][0].id,slot),'banana');await shot('registered');
  // Weight quantities and sushi piece quantities use the existing entry modes.
  if(engine==='chromium'&&width===390&&role==='student'){
   await page.evaluate(()=>{const s=window.__NCC_R4_FULLAPP__.state;s.progressLogs.push({student_id:s.session.user.id,log_day:'2026-03-01',meals:{cena:[{id:'sushi_maki_salmon',name:'Sushi maki salmón',qty:180,unit:'g',displayQty:6,displayUnit:'pieza',k:240,p:10,c:30,f:6,fi:0}],almuerzo:[{id:'banana',name:'Banana cruda sin cáscara',qty:75.5,unit:'g',k:67,p:1,c:17,f:0,fi:2}]}});});
   await open('cena');await source('recent');await page.locator('#mealEntryShortcuts [data-mealsuggestion="sushi_maki_salmon"]').click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'6');assert.equal(await page.locator('#mealEntryMode').inputValue(),'units');await shot('sushi-pieces');
   await page.locator('#mealEntrySlot').selectOption('almuerzo');await source('recent');await page.locator('#mealEntryShortcuts [data-mealsuggestion="banana"]').click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'75.5');assert.equal(await page.locator('#mealEntryMode').inputValue(),'weight');assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),1);await shot('weight');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  evidence.push({engine,width,role,slot,scopedCounts:true,latestDayAndLastEntry:true,otherOwnerExcluded:true,unitsRecovered:true,quantityEditable:true,draftPreservedAcrossSources:true,habitualSelectionPreserved:true,habitualActionNextToSelector:true,manualDraftInactiveInHabitual:true,reopenKeepsHabitual:true,noWritesWhileBrowsing:true,explicitHabitualRegistersOnce:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS habitual and recent access',evidence.length);
}finally{server.close();}
