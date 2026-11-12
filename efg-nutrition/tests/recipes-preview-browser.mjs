// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/recipes-preview');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
// Preserve the real editorial photo URLs; the browser route serves exact saved copies.
copyFileSync(resolve(root,'efg-nutrition/pilot/fit-recipe-photos.js'),resolve(preview,'dist/efg-nutrition/pilot/fit-recipe-photos.js'));
// Keep CSS data-URL SVG namespaces intact; no remote resources are loaded here.
copyFileSync(resolve(root,'efg-nutrition/pilot/recipes-library-r1.css'),resolve(preview,'dist/efg-nutrition/pilot/recipes-library-r1.css'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const evidence=[];
const photos={
 'photo-1632931057819-4eefffa8e007':'budin-whey.jpg',
 'photo-1504854991036-ca1b54063e48':'pancakes.jpg',
 'photo-1744444202869-54debf97b285':'bowl.jpg'
};
try{
for(const engine of (process.env.NCC_BROWSER?[process.env.NCC_BROWSER]:['chromium','webkit'])){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320]){
  const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block',isMobile:true,hasTouch:true});
  await context.route('**/*',r=>{
   const url=new URL(r.request().url());if(url.origin===origin)return r.continue();
   const photo=Object.entries(photos).find(([id])=>url.hostname==='images.unsplash.com'&&url.pathname.includes(id));
   return photo?r.fulfill({contentType:'image/jpeg',body:readFileSync(resolve(root,'efg-nutrition/docs/recipes-preview',photo[1]))}):r.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto(origin+'/efg-nutrition/pilot/');
  await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();
  await page.locator('.ncc-focus-summary').waitFor();
  await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='recipes';v.state.lastEditedMeal='merienda';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;});
  // Hide only synthetic account-switching UI, never application content.
  await page.addStyleTag({content:'[aria-label="Espacios de la cuenta · candidata"]{display:none!important}'});
  assert.equal(await page.locator('.efg-fit-card').count(),12);
  assert.equal(await page.locator('#nccRecipes-own').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.efg-fit-card').first().locator('img').evaluate(img=>img.decode());
  await page.screenshot({path:resolve(out,engine+'-'+width+'-library.png')});
  await page.locator('#nccRecipeCategory').selectOption('Almuerzos y cenas');await page.waitForFunction(()=>document.querySelectorAll('.efg-fit-card').length===6);
  await page.locator('#nccRecipeCategory').selectOption('all');await page.waitForFunction(()=>document.querySelectorAll('.efg-fit-card').length===12);
  const open=async()=>{await page.locator('[data-fitrecipe="budin-whey"]').click();await page.locator('.ncc-recipe-sheet').waitFor();};
  const writes=()=>page.evaluate(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes);
  await open();assert.equal(await page.locator('#efgRecipeRegisterSlot').inputValue(),'merienda');
  assert.match(await page.locator('#nccRecipeNutrients').innerText(),/180 kcal/);
  assert.equal(await page.locator('.pilot-nav').isVisible(),false);
  await page.locator('.ncc-recipe-hero img').evaluate(img=>img.decode());
  await page.screenshot({path:resolve(out,engine+'-'+width+'-register.png')});
  const boxes=await page.locator('.ncc-recipe-sheet button,.ncc-recipe-sheet select,.ncc-recipe-sheet input:not([type=hidden])').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  assert.ok(boxes.every(h=>h>=44));
  await page.locator('#efgRecipeRegisterQty').fill('0,5');await page.locator('#efgRecipeRegisterSlot').selectOption('almuerzo');
  assert.match(await page.locator('#nccRecipeNutrients').innerText(),/90 kcal/);
  await page.keyboard.press('Escape');assert.equal(await writes(),0);
  await page.locator('[data-recipessection="own"]').click();await page.locator('[data-recipessection="library"]').click();
  await open();assert.equal(await page.locator('#efgRecipeRegisterQty').inputValue(),'0,5');assert.equal(await page.locator('#efgRecipeRegisterSlot').inputValue(),'almuerzo');
  await page.setViewportSize({width,height:460});await page.locator('#efgRecipeRegisterQty').focus();
  await page.locator('[data-act="saveLibraryRecipe"]').scrollIntoViewIfNeeded();assert.equal(await page.locator('.pilot-nav').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width,height:950});
  await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.hold=true;});
  await page.locator('[data-act="saveLibraryRecipe"]').click();await page.waitForFunction(()=>window.__NCC_FOOD_ENTRY_FIXTURE__.writes===1);
  assert.equal(await page.locator('[data-act="saveLibraryRecipe"]').isDisabled(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.ncc-recipe-sheet').count(),1);
  await page.evaluate(()=>document.querySelector('[data-act="saveLibraryRecipe"]').click());
  await page.evaluate(()=>{const c=window.__NCC_FOOD_ENTRY_FIXTURE__;c.hold=false;c.release();});
  await page.locator('.ncc-recipe-sheet').waitFor({state:'detached'});
  assert.equal(await writes(),1);
  const item=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo.at(-1));assert.equal(item.id,'fit-recipe:budin-whey');assert.equal(item.qty,.5);assert.equal(item.k,89.8);
  await open();assert.equal(await page.locator('#efgRecipeRegisterQty').inputValue(),'1','Successful registration clears only its draft');
  await page.locator('#efgRecipeRegisterSlot').selectOption('cena');await page.locator('#efgRecipeRegisterQty').fill('1.5');
  const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
  await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.fail=true;});
  await page.locator('[data-act="saveLibraryRecipe"]').click();await page.waitForFunction(()=>document.getElementById('nccRecipeError').textContent.includes('rejected'));
  assert.equal(await page.locator('#efgRecipeRegisterQty').inputValue(),'1.5');assert.equal(await page.locator('#efgRecipeRegisterSlot').inputValue(),'cena');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
  await page.evaluate(()=>{window.__NCC_FOOD_ENTRY_FIXTURE__.fail=false;});await page.locator('[data-act="saveLibraryRecipe"]').click();await page.locator('.ncc-recipe-sheet').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.cena.length),1);
  // Preserve the released shared catalog: a guide is not a student diary whitelist.
  await page.evaluate(()=>{window.__NCC_R4_FULLAPP__.state.foodPlan.approved_food_ids=['egg'];});
  await open();const count=await writes();await page.locator('[data-act="saveLibraryRecipe"]').click();await page.locator('.ncc-recipe-sheet').waitFor({state:'detached'});assert.equal(await writes(),count+1);
  for(const role of ['coach','admin']){
   await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__;v.state.profile.role=role;v.state.tab='recipes';await v.render();},role);
   await open();await page.locator('[data-act="saveLibraryRecipe"]').click();await page.locator('.ncc-recipe-sheet').waitFor({state:'detached'});
  }
  // Existing local own recipes stay selectable, private and registered through the original saver.
  await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;localStorage.setItem('efg-nutrition-custom-recipes:'+v.state.session.user.id,JSON.stringify([{name:'Mi receta de prueba',portions:2,ingredients:[{foodId:'egg',grams:100}],totals:{k:148,p:12.4,c:.96,f:9.96,fi:0}}]));await v.render();});
  await page.locator('[data-recipessection="own"]').click();await page.locator('[data-ownrecipe]').first().click();
  await page.locator('#efgRecipeRegisterQty').fill('0.5');await page.locator('#efgRecipeRegisterSlot').selectOption('media_tarde');
  await page.locator('[data-act="saveLibraryRecipe"]').click();await page.locator('.ncc-recipe-sheet').waitFor({state:'detached'});
  const own=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.media_tarde.at(-1));assert.equal(own.id,'custom-recipe');assert.equal(own.k,37);
  await page.screenshot({path:resolve(out,engine+'-'+width+'-own.png')});
  assert.deepEqual(errors,[]);
  evidence.push({engine,width,library:12,categories:6,drafts:true,fractional:true,singleWrite:true,rejectedWriteRollback:true,permissionsUnchanged:true,professionalPersonalDiary:true,ownRecipe:true,noOverflow:true,shortViewport:true,physicalDevice:false});
  await context.close();
 }}finally{await browser.close();}
}
writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{server.close();}
