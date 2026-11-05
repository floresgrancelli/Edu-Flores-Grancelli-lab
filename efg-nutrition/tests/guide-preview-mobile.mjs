// Real renderer/handlers, synthetic transport only; no remote requests or patients.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.cwd(),out=resolve('artifacts/guide-preview');mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname,file=resolve(base,'.'+(path.endsWith('/')?path+'index.html':path));
 assert.ok(file.startsWith(base+'/'));let bytes=readFileSync(file);
 if(path.endsWith('/pilot.js'))bytes=Buffer.from(bytes.toString()+`\nwindow.__GUIDE_QA__={state,root,foods,sb,coachDraftClient,guideTotals,readGuidedEditor,coachGuidedSection,coachAtomicDraftPanel,previewCoachGuide,sendCoachGuidePreview,generateFlexibleGuidedDay,render,frame,studentPrimaryNavigation,studentSecondaryNavigation,studentPendingTabAllowed,studentMoreView,efgNavIcon,installSuccess(){coachDraftClient.publish=async payload=>{window.trace.publishes++;window.trace.keys.push(payload.requestId);return {studentId:payload.studentId,goalId:'44444444-4444-4444-8444-444444444444',requestId:payload.requestId};};}};`);
 res.writeHead(200,{'content-type':({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(file)]||'application/octet-stream'});res.end(bytes);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const engine=process.env.EFG_QA_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'Unsupported QA engine');
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'&&process.env.EFG_CHROME_PATH?{executablePath:process.env.EFG_CHROME_PATH}:{})});
const results=[];
try{for(const role of ['coach','admin'])for(const width of [360,390,1280]){
 const ctx=await browser.newContext({viewport:{width,height:850},hasTouch:true,isMobile:width<720});
 await ctx.route('**/*',route=>{
  if(route.request().url().startsWith('http://127.0.0.1:'))return route.continue();
  if(route.request().url().startsWith('https://esm.sh/'))return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:`export function createClient(){const q={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:null,error:null}),then(r){r({data:[],error:null})}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>q,rpc:async()=>({data:null,error:null})}}`});
  return route.abort();
 });
 const page=await ctx.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/efg-nutrition/pilot/`);await page.waitForFunction(()=>window.__GUIDE_QA__);
 await page.evaluate(role=>{
  const v=window.__GUIDE_QA__,s=v.state;
  s.selectedStudent='11111111-1111-4111-8111-111111111111';s.session={user:{id:'22222222-2222-4222-8222-222222222222'}};s.consent={accepted:true};s.profile={role,active:true,nickname:'Coach ficticio'};s.org={id:'55555555-5555-4555-8555-555555555555',is_test:true,seat_limit:10};s.tab='coachStudents';s.roster=[{user_id:s.selectedStudent,nickname:'Alumno ficticio',active:true,email:'student@example.invalid'}];
  s.coachIntakeForms={[s.selectedStudent]:{shared_at:'2026-11-04',updated_at:'2026-11-04',revision:1,completed_version:'coach_major_2026_r1'}};
  s.pendingGoal={goal_type:'maintenance',kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};
  s.coachGuidedDraft=v.generateFlexibleGuidedDay(v.foods,s.pendingGoal,{patternId:'balanced',restrictionStatus:'none_declared',restrictions:[]});
  s.coachGuidedDraft.supplementNote='Nota ficticia de prueba';
  s.coachPlanDraftRecord=null;
  window.trace={saves:0,publishes:0,keys:[],failSave:false,sourceReads:0};
  v.sb.rpc=async(name)=>{if(name!=='efg_coach_guide_catalog')throw Error('Unexpected RPC '+name);trace.sourceReads++;const rows=[...new Map(s.coachGuidedDraft.meals.flatMap(m=>m.items).map(f=>[f.id,f])).values()].map(f=>({...f,sourceType:'synthetic_fixture',dataQuality:'estimated',sourceUrl:'https://example.invalid/'+f.id}));return {data:{version:'ncc-catalog-0123456789abcdef',foods:rows},error:null};};
  v.coachDraftClient.save=async payload=>{window.trace.saves++;await new Promise(r=>setTimeout(r,50));if(window.trace.failSave)throw Error('Fallo sintético de guardado');window.saved={student_id:s.selectedStudent,status:'draft',draft_revision:window.trace.saves,source_intake_updated_at:'2026-11-04',source_intake_revision:1,goal_proposal:payload.goal,guide_proposal:payload.guide};return {revision:window.trace.saves};};
  v.coachDraftClient.load=async()=>structuredClone(window.saved);
  v.coachDraftClient.publish=async payload=>{window.trace.publishes++;window.trace.keys.push(payload.requestId);await new Promise(r=>setTimeout(r,60));throw Error('Guide foods are not independently reviewed and current');};
  v.root.className='efg-role-'+role;v.frame(v.coachGuidedSection()+v.coachAtomicDraftPanel());
 },role);
 const touchEvidence={};
 const mobileTouch=engine==='chromium'&&width<720;
 const cdp=mobileTouch?await ctx.newCDPSession(page):null;
 const swipe=async()=>{
  const x=Math.round(width*.8),fromY=600,toY=180;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:fromY}]});
  for(let step=1;step<=12;step++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:fromY+(toY-fromY)*step/12}]});
   await page.waitForTimeout(18);
  }
  // Pause the finger before release so the next measurement cannot race a fling.
  await page.waitForTimeout(180);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:toY}]});
  await page.waitForTimeout(100);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(700);
 };
 // fresh.css enables smooth scrolling; wait for an actual top position before measuring native gestures.
 const top=async()=>{
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.waitForTimeout(100);
  // A compositor scroll update may arrive after the first main-thread reset.
  if(await page.evaluate(()=>scrollY!==0))await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.waitForFunction(()=>window.scrollY===0);
 };
 if(mobileTouch){
  const oldCss=await page.addStyleTag({content:'@media(max-width:720px){html,body{overflow-x:hidden!important}}'});
  await top();await swipe();touchEvidence.baselineEditor=await page.evaluate(()=>window.scrollY);
  await oldCss.evaluate(el=>el.remove());await top();await swipe();
  touchEvidence.editor=await page.evaluate(()=>window.scrollY);
  assert.ok(touchEvidence.editor>50,JSON.stringify({role,width,...touchEvidence})+' actual touch scrolls the editor');
  await top();
 }
 if(mobileTouch)console.log(JSON.stringify({role,width,touchEvidence}));
 const before=await page.evaluate(()=>{const v=window.__GUIDE_QA__;return JSON.stringify(v.state.coachGuidedDraft)});
 await page.evaluate(()=>window.__GUIDE_QA__.readGuidedEditor());
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__GUIDE_QA__.state.coachGuidedDraft)),before,'Render/read preserves exact canonical quantities and note');
 const geometry=await page.locator('#coachGuidedSlot [data-guideqty],#coachGuidedSlot [data-guideswap]').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,font:parseFloat(getComputedStyle(n).fontSize)})));
 assert.ok(geometry.length>10);for(const g of geometry){assert.ok(g.w>=120&&g.h>=44&&g.font>=16,JSON.stringify(g));}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal scroll');
 // At the top edge, a downward gesture on guide text belongs to native scroll.
 assert.equal(await page.evaluate(()=>{
  window.scrollTo(0,0);
  const el=document.querySelector('#coachGuidedSlot .efg-guide-meal');
  // Portable synthetic controller events: WebKit does not expose a public
  // Touch constructor. These exercise the mounted listener, not physical input.
  const touchEvent=(name,y)=>{
   const event=new Event(name,{bubbles:true,cancelable:name==='touchmove'});
   Object.defineProperty(event,'touches',{value:y===null?[]:[{identifier:1,target:el,clientX:100,clientY:y}]});
   return event;
  };
  el.dispatchEvent(touchEvent('touchstart',50));
  const event=touchEvent('touchmove',180);
  el.dispatchEvent(event);el.dispatchEvent(touchEvent('touchcancel',null));
  return event.defaultPrevented;
 }),false,'Guide never claims native downward touch for pull-to-refresh');
 const eggKey=await page.evaluate(()=>{const s=window.__GUIDE_QA__.state;for(const m of s.coachGuidedDraft.meals){const i=m.items.findIndex(f=>f.id==='egg');if(i>=0)return m.slot+':'+i;}});
 assert.ok(eggKey);await page.locator(`[data-guideqty="${eggKey}"]`).fill('2');
 assert.equal(await page.evaluate(key=>{const [slot,i]=key.split(':');return window.__GUIDE_QA__.state.coachGuidedDraft.meals.find(m=>m.slot===slot).items[i].qty},eggKey),100,'2 catalog eggs = 100g');
 await page.locator(`[data-guideqty="${eggKey}"]`).blur();
 const breadKey=await page.evaluate(()=>{for(const m of window.__GUIDE_QA__.state.coachGuidedDraft.meals){const i=m.items.findIndex(f=>f.id==='bread');if(i>=0)return m.slot+':'+i;}});
 assert.ok(breadKey);await page.locator(`[data-guideqty="${breadKey}"]`).fill('1');
 assert.equal(await page.evaluate(key=>{const [slot,i]=key.split(':');return window.__GUIDE_QA__.state.coachGuidedDraft.meals.find(m=>m.slot===slot).items[i].qty},breadKey),30,'1 catalog slice = 30g');
 await page.locator(`[data-guideqty="${breadKey}"]`).blur();
 const equivalent=await page.evaluate(()=>{const v=window.__GUIDE_QA__,plan=v.state.coachGuidedDraft;return JSON.stringify(v.guideTotals(plan))===JSON.stringify(v.guideTotals(v.readGuidedEditor()));});assert.equal(equivalent,true,'Portion round trip preserves all nutrition totals');
 await page.screenshot({path:resolve(out,`editor-${engine}-${role}-${width}.png`),fullPage:true});
 await page.getByRole('button',{name:'Ver dieta armada y enviar'}).click();
 assert.equal(await page.locator('#coachGuidePreview .efg-guide-meal').count(),6);
 assert.equal(await page.locator('#coachGuidePreview [data-guideqty]').count(),0);
 assert.match(await page.locator('#coachGuidePreview').innerText(),/2 × huevo mediano/);
 assert.match(await page.locator('#coachGuidePreview').innerText(),/Nota ficticia de prueba/);
 await page.screenshot({path:resolve(out,`preview-${engine}-${role}-${width}.png`)});
 if(mobileTouch){
  await page.evaluate(()=>document.getElementById('coachGuidePreview').scrollTop=0);
  await swipe();touchEvidence.dialog=await page.locator('#coachGuidePreview').evaluate(el=>el.scrollTop);
  assert.ok(touchEvidence.dialog>50,JSON.stringify({role,width,...touchEvidence})+' actual touch scrolls the dialog');
 }

 await page.getByRole('button',{name:'Volver a editar'}).click();assert.equal(await page.locator('#coachGuidePreview').count(),0);
 assert.deepEqual(await page.evaluate(()=>[trace.saves,trace.publishes]),[0,0]);
 if(mobileTouch){await top();touchEvidence.closeState=await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,viewport:innerHeight,active:document.activeElement?.outerHTML.slice(0,180),target:document.elementFromPoint(innerWidth*.8,600)?.outerHTML.slice(0,180),overflow:[getComputedStyle(document.documentElement).overflowY,getComputedStyle(document.body).overflowY],dialogs:document.querySelectorAll('dialog[open]').length}));await swipe();touchEvidence.afterClose=await page.evaluate(()=>window.scrollY);assert.ok(touchEvidence.afterClose>50,JSON.stringify({role,width,...touchEvidence})+' editor remains touch-scrollable after closing preview');await top();}

 await page.getByRole('button',{name:'Ver dieta armada y enviar'}).click();
 await page.evaluate(()=>trace.failSave=true);
 await page.evaluate(()=>window.__GUIDE_QA__.sendCoachGuidePreview().catch(()=>{}));
 assert.match(await page.locator('[data-coach-preview-error]').innerText(),/No se pudo confirmar el guardado/);
 assert.equal(await page.evaluate(()=>trace.publishes),0);
 await page.evaluate(()=>trace.failSave=false);
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Aprobar y enviar',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-act="sendCoachGuidePreview"]').disabled);
 assert.equal(await page.evaluate(()=>trace.publishes),0,'Cancel confirmation does not publish');assert.match(await page.locator('[data-coach-preview-status]').innerText(),/Envío cancelado/);
 page.on('dialog',d=>d.accept());
 await page.evaluate(()=>Promise.all([window.__GUIDE_QA__.sendCoachGuidePreview().catch(()=>{}),window.__GUIDE_QA__.sendCoachGuidePreview().catch(()=>{})]));
 assert.equal(await page.evaluate(()=>trace.publishes),1,'Concurrent clicks produce one request');
 await page.evaluate(()=>window.__GUIDE_QA__.sendCoachGuidePreview().catch(()=>{}));
 assert.equal(await page.evaluate(()=>trace.keys[0]===trace.keys[1]),true,'Retry preserves idempotency key');
 assert.equal(await page.evaluate(()=>trace.saves),2,'Already matching saved draft is not saved repeatedly');
 assert.match(await page.locator('[data-coach-preview-error]').innerText(),/No se publicó: falta completar/);
 assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-coach-preview-error')),true,'Rejection receives focus');
 assert.equal(await page.evaluate(()=>window.__GUIDE_QA__.state.coachPlanDraftRecord.status),'draft');
 await page.evaluate(()=>window.__GUIDE_QA__.state.selectedStudent='33333333-3333-4333-8333-333333333333');
 const stale=await page.evaluate(()=>window.__GUIDE_QA__.sendCoachGuidePreview().then(()=>false,()=>true));assert.equal(stale,true);
 await page.evaluate(()=>{const v=window.__GUIDE_QA__;v.state.selectedStudent='11111111-1111-4111-8111-111111111111';v.installSuccess();});
 await page.evaluate(()=>window.__GUIDE_QA__.sendCoachGuidePreview());
 assert.equal(await page.locator('#coachGuidePreview').count(),0);assert.equal(await page.evaluate(()=>window.__GUIDE_QA__.state.tab),'coachStudents');assert.equal(await page.evaluate(()=>window.__GUIDE_QA__.state.selectedStudent),null);assert.equal(await page.locator('#coachRosterSection').count(),1);assert.match(await page.locator('#coachRosterSection').innerText(),/Alumno ficticio/);assert.equal(await page.evaluate(()=>document.activeElement.id),'coachRosterSection');
 assert.equal(await page.evaluate(()=>window.__GUIDE_QA__.state.coachPlanPublishRequestId),null);
 if(width<720){
  for(const route of ['private','review','ready']){
   await page.evaluate(route=>{const v=window.__GUIDE_QA__;v.state.profile={role:'student',active:true,nickname:'Alumno ficticio'};v.state.coachPilotEntry={route};v.state.tab='studentMore';v.frame(v.studentMoreView());},route);
   const nav=page.locator('.pilot-nav .navitem');assert.ok(await nav.count()<=5);
   const geometry=await nav.evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),l=n.querySelector('.nav-label');return {w:b.width,h:b.height,label:l.textContent,nowrap:getComputedStyle(l).whiteSpace,icon:n.querySelector('svg').innerHTML};}));
   for(const g of geometry){assert.ok(g.w>=44&&g.h>=44,JSON.stringify(g));assert.equal(g.nowrap,'nowrap');}
   assert.equal(new Set(geometry.map(g=>g.icon)).size,geometry.length,'Distinct icons');
   assert.equal(await page.locator('.pilot-nav [aria-current="page"]').getAttribute('data-tab'),'studentMore');
   const paths=await page.evaluate(()=>window.__GUIDE_QA__.studentSecondaryNavigation().map(x=>x[0]));
   for(const tab of paths)assert.ok(await page.locator('.efg-menu-grid [data-tab="'+tab+'"]').count(),'Secondary route '+tab);
   if(route!=='ready'){
    assert.deepEqual(paths.slice().sort(),['nutritionScience','privacy','privateHealth'].sort());
    assert.equal(await page.evaluate(()=>window.__GUIDE_QA__.studentPendingTabAllowed('planner')),false,'Pending access remains restricted');
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Student menu fits viewport');
   await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   await page.waitForFunction(()=>scrollY+innerHeight>=document.documentElement.scrollHeight-2);
   assert.ok(await page.evaluate(()=>document.querySelector('.pilot-bottom').getBoundingClientRect().bottom<=document.querySelector('.pilot-nav').getBoundingClientRect().top),'Bottom content clears navigation');
   await page.screenshot({path:resolve(out,`nav-${engine}-${route}-${width}.png`)});
  }
 }
 results.push({engine,role,width,touchEvidence,status:'PASS',checks:['actual renderer','44px/16px controls','no overflow','exact round trip','units to grams','6-meal preview','back without writes','save failure','cancel confirmation','double click','idempotent retry','stale student rejected','confirmed publish returns to roster using real render','approved references resolved before preview','rejection focused and draft preserved']});await ctx.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
writeFileSync(resolve(out,`results-${engine}.json`),JSON.stringify(results,null,2));console.log(JSON.stringify(results));

