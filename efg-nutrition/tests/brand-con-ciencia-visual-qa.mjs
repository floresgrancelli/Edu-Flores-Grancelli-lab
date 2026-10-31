// BRAND-78 synthetic layout QA only: public wording changed, no route/DB/state renamed.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit} from "playwright";
const engine=process.env.EFG_QA_ENGINE==="webkit"?webkit:chromium;
const label=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await engine.launch({headless:true});
const sheet=readFileSync(new URL("../pilot/pilot.css",import.meta.url),"utf8");
const luxury=readFileSync(new URL("../pilot/luxury-theme.css",import.meta.url),"utf8");
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
assert.match(app,/<strong>Nutrición Con-Ciencia<\/strong><small>PRO · PRIVADO<\/small>/);
assert.match(luxury,/BRAND-78 · A longer PUBLIC name/);
const out="artifacts/premium-visual-qa";mkdirSync(out,{recursive:true});
const metrics=[];
try{
 for(const width of [320,375,390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  try{
   const page=await context.newPage();
   await page.setContent(`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box}body{margin:0;background:#eef0ef} ${sheet}\n${luxury}</style></head>
<body><main class="efg-onboard"><section class="efg-onboard-sheet"><header class="efg-onboard-brand">
<span class="efg-onboard-leaf" aria-hidden="true">✦</span><strong>Nutrición Con-Ciencia</strong>
<small>PRO · PRIVADO</small></header><div class="efg-onboard-copy"><h1>Hoy comienza una nueva forma de cuidarte.</h1></div>
</section></main></body></html>`,{waitUntil:"load"});
   const measure=await page.evaluate(()=>{
     const name=document.querySelector(".efg-onboard-brand strong"),head=document.querySelector(".efg-onboard-brand");
     const a=name.getBoundingClientRect(),b=head.getBoundingClientRect();
     return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
       nameLeft:a.left,nameRight:a.right,headerLeft:b.left,headerRight:b.right,
       visible:!!a.width&&!!a.height,overflow:getComputedStyle(name).overflowWrap,
       text:name.textContent,small:head.querySelector("small")?.textContent};
   });
   assert.equal(measure.text,"Nutrición Con-Ciencia");
   assert.equal(measure.small,"PRO · PRIVADO");
   assert.ok(measure.visible&&measure.scroll<=measure.viewport+2&&
     measure.nameLeft>=-1&&measure.nameRight<=measure.viewport+2,
     "No clipped/overflowed public brand "+JSON.stringify(measure));
   await page.screenshot({path:join(out,"brand78-"+label+"-"+width+".png"),fullPage:true,animations:"disabled"});
   metrics.push(measure);
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(out,"brand78-"+label+".json"),JSON.stringify({synthetic:true,notPhysicalDevice:true,metrics},null,2));
console.log("PASS BRAND-78 visual "+label+": responsive long name on 320/375/390/768/1280 with existing CSS, no overflow.");
