// PROPOSAL ONLY — not applied to repository, NOT EXECUTED.
// Target SHA 578b3887a39282a41d85a3309ee48cd8e2e3ed45.
// Run privately outside the repo with EFG_QA_PROJECT_ROOT pointing to its efg-nutrition directory.
// Existing workflow dependencies: Node 22, playwright@1.56.1, Chromium/WebKit.
// Read-only app modules; all HTTP is intercepted, no server/session/backend.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const project=resolve(process.env.EFG_QA_PROJECT_ROOT||"efg-nutrition");
const targetSHA="578b3887a39282a41d85a3309ee48cd8e2e3ed45";
const actualSHA=execFileSync("git",["-C",project,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
assert.equal(actualSHA,targetSHA,"Wrong candidate; review changes before updating package");
const expected=JSON.parse(readFileSync(new URL("./source-lock.json",import.meta.url),"utf8"));
for(const [path,blob] of Object.entries(expected.blobs)){
 const bytes=readFileSync(join(project,path));
 const actual=createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");
 assert.equal(actual,blob,"Source/asset differs from pinned SHA: "+path);
}
const requireProject=createRequire(join(project,"package.json"));
const {chromium,webkit}=requireProject("playwright");

const {nutritionTipCardHTML}=await import(pathToFileURL(join(project,"pilot/nutrition-daily-tip.js")).href);
const {renderScienceVerticalView,renderScienceWelcomeStep}=await import(pathToFileURL(join(project,"pilot/science-welcome.js")).href);
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const widths=engine==="webkit"?[390]:[320,1280];
const out=resolve(process.env.EFG_QA_OUT||"artifacts/premium-visual-qa/education-delta");
mkdirSync(out,{recursive:true});
const tipCSS=readFileSync(join(project,"pilot/nutrition-daily-tip.css"),"utf8");
const scienceCSS=["nutrition-science.css","science-welcome.css","science-wellbeing.css"].map(f=>readFileSync(join(project,"pilot",f),"utf8")).join("\n");
const logo=readFileSync(join(project,"pilot/assets/serotonina-acuarela.avif"));
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAG0lEQVR4nGOclhfAy8CCiVgY+FgYGLCgwSkBANu2AyvaoCItAAAAAElFTkSuQmCC","base64");
const browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
const results=[];
const documentHTML=(html,css)=>'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="http://fixture.test/"><style>body{margin:0;padding:10px;font:16px system-ui}'+css+'</style></head><body>'+html+'</body></html>';
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  let releasePhoto;
  const result={engine,width,physical:false,externalRequests:[],checks:[],manualPixelReview:"PENDING"};
  results.push(result);
  try{
   const page=await context.newPage();
   page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);
   const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
   let imageMode="abort",photoDelayedStarted;
   let delayedStarted=new Promise(r=>{photoDelayedStarted=r});
   let gate=new Promise(r=>{releasePhoto=r});
   await page.route("**/*",async route=>{
    const url=route.request().url();
    if(url.startsWith("https://images.unsplash.com/")){
     if(imageMode==="abort")return route.abort("failed");
     if(imageMode==="delay"){photoDelayedStarted();await gate;}
     return route.fulfill({status:200,contentType:"image/png",headers:{"cache-control":"no-store"},body:png});
    }
    if(url==="http://fixture.test/assets/serotonina-acuarela.avif")
     return route.fulfill({status:200,contentType:"image/avif",body:logo});
    result.externalRequests.push(url);return route.abort("blockedbyclient");
   });
   const shot=label=>page.screenshot({path:join(out,engine+"-"+width+"-"+label+".png"),fullPage:true,animations:"disabled"});
   const stableText=()=>page.evaluate(()=>({
    title:document.querySelector("#efgTipTitle")?.textContent,
    copy:document.querySelector(".efg-daily-tip-description")?.textContent,
    credit:document.querySelector(".efg-daily-tip-credit")?.textContent,
    creditHref:document.querySelector(".efg-daily-tip-credit a")?.getAttribute("href"),
    alt:document.querySelector(".efg-daily-tip-photo")?.getAttribute("alt")
   }));
   const checkGeometry=async()=>{
    const m=await page.evaluate(()=>{const r=document.querySelector(".efg-daily-tip").getBoundingClientRect();return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,left:r.left,right:r.right}});
    assert.ok(m.scroll<=m.viewport+2&&m.left>=0&&m.right<=m.viewport+2,JSON.stringify(m));return m;
   };
   const geometry=()=>page.evaluate(()=>Object.fromEntries([".efg-daily-tip",".efg-daily-tip-media",".efg-daily-tip-copy",".efg-daily-tip-credit"].map(selector=>{
    const r=document.querySelector(selector).getBoundingClientRect();return [selector,{x:r.x,y:r.y,width:r.width,height:r.height}];
   })));
   const equalGeometry=(before,after)=>{
    for(const selector of Object.keys(before))for(const key of ["x","y","width","height"])
     assert.ok(Math.abs(before[selector][key]-after[selector][key])<=2,selector+" "+key+" shifted");
   };
   const recipeFocus=()=>page.locator(".efg-gnocchi-recipe summary").evaluate(e=>e===document.activeElement);
   const card=nutritionTipCardHTML({now:new Date("2026-10-29T15:00:00Z"),allowExplore:false});
   await page.setContent(documentHTML(card,tipCSS),{waitUntil:"domcontentloaded"});
   const image=page.locator(".efg-daily-tip-photo");
   await image.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const i=document.querySelector(".efg-daily-tip-photo");return i.complete&&i.naturalWidth===0});
   const original=await stableText();assert.ok(original.alt&&original.copy&&original.creditHref);
   const placeholder=page.locator(".efg-daily-tip-photo-placeholder");
   assert.equal(await placeholder.isVisible(),true);
   assert.equal(await placeholder.getAttribute("aria-hidden"),"true");
   result.failedImage=await checkGeometry();
   writeFileSync(join(out,engine+"-"+width+"-failed-image-a11y.yml"),await page.locator(".efg-daily-tip").ariaSnapshot());
   await shot("01-aborted-photo"); // Human checks placeholder is not obscured by broken-image painting.
   result.checks.push("request actually aborted; image complete with naturalWidth=0; text/credit retained");

   // First keyboard stop is the native recipe summary, not a fabricated focus call.
   await page.keyboard.press("Tab");
   assert.equal(await page.locator(".efg-gnocchi-recipe summary").evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press("Enter");
   assert.equal(await page.locator(".efg-gnocchi-recipe").evaluate(e=>e.open),true);
   assert.equal(await page.getByText("Salsa de tomate y albahaca:",{exact:true}).isVisible(),true);
   assert.equal(await page.getByText("Salsa de zapallo:",{exact:true}).isVisible(),true);
   assert.equal(await page.locator(".efg-gnocchi-recipe summary").evaluate(e=>e===document.activeElement),true);
   result.expandedGeometry=await checkGeometry();await shot("02-enter-open-focus");
   await page.keyboard.press("Space");
   assert.equal(await page.locator(".efg-gnocchi-recipe").evaluate(e=>e.open),false);
   await page.keyboard.press("Tab");
   assert.equal(await page.locator(".efg-daily-tip-credit a").evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press("Shift+Tab");
   assert.equal(await page.locator(".efg-gnocchi-recipe summary").evaluate(e=>e===document.activeElement),true);
   assert.equal(await page.locator('[data-tab="recipes"]').count(),0);
   assert.deepEqual(await stableText(),original);
   result.checks.push("Tab/Enter/Space/Shift+Tab, summary focus retained, no plan CTA, text and credit stable");

   // Explicit resource retry: tests paint recovery, NOT app automatic retry.
   const beforeRecoveryGeometry=await geometry();
   assert.equal(await recipeFocus(),true);
   imageMode="success";
   await image.evaluate(i=>{const src=new URL(i.src);src.searchParams.set("qa_explicit_retry","1");i.src=src.href});
   await image.evaluate(i=>i.decode());
   assert.equal(await image.evaluate(i=>i.complete&&i.naturalWidth>0),true);
   assert.deepEqual(await stableText(),original);await checkGeometry();
   assert.equal(await recipeFocus(),true,"image recovery must not move keyboard focus");
   result.recoveryGeometry={before:beforeRecoveryGeometry,after:await geometry()};
   equalGeometry(result.recoveryGeometry.before,result.recoveryGeometry.after);
   await shot("03-explicit-retry-success");
   result.checks.push("explicit image retry decodes; authored ALT/text/credit preserved");
   result.automaticRecovery="NOT_TESTED; no app auto-retry asserted";

   // Delayed response: content and native recipe remain usable before bytes arrive.
   imageMode="delay";gate=new Promise(r=>{releasePhoto=r});
   const delayedDocument=page.setContent(documentHTML(card,tipCSS),{waitUntil:"domcontentloaded"});
   await delayedDocument;await page.locator(".efg-daily-tip-photo").scrollIntoViewIfNeeded();
   await Promise.race([delayedStarted,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error("Delayed request never intercepted")),10000);timer.unref();})]);
   assert.equal(await page.locator("#efgTipTitle").isVisible(),true);
   await page.locator(".efg-gnocchi-recipe summary").click();
   assert.equal(await page.locator("details").evaluate(e=>e.open),true);
   assert.deepEqual(await stableText(),original);await checkGeometry();await shot("04-delayed-photo-readable");
   const beforeArrivalGeometry=await geometry();
   // Establish a keyboard-owned focus stop; mouse-focus behavior differs between engines.
   await page.locator(".efg-gnocchi-recipe summary").focus();
   assert.equal(await recipeFocus(),true);
   releasePhoto();await page.locator(".efg-daily-tip-photo").evaluate(i=>i.decode());
   assert.equal(await recipeFocus(),true,"arrival must preserve existing focus");
   assert.deepEqual(await stableText(),original);
   result.arrivalGeometry={before:beforeArrivalGeometry,after:await geometry()};
   equalGeometry(result.arrivalGeometry.before,result.arrivalGeometry.after);
   await checkGeometry();await shot("05-delayed-photo-arrived");
   result.checks.push("delayed image does not block reading or recipe opening");

   // Native FAQ keyboard interaction in actual vertical library markup, no fake app router.
   await page.setContent(documentHTML(renderScienceVerticalView(),scienceCSS),{waitUntil:"domcontentloaded"});
   const wellbeingLogo=page.locator(".ns-library-panel[data-science-step='8'] .ns-wellbeing-logo");
   await wellbeingLogo.evaluate(i=>i.decode());
   assert.match(await wellbeingLogo.getAttribute("alt"),/serotonina/i);
   assert.equal(await wellbeingLogo.evaluate(i=>i.naturalWidth>0),true);
   assert.equal(await page.locator(".ns-library-panel").count(),8);
   result.checks.push("original AVIF decodes in final educational panel; nonempty serotonin ALT");
   const summary=page.locator(".ns-faq details summary").first();
   await summary.focus();await page.keyboard.press("Enter");
   assert.equal(await page.locator(".ns-faq details").first().evaluate(e=>e.open),true);
   await page.keyboard.press("Space");
   assert.equal(await page.locator(".ns-faq details").first().evaluate(e=>e.open),false);
   assert.equal(await summary.evaluate(e=>e===document.activeElement),true);
   await shot("06-library-faq-focus");
   result.checks.push("library native FAQ Enter/Space, focus remains");
   // Component-only focus contract. Actual Next/Prev/Finish handlers require app fixtures.
   for(const step of [0,7]){
    await page.setContent(documentHTML(renderScienceWelcomeStep(step),scienceCSS),{waitUntil:"domcontentloaded"});
    const expected=step===0?["scienceSkip","scienceNext"]:["sciencePrev","scienceSkip","scienceFinish"];
    const order=[];
    for(let i=0;i<expected.length;i++){
     await page.keyboard.press("Tab");
     order.push(await page.evaluate(()=>document.activeElement?.getAttribute("data-act")));
    }
    assert.deepEqual(order,expected);await shot("07-intro-"+(step+1)+"-focus");
   }
   result.checks.push("intro first/final panel Tab order, component only");
   assert.deepEqual(pageErrors,[]);assert.deepEqual(result.externalRequests,[]);
   result.status="AUTOMATED_ASSERTIONS_PASS; screenshot review pending";
  }catch(error){result.status="FAIL";result.error=String(error);throw error}
  finally{releasePhoto?.();await context.close()}
 }
}finally{
 await browser.close();
 writeFileSync(join(out,"education-delta-"+engine+".json"),JSON.stringify({targetSHA:"578b3887a39282a41d85a3309ee48cd8e2e3ed45",fixtureOnly:true,executedByHarness:true,results},null,2));
}
console.log("Education interaction delta assertions completed; physical QA and visual screenshot review remain separate.");
