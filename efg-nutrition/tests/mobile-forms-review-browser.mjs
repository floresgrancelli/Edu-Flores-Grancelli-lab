import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/mobile-forms-review');
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

const base='e4aa8ad6eb1f11917fddba7cacfc26ca9a64d9db';
const gitRead=file=>execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',gitRead('pilot.js'),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/coach-actions-sdk.mjs')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n';
const baselineCss=gitRead('workspace-tabs.css'),evidence=[],ids={a:'10000000-0000-4000-8000-000000000001',b:'10000000-0000-4000-8000-000000000002',c:'10000000-0000-4000-8000-000000000003',d:'10000000-0000-4000-8000-000000000004'};
let expectedProposal=null,baselineMetrics=null;
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280])for(const role of ['coach','admin','student']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width<720,hasTouch:width<720});
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
    const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});
  const open=async()=>{await page.locator('[data-student="'+ids.a+'"][data-rostersection=coachStudentGoals]').click();await page.waitForFunction(()=>document.querySelector('[data-coachsection=coachStudentGoals]')?.getAttribute('aria-pressed')==='true');const close=page.locator('#pilot-toast button');if(await close.isVisible())await close.click();await page.locator('[data-planflow-step="0"]').click();};
  const fill=async()=>{await page.locator('#targetSex').selectOption('male');await page.locator('#targetGoal').selectOption('fat_loss');await page.locator('#targetAge').fill('43');await page.locator('#targetWeight').fill('81.5');await page.locator('#targetActivity').selectOption({index:1});};
  const align=()=>page.evaluate(()=>{const el=document.querySelector('#coachPlanObjectives');window.scrollTo({top:el.getBoundingClientRect().top+scrollY-160,behavior:'instant'});});
  const geometry=async selector=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {top:r.top,bottom:r.bottom,height:r.height,font:parseFloat(getComputedStyle(el).fontSize),visible:r.top>=68&&r.bottom<=innerHeight,uncovered:!!top&&(el===top||el.contains(top))};});
  const metrics=()=>page.evaluate(()=>{const first=document.querySelector('#targetSex').getBoundingClientRect(),button=document.querySelector('[data-act=calculateGoal]').getBoundingClientRect();return {distanceToCalculate:button.top-first.top,formHeight:document.querySelector('#coachPlanObjectives').getBoundingClientRect().height};});
  const blockers=()=>page.locator('#coachPlanObjectives .pilot-form input,#coachPlanObjectives .pilot-form select').evaluateAll(nodes=>nodes.filter(el=>{const r=el.getBoundingClientRect();if(r.top<160||r.bottom>innerHeight-80)return false;const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return top!==el&&!el.contains(top);}).map(el=>el.id));
  const reduce=async()=>{await page.locator('#targetWeight').focus();await page.setViewportSize({width,height:520});await page.locator('#targetWeight').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));};
  if(baseline){await load();await open();await fill();await align();baselineMetrics=await metrics();await shot('before-full-height');await reduce();baselineMetrics.blockedControls=await blockers();await shot('before-reduced-input');await page.locator('[data-act=calculateGoal]').scrollIntoViewIfNeeded();await shot('before-reduced-action');await page.locator('[data-act=calculateGoal]').click();await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__.state.pendingGoal);expectedProposal=await page.evaluate(()=>structuredClone(window.__NCC_R4_FULLAPP__.state.pendingGoal));baseline=false;await page.setViewportSize({width,height:844});}
  await load();
  if(role==='student'){
   assert.equal(await page.locator('.ncc-objective-help,#coachPlanObjectives').count(),0);const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
   await page.locator('[data-daymeal=desayuno]').click();await page.locator('.student-meal-card [data-setmeal=desayuno]').click();await page.locator('#mealFoodSearch').fill('huevo');await page.locator('[data-mealsuggestion=egg]').first().click();await page.locator('#mealEditorQty').fill('3');await page.locator('#mealEditorQty').focus();await page.setViewportSize({width,height:520});await page.locator('#mealEditorQty').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));assert.equal(await page.locator('#mealEditorQty').inputValue(),'3');assert.equal(await page.evaluate(()=>document.activeElement.id),'mealEditorQty');await shot('student-unchanged');assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);evidence.push({engine,width,role,studentDayUnchanged:true,entryFocusAndQuantityPreserved:true,noWrites:true});await context.close();continue;
  }
  await open();await fill();await align();const current=await metrics();await shot('full-height');assert.equal(await page.locator('.ncc-objective-help').count(),1);assert.equal(await page.locator('.ncc-objective-help').getAttribute('open'),null);assert.equal(await page.locator('[data-act=calculateGoal]').count(),1,'Original calculate control only');
  const help=page.locator('.ncc-objective-help');assert.match(await help.textContent(),/Mifflin–St Jeor/);assert.match(await help.textContent(),/2,0 g\/kg/);assert.match(await help.textContent(),/0,9 g\/kg/);assert.match(await help.textContent(),/No selecciones actividad solo por cantidad de sesiones/);
  if(engine==='chromium'&&width===390&&role==='coach')assert.ok(current.distanceToCalculate<baselineMetrics.distanceToCalculate*.8,'At least 20% less distance between fields and action: '+JSON.stringify({baselineMetrics,current}));
  await help.locator('summary').click();await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render());assert.notEqual(await help.getAttribute('open'),null,'Explanation remains open through same-view render');assert.equal(await page.locator('#targetWeight').inputValue(),'81.5');await shot('explanations');await help.locator('summary').click();
  await reduce();const input=await geometry('#targetWeight');assert.equal(await page.evaluate(()=>document.activeElement.id),'targetWeight');assert.equal(await page.locator('#targetWeight').inputValue(),'81.5');assert.ok(input.visible&&input.uncovered,'Focused input remains visible: '+JSON.stringify(input));const blocked=await blockers();
  if(width<720){assert.ok(input.height>=44&&input.font>=16);assert.deepEqual(blocked,[],'No sticky continuation over visible fields');assert.equal(await page.locator('#coachPlanObjectives>.ncc-plan-step-actions').evaluate(el=>getComputedStyle(el).position),'static');}
  await shot('reduced-input');await page.locator('[data-act=calculateGoal]').scrollIntoViewIfNeeded();const action=await geometry('[data-act=calculateGoal]');assert.ok(action.uncovered&&action.visible);await shot('reduced-action');
  // Original validation and calculation handler, no changes or mocked formula.
  await page.locator('#targetSex').selectOption('');await page.locator('[data-act=calculateGoal]').click();await page.waitForFunction(()=>document.querySelector('#pilot-toast')?.dataset.noticeKind==='error');assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.pendingGoal),null);assert.equal(await page.locator('#targetWeight').inputValue(),'81.5');await page.locator('#pilot-toast button').click();await page.locator('#targetSex').selectOption('male');await page.locator('[data-act=calculateGoal]').click();await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__.state.pendingGoal);const proposal=await page.evaluate(()=>structuredClone(window.__NCC_R4_FULLAPP__.state.pendingGoal));assert.deepEqual(proposal,expectedProposal,'Exact same proposal as published formula and inputs');
  await page.setViewportSize({width,height:844});await page.locator('#goalPreview').scrollIntoViewIfNeeded();await shot('calculated');await page.locator('[data-planflow-step="1"]').click();await page.locator('[data-planflow-step="0"]').click();assert.equal(await page.locator('#targetAge').inputValue(),'43');assert.equal(await page.locator('#targetWeight').inputValue(),'81.5');assert.deepEqual(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.pendingGoal),proposal);await align();await shot('draft-kept');
  assert.equal(await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.writes.length),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  evidence.push({engine,width,role,input,action,visibleBlockedControls:blocked,metrics:current,allOriginalExplanationsAvailable:true,helpStateSurvivesRender:true,oneCalculateAction:true,validationPreserved:true,exactSameProposal:true,draftAndValuesPreserved:true,noWrites:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify({phase:'CANDIDATE_REVIEW',baseline:baselineMetrics,cases:evidence},null,2));console.log('PASS mobile form review',evidence.length);
}finally{server.close();}
