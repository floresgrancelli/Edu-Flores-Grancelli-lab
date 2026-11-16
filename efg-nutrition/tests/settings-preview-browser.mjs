// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,process.env.NCC_TEXT_SIZE?'artifacts/readable-text/full-app':'artifacts/color-system');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
// This colour review uses the published arrangement, not the independent staged
// dual-workspace experiment enabled by the generic fixture builder. Source flags
// stay untouched; only the isolated copy is brought back to its published OFF.
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/workspace-tabs-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/workspace-tabs-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/workspace-tabs-sdk.mjs'));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');


try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width<700,hasTouch:true});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/efg-nutrition/pilot/');
  await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
  await page.evaluate(()=>{document.getElementById('ncc-student-day-fixture-controls').hidden=true;window.scrollTo(0,0);});
  for(const [role,actor] of [['alumno',null],['coach','mentor'],['admin','admin']]){
   if(actor)await page.evaluate(async actor=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs(actor);v.state.tab=actor==='admin'?'admin':'coach';await v.render();},actor);
   const trigger=page.locator(width<700?'.efg-mobile-header [data-ncc-open-settings]':'.pilot-nav [data-ncc-open-settings]');
   await trigger.waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'normal');
   await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-ubicacion.png'),fullPage:false});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'header overflow '+width+' '+role);
   await trigger.click();await page.locator('#nccSettingsDialog').waitFor();
   assert.equal(await page.getByRole('button',{name:'Normal',exact:true}).getAttribute('aria-pressed'),'true');
   await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-configuracion.png'),fullPage:false});
   await page.getByRole('button',{name:'Extra grande',exact:true}).click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('ncc-text-size-v1')),'extra');
   await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-extra.png'),fullPage:false});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'extra overflow '+width+' '+role);
   await page.getByRole('button',{name:'Normal',exact:true}).click();
   await page.keyboard.press('Escape');await page.locator('#nccSettingsDialog').waitFor({state:'detached'});
   assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'focus returns to settings');
  }
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS settings: '+engine+' '+width+' student/coach/admin, unchanged normal default, modal, scaling, close/focus, no horizontal overflow');
 }}finally{await browser.close();}
}}finally{server.close();}
