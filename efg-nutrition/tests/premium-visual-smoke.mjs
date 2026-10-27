// Browser QA on actual EFG UI; fixture accounts in RAM. NEVER contacts live Supabase.
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const rootDir=process.cwd();
const outDir=join(rootDir,"artifacts/premium-visual-qa");
mkdirSync(outDir,{recursive:true});
const errors=[];
let blockedBackendCalls=0;
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".jpg":"image/jpeg",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml"};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const local=resolve(rootDir,"."+pathname);
  if(!local.startsWith(rootDir+"/"))throw Error("Illegal path");
  let file=pathname.endsWith("/")?join(local,"index.html"):local;
  let bytes=readFileSync(file);
  if(pathname==="/efg-nutrition/pilot/pilot.js"){
   bytes=Buffer.from(bytes.toString("utf8")+
    "\nwindow.__EFG_VISUAL_QA__={state,render,today,setConsentMap:(v)=>{coachRosterConsent=v}};\n");
  }
  res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});
  res.end(bytes);
 }catch(e){res.writeHead(404);res.end("Fixture path not found");}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
const scenarios=[
 ["student",360],["student",375],["student",390],["student",430],
 ["coach",360],["coach",390],["coach",412],
 ["admin",360],["admin",390],["admin",412]
];
const sbStub='export function createClient(){const b=()=>{const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:null,error:null}),then(resolve){resolve({data:[],error:null})}};return q};return {auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>b(),rpc:async()=>({data:null,error:null})}}';
try{
 for(const [role,width] of scenarios){
  const context=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await context.route("https://esm.sh/**",route=>route.fulfill({status:200,contentType:"text/javascript",headers:{"Access-Control-Allow-Origin":"*"},body:sbStub}));
  await context.route(/https:\/\/[^/]*supabase\.co\/.*/,route=>{
   blockedBackendCalls++;
   return route.abort("blockedbyclient");
  });
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(role+"/"+width+": "+e.message));
  page.on("console",msg=>{if(msg.type()==="error")errors.push(role+"/"+width+" console: "+msg.text())});
  await page.goto("http://127.0.0.1:"+port+"/efg-nutrition/pilot/",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>!!window.__EFG_VISUAL_QA__);
  await page.evaluate(async(role)=>{
   const {state,render,today,setConsentMap}=window.__EFG_VISUAL_QA__;
   const userId="demo-"+role, day=today();
   state.session={user:{id:userId,email:"demo@example.invalid"}};
   state.profile={user_id:userId,nickname:role==="student"?"Alex":role==="coach"?"Coach Andrea":"Administrador",role,active:true,organization_id:"demo-org"};
   state.tab=role==="student"?"home":role==="coach"?"coach":"admin";
   state.renderedDay=day;state.welcomePending=false;
   state.diary={student_id:userId,log_day:day,meals:{
     desayuno:[{id:"egg",name:"Huevo",qty:120,unit:"g",k:178,p:15,c:1,f:12,fi:0}],
     media_manana:[{id:"yogurt",name:"Yogur natural",qty:170,unit:"g",k:85,p:7,c:14,f:0,fi:0}],
     almuerzo:[{id:"chicken",name:"Pechuga de pollo",qty:180,unit:"g",k:297,p:55,c:0,f:6,fi:0}],
     media_tarde:[],merienda:[],cena:[]},sports:[],skipped:{},totals:{}};
   state.goals=[{kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28}];
   state.personalTargets={kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};
   state.consent={accepted:true};
   state.org={id:"demo-org",name:"Entrenamiento Demo",seat_limit:25,is_test:role==="admin",status:"active",payment_alias:"DEMO.ALIAS"};
   state.orgs=[
     {id:"demo1",name:"Coach Norte",seat_limit:20,status:"active",coach_id:"demo-coach1"},
     {id:"demo2",name:"Coach Centro",seat_limit:30,status:"trial",coach_id:"demo-coach2"},
     {id:"demo3",name:"Coach Sur",seat_limit:15,status:"suspended",coach_id:"demo-coach3"}
   ];
   state.roster=[
     {user_id:"demo-student-a",nickname:"Alex Gómez",email:"alumno.a@example.invalid",role:"student",active:true},
     {user_id:"demo-student-b",nickname:"Camila Pérez",email:"alumno.b@example.invalid",role:"student",active:true},
     {user_id:"demo-student-c",nickname:"Lucas Díaz",email:"alumno.c@example.invalid",role:"student",active:false}
   ];
   state.invitations=[];state.testInvitations=[];state.payments=[];
   state.weights=[];state.activities=[];state.selectedStudent=null;
   setConsentMap({"demo-student-a":true,"demo-student-b":false,"demo-student-c":false});
   await render();
  },role);
  const pageReport={role,width,pages:[],errors:[]};
  const destinations=role==="student"?["home","planner","weight","studentMore"]:role==="coach"?["coach","coachStudents","reports","payments"]:["admin","home","testCoach","adminMore"];
  for(const dest of destinations){
   await page.locator('.pilot-nav button[data-tab="'+dest+'"]').click();
   await page.waitForTimeout(120);
   const metrics=await page.evaluate(()=>{
    const viewportWidth=window.innerWidth;
    const nav=[...document.querySelectorAll(".pilot-nav button.navitem")].map(x=>({label:x.textContent.trim(),height:Math.round(x.getBoundingClientRect().height)}));
    const bad=[...document.querySelectorAll("body *")].filter(x=>{
      const box=x.getBoundingClientRect(),style=getComputedStyle(x);
      return box.width>0&&style.position!=="fixed"&&box.right>viewportWidth+2&&style.visibility!=="hidden";
    }).slice(0,5).map(x=>({element:x.tagName,classes:x.className?.toString().slice(0,80),right:Math.round(x.getBoundingClientRect().right)}));
    return {documentWidth:document.documentElement.scrollWidth,viewportWidth,nav,bad,mainText:document.querySelector(".pilot-main")?.textContent.slice(0,110)};
   });
   pageReport.pages.push({dest,...metrics});
   if(metrics.documentWidth>width+2)pageReport.errors.push(dest+": horizontal overflow "+metrics.documentWidth+"/"+width);
   if(metrics.nav.some(x=>x.height<44))pageReport.errors.push(dest+": short nav touch target");
   if(role==="student"&&dest==="home"){
    const mealCount=await page.locator(".student-meal-card").count();
    if(mealCount!==6)pageReport.errors.push("Expected six meal cards, got "+mealCount);
    const shortcut=page.locator('button[data-scrollto="studentMeals"]');
    await shortcut.click();
    const focus=await page.locator("#studentMeals").evaluate(x=>x===document.activeElement);
    if(!focus)pageReport.errors.push("Meals shortcut did not focus meals section");
   }
   if(width===390 || width===360){
     await page.screenshot({path:join(outDir,role+"-"+width+"-"+dest+".png"),fullPage:true,animations:"disabled"});
   }
  }
  results.push(pageReport);
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
const report={timestamp:new Date().toISOString(),scenarios:results,blockedBackendCalls,errors};
writeFileSync(join(outDir,"report.json"),JSON.stringify(report,null,2));
const failed=errors.concat(results.flatMap(x=>x.errors.map(e=>x.role+"/"+x.width+": "+e)));
console.log(JSON.stringify({passed:failed.length===0,scenarios:results.length,pages:results.reduce((n,x)=>n+x.pages.length,0),backendRequestsBlocked:blockedBackendCalls,issues:failed},null,2));
assert.equal(blockedBackendCalls,0,"Fixture attempted a production backend connection");
if(failed.length)process.exitCode=1;
