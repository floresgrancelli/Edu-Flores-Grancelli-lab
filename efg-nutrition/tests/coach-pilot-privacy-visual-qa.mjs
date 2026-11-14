import {revealIntakeField,selectIntakeChoice} from './intake-step-browser.mjs';
// Actual app/module graph; new journey enabled ONLY in an isolated HTTP fixture.
// No real users, external requests, JWT assertions or hosted data.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.cwd(),out=join(base,'artifacts/premium-visual-qa');
mkdirSync(out,{recursive:true});
const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.avif':'image/avif'};
const server=createServer((req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=resolve(base,'.'+(path.endsWith('/')?path+'index.html':path));
  assert.ok(file.startsWith(base+'/'));
  let bytes=readFileSync(file);
  if(path.endsWith('/coach-student-journey.js'))bytes=Buffer.from(bytes.toString().replace('COACH_STUDENT_JOURNEY_ENABLED=false','COACH_STUDENT_JOURNEY_ENABLED=true'));
  if(path.endsWith('/science-welcome.js'))bytes=Buffer.from(bytes.toString().replace('SCIENCE_WELCOME_ENABLED=false','SCIENCE_WELCOME_ENABLED=true'));
  if(path.endsWith('/major-release-client.js'))bytes=Buffer.from(bytes.toString().replace('MAJOR_RELEASE_FLOW_ENABLED=false','MAJOR_RELEASE_FLOW_ENABLED=true'));
  if(path.endsWith('/release-communications.js'))bytes=Buffer.from(bytes.toString().replace('RELEASE_COMMUNICATIONS_ENABLED=false','RELEASE_COMMUNICATIONS_ENABLED=true'));
  if(path.endsWith('/pilot.js'))bytes=Buffer.from(bytes.toString()+'\nwindow.__PILOT_QA__={state,render,refresh,sb};');
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Fixture missing')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const engine=process.env.EFG_QA_ENGINE==='webkit'?'webkit':'chromium';
const browser=await({chromium,webkit}[engine]).launch({headless:true});
const issues=[],results=[];
const stub=`export function createClient(){const q={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:null,error:null}),then(r){r({data:[],error:null})}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>q,rpc:async()=>({data:null,error:null})}}`;
try{
 for(const width of [360,1280]){
  const context=await browser.newContext({viewport:{width,height:850},isMobile:width<600,hasTouch:true});
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(url.startsWith('http://127.0.0.1:'))return route.continue();
   if(url.startsWith('https://esm.sh/'))return route.fulfill({status:200,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:stub});
   return route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',e=>issues.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/efg-nutrition/pilot/`);
  await page.waitForFunction(()=>window.__PILOT_QA__);
  await page.evaluate(async()=>{
   const {state,render}=window.__PILOT_QA__;
   const id='11111111-1111-4111-8111-111111111111',org='22222222-2222-4222-8222-222222222222';
   Object.assign(state,{session:{user:{id}},profile:{user_id:id,organization_id:org,role:'student',active:true,nickname:'Alumno ficticio'},
    tab:'intake',consent:{accepted:true},planAccessSupported:true,planAccess:{status:'pending'},
    coachPilotEntry:{route:'review',canLogMeals:false},coachPilotIntake:{student_id:id,organization_id:org,
     completed_version:'coach_major_2026_r1',revision:2,shared_at:'2026-10-31T10:00:00Z',updated_at:'2026-10-31T10:00:00Z',
     objective:'recomp',age_years:40,height_cm:174,weight_kg:80,dietary_pattern:'keto',eating_window:'14_10',activity_level:'moderate'}});
   await render();
  });
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  assert.equal(await page.locator('#coachRelaunch_dietary_pattern').inputValue(),'keto');
  assert.equal(await page.locator('#coachRelaunch_eating_window').inputValue(),'14_10');
  assert.equal(await page.locator('[data-act="revokeCoachRelaunch"]').count(),1);
  assert.equal(await page.locator('[data-act="clearCoachRelaunch"]').count(),1);
  assert.equal(await page.locator('[name="gutClinicalCondition"]').count(),0,
   'Released private-health flow removes legacy clinical controls from general intake');
  await revealIntakeField(page,'dietary_pattern');
  assert.match(await page.locator('#efgCoachRelaunchManageForm').innerText(),/Mis restricciones/);
  assert.equal(await page.locator('[name="gutClinicalCondition"]:enabled').count(),0);
  await page.evaluate(async()=>{window.__PILOT_QA__.state.tab='privacy';await window.__PILOT_QA__.render()});
  await page.getByRole('button',{name:'Revisar mi ficha y su permiso'}).click();
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  await page.evaluate(async()=>{window.__PILOT_QA__.state.coachPilotEntry={route:'ready',canLogMeals:true};await window.__PILOT_QA__.render()});
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  const contrast=await page.locator('.efg-coach-relaunch').evaluate(panel=>{
   const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
   const lum=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   return [...panel.querySelectorAll('button,input:not([type=checkbox]),select,textarea')].filter(el=>el.getClientRects().length).map(el=>{
    const cs=getComputedStyle(el),a=lum(rgb(cs.color)),b=lum(rgb(cs.backgroundColor));
    return {id:el.id||el.textContent.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
   });
  });
  assert.ok(contrast.length>=8,'Verify actual mounted intake controls');
  assert.deepEqual(contrast.filter(x=>x.ratio<4.5),[],'Intake control contrast must reach 4.5:1');
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(bounds.scroll<=width+2,'Horizontal overflow '+JSON.stringify(bounds));
  await page.screenshot({path:join(out,`pilot-privacy-${engine}-${width}.png`),fullPage:true});
  // P30N: submit the actual NEW form, preserving every field after repeated
  // missing-permission, backend and session failures. Transport is synthetic.
  await page.evaluate(async()=>{
   const {state,sb,render}=window.__PILOT_QA__;
   const profile=state.profile;
   const trace=window.__intakeTest={writes:0,sharing:false,sessionChanged:false};
   state.coachPilotIntake=null;
   state.coachPilotEntry={route:'intake',canLogMeals:false};
   sb.auth.getUser=async()=>({data:{user:{id:trace.sessionChanged?profile.organization_id:profile.user_id}},error:null});
   sb.from=table=>{
    const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({error:null,data:
     table==='efg_pilot_participation_receipts'?{student_id:profile.user_id,organization_id:profile.organization_id,
      version:'coach_pilot_2026_demo1',participation_accepted:true,sharing_accepted:trace.sharing,
      acceptance_method:'two_explicit_checkboxes',accepted_at:'2026-10-30T15:00:00Z',revoked_at:null}:
     table==='efg_consents'?{student_id:profile.user_id,accepted:true}:null})};
    return query;
   };
   sb.rpc=async()=>{trace.writes++;return {data:null,error:{message:'Synthetic backend failure'}}};
   await render();
  });
  const newForm=page.locator('#efgCoachRelaunchForm');
  await newForm.waitFor();
  assert.equal(await newForm.locator('[data-intakepanel]:visible').count(),1);
  await revealIntakeField(page,'share');
  await newForm.locator('button[type="submit"]').click();
  assert.equal(await newForm.locator('[data-intakepanel="0"]').isVisible(),true,'Invalid hidden field opens its step');
  assert.equal(await page.evaluate(()=>window.__intakeTest.writes),0,'Incomplete required data never reaches backend');

  for(const [field,value] of Object.entries({objective:'recomp',activity_level:'moderate',dietary_pattern:'keto',eating_window:'14_10'}))
   {await revealIntakeField(page,field);await selectIntakeChoice(page,field,value);}
  for(const [field,value] of Object.entries({age_years:'40',height_cm:'174',weight_kg:'80',preferred_foods:'Arroz ficticio',disliked_foods:'Ninguno',meal_routine:'12 y 20',notes:'Ensayo sintético'}))
   {await revealIntakeField(page,field);await page.locator('#coachRelaunch_'+field).fill(value);}
  await revealIntakeField(page,'share');
  await page.locator('#coachRelaunch_share').check();
  const formSnapshot=()=>newForm.evaluate(form=>Array.from(form.querySelectorAll('input,select,textarea')).map(el=>({id:el.id,value:el.value,checked:el.checked})));
  const originalFields=await formSnapshot();
  await page.locator('.ncc-intake-steps [data-intakestep="0"]').click();
  assert.equal(await newForm.locator('[data-intakepanel]:visible').count(),1);
  assert.equal(await page.locator('#coachRelaunch_age_years').inputValue(),'40');
  await newForm.evaluate(form=>form.requestSubmit());
  assert.equal(await newForm.locator('[data-intakepanel="3"]').isVisible(),true,'Enter from an earlier step opens review without saving');
  assert.equal(await page.evaluate(()=>window.__intakeTest.writes),0);
  await revealIntakeField(page,'age_years');
  await page.locator('[data-intakenext="1"]').click();
  await page.locator('[data-intakenext="2"]').click();
  await page.locator('[data-intakenext="3"]').click();
  assert.match(await newForm.locator('[data-intakereview]').innerText(),/Arroz ficticio/);
  assert.deepEqual(await formSnapshot(),originalFields,'Back and forward preserve all fields and sharing');
  assert.equal(await page.evaluate(()=>window.__intakeTest.writes),0,'Step navigation never writes');

  for(let retry=0;retry<2;retry++){
   await newForm.locator('button[type="submit"]').click();
   await page.waitForFunction(()=>document.querySelector('#efgCoachIntakeSaveError')?.textContent.includes('Falta el permiso de compartir'));
   assert.deepEqual(await formSnapshot(),originalFields,'Missing permission preserves the entire form');
  }
  assert.equal(await page.evaluate(()=>window.__intakeTest.writes),0,'No intake RPC without separate sharing permission');
  await page.screenshot({path:join(out,`pilot-intake-permission-${engine}-${width}.png`),fullPage:true});
  // Choosing private saving reaches the server, whose failure still preserves edits.
  await page.locator('#coachRelaunch_share').uncheck();
  const privateFields=await formSnapshot();
  for(let retry=0;retry<2;retry++){
   await newForm.locator('button[type="submit"]').click();
   await page.waitForFunction(n=>window.__intakeTest.writes===n,retry+1);
   await page.waitForFunction(()=>document.querySelector('#efgCoachIntakeSaveError')?.textContent==='No fue posible guardar la ficha nueva.');
   assert.deepEqual(await formSnapshot(),privateFields,'Backend rejection preserves fields and private choice');
  }
  await page.evaluate(()=>{window.__intakeTest.sessionChanged=true});
  await newForm.locator('button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#efgCoachIntakeSaveError')?.textContent.includes('identidad'));
  assert.equal(await page.evaluate(()=>window.__intakeTest.writes),2,'Changed session cannot write');
  assert.deepEqual(await formSnapshot(),privateFields);
  // Hydrate the real app with both release gates enabled. A failed read must
  // still present education; a failed acknowledgement must permit a retry.
  await page.evaluate(async()=>{
   const {state,sb,refresh}=window.__PILOT_QA__;
   const profile=state.profile,user={id:profile.user_id};
   const trace=window.__introTest={legalReads:0,acks:0};
   let receipt=null;
   sb.auth.getUser=async()=>({data:{user}});
   sb.auth.getSession=async()=>({data:{session:{user}}});
   sb.from=table=>{
    const query={select:()=>query,eq:()=>query};
    if(table==='efg_profiles'){
     query.single=query.maybeSingle=async()=>({data:profile});
     return query;
    }
    if(table==='efg_science_intro_receipts'){
     query.maybeSingle=async()=>({data:receipt,error:receipt?null:{message:'offline'}});
     return query;
    }
    throw Error('Unexpected table during relaunch: '+table);
   };
   sb.rpc=async(name,args)=>{
    if(name==='efg_claim_invitation')return {data:true};
    if(name==='efg_major_release_status')return {data:{phase:'legal',id:'major_fixture'}};
    if(name==='efg_legal_current_status'){trace.legalReads++;return {data:[]};}
    if(name==='efg_ack_science_intro'){
     if(++trace.acks===1)return {error:{message:'offline'}};
     receipt={user_id:user.id,version:args.p_version,seen_at:new Date().toISOString()};
     return {data:true};
    }
    throw Error('Unexpected RPC during relaunch: '+name);
   };
   await refresh();
  });
  assert.equal(await page.locator('[data-science-step="1"]').count(),1,'education before major-release legal');
  assert.equal(await page.evaluate(()=>window.__introTest.legalReads),0);
  for(let step=1;step<9;step++)await page.locator('[data-act="scienceNext"]').click();
  assert.equal(await page.locator('[data-science-step="9"] .ns-wellbeing').count(),1,'serotonin finale is ninth');
   const finish=page.locator('[data-act="scienceFinish"]');
  await finish.click();
  await page.locator('.ns-welcome-error').waitFor();
  assert.equal(await finish.isEnabled(),true,'retry after a failed educational receipt');
  await finish.click();
  await page.locator('.efg-coach-legal').waitFor();
  await page.evaluate(()=>window.__PILOT_QA__.refresh());
  assert.equal(await page.locator('.efg-coach-legal').count(),1,'returning student with receipt goes to legal');
  assert.equal(await page.locator('.ns-welcome-slide').count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__introTest),{legalReads:2,acks:2});
  results.push({engine,width,waitingPrivacy:true,publishedEditable:true,clinicalDisabled:true,educationBeforeReleaseLegal:true});
  await context.close();
 }
 assert.deepEqual(issues,[]);
}finally{await browser.close();await new Promise(r=>server.close(r))}
writeFileSync(join(out,`pilot-privacy-${engine}.json`),JSON.stringify({fixture:true,results,issues},null,2));
console.log('PASS '+engine+': intake privacy, legacy clinical fields absent, private restrictions guidance, education before release notices, retry and returning-student receipt.');
