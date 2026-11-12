import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/coach-student-actions-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/coach-actions-sdk.mjs'));
for(const file of ['workspace-tabs-sdk.mjs','coach-actions-sdk.mjs'])copyFileSync(resolve(root,'efg-nutrition/tests/'+file),resolve(preview,'dist/efg-nutrition/tests/'+file));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n');
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const base='aa90d3c8e6bec2fc01b0ead38f207578fc454dd6';
const gitRead=file=>execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',gitRead('pilot.js'),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/coach-actions-sdk.mjs')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n';
const baselineCss=gitRead('workspace-tabs.css'),evidence=[];
const ids={a:'10000000-0000-4000-8000-000000000001',b:'10000000-0000-4000-8000-000000000002',c:'10000000-0000-4000-8000-000000000003',d:'10000000-0000-4000-8000-000000000004'};
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['coach','admin','student']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  let baseline=engine==='chromium'&&width===390&&role==='coach';
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.route('**/pilot.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePilot}):r.continue());
  await context.route('**/workspace-tabs.css*',r=>baseline?r.fulfill({contentType:'text/css',body:baselineCss}):r.continue());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();if(role!=='student')await page.evaluate(async({role,ids})=>{
   const a=window.__NCC_R4_FULLAPP__;await a.fixture.loginAs(role==='admin'?'admin':'mentor');const s=a.state,m=window.__NCC_COACH_ACTIONS_FIXTURE__;
   s.org={id:'20000000-0000-4000-8000-000000000001',coach_id:s.session.user.id,is_test:role==='admin',status:'active',seat_limit:10};s.profile.organization_id=s.org.id;
   m.roster=[{user_id:ids.a,nickname:'Ana · ejemplo',active:true},{user_id:ids.b,nickname:'Bruno · ejemplo',active:true},{user_id:ids.c,nickname:'Carla · ejemplo',active:true},{user_id:ids.d,nickname:'Diego · ejemplo',active:false}].map(p=>({...p,role:'student',organization_id:s.org.id,email:p.user_id+'@example.invalid'}));
   m.grants={[ids.a]:true,[ids.b]:true,[ids.c]:false,[ids.d]:true};m.access=[{student_id:ids.b,status:'published'}];m.reads=[];m.writes=[];m.signedChecks=0;
   s.roster=structuredClone(m.roster);window.__NCC_WORKSPACE_HOOKS__.setConsent(m.grants);s.coachIntakeVerified=true;s.coachIntakeDraftVerified=true;s.coachIntakeGoals={};s.coachIntakeForms={};s.coachIntakeAccess={[ids.b]:{status:'published'}};s.coachIntakeDraftStatuses={};s.selectedStudent=null;s.consent=null;s.tab='coachStudents';await a.render();
  },{role,ids});await page.evaluate(()=>document.querySelector('#ncc-student-day-fixture-controls').hidden=true);};
  const shot=async(name,fullPage=false)=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png'),fullPage});
  const card=id=>page.locator('.ncc-roster-person').filter({has:page.locator('[data-student="'+id+'"]')});
  if(baseline){await load();await shot('before-full',true);await card(ids.a).scrollIntoViewIfNeeded();await shot('before-actions');baseline=false;}
  await load();
  if(role==='student'){
   assert.equal(await page.locator('.ncc-roster-actions,[data-studentsection]').count(),0);assert.equal(await page.locator('.pilot-nav [data-tab=coachStudents]').count(),0);evidence.push({engine,width,role,noCoachActionsExposed:true});await context.close();continue;
  }
  await shot('list-full',true);await card(ids.a).scrollIntoViewIfNeeded();await shot('actions');
  for(const id of [ids.a,ids.b]){
   const buttons=card(id).locator('.ncc-roster-actions button');assert.equal(await buttons.count(),3);assert.equal(await card(id).locator('[data-rostersection]').count(),1,'Existing next action appears once');
   const dimensions=await buttons.evaluateAll(nodes=>nodes.map(b=>{const r=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(b);const text=range.getBoundingClientRect();return {height:r.height,inside:text.left>=r.left-1&&text.right<=r.right+1};}));assert.ok(dimensions.every(r=>r.height>=44&&r.inside),'Readable, reachable buttons: '+JSON.stringify(dimensions));
  }
  assert.equal(await card(ids.c).locator('.ncc-roster-actions').count(),0,'No private shortcuts without consent');assert.equal(await page.locator('[data-rosteractive=no] [data-student]').count(),0,'Inactive student has no detail shortcut');
  const dismiss=async()=>{const close=page.locator('#pilot-toast button');if(await close.isVisible())await close.click();};
  const open=async(id,section)=>{
   const button=card(id).locator('[data-studentsection="'+section+'"],[data-rostersection="'+section+'"]');await button.click();await page.waitForFunction(({id,section})=>window.__NCC_R4_FULLAPP__.state.selectedStudent===id&&document.querySelector('[data-coachsection="'+section+'"]')?.getAttribute('aria-pressed')==='true',{id,section});await dismiss();
   assert.equal(await page.locator('#'+section).isVisible(),true);assert.match(await page.locator('.coach-student-heading h2').innerText(),id===ids.a?/Ana/:/Bruno/);
  };
  await open(ids.a,'coachStudentIntake');await page.locator('.coach-profile-tabs').scrollIntoViewIfNeeded();await shot('intake');assert.match(await page.locator('#coachStudentIntake').innerText(),/Todavía no hay una ficha compartida/,'Optional intake does not block plan preparation');
  await open(ids.a,'coachStudentGoals');await page.locator('[data-planflow-step="0"]').click();await page.locator('#targetAge').fill('43');await page.locator('#targetWeight').fill('81.5');
  // Real calculator handler creates an unpublished draft; navigation never saves it.
  await page.locator('#targetSex').selectOption('male');await page.locator('#targetGoal').selectOption('fat_loss');await page.locator('#targetActivity').selectOption({index:1});await page.locator('[data-act=calculateGoal]').click();await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__.state.pendingGoal);const draft=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.pendingGoal));
  await open(ids.a,'coachStudentNutrition');await open(ids.a,'coachStudentIntake');await open(ids.a,'coachStudentGoals');assert.equal(await page.locator('#targetAge').inputValue(),'43');assert.equal(await page.locator('#targetWeight').inputValue(),'81.5');assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.pendingGoal)),draft,'Same student draft survives signed refresh and navigation');await page.locator('.coach-profile-tabs').scrollIntoViewIfNeeded();await shot('draft-kept');
  await open(ids.b,'coachStudentIntake');await open(ids.b,'coachStudentNutrition');assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.pendingGoal),null,'Another student never inherits the previous proposal');await page.locator('.coach-profile-tabs').scrollIntoViewIfNeeded();await shot('other-student');
  // Revoke after the shortcuts were rendered: refresh must use the real new grant.
  await page.evaluate(id=>{const m=window.__NCC_COACH_ACTIONS_FIXTURE__;m.grants[id]=false;m.reads=[];},ids.a);await card(ids.a).locator('[data-studentsection=coachStudentIntake]').click();await page.waitForFunction(id=>window.__NCC_R4_FULLAPP__.state.selectedStudent===id&&window.__NCC_R4_FULLAPP__.state.consent?.accepted===false,ids.a);await dismiss();assert.equal(await page.locator('.coach-profile-tabs').count(),0);assert.match(await page.locator('#studentFollowPanel').innerText(),/todavía no autorizó/);assert.equal(await page.evaluate(id=>window.__NCC_COACH_ACTIONS_FIXTURE__.reads.some(r=>r.table==='efg_daily_logs'&&r.filters.some(([op,k,v])=>k==='student_id'&&v===id)),ids.a),false,'Revocation prevents private diary reads');await page.locator('#studentFollowPanel').scrollIntoViewIfNeeded();await shot('revoked');
  assert.ok(await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.signedChecks)>=2,'Existing signed identity checks are exercised');assert.equal(await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.writes.length),0,'No registration, plan save or publication from navigation');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  evidence.push({engine,width,role,threeDistinctDestinations:true,nextActionPreservedOnce:true,actualSignedRosterRefresh:true,rightStudentAndSection:true,optionalIntakeStillOptional:true,calculatorDraftPreserved:true,otherStudentIsolated:true,revokedPermissionHonored:true,noPrivateReadAfterRevocation:true,noWrites:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS coach student actions',evidence.length);
}finally{server.close();}
