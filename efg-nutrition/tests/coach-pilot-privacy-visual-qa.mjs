// Actual app/module graph; new journey enabled ONLY in an isolated HTTP fixture.
// No real users, external requests, JWT assertions or hosted data.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.cwd(),out=join(base,'artifacts/premium-visual-qa');
mkdirSync(out,{recursive:true});
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.avif':'image/avif'};
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
  assert.match(await page.locator('#efgCoachRelaunchManageForm').innerText(),/Mis restricciones/);
  assert.equal(await page.locator('[name="gutClinicalCondition"]:enabled').count(),0);
  await page.evaluate(async()=>{window.__PILOT_QA__.state.tab='privacy';await window.__PILOT_QA__.render()});
  await page.getByRole('button',{name:'Revisar mi ficha y su permiso'}).click();
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  await page.evaluate(async()=>{window.__PILOT_QA__.state.coachPilotEntry={route:'ready',canLogMeals:true};await window.__PILOT_QA__.render()});
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(bounds.scroll<=width+2,'Horizontal overflow '+JSON.stringify(bounds));
  await page.screenshot({path:join(out,`pilot-privacy-${engine}-${width}.png`),fullPage:true});
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
     query.single=async()=>({data:profile});
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
