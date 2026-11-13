// Checks the EXACT Capacitor-synced package, not an alternative preview.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const here=dirname(fileURLToPath(import.meta.url)),www=resolve(here,'android/app/src/main/assets/public'),out=resolve(here,'artifacts');mkdirSync(out,{recursive:true});
const missing=[];const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(www,'.'+path+(path.endsWith('/')?'index.html':''));assert.ok(file.startsWith(www+sep));const type=extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.avif':'image/avif','.webp':'image/webp','.svg':'image/svg+xml'}[type]||'application/octet-stream'));res.end(readFileSync(file));}catch{missing.push(req.url);res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),cases=[];try{for(const width of [320,390]){
 const context=await browser.newContext({viewport:{width,height:844}}),external=[],errors=[];await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto(origin+'/');await page.getByRole('heading',{name:'PRUEBA ANDROID · DATOS FICTICIOS'}).waitFor();assert.equal(await page.locator('#loginEmail').count(),0);
 await page.screenshot({path:resolve(out,'android-web-'+width+'-entry.png')});
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(out,'android-web-'+width+'-student.png')});
 await page.locator('[data-daymeal="almuerzo"]').click();await page.locator('.student-meal-card [data-setmeal="almuerzo"]').click();await page.locator('#mealFoodSearch').fill('huevo');await page.locator('[data-mealsuggestion="egg"]').first().click();await page.locator('#mealEditorQty').fill('2');await page.locator('.ncc-entry-footer [data-act=saveSelectedMeal]').click();await page.locator('.meal-popup').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.diary.meals.almuerzo.length),1);assert.ok(await page.evaluate(()=>!!sessionStorage.getItem('ncc-student-day-synthetic-record')));await page.screenshot({path:resolve(out,'android-web-'+width+'-fictional-save.png')});
 await page.getByRole('button',{name:'Coach: vista sobria',exact:true}).click();await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.profile?.role==='coach');await page.screenshot({path:resolve(out,'android-web-'+width+'-coach.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);cases.push({width,entryLocked:true,student:true,fictionalSave:true,coach:true,externalRequests:external,pageErrors:errors});await context.close();
}}finally{await browser.close();server.close();writeFileSync(resolve(out,'browser-result.json'),JSON.stringify({scope:'Chromium browser of exact native package assets, not Android WebView/device certification',cases,missing},null,2));}
assert.ok(!missing.some(x=>/\.(js|mjs|css)(\?|$)/.test(x)),'Missing executable resource: '+missing.join(','));console.log('PASS packaged Android web checks',cases.length);
