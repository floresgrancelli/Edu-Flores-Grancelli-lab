// Entire PWA in an isolated local fixture; no production session or writes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(source,/data-planmatches=/);
assert.match(source,/role="combobox"/);
assert.match(source,/data-planmatchfood/);
assert.match(source,/syncPlannerSearchActions\(key\);updatePlannerPreview\(\);return;/);
const preview='/workspace/ncc-planner-suggestions-'+process.pid;
const staged=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(staged.status,0,staged.stderr);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=resolve(preview,'dist','.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const {chromium,webkit}=await import('playwright');
try{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const start=performance.now();
   await page.goto(origin+'/efg-nutrition/pilot/');
   await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();
   await page.locator('.ncc-focus-summary').waitFor();
   const timings={engine:engine.name(),viewport:'390 × 844',fixture:'local synthetic',openMs:Math.round(performance.now()-start)};
   let started=performance.now();
   await page.locator('[data-daymeal="almuerzo"]:visible').click();
   await page.locator('[data-daymealpanel="almuerzo"]').waitFor();
   timings.switchMealMs=Math.round(performance.now()-started);
   await page.locator('[data-daymealpanel="almuerzo"] [data-setmeal="almuerzo"]').click();
   started=performance.now();
   await page.locator('#mealFoodSearch').fill('huevo');
   const food=page.locator('[data-mealsuggestion="egg"][role="option"]').first();
   await food.waitFor();
   timings.searchMs=Math.round(performance.now()-started);
   await food.click();
   const source=page.locator('#mealFoodSource');
   await source.locator('summary').click();
   assert.match(await source.textContent(),/100 g|porción/);
   mkdirSync('report-catalog-speed-evidence',{recursive:true});
   writeFileSync('report-catalog-speed-evidence/'+engine.name()+'.json',JSON.stringify(timings,null,2));
   await page.screenshot({path:'report-catalog-speed-evidence/'+engine.name()+'-fuente.png'});
   await page.locator('.ncc-entry-cancel').click();
   const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
   await page.locator('.ncc-day-plan-shortcut').click();
   await page.locator('[data-planmode="dinner"]').click();
   await page.locator('[data-plannerslot="cena"]').click();
   for(const [category,tab,query] of [['protein','protein','milanesa'],['carbs','carbs','arroz'],['vegetable','extras','pan']]){
    await page.locator('#nccPlannerFood-cena [data-workspace-tab="'+tab+'"]').click();
    if(tab==='extras'){
     const extras=page.locator('[data-plannerextras="cena"]');
     if(await extras.count()&&!(await extras.evaluate(el=>el.open)))await extras.locator('summary').click();
    }
    const input=page.locator('[data-plansearch="cena|'+category+'"]');
    await input.fill(query);
    const results=page.locator('[data-planmatches="cena|'+category+'"]');
    assert.equal(await results.isVisible(),true,category+' suggestions are visible on '+engine.name());
    const matches=results.locator('button[data-planmatchfood]');
    const count=await matches.count();
    assert.ok(count>0&&count<=8,category+' shows real, bounded matches, got '+count);
    assert.equal(await input.getAttribute('aria-expanded'),'true');
    const id=await matches.first().getAttribute('data-planmatchfood');
    await matches.first().click();
    assert.equal(await page.locator('[data-planselect="cena|'+category+'"]').inputValue(),id,'Tap selects actual food');
    assert.equal(await results.isHidden(),true,'Result list closes after selection');
    assert.equal(await input.getAttribute('aria-expanded'),'false');
   }
   const search=page.locator('[data-plansearch="cena|protein"]');
   await page.locator('#nccPlannerFood-cena [data-workspace-tab="protein"]').click();
   await search.fill('zzx-no-existe-zzx');
   const empty=page.locator('[data-planmatches="cena|protein"]');
   assert.equal(await empty.isVisible(),true);
   assert.match(await empty.textContent(),/Sin coincidencias/);
   assert.equal(await page.locator('[data-planselect="cena|protein"]').inputValue(),'none');
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before,'Search and select never write to diary');
   assert.ok(!errors.length,JSON.stringify(errors));
   await page.evaluate(()=>{
    const {state}=window.__NCC_R4_FULLAPP__;
    localStorage.setItem('efg-nutrition-habitual-v2:'+state.session.user.id+':desayuno',JSON.stringify([{name:'Desayuno de prueba',items:[{name:'Avena',qty:40,unit:'g',k:150,p:5,c:25,f:3}]}]));
   });
   await page.locator('button.navitem[data-tab="studentMore"]').click();
   await page.locator('button.efg-menu-card[data-tab="settings"]').evaluate(el=>el.click());
   const card=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Comidas habituales',exact:true})});
   await card.locator('summary').filter({hasText:/^Desayuno$/}).click();
   await card.getByRole('button',{name:'Registrar habitual'}).waitFor();
   const quantity=card.getByRole('spinbutton',{name:'Avena · g'});
   assert.equal(await quantity.inputValue(),'40');
   await quantity.fill('60');
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before,'Editing the preview never writes the diary');
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('efg-nutrition-habitual-v2:'+window.__NCC_R4_FULLAPP__.state.session.user.id+':desayuno')));
   assert.equal(saved[0].items[0].qty,40,'Adjusting the portion leaves the template intact');
   mkdirSync('quick-habitual-evidence',{recursive:true});
   await page.screenshot({path:'quick-habitual-evidence/'+engine.name()+'.png'});
   await page.evaluate(()=>history.replaceState(history.state,'','?reminderMeal=desayuno'));
   await page.locator('button.navitem[data-tab="home"]').click();
   const meal=page.locator('[data-daymealpanel="desayuno"]');
   await meal.getByRole('button',{name:'Registrar habitual'}).waitFor();
   assert.ok(!new URL(page.url()).searchParams.has('reminderMeal'));
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before,'Opening a reminder never writes the diary');
   await page.screenshot({path:'quick-habitual-evidence/'+engine.name()+'-aviso.png'});
   await page.evaluate(async()=>{
    const app=window.__NCC_R4_FULLAPP__;
    app.state.diary.meals.desayuno=[{id:'qa-energy',name:'Registro ficticio',qty:100,unit:'g',k:5000,p:0,c:0,f:20,fi:0}];
    app.state.tab='home';
    await app.render();
   });
   await page.locator('.ncc-day-plan-shortcut').click();
   await page.locator('[data-planmode="dinner"]').click();
   assert.match(await page.locator('#plannerRealNumbers').textContent(),/Calorías 0(?:[,.]0)? kcal/);
   assert.match(await page.locator('#plannerPendingDetail').textContent(),/calorías ya están cubiertas.*proteína/i);
   assert.match(await page.locator('#plannerProjectedNumbers').textContent(),/Total del día/);
   await page.screenshot({path:'report-catalog-speed-evidence/'+engine.name()+'-saldo-cena.png'});
   await context.close();console.log('PASS '+engine.name()+' iPhone-sized planner food suggestions: protein, carbs, extras, no mutation');
  }finally{await browser.close();}
 }
}finally{server.close()}
