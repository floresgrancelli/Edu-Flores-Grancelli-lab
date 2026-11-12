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

const evidence=[],ids={a:'10000000-0000-4000-8000-000000000001',b:'10000000-0000-4000-8000-000000000002',c:'10000000-0000-4000-8000-000000000003',d:'10000000-0000-4000-8000-000000000004'};
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['coach','admin']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width<720,hasTouch:width<720});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const load=async()=>{await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();if(role!=='student')await page.evaluate(async({role,ids})=>{
   const a=window.__NCC_R4_FULLAPP__;await a.fixture.loginAs(role==='admin'?'admin':'mentor');const s=a.state,m=window.__NCC_COACH_ACTIONS_FIXTURE__;
   s.org={id:'20000000-0000-4000-8000-000000000001',coach_id:s.session.user.id,is_test:role==='admin',status:'active',seat_limit:10};s.profile.organization_id=s.org.id;
   m.roster=[{user_id:ids.a,nickname:'Ana · ejemplo',active:true},{user_id:ids.b,nickname:'Bruno · ejemplo',active:true},{user_id:ids.c,nickname:'Carla · ejemplo',active:true},{user_id:ids.d,nickname:'Diego · ejemplo',active:false}].map(p=>({...p,role:'student',organization_id:s.org.id,email:p.user_id+'@example.invalid'}));
   m.grants={[ids.a]:true,[ids.b]:true,[ids.c]:false,[ids.d]:true};m.access=[{student_id:ids.b,status:'published'}];m.reads=[];m.writes=[];m.signedChecks=0;
   s.roster=structuredClone(m.roster);window.__NCC_WORKSPACE_HOOKS__.setConsent(m.grants);s.coachIntakeVerified=true;s.coachIntakeDraftVerified=true;s.coachIntakeGoals={};s.coachIntakeForms={};s.coachIntakeAccess={[ids.b]:{status:'published'}};s.coachIntakeDraftStatuses={};s.selectedStudent=null;s.consent=null;s.tab='coachStudents';await a.render();
  },{role,ids});await page.evaluate(()=>document.querySelector('#ncc-student-day-fixture-controls').hidden=true);};
    await load();await page.locator('[data-student="'+ids.a+'"][data-rostersection=coachStudentGoals]').click();await page.waitForFunction(()=>document.querySelector('[data-coachsection=coachStudentGoals]')?.getAttribute('aria-pressed')==='true');
  const toast=page.locator('#pilot-toast button');if(await toast.isVisible())await toast.click();await page.locator('[data-planflow-step="0"]').click();
  const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-'+name+'.png')});
  await page.locator('#targetSex').selectOption('male');await page.locator('#targetGoal').selectOption('fat_loss');await page.locator('#targetAge').fill('43');await page.locator('#targetWeight').fill('81.5');await page.locator('#targetActivity').selectOption({index:1});
  await page.locator('#coachPlanObjectives').scrollIntoViewIfNeeded();await shot('full-height');
  await page.locator('#targetWeight').focus();await page.setViewportSize({width,height:520});await page.locator('#targetWeight').scrollIntoViewIfNeeded();await shot('reduced-input');
  const geometry=async selector=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);return {top:r.top,bottom:r.bottom,height:r.height,visible:r.top>=0&&r.bottom<=innerHeight,uncovered:!!top&&(el===top||el.contains(top)),viewport:innerHeight};});
  const input=await geometry('#targetWeight');assert.equal(await page.locator('#targetWeight').inputValue(),'81.5');assert.equal(await page.evaluate(()=>document.activeElement.id),'targetWeight');
  await page.locator('[data-act=calculateGoal]').scrollIntoViewIfNeeded();const action=await geometry('[data-act=calculateGoal]');await shot('reduced-action');
  evidence.push({engine,width,role,input,action,focusRetained:await page.evaluate(()=>document.activeElement.id==='targetWeight'),quantityRetained:await page.locator('#targetWeight').inputValue(),writes:await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.writes.length),errors});
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.__NCC_COACH_ACTIONS_FIXTURE__.writes.length),0);await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify({phase:'BASELINE_OBSERVATION_ONLY',cases:evidence},null,2));console.log('PASS baseline form observation',evidence.length);
}finally{server.close();}
