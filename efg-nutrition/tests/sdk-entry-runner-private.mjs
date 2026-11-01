import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {chromium} from 'playwright';
import {localSdkEntrySource,localSdkEntryFlag} from './sdk-entry-source-private.mjs';
import {createLocalMailReader} from './sdk-entry-mail-local.mjs';
export async function runSdkEntryBrowser({users,orgs,official,enableLocalPublication,sql}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_SDK_ENTRY,'1');
 const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV,'utf8').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
 assert.ok(['http://127.0.0.1:54321','http://localhost:54321'].includes(env.API_URL));
 const readOtp=createLocalMailReader({origin:env.MAILPIT_URL||env.INBUCKET_URL});
 const root=process.cwd(),out=resolve('artifacts/sdk-entry');mkdirSync(out,{recursive:true});
 let origin,browser,phase='setup';const contexts=[],safeTraffic=[],results=[],sourceFailures=[],resourceFailures=[],pageFaults=[];
 const server=createServer((req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''));
  assert.ok(file.startsWith(root+'/'));let bytes=readFileSync(file);
  if(path==='/efg-nutrition/pilot/pilot.js')bytes=Buffer.from(localSdkEntrySource(bytes.toString(),{apiUrl:env.API_URL,publishableKey:env.ANON_KEY||env.PUBLISHABLE_KEY,origin,declarationPanel:true,official}));
  else if(extname(file)==='.js')bytes=Buffer.from(localSdkEntryFlag(path,bytes.toString()));
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.avif':'image/avif'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{sourceFailures.push(new URL(req.url,'http://localhost').pathname);res.writeHead(500);res.end('LOCAL_SOURCE_FAILURE');}});
 const snapshot=page=>page.evaluate(()=>window.__SDK_ENTRY_QA__.snapshot());
 const settled=page=>page.waitForFunction(()=>window.__SDK_ENTRY_QA__?.snapshot().role&&!window.__SDK_ENTRY_QA__.snapshot().loading);
 async function pageFor(width){
  const context=await browser.newContext({viewport:{width,height:860},serviceWorkers:'block'});contexts.push(context);
  await context.route('**/*',route=>{const url=new URL(route.request().url());return [origin,env.API_URL].includes(url.origin)||url.origin==='https://esm.sh'?route.continue():route.abort();});
  const page=await context.newPage();
  page.on('pageerror',e=>pageFaults.push({kind:e.name,locations:(e.stack||'').match(/[a-zA-Z0-9_-]+\.(?:m?js):[0-9]+:[0-9]+/g)||[]}));
  page.on('requestfailed',r=>{const u=new URL(r.url());resourceFailures.push({origin:u.origin,path:u.pathname});});
  page.on('response',r=>{const u=new URL(r.url());if(u.origin===env.API_URL)safeTraffic.push({path:u.pathname,method:r.request().method(),status:r.status()});});
  // Never collect console/errors containing Auth payloads, storageState, HAR or traces.
  page.on('dialog',dialog=>dialog.accept());return page;
 }
 async function login(page,actor){
  phase='login-open';await page.goto(origin+'/efg-nutrition/pilot/');phase='login-email';await page.locator('#loginEmail').fill(actor.email);
  phase='login-request-otp';const after=Date.now();await page.locator('#pilot-login-form button[type=submit]').click();
  phase='login-read-local-mail';const code=await readOtp({email:actor.email,after});phase='login-fill-otp';await page.locator('#loginOtp').fill(code);
  phase='login-submit-otp';await page.locator('#pilot-otp-form button[type=submit]').click();phase='login-hydration';await settled(page);
  assert.equal((await snapshot(page)).userId,actor.id);assert.equal(await page.locator('#loginOtp').count(),0);
 }
 async function logout(page){await page.locator('[data-act="logout"]:visible').first().click();await page.locator('#loginEmail').waitFor();assert.equal((await snapshot(page)).userId,null);}
 async function legalAndIntro(page,role){
  const terms=role==='coach'?'#efgLegalCheck_terms':'#efgCoachPilotLegal_terms',privacy=role==='coach'?'#efgLegalCheck_privacy':'#efgCoachPilotLegal_privacy';
  const accept=role==='coach'?'[data-act="confirmLegalAcceptance"]':'[data-act="acceptCoachPilotLegal"]';
  if(await page.locator(terms).count()){
   assert.equal(await page.locator(terms).isChecked(),false);assert.equal(await page.locator(privacy).isChecked(),false);
   await page.locator(terms).check();const before=safeTraffic.filter(r=>r.path.endsWith('/efg_accept_current_legal')).length;
   await page.locator(accept).click();assert.equal(safeTraffic.filter(r=>r.path.endsWith('/efg_accept_current_legal')).length,before);
   await page.locator(privacy).check();await page.locator(accept).click();
   await page.waitForFunction(()=>!document.querySelector('#efgCoachPilotLegal_terms,#efgLegalCheck_terms'));
  }
  if(await page.locator('[data-act="scienceSkip"]').count()){
   await page.locator('[data-act="scienceSkip"]').click();await page.locator('[data-act="scienceSkip"]').waitFor({state:'detached'});
  }
 }
 async function declare(page){
  phase='declaration-open';if(!await page.locator('[data-restriction-form]').count())await page.locator('[data-sdk-declaration-open]').click();
  phase='declaration-form';const form=page.locator('[data-restriction-form]');await form.waitFor();
  for(const n of ['none','processing','sharing']){assert.equal(await form.locator('[name='+n+']').isChecked(),false);await form.locator('[name='+n+']').check();}
  phase='declaration-submit';await form.locator('button[type=submit]').click();await page.locator('[data-restriction-revoke]').waitFor();
  // Regression: save creates the revoke control immediately and clears all choices.
  for(const n of ['none','processing','sharing'])assert.equal(await page.locator('[data-restriction-form] [name='+n+']').isChecked(),false);
 }
 async function revoke(page){await page.locator('[data-restriction-revoke]').click();await page.locator('[data-restriction-revoke]').waitFor({state:'detached'});
  for(const n of ['none','processing','sharing'])assert.equal(await page.locator('[data-restriction-form] [name='+n+']').isChecked(),false);}
 async function studentEntry(page,student){
  await login(page,student);assert.equal((await snapshot(page)).intakeRevision,null);
  const sid=(await snapshot(page)).sessionId;assert.ok(sid);
  await page.reload();await settled(page);assert.equal((await snapshot(page)).sessionId,sid);
  assert.equal((await page.evaluate(()=>window.__SDK_ENTRY_QA__.refreshSession())).ok,true);assert.equal((await snapshot(page)).sessionId,sid);
  phase='student-legal';await legalAndIntro(page,'student');await page.locator('#efgPilotParticipate').waitFor();
  await page.locator('#efgPilotParticipate').check();await page.locator('#efgPilotShare').check();await page.locator('#efgPilotContinue').click();
  await page.locator('#efgCoachRelaunchForm').waitFor();
  await page.locator('#coachRelaunch_objective').selectOption('fat_loss');await page.locator('#coachRelaunch_dietary_pattern').selectOption('omnivore');
  await page.locator('#coachRelaunch_age_years').fill('40');await page.locator('#coachRelaunch_height_cm').fill('175');await page.locator('#coachRelaunch_weight_kg').fill('86.4');
  await page.locator('#coachRelaunch_preferred_foods').fill('banana');await page.locator('#coachRelaunch_disliked_foods').fill('apple');await page.locator('#coachRelaunch_share').uncheck();
  phase='student-save-private-intake';await page.locator('#efgCoachRelaunchForm button[type=submit]').click();await page.waitForFunction(()=>window.__SDK_ENTRY_QA__.snapshot().intakeRevision===1);await settled(page);
  assert.equal((await snapshot(page)).route,'private');
  phase='student-followup-consent';await page.locator('[data-tab="privacy"]:visible').first().click();await page.locator('[data-act="grantConsent"]').click();await page.locator('[data-act="revokeConsent"]').waitFor();
  phase='student-share-intake';await page.locator('[data-tab="intake"]:visible').first().click();await page.locator('#coachRelaunch_share').check();
  await page.locator('#efgCoachRelaunchManageForm button[type=submit]').click();await page.waitForFunction(()=>window.__SDK_ENTRY_QA__.snapshot().intakeRevision===2);await settled(page);
  assert.equal((await snapshot(page)).route,'review');
  phase='student-declaration';
  await declare(page);await revoke(page);await declare(page); // Same open panel: regression covers both transitions.
  await page.locator('[data-tab="intake"]:visible').first().click();await page.locator('#coachRelaunch_disliked_foods').fill('UNSAVED TEST ONLY');
  await page.reload();await settled(page);await page.locator('[data-tab="intake"]:visible').first().click();
  assert.equal(await page.locator('#coachRelaunch_disliked_foods').inputValue(),'apple');assert.equal((await snapshot(page)).intakeRevision,2);
  return sid;
 }
 async function coachDetail(page,student){
  phase='coach-roster';
  await page.locator('[data-tab="coachStudents"]:visible').first().click();await page.locator('[data-student="'+student.id+'"]').first().click();
  await page.locator('#coachStudentGoals > summary').click();
 }
 async function prepare(page){
  await page.locator('#targetSex').selectOption('male');await page.locator('#targetGoal').selectOption('fat_loss');
  for(const [id,value]of [['targetAge','40'],['targetHeight','175'],['targetWeight','86.4']])await page.locator('#'+id).fill(value);
  await page.locator('#targetActivity').selectOption('1.5');await page.locator('#targetProtein').selectOption('2.2');await page.locator('#targetFat').selectOption('0.6');
  await page.locator('[data-act="calculateGoal"]').click();await page.locator('#proposalGoalKcal').fill('2100');
  await page.locator('[data-act="adjustCalculatedGoal"]').click();
  await page.locator('[data-bound-preferred]').selectOption('banana');await page.locator('[data-bound-disliked]').selectOption('apple');await page.locator('[data-bound-source-review]').check();
  const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/efg_prepare_bound_guide')&&r.request().method()==='POST');
  const oldButton=await page.locator('[data-bound-prepare]').elementHandle();
  await page.locator('[data-bound-prepare]').click();assert.equal((await response).status(),200);await oldButton.waitForElementState('hidden');
  await page.locator('#coachStudentGoals > summary').click();
  await page.locator('[data-act="openCoachAdaptedPreview"]').click();await page.locator('[data-persisted-revision]').waitFor();
  const goal=await page.evaluate(()=>window.__SDK_ENTRY_QA__.goal()),view=await page.evaluate(()=>window.__SDK_ENTRY_QA__.guide());
  assert.deepEqual(view.editor.review.targets,{k:goal.kcal,p:goal.protein_g,c:goal.carb_g,f:goal.fat_g,fi:goal.fiber_g});
  assert.ok(view.editor.committed.meals.every(m=>m.items.every(i=>i.id!=='apple')));return goal;
 }
 async function openDraft(page){await page.locator('[data-act="openCoachAdaptedPreview"]').click();await page.locator('[data-persisted-revision]').waitFor();}
 try{
  await new Promise((r,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',r);});origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({headless:true});
  for(const [i,width]of [390,1280].entries()){
   const side=i?'B':'A',s=users['student'+side],c=users['coach'+side],student=await pageFor(width),coach=await pageFor(width);
   phase='student-entry-'+width;await studentEntry(student,s);enableLocalPublication(side);
   await student.locator('[data-sdk-declaration-open]').click();await student.locator('[data-restriction-revoke]').waitFor();
   await student.screenshot({path:join(out,'sdk-intake-'+width+'.png'),fullPage:true});
   phase='coach-entry-'+width;await login(coach,c);await legalAndIntro(coach,'coach');
   const deniedCoach=await coach.evaluate(id=>window.__SDK_ENTRY_QA__.probeForbiddenConsent(id),s.id);assert.equal(deniedCoach.rows,0);assert.ok(deniedCoach.code===null||deniedCoach.code==='42501');await coachDetail(coach,s);
   phase='prepare-edit-save-'+width;const goal=await prepare(coach),mount=coach.locator('#coachAdaptedDraftMount');
   await mount.getByRole('button',{name:'Editar borrador',exact:true}).click();const qty=mount.locator('[data-edit-row="desayuno:0"] input');await qty.fill(String(Number(await qty.inputValue())+1));await qty.press('Tab');
   await mount.getByRole('button',{name:'Conservar borrador editado',exact:true}).click();const expected=(await coach.evaluate(()=>window.__SDK_ENTRY_QA__.guide())).editor.committed;
   const revision=Number(await mount.locator('[data-persisted-revision]').getAttribute('data-persisted-revision'));
   await mount.getByRole('button',{name:'Guardar borrador privado',exact:true}).click();await mount.locator('[data-persisted-revision="'+(revision+1)+'"]').waitFor();
   phase='reload-'+width;await coach.reload();await settled(coach);await coachDetail(coach,s);await openDraft(coach);
   assert.deepEqual((await coach.evaluate(()=>window.__SDK_ENTRY_QA__.guide())).editor.committed,expected);
   await coach.screenshot({path:join(out,'sdk-coach-readback-'+width+'.png'),fullPage:true});
   // Hold an actual successful HTTP response, sign out through real SDK handler, release it.
   phase='late-response-switch-'+width;const priorSession=(await snapshot(coach)).sessionId;
   await mount.getByRole('button',{name:'Cerrar vista de prueba',exact:true}).click();let release,entered;const started=new Promise(r=>entered=r);
   await coach.route(env.API_URL+'/rest/v1/rpc/efg_read_bound_guide',async route=>{const response=await route.fetch();entered();await new Promise(r=>release=r);await route.fulfill({response});});
   await coach.locator('[data-act="openCoachAdaptedPreview"]').click();await Promise.race([started,new Promise((_,r)=>setTimeout(()=>r(Error('Real delayed RPC not reached')),15000))]);
   try{await logout(coach);}finally{release();}await coach.unroute(env.API_URL+'/rest/v1/rpc/efg_read_bound_guide');
   assert.equal(await coach.locator('[data-guide-totals]').count(),0);
   const other=users['coach'+(side==='A'?'B':'A')];await login(coach,other);await legalAndIntro(coach,'coach');
   const deniedOtherCoach=await coach.evaluate(id=>window.__SDK_ENTRY_QA__.probeForbiddenConsent(id),s.id);assert.equal(deniedOtherCoach.rows,0);assert.ok(deniedOtherCoach.code===null||deniedOtherCoach.code==='42501');
   await coach.locator('[data-tab="coachStudents"]:visible').first().click();assert.equal(await coach.locator('[data-student="'+s.id+'"]').count(),0);assert.equal(await coach.locator('[data-guide-totals]').count(),0);
   await logout(coach);await login(coach,c);await coachDetail(coach,s);await openDraft(coach);
   assert.notEqual((await snapshot(coach)).sessionId,priorSession);
   assert.deepEqual((await coach.evaluate(()=>window.__SDK_ENTRY_QA__.guide())).editor.committed,expected);
   // A saved new general-intake revision also invalidates the old binding, not just local edits.
   phase='stale-intake-'+width;
   await student.locator('#coachRelaunch_notes').fill('Fictional updated meal schedule');
   await student.locator('#efgCoachRelaunchManageForm button[type=submit]').click();
   await student.waitForFunction(()=>window.__SDK_ENTRY_QA__.snapshot().intakeRevision===3);await settled(student);
   const beforeStale=safeTraffic.filter(r=>r.path.endsWith('/efg_save_bound_guide')).length;
   await mount.getByRole('button',{name:'Guardar borrador privado',exact:true}).click();await mount.getByRole('alert').waitFor();
   assert.equal(safeTraffic.filter(r=>r.path.endsWith('/efg_save_bound_guide')).length,beforeStale);
   await coach.reload();await settled(coach);await coachDetail(coach,s);assert.equal(await coach.evaluate(()=>window.__SDK_ENTRY_QA__.goal()),null);
   await prepare(coach);
   // Real student revocation invalidates an already opened coach draft before save.
   phase='revoke-'+width;await student.locator('[data-sdk-declaration-open]').click();await student.locator('[data-restriction-revoke]').waitFor();await revoke(student);
   const writes=safeTraffic.filter(r=>r.path.endsWith('/efg_save_bound_guide')).length;
   await mount.getByRole('button',{name:'Guardar borrador privado',exact:true}).click();await mount.getByRole('alert').waitFor();
   assert.equal(safeTraffic.filter(r=>r.path.endsWith('/efg_save_bound_guide')).length,writes);assert.equal(await mount.locator('[data-guide-totals]').count(),0);
   await declare(student);await coach.reload();await settled(coach);await coachDetail(coach,s);const finalGoal=await prepare(coach);assert.deepEqual(finalGoal,goal);
   phase='publish-'+width;await mount.locator('[data-bound-review]').check();await mount.locator('[data-bound-publish]').click();await mount.locator('[data-bound-published]').waitFor();
   await student.reload();await settled(student);await student.waitForFunction(()=>window.__SDK_ENTRY_QA__.snapshot().route==='ready');
   const rows=await student.evaluate(id=>window.__SDK_ENTRY_QA__.readGuide(id),s.id);assert.equal(rows.length,1);assert.equal(rows[0].guided_plan.meals.length,5);
   const foreign=await student.evaluate(id=>window.__SDK_ENTRY_QA__.readGuide(id),users['student'+(side==='A'?'B':'A')].id);assert.deepEqual(foreign,[]);
   await student.locator('[data-tab="home"]:visible').first().click();
   await student.locator('.efg-pastel-guide > summary').click();await student.getByText('Ver las cinco comidas de ejemplo',{exact:true}).click();
   assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await student.screenshot({path:join(out,'sdk-student-published-'+width+'.png'),fullPage:true});
   if(side==='A'){
    await logout(student);await login(student,users.studentB);
    const deniedStudent=await student.evaluate(id=>window.__SDK_ENTRY_QA__.probeForbiddenConsent(id),s.id);assert.equal(deniedStudent.rows,0);assert.ok(deniedStudent.code===null||deniedStudent.code==='42501');
    assert.equal((await snapshot(student)).intakeRevision,null);assert.equal(await student.locator('[data-guide-totals],.efg-guide-student').count(),0);
    assert.deepEqual(await student.evaluate(id=>window.__SDK_ENTRY_QA__.readGuide(id),s.id),[]);
   }
   results.push({width,entry:true,refresh:true,forms:true,readback:true,delayedResponseDiscarded:true,revocation:true,published:true,goal:finalGoal});
  }
  assert.ok(safeTraffic.some(x=>x.path==='/auth/v1/otp'&&x.status===200));assert.ok(safeTraffic.some(x=>x.path==='/auth/v1/verify'&&x.status===200));assert.ok(safeTraffic.some(x=>x.path==='/auth/v1/token'&&x.status===200));
  writeFileSync(join(out,'result.json'),JSON.stringify({status:'PASS_LOCAL_SDK_ENTRY',results,traffic:safeTraffic},null,2));
 }catch(error){const failure={status:'FAIL',phase,traffic:safeTraffic,sourceFailures,resourceFailures,pageFaults,intercepted:/intercepts pointer events/.test(error.message||''),strictLocator:/strict mode violation/.test(error.message||''),locations:(error.stack||'').match(/sdk-entry-runner-private\.mjs:[0-9]+:[0-9]+/g)||[]};writeFileSync(join(out,'failure.json'),JSON.stringify(failure));
  console.log('SDK_ENTRY_DIAGNOSTIC '+JSON.stringify(failure));
  throw Error('SDK_ENTRY_FAILED_'+phase); // Do not print Playwright call arguments containing an OTP.
 }finally{await Promise.allSettled(contexts.map(c=>c.close()));await browser?.close();if(server.listening)await new Promise(r=>server.close(r));}
}
