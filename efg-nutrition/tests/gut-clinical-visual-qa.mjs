// CLIN-GUT-02: isolated luxury clinical intake visual preview; no network/data/persistence.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {renderGutClinicalDraft,COACH_HEALTH_CONDITIONS} from '../pilot/gut-clinical-workbench.js';
const css=[
 readFileSync(new URL('../styles.css',import.meta.url),'utf8'),
 readFileSync(new URL('../pilot/pilot.css',import.meta.url),'utf8'),
 readFileSync(new URL('../pilot/coach-experience.css',import.meta.url),'utf8')
].join('\n');
const markup='<section class="pilot-layout"><main class="pilot-main"><div class="card efg-coach-relaunch">'+
 '<span class="eyebrow">NUTRICIÓN CON-CIENCIA · NUEVA ETAPA</span>'+
 '<h2>Conozcámonos de nuevo</h2>'+
 renderGutClinicalDraft()+
 '</div></main></section>';
const out='artifacts/premium-visual-qa';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const sizes=[{name:'android-360',width:360,height:780},{name:'desktop-1280',width:1280,height:900}];
const results=[];
try{
 for(const v of sizes){
  const page=await browser.newPage({viewport:{width:v.width,height:v.height},hasTouch:true,isMobile:true});
  await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+markup+'</body></html>');
  const state=await page.evaluate(()=>{
   const inputs=[...document.querySelectorAll('.efg-gut-intake input,.efg-gut-intake select')];
   const box=document.querySelector('.efg-gut-intake').getBoundingClientRect();
   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    sectionLeft:box.left,sectionRight:box.right,
    controls:inputs.length,disabled:inputs.every(x=>x.disabled),badChecked:inputs.some(x=>x.checked),
    conditions:[...document.querySelectorAll('[name=gutClinicalCondition]')].map(x=>x.value),
    statusLabels:[...document.querySelectorAll('.efg-gut-clinical-status label')].length};
  });
  assert.deepEqual(state.conditions,COACH_HEALTH_CONDITIONS.map(c=>c.id));
  assert.equal(state.disabled,true,'Clinical UI cannot collect sensitive data yet');
  assert.equal(state.badChecked,false,'New intake must be blank');
  assert.equal(state.statusLabels,COACH_HEALTH_CONDITIONS.length+1,'All optional statuses and FODMAP phase should be shown');
  assert.ok(state.scrollWidth<=v.width+2,'Horizontal overflow '+JSON.stringify(state));
  assert.ok(state.sectionLeft>=0&&state.sectionRight<=v.width+2,'Section outside screen '+JSON.stringify(state));
  const screenshot=join(out,'clin-gut-preview-'+v.name+'.png');
  await page.screenshot({path:screenshot,fullPage:true});
  results.push({...v,...state,screenshot});
  await page.close();
 }
}finally{await browser.close();}
writeFileSync(join(out,'clin-gut-preview-report.json'),JSON.stringify({synthetic:true,collectsPersonalData:false,results},null,2));
console.log('PASS CLIN-GUT VISUAL: responsive 360px and 1280px, both flags + statuses, disabled medical form, zero prechecked consent, screenshots in CI; backend OFF.');
