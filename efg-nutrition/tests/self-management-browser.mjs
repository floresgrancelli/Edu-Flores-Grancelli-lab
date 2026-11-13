import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'docs/play-store/self-management-evidence');mkdirSync(output,{recursive:true});
const file=process.argv[2]||path.join(root,'docs/play-store/Autogestion_Prueba_Interactiva.html');
const browser=await chromium.launch({headless:true,...(process.env.NCC_CHROMIUM?{executablePath:process.env.NCC_CHROMIUM}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[],network=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
 page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 await page.goto('file://'+file);
 await page.locator('#disliked option').first().waitFor({state:'attached'});
 await page.screenshot({path:path.join(output,'Ficha_Android.png'),fullPage:true});
 await page.locator('#demo').click();
 assert.equal(await page.locator('[name=objective]').inputValue(),'');
 assert.deepEqual(await page.locator('[name=objective] option').evaluateAll(options=>options.map(o=>o.value)),
  ['', 'fat_loss', 'recomp', 'muscle_gain', 'maintenance']);
 await page.locator('[name=objective]').selectOption('fat_loss');
 assert.equal(await page.locator('[name=consent]').isChecked(),false);
 assert.equal(await page.locator('[name=scope]').isChecked(),false);
 await page.locator('[name=scope]').check();await page.locator('[name=consent]').check();
 const invalidFields=await page.locator('#intake').evaluate(form=>[...form.elements]
  .filter(el=>el.willValidate&&!el.validity.valid).map(el=>({name:el.name,value:el.value,reason:el.validationMessage})));
 assert.deepEqual(invalidFields,[]);
 await page.locator('#generate').click();
 await page.waitForFunction(()=>document.querySelector('#result').hidden===false || document.querySelector('#status').classList.contains('alert'),{},{timeout:20000});
 assert.equal(await page.locator('#result').isVisible(),true,await page.locator('#status').textContent());
 assert.equal(await page.locator('[role=tab]').count(),6);
 assert.equal(await page.locator('[role=tabpanel]:visible').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('[role=tab]').last().click();
 assert.equal(await page.locator('#meal-cena').isVisible(),true);
 await page.locator('#result').scrollIntoViewIfNeeded();
 await page.locator('#result').screenshot({path:path.join(output,'Guia_Android.png')});
 await page.locator('#edit').click();assert.equal(await page.locator('#result').isVisible(),false);
 assert.equal(await page.locator('[name=weight_kg]').inputValue(),'80');
 await page.locator('#clear').click();assert.equal(await page.locator('[name=weight_kg]').inputValue(),'');
 for(const width of [360,768,1280]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 const result={passed:true,tabs:6,widths:[360,390,768,1280],externalRequests:network.length,pageErrors:errors.length,
  note:'Chromium portrait emulation, not a native Android or Safari device run'};
 writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
