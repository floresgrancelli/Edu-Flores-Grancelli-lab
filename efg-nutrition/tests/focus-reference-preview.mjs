// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/focus-reference-review');
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

const browser=await engines.chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();
 await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: parcial',exact:true}).click();
 await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(()=>document.getElementById('ncc-student-day-fixture-controls')?.remove());
 await page.locator('[data-daymeal="desayuno"]').click();
 await page.evaluate(()=>{const e=document.querySelector('.ncc-day-meal-tabs');window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-110);});
 await page.screenshot({path:resolve(out,'NCC-propuesta-comidas.png')});
 await page.locator('[data-daymealpanel]:visible [data-setmeal]').click();
 await page.locator('.meal-popup').waitFor();
 await page.screenshot({path:resolve(out,'NCC-propuesta-registro.png')});
 await page.reload();await page.getByRole('button',{name:'Alumno: parcial',exact:true}).click();
 await page.locator('.ncc-day-welcome').waitFor();
 await page.evaluate(()=>{document.getElementById('ncc-student-day-fixture-controls')?.remove();const e=document.querySelector('.ncc-day-welcome');window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-110);});
 await page.locator('[aria-label="Espacios de la cuenta · candidata"]').evaluateAll(es=>es.forEach(e=>e.style.display='none'));
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:resolve(out,'NCC-propuesta-inicio.png')});
 const photo=await page.locator('.pilot-layout').evaluate(el=>{
  const style=getComputedStyle(el,'::before');return {position:style.backgroundPosition,pointerEvents:style.pointerEvents,width:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 assert.equal(photo.position,'100% 0%');assert.equal(photo.pointerEvents,'none');assert.ok(photo.width<=photo.viewport);
 const asset=await page.request.get(origin+'/efg-nutrition/pilot/assets/section-backgrounds.webp');assert.equal(asset.status(),200);assert.ok((await asset.body()).length<300000);
 const before=await page.locator('.ncc-day-welcome').boundingBox();
 await page.locator('link[href*="section-backgrounds.css"]').evaluate(el=>el.disabled=true);
 const after=await page.locator('.ncc-day-welcome').boundingBox();assert.deepEqual(after,before,'Decorative backgrounds must not add height or move content');
 await page.locator('link[href*="section-backgrounds.css"]').evaluate(el=>el.disabled=false);
 console.log('Background checks passed: correct day image, no pointer interception, no horizontal overflow, no layout shift, local asset below 300 KB.');
 console.log('Proposal screenshots only; synthetic data; no approval or release claim.');
 await context.close();
} finally {await browser.close();server.close();}
