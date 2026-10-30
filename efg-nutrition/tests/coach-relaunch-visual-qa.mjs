// COACH-RELAUNCH visual QA: synthetic page, NO credentials/auth/backend.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit} from "playwright";
import {COACH_RELAUNCH_ONBOARDING_ENABLED} from "../pilot/coach-relaunch-onboarding.js";
import {renderCoachRelaunchEntry} from "../pilot/coach-relaunch-entry-client.js";
assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false);
const css=["efg-nutrition/pilot/pilot.css","efg-nutrition/pilot/coach-experience.css",
 "efg-nutrition/pilot/luxury-theme.css"].map(p=>readFileSync(p,"utf8")).join("\n");
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
const output=join(process.cwd(),"artifacts/premium-visual-qa");mkdirSync(output,{recursive:true});
const issues=[],results=[];
try{
 for(const width of (engine==="webkit"?[390]:[320,390,430,768])){
  for(const route of ["intake","legal","retry"]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,
    hasTouch:width<600,deviceScaleFactor:1});
   try{
    const page=await context.newPage();
    page.on("pageerror",e=>issues.push(engine+"/"+width+"/"+route+" JS: "+e.message));
    const body=renderCoachRelaunchEntry({route,reason:"Reintentar"});
    const html='<!doctype html><html lang="es"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width, initial-scale=1"><style>'+
      '*,*:before,*:after{box-sizing:border-box}body{margin:0;padding:12px;font:16px system-ui,sans-serif}'+
      css+'</style></head><body><main>'+body+'</main></body></html>';
    await page.setContent(html,{waitUntil:"load"});
    const data=await page.evaluate(()=>{
     const panel=document.querySelector(".efg-coach-relaunch"),title=panel?.querySelector("h2");
     const buttons=[...panel.querySelectorAll("button")].map(b=>({
       title:b.textContent?.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height
     }));
     const share=document.getElementById("coachRelaunch_share");
     return {scroll:document.documentElement.scrollWidth,viewport:window.innerWidth,
      panelWidth:panel?.getBoundingClientRect().width,visible:!!title&&title.getBoundingClientRect().height>0,
      buttons,hasForm:!!document.getElementById("efgCoachRelaunchForm"),
      formInputs:panel.querySelectorAll("input,textarea,select").length,
      hasCheckedShare:share?.checked===true};
    });
    if(data.scroll>width+1||data.panelWidth>width||!data.visible)
      issues.push(engine+"/"+width+"/"+route+" overflow/heading "+JSON.stringify(data));
    if(data.buttons.some(b=>b.height<40||b.width<80))
      issues.push(engine+"/"+width+"/"+route+" touch targets too small "+JSON.stringify(data.buttons));
    if(route==="intake"&&(!data.hasForm||data.formInputs<9||data.hasCheckedShare))
      issues.push(engine+"/"+width+"/"+route+" missing fresh form or implicit share");
    if(route!=="intake"&&data.hasForm)
      issues.push(engine+"/"+width+"/"+route+" form must not appear before legal verification");
    results.push({engine,width,route,...data,fixtureOnly:true});
    await page.screenshot({path:join(output,"coach-reentry-"+engine+"-"+width+"-"+route+".png"),
     fullPage:true,animations:"disabled"});
   }finally{await context.close()}
  }
 }
}finally{await browser.close()}
writeFileSync(join(output,"coach-reentry-visual-"+engine+".json"),
 JSON.stringify({fixtureOnly:true,results,issues},null,2));
assert.deepEqual(issues,[],"Coach relaunch new-entry responsive QA in mock scene");
console.log("PASS COACH-RELAUNCH: "+engine+" "+results.length+
 " synthetic responsive entry/legal/retry scenes, no network.");
