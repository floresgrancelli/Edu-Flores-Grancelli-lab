import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const markup=readFileSync('efg-nutrition/pilot/index.html','utf8');
assert.ok([...markup.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].every(m=>m[0].includes('data-ncc-release-style="true"')));
let available='release-1';
const html=version=>'<!doctype html><html><head><meta name="efg-build" content="same-build"><link rel="stylesheet" data-ncc-release-style="true" href="/static.css?v='+version+'"></head><body><script type="module" src="/pilot.js?v='+version+'"></script></body></html>';
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/version-notice.js'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync('efg-nutrition/pilot/version-notice.js'));}
 if(path.endsWith('.css')||path==='/pilot.js'){res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');return res.end('');}
 res.setHeader('Content-Type','text/html');res.end(html(available));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try {for(const engine of [chromium,webkit]){
 available='release-1';const browser=await engine.launch({headless:true});
 try {const page=await browser.newPage();const base='http://127.0.0.1:'+server.address().port;
 const mount=async()=>page.evaluate(async()=>{
  for(const href of ['/runtime-student.css','/runtime-meal.css']){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.append(l);}
  const {createVersionNotice}=await import('/version-notice.js');window.notice=createVersionNotice({intervalMs:3600000});await window.notice.check({force:true});return window.notice.getStatus();
 });
 await page.goto(base+'/index.html');assert.equal((await mount()).hasUpdate,false);
 available='release-2';assert.equal(await page.evaluate(()=>window.notice.check({force:true})),true);
 await Promise.all([page.waitForURL(/ncc_updated=/),page.evaluate(()=>window.notice.apply({explicitClick:true}))]);
 assert.equal((await mount()).hasUpdate,false,'After update there must be no second banner');
 assert.equal(await page.evaluate(()=>window.notice.check({force:true})),false);
 assert.equal(await page.locator('#efgVersionNotice').isHidden(),true);
 console.log('PASS '+engine.name()+': initial current, genuine update, explicit reload, current after reload');
 }finally{await browser.close();}
}}finally{server.close();}
