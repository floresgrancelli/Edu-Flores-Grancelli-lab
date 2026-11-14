// Actual PWA, isolated loopback fixtures; no hosted users or writes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-micro-preview-'+process.pid,out=resolve(root,'artifacts/micronutrient-restaurants-preview');
mkdirSync(out,{recursive:true});
const prep=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prep.status,0,prep.stderr);
const config=resolve(preview,'dist/efg-nutrition/pilot/micronutrients-config.js');
writeFileSync(config,readFileSync(config,'utf8').replace('MICRONUTRIENTS_ENABLED = false','MICRONUTRIENTS_ENABLED = true'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright'),evidence=[];
try{for(const engine of (process.env.NCC_TEST_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.NCC_CHROMIUM_EXECUTABLE?{executablePath:process.env.NCC_CHROMIUM_EXECUTABLE}:{})});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 for(const [id,quantity,nutrient] of [['rest_sushiclub_combo_30',920,'epa_dha'],['rest_fabric_combo_15',485,'epa_dha'],['rest_ishidan_combo_salmon_12',340,'b12'],['rest_mc_big_mac',214,'iron'],['alc_beer_lager',330,'magnesium'],['rest_starbucks_latte',250,'calcium'],['fish_salmon',150,'ala'],['helado_palito_crema',60,'b12'],['milk_soy_unsweet',200,'ala']]){
  for(const role of ['student','coach','admin']){
   await page.evaluate(async({id,quantity,role})=>{
    const v=window.__NCC_R4_FULLAPP__,s=v.state;
    const {MICRONUTRIENT_CATALOG:c}=await import('./micronutrient-expanded-catalog.js');
    for(const meal of Object.keys(s.diary.meals))s.diary.meals[meal]=[];
    s.diary.meals.cena=[{id,name:c.foods[id].name,qty:quantity,unit:c.foods[id].unit,k:300,p:15,c:30,f:10,fi:1,sourceId:c.foods[id].catalogSourceId}];
    s.profile.role=role;await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
   },{id,quantity,role});
   const detail=page.locator('[data-micro-detail="'+nutrient+'"]');assert.ok(await detail.locator('.ncc-micro-sources li').count()>0,id+' '+role);assert.match(await detail.textContent(),/ESTIMACIÓN DE MICRONUTRIENTES/);
   const before=await page.locator('[data-micronutrient="'+nutrient+'"] .ncc-micro-value').first().textContent();
   await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.diary.meals.cena[0].qty/=2;await v.render();});
   const after=await page.locator('[data-micronutrient="'+nutrient+'"] .ncc-micro-value').first().textContent();assert.notEqual(after,before,id+' quantity scales visible contribution');
   if(role==='student')await page.locator('.ncc-micronutrients').first().screenshot({path:resolve(out,engine+'-'+width+'-'+id+'.png')});
  }
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);evidence.push({engine,width,status:'PASS',scope:'new combos, chain meals and drinks; student coach admin; quantity scales'});await context.close();
 }}finally{await browser.close();}
}}finally{server.close();writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));}
console.log(JSON.stringify(evidence));
