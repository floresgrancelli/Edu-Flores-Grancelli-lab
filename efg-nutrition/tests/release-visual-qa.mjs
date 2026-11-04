// Isolated visual preview for the special launch, with zero production/DB access.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit} from "playwright";
import {renderMajorReleaseAnnouncement,renderWhatsNew} from "../pilot/release-communications.js";

const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
const out=join(process.cwd(),"artifacts/premium-visual-qa");
mkdirSync(out,{recursive:true});
const css=readFileSync("efg-nutrition/pilot/coach-experience.css","utf8");
const manifest={id:"major_2026_01",version:"2026.11.1",phase:"preview",
 title:"¡Una nueva etapa de EFG Nutrition Pro!",
 roles:["admin","coach","student","personal"],
 highlights:["Planes alimentarios más claros y personalizables",
  "Herramientas de seguimiento renovadas","Elegí alimentos según tus preferencias y restricciones"]};
const checks=[],issues=[];
const widths=engine==="webkit"?[390]:[320,390,430];
try{
 for(const width of widths){
  for(const role of manifest.roles){
   for(const phase of ["preview","reauth_required","live"]){
    if(width!==390&&role!=="student"&&role!=="coach")continue;
    const m={...manifest,phase};
    const markup=phase==="live"?renderWhatsNew(m,role):renderMajorReleaseAnnouncement(m,role);
    const ctx=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    try{
     const page=await ctx.newPage();
     page.on("pageerror",err=>issues.push(engine+"/"+role+"/"+phase+": "+err.message));
     const html='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+
      'html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}body{margin:0;padding:18px 12px 32px;background:#ece9e5;font:16px system-ui,sans-serif}.btn{border:1px solid #526779;border-radius:14px;background:linear-gradient(145deg,#24445e,#365b73);color:white;font-weight:700;cursor:pointer}.btn.light{background:#f5eff1;color:#243950}'+
      css+'</style></head><body><main>'+markup+'</main></body></html>';
     await page.setContent(html,{waitUntil:"load"});
     const data=await page.evaluate(()=>{
      const section=document.querySelector(".efg-release-announcement,.efg-release-whatsnew");
      const heading=section?.querySelector("h2");
      const btn=[...section.querySelectorAll("button")].map(el=>({text:el.textContent?.trim(),height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
      return {documentWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth,
       hasArt:!!section?.querySelector(".efg-release-art svg"),gradient:getComputedStyle(section).backgroundImage,
       headingVisible:!!heading&&heading.getBoundingClientRect().height>0,headingWidth:heading?.scrollWidth,
       panelWidth:section?.getBoundingClientRect().width,buttons:btn,highlights:section.querySelectorAll(".efg-release-highlights li").length};
     });
     if(data.documentWidth>width)issues.push(engine+"/"+role+"/"+phase+"/"+width+" horizontal overflow: "+data.documentWidth);
     if(!data.hasArt||!data.gradient.includes("gradient")||!data.headingVisible||data.highlights!==3)
      issues.push(engine+"/"+role+"/"+phase+"/"+width+" missing artwork/gradient/heading/highlights");
     if(data.buttons.some(b=>b.height<44||b.width<88))
      issues.push(engine+"/"+role+"/"+phase+"/"+width+" button too small: "+JSON.stringify(data.buttons));
     if(phase==="preview"&&data.buttons.some(b=>b.text?.includes("cerrar sesión")))
      issues.push(engine+"/"+role+"/"+phase+"/"+width+" prelaunch accidentally offers signout");
     if(phase==="reauth_required"&&!data.buttons.some(b=>b.text?.includes("cerrar sesión")))
      issues.push(engine+"/"+role+"/"+phase+"/"+width+" reauth lacks signout CTA");
     if(phase==="live"&&!data.buttons.some(b=>b.text==="Comenzar"))
      issues.push(engine+"/"+role+"/"+phase+"/"+width+" welcome lacks Comenzar");
     checks.push({engine,role,phase,width,...data});
     await page.screenshot({path:join(out,"release-"+engine+"-"+role+"-"+phase+"-"+width+".png"),fullPage:true,animations:"disabled"});
    }finally{await ctx.close()}
   }
  }
 }
}finally{await browser.close()}
writeFileSync(join(out,"release-visual-"+engine+".json"),JSON.stringify({checks,issues,fixtureOnly:true,noBackend:true},null,2));
assert.deepEqual(issues,[],"Special release illustration must be readable, responsive and must not offer early logout");
console.log("PASS: "+engine+" special launch illustration "+checks.length+" isolated preview states; no DB, auth or messaging");
