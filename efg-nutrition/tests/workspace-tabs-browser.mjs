// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/workspace-tabs');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/workspace-tabs-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/workspace-tabs-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/workspace-tabs-sdk.mjs'));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,coachRosterConsent};\n');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 const snap=async name=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' overflow');await page.screenshot({path:resolve(out,engine+'-'+width+'-'+name+'.png')});};
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='planner';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;});
 await page.locator('#nccGuideSections [data-workspace-tab=notes]').click();assert.equal(await page.locator('#nccGuideSections-notes').isVisible(),true);
 await page.locator('#nccGuideSections [data-workspace-tab=balance]').click();
 await page.locator('#nccGuideSections [data-workspace-tab=meals]').click();await page.locator('[data-studentguideslot=almuerzo]').click();
 await page.locator('[data-studentguideregister=almuerzo]').click();await page.locator('[data-guideentryqty="0"]').fill('125');await page.keyboard.press('Escape');
 await page.locator('#nccGuideSections [data-workspace-tab=notes]').click();await page.locator('#nccGuideSections [data-workspace-tab=meals]').click();
 await page.locator('[data-studentguideregister=almuerzo]').click();assert.equal(await page.locator('[data-guideentryqty="0"]').inputValue(),'125');await page.keyboard.press('Escape');
 await page.evaluate(()=>window.scrollTo(0,0));await snap('guide');
 // Student's actual versioned form and handlers. No submit/network writes.
 await page.evaluate(async()=>{const {renderCoachRelaunchEntry}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');document.querySelector('.pilot-main').innerHTML=renderCoachRelaunchEntry({route:'intake'},{guided:true});});
 await page.locator('#coachRelaunch_age_years').fill('41');await page.locator('.ncc-intake-steps [data-intakestep="1"]').click();await page.locator('#coachRelaunch_preferred_foods').fill('Arroz, pollo y verduras');
 await page.locator('.ncc-intake-steps [data-intakestep="0"]').click();assert.equal(await page.locator('#coachRelaunch_age_years').inputValue(),'41');
 assert.equal(await page.locator('[data-intakepanel]:visible').count(),1);await page.evaluate(()=>window.scrollTo(0,0));await snap('student-intake');
 // Coach's actual home, scoped received form and message center.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('mentor');const s=v.state;s.roster=[{user_id:'pupil-a',nickname:'Ana · ejemplo',active:true},{user_id:'pupil-b',nickname:'Bruno · ejemplo',active:true}];Object.assign(window.__NCC_WORKSPACE_HOOKS__.coachRosterConsent,{'pupil-a':true,'pupil-b':true});s.coachIntakeVerified=true;s.coachIntakeForms={'pupil-a':{student_id:'pupil-a',shared_at:'2026-11-12T10:00:00Z',objective:'fat_loss',age_years:31,height_cm:168,weight_kg:70,activity_level:'moderate',dietary_pattern:'standard',preferred_foods:'Arroz, pollo y verduras',meal_routine:'Desayuno 7 · Almuerzo 13 · Cena 21'}};s.coachIntakeGoals={};s.coachIntakeAccess={};s.tab='coach';await v.render();});
 assert.equal(await page.locator('[data-workspace-panel=nccCoachHomeSections]:visible').count(),1);await page.evaluate(()=>window.scrollTo(0,0));await snap('coach-home');
 await page.locator('#nccCoachHomeSections [data-workspace-tab=students]').click();assert.equal(await page.locator('#nccCoachHomeStudents').isVisible(),true);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='coachStudents';v.state.selectedStudent='pupil-a';v.state.consent={accepted:true};await v.render();});
 await page.locator('[data-coachsection=coachStudentIntake]').click();
 await page.locator('.coach-intake-shared').scrollIntoViewIfNeeded();await page.evaluate(()=>{document.querySelector('.coach-profile-tabs').scrollIntoView({block:'start'});window.scrollBy(0,-80);});await snap('coach-intake');
 await page.locator('#nccReceivedIntakeSections [data-workspace-tab=food]').click();assert.match(await page.locator('#nccReceivedIntakeSections-food').innerText(),/Arroz/);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='messages';await v.render();});await page.locator('[data-chat-contact="pupil-a"]').waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));await snap('messages');
 await page.locator('[data-chat-contact="pupil-a"]').click();await page.locator('#efgMessageText').fill('Quería revisar las alternativas.');
 await page.locator('[data-chat-back]').click();await page.locator('[data-chat-filter=drafts]').click();assert.equal(await page.locator('.efg-chat-contact').count(),1);
 await page.locator('[data-chat-contact="pupil-a"]').click();assert.equal(await page.locator('#efgMessageText').inputValue(),'Quería revisar las alternativas.');
 assert.equal(await page.evaluate(()=>window.__NCC_WORKSPACE_FIXTURE__.writes.length),0);await snap('conversation');
 // Admin: every mutation remains explicit; files and fields stay mounted.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('admin');v.state.tab='adminManage';v.state.platformAlias='EJEMPLO.ALIAS';await v.render();});
 await page.evaluate(()=>window.scrollTo(0,0));await snap('admin');
 await page.locator('#nccAdminSections [data-workspace-tab=new]').click();await page.locator('#newCoachName').fill('Borrador sin enviar');
 await page.locator('#nccAdminSections [data-workspace-tab=settings]').click();await page.locator('#platformAlias').fill('CAMBIO.SIN.GUARDAR');
 await page.locator('#nccAdminSections [data-workspace-tab=payments]').click();assert.equal(await page.locator('#nccAdminPayments').isVisible(),true);
 await page.locator('#nccAdminSections [data-workspace-tab=new]').click();assert.equal(await page.locator('#newCoachName').inputValue(),'Borrador sin enviar');
 await page.locator('#nccAdminSections [data-workspace-tab=settings]').click();assert.equal(await page.locator('#platformAlias').inputValue(),'CAMBIO.SIN.GUARDAR');
 assert.equal(await page.locator('[data-workspace-panel=nccAdminSections]:visible').count(),1);assert.deepEqual(errors,[]);evidence.push({engine,width,passed:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{server.close();}
