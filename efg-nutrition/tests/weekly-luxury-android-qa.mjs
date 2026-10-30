// Android Chrome emulation, using ONLY fictional student data and local assets.
// Pixel 7 and Galaxy S9+ touch-screen checks; physical phone/PWA/print still need UAT.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium,devices} from 'playwright';
import {buildLuxuryWeeklyReport,renderLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';
const profiles=['Pixel 7','Galaxy S9+'];
const browser=await chromium.launch({headless:true});
const out='artifacts/premium-visual-qa';mkdirSync(out,{recursive:true});
const read=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
const stylesheet=[
 read('../../styles.css'),read('../../fresh.css'),read('../pilot/pilot.css'),
 read('../pilot/pastel-system.css'),read('../pilot/weekly-luxury-report.css'),
 read('../pilot/luxury-theme.css')
].join('\n');
const logo=readFileSync(new URL('../pilot/assets/serotonina-acuarela.avif',import.meta.url)).toString('base64');
const sevenDays=['2026-10-23','2026-10-24','2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29'];
const model=buildLuxuryWeeklyReport({
 from:'2026-10-23',to:'2026-10-29',friday:'2026-10-30',
 studentName:'Sofía · alumna ficticia',coachName:'Coach EFG · DEMO',
 days:sevenDays.filter((_,i)=>![2,4].includes(i)).map(date=>({
  date,hasData:true,closed:true,mealCount:3,k:2080,p:144,c:220,f:68
 })),
 goals:[{start_on:'2026-10-20',kcal:2300,protein_g:150,carb_g:265,fat_g:71}],
 logs:[]
});
const report=renderLuxuryWeeklyReport(model,{demo:true})
 .replace('./assets/serotonina-acuarela.avif','data:image/avif;base64,'+logo);
const cases=[];
try{
 for(const name of profiles){
  const profile=devices[name];
  assert.ok(profile,'Playwright must provide Android '+name+' device');
  assert.match(profile.userAgent,/Android/,'Expected Android user agent');
  const ctx=await browser.newContext({...profile,locale:'es-AR',timezoneId:'America/Argentina/Buenos_Aires'});
  const page=await ctx.newPage();
  const code=[
   '<!doctype html><html lang="es"><head><meta charset="utf-8">',
   '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
   '<style>',stylesheet,'</style></head>',
   '<body><div class="pilot-layout"><main class="pilot-main">',
   '<section class="card"><h2>Mis resúmenes semanales · DEMO</h2>',
   '<details open class="pilot-record"><summary>Semana hasta 2026-10-30 · Luxury Pro</summary>',
   report,'<div class="lux-report-toolbar"><button type="button" class="btn small"',
   ' data-act="replyWeeklyReport">💬 Responder informe al coach</button>',
   '<button type="button" class="btn small light" data-act="printLuxuryReport">Exportar PDF</button></div>',
   '</details></section></main></div>',
   '<script>window.__efgTouchCount=0;document.addEventListener("click",e=>{',
   'if(e.target.closest("[data-act=replyWeeklyReport]"))window.__efgTouchCount++;',
   '});</script></body></html>'
  ].join('');
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.setContent(code,{waitUntil:'load'});
  const buttons=page.locator('[data-act="replyWeeklyReport"]');
  await buttons.scrollIntoViewIfNeeded();
  const dimensions=await page.evaluate(()=>{
   const btn=document.querySelector('[data-act="replyWeeklyReport"]');
   const b=btn.getBoundingClientRect(),root=document.documentElement,report=document.querySelector('.lux-report');
   const r=report.getBoundingClientRect(),img=report.querySelector('.lux-report-serotonin');
   return {
    viewport:innerWidth,documentWidth:root.scrollWidth,
    touch:'ontouchstart' in window,pointerCoarse:matchMedia('(pointer: coarse)').matches,
    reportLeft:r.left,reportRight:r.right,
    buttonWidth:b.width,buttonHeight:b.height,
    imageReady:!!img&&img.complete&&img.naturalWidth>0,
    demoVisible:report.textContent.includes('MODELO · DATOS FICTICIOS')
   };
  });
  assert.equal(dimensions.touch,true,name+' touch must be emulated');
  assert.equal(dimensions.pointerCoarse,true,name+' must have coarse pointer');
  assert.ok(dimensions.documentWidth<=dimensions.viewport+2,name+' horizontal scroll '+JSON.stringify(dimensions));
  assert.ok(dimensions.reportLeft>=-2&&dimensions.reportRight<=dimensions.viewport+2,name+' report outside screen '+JSON.stringify(dimensions));
  assert.ok(dimensions.buttonWidth>=44&&dimensions.buttonHeight>=44,name+' response touch target must be at least 44x44');
  assert.ok(dimensions.imageReady,name+' authentic serotonin image must load');
  assert.ok(dimensions.demoVisible,name+' fictitious-data disclosure must be visible');
  await buttons.tap();
  assert.equal(await page.evaluate(()=>window.__efgTouchCount),1,name+' touch tap must fire once');
  assert.deepEqual(pageErrors,[],name+' page JS errors');
  const filename=join(out,'report-luxury-android-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png');
  await page.screenshot({path:filename,fullPage:true});
  cases.push({device:name,userAgent:profile.userAgent,dimensions,tapFiredOnce:true,screenshot:filename});
  await ctx.close();
 }
}finally{await browser.close();}
writeFileSync(join(out,'report-luxury-android.json'),JSON.stringify({
 mode:'Android Chrome emulation; NOT physical device testing',synthetic:true,cases
},null,2));
console.log('PASS REPORT-LUX ANDROID: Pixel 7 / Galaxy S9+ emulated Chrome, touch taps, 44px CTA, responsive layout, authentic serotonin image, screenshots. Physical Android UAT outstanding.');
