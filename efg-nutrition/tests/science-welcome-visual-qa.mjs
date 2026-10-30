// BRAND-77B isolated screenshot QA; no real users, JWT or hosted connections.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit,devices} from "playwright";
import {renderScienceWelcomeStep,renderScienceVerticalView} from "../pilot/science-welcome.js";
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
const css=readFileSync(new URL("../pilot/nutrition-science.css",import.meta.url),"utf8")+
 readFileSync(new URL("../pilot/science-welcome.css",import.meta.url),"utf8");
const dir="artifacts/premium-visual-qa";mkdirSync(dir,{recursive:true});
const targets=engine==="webkit"?[{name:"safari-390",width:390}]:
 [{name:"android-pixel-7",device:"Pixel 7"},{name:"mobile-320",width:320},{name:"tablet-768",width:768},{name:"desktop-1280",width:1280}];
const failures=[],metrics=[];
try{
 for(const target of targets){
  const settings=target.device?{...devices[target.device]}:{viewport:{width:target.width,height:900},deviceScaleFactor:1};
  const context=await browser.newContext(settings);
  try{
   const page=await context.newPage();
   page.on("pageerror",e=>failures.push(target.name+": "+e.message));
   const width=page.viewportSize().width;
   for(const step of [0,3,7]){
    const body=renderScienceWelcomeStep(step);
    await page.setContent('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><style>body{margin:0;font:16px system-ui,sans-serif}'+css+'</style></head><body>'+body+'</body></html>',{waitUntil:"domcontentloaded"});
    const info=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
     panel:document.querySelectorAll(".ns-welcome-slide").length,
     progress:document.querySelectorAll(".ns-welcome-progress i").length,
     current:document.querySelectorAll(".ns-welcome-progress i.is-current").length,
     buttons:[...document.querySelectorAll(".ns-welcome-actions button")].map(x=>x.dataset.act),
     start:!!document.querySelector('[data-act="scienceFinish"]')
    }));
    if(info.scrollWidth>width+2||info.panel!==1||info.progress!==8||info.current!==1||info.start!==(step===7))
     failures.push(target.name+" step "+step+" "+JSON.stringify(info));
    if(step===0&&info.buttons.includes("sciencePrev"))failures.push("previous on first slide");
    if(step===7&&!info.buttons.includes("scienceFinish"))failures.push("no start on final slide");
    await page.screenshot({path:join(dir,"brand77b-"+engine+"-"+target.name+"-"+(step+1)+".png"),fullPage:true,animations:"disabled"});
    metrics.push({engine,device:target.name,step:step+1,...info});
   }
   await page.setContent('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;font:16px system-ui,sans-serif}'+css+'</style></head><body>'+renderScienceVerticalView()+'</body></html>',{waitUntil:"domcontentloaded"});
   const vertical=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,sections:document.querySelectorAll(".ns-library-panel").length}));
   if(vertical.width>width+2||vertical.sections!==8)failures.push(target.name+" vertical "+JSON.stringify(vertical));
   await page.screenshot({path:join(dir,"brand77b-"+engine+"-"+target.name+"-vertical.png"),fullPage:true,animations:"disabled"});
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(dir,"brand77b-"+engine+".json"),JSON.stringify({engine,synthetic:true,physical:false,metrics,failures},null,2));
assert.deepEqual(failures,[],"BRAND77B overflow/steps regression");
console.log("PASS BRAND77B VISUAL: 8-step welcome + vertical library across "+targets.map(x=>x.name).join(",")+"; synthetic fixtures only.");
