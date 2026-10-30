// REPORT-LUX visual fixture: no production connection or real student data.
// Run with EFG_QA_ENGINE=webkit for Safari-engine coverage.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium,webkit,devices} from 'playwright';
import {buildLuxuryWeeklyReport,renderLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';

const androidMode=process.env.EFG_QA_ANDROID==='1';
const engine=process.env.EFG_QA_ENGINE==='webkit'?'webkit':'chromium';
if(androidMode&&engine!=='chromium')throw Error('Android browser emulation requires Chromium');
const engineTag=androidMode?'android-chromium':engine;
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const dir='artifacts/premium-visual-qa';mkdirSync(dir,{recursive:true});
const labels=[
 ['2026-10-23',1940,140,192,68],
 ['2026-10-24',2110,146,224,70],
 ['2026-10-26',2059,149,215,67],
 ['2026-10-28',2163,142,230,75],
 ['2026-10-29',2178,148,239,70]
];
const data=buildLuxuryWeeklyReport({
 from:'2026-10-23',to:'2026-10-29',friday:'2026-10-30',
 studentName:'Sofía · alumna ficticia',coachName:'Coach EFG · DEMO',
 days:labels.map(([date,k,p,c,f])=>({date,k,p,c,f,closed:true,hasData:true,mealCount:3})),
 goals:[{start_on:'2026-10-22',kcal:2300,protein_g:150,carb_g:265,fat_g:71}],
 logs:labels.map(([log_day])=>({log_day,meals:{desayuno:[{id:'egg',name:'Huevo'}],almuerzo:[{id:'rice',name:'Arroz integral'},{id:'chicken',name:'Pollo'}]}}))
});
const css=readFileSync(new URL('../pilot/weekly-luxury-report.css',import.meta.url),'utf8');
const asset=readFileSync(new URL('../pilot/assets/serotonina-acuarela.avif',import.meta.url)).toString('base64');
const report=renderLuxuryWeeklyReport(data,{demo:true}).replace('./assets/serotonina-acuarela.avif','data:image/avif;base64,'+asset);
const variants=androidMode?['Pixel 7','Galaxy S9+'].map(device=>({name:device.toLowerCase().replace(/[^a-z0-9]+/g,'-'),device,width:devices[device].viewport.width,height:devices[device].viewport.height})):[{name:'mobile',width:375,height:812},{name:'desktop',width:1280,height:900}];
const results=[];
try{
 for(const v of variants){
  const page=await browser.newPage(androidMode?{...devices[v.device]}:{viewport:{width:v.width,height:v.height},deviceScaleFactor:1});
  await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#e8e3db;padding:12px 6px;}'+css+'</style></head><body><div role="main">'+report+'</div><div class="lux-report-toolbar" style="justify-content:center"><button type="button" data-act="replyWeeklyReport">💬 Responder informe al coach</button></div></body></html>',{waitUntil:'load'});
  const ready=await page.evaluate(async()=>{await document.fonts.ready;const article=document.querySelector('.lux-report'),button=document.querySelector('[data-act="replyWeeklyReport"]');const rect=article?.getBoundingClientRect(),btn=button?.getBoundingClientRect();return {
   viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   reportWidth:rect?.width,reportLeft:rect?.left,reportRight:rect?.right,
   buttonVisible:!!(btn&&btn.width>0&&btn.height>0),hasDemo:!!article?.textContent?.includes('MODELO · DATOS FICTICIOS'),
   imagePresent:!!document.querySelector('.lux-report-serotonin'),
   imageLoaded:!!document.querySelector('.lux-report-serotonin')?.naturalWidth,
   androidUa:navigator.userAgent.includes('Android'),touch:navigator.maxTouchPoints,dpr:devicePixelRatio
  }});
  assert.ok(ready.buttonVisible,'Missing reply action at '+v.name);
  assert.ok(ready.hasDemo,'Demo disclosure missing at '+v.name);
  assert.ok(ready.imagePresent,'Serotonin logo missing at '+v.name);
  if(androidMode){
   assert.ok(ready.androidUa&&ready.touch>=1&&ready.dpr>=2,'Android device not emulated correctly: '+JSON.stringify(ready));
   assert.ok(ready.imageLoaded,'Authentic serotonin AVIF did not load on Android Chromium: '+v.name);
   await page.evaluate(()=>{window.__replyTapCount=0;document.querySelector('[data-act="replyWeeklyReport"]').addEventListener('click',()=>window.__replyTapCount++);});
   await page.locator('[data-act="replyWeeklyReport"]').tap();
   assert.equal(await page.evaluate(()=>window.__replyTapCount),1,'Android touch did not activate report CTA: '+v.name);
  }
  assert.ok(ready.scrollWidth<=v.width+2,'Horizontal document overflow at '+v.name+': '+JSON.stringify(ready));
  assert.ok(ready.reportLeft>=-2&&ready.reportRight<=v.width+2,'Report card crosses viewport at '+v.name);
  const output=join(dir,'report-luxury-'+engineTag+'-'+v.name+'.png');
  await page.screenshot({path:output,fullPage:true});
  results.push({variant:v.name,...ready,screenshot:output});
  await page.close();
 }
}finally{await browser.close();}
writeFileSync(join(dir,'report-luxury-'+engineTag+'.json'),JSON.stringify({engine,androidMode,synthetic:true,physicalDevice:false,results},null,2));
console.log('PASS REPORT-LUX VISUAL '+engineTag+': responsive '+variants.map(x=>x.device||x.name).join(', ')+', CTA visible and touch-activated, serotonin brand, no horizontal overflow; screenshots preserved. Android emulation does NOT prove physical Android UAT.');
