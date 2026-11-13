// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/intake-routine-review');
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

const base='97604ee0e848f1ef8a431b10015275b03af46fe9';
const prior=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/coach-relaunch-entry-client.js'],{cwd:root,encoding:'utf8'});
const priorCss=execFileSync('git',['-c','safe.directory='+resolve(root),'show',base+':efg-nutrition/pilot/workspace-tabs.css'],{cwd:root,encoding:'utf8'});
const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});let baseline=false;
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await context.route('**/coach-relaunch-entry-client.js*',r=>baseline?r.fulfill({contentType:'text/javascript',body:prior}):r.continue());
 await context.route('**/workspace-tabs.css*',r=>baseline?r.fulfill({contentType:'text/css',body:priorCss}):r.continue());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>page.screenshot({path:resolve(out,engine+'-'+width+'-'+name+'.png')});
 const setup=async()=>{
  await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
  await page.evaluate(async()=>{
   const a=window.__NCC_R4_FULLAPP__;a.state.tab='intake';
   const {renderCoachRelaunchEntry}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');
   const {COACH_RELEASE_INTAKE_VERSION}=await import('/efg-nutrition/pilot/coach-relaunch-onboarding.js');
   const status={completed_version:COACH_RELEASE_INTAKE_VERSION,revision:2,objective:'recomp',activity_level:'moderate',age_years:41,height_cm:174,weight_kg:80.5,dietary_pattern:'omnivore',eating_window:'regular',preferred_foods:'Arroz, pollo y verduras',notes:'Suelo preparar la cena al volver del trabajo.',meal_routine:'Desayuno 7 · Almuerzo 13 · Cena 21',shared_at:null};
   document.querySelector('.pilot-main').innerHTML=renderCoachRelaunchEntry({route:'ready',status},{editing:true,guided:true,privateHealthEnabled:true});
   document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
  });
  await page.locator('.ncc-intake-steps [data-intakestep="2"]').click();await page.evaluate(()=>{const h=document.querySelector('[data-intakepanel="2"] h3');window.scrollTo({top:h.getBoundingClientRect().top+scrollY-160,behavior:'instant'});});
 };
 const read=()=>page.evaluate(async()=>{const {readCoachRelaunchForm}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');return readCoachRelaunchForm(document);});
 if(engine==='chromium'&&width===390){baseline=true;await setup();await shot('before-routine');baseline=false;}
 await setup();const initial=await read();assert.equal(initial.payload.notes,'Suelo preparar la cena al volver del trabajo.');assert.equal(await page.locator('#efgCoachRelaunchManageForm').count(),1);assert.equal(await page.locator('#efgCoachRelaunchForm').count(),0,'Existing intake is edited, never required again');
 const notes=page.locator('#coachRelaunch_notes'),routine=page.locator('#coachRelaunch_meal_routine');
 assert.equal(await page.locator('[data-intakeprompt]').count(),3);assert.equal(await notes.getAttribute('required'),null);assert.equal(await routine.getAttribute('required'),null);assert.equal(await page.locator('#coachRelaunch_notes').count(),1);await shot('candidate-routine');
 const phrases=['Me falta tiempo','Me cuesta organizarme','Me cuesta mantener la constancia'];
 for(const phrase of phrases){await page.locator('[data-intakeprompt="'+phrase+'"]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'coachRelaunch_notes');}
 const combined=initial.payload.notes+'\n'+phrases.join('\n');assert.equal(await notes.inputValue(),combined);const next=await read();assert.deepEqual({...next.payload,notes:initial.payload.notes},initial.payload,'Only the original notes field changes');assert.equal(next.shareWithCoach,false);
 await page.locator('[data-intakeprompt="Me falta tiempo"]').click();assert.equal(await notes.inputValue(),combined,'Repeated clicks do not duplicate a suggestion');
 // Native keyboard can activate each writing aid.
 await notes.fill('Texto libre que ya estaba.');await page.locator('[data-intakeprompt="Me cuesta organizarme"]').focus();await page.keyboard.press('Enter');assert.equal(await notes.inputValue(),'Texto libre que ya estaba.\nMe cuesta organizarme');
 await notes.fill(combined+'\nPrefiero cocinar los domingos.');const edited=await notes.inputValue();await page.locator('[data-intakenext="3"]').click();assert.match(await page.locator('[data-intakereview]').innerText(),/Prefiero cocinar los domingos/);assert.equal(await page.locator('[data-intakereview] dt').count(),11);await shot('review-free-text');
 await page.locator('.ncc-intake-steps [data-intakestep="2"]').click();assert.equal(await notes.inputValue(),edited);assert.equal(await routine.inputValue(),initial.payload.meal_routine);await shot('answer-kept');
 await notes.fill('x'.repeat(995));await page.locator('[data-intakeprompt="Me falta tiempo"]').click();assert.equal(await notes.inputValue(),'x'.repeat(995),'Limit never truncates existing text');assert.match(await page.locator('[data-intakepromptstatus]').innerText(),/no se borró nada/);
 await notes.fill('');await routine.fill('');await page.locator('[data-intakenext="3"]').click();assert.equal(await page.locator('[data-intakepanel="3"]').isVisible(),true);assert.equal((await read()).payload.notes,'');assert.equal((await read()).payload.meal_routine,'');assert.equal((await read()).shareWithCoach,false);await shot('optional-empty-review');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>window.__NCC_WORKSPACE_FIXTURE__.writes.length),0);assert.deepEqual(errors,[]);
 evidence.push({engine,width,oneExistingTextField:true,existingIntakeRemainsEditable:true,noDefaultSuggestions:true,allThreeExamples:true,onlyNotesChanges:true,nativeKeyboard:true,originalAndEditedTextPreserved:true,noRepeatedSuggestion:true,lengthLimitPreservesText:true,emptyAnswersValid:true,reviewUsesExistingField:true,sharingOptional:true,noWrites:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify({baseline:base,cases:evidence},null,2));console.log('PASS intake routine review',evidence.length);
}finally{server.close();}
