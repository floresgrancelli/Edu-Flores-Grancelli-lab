// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-alcohol-preview-'+process.pid,out=resolve(root,'artifacts/alcohol');
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
   const open=async()=>{await page.locator('[data-daymeal="cena"]').click();const add=page.locator('.student-meal-card [data-setmeal="cena"]').first();if(!await add.isVisible())await add.locator('xpath=ancestor::details[1]/summary').click();await add.click();await page.locator('.meal-popup').waitFor();};
   const search=async(term,id)=>{await page.locator('#mealFoodSearch').fill(term);await page.locator('[data-mealsuggestion="'+id+'"]').first().click();};
   const snapshot=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('ncc-student-day-synthetic-record')));
   await open();await search('fernet coca zero','alc_fernet_zero');
   assert.equal(await page.locator('#mealEntryMode').inputValue(),'units');
   await page.locator('#mealEditorQty').fill('0.5');
   assert.match(await page.locator('#mealEditorHint').innerText(),/125 ml/);
   assert.doesNotMatch(await page.locator('#mealEditorHint').innerText(),/aceite/);
   await page.locator('#mealEditorHint summary').click();
   assert.match(await page.locator('#mealEditorHint').innerText(),/7 kcal/);
   await page.locator('#mealEditorHint summary').click();
   await page.screenshot({path:resolve(out,engine+'-'+width+'-fernet-zero.png')});
   await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
   let row=(await snapshot()).meals.cena[0];assert.equal(row.id,'alc_fernet_zero');assert.equal(row.qty,125);assert.equal(row.unit,'ml');assert.equal(row.displayQty,.5);assert.ok(row.k>row.p*4+row.c*4+row.f*9+50);
   const half=row.k;await page.locator('[data-editfood="cena:0"]').click();await page.locator('#diaryFoodQty').fill('1.5');await page.locator('[data-savefood]').click();await page.locator('.ncc-food-edit').waitFor({state:'detached'});
   row=(await snapshot()).meals.cena[0];assert.equal(row.qty,375);assert.equal(row.unit,'ml');assert.ok(Math.abs(row.k-half*3)<.04);
   await open();await search('penicilin','alc_penicillin');assert.match(await page.locator('#mealEditorHint').innerText(),/ml/);await page.locator('[data-act="closeMeal"]').first().click();
   await open();await search('vino tinto','alc_wine_red');await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEntryMode').selectOption('weight');await page.locator('#mealEditorQty').fill('150');await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
   row=(await snapshot()).meals.cena[1];assert.equal(row.qty,150);assert.equal(row.unit,'ml');assert.ok(row.k>100);
   await open();await search('almendras','almonds');assert.equal(await page.locator('#mealEntryMode').inputValue(),'units');await page.locator('#mealEditorQty').fill('0.5');assert.match(await page.locator('#mealEditorHint').innerText(),/12[,.]5 g/);await page.screenshot({path:resolve(out,engine+'-'+width+'-almendras.png')});await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});row=(await snapshot()).meals.cena[2];assert.equal(row.qty,12.5);assert.equal(row.displayQty,.5);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);results.push({engine,width,status:'PASS',scope:'synthetic transport; portions, ml, ethanol, edit'});await context.close();
  }}finally{await browser.close();}
 }
}finally{server.close();writeFileSync(resolve(out,'result.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
