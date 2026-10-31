// PRO-60 isolated visual QA for premium daily photographic tip. No real users.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit,devices} from "playwright";
import {nutritionTipCardHTML} from "../pilot/nutrition-daily-tip.js";
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
const css=readFileSync(new URL("../pilot/nutrition-daily-tip.css",import.meta.url),"utf8");
const out="artifacts/premium-visual-qa";mkdirSync(out,{recursive:true});
const variants=engine==="webkit"?[{name:"safari-390",width:390}]:
 [{name:"iphone-320",width:320},{name:"iphone-390",width:390},{name:"pixel7",device:"Pixel 7"},
  {name:"tablet-768",width:768},{name:"desktop-1280",width:1280}];
const failures=[],metrics=[];
try{
 for(const v of variants){
  const context=await browser.newContext(v.device?{...devices[v.device]}:{
    viewport:{width:v.width,height:850},deviceScaleFactor:1
  });
  try{
   const page=await context.newPage();
   page.on("pageerror",err=>failures.push(v.name+": "+err.message));
   // Explicit photograph placeholder only in CI. Source image URL and licensing
   // were independently confirmed; do not introduce external network dependency.
   // A verified 8×8 PNG fixture removes flaky third-party image loading from CI.
   // Real Unsplash photo URL/attribution is checked separately.
   const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGO8uiCNARtgwio6aCUAdugB68GFYBwAAAAASUVORK5CYII=","base64");
   await page.route("https://images.unsplash.com/**",route=>route.fulfill({
    status:200,contentType:"image/png",body:png
   }));
   for(const {label,date,unlocked} of [
    {label:"29-gnocchi",date:new Date("2026-10-29T15:00:00Z"),unlocked:false},
    {label:"ordinary",date:new Date("2026-10-30T15:00:00Z"),unlocked:true}
   ]){
    await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="http://fixture.test/"><style>body{margin:0;background:#e9e8e4;padding:clamp(10px,3vw,24px);font:16px system-ui,sans-serif}main{max-width:1200px;margin:auto}'+css+'</style></head><body><main>'+nutritionTipCardHTML({now:date,allowExplore:unlocked})+'</main></body></html>',{waitUntil:"load"});
    // Lazy images do not block page load. Decode before asserting. 
    await page.locator(".efg-daily-tip-photo").evaluate(img=>img.decode());
    const info=await page.evaluate(()=>{
     const panel=document.querySelector(".efg-daily-tip"),img=panel?.querySelector("img"),
      link=panel?.querySelector("a"),btn=panel?.querySelector("button");
     const rect=panel?.getBoundingClientRect(),styles=panel?getComputedStyle(panel):null;
     return {view:innerWidth,scroll:document.documentElement.scrollWidth,
      left:rect?.left,right:rect?.right,width:rect?.width,display:styles?.display,
      imageLoaded:img?.complete&&img.naturalWidth>0,
      alt:img?.alt,photoUrl:img?.getAttribute("src"),
      title:panel?.querySelector("h2")?.textContent,
      credit:link?.textContent,url:link?.href,
      action:!!btn,actionHeight:btn?.getBoundingClientRect().height||0
     };
    });
    if(info.scroll>info.view+2||info.left<0||info.right>info.view+2||!info.imageLoaded
      ||!info.alt||!info.credit||!info.url?.startsWith("https://unsplash.com/")||
      !info.title||info.action!==unlocked||(unlocked&&info.actionHeight<43))
     failures.push(v.name+" "+label+" "+JSON.stringify(info));
    if(label==="29-gnocchi"&&!/ñoquis/i.test(info.title))
     failures.push(v.name+" 29th missing gnocchi "+info.title);
    await page.screenshot({path:join(out,"pro60-tip-"+engine+"-"+v.name+"-"+label+".png"),fullPage:true,animations:"disabled"});
    metrics.push({device:v.name,label,engine,...info});
   }
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(out,"pro60-tip-"+engine+".json"),JSON.stringify({fixtureOnly:true,physicalDevice:false,engine,failures,metrics},null,2));
assert.deepEqual(failures,[],"PRO60 premium photo card mobile/desktop responsiveness");
console.log("PASS PRO60 visual "+engine+": responsive hero/photo credits, no overflow, gated recipe CTA, ñoquis on the 29th; synthetic images in QA.");
