// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/intake-cards-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/workspace-tabs-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/workspace-tabs-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/workspace-tabs-sdk.mjs'));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,setConsent(values){Object.assign(coachRosterConsent,values);}};\n');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const base='a3fe6b53efcabf844f532b55170b9ac934ce1830';
const prior=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/coach-relaunch-entry-client.js'],{cwd:root,encoding:'utf8'});
const priorCss=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/workspace-tabs.css'],{cwd:root,encoding:'utf8'});
const evidence=[];
try{for(const engine of (process.env.NCC_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[engine].launch({headless:true,...(process.env.NCC_CHROMIUM_PATH&&engine==='chromium'?{executablePath:process.env.NCC_CHROMIUM_PATH}:{})});
 try{for(const width of [390,320,1280]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let baseline=false;
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await context.route('**/coach-relaunch-entry-client.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:prior}):r.continue());
 await context.route('**/workspace-tabs.css*',r=>baseline?r.fulfill({contentType:'text/css',body:priorCss}):r.continue());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+name+'.png')});
 const setup=async(editing=false)=>{
  await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
  await page.evaluate(async editing=>{
   const a=window.__NCC_R4_FULLAPP__;a.state.tab='intake';
   const {renderCoachRelaunchEntry}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');
   const {COACH_RELEASE_INTAKE_VERSION}=await import('/efg-nutrition/pilot/coach-relaunch-onboarding.js');
   const status={completed_version:COACH_RELEASE_INTAKE_VERSION,revision:2,objective:'recomp',activity_level:'moderate',age_years:41,height_cm:174,weight_kg:80.5,dietary_pattern:'omnivore',eating_window:'regular',preferred_foods:'Arroz, pollo y verduras',notes:'Poco tiempo para cocinar',meal_routine:'7, 13 y 21',shared_at:null};
   document.querySelector('.pilot-main').innerHTML=renderCoachRelaunchEntry(editing?{route:'ready',status}:{route:'intake'},{editing,guided:true,privateHealthEnabled:true});
   document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
  },editing);
 };
 const position=async field=>page.locator(field).evaluate(el=>{window.scrollTo({top:el.getBoundingClientRect().top+scrollY-160,behavior:'instant'});});
 if(engine==='chromium'&&width===390){
  baseline=true;await setup(true);await position('[data-intakepanel="0"] h3');await shot('before-objective');await position('#coachRelaunch_activity_level');await shot('before-activity');
  baseline=false;
 }
 await setup();
 await page.locator('[data-intakenext="1"]').click();assert.equal(await page.locator('[data-intakepanel="0"]').isVisible(),true);
 assert.equal(await page.locator('input[type=radio]:checked').count(),0,'No inferred answer');
 const objectiveCodes=['fat_loss','recomp','muscle_gain','maintenance','general'],activityCodes=['low','light','moderate','high'];
 const read=()=>page.evaluate(async()=>{const {readCoachRelaunchForm}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');return readCoachRelaunchForm(document);});
 for(const code of objectiveCodes){await page.locator('[name=coachRelaunch_objective][value='+code+']').check();assert.equal((await read()).payload.objective,code);}
 for(const code of activityCodes){await page.locator('[name=coachRelaunch_activity_level][value='+code+']').check();assert.equal((await read()).payload.activity_level,code);}
 // Native keyboard behaviour and browser accessibility tree labels.
 const first=page.locator('[name=coachRelaunch_objective][value=fat_loss]');await first.focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');
 assert.equal(await page.locator('[name=coachRelaunch_objective][value=recomp]').isChecked(),true);
 assert.match(await page.locator('[data-intake-choice=objective]').ariaSnapshot(),/group "Mi objetivo \(obligatorio\)"/);
 await page.locator('[name=coachRelaunch_activity_level][value=moderate]').check();
 await page.locator('#coachRelaunch_age_years').fill('41');await page.locator('#coachRelaunch_height_cm').fill('174');await page.locator('#coachRelaunch_weight_kg').fill('80.5');
 const payload=await read();await page.locator('[data-intakepanel="0"] h3').focus();await position('[data-intakepanel="0"] h3');await shot('candidate-objective');await position('[data-intake-choice=activity_level]');await shot('candidate-activity');
 assert.equal(await page.locator('[data-intake-choice=objective] input:checked').count(),1);
 const colors=await page.locator('[name=coachRelaunch_objective]:checked').evaluate(el=>({bg:getComputedStyle(el.closest('label')).backgroundColor,border:getComputedStyle(el.closest('label')).borderColor}));
 assert.equal(colors.border,'rgb(177, 197, 121)');
 await page.locator('[data-intakenext="1"]').click();await page.locator('#coachRelaunch_dietary_pattern').selectOption('omnivore');await page.locator('#coachRelaunch_preferred_foods').fill('Arroz, pollo y verduras');
 await page.locator('[data-intakenext="2"]').click();await page.locator('#coachRelaunch_notes').fill('Poco tiempo para cocinar');await page.locator('[data-intakenext="3"]').click();
 const review=page.locator('[data-intakereview]');assert.match(await review.innerText(),/Recomposición/);assert.match(await review.innerText(),/Moderada/);assert.doesNotMatch(await review.innerText(),/Seleccionado|fat_loss|activity_level/);
 assert.equal(await review.locator('dt').count(),11,'One answer per original field');await position('[data-intakepanel="3"] h3');await shot('candidate-review');
 assert.equal(await page.locator('#coachRelaunch_share').isChecked(),false,'Sharing remains voluntary');
 await page.locator('.ncc-intake-steps [data-intakestep="0"]').click();assert.equal((await read()).payload.objective,payload.payload.objective);assert.equal((await read()).payload.activity_level,payload.payload.activity_level);assert.equal((await read()).payload.weight_kg,80.5);
 // A revision opens with the original answers, never requests a replacement intake.
 await setup(true);assert.equal(await page.locator('[name=coachRelaunch_objective][value=recomp]').isChecked(),true);assert.equal(await page.locator('[name=coachRelaunch_activity_level][value=moderate]').isChecked(),true);assert.equal(await page.locator('#coachRelaunch_share').isChecked(),false);
 assert.equal(await page.locator('#coachRelaunch_age_years').inputValue(),'41');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 // Original authorized coach read view: the same codes are readable, not editable.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('mentor');const s=v.state;s.roster=[{user_id:'pupil-a',nickname:'Ana · ejemplo',active:true}];window.__NCC_WORKSPACE_HOOKS__.setConsent({'pupil-a':true});s.coachIntakeVerified=true;s.coachIntakeForms={'pupil-a':{student_id:'pupil-a',shared_at:'2026-11-13T10:00:00Z',objective:'recomp',age_years:41,height_cm:174,weight_kg:80.5,activity_level:'moderate',dietary_pattern:'omnivore',preferred_foods:'Arroz, pollo y verduras'}};s.coachIntakeGoals={};s.coachIntakeAccess={};s.tab='coachStudents';s.selectedStudent='pupil-a';s.consent={accepted:true};await v.render();});
 await page.locator('[data-coachsection=coachStudentIntake]').click();await page.locator('.coach-intake-shared').scrollIntoViewIfNeeded();assert.match(await page.locator('.coach-intake-shared').innerText(),/Recomposición/);await shot('coach-existing-read-view');
 assert.equal(await page.evaluate(()=>window.__NCC_WORKSPACE_FIXTURE__.writes.length),0);assert.deepEqual(errors,[]);
 evidence.push({engine,width,allCodesUnchanged:true,nativeKeyboard:true,accessibleNames:true,requiredValidation:true,originalReview:true,prefillAndValuesPreserved:true,sharingOptional:true,authorizedCoachView:true,noWrites:true,noOverflow:true,colors});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify({baseline:base,cases:evidence},null,2));console.log('PASS intake cards review',evidence.length);
}finally{server.close();}
