import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/prefill-assets-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/prefill-assets-sdk.mjs'));
const sdkPath=resolve(preview,'dist/efg-nutrition/tests/prefill-assets-sdk.mjs');
writeFileSync(sdkPath,readFileSync(resolve(root,'efg-nutrition/tests/prefill-assets-sdk.mjs'),'utf8').replace('__USAGE_CATALOG__',readFileSync(resolve(root,'efg-nutrition/catalog/guide-catalog.json'),'utf8')));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_USAGE_HOOKS__={setConsent:v=>{coachRosterConsent=v},get rendered(){return lastRenderedViewKey},get active(){return activeViewKey()}};\n');
// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.

const hits=new Map();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('.css')){const key=(req.headers['x-ncc-case']||'')+'|'+path;hits.set(key,(hits.get(key)||0)+1);}let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',file.endsWith('.html')?'no-store':'public,max-age=300');res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'");res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');



const base='cccc1c09fc4c7ad444c99a0fd7e3838b8a28063d';
const raw=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/pilot.js'],{cwd:root,encoding:'utf8'});
const baselinePilot=syntheticResponse('/efg-nutrition/pilot/pilot.js',raw,{enabled:true}).replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/prefill-assets-sdk.mjs')+'\nglobalThis.__NCC_USAGE_HOOKS__={setConsent:v=>{coachRosterConsent=v},get rendered(){return lastRenderedViewKey},get active(){return activeViewKey()}};';
const cssNames=['day-tools-r1.css','recipes-library-r1.css','student-plan-r1.css'];const cases=[],failures=[];let oldColors;
const save=()=>writeFileSync(resolve(out,'result.json'),JSON.stringify({base,scope:'Full PWA in browsers, isolated RAM transport; no hosted writes or Auth/RLS/physical-device claim',cases,failures},null,2));
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280])for(const role of ['coach','admin']){
  const modes=engine==='chromium'&&width===390&&role==='coach'?['production','candidate']:['candidate'];
  for(const mode of modes){
   const tag=[engine,width,role,mode].join('-');const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',extraHTTPHeaders:{'X-NCC-Case':tag}});if(mode==='production')await context.route('**/pilot.js*',r=>r.fulfill({contentType:'text/javascript',body:baselinePilot}));
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
   const shot=async name=>page.screenshot({path:resolve(out,tag+'-'+name+'.png')});
   const values=()=>page.evaluate(()=>Object.fromEntries(['targetAge','targetHeight','targetWeight','targetGoal','targetActivity','targetSex','targetModel','targetProtein','targetFat'].map(id=>[id,document.getElementById(id)?.value])));
   try{
    await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
    await page.evaluate(async role=>{window.__NCC_USAGE_FIXTURE__.captureIntake({objective:'recomp',age_years:41,height_cm:174,weight_kg:80.5,activity_level:'moderate',dietary_pattern:'omnivore',eating_window:'regular',preferred_foods:'Arroz, pollo y verduras',notes:'Poco tiempo · ficticio'});await window.__NCC_USAGE_FIXTURE__.enter('coach');if(role==='admin'){const a=window.__NCC_R4_FULLAPP__;a.state.profile.role='admin';a.state.org.is_test=true;await a.render();}},role);
    await page.locator('#coachRosterSearch').fill('Ana');const id='10000000-0000-4000-8000-000000000001';await page.locator('[data-student="'+id+'"][data-rostersection=coachStudentIntake]').click();await page.locator('.coach-intake-shared').waitFor();
    await page.locator('[data-coachsection=coachStudentGoals]').click();await page.locator('[data-planflow-step="0"]').click();await page.locator('#targetSex').selectOption('female');
    const unrelated=await page.evaluate(()=>{const result={};for(const id of ['targetModel','targetProtein','targetFat']){const el=document.getElementById(id);el.selectedIndex=el.options.length-1;result[id]=el.value;}result.targetSex=document.getElementById('targetSex').value;return result;});
    await page.locator('[data-coachsection=coachStudentIntake]').click();await page.locator('[data-act=prepareCoachPlanFromIntake]').click();await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__.state.coachIntakePrefill&&document.getElementById('pilot-toast')?.innerText.includes('Datos autorizados precargados'));
    const first=await values();for(const [id,v]of Object.entries(unrelated))assert.equal(first[id],v,'Unrelated existing choice preserved: '+id);
    await page.locator('#targetWeight').scrollIntoViewIfNeeded();await page.waitForTimeout(150);await shot('prefill');
    const colors=await page.evaluate(()=>Object.fromEntries(['body','#targetWeight','[data-act=calculateGoal]'].map(s=>{const c=getComputedStyle(document.querySelector(s));return [s,{color:c.color,background:c.backgroundColor,border:c.borderColor}]})));
    if(mode==='production'){assert.equal(first.targetWeight,'75');assert.equal(first.targetAge,'30');oldColors=colors;cases.push({engine,width,role,mode,reproducedOldDefect:true,first,colors});continue;}
    assert.deepEqual(Object.fromEntries(['targetAge','targetHeight','targetWeight','targetGoal','targetActivity'].map(id=>[id,first[id]])),{targetAge:'41',targetHeight:'174',targetWeight:'80.5',targetGoal:'recomp',targetActivity:'1.5'});
    if(engine==='chromium'&&width===390&&role==='coach')assert.deepEqual(colors,oldColors,'No palette change');
    const resources=await page.evaluate(names=>performance.getEntriesByType('resource').filter(r=>names.some(n=>new URL(r.name).pathname.endsWith('/'+n))).map(r=>({url:r.name,transferSize:r.transferSize})),cssNames);
    for(const name of cssNames){const found=resources.filter(r=>new URL(r.url).pathname.endsWith('/'+name));assert.equal(new Set(found.map(x=>x.url)).size,1,'One stylesheet URL: '+name);assert.equal(hits.get(tag+'|/efg-nutrition/pilot/'+name),1,'One network request per CSS on fresh context: '+name);}
    await page.locator('#targetWeight').fill('81.25');await page.locator('#targetAge').fill('42');await page.locator('[data-act=calculateGoal]').click();await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__.state.pendingGoal);const proposal=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.pendingGoal));
    await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render());await page.locator('[data-planflow-step="0"]').click();const edited=await values();assert.equal(edited.targetWeight,'81.25');assert.equal(edited.targetAge,'42');for(const[id,v]of Object.entries(unrelated))assert.equal(edited[id],v);assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.pendingGoal)),proposal);await shot('ordinary-render-keeps-draft');
    await page.locator('[data-planflow-step="1"]').click();await page.locator('[data-planflow-step="0"]').click();assert.equal(await page.locator('#targetWeight').inputValue(),'81.25');
    await page.locator('[data-coachsection=coachStudentIntake]').click();await page.locator('[data-act=prepareCoachPlanFromIntake]').click();await page.waitForFunction(()=>document.getElementById('targetWeight')?.value==='80.5');const reapplied=await values();for(const[id,v]of Object.entries(unrelated))assert.equal(reapplied[id],v);assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.pendingGoal),null,'New explicit intake invalidates former calculated proposal');
    await page.locator('#coachRosterSearch').fill('Alumno 02');await page.locator('[data-student="10000000-0000-4000-8000-000000000002"]').first().click();await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.selectedStudent==='10000000-0000-4000-8000-000000000002'&&window.__NCC_USAGE_HOOKS__.rendered===window.__NCC_USAGE_HOOKS__.active);await page.locator('[data-coachsection=coachStudentGoals]').click();assert.equal(await page.locator('#targetWeight').inputValue(),'75');assert.equal(await page.locator('#targetSex').inputValue(),'');
    await page.evaluate(()=>window.__NCC_USAGE_FIXTURE__.enter('student'));assert.equal(await page.locator('#coachPlanObjectives').count(),0);assert.equal(await page.evaluate(()=>Object.values(window.__NCC_R4_FULLAPP__.state.diary.meals).flat().length),0);
    assert.equal(await page.evaluate(()=>window.__NCC_USAGE_MODEL__.writes.length),0);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    cases.push({engine,width,role,mode,exactIntakeValues:true,otherChoicesPreserved:true,ordinaryDraftPreserved:true,reapplyExplicit:true,otherStudentIsolated:true,studentSessionIsolated:true,noWrites:true,oneCssRequestEach:true,first,resources,colors});
   }catch(e){failures.push({engine,width,role,mode,message:e.message,errors});await shot('FAILURE').catch(()=>{});throw e;}finally{await context.close();save();}
  }
 }}finally{await browser.close();}
}}finally{server.close();save();}console.log('PASS focused prefill and CSS',cases.length,'cases');
