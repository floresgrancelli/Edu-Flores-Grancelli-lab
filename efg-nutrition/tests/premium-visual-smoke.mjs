// Browser QA on actual EFG UI; fixture accounts in RAM. NEVER contacts live Supabase.
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium,webkit } from "playwright";
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
    "\nwindow.__EFG_VISUAL_QA__={state,render,today,handleAuthStateChange,versionNotice,openMealDialog,messages,inbox,setHabituales:(v)=>{cloudHabituales=v},setConsentMap:(v)=>{coachRosterConsent=v}};\n");
  }
  res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});
  res.end(bytes);
 }catch(e){res.writeHead(404);res.end("Fixture path not found");}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const port=server.address().port;
const engine=process.env.EFG_QA_ENGINE==="webkit"?"webkit":"chromium";
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
const results=[];
const scenarios=engine==="webkit"?[["student",390],["coach",390],["admin",390],["student",1280]]:[
 ["student",320],["student",360],["student",375],["student",390],["student",430],["student",768],["student",1280],
 ["coach",360],["coach",390],["coach",412],["coach",768],["coach",1280],
 ["admin",360],["admin",390],["admin",412],["admin",768],["admin",1280]
];
const sbStub='export function createClient(){const b=()=>{const q={saved:null,select(){return q},upsert(value){q.saved=value;return q},eq(){return q},in(){return q},order(){return q},limit(){return q},maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:q.saved||null,error:null}),then(resolve){resolve({data:[],error:null})}};return q};return {auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>b(),rpc:async()=>({data:null,error:null})}}';
try{
 for(const [role,width] of scenarios){
  const context=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await context.route("https://esm.sh/**",route=>route.fulfill({status:200,contentType:"text/javascript",headers:{"Access-Control-Allow-Origin":"*"},body:sbStub}));
  // Layout-only fixtures: live photo availability is tested separately in real browsers.
  await context.route(/^https:\/\/images\.(unsplash|pexels)\.com\//,route=>route.fulfill({
   status:200,contentType:"image/png",
   body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Y9ycAAAAASUVORK5CYII=","base64")
  }));
  await context.route(/https:\/\/[^/]*supabase\.co\/.*/,route=>{
   blockedBackendCalls++;
   return route.abort("blockedbyclient");
  });
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(role+"/"+width+": "+e.message));
  page.on("console",msg=>{if(msg.type()==="error")errors.push(role+"/"+width+" console: "+msg.text())});
  await page.goto("http://127.0.0.1:"+port+"/efg-nutrition/pilot/",{waitUntil:"networkidle"});
  try{await page.waitForFunction(()=>!!window.__EFG_VISUAL_QA__,null,{timeout:16000});}
  catch(err){
    const debug=await page.evaluate(()=>({
      readyState:document.readyState,
      title:document.title,
      scripts:[...document.querySelectorAll('script')].map(x=>x.src).slice(-4),
      body:document.body?.innerText?.slice(0,400)
    })).catch(()=>({}));
    throw Error("EFG pilot failed to boot in isolated "+engine+" "+role+"/"+width+
      ": "+JSON.stringify(debug)+"; JS/page errors: "+errors.slice(-9).join(" | ")+"; "+String(err));
  }
  if(role==="coach"&&width===390&&engine==="chromium"){
   // Isolated iPhone-width touch regression before the fixture signs in.
   const gesture=await page.evaluate(async()=>{
    const {createPullToRefresh}=await import("./pull-refresh.js?v=20261028-pull1");
    let count=0;
    const test=createPullToRefresh({canRefresh:()=>true,refresh:async()=>{count++;}});
    window.scrollTo(0,0);
    const event=(type,target,y,all)=>{
     const touch=new Touch({identifier:33,target,clientX:100,clientY:y});
     return new TouchEvent(type,{bubbles:true,cancelable:true,
      touches:all?[touch]:[],targetTouches:all?[touch]:[],changedTouches:[touch]});
    };
    const drag=(target,startY,endY)=>{
     target.dispatchEvent(event("touchstart",target,startY,true));
     const mid=event("touchmove",target,endY,true);
     target.dispatchEvent(mid);
     target.dispatchEvent(event("touchend",target,endY,false));
     return mid.defaultPrevented;
    };
    const firstBlocked=drag(document.body,90,270);
    await new Promise(resolve=>setTimeout(resolve,50));
    const first=count,visible=document.querySelectorAll("#efgPullRefresh.is-success").length;
    drag(document.body,90,135);await new Promise(resolve=>setTimeout(resolve,30));
    const afterShort=count;
    const field=document.createElement("textarea");document.body.append(field);
    drag(field,90,270);await new Promise(resolve=>setTimeout(resolve,30));
    const afterInput=count;field.remove();
    const summary=document.createElement("div");summary.className="efg-pastel-day";document.body.append(summary);
    const contentBlocked=drag(summary,340,520); // down: ordinary card must not become refresh
    const upwardBlocked=drag(summary,340,165); // up: ordinary card must pan normally
    await new Promise(resolve=>setTimeout(resolve,30));
    const afterContent=count;summary.remove();
    test.dispose();
    return {firstBlocked,first,visible,afterShort,afterInput,contentBlocked,upwardBlocked,afterContent};
   });
   if(!gesture.firstBlocked||gesture.first!==1||gesture.visible!==1||
      gesture.afterShort!==1||gesture.afterInput!==1||gesture.contentBlocked||gesture.upwardBlocked||gesture.afterContent!==1)
      errors.push("pull-refresh must not hijack Android dashboard swipes: "+JSON.stringify(gesture));
  }
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
   const goalStart=new Date(day+"T12:00:00Z");goalStart.setUTCDate(goalStart.getUTCDate()-90);
   state.goals=[{start_on:goalStart.toISOString().slice(0,10),kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28}];
   const demoLogs=Array.from({length:7},(_,i)=>{
     const dt=new Date(day+"T12:00:00Z");dt.setUTCDate(dt.getUTCDate()-i);
     return {log_day:dt.toISOString().slice(0,10),meals:{
       desayuno:[{k:330,p:23,c:32,f:12,fi:3}],media_manana:[],almuerzo:[{k:670,p:48,c:75,f:18,fi:7}],
       media_tarde:[],merienda:[{k:220,p:18,c:22,f:7,fi:2}],cena:[{k:520,p:42,c:55,f:15,fi:6}]},sports:[],skipped:{}};
   });
   if(role==="student")demoLogs.forEach((log,i)=>{if(i>0&&i<3)log.meals.cena.push({k:i===1?360:200,p:19,c:35,f:6,fi:0});});
   state.progressLogs=demoLogs;state.coachProgressLogs=demoLogs;
   state.coachGoals=state.goals;

   state.personalTargets={kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28,updated_at:goalStart.toISOString()};
   state.consent={accepted:true};
   state.org={id:"demo-org",name:"Entrenamiento Demo",seat_limit:25,is_test:role==="admin",status:"active",payment_alias:"DEMO.ALIAS",coach_id:role==="admin"?"demo-admin":"demo-coach"};
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
   state.invitations=[];state.testInvitations=[];state.payments=[];state.platformAlias="EFG.ALIAS.DEMO";
   state.weights=[];state.activities=[];state.selectedStudent=null;
   setConsentMap({"demo-student-a":true,"demo-student-b":false,"demo-student-c":false});
   await render();
  },role);

  if(width===390){
   await page.evaluate(async()=>{const v=window.__EFG_VISUAL_QA__;v.state.tab="messages";await v.render();await v.inbox.refresh();});
   const search=page.locator("#efgChatSearch"),contact=page.locator("[data-chat-contact]");
   if(!(await search.count()))errors.push(role+" chat search missing");
   if((await contact.count())!==1)errors.push(role+" chat must show exactly one authorized contact; got "+await contact.count());
   const excluded=await page.locator("#efgMessagesContent").innerText();
   if(role!=="student"&&excluded.includes("Camila Pérez"))errors.push(role+" chat exposed unconsented student");
   if(await search.count()){
    await search.fill("contacto inexistente");
    if(await page.locator("[data-chat-contact]").count())errors.push(role+" search did not filter chats");
    await search.fill("");
   }
   if(await contact.count()){
    await contact.first().click();
    await page.waitForTimeout(70);
    const thread=page.locator(".efg-chat-layout.show-thread #efgMessageForm");
    if(!(await thread.count()))errors.push(role+" contact did not open conversation");
    if(!(await page.locator("[data-chat-back]").count()))errors.push(role+" chat missing back arrow");
    await page.locator("[data-chat-back]").click();
    if(await page.locator(".efg-chat-layout.show-thread").count())errors.push(role+" chat back did not restore list");
   }
   const bell=page.locator(".efg-notify-bell");
   if(!(await bell.count()))errors.push(role+" floating notification bell missing");
   else{
    const visual=await bell.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage,icon:!!el.querySelector("svg"),w:el.getBoundingClientRect().width}));
    if(visual.bg!=="rgba(0, 0, 0, 0)"||!visual.icon||visual.w<44)errors.push(role+" bell should be floating SVG without tile: "+JSON.stringify(visual));
   }
   await page.screenshot({path:join(outDir,engine+"-"+role+"-390-messaging-luxury.png"),fullPage:true,animations:"disabled"});
   await page.evaluate(async(role)=>{const v=window.__EFG_VISUAL_QA__;v.state.tab=role==="student"?"home":role==="coach"?"coach":"admin";await v.render();},role);
  }
  const pageReport={role,width,pages:[],errors:[]};
  const destinations=role==="student"?["home","planner","weight","studentMore","recipes"]:role==="coach"?["coach","home","studentMore","coachTools","coachStudents","reports","payments","recipes"]:["admin","home","testCoach","adminMore","payments"];
  for(const dest of destinations){
   if(role==="admin"&&dest==="payments")await page.evaluate(async()=>{const v=window.__EFG_VISUAL_QA__;v.state.tab="payments";v.state.payments=[{id:"admin-test-receipt",payer_id:"demo-student-a",recipient_id:"demo-admin",organization_id:"demo-org",payment_kind:"student_coach",amount_ars:12000,period_label:"2026-10",status:"pending",receipt_path:"demo/receipt.jpg",created_at:new Date().toISOString()}];await v.render();});
   else if(dest==="recipes"||dest==="coachTools"||(role==="coach"&&dest==="reports"))await page.evaluate(async(dest)=>{const v=window.__EFG_VISUAL_QA__;v.state.tab=dest;await v.render();},dest);
   else await page.locator('.pilot-nav button[data-tab="'+dest+'"]').click();
   if(role==="coach"&&dest==="payments")await page.evaluate(async()=>{const v=window.__EFG_VISUAL_QA__;v.state.org={id:"demo-org",payment_alias:"COACH.DEMO",is_test:false};v.state.platformAlias="EFG.ALIAS.DEMO";v.state.payments=[{id:"payment-demo",payer_id:"demo-student-a",recipient_id:"demo-coach",organization_id:"demo-org",payment_kind:"student_coach",amount_ars:12000,period_label:"2026-10",status:"pending",receipt_path:"demo/receipt.jpg",created_at:new Date().toISOString()}];await v.render();});
   await page.waitForTimeout(120);
   if(role==="student"&&width===390&&dest==="home"&&engine==="chromium"){
     // Android-like native touch swipe, NOT a synthetic DOM-dispatched TouchEvent.
     // Swipe starting inside the upper calorie chart must move the document.
     const card=page.locator(".efg-pastel-day").first();
     if(!(await card.count()))pageReport.errors.push("MI DÍA summary missing for Android native swipe");
     else{
       const details=await card.evaluate(el=>({touchAction:getComputedStyle(el).touchAction,
         rect:{top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height},
         scroll:document.documentElement.scrollHeight,viewport:window.innerHeight}));
       if(!details.touchAction.includes("pan-y"))pageReport.errors.push("Android summary must allow pan-y: "+details.touchAction);
       if(details.scroll<=details.viewport+100)pageReport.errors.push("Android fixture does not overflow viewport");
       else{
         await page.evaluate(()=>window.scrollTo(0,0));
         const cdp=await context.newCDPSession(page);
         const x=195,y=Math.max(170,Math.min(460,details.rect.top+Math.min(110,details.rect.height*.35)));
         try{
           await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:11}]});
           for(let n=1;n<=6;n++){
             await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x,y:y-n*31,id:11}]});
             await page.waitForTimeout(22);
           }
           await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
           await page.waitForTimeout(180);
           const scrolled=await page.evaluate(()=>window.scrollY);
           if(scrolled<40)pageReport.errors.push("Android upward swipe from summary did not scroll: "+scrolled+"px");
         }finally{await cdp.detach();}
         await page.evaluate(()=>window.scrollTo(0,0));
       }
     }
   }
   if(role==="coach"){
     const content=await page.locator(".pilot-main").innerText();
     if(dest==="home"&&(!content.includes("MIS LOGROS DE LA SEMANA")||!content.includes("MIS COMIDAS")&&!content.includes("Mis comidas")))pageReport.errors.push("Coach MI DÍA missing meal diary or vivid weekly bars");
     if(dest==="studentMore"&&(!content.toLocaleUpperCase("es-AR").includes("MI PLANIFICADOR")||!content.toLocaleUpperCase("es-AR").includes("MIS SUPLEMENTOS")))pageReport.errors.push("Coach MI ESPACIO incomplete: "+content.slice(0,320));
     if(dest==="payments"&&(!content.toLocaleUpperCase("es-AR").includes("COBRAR A MIS ALUMNOS")||!content.toLocaleUpperCase("es-AR").includes("PAGAR MI LICENCIA A EFG")||!content.includes("EFG.ALIAS.DEMO")))pageReport.errors.push("Coach split payments or official alias missing: "+content.slice(0,470));
   }
   if((role==="admin"||role==="student")&&width===390&&dest==="home"){
     // Reproduce six meal slots, remote persisted favourites and first iPhone food selection
     // with NO real Supabase access; fixtures are account-specific in memory only.
     const slots=["desayuno","media_manana","almuerzo","media_tarde","merienda","cena"];
     const diaryBefore=await page.evaluate(()=>structuredClone(window.__EFG_VISUAL_QA__.state.diary));
     await page.evaluate(async(role)=>{
       const v=window.__EFG_VISUAL_QA__;
       v.setHabituales(["desayuno","media_manana","almuerzo","media_tarde","merienda","cena"].flatMap(slot=>
         [1,2].map(n=>({id:"demo-"+role+"-"+slot+"-"+n,meal_slot:slot,name:slot+" habitual "+n,
             items:[{id:"egg",name:"Huevo habitual",qty:55,unit:"g",k:81,p:7,c:1,f:5,fi:0}]}))));
       await v.render();
     },role);
     for(const slot of slots){
       const block=page.locator('.student-meal-card').filter({has:page.locator('[data-habitualchoice="'+slot+'"]')});
       if((await block.count())!==1){pageReport.errors.push("No habitual picker for "+role+" "+slot);continue;}
       if(!(await block.getAttribute("open")))await block.locator("summary").click();
       const select=block.locator('[data-habitualchoice="'+slot+'"]');
       const options=await select.locator("option").allTextContents();
       if(options.length!==3)pageReport.errors.push("Habituales did not show both saved options in "+slot+": "+options.length);
       await select.selectOption("demo-"+role+"-"+slot+"-1");
       if(await select.inputValue()!=="demo-"+role+"-"+slot+"-1")pageReport.errors.push("First habitual choice not accepted for "+slot);
       const preview=await block.locator("#habitualPreview_"+slot).innerText();
       if(!preview.includes("Huevo habitual")||!preview.includes("55 g")||!preview.includes("81 kcal"))
         pageReport.errors.push("Saving habitual name alone is insufficient: preview must show stored food, quantity and kcal in "+slot+": "+preview.slice(0,150));
     }
     const diaryAfterPreview=await page.evaluate(()=>structuredClone(window.__EFG_VISUAL_QA__.state.diary));
     if(JSON.stringify(diaryBefore)!==JSON.stringify(diaryAfterPreview))
       pageReport.errors.push("Previewing a habitual changed the diary before confirming for "+role);
     await page.locator('[data-habitualchoice="media_tarde"]').selectOption("demo-"+role+"-media_tarde-2");
     await page.locator('[data-habitualapply="media_tarde"]').click();
     await page.waitForTimeout(150);
     const saved=await page.evaluate(()=>{
       return (window.__EFG_VISUAL_QA__.state.diary?.meals?.media_tarde||[]).map(x=>x.qty);
     });
     if(!saved.includes(55))pageReport.errors.push("Selected habitual not saved on first tap for "+role);
     await page.evaluate(async()=>{
       const v=window.__EFG_VISUAL_QA__;v.openMealDialog("cena");
     });
     const initial=await page.locator("#mealEditorFood").inputValue();
     if(initial!=="")pageReport.errors.push("Meal food editor must start with unselected placeholder, got "+initial);
     const first=await page.locator('#mealEditorFood option[value]:not([value=""]):not([disabled])').first().getAttribute("value");
     if(first){
       await page.locator("#mealEditorFood").selectOption(first);
       if(await page.locator("#mealEditorFood").inputValue()!==first)pageReport.errors.push("iOS first food option did not stick for "+role);
       await page.locator('[data-act="saveSelectedMeal"]').click();
       await page.waitForTimeout(130);
       const stored=await page.evaluate(id=>(window.__EFG_VISUAL_QA__.state.diary?.meals?.cena||[]).some(x=>x.id===id),first);
       if(!stored)pageReport.errors.push("First food selection not persisted on first try for "+role);
     } else pageReport.errors.push("Meal editor has no foods for "+role);
     await page.evaluate(async previous=>{
       const v=window.__EFG_VISUAL_QA__;
       v.state.diary=previous;
       v.state.lastEditedMeal=null;
       await v.render();
     },diaryBefore);
     await page.locator(".student-meal-card").evaluateAll(nodes=>nodes.forEach(n=>n.open=false));
   }
   if(role==="student"&&width===390&&dest==="planner"){
     // Repro de captura real: buscar Sandía en "extra opcional 1".
     // El buscador debe mostrar la acción SIN cerrar el teclado Safari.
     await page.locator('[data-planmode="both"]').click(); // fixture defaults to Solo cena; screenshot uses Merienda + cena
     const key="merienda|vegetable";
     const search=page.locator('[data-plansearch="'+key+'"]');
     const row=page.locator('[data-plancontrols="'+key+'"]');
     if(await search.count()!==1){pageReport.errors.push("Extra 1 search is missing");}
     else{
       await search.fill("sandia");
       const chosen=await page.locator('[data-planselect="'+key+'"]').inputValue();
       const btn=row.locator('[data-planadd="'+key+'"]');
       const qty=row.locator('input[id="planQty_'+key+'"]');
       if(chosen!=="watermelon")pageReport.errors.push("Sandía selected from search incorrectly: "+chosen);
       if(await btn.count()!==1||!(await btn.isVisible()))pageReport.errors.push("Sandía search must expose AGREGAR AL REGISTRO button immediately");
       if(await qty.count()!==1)pageReport.errors.push("Sandía search must expose editable grams");
       const focused=await search.evaluate(el=>document.activeElement===el);
       if(!focused)pageReport.errors.push("Live search lost focus in iPhone-sized viewport");
       if(await qty.count()===1&&await btn.count()===1){
         await qty.fill("100");
         await btn.click();
         await page.waitForTimeout(180);
         const saved=await page.evaluate(()=>{
           const meal=window.__EFG_VISUAL_QA__.state.diary?.meals?.merienda||[];
           return meal.filter(x=>x.id==="watermelon").map(x=>x.qty);
         });
         if(!saved.includes(100))pageReport.errors.push("AGREGAR AL REGISTRO did not save 100g Sandía to merienda in isolated fixture: "+saved);
       }
     }
   }
   const pastelColors=await page.evaluate(()=>{
     const sample=selector=>{
       const el=document.querySelector(selector);
       return el?getComputedStyle(el).backgroundColor:null;
     };
     return {body:sample("body"),card:sample(".pilot-layout .card"),nav:sample(".pilot-layout .pilot-nav"),header:sample(".pilot-layout .efg-mobile-header")};
   });
   const isWhite=s=>(s||"").startsWith("rgb(255, 255, 255)")||(s||"").startsWith("rgba(255, 255, 255,");
   if(!pastelColors.body||isWhite(pastelColors.body))pageReport.errors.push("Body must have stone luxury background, not white");
   if(pastelColors.card&&isWhite(pastelColors.card))pageReport.errors.push("Cards cannot revert to flat white");
   if(pastelColors.nav&&isWhite(pastelColors.nav))pageReport.errors.push("Navigation cannot revert to flat white");
   const typography=await page.evaluate(()=>{
     const styleOf=selector=>{
       const el=[...document.querySelectorAll(selector)].find(x=>x.getClientRects().length>0);
       return el?{text:(el.textContent||"").trim().slice(0,60),transform:getComputedStyle(el).textTransform}:null;
     };
     const stats=[...document.querySelectorAll(".efg-coach-stat-grid > div")]
       .filter(x=>x.getClientRects().length>0).map(el=>getComputedStyle(el).backgroundColor);
     return {heading:styleOf(".pilot-layout .pilot-title,.pilot-layout h2"),
       button:styleOf(".pilot-layout button"),nav:styleOf(".pilot-layout .nav-label"),stats};
   });
   for(const [kind,sample] of Object.entries({heading:typography.heading,button:typography.button,nav:typography.nav})){
     if(sample&&sample.transform!=="uppercase")pageReport.errors.push(kind+" must render uppercase: "+sample.text);
   }
   if(role!=="student"&&["coach","admin"].includes(dest)&&typography.stats.some(x=>x.includes("255, 255, 255")))
     pageReport.errors.push("Coach/admin KPI stat backgrounds cannot be white");
   const actionAudit=await page.evaluate(()=>{
     const rgb=s=>{const n=(s.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);return n.length===3?n:null;};
     const luma=v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
     const lum=c=>.2126*luma(c[0])+.7152*luma(c[1])+.0722*luma(c[2]);
     const contrast=(a,b)=>{const aa=lum(a),bb=lum(b);return (Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);};
     const selector=".student-shortcuts button,.efg-quick-more button,.efg-menu-card";
     return [...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length>0)
       .map(el=>{const cs=getComputedStyle(el),fg=rgb(cs.color),bg=rgb(cs.backgroundColor);
         return {text:(el.textContent||"").trim().slice(0,30),className:el.className,
           color:cs.color,background:cs.backgroundColor,gradient:cs.backgroundImage,height:el.getBoundingClientRect().height,
           ratio:fg&&bg?contrast(fg,bg):0};});
   });
   // Los accesos usan materiales / gradientes luxury. Solo los graficos
   // (circulos de macros, barras de progreso) usan colores vivos semanticos.
   for(const action of actionAudit){
     if(!action.gradient||!action.gradient.includes("gradient"))
       pageReport.errors.push("Luxury action has no material gradient: "+action.text);
     if(action.height<44)pageReport.errors.push("Touch action <44px: "+action.text+" "+action.height);
   }
   if(role==="student"&&dest==="home"&&actionAudit.some(x=>x.text.includes("Registrar alimento")))
     pageReport.errors.push("Duplicate register CTA should not be visible above the meal cards");
   if((role==="coach"&&dest==="coach")||(role==="admin"&&dest==="admin")){
     const menuSelector=role==="coach"?".efg-coach-tiles > .efg-menu-card":".efg-role-admin .efg-menu-grid > .efg-menu-card";
     const menuColors=await page.locator(menuSelector).evaluateAll(els=>
       els.filter(el=>el.getClientRects().length>0).slice(0,6)
         .map(el=>getComputedStyle(el).backgroundImage));
     if(menuColors.length!==6)pageReport.errors.push("Expected 6 luxury-material coach/admin menu tiles");
     if(new Set(menuColors).size!==6)pageReport.errors.push("Coach/admin menu tiles repeat a finish: "+menuColors.join(", "));
   }
   const brandLogo=page.locator(".efg-mobile-brand .efg-serotonin-symbol");
   if((await brandLogo.count())!==1)pageReport.errors.push("Serotonin watercolor logo missing in mobile header");
   else {
     const b=await brandLogo.evaluate(img=>{
       const r=img.getBoundingClientRect();
       return {complete:img.complete,naturalWidth:img.naturalWidth,width:r.width,height:r.height,src:img.getAttribute("src")};
     });
     if(!b.complete||b.naturalWidth<80)pageReport.errors.push("Watercolor serotonin asset failed to load: "+JSON.stringify(b));
     if(b.width>60||b.height>39)pageReport.errors.push("Serotonin mark must be small and subtle: "+JSON.stringify(b));
     if(!b.src.includes("serotonina-acuarela.avif"))pageReport.errors.push("Wrong serotonin logo asset");
   }
   if(role==="student"&&dest==="home"){
     const bars=page.locator(".efg-weekly-streak .efg-streak-track");
     if(await bars.count()!==1)pageReport.errors.push("Need exactly one ±5% weekly bar");
     if(await page.locator(".efg-weekly-streak .efg-streak-daylabel").count()!==6)pageReport.errors.push("One ±5% track must show Monday-Saturday only");
     if(!(await page.locator(".efg-weekly-streak").innerText()).includes("Domingo"))pageReport.errors.push("Discretionary Sunday note missing");
     if(width===390&&engine==="chromium"){
       const breakfast=page.locator('.student-meal-card').filter({has:page.locator('[data-setmeal="desayuno"]')});
       if(await breakfast.count()!==1)pageReport.errors.push("Guided breakfast card absent");
       else{
         if(!(await breakfast.getAttribute("open")))await breakfast.locator("summary").click();
         await breakfast.locator('[data-setmeal="desayuno"]').click();
         const guide=page.locator(".efg-meal-guidance");
         if(await guide.count()!==1)pageReport.errors.push("Guided main-meal panel missing");
         else{
           if(await guide.locator("[data-mealgroup]").count()!==4)pageReport.errors.push("Guided main meal needs 4 food categories");
           if(await guide.locator("[data-mealomit]").count()!==2)pageReport.errors.push("Guided meal needs independent omit protein and carb controls");
           if(!(await guide.innerText()).includes("Grasas registradas"))pageReport.errors.push("Automatic fat summary missing");
           await guide.locator('[data-mealgroup="prepared"]').click();
           const preparedOptions=await page.locator("#mealEditorFood option").allTextContents();
           if(!preparedOptions.some(x=>/tarta|pizza|sushi|empanada/i.test(x)))pageReport.errors.push("Plato preparado did not expose mixed dishes");
           await guide.locator('[data-mealgroup="carb"]').click();
           const carbOptions=await page.locator("#mealEditorFood option").allTextContents();
           if(!carbOptions.some(x=>/arroz|pan|avena|papa/i.test(x)))pageReport.errors.push("Hydrate tab did not expose carbohydrate choices");
         }
         await page.locator('[data-act="closeMeal"]').click();
       }
       const snack=page.locator('.student-meal-card').filter({has:page.locator('[data-setmeal="media_tarde"]')});
       if(await snack.count()===1){
         if(!(await snack.getAttribute("open")))await snack.locator("summary").click();
         await snack.locator('[data-setmeal="media_tarde"]').click();
         if(await page.locator(".efg-meal-guidance").count())pageReport.errors.push("Media tarde must retain the classic entry flow");
         await page.locator('[data-act="closeMeal"]').click();
       }
     }
     const macroRings=await page.locator(".efg-pastel-macro-icon").evaluateAll(items=>items.map(el=>{
       const styles=getComputedStyle(el);
       return {w:el.getBoundingClientRect().width,bg:styles.backgroundImage};
     }));
     if(macroRings.length!==3||macroRings.some(x=>x.w<52||!x.bg.includes("conic-gradient")))
       pageReport.errors.push("3 real progress rings required, not flat macro icons");
   }
   if(await page.locator(".efg-mobile-monogram,.brand-mark").count())
     pageReport.errors.push("Decorative black E+ / EFG monogram must be absent");
   const brandText=await page.locator(".efg-mobile-brand-text strong").first().textContent();
   if(!(brandText||"").includes("EFG Nutrition"))pageReport.errors.push("Brand text EFG Nutrition must remain visible");
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
   if(role==="coach"&&dest==="coachTools"){
     if((await page.locator("#previewRecompMode option").count())!==3)pageReport.errors.push("Recomposition strategies not available to coaches");
     if((await page.locator('#previewActivity option[value="1.7"]').count())!==0)pageReport.errors.push("Retired 1.70 activity option is still shown");
     if((await page.locator('#previewActivity option').count())!==3)pageReport.errors.push("Expected three activity levels");
     await page.locator("#previewSex").selectOption("female");
     await page.locator("#previewActivity").selectOption("1.5");
     await page.locator("#previewRecompMode").selectOption("deficit10");
     await page.locator('button[data-act="previewMacros"]').click();
     if((await page.locator(".macro-preview").count())!==3)pageReport.errors.push("Calculating macros for women did not return three goals");
   }
   if(role==="student"&&width===1280&&dest==="home"){
    // Reproduce MacBook video: typing in the main meal must show a visible list
    // and choosing an item must update the real native food selector.
    await page.evaluate(()=>window.__EFG_VISUAL_QA__.openMealDialog("almuerzo"));
    await page.locator("#mealFoodSearch").fill("lech");
    const suggestions=page.locator("#mealFoodSuggestions [data-mealsuggestion]");
    if(!(await suggestions.count()))pageReport.errors.push("MacBook: food search has no visible matches while typing lech");
    else{
      const first=suggestions.first(),id=await first.getAttribute("data-mealsuggestion");
      if(!(await first.isVisible()))pageReport.errors.push("MacBook: food results hidden while typing");
      await first.click();
      if(await page.locator("#mealEditorFood").inputValue()!==id)
        pageReport.errors.push("MacBook: suggestion click did not select catalog food");
      if(!(await page.locator("#mealEditorHint").innerText()).includes("kcal"))
        pageReport.errors.push("MacBook: suggestion did not update meal nutrients");
    }
    await page.locator('[data-act="closeMeal"]').click();
   }
   if(role==="student"&&width===390&&dest==="home"){
    // Catálogo y registro desde «Mis comidas de hoy», sin panel de botones redundante.
    const beforeGuided=await page.evaluate(()=>structuredClone(window.__EFG_VISUAL_QA__.state.diary));
    const lunch=page.locator(".student-meal-card").nth(2);
    if((await lunch.getAttribute("open"))===null)await lunch.locator("summary").click();
    await lunch.locator('[data-setmeal="almuerzo"]').click();
    if((await page.locator("[data-mealgroup]").count())!==4)
      pageReport.errors.push("Main meal must offer protein, carb, prepared and other sections");
    if((await page.locator("[data-mealomit]").count())!==2)
      pageReport.errors.push("Main meal must offer optional omit for protein and carbs");
    await page.locator('[data-mealgroup="prepared"]').click();
    const foodSearch=page.locator("#mealFoodSearch");
    await foodSearch.fill("lech");
    const firstSuggestion=page.locator('#mealFoodSuggestions [data-mealsuggestion]').first();
    if(!(await firstSuggestion.count())||!(await firstSuggestion.innerText()).toLocaleLowerCase("es-AR").includes("lech"))
      pageReport.errors.push("Typing lech did not reveal visible selectable matches in the lunch modal");
    else{
      const firstId=await firstSuggestion.getAttribute("data-mealsuggestion");
      await firstSuggestion.click();
      if(await page.locator("#mealEditorFood").inputValue()!==firstId)
        pageReport.errors.push("Tapping suggested food did not select its real catalog ID");
      if(await foodSearch.getAttribute("aria-expanded")!=="false")
        pageReport.errors.push("Suggestions did not collapse after food selection");
    }
    await foodSearch.fill("sushi");
    const firstKeyboard=await page.locator('#mealFoodSuggestions [data-mealsuggestion]').first().getAttribute("data-mealsuggestion");
    await foodSearch.press("Enter");
    if(await page.locator("#mealEditorFood").inputValue()!==firstKeyboard)
      pageReport.errors.push("Pressing Enter did not choose the first visible food suggestion");
    await foodSearch.fill("sin_coincidencias_nunca_123");
    if(!(await page.locator("#mealFoodSuggestions").innerText()).includes("No encontramos"))
      pageReport.errors.push("No-match search did not inform the user");
    await foodSearch.fill("sushi");
    const sushi=await page.locator("#mealEditorFood option").allTextContents();
    if(!sushi.some(t=>t.toLowerCase().includes("maki"))||sushi.length<10)pageReport.errors.push("Sushi options not searchable on student mobile");
    await page.locator("#mealEditorFood").selectOption("sushi_maki_salmon");
    const unit=page.locator("#mealEntryMode");
    if((await unit.inputValue())!=="units")pageReport.errors.push("Sushi is not defaulting to unit/piece");
    const hint=await page.locator("#mealEditorHint").textContent();
    if(!hint.includes("pieza")||!hint.includes("28 g"))pageReport.errors.push("Sushi piece grams are not disclosed");
    await page.locator('[data-mealgroup="other"]').click();
    await page.locator("#mealFoodSearch").fill("zapallo");
    const squash=await page.locator("#mealEditorFood option").allTextContents();
    if(!squash.some(t=>t.includes("Zapallo anco")))pageReport.errors.push("Zapallo synonyms not searchable");
    await page.locator("#mealFoodSearch").fill("gomitas");
    const sweets=await page.locator("#mealEditorFood option").allTextContents();
    if(!sweets.some(t=>t.includes("Gomitas")))pageReport.errors.push("Gummy candy foods missing");
    await page.locator("#mealFoodSearch").fill("helado chocolate");
    await page.locator("#mealEditorFood").selectOption("helado_chocolate");
    const verifiedHint=await page.locator("#mealEditorHint").textContent();
    if(!verifiedHint.includes("USDA")||!verifiedHint.includes("FDC 168809"))
      pageReport.errors.push("Audited chocolate ice cream has no source trace on student mobile");
    await page.locator("#mealFoodSearch").fill("espinaca");
    await page.locator("#mealEditorFood").selectOption("espinaca_hervida");
    const leafHint=await page.locator("#mealEditorHint").textContent();
    if(!leafHint.includes("USDA")||!leafHint.includes("FDC 168463"))
      pageReport.errors.push("Second audit batch spinach source not visible to student");
    await page.locator("#mealFoodSearch").fill("choclo");
    await page.locator("#mealEditorFood").selectOption("choclo_hervido");
    const cornHint=await page.locator("#mealEditorHint").textContent();
    if(!cornHint.includes("FDC 169999"))
      pageReport.errors.push("Second audit batch corn source not visible to student");
    await page.locator("#mealFoodSearch").fill("chocolate almendras");
    await page.locator("#mealEditorFood").selectOption("chocolate_almendras");
    const almondHint=await page.locator("#mealEditorHint").textContent();
    if(!almondHint.includes("FDC 168754"))
      pageReport.errors.push("Third audit batch chocolate almonds source missing");
    await page.locator('[data-mealgroup="prepared"]').click();
    await page.locator("#mealFoodSearch").fill("pochoclo");
    await page.locator("#mealEditorFood").selectOption("palomitas_saladas");
    const popcornHint=await page.locator("#mealEditorHint").textContent();
    if(!popcornHint.includes("FDC 170247"))
      pageReport.errors.push("Third audit batch popcorn source missing");
    await page.locator('[data-mealgroup="other"]').click();
    await page.locator("#mealFoodSearch").fill("helado frutilla");
    await page.locator("#mealEditorFood").selectOption("helado_frutilla_crema");
    const strawberryHint=await page.locator("#mealEditorHint").textContent();
    if(!strawberryHint.includes("FDC 168810"))
      pageReport.errors.push("Fourth audit batch strawberry ice cream source missing");
    await page.locator('[data-mealgroup="carb"]').click();
    await page.locator("#mealFoodSearch").fill("donut");
    await page.locator("#mealEditorFood").selectOption("factura_donut");
    const donutHint=await page.locator("#mealEditorHint").textContent();
    if(!donutHint.includes("FDC 172758"))
      pageReport.errors.push("Fourth audit batch donut source missing");
    await page.locator('[data-mealgroup="other"]').click();
    await page.locator("#mealFoodSearch").fill("lemon pie");
    await page.locator("#mealEditorFood").selectOption("lemon_pie");
    const lemonHint=await page.locator("#mealEditorHint").textContent();
    if(!lemonHint.includes("FDC 172785"))
      pageReport.errors.push("Fourth audit batch lemon pie source missing");
    await page.locator("#mealFoodSearch").fill("galletitas rellenas");
    await page.locator("#mealEditorFood").selectOption("galletitas_rellenas");
    const cookieHint=await page.locator("#mealEditorHint").textContent();
    if(!cookieHint.includes("FDC 172718"))
      pageReport.errors.push("Fourth audit batch sandwich cookies source missing");
    await page.locator('[data-mealgroup="prepared"]').click();
    await page.locator("#mealFoodSearch").fill("tarta atun");
    await page.locator("#mealEditorFood").selectOption("tarta_atun_horno");
    const recipeHint=await page.locator("#mealEditorHint").textContent();
    if(!recipeHint.includes("Receta o preparación estimada")||
       !recipeHint.includes("NO VERIFICADO POR PESAJE")||
       !recipeHint.includes("Peso final al horno SUPUESTO")||
       !recipeHint.includes("Atún al natural escurrido 320 g"))
      pageReport.errors.push("Tuna pie must disclose ingredients, yield and recipe uncertainty");
    await page.locator("#mealFoodSearch").fill("tarta de atun sin tapa");
    await page.locator("#mealEditorFood").selectOption("tarta_atun_light");
    const tunaNoTop=await page.locator("#mealEditorHint").textContent();
    if(!tunaNoTop.includes("Una sola tapa inferior")||!tunaNoTop.includes("930 g"))
      pageReport.errors.push("Open tuna pie model is not transparent");
    await page.locator("#mealFoodSearch").fill("tarta verdura espinaca");
    await page.locator("#mealEditorFood").selectOption("tarta_verdura_espinaca");
    const spinachPie=await page.locator("#mealEditorHint").textContent();
    if(!spinachPie.includes("Espinaca cocida 300 g")||!spinachPie.includes("Ricota magra 180 g"))
      pageReport.errors.push("Spinach pie model ingredient trace is unavailable");
    await page.locator("#mealFoodSearch").fill("tarta jyq");
    await page.locator("#mealEditorFood").selectOption("tarta_jamon_queso");
    const hamPie=await page.locator("#mealEditorHint").textContent();
    if(!hamPie.includes("Jamón cocido 260 g")||!hamPie.includes("Mozzarella 260 g"))
      pageReport.errors.push("Ham-cheese pie model ingredient trace is unavailable");
    // Real browser interaction: omitting an extra protein source must persist,
    // while a prepared tuna pie still contributes every nutrient exactly ONCE.
    await page.locator('[data-mealomit="protein"]').click();
    const marked=await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.diary?.skipped?._guidedComponents?.almuerzo?.protein);
    if(marked!==true)pageReport.errors.push("Optional protein omission was not persisted");
    await page.locator('[data-mealgroup="prepared"]').click();
    await page.locator("#mealFoodSearch").fill("tarta atun");
    await page.locator("#mealEditorFood").selectOption("tarta_atun_horno");
    await page.locator('[data-act="saveSelectedMealContinue"]').click();
    const savedMixed=await page.evaluate(()=>{
      const meals=window.__EFG_VISUAL_QA__.state.diary?.meals?.almuerzo||[];
      const pies=meals.filter(item=>item.id==="tarta_atun_horno");
      return {count:pies.length,p:pies[0]?.p,c:pies[0]?.c,f:pies[0]?.f,k:pies[0]?.k,
        omitted:window.__EFG_VISUAL_QA__.state.diary?.skipped?._guidedComponents?.almuerzo?.protein};
    });
    if(savedMixed.count!==1||!(savedMixed.p>0&&savedMixed.c>0&&savedMixed.f>0&&savedMixed.k>0)||savedMixed.omitted!==true)
      pageReport.errors.push("Mixed tuna pie must register once incl protein, carbs, fat after optional omission: "+JSON.stringify(savedMixed));
    if((await page.locator("[data-mealgroup]").count())!==4)
      pageReport.errors.push("Add and continue did not reopen guided meal");
    await page.locator('[data-act="closeMeal"]').click();
    await page.evaluate(async previous=>{
      const fixture=window.__EFG_VISUAL_QA__;fixture.state.diary=previous;await fixture.render();
      fixture.openMealDialog("media_manana");
    },beforeGuided);
    if(await page.locator("[data-mealgroup],[data-mealomit]").count())
      pageReport.errors.push("Media mañana must retain classic food selector");
    if((await page.locator('#mealEditorFood option').count())<10)
      pageReport.errors.push("Media mañana classic selector lost food categories");
    await page.locator('[data-act="closeMeal"]').click();
   }
   if(role==="student"&&dest==="recipes"){
     if((await page.locator(".efg-fit-card").count())!==12)pageReport.errors.push("Fit recipe library should show 12 cards");
     if(!(await page.getByText("Budín de avena y manzana de Edu",{exact:true}).count()))pageReport.errors.push("Edu budin missing");
     await page.locator('[data-fitfilter="Almuerzos y cenas"]').click();
     if((await page.locator(".efg-fit-card").count())!==6)pageReport.errors.push("Fit category filter did not narrow to six meals");
     await page.locator('[data-fitfilter="all"]').click();
   }
   if((role==="coach"||role==="admin")&&dest==="payments"){
     if(!(await page.locator("#coachAlias").count()))pageReport.errors.push("Coach alias editor missing in payments");
     if(!(await page.getByText("Comprobantes de mis alumnos",{exact:true}).count()))pageReport.errors.push("Coach receipts inbox missing");
     if(!(await page.getByText("Alex Gómez",{exact:false}).count()))pageReport.errors.push("Sender name missing in coach inbox");
     if((await page.locator(".efg-payment-inbox .efg-payment-item").count())!==1)pageReport.errors.push("Coach receipts inbox should contain one org-scoped receipt");
     if(role==="admin"&&!(await page.getByText("COBRAR LICENCIAS DE COACHES",{exact:true}).count()))pageReport.errors.push("Admin license billing view is missing");
   }
   if(role==="student"&&dest==="weight"){
     for(const heading of ["Energía y macronutrientes","Objetivos nutricionales","Constancia de registro","Energía por comida"]){
       if(!(await page.getByText(heading,{exact:true}).count()))pageReport.errors.push("Missing chart "+heading);
     }
     await page.locator('[data-progress-range="30"]').click();
     if((await page.locator('[data-progress-range="30"]').getAttribute("aria-pressed"))!=="true")pageReport.errors.push("30-day filter not activated");
     await page.locator('[data-progress-range="90"]').click();
     if((await page.locator('[data-progress-range="90"]').getAttribute("aria-pressed"))!=="true")pageReport.errors.push("90-day filter not activated");
     await page.locator('[data-progress-range="7"]').click();
   }
   if(role==="student"&&dest==="home"){
    const ring=page.locator(".efg-pastel-ring");
    if((await ring.count())!==1)pageReport.errors.push("Phase 3 ring missing");
    else{
     const ringLabel=await ring.getAttribute("aria-label")||"";
     if(!ringLabel.includes("560")||!ringLabel.includes("2.100"))pageReport.errors.push("Ring does not reflect REAL diary: "+ringLabel);
     const rendered=await page.locator(".efg-pastel-day").innerText();
     if(!rendered.includes("560")||!rendered.includes("1.540"))pageReport.errors.push("Energy remainder incorrect");
     if(!rendered.includes("3")||!rendered.includes("77"))pageReport.errors.push("Macro/meal count incorrect");
     if(rendered.includes("6.200")||rendered.includes("1,5 L"))pageReport.errors.push("Fake health metrics detected");
     if(await page.locator(".efg-pastel-register,#studentQuickAdd").count())
       pageReport.errors.push("Redundant register button or colored picker still visible");
    }
   }
   if(role==="student"&&dest==="home"){
    const mealCount=await page.locator(".student-meal-card").count();
    if(mealCount!==6)pageReport.errors.push("Expected six meal cards, got "+mealCount);
    if(await page.locator('.student-meal-card [data-setmeal]').count()!==6)
      pageReport.errors.push("Each meal needs its own Add food button");
    const macroPositions=await page.locator(".efg-pastel-macros > .efg-pastel-macro").evaluateAll(cards=>cards.map(x=>({width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})));
    if(macroPositions.length!==3)pageReport.errors.push("Must show 3 macros beside the circular chart");
    if(macroPositions.some(x=>x.width<(width<=355?65:85)||x.height<25))pageReport.errors.push("Macro bars too small on mobile");
    if(await page.locator(".efg-student-macros > .metric-card").count())pageReport.errors.push("Duplicate macro KPI cards were not removed");
    const shortcut=page.locator('button[data-scrollto="studentMeals"]');
    await shortcut.click();
    const focus=await page.locator("#studentMeals").evaluate(x=>x===document.activeElement);
    if(!focus)pageReport.errors.push("Meals shortcut did not focus meals section");
   }
   if(role==="admin"&&dest==="admin"){
    const banner=await page.locator(".efg-admin-banner").evaluate(el=>({w:el.getBoundingClientRect().width,titleW:el.querySelector("h2").getBoundingClientRect().width,titleY:el.querySelector("h2").getBoundingClientRect().y,eyebrowY:el.querySelector(".eyebrow").getBoundingClientRect().y}));
    if(banner.titleW<banner.w*0.6 || banner.titleY<=banner.eyebrowY)pageReport.errors.push("Admin hero is squeezed into columns");
   }
   if(width===390 || width===360 || ((width===320||width===768||width===1280)&&dest===destinations[0])){
     await page.screenshot({path:join(outDir,engine+"-"+role+"-"+width+"-"+dest+".png"),fullPage:true,animations:"disabled"});
   }
  }
  // Global Luxury includes FIRST-LOGIN, onboarding and OTP; do not treat
  // dashboard-only screenshots as proof that the whole app is themed.
  if(role==="student"&&width===390){
    await page.evaluate(async()=>{
      const x=window.__EFG_VISUAL_QA__;x.state.welcomePending=true;await x.render();
    });
    const welcome=page.locator(".efg-onboard");
    if(!(await welcome.isVisible()))pageReport.errors.push("Luxury onboarding missing");
    const welcomeBrand=page.locator(".efg-onboard-serotonin");
    if((await welcomeBrand.count())!==1||(await welcomeBrand.evaluate(el=>el.naturalWidth))<60)
      pageReport.errors.push("Watercolor serotonin mark missing in onboarding");
    const welcomeStyle=await page.locator(".efg-onboard-copy").evaluate(el=>getComputedStyle(el).backgroundImage);
    if(!welcomeStyle.includes("gradient"))pageReport.errors.push("Onboarding lacks premium material");
    await page.screenshot({path:join(outDir,engine+"-student-390-onboarding.png"),fullPage:true,animations:"disabled"});
    await page.evaluate(async()=>{
      const x=window.__EFG_VISUAL_QA__;x.state.welcomePending=false;x.state.profile=null;await x.render();
    });
    const login=page.locator(".pilot-login");
    if(!(await login.isVisible()))pageReport.errors.push("Luxury login missing");
    const loginMark=page.locator(".efg-login-brandmark");
    if((await loginMark.count())!==1||(await loginMark.evaluate(el=>el.naturalWidth))<60)
      pageReport.errors.push("Serotonin logo missing from private sign-in");
    const loginMaterial=await page.locator(".pilot-login-art").evaluate(el=>getComputedStyle(el).backgroundImage);
    if(!loginMaterial.includes("gradient"))pageReport.errors.push("Sign-in lacks luxury texture");
    if((await page.locator("#loginEmail").count())!==1)pageReport.errors.push("Email OTP form lost");
    const loginWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
    if(loginWidth>390+2)pageReport.errors.push("Login horizontal overflow "+loginWidth);
    await page.screenshot({path:join(outDir,engine+"-student-390-login.png"),fullPage:true,animations:"disabled"});
  }
  // Real iPhone regression: silent auth must not close the coach's objectives accordion.
  if(role==="coach"&&width===390){
   await page.evaluate(async()=>{
    const x=window.__EFG_VISUAL_QA__;
    x.state.tab="coachStudents";x.state.selectedStudent="demo-student-a";
    x.state.consent={accepted:true};
    x.state.coachGoals=[{id:"goal-demo",kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28,start_on:"2026-10-01"}];
    x.state.coachFoodPlan=null;await x.render();
   });
   const goals=page.locator("#coachStudentGoals");
   await page.locator("details#coachStudentGoals > summary").click();
   await page.locator("#targetAge").fill("41");
   // Safari WebKit puede animar scrollTo de forma asíncrona; comparar cuando la animación terminó.
   await page.evaluate(()=>window.scrollTo({top:1500,behavior:"instant"}));
   await page.waitForTimeout(engine==="webkit"?220:40);
   const previousY=await page.evaluate(()=>window.scrollY);
   await page.evaluate(async()=>{
    const x=window.__EFG_VISUAL_QA__;
    x.handleAuthStateChange("SIGNED_IN",{user:{id:"demo-coach",email:"demo@example.invalid"}});
    x.handleAuthStateChange("TOKEN_REFRESHED",{user:{id:"demo-coach",email:"demo@example.invalid"}});
    await Promise.resolve();
   });
   await page.waitForTimeout(60);
   if(!(await goals.evaluate(el=>el.open)))pageReport.errors.push("Objectives accordion collapsed after silent auth");
   if((await page.locator("#targetAge").inputValue())!=="41")pageReport.errors.push("Coach form lost after silent auth");
   await page.evaluate(async()=>window.__EFG_VISUAL_QA__.render()); // Real same-screen redraw.
   await page.waitForTimeout(80);
   if(!(await goals.evaluate(el=>el.open)))pageReport.errors.push("Objectives accordion collapsed on same-page render");
   if((await page.locator("#targetAge").inputValue())!=="41")pageReport.errors.push("Coach form lost on same-page render");
   const nextY=await page.evaluate(()=>window.scrollY);
   if(Math.abs(nextY-previousY)>48)pageReport.errors.push("Unexpected scroll after restoring view: "+previousY+" -> "+nextY);
  }
  if(role==="coach"&&width===390){
   // Simulate a deployment. The latest HTML differs, but no real GitHub or Render calls.
   const freshHtml=(await page.locator("html").evaluate(el=>el.outerHTML))
    .replace(/(<meta name="efg-build" content=")[^"]+(")/,'$1QA-new-build$2')
    .replace(/\.\/pilot\.js\?v=[^"']+/,'./pilot.js?v=QA-new-build');
   await page.route("**/pilot/index.html?efg_version_check=*",route=>
    route.fulfill({status:200,contentType:"text/html",body:"<!doctype html>"+freshHtml}));
   await page.evaluate(async()=>{
    await window.__EFG_VISUAL_QA__.versionNotice.check({force:true});
   });
   const banner=page.locator("#efgVersionNotice");
   if(await banner.isVisible())pageReport.errors.push("Minor build displayed an unsolicited banner");
   await page.locator("#targetAge").fill("42");
   await page.evaluate(()=>window.__EFG_VISUAL_QA__.versionNotice.check({force:true,reopen:true}));
   if(await banner.isVisible())pageReport.errors.push("Manual diagnostics displayed a release ceremony");
   if(await page.locator("#targetAge").inputValue()!=="42")pageReport.errors.push("Silent check lost draft");
   await page.evaluate(async()=>{
    const x=window.__EFG_VISUAL_QA__;
    x.state.tab="coachTools";await x.render();
   });
   const manualCheck=page.locator('[data-act="checkAppVersion"]');
   if(!(await manualCheck.count()))pageReport.errors.push("Manual version checker missing from Coach More");
   else{
    await manualCheck.click();
    await page.waitForFunction(()=>/nueva versión|Estás al día|No se pudo comprobar|La comprobación sigue/.test(
     document.getElementById("efgBuildStatus")?.textContent||""),{timeout:6000});
    const label=await page.locator("#efgBuildStatus").textContent();
    const visible=await banner.isVisible();
    if(!label.includes("nueva versión")||visible)
     pageReport.errors.push("Inline version diagnostic failed: label="+label+", visible="+visible);
   }
   await page.unroute("**/pilot/index.html?efg_version_check=*");
  }
  results.push(pageReport);
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
const report={timestamp:new Date().toISOString(),scenarios:results,blockedBackendCalls,errors};
writeFileSync(join(outDir,"report-"+engine+".json"),JSON.stringify(report,null,2));
const failed=errors.concat(results.flatMap(x=>x.errors.map(e=>x.role+"/"+x.width+": "+e)));
console.log(JSON.stringify({engine,passed:failed.length===0,scenarios:results.length,pages:results.reduce((n,x)=>n+x.pages.length,0),backendRequestsBlocked:blockedBackendCalls,issues:failed},null,2));
assert.equal(blockedBackendCalls,0,"Fixture attempted a production backend connection");
if(failed.length)process.exitCode=1;
