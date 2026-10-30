// EDUCATION-02: mobile/desktop screenshot fixture, NO Supabase or real profiles.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit,devices} from "playwright";
import {renderNutritionScienceView} from "../pilot/nutrition-science.js";
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const android=process.env.EFG_QA_ANDROID==="1";
if(engine==="webkit"&&android)throw Error("Android emulation uses Chromium, not Safari engine");
const browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
const css=readFileSync(new URL("../pilot/nutrition-science.css",import.meta.url),"utf8");
const out="artifacts/premium-visual-qa";mkdirSync(out,{recursive:true});
const variants=android?[{label:"pixel-7",device:"Pixel 7"}]:
 engine==="webkit"?[{label:"safari-mobile",width:390}]:
 [{label:"mobile-320",width:320},{label:"mobile-390",width:390},{label:"tablet-768",width:768},{label:"desktop-1280",width:1280}];
const issues=[],results=[];
try{
 for(const v of variants){
  const w=v.device?devices[v.device].viewport.width:v.width;
  const context=await browser.newContext(v.device?{...devices[v.device]}:{viewport:{width:w,height:870},deviceScaleFactor:1});
  try{
   const page=await context.newPage();
   page.on("pageerror",e=>issues.push(v.label+": JS error "+e.message));
   await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:clamp(8px,3vw,23px);font:16px system-ui,sans-serif;background:#f1f5f7;}'+css+'</style></head><body><main>'+renderNutritionScienceView()+'</main></body></html>',{waitUntil:"load"});
   const info=await page.evaluate(()=>{
    const main=document.querySelector(".ns-science"),hero=document.querySelector(".ns-hero");
    const cards=[...document.querySelectorAll(".ns-macro")];
    const links=[...document.querySelectorAll(".ns-sources a")];
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,heroWidth:hero?.getBoundingClientRect().width,
     heroLeft:hero?.getBoundingClientRect().left,heroRight:hero?.getBoundingClientRect().right,
     macroCards:cards.length,resources:links.length,headings:main?.querySelectorAll("h2").length,
     faq:main?.querySelectorAll("details").length,hasHorizontalScroll:document.documentElement.scrollWidth>innerWidth+2,
     linksSafe:links.every(a=>a.target==="_blank"&&a.rel.includes("noopener")),
     scienceText:main?.textContent?.includes("Los hidratos no son el villano.")};
   });
   if(info.hasHorizontalScroll||info.heroLeft<0||info.heroRight>w+2)issues.push(v.label+": horizontal overflow "+JSON.stringify(info));
   if(info.macroCards!==3||info.resources!==6||info.faq!==4||info.headings<5||!info.linksSafe||!info.scienceText)issues.push(v.label+": missing science content "+JSON.stringify(info));
   const first=page.locator(".ns-faq details").first();
   await first.locator("summary").click();
   assert.ok(await first.getAttribute("open")!==null,v.label+": FAQ must expand with native control");
   await page.screenshot({path:join(out,"nutrition-science-"+engine+"-"+v.label+".png"),fullPage:true,animations:"disabled"});
   results.push({variant:v.label,...info,faqOpened:true});
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(out,"nutrition-science-"+engine+(android?"-android":"")+".json"),JSON.stringify({engine,android,fixtureOnly:true,physicalDevice:false,results,issues},null,2));
assert.deepEqual(issues,[],"EDUCATION-02 screenshot layout regressions");
console.log("PASS EDUCATION-02: "+engine+(android?" Android emulated":"")+" 3 macro cards, science sources, 4 FAQs, clickable accordion, no horizontal overflow across "+variants.length+" sizes. Synthetic fixture, NOT physical QA.");
