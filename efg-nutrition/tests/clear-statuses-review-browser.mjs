import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/clear-statuses-review');
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

const base='006f3d735b5ea381856b581ab2e46ef715575407';
const gitRead=file=>execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/'+file],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',gitRead('pilot.js'),{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/coach-actions-sdk.mjs')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n';
const baselineCss=gitRead('workspace-tabs.css'),evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280])for(const role of ['coach','admin','student']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let baseline=false;
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.route('**/pilot.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:baselinePilot}):r.continue());
  await context.route('**/workspace-tabs.css*',r=>baseline?r.fulfill({contentType:'text/css',body:baselineCss}):r.continue());
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
  const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png'),fullPage:true});
  const payments=async()=>{await page.evaluate(async()=>{const a=window.__NCC_R4_FULLAPP__;a.state.tab='payments';await a.render();});if(role==='student')await page.locator('#nccPaymentSections [data-workspace-tab=history]').click();};
  if(engine==='chromium'&&width===390&&role==='coach'){
   baseline=true;await setup();await shot('before-roster');await payments();await shot('before-payments');baseline=false;
  }
  await setup();const before=await page.evaluate(()=>JSON.stringify({payments:window.__NCC_R4_FULLAPP__.state.payments,access:window.__NCC_R4_FULLAPP__.state.coachIntakeAccess,goals:window.__NCC_R4_FULLAPP__.state.coachIntakeGoals}));
  if(role!=='student'){
   const rows=page.locator('.ncc-roster-person');assert.equal(await rows.count(),7);assert.equal(await rows.locator('.ncc-state-tag').count(),7);
   for(const [name,tone,label] of [['Ana','pending','Ficha recibida'],['Bruno','complete','Plan publicado'],['Carla','attention','Autorización pendiente'],['Diego','neutral','Baja temporal'],['Elena','neutral','publicación sin confirmar'],['Fabio','pending','Plan por preparar'],['Gabriela','pending','Borrador guardado']]){
    const card=rows.filter({hasText:name});assert.equal(await card.locator('.ncc-state-tag').getAttribute('data-state-tone'),tone);assert.ok((await card.locator('.ncc-state-tag').innerText()).includes(label));
   }
   assert.equal(await page.locator('.ncc-roster-actions button').count(),15,'Three existing destinations for each of five authorized active students');
   await shot('roster');
   await page.locator('[data-rosterfilter=plan]').click();assert.equal(await page.locator('.ncc-roster-person:visible').count(),2);await page.locator('[data-rosterfilter=all]').click();
   await page.evaluate(async()=>{const a=window.__NCC_R4_FULLAPP__;a.state.coachIntakeVerified=false;await a.render();});assert.equal(await page.locator('.ncc-roster-person[data-rosterstage=unknown] .ncc-state-tag[data-state-tone=neutral]').count(),5);assert.equal(await page.locator('.ncc-roster-person .ncc-state-tag[data-state-tone=complete]').count(),0);await shot('unverified');
  }else assert.equal(await page.locator('.ncc-roster-person').count(),0);
  await payments();await shot('payments');
  const cards=page.locator('.efg-payment-item:visible');assert.equal(await cards.count(),4);
  for(const [status,tone,label] of [['pending','pending','Pendiente de verificar'],['approved','complete','Comprobante aprobado'],['rejected','attention','Comprobante rechazado'],['future_unknown','neutral','Estado sin confirmar']]){
   const card=page.locator('.efg-payment-item[data-payment-status='+status+']:visible');assert.equal(await card.locator('.ncc-state-tag').getAttribute('data-state-tone'),tone);assert.ok((await card.locator('.ncc-state-tag').innerText()).includes(label));
   assert.equal(await card.locator('[data-approve],[data-reject]').count(),role!=='student'&&status==='pending'?2:0);
  }
  const pending=page.locator('.efg-payment-item[data-payment-status=pending]:visible');assert.match(await pending.innerText(),role==='student'?/destinatario todavía debe verificarlo/:/Revisá la acreditación/);
  assert.match(await page.locator('.efg-payment-item[data-payment-status=approved]:visible').innerText(),/no activa ni renueva/);
  if(role==='student'){
   for(const filter of ['pending','approved','rejected']){await page.locator('[data-payment-filter='+filter+']:visible').click();assert.equal(await page.locator('.efg-payment-item:visible').count(),1);}await page.locator('[data-payment-filter=all]:visible').click();
  }
  const layout=await cards.locator('.ncc-state-tag').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),p=n.closest('.efg-payment-item').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right;}));assert.ok(layout.every(Boolean),'Statuses fit their cards');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>JSON.stringify({payments:window.__NCC_R4_FULLAPP__.state.payments,access:window.__NCC_R4_FULLAPP__.state.coachIntakeAccess,goals:window.__NCC_R4_FULLAPP__.state.coachIntakeGoals})),before,'Status presentation never changes data');
  assert.equal(await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.writes.length),0);assert.deepEqual(errors,[]);
  evidence.push({engine,width,role,actualStatusesPreserved:true,unknownNeverConfirmed:true,paymentActionsUnchanged:true,filtersUnchanged:true,noWrites:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS clear statuses',evidence.length);
}finally{server.close();}
