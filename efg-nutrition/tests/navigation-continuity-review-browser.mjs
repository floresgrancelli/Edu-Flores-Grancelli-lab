import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/navigation-continuity-review');
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

const base='8a97235aa8bdfad8bfcb6781b3e45538f13d0434';
const gitRead=file=>execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',gitRead('pilot.js'),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/coach-actions-sdk.mjs')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n';
const baselineTabs=gitRead('workspace-tabs.js'),evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280])for(const role of ['coach','admin','student']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let baseline=false;
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.route('**/pilot.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePilot}):r.continue());
  await context.route('**/workspace-tabs.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselineTabs}):r.continue());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const setup=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();await page.evaluate(async role=>{
   const a=window.__NCC_R4_FULLAPP__,s=a.state,m=window.__NCC_COACH_ACTIONS_FIXTURE__;
   if(role!=='student')await a.fixture.loginAs(role==='admin'?'admin':'mentor');
   s.org={id:'20000000-0000-4000-8000-000000000001',coach_id:role==='student'?'coach':s.session.user.id,is_test:role==='admin',status:'active',seat_limit:10,payment_alias:'COACH.DEMO'};
   s.profile.organization_id=s.org.id;
   const names=['Ana · ficha recibida','Bruno · publicado','Carla · autorización','Diego · inactivo','Elena · objetivo previo','Fabio · por preparar','Gabriela · borrador'];
   m.roster=names.map((nickname,i)=>({user_id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),nickname,active:i!==3,role:'student',organization_id:s.org.id}));
   m.grants=Object.fromEntries(m.roster.map((p,i)=>[p.user_id,i!==2]));m.writes=[];
   s.roster=structuredClone(m.roster);window.__NCC_WORKSPACE_HOOKS__.setConsent(m.grants);s.coachIntakeVerified=true;s.coachIntakeDraftVerified=true;
   const ids=m.roster.map(p=>p.user_id),intake=i=>({student_id:ids[i],organization_id:s.org.id,revision:1,shared_at:'2026-11-12T12:00:00Z'});
   s.coachIntakeForms={[ids[0]]:intake(0),[ids[6]]:intake(6)};s.coachIntakeGoals={[ids[4]]:{kcal:2100}};s.coachIntakeAccess={[ids[1]]:{status:'published'}};
   s.coachIntakeDraftStatuses={[ids[6]]:{student_id:ids[6],organization_id:s.org.id,coach_id:s.session.user.id,status:'draft',draft_revision:1,source_intake_revision:1}};
   s.payments=['pending','approved','rejected','future_unknown'].map((status,i)=>({id:'proof-'+i,status,payment_kind:role==='admin'?'coach_efg':'student_coach',payer_id:role==='student'?s.session.user.id:'pupil',recipient_id:role!=='student'?s.session.user.id:'coach',organization_id:s.org.id,amount_ars:15000,period_label:'2026-11',created_at:'2026-11-12T12:00:00Z',receipt_path:'demo/'+i+'.png'}));
   s.platformAlias='NCC.DEMO';s.platformAliases=['NCC.DEMO'];s.tab=role==='student'?'payments':'coachStudents';await a.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
  },role);};
  const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});
  const science=()=>page.locator('.pilot-nav [data-tab=nutritionScience]').click();
  const roster=async()=>{if(role==='admin'){await page.locator('.pilot-nav [data-tab=testCoach]').click();await page.locator('#nccCoachHomeSections [data-workspace-tab=students]').click();await page.locator('[data-tab=coachStudents]:visible').first().click();}else await page.locator('.pilot-nav [data-tab=coachStudents]').click();await page.locator('#coachRosterSearch').waitFor();};
  const browse=async prefix=>{
   await page.locator('[data-rosterfilter=plan]').click();await page.locator('#coachRosterSearch').fill('Fabio');await page.evaluate(()=>window.scrollTo({top:480,behavior:'instant'}));const y=await page.evaluate(()=>scrollY);assert.ok(y>100);await shot(prefix+'-leaving');
   await science();await roster();await page.waitForTimeout(100);const result=await page.evaluate(()=>({search:document.getElementById('coachRosterSearch').value,filter:document.getElementById('app').dataset.rosterFilter,y:scrollY}));await shot(prefix+'-returned');return {y,...result,leavingY:y};
  };
  const paymentFilter=async prefix=>{
   await page.evaluate(async()=>{const a=window.__NCC_R4_FULLAPP__;a.state.tab='payments';await a.render();});
   if(role==='student')await page.locator('#nccPaymentSections [data-workspace-tab=history]').click();
   if(role==='admin')return null;
   await page.locator('[data-payment-filter=rejected]:visible').click();await page.locator('.efg-payment-item[data-payment-status=rejected]:visible').scrollIntoViewIfNeeded();await shot(prefix+'-payment-filter');
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render());
   const result=await page.locator('[data-payment-filter=rejected]:visible').getAttribute('aria-pressed');await page.locator('[data-payment-filter=rejected]:visible').scrollIntoViewIfNeeded();await shot(prefix+'-payment-returned');return result;
  };
  if(engine==='chromium'&&width===390&&role==='coach'){
   baseline=true;await setup();const prior=await browse('before');assert.equal(prior.search,'');assert.equal(prior.filter,'all');assert.equal(await paymentFilter('before'),'false');
   await page.locator('.pilot-nav [data-tab=home]').click();await page.locator('.ncc-day-plan-shortcut').click();await page.locator('[data-planmode=both]').click();await page.locator('[data-plannerslot=cena]').click();await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();await page.locator('[id="planQty_cena|protein"]').fill('123');await shot('before-planner-leaving');await science();await page.locator('.pilot-nav [data-tab=studentMore]').click();await page.locator('[data-tab=planner]:visible').first().click();assert.notEqual(await page.locator('[id="planQty_cena|protein"]').inputValue(),'123');await shot('before-planner-returned');baseline=false;
  }
  await setup();const diary=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
  if(role!=='student'){
   const result=await browse('candidate');assert.equal(result.search,'Fabio');assert.equal(result.filter,'plan');assert.ok(Math.abs(result.y-result.leavingY)<=3,'Return to original scroll position: '+JSON.stringify(result));assert.equal(await page.locator('.ncc-roster-person:visible').count(),1);
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render());assert.equal(await page.locator('#coachRosterSearch').inputValue(),'Fabio');assert.equal(await page.locator('[data-rosterfilter=plan]').getAttribute('aria-pressed'),'true');
  }
  if(role!=='admin')assert.equal(await paymentFilter('candidate'),'true');
  await page.locator('.pilot-nav [data-tab=home]').click();
  await page.locator('.ncc-day-plan-shortcut').click();await page.locator('[data-planmode=both]').click();await page.locator('[data-plannerslot=cena]').click();await page.locator('#nccPlannerFood-cena [data-workspace-tab=protein]').click();
  const qty=page.locator('[id="planQty_cena|protein"]');await qty.fill('123');const selected=await page.locator('[data-planselect="cena|protein"]').inputValue();
  await page.evaluate(()=>window.scrollTo({top:300,behavior:'instant'}));await shot('planner-leaving');
  // Playwright can scroll the page to reveal the bottom nav before dispatching a
  // click. Compare the position at the actual navigation event, as the app does,
  // rather than the earlier position preceding the automation's auto-scroll.
  await page.locator('.pilot-nav [data-tab=nutritionScience]').evaluate(el=>el.addEventListener('click',()=>{window.__NCC_NAV_DEPART_Y__=scrollY;},{capture:true,once:true}));
  await science();const plannerY=await page.evaluate(()=>window.__NCC_NAV_DEPART_Y__);assert.ok(Number.isFinite(plannerY));
  if(await page.locator('.pilot-nav [data-tab=planner]').count())await page.locator('.pilot-nav [data-tab=planner]').click();
  else{await page.locator('.pilot-nav [data-tab='+ (role==='admin'?'adminMore':'studentMore')+']').click();await page.locator('[data-tab=planner]:visible').first().click();}
  await qty.waitFor();await page.waitForTimeout(100);assert.equal(await qty.inputValue(),'123');assert.equal(await page.locator('[data-planselect="cena|protein"]').inputValue(),selected);assert.equal(await page.locator('#nccPlanDestinationSections [data-workspace-tab=planning]').getAttribute('aria-pressed'),'true');await shot('planner-returned');const returnedY=await page.evaluate(()=>scrollY);assert.ok(Math.abs(returnedY-plannerY)<=3,'Planner position '+JSON.stringify({expected:plannerY,actual:returnedY,engine,width,role}));
  // Explicit shortcut remains an explicit destination even after a remembered balance tab.
  await page.locator('#nccPlannerSections [data-workspace-tab=balance]').click();await page.locator('.pilot-nav [data-tab=home]').click();await page.locator('.ncc-day-plan-shortcut').click();assert.equal(await page.locator('#nccPlannerSections [data-workspace-tab=choose]').getAttribute('aria-pressed'),'true');assert.equal(await qty.inputValue(),'123');await shot('direct-shortcut');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),diary);assert.equal(await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.writes.length),0);
  // Set non-default selections, then exercise the real private-session reset.
  await page.locator('#nccPlannerSections [data-workspace-tab=balance]').click();
  await page.locator('#nccPlanDestinationSections [data-workspace-tab=guide]').click();
  await page.evaluate(async()=>{const a=window.__NCC_R4_FULLAPP__;await a.fixture.loginAs('learner');a.state.tab='planner';await a.render();});
  assert.equal(await page.locator('#nccPlannerSections [data-workspace-tab=choose]').getAttribute('aria-pressed'),'true','New auth epoch never inherits the former balance selection');
  assert.deepEqual(await page.evaluate(()=>({selections:window.__NCC_R4_FULLAPP__.state.plannerSelections,grams:window.__NCC_R4_FULLAPP__.state.plannerDraftGrams})),{selections:{},grams:{}},'Previous account quantities and food selections are cleared');
  assert.equal(await page.locator('.pilot-nav [data-tab=coachStudents]').count(),0,'Student navigation never receives coach controls');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  evidence.push({engine,width,role,rosterSearchFilterAndPositionPreserved:role!=='student',paymentFilterPreserved:role!=='admin',existingPlannerDraftPreserved:true,explicitShortcutPreserved:true,authEpochIsolated:true,noWrites:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS navigation continuity',evidence.length);
}finally{server.close();}
