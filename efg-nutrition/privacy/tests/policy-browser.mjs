import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.NCC_PREVIEW_URL||'http://127.0.0.1:8765';
const output=new URL('../evidence/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.NCC_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto(base+'/efg-nutrition/privacy/preview/privacidad.html');
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth),false);
  assert.match(await page.locator('body').textContent(),/Eduardo Flores Grancelli/);
  assert.match(await page.locator('body').textContent(),/todavía no vigente/);
  await page.screenshot({path:output+'policy-'+width+'.png',fullPage:true});
  await page.goto(base+'/efg-nutrition/pilot/eliminar-cuenta.html');
  const contact=page.locator('#support-contact a');
  assert.equal(await contact.isVisible(),true);
  const url=new URL(await contact.getAttribute('href'));
  assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'floresgrancelli@gmail.com');
  assert.equal(url.searchParams.get('subject'),'Solicitud de eliminación - Nutrición Con-Ciencia');
  assert.equal(await page.locator('#email-form').isVisible(),false);
  assert.equal(await page.locator('#support-contact').evaluate(e=>e.getBoundingClientRect().top<900),true);
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth),false);
  await page.screenshot({path:output+'deletion-no-login-'+width+'.png',fullPage:true});
  await context.close();
 }
 console.log('Policy and deletion contact QA passed: mobile/desktop, no session, JavaScript disabled, no horizontal overflow. No emails sent.');
}finally{await browser.close();}
