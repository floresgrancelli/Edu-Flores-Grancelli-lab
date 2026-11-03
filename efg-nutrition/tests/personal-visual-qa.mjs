// NUT-63 Personal visual QA · synthetic fixture ONLY, no backend/real users.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {chromium,webkit} from "playwright";
import {PERSONAL_MEALS,renderPersonalWorkspace,PERSONAL_WORKSPACE_ENABLED} from "../pilot/personal-workspace.js";
import {createPersonalPlanningPreview,renderPersonalPlanningPreview,PERSONAL_PLANNING_PREVIEW_ENABLED} from "../pilot/personal-planning-preview.js";
import {newPersonalMealDraft,draftPersonalMealAdd,PERSONAL_MEAL_EDIT_ENABLED} from "../pilot/personal-meal-draft.js";
import {calculatePersonalDayBalance,renderPersonalDayBalance,PERSONAL_DAY_BALANCE_ENABLED} from "../pilot/personal-day-balance.js";

assert.equal(PERSONAL_WORKSPACE_ENABLED,false);
assert.equal(PERSONAL_PLANNING_PREVIEW_ENABLED,false);
assert.equal(PERSONAL_MEAL_EDIT_ENABLED,false);
assert.equal(PERSONAL_DAY_BALANCE_ENABLED,false);
const owner="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",day="2026-10-30";
const intake={goal:"recomp",age_years:41,height_cm:174,weight_kg:79.4,
 activity_level:"moderate",sex_for_equation:"male",dietary_pattern:"omnivore",health_flags:[]};
const p=createPersonalPlanningPreview(intake,{explicitPreviewRequest:true});
const foods=[
 {id:"egg",name:"Huevo",unit:"g",category:"dairy",k:1.5,p:.12,c:.01,f:.1,fi:0},
 {id:"tart",name:"Tarta de atún",unit:"g",category:"prepared",k:2.5,p:.14,c:.22,f:.1,fi:.02},
 {id:"banana",name:"Banana",unit:"g",category:"fruit",k:.89,p:.01,c:.23,f:.003,fi:.025}
];
const draft=(slot,foodId,grams)=>draftPersonalMealAdd(newPersonalMealDraft({slot,day}),foods,{foodId,quantity:grams});
const mealDrafts=[draft("desayuno","egg",100),draft("media_manana","banana",100),draft("almuerzo","tart",200)];
const balance=calculatePersonalDayBalance({day,goalPreview:p,drafts:mealDrafts,catalog:foods});
const goal={user_id:owner,revision:1,goal_type:"recomp",kcal:p.totals.kcal,
 protein_g:p.totals.protein_g,carb_g:p.totals.carb_g,fat_g:p.totals.fat_g,fiber_g:p.totals.fiber_g};
const guides=PERSONAL_MEALS.map(m=>({slot:m.id,items:m.id==="desayuno"?[
 {id:"egg",name:"Huevo entero",grams:100}]:[]}));
const snapshot={verified:true,userId:owner,day,profile:{nickname:"Persona de prueba"},
 goal,guide:{user_id:owner,revision:1,goal_revision:1,
  guide:{kind:"five_meal_example",meals:guides}},
 diary:{user_id:owner,log_day:day,totals:{k:739,p:41,c:68,f:30.3},
  meals:{desayuno:[{id:"egg",name:"Huevos",grams:100}]}},
 habituals:[{id:"fixture",user_id:owner,meal_slot:"desayuno",
  name:"Tostadas con huevo",items:[]}]};
const workspace=renderPersonalWorkspace(snapshot);
assert.ok(workspace.includes("Tu alimentación, a tu manera"));
const logo=readFileSync("efg-nutrition/pilot/assets/serotonina-acuarela.avif").toString("base64");
const content=workspace.replace('<p class="efg-self-footer">',
 renderPersonalPlanningPreview(p)+renderPersonalDayBalance(balance)+'<p class="efg-self-footer">')
 .replaceAll("./assets/serotonina-acuarela.avif","data:image/avif;base64,"+logo);
const css=readFileSync("efg-nutrition/pilot/personal-workspace.css","utf8");
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await ({webkit,chromium}[engine]).launch({headless:true});
const dest=join(process.cwd(),"artifacts/premium-visual-qa");mkdirSync(dest,{recursive:true});
const results=[],issues=[];
try{
 for(const width of (engine==="webkit"?[390]:[320,390,430,768])){
  const context=await browser.newContext({viewport:{width,height:870},deviceScaleFactor:1,
   hasTouch:width<600,isMobile:width<600});
  try{
   const page=await context.newPage();
   page.on("pageerror",e=>issues.push(engine+"/"+width+": "+e.message));
   const html='<!doctype html><html lang="es"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<style>*,*:before,*:after{box-sizing:border-box}body{margin:0;font:16px system-ui,sans-serif}'+
    '.btn{border:1px solid #65546a;background:#fff;color:#403348;padding:11px 13px;border-radius:12px;cursor:pointer}'+
    css+'</style></head><body>'+content+'</body></html>';
   await page.setContent(html,{waitUntil:"load"});
   const info=await page.evaluate(()=>{
    const headings=[...document.querySelectorAll(".efg-self-meal h3")].map(e=>e.textContent);
    const panels=[...document.querySelectorAll(".efg-self-overview,.efg-self-foods,.efg-self-plan-preview,.efg-self-balance")];
    return {scrollWidth:document.documentElement.scrollWidth,
     width:window.innerWidth,bodyWidth:document.body.getBoundingClientRect().width,
     panels:panels.map(p=>({width:p.getBoundingClientRect().width,top:p.getBoundingClientRect().top})),
     headings,logoLoaded:document.querySelector(".efg-self-brand img")?.naturalWidth>0,
     tables:document.querySelectorAll(".efg-self-plan-scroll table").length,
     nestedHorizontalOverflow:[...document.querySelectorAll(".efg-self-plan-scroll")].every(p=>p.scrollWidth>=p.clientWidth),
     btnHeight:document.querySelector(".efg-self-head .btn")?.getBoundingClientRect().height,
     hasLegacyNav:!!document.querySelector(".pilot-nav,.efg-role-admin,.efg-role-coach")};
   });
   if(info.scrollWidth>width+1)issues.push(engine+"/"+width+" page horizontal overflow "+info.scrollWidth);
   if(info.panels.length!==4||info.panels.some(x=>x.width<120||x.width>width))
    issues.push(engine+"/"+width+" missing/clipped Personal panels");
   if(info.headings.length!==5||!info.logoLoaded||info.tables!==2||
      !info.nestedHorizontalOverflow||info.hasLegacyNav)
    issues.push(engine+"/"+width+" invalid Personal-only page content "+JSON.stringify(info));
   if(info.btnHeight<36)issues.push(engine+"/"+width+" logout target too small");
   results.push({engine,width,...info,fixtureOnly:true});
   await page.screenshot({path:join(dest,"personal-"+engine+"-"+width+".png"),
    fullPage:true,animations:"disabled"});
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(dest,"personal-visual-"+engine+".json"),
 JSON.stringify({results,issues,fixtureOnly:true,backendTests:false},null,2));
assert.deepEqual(issues,[],"Personal independent dashboard / targets / balance visual QA.");
console.log("PASS NUT-63: "+engine+" Personal visual responsive synthetic scenes "+results.length+
 " (no backend, no live role or medical advice).");
