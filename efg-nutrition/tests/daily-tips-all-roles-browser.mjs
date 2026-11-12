// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/daily-tips');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const evidence=[];
try{for(const engine of (process.env.NCC_TIP_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[engine].launch({headless:true,...(process.env.NCC_CHROMIUM_PATH&&engine==='chromium'?{executablePath:process.env.NCC_CHROMIUM_PATH}:{})});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width<700,hasTouch:width<700});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async role=>{
  const v=window.__NCC_R4_FULLAPP__,s=v.state;s.profile.role=role;s.tab='home';
  if(role!=='student')s.personalTargets={kcal:2100,protein_g:150,carb_g:230,fat_g:70,fiber_g:28,updated_at:new Date().toISOString()};
  await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 },role);
 const tip=page.locator('.efg-daily-tip');await tip.waitFor({state:'visible'});
 assert.equal(await tip.count(),1);
 assert.equal(await tip.evaluate(e=>!!e.closest('details')),false,'Tip must be directly discoverable, outside collapsed tools');
 assert.equal(await page.locator('#nccDayTools').getAttribute('open'),null);
 assert.equal(await page.locator('.efg-daily-tip [data-tab="recipes"]').count(),role==='student'?0:1,'Personal roles use their recipe library; student plan gate retained');
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 await page.locator('[data-daymeal="almuerzo"]').click();await page.locator('#nccDayTools > summary').click();await page.locator('#nccDayTools > summary').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
 assert.equal(await tip.isVisible(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('[data-ncc-dual-panel]').count(),0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-full.png'),fullPage:true});
 await tip.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-tip.png')});
 evidence.push({engine,width,role,visible:true,outsideTools:true,diaryUnchanged:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS daily tips for all roles',evidence.length);
}finally{server.close();}
