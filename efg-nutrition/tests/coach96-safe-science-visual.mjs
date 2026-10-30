// COACH96 responsive fixture of the REAL static educational rendering.
// NO app login, remote Supabase, third-party network, or real student data.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';
import {renderScienceVerticalView} from '../pilot/science-welcome.js';

const engine=process.env.EFG_QA_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve('artifacts/premium-visual-qa');mkdirSync(out,{recursive:true});
const asset=readFileSync(new URL('../pilot/assets/serotonina-acuarela.avif',import.meta.url));
const logo='data:image/avif;base64,'+asset.toString('base64');
const styles=[
 '../styles.css','../fresh.css','../pilot/pilot.css',
 '../pilot/nutrition-science.css','../pilot/science-welcome.css',
 '../pilot/science-wellbeing.css'
].map(path=>readFileSync(new URL(path,import.meta.url),'utf8')).join('\n');
const content=renderScienceVerticalView().replaceAll(
 './assets/serotonina-acuarela.avif',logo
);
const devices=[
 {id:'iphone',width:390,height:844,mobile:true},
 {id:'android',width:412,height:915,mobile:true},
 {id:'desktop',width:1440,height:900,mobile:false}
];
const results=[];
try{
 for(const item of devices){
  const context=await browser.newContext({viewport:{width:item.width,height:item.height},
   deviceScaleFactor:1,isMobile:item.mobile,hasTouch:item.mobile});
  const page=await context.newPage();
  await page.route('**/*',route=>route.abort()); // No third-party network.
  await page.setContent('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1">'+
   '<style>'+styles+'</style></head><body><main class="pilot-main">'+
   '<div class="pilot-top"><div class="eyebrow">NUTRICIÓN CON-CIENCIA</div><h1 class="pilot-title">Nutrición Con-Ciencia</h1></div>'+
   content+'</main></body></html>',{waitUntil:'domcontentloaded'});
  await page.locator('[data-science-step="8"]').waitFor();
  assert.equal(await page.locator('[data-science-step]').count(),8);
  assert.equal(await page.locator('#ns-wellbeing-title').count(),1);
  const result=await page.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   innerWidth:window.innerWidth,
   contentHeight:document.documentElement.scrollHeight,
   visible:!!document.querySelector('.ns-library-panel'),
   wellnessText:document.querySelector('#ns-wellbeing-title')?.textContent||''
  }));
  assert.equal(result.visible,true);
  assert.match(result.wellnessText,/bienestar/i);
  assert.ok(result.scrollWidth<=result.innerWidth+3,
   engine+' '+item.id+' page overflows horizontally: '+JSON.stringify(result));
  const file='coach96-nutricion-con-ciencia-'+engine+'-'+item.id+'.png';
  await page.screenshot({path:resolve(out,file),fullPage:true,animations:'disabled'});
  results.push({...item,engine,...result,screenshot:file});
  await context.close();
 }
 writeFileSync(resolve(out,'coach96-'+engine+'-science-layout.json'),JSON.stringify(results,null,2));
 console.log('PASS COACH96 static science library visual: '+engine+' iPhone/Android/desktop, eight panels, final serotonin, no horizontal overflow.');
}finally{await browser.close();}
