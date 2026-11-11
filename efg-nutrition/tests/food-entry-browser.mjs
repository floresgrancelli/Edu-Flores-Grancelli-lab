// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/food-entry');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const results=[];
try{
 for(const engine of (process.env.NCC_BROWSER?[process.env.NCC_BROWSER]:['chromium','webkit'])){
  const browser=await engines[engine].launch({headless:true});
  try{for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width===390,hasTouch:width===390});
   await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/efg-nutrition/pilot/');
   await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();
   await page.locator('.ncc-focus-summary').waitFor();
   await page.screenshot({path:resolve(out,engine+'-'+width+'-luminous-day.png'),fullPage:true});
   assert.equal(await page.locator('.ncc-register-dock,[data-act="registerDayFood"]').count(),0,'No duplicate large registration buttons');
   const diaryBeforeTabs=await page.evaluate(()=>sessionStorage.getItem('ncc-student-day-synthetic-record'));
   for(const slot of ['desayuno','media_manana','almuerzo','media_tarde','merienda','cena']){
    await page.locator('[data-daymeal="'+slot+'"]').click();
    assert.equal(await page.locator('[data-daymealpanel]:visible').count(),1);
    assert.equal(await page.locator('[data-daymealpanel]:visible').getAttribute('data-daymealpanel'),slot);
    assert.equal(await page.locator('[data-daymeal="'+slot+'"]').getAttribute('aria-pressed'),'true');
   }
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('ncc-student-day-synthetic-record')),diaryBeforeTabs,'Changing tabs never writes food');
   const heading=page.locator('.student-meal-heading').first();await page.locator('[data-daymeal="desayuno"]').click();
   await heading.scrollIntoViewIfNeeded();
   await page.screenshot({path:resolve(out,engine+'-'+width+'-open-meal.png')});
   console.log('LIME_STYLES',await page.locator('.student-meal-heading').first().evaluate(e=>({background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e.querySelector('strong')).color})));

   const open=async(slot='desayuno')=>{await page.locator('[data-daymeal="'+slot+'"]').click();const add=page.locator('.student-meal-card [data-setmeal="'+slot+'"]').first();if(!await add.isVisible())await add.locator('xpath=ancestor::details[1]/summary').click();await add.click();await page.locator('.meal-popup').waitFor();};
   const search=async(term,id)=>{await page.locator('#mealFoodSearch').fill(term);await page.locator('[data-mealsuggestion="'+id+'"]').first().click();};
   const snapshot=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('ncc-student-day-synthetic-record')));
   await open();assert.equal(await page.locator('[data-mealsource="all"]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(25, 34, 16)');assert.equal(await page.locator('.ncc-meal-guidance-details').getAttribute('open'),null);
   assert.equal(await page.locator('[data-act="saveSelectedMeal"]').isDisabled(),true);
   assert.equal(await page.locator('#mealQuantityCard').isVisible(),false,'Quantity only appears after selection');
   if(width===390)assert.equal(await page.locator('.pilot-nav').isVisible(),false,'Bottom menu yields to registration');
   await search('huevo','egg');await page.locator('#mealEditorQty').fill('2');
   assert.equal(await page.locator('#mealEntryMode').inputValue(),'units');
   await page.locator('#mealEntrySlot').selectOption('media_manana');
   assert.equal(await page.locator('#mealEditorFood').inputValue(),'egg');assert.equal(await page.locator('#mealEditorQty').inputValue(),'2');
   await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.hold=true;});
   await page.locator('[data-act="saveSelectedMeal"]').click();
   await page.waitForFunction(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===1);
   assert.equal(await page.locator('[data-act="saveSelectedMeal"]').isDisabled(),true);
   await page.evaluate(()=>document.querySelector('[data-act="saveSelectedMeal"]').click());
   await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});
   await page.locator('.meal-popup').waitFor({state:'detached'});
   assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),1);
   let saved=await snapshot();assert.equal(saved.meals.media_manana.length,1);assert.equal(saved.meals.media_manana[0].displayQty,2);assert.equal(saved.totals.k,saved.meals.media_manana[0].k);
   await page.reload();await page.getByRole('button',{name:'Recuperar registro ficticio',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.media_manana.length),1);
   await open('cena');await page.locator('[data-mealsource="recent"]').click();assert.equal(await page.locator('#mealEntryShortcuts [data-mealsuggestion="egg"]').count(),1);
   await page.locator('#mealEntryShortcuts [data-mealsuggestion="egg"]').click();
   assert.equal(await page.locator('.ncc-shortcut-choice #mealQuantityCard').count(),1,'Selected recent expands its own quantity card');
   await page.locator('#mealEditorQty').fill('3');
   await page.locator('[data-mealsource="recipes"]').click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'3','Source navigation preserves quantity');
   await page.locator('[data-mealsource="recent"]').click();assert.equal(await page.locator('#mealEditorQty').inputValue(),'3');
   await page.screenshot({path:resolve(out,engine+'-'+width+'-recent-expanded.png')});
   await page.locator('[data-mealsource="all"]').click();await search('sushi','sushi_maki_salmon');
   assert.equal(await page.locator('#pilot-toast').isVisible(),false,'Previous confirmation clears when a new food entry starts');
   await page.locator('#mealEditorQty').fill('6');assert.match(await page.locator('#mealEditorQtyLabel').innerText(),/pieza/i);
   if(width===390){
    await page.setViewportSize({width,height:460});
    await page.locator('#mealEditorQty').scrollIntoViewIfNeeded();
    await page.locator('[data-act="saveSelectedMeal"]').scrollIntoViewIfNeeded();
    const bounds=await page.locator('[data-act="saveSelectedMeal"]').boundingBox();
    assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=460,'Save must remain reachable in reduced mobile viewport');
    assert.equal(await page.locator('[data-act="saveSelectedMeal"]').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);}),true,'Save must receive the tap, including after a previous confirmation');
    await page.setViewportSize({width,height:844});
   }
   await page.screenshot({path:resolve(out,engine+'-'+width+'-quantity.png')});
   if(engine==='chromium'&&width===390){
    const image=await page.screenshot({type:'jpeg',quality:48});console.log('EV03_SCREENSHOT_BASE64 '+image.toString('base64'));
   }
   await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
   saved=await snapshot();assert.equal(saved.meals.cena.length,1);assert.equal(saved.meals.cena[0].displayQty,6);
   // Correct a recorded portion in place, keeping the existing diary writer and scope.
   const originalSushi=structuredClone(saved.meals.cena[0]);
   const editButton=page.locator('[data-editfood="cena:0"]');
   await editButton.click();assert.equal(await page.locator('#pilot-toast').isVisible(),false,'Previous confirmation clears before editing');await page.locator('#diaryFoodQty').fill('8');
   if(width===390){
    await page.setViewportSize({width,height:460});await page.locator('[data-savefood]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('[data-savefood]').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.y>=0&&r.bottom<=innerHeight&&(hit===el||el.contains(hit));}),true,'Quantity save remains reachable above a keyboard-height viewport');
    await page.screenshot({path:resolve(out,engine+'-'+width+'-edit-dialog.png')});await page.setViewportSize({width,height:844});
   }
   await page.keyboard.press('Escape');assert.deepEqual((await snapshot()).meals.cena[0],originalSushi);
   assert.equal(await editButton.evaluate(el=>el===document.activeElement),true);
   await editButton.click();await page.locator('#diaryFoodQty').fill('2.5');
   const writesBeforeEdit=await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes);
   await page.locator('[data-savefood]').click();assert.match(await page.locator('#diaryFoodError').innerText(),/cantidad/);
   assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),writesBeforeEdit,'Fractional countable units cannot be stored');
   await page.locator('#diaryFoodQty').fill('8');
   await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true);
   await page.locator('[data-savefood]').click();await page.waitForFunction(()=>!document.querySelector('[data-savefood]').disabled);
   assert.equal(await page.locator('#diaryFoodQty').inputValue(),'8');assert.deepEqual((await snapshot()).meals.cena[0],originalSushi);
   await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false;window.__NCC_FOOD_ENTRY_FIXTURE__.hold=true;});
   await page.locator('[data-savefood]').click();await page.waitForFunction(()=>document.querySelector('[data-savefood]').disabled);
   await page.keyboard.press('Escape');assert.equal(await page.locator('.ncc-food-edit').isVisible(),true,'Pending write keeps editor mounted');
   await page.evaluate(()=>{document.querySelector('[data-savefood]').click();const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});
   await page.locator('.ncc-food-edit').waitFor({state:'detached'});
   saved=await snapshot();assert.equal(saved.meals.cena.length,1);assert.equal(saved.meals.cena[0].displayQty,8);assert.equal(saved.meals.cena[0].qty,originalSushi.qty*8/6);
   assert.equal(saved.meals.cena[0].k,Math.round(originalSushi.k*8/6*100)/100);
   assert.equal(await page.locator('[data-daymealpanel]:visible').getAttribute('data-daymealpanel'),'cena');
   assert.equal(await page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes),writesBeforeEdit+2,'One rejected write plus one successful write');
   await page.screenshot({path:resolve(out,engine+'-'+width+'-edited-quantity.png'),fullPage:true});
   // Return to the fixture quantity, then cancel and confirm a deletion of another entry.
   await editButton.click();await page.locator('#diaryFoodQty').fill('6');await page.locator('[data-savefood]').click();await page.locator('.ncc-food-edit').waitFor({state:'detached'});
   await page.locator('[data-removefood="cena:0"]').click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
   assert.equal((await snapshot()).meals.cena.length,1);
   // Named favorites and recipes are original account-scoped backups; no new store.
   await page.evaluate(()=>{
    const s=window.__NCC_R4_FULLAPP__.state,item=s.diary.meals.cena[0];
    localStorage.setItem('efg-nutrition-habitual-v2:learner:cena',JSON.stringify([{name:'Mi cena sushi',items:[item]},{name:'Mi cena huevo',items:[s.diary.meals.media_manana[0]]}]));
    localStorage.setItem('efg-nutrition-custom-recipes:learner',JSON.stringify([{name:'Tortilla prueba',ingredients:[{foodId:'egg',grams:100}],portions:2,totals:{k:148,p:12.4,c:.96,f:9.96,fi:0}}]));
   });
   await open('cena');await page.locator('[data-mealsource="habitual"]').click();await page.locator('#mealFoodSearch').fill('sushi');assert.match(await page.locator('#mealEntryShortcuts').innerText(),/Mi cena sushi/);
   await page.locator('[data-mealsource="recipes"]').click();await page.locator('#mealEntryShortcuts [data-mealsuggestion]').first().click();
   assert.match(await page.locator('#mealEditorQtyLabel').innerText(),/Porciones/);await page.locator('#mealEditorQty').fill('1.5');
   await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true;});
   await page.locator('[data-act="saveSelectedMeal"]').click();await page.waitForFunction(()=>!document.querySelector('[data-act="saveSelectedMeal"]').disabled);
   assert.equal(await page.locator('#mealEditorQty').inputValue(),'1.5');assert.equal((await snapshot()).meals.cena.length,1);
   await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false;});await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
   assert.equal((await snapshot()).meals.cena.length,2);
   await page.locator('[data-removefood="cena:1"]').click();
   await page.locator('[data-savefood]').click();await page.locator('.ncc-food-edit').waitFor({state:'detached'});
   assert.equal((await snapshot()).meals.cena.length,1);assert.equal((await snapshot()).meals.cena[0].id,'sushi_maki_salmon');
   assert.equal(await page.locator('[data-daymeal="cena"]').evaluate(el=>el===document.activeElement),true);
   // Next day's diary starts empty while favorite and history access remain.
   await page.reload();await page.getByRole('button',{name:'Recuperar registro ficticio',exact:true}).click();
   await page.evaluate(async()=>{const app=window.__NCC_R4_FULLAPP__,old=structuredClone(app.state.diary);old.log_day='2026-01-01';app.state.progressLogs=[old];app.state.diary.meals=Object.fromEntries(Object.keys(old.meals).map(k=>[k,[]]));await app.render();});
   await open('cena');await page.locator('[data-mealsource="habitual"]').click();assert.match(await page.locator('#mealEntryShortcuts').innerText(),/Mi cena sushi/);
   await page.locator('[data-mealsource="recent"]').click();assert.equal(await page.locator('#mealEntryShortcuts [data-mealsuggestion="sushi_maki_salmon"]').count(),1);
   await page.locator('[data-mealsource="habitual"]').click();
   await page.locator('#mealEntryHabitualChoice_cena').selectOption('local-1');
   const habitualColors=await page.locator('.meal-popup [data-habitualapply="cena"]').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,fg:getComputedStyle(el).color}));
   assert.deepEqual(habitualColors,{bg:'linear-gradient(rgb(161, 225, 68), rgb(131, 206, 48))',fg:'rgb(16, 22, 9)'},'Habitual primary action stays readable');
   await page.locator('.meal-popup [data-habitualapply="cena"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
   assert.equal((await snapshot()).meals.cena[0].id,'egg','Popup favorite choice must win over the daily selector behind it');
   await open('cena');await page.locator('[data-mealsource="recent"]').click();
   await page.screenshot({path:resolve(out,engine+'-'+width+'-recent.png')});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);results.push({engine,width,status:'PASS',scope:'synthetic transport, mobile viewport; no physical device or hosted auth'});await context.close();
  }}finally{await browser.close();}
 }
}finally{server.close();writeFileSync(resolve(out,'result.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
