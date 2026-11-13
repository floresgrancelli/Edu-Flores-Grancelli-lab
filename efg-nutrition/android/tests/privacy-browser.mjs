import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.NCC_PREVIEW_URL||'http://127.0.0.1:8765';
const evidence=new URL('../evidence/',import.meta.url).pathname;
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.NCC_CHROMIUM||undefined,args:['--no-sandbox']});
const A='11111111-1111-4111-8111-111111111111';
const ID='33333333-3333-4333-8333-333333333333';
function sdkMock(fail=false){return `
let user=null,row=null;const listeners=[];
export function createClient(){return {
 auth:{getUser:async()=>({data:{user}}),onAuthStateChange:f=>listeners.push(f),
 signInWithOtp:async args=>{if(args.options.shouldCreateUser!==false)throw Error('Unsafe signup');return {error:null}},
 verifyOtp:async()=>{user={id:'${A}',email:'cuenta-de-prueba@example.test'};listeners.forEach(f=>f('SIGNED_IN'));return {error:null}},
 signOut:async()=>{user=null;listeners.forEach(f=>f('SIGNED_OUT'));return {error:null}}},
 from(){return {select(){return this},eq(){return this},order(){return this},limit(){return this},
 maybeSingle:async()=>({data:row,error:null}),insert:async()=>{${fail?"return {error:{code:'42P01'}}":"row={id:'"+ID+"',user_id:'"+A+"',status:'pending',requested_at:'2026-11-13T16:00:00Z'};return {error:null}"}}}}
};}`;}
async function scenario(width,fail=false){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://esm.sh/**',r=>r.fulfill({contentType:'application/javascript',body:sdkMock(fail)}));
 await page.goto(base+'/efg-nutrition/pilot/eliminar-cuenta.html');
 await page.waitForFunction(()=>!document.getElementById('feedback').textContent);
 assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>window.innerWidth),false);
 if(!fail)await page.screenshot({path:evidence+'privacy-'+width+'.png',fullPage:true});
 await page.locator('#email').fill('cuenta-de-prueba@example.test');
 await page.locator('#email-form button').click();
 await page.locator('#code').waitFor({state:'visible'});
 await page.locator('#code').fill('123456');
 await page.locator('#code-form button[type=submit]').click();
 await page.locator('#verified').waitFor({state:'visible'});
 await page.locator('#deletion-form button').click();
 assert.equal(await page.locator('#receipt').isVisible(),false,'Unchecked confirmation must not submit');
 await page.locator('#confirm').check();
 await page.locator('#deletion-form button').click();
 if(fail){
   await page.waitForFunction(()=>document.getElementById('feedback').dataset.error==='true');
   assert.equal(await page.locator('#receipt').isVisible(),false,'Backend failure must not claim success');
 }else{
   await page.locator('#receipt').waitFor({state:'visible'});
   assert.match(await page.locator('#receipt').textContent(),/todavía no se completó/);
   assert.match(await page.locator('#receipt').textContent(),new RegExp(ID));
   if(width===390)await page.screenshot({path:evidence+'privacy-receipt.png',fullPage:true});
   await page.locator('#sign-out').click();
   await page.locator('#email-form').waitFor({state:'visible'});
   assert.equal(await page.locator('#receipt').isVisible(),false);
 }
 assert.deepEqual(errors,[]);await page.close();
}
try{await scenario(390);await scenario(1280);await scenario(390,true);console.log('Privacy browser QA passed: mobile/desktop, OTP, confirmation, receipt, logout and backend failure. Synthetic accounts only.');}
finally{await browser.close();}
