// Browser QA against the full app and a localhost-only synthetic account. No production I/O.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const preview=mkdtempSync(resolve(process.env.NCC_BROWSER_PREVIEW_DIR||'artifacts','ncc-tablet-bell-')),out=resolve('artifacts/tablet-notification-bell');
mkdirSync(out,{recursive:true});
const prep=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{encoding:'utf8'});
assert.equal(prep.status,0,prep.stderr);
const dist=resolve(preview,'dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),path=resolve(dist,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
  if(!path.startsWith(dist+'/'))throw Error();
  res.setHeader('content-type',types[extname(path)]||'application/octet-stream');res.end(readFileSync(path));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port, engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const browser=await engines.chromium.launch({headless:true,...(process.env.NCC_CHROMIUM_PATH?{executablePath:process.env.NCC_CHROMIUM_PATH}:{})});
try{
 const variants=[['tablet',800,1150,true],['phone',390,844,true],['desktop',1366,900,false]];
 for(const [label,width,height,touch] of variants){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:touch,hasTouch:touch});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();
  await page.goto(origin+'/efg-nutrition/pilot/');
  await page.getByRole('button',{name:'Alumno: parcial',exact:true}).click();
  await page.locator('.ncc-focus-summary').waitFor();
  await page.evaluate(()=>{document.querySelector('#ncc-student-day-fixture-controls').hidden=true;scrollTo(0,0);});
  const bell=page.getByRole('button',{name:/^Notificaciones(?:,|$)/}).and(page.locator('.efg-notify-bell'));
  await bell.waitFor();
  const measure=()=>page.evaluate(()=>{
   const host=document.querySelector('#efgNotifications'),button=host.querySelector('button'),r=button.getBoundingClientRect();
   const heading=document.querySelector('.ncc-day-welcome h1').getBoundingClientRect(),summary=document.querySelector('.ncc-focus-summary').getBoundingClientRect();
   return {inHeader:host.parentElement.matches('.ncc-day-welcome'),width:r.width,height:r.height,top:r.top,left:r.left,bottom:r.bottom,headingTop:heading.top,headingRight:heading.right,summaryTop:summary.top,fill:getComputedStyle(button.querySelector('svg')).fill,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  const layout=await measure();
  assert.equal(layout.inHeader,label==='tablet');
  if(label==='tablet'){
   assert.ok(layout.top<=layout.headingTop+1&&layout.left>=layout.headingRight);
   assert.ok(layout.bottom<=layout.summaryTop&&layout.width>=48&&layout.height>=48);
   assert.match(layout.fill,/^rgb\(/);
   assert.equal(layout.overflow,false);
   await page.screenshot({path:resolve(out,'tablet-day.png')});
  }
  await bell.click();
  assert.equal(await bell.getAttribute('aria-expanded'),'true');
  const popup=page.getByRole('region',{name:'Bandeja de notificaciones'});
  await popup.getByRole('button',{name:'Marcar todas como leídas'}).waitFor();
  if(label==='tablet'){
   assert.ok(await popup.getByRole('button',{name:'Cerrar',exact:true}).evaluate(button=>{
    const r=button.getBoundingClientRect();return button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
   }));
   await page.screenshot({path:resolve(out,'tablet-popup.png')});
  }
  await popup.getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.equal(await bell.getAttribute('aria-expanded'),'false');
  if(label==='tablet'){
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render());
   assert.equal((await measure()).inHeader,true,'one retained bell after rerender');
   assert.equal(await bell.count(),1);
   await page.locator('.pilot-nav [data-tab=planner]').click();
   assert.equal(await page.locator('body>#efgNotifications').count(),1,'restore standard inbox on other tabs');
   await page.locator('.pilot-nav [data-tab=home]').click();
   assert.equal((await measure()).inHeader,true,'restore header after returning to Mi Día');
   await page.setViewportSize({width:740,height:1150});
   await page.locator('body>#efgNotifications').waitFor();
   await page.setViewportSize({width,height});
   await page.locator('.ncc-day-welcome>#efgNotifications').waitFor();
  }
  console.log('PASS '+label,layout);
  await context.close();
 }
}finally{await browser.close();server.close();rmSync(preview,{recursive:true,force:true});}
