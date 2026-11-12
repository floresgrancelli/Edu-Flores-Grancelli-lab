// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/food-photo-review');
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
const catalog=Object.values(JSON.parse(readFileSync(resolve(root,'efg-nutrition/catalog/guide-catalog.json'))).foods);
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of (width===390?['student','coach','admin']:['student'])){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 const fixtures=catalog.filter(f=>['milanesa_chicken_baked','ensalada_verduras','pure_potato','fruit_salad_basic'].includes(f.id));
 await page.evaluate(async({role,fixtures})=>{
  const a=window.__NCC_R4_FULLAPP__,s=a.state;s.profile.role=role;s.tab='home';s.personalTargets={kcal:2200,protein_g:160,carb_g:230,fat_g:70,fiber_g:30};s.goals=[{...s.personalTargets}];
  const item=f=>({id:f.id,name:f.name,qty:f.id==='fruit_salad_basic'?200:100,unit:'g',k:100,p:4,c:15,f:3,fi:2});
  s.diary.meals.almuerzo=fixtures.filter(f=>f.id!=='fruit_salad_basic').sort((a,b)=>['milanesa_chicken_baked','ensalada_verduras','pure_potato'].indexOf(a.id)-['milanesa_chicken_baked','ensalada_verduras','pure_potato'].indexOf(b.id)).map(item);
  s.diary.meals.media_tarde=fixtures.filter(f=>f.id==='fruit_salad_basic').map(item);localStorage.setItem('efg-nutrition-habitual-v2:'+s.session.user.id+':media_tarde',JSON.stringify([{name:'Ensalada de frutas',items:s.diary.meals.media_tarde}]));s.lastEditedMeal='almuerzo';await a.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 },{role,fixtures});
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 const shot=async name=>{await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png'),fullPage:true});};
 const photos=page.locator('[data-daymealpanel="almuerzo"] .ncc-food-thumb .ncc-family-photo');assert.equal(await photos.count(),3);
 const positions=await photos.evaluateAll(es=>es.map(e=>({img:getComputedStyle(e).backgroundImage,pos:getComputedStyle(e).backgroundPosition})));
 for(const v of positions)assert.match(v.img,/food-specific\/prepared-r1.webp/);
 assert.equal(new Set(positions.map(v=>v.pos)).size,3);
 await page.evaluate(async()=>{for(const el of document.querySelectorAll('.ncc-family-atlas')){const src=getComputedStyle(el).backgroundImage.slice(5,-2);const image=new Image();image.src=src;await image.decode();if(image.naturalWidth<1000)throw Error('Missing atlas');}});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot('lunch');
 await page.locator('[data-daymeal="media_tarde"]').click();
 assert.match(await page.locator('[data-daymealpanel="media_tarde"] .ncc-food-thumb .ncc-family-photo').getAttribute('style'),/prepared-r1.webp/);await shot('fruit-salad');
 await page.locator('[data-daymealpanel="media_tarde"] .ncc-meal-more > summary').click();
 const habitual=page.locator('#habitualPreview_media_tarde .ncc-family-photo');assert.equal(await habitual.count(),1);assert.match(await habitual.getAttribute('style'),/prepared-r1.webp/);await shot('habitual');
 await page.locator('[data-daymealpanel="media_tarde"] [data-setmeal="media_tarde"]').click();await page.locator('.meal-popup').waitFor();
 await page.locator('#mealFoodSearch').fill('ensalada');
 const options=page.locator('#mealFoodSuggestions [role="option"]');await options.first().waitFor();assert.equal(await options.locator('.ncc-family-photo').count(),await options.count());
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-search.png')});
 await page.locator('[data-act="closeMeal"]').first().click();
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
 evidence.push({engine,width,role,correctPreparedPhotos:true,distinctPositions:true,assetsDecoded:true,noOverflow:true,noMutation:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS food photo review',evidence.length);
}finally{server.close();}
