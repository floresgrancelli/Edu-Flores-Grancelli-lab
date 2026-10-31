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
  if(path.endsWith('/pilot.js'))bytes=Buffer.from(bytes.toString()+'\nwindow.__PILOT_QA__={state,render};');
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
  assert.equal(await page.locator('[name="gutClinicalCondition"]').count(),8);
  assert.equal(await page.locator('[name="gutClinicalCondition"]:enabled').count(),0);
  await page.evaluate(async()=>{window.__PILOT_QA__.state.tab='privacy';await window.__PILOT_QA__.render()});
  await page.getByRole('button',{name:'Revisar mi ficha y su permiso'}).click();
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  await page.evaluate(async()=>{window.__PILOT_QA__.state.coachPilotEntry={route:'ready',canLogMeals:true};await window.__PILOT_QA__.render()});
  await page.locator('#efgCoachRelaunchManageForm').waitFor();
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(bounds.scroll<=width+2,'Horizontal overflow '+JSON.stringify(bounds));
  await page.screenshot({path:join(out,`pilot-privacy-${engine}-${width}.png`),fullPage:true});
  results.push({engine,width,waitingPrivacy:true,publishedEditable:true,clinicalDisabled:true});
  await context.close();
 }
 assert.deepEqual(issues,[]);
}finally{await browser.close();await new Promise(r=>server.close(r))}
writeFileSync(join(out,`pilot-privacy-${engine}.json`),JSON.stringify({fixture:true,results,issues},null,2));
console.log('PASS actual new-journey app: waiting/privacy/edit navigation and published intake management; clinical fields disabled; '+engine);
