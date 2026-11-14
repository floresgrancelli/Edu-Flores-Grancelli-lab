// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-restaurants-preview-'+process.pid,out=resolve(root,'artifacts/restaurants');
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
   await open();await search('almendras','almonds');await page.locator('.ncc-quantity-options > summary').click();await page.locator('#mealEntryMode').selectOption('weight');await page.locator('#mealEditorQty').fill('37.5');await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});assert.equal((await snapshot()).meals.cena[0].qty,37.5);
   await open();await search('mc donalds big mac','rest_mc_big_mac');assert.equal(await page.locator('#mealEntryMode').inputValue(),'units');await page.screenshot({path:resolve(out,engine+'-'+width+'-mcdonalds.png')});await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
   let row=(await snapshot()).meals.cena[1];assert.equal(row.qty,214);assert.equal(row.k,505);assert.equal(row.sourceType,'manufacturer_web_label');
   await page.locator('[data-editfood="cena:1"]').click();await page.locator('#diaryFoodQty').fill('0.5');await page.locator('[data-savefood]').click();await page.locator('.ncc-food-edit').waitFor({state:'detached'});row=(await snapshot()).meals.cena[1];assert.equal(row.qty,107);assert.equal(row.k,252.5);
   await open();await search('ishidan philadelphia','rest_ishidan_phila');await page.locator('#mealEditorQty').fill('6');await page.screenshot({path:resolve(out,engine+'-'+width+'-sushi.png')});await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});row=(await snapshot()).meals.cena[2];assert.equal(row.qty,180);assert.equal(row.displayQty,6);assert.equal(row.sourceType,'recipe_estimate');
   await open();await search('kansas ribs','rest_kansas_ribs');await page.locator('#mealEditorQty').fill('0.5');await page.screenshot({path:resolve(out,engine+'-'+width+'-kansas.png')});await page.locator('[data-act="saveSelectedMeal"]').click();await page.locator('.meal-popup').waitFor({state:'detached'});row=(await snapshot()).meals.cena[3];assert.equal(row.displayQty,.5);assert.equal(row.sourceType,'recipe_estimate');
   for(const [query,id] of [['burguer king whopper','rest_bk_whopper'],['mostaza cuarto','rest_mostaza_cuarto'],['sturbucks latte','rest_starbucks_latte'],['cafe martinez espresso','rest_martinez_espresso'],['tienda de cafe espresso','rest_tienda_espresso'],['havanna alfajor','rest_havanna_alfajor'],['bonafide espresso','rest_bonafide_espresso'],['wendy baconator','rest_wendys_baconator'],['kfc crispy','rest_kfc_strip'],['subway milanesa','rest_subway_milanesa_15'],['sushi club philadelphia','rest_sushiclub_phila'],['fabric roll','rest_fabric_fabric']]){
    await open();await search(query,id);assert.equal(await page.locator('#mealEditorFood').inputValue(),id);assert.equal(await page.locator('#mealEntrySelected .ncc-family-photo').count(),1);await page.locator('[data-act="closeMeal"]').first().click();
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);results.push({engine,width,status:'PASS',scope:'synthetic transport; 15 chains, official energy, estimated rolls, grams and editing'});await context.close();
  }}finally{await browser.close();}
 }
}finally{server.close();writeFileSync(resolve(out,'result.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
