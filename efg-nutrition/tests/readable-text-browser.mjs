import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const moduleSource=readFileSync('efg-nutrition/pilot/readable-text.js','utf8');
const server=createServer((req,res)=>{
 if(req.url==='/readable.js'){res.setHeader('Content-Type','text/javascript');return res.end(moduleSource);}
 if(req.url==='/late.css'){res.setHeader('Content-Type','text/css');return res.end('.late{font-size:20px}');}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial;background:#10231b;color:#fff;font-size:16px;padding:16px}button{font-size:14px;padding:12px}p{font-size:12px}h3{font-size:20px}@media(max-width:500px){h3{font-size:18px}}</style><div id="app"></div><script type="module">import {textSizeCard} from "/readable.js";document.querySelector("#app").innerHTML=textSizeCard()+\'<p class="late">Probando la lectura de Nutrición Con-Ciencia.</p>\'</script>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
mkdirSync('artifacts/readable-text',{recursive:true});
try{for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{for(const width of [320,390,768]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://127.0.0.1:'+server.address().port);
 for(const [name,factor] of [['Grande',1.2],['Extra grande',1.4],['Normal',1]]){
  await page.getByRole('button',{name,exact:true}).click();
  assert.ok(Math.abs(await page.locator('p').first().evaluate(x=>parseFloat(getComputedStyle(x).fontSize))-12*factor)<.01);
  assert.ok(Math.abs(await page.locator('h3').evaluate(x=>parseFloat(getComputedStyle(x).fontSize))-(width<=500?18:20)*factor)<.01);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow at '+width);
 }
 await page.getByRole('button',{name:'Extra grande',exact:true}).click();
 await page.reload();
 assert.equal(await page.getByRole('button',{name:'Extra grande',exact:true}).getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/late.css';link.onload=resolve;document.head.append(link);}));
 assert.equal(await page.locator('.late').evaluate(x=>getComputedStyle(x).fontSize),'28px');
 await page.screenshot({path:`artifacts/readable-text/${engine.name()}-${width}-extra.png`,fullPage:true});
 await page.close();
 console.log(`PASS ${engine.name()} ${width}: three sizes, reset, persistence, responsive rules, late stylesheet, no horizontal overflow`);
 }}finally{await browser.close();}
}}finally{server.close();}
