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
   // The browser fixture must never contact Unsplash. Keep the authored URL
   // and verify visual geometry with a known-good local PNG data URI.
   await page.route("https://images.unsplash.com/**",route=>route.abort());
   const fixturePng="iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAG0lEQVR4nGOclhfAy8CCiVgY+FgYGLCgwSkBANu2AyvaoCItAAAAAElFTkSuQmCC";
   for(const {label,date,unlocked} of [
    {label:"29-gnocchi",date:new Date("2026-10-29T15:00:00Z"),unlocked:false},
    {label:"ordinary",date:new Date("2026-10-30T15:00:00Z"),unlocked:true}
   ]){
    await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="http://fixture.test/"><style>body{margin:0;background:#e9e8e4;padding:clamp(10px,3vw,24px);font:16px system-ui,sans-serif}main{max-width:1200px;margin:auto}'+css+'</style></head><body><main>'+nutritionTipCardHTML({now:date,allowExplore:unlocked})+'</main></body></html>',{waitUntil:"load"});
    // 08-05: actively test offline photo failure before synthetic recovery.
    // Keep the authored URL, never contact Unsplash or mutate a real account.
    const photo=page.locator(".efg-daily-tip-photo");
    await photo.evaluate(img=>{img.loading="eager";});
    await page.waitForFunction(()=>{const img=document.querySelector(".efg-daily-tip-photo");
      return img?.complete&&img.naturalWidth===0;},{timeout:10000});
    const measure=()=>page.evaluate(()=>{
     const card=document.querySelector(".efg-daily-tip"),rect=card.getBoundingClientRect(),
      photo=card.querySelector("img"),credit=card.querySelector(".efg-daily-tip-credit");
     const placeholder=card.querySelector(".efg-daily-tip-photo-placeholder");
     return {height:rect.height,left:rect.left,right:rect.right,
      title:card.querySelector("h2").textContent,body:card.querySelector(".efg-daily-tip-description").textContent,
      credit:credit.textContent,alt:photo.alt,placeholderHeight:placeholder.getBoundingClientRect().height,
      scroll:document.documentElement.scrollWidth,view:innerWidth};
    });
    const offline=await measure();
    if(!offline.title||!offline.body||!offline.credit||!offline.alt||offline.placeholderHeight<100||
      offline.scroll>offline.view+2)
     failures.push(v.name+" "+label+" offline media/credit/geometry "+JSON.stringify(offline));
    await page.screenshot({path:join(out,"pro60-tip-"+engine+"-"+v.name+"-"+label+"-offline.png"),
      fullPage:true,animations:"disabled"});
    const fallback=await page.locator(".efg-daily-tip-photo-placeholder").count();
    if(fallback!==1)failures.push(v.name+" "+label+" missing photo fallback");
    const recipe=page.locator(".efg-gnocchi-recipe");
    const recipeCount=await recipe.count();
    if(label==="29-gnocchi"){
     if(recipeCount!==1)failures.push(v.name+" missing real 29th recipe");
     else {
      await page.keyboard.press("Tab");
      if(!await page.evaluate(()=>document.activeElement?.tagName==="SUMMARY"))
       failures.push(v.name+" 29th recipe not reachable as first keyboard stop");
      await page.keyboard.press("Enter");
      if(!await recipe.evaluate(el=>el.open))failures.push(v.name+" 29th recipe did not open by Enter");
      const sauces=await recipe.innerText();
      if(!sauces.includes("Salsa de tomate y albahaca")||!sauces.includes("Salsa de zapallo"))
       failures.push(v.name+" 29th recipe lacks both sauces");
      await page.keyboard.press("Space");
      if(await recipe.evaluate(el=>el.open))failures.push(v.name+" 29th recipe did not close by Space");
      await page.keyboard.press("Tab");
      if(!await page.evaluate(()=>document.activeElement?.closest(".efg-daily-tip-credit")))
       failures.push(v.name+" keyboard cannot reach photo credit after recipe");
      await page.keyboard.press("Shift+Tab");
      if(!await page.evaluate(()=>document.activeElement?.tagName==="SUMMARY"))
       failures.push(v.name+" keyboard cannot return from credit to recipe");
     }
    }else if(recipeCount!==0)failures.push(v.name+" ordinary day incorrectly shows 29th recipe");
    // An existing photo should recover without moving the tip, text or focus.
    await photo.evaluate(async(img,png)=>{
     img.dataset.originalSrc=img.getAttribute("src");
     img.src="data:image/png;base64,"+png;
     await img.decode();
    },fixturePng);
    const recovered=await measure();
    if(Math.abs(offline.height-recovered.height)>2||
      Math.abs(offline.left-recovered.left)>2||Math.abs(offline.right-recovered.right)>2||
      offline.title!==recovered.title||offline.body!==recovered.body||
      offline.credit!==recovered.credit||offline.alt!==recovered.alt||
      recovered.scroll>recovered.view+2)
     failures.push(v.name+" "+label+" photo recovery changed layout/text "+
      JSON.stringify({offline,recovered}));
    if(label==="29-gnocchi"&&recipeCount===1&&
      !await page.evaluate(()=>document.activeElement?.tagName==="SUMMARY"))
     failures.push(v.name+" photo recovery stole keyboard focus");
    const info=await page.evaluate(()=>{
     const panel=document.querySelector(".efg-daily-tip"),img=panel?.querySelector("img"),
      link=panel?.querySelector("a"),btn=panel?.querySelector("button");
     const rect=panel?.getBoundingClientRect(),styles=panel?getComputedStyle(panel):null;
     return {view:innerWidth,scroll:document.documentElement.scrollWidth,
      left:rect?.left,right:rect?.right,width:rect?.width,display:styles?.display,
      imageLoaded:img?.complete&&img.naturalWidth>0,
      alt:img?.alt,photoUrl:img?.dataset.originalSrc,
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
