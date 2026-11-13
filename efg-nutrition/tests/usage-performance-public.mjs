// Anonymous GET-only observation of the public login. Never submits a form or signs in.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const engines=await import('playwright'),out=resolve('artifacts/usage-performance');mkdirSync(out,{recursive:true});
const samples=[],failures=[];const save=()=>writeFileSync(resolve(out,'public.json'),JSON.stringify({url:'https://efg-nutrition.onrender.com/pilot/',scope:'Anonymous public login from GitHub-hosted runner; three fresh browser contexts and immediate same-context reloads per engine. No physical phone, account login, private API latency or real-user Core Web Vitals claim.',samples,failures},null,2));
for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(let repetition=0;repetition<3;repetition++){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),methods=[],errors=[];
  page.on('request',r=>methods.push(r.method()));page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__publicLcp=[];try{new PerformanceObserver(list=>window.__publicLcp.push(...list.getEntries().map(x=>({startTime:x.startTime,size:x.size})))).observe({type:'largest-contentful-paint',buffered:true})}catch{}});
  try{for(const mode of ['cold','reload']){
   const start=performance.now();const response=mode==='cold'?await page.goto('https://efg-nutrition.onrender.com/pilot/',{waitUntil:'domcontentloaded',timeout:45000}):await page.reload({waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('.pilot-login').waitFor({timeout:45000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const readyWallMs=performance.now()-start;
   const timing=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],r=performance.getEntriesByType('resource');return {loginReadyMs:performance.now(),ttfbMs:n.responseStart,domContentLoadedMs:n.domContentLoadedEventEnd,loadEventMs:n.loadEventEnd,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,lcpObservedMs:window.__publicLcp?.at(-1)?.startTime??null,resourceCount:r.length,sameOriginTransferBytes:r.filter(x=>new URL(x.name).origin===location.origin).reduce((a,x)=>a+x.transferSize,0),resources:r.map(x=>({url:x.name,ms:x.duration,transferBytes:x.transferSize,encodedBytes:x.encodedBodySize})),assetVersion:document.querySelector('script[src*="pilot.js"]').src,serverIdentity:document.querySelector('meta[name="efg-build"]').content}});
   samples.push({engine,repetition,mode,readyWallMs,status:response.status(),...timing,errors:[...errors],nonReadMethods:methods.filter(x=>!['GET','HEAD','OPTIONS'].includes(x))});
   if(response.status()!==200||timing.serverIdentity!=='ncc-pilot-3a40474052be'||samples.at(-1).nonReadMethods.length)throw Error('Public read-only identity/status check failed');
   if(repetition===0)await page.screenshot({path:resolve(out,engine+'-public-'+mode+'.png')});save();
  }}catch(e){failures.push({engine,repetition,message:e.message,errors});save();}finally{await context.close();}
 }}finally{await browser.close();}
}save();console.log('Public opening samples',samples.length,'failures',failures.length);if(failures.length)process.exitCode=1;
