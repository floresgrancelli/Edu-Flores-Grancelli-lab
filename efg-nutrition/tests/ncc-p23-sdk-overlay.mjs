// NCC P23: P20/P21 staged pilot code + REAL local Supabase SDK/GoTrue/RLS.
// Executes within the EXISTING disposable sdk-entry-local CI stack, with a
// NEW fictional student. Absolutely no hosted calls, deployments or approvals.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createLocalMailReader} from './sdk-entry-mail-local.mjs';
import {literal as q,yes} from './helpers/coach119-local.mjs';

export async function runP23SdkOverlay({users,orgs,request,sql}={}){
 assert.equal(process.env.GITHUB_ACTIONS,'true','P23 is confined to CI');
 assert.equal(process.env.EFG_QA_SDK_ENTRY,'1','P23 requires existing SDK fixture');
 assert.equal(sql("select local_only from efg_private.nut57_isolated_staging_marker"),'t');
 assert.equal(typeof request,'function');
 const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV,'utf8')
  .split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{
   const p=line.indexOf('=');
   return [line.slice(0,p),line.slice(p+1).trim().replace(/^['"]|['"]$/g,'')];
  }));
 const apiUrl=env.API_URL,publicKey=env.ANON_KEY||env.PUBLISHABLE_KEY;
 assert.ok(['http://127.0.0.1:54321','http://localhost:54321'].includes(apiUrl));
 assert.ok(typeof publicKey==='string'&&publicKey.length>20);
 assert.ok((env.MAILPIT_URL||env.INBUCKET_URL||'').startsWith('http://127.0.0.1:')||
  (env.MAILPIT_URL||env.INBUCKET_URL||'').startsWith('http://localhost:'));
 const readOtp=createLocalMailReader({origin:env.MAILPIT_URL||env.INBUCKET_URL});
 const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
 const tool=join(repoRoot,'efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs');
 const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
 assert.match(sha,/^[a-f0-9]{40}$/);
 const out=mkdtempSync(join(tmpdir(),'ncc-p23-sdk-local-'));
 const build='ncc-pilot-'+sha.slice(0,12),changes=[],blocked=[],faults=[],missing=[];
 const reportDir=resolve(repoRoot,'artifacts/sdk-entry');mkdirSync(reportDir,{recursive:true});
 const fixtureMail='sdk-p23-student-'+randomBytes(5).toString('hex')+'@example.invalid';
 const student=yes(await request('/auth/v1/signup',{method:'POST',body:{
  email:fixtureMail,password:randomBytes(20).toString('hex')+'!Ab3'
 }}),'P23 fictional local student');
 assert.ok(student.user?.id);
 const id=student.user.id;
 const coach=users.coachA,otherCoach=users.coachB,org=orgs.A;
 assert.ok(coach?.id&&otherCoach?.id&&org);
 const invite="insert into public.efg_invitations(email,nickname,role,organization_id,invited_by) values("+
  [q(fixtureMail),q('P23 fictional student'),q('student'),q(org),q(coach.id)].join(',')+");";
 sql(invite); // Inside existing LOCAL Supabase stack only.
 assert.equal(sql("select count(*) from public.efg_goals where student_id="+q(id)),'0');
 let server=null,browser=null;
 const contexts=[];
 const sameDir=(root,file)=>file===root||file.startsWith(root+sep);
 const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html',
  '.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
  '.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2'};
 let origin=null;
 try{
  const raw=execFileSync(process.execPath,[tool,'--emit','--pilot-ui-draft',
   '--ack=PREPARE_ONLY_NOT_GO','--expected-sha='+sha,'--build='+build,'--out='+out],
   {cwd:repoRoot,encoding:'utf8'});
  const status=JSON.parse(raw),manifest=JSON.parse(readFileSync(join(out,'review-manifest.json'),'utf8'));
  assert.equal(status.status,'STAGED_OUTSIDE_REPO_NOT_PUBLISHED');
  assert.equal(status.activationFlagsProposed,7);
  assert.equal(manifest.activationFlags.length,7);
  assert.equal(manifest.activationFlags.some(x=>x.flag==='SCIENCE_WELCOME_ENABLED'),true,
   'Eight panels must be proposed ON as part of the actual pilot release');
  assert.equal(manifest.deliberatelyDisabledFlags.length,7);
  assert.equal(manifest.expectedGitSha,sha);
  assert.equal(manifest.noProductionEdits,true);assert.equal(manifest.noPublicationAuthorization,true);
  server=createServer((req,res)=>{
   const uri=new URL(req.url,'http://127.0.0.1');
   try{
    const path=decodeURIComponent(uri.pathname);
    assert.ok(path.startsWith('/efg-nutrition/'),'No external or unrelated paths');
    const relative=path.slice(1)+(path.endsWith('/')?'index.html':'');
    const staged=resolve(out,relative),original=resolve(repoRoot,relative);
    assert.ok(sameDir(out,staged)&&sameDir(repoRoot,original),'Path traversal');
    const source=existsSync(staged)?staged:original;
    if(existsSync(staged))changes.push(path);
    let bytes=readFileSync(source);
    if(path==='/efg-nutrition/pilot/pilot.js'){
     let code=bytes.toString('utf8');
     const change=(re,target)=>{
      assert.equal([...code.matchAll(re)].length,1,'P23 SDK source anchor changed');
      code=code.replace(re,target);
     };
     assert.ok(code.includes('https://esm.sh/@supabase/supabase-js@2.118.0'));
     change(/^const SUPABASE_URL="[^"]+";/gm,'const SUPABASE_URL='+JSON.stringify(apiUrl)+';');
     change(/^const SUPABASE_PUBLISHABLE="[^"]+";/gm,'const SUPABASE_PUBLISHABLE='+JSON.stringify(publicKey)+';');
     change(/emailRedirectTo:"https:\/\/efg-nutrition.onrender.com\/pilot\/"/g,
      'emailRedirectTo:'+JSON.stringify(origin+'/efg-nutrition/pilot/'));
     bytes=Buffer.from(code);
    }
    res.writeHead(200,{'Content-Type':types[extname(source)]||'application/octet-stream',
     'Cache-Control':'no-store'});res.end(bytes);
   }catch{
    missing.push(uri.pathname);res.writeHead(404);res.end('P23 LOCAL ONLY');
   }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
  async function pageFor(){
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   contexts.push(context);
   await context.route('**/*',route=>{
    const target=new URL(route.request().url());
    if([origin,apiUrl,'https://esm.sh'].includes(target.origin))return route.continue();
    blocked.push(target.origin);
    return route.abort();
   });
   const page=await context.newPage();
   page.on('pageerror',e=>faults.push(e.name));
   page.on('dialog',d=>d.accept());
   return page;
  }
  async function login(page,identity){
   await page.goto(origin+'/efg-nutrition/pilot/',{waitUntil:'domcontentloaded'});
   await page.locator('#loginEmail').waitFor({timeout:20000});
   const after=Date.now();
   await page.locator('#loginEmail').fill(identity.email);
   await page.locator('#pilot-login-form button[type=submit]').click();
   await page.locator('#loginOtp').waitFor();
   const otp=await readOtp({email:identity.email,after});
   await page.locator('#loginOtp').fill(otp);
   await page.locator('#pilot-otp-form button[type=submit]').click();
   await page.waitForFunction(()=>!document.querySelector('#loginOtp')&&
    (!!document.querySelector('.ns-welcome-slide')||
     !!document.querySelector('.efg-coach-legal')||
     !!document.querySelector('#efgPilotParticipate')||
     !!document.querySelector('[data-tab="coachStudents"]')),null,{timeout:25000});
  }
  const studentPage=await pageFor(),coachPage=await pageFor();
  await login(studentPage,{email:fixtureMail});
  for(let step=1;step<=8;step++){
   await studentPage.locator('.ns-welcome-slide[data-science-step="'+step+'"]').waitFor();
   if(step<8)await studentPage.locator('[data-act="scienceNext"]').click();
   else await studentPage.locator('[data-act="scienceFinish"]').click();
  }
  const terms=studentPage.locator('#efgCoachPilotLegal_terms');
  const privacy=studentPage.locator('#efgCoachPilotLegal_privacy');
  await terms.waitFor();assert.equal(await terms.isChecked(),false);
  assert.equal(await privacy.isChecked(),false);
  await terms.check();await privacy.check();
  await studentPage.locator('[data-act="acceptCoachPilotLegal"]').click();
  await studentPage.locator('#efgPilotParticipate').waitFor();
  assert.equal(await studentPage.locator('#efgPilotShare').isChecked(),false);
  await studentPage.locator('#efgPilotParticipate').check();
  await studentPage.locator('#efgPilotShare').check();
  await studentPage.locator('#efgPilotContinue').click();
  const form=studentPage.locator('#efgCoachRelaunchForm');await form.waitFor();
  await studentPage.locator('#coachRelaunch_objective').selectOption('fat_loss');
  await studentPage.locator('#coachRelaunch_activity_level').selectOption('moderate');
  await studentPage.locator('#coachRelaunch_dietary_pattern').selectOption('omnivore');
  for(const [key,value] of [['age_years','40'],['height_cm','175'],['weight_kg','86.4']])
   await studentPage.locator('#coachRelaunch_'+key).fill(value);
  await studentPage.locator('#coachRelaunch_share').uncheck();
  await form.locator('button[type=submit]').click();
  await studentPage.locator('[data-tab="privacy"]:visible').first().click();
  await studentPage.locator('[data-act="grantConsent"]').click();
  await studentPage.locator('[data-act="revokeConsent"]').waitFor();
  await studentPage.locator('[data-tab="intake"]:visible').first().click();
  await studentPage.locator('#coachRelaunch_share').check();
  await studentPage.locator('#efgCoachRelaunchManageForm button[type=submit]').click();
  // The intake editor legitimately stays open while its tab is selected.
  // Check the REAL database receipt, then reload into the Home waiting route.
  let persistedSharing=false;
  for(let attempt=0;attempt<60;attempt++){
   if(sql('select count(*) from public.efg_coach_relaunch_intakes where student_id='+
    q(id)+' and shared_at is not null')==='1'){persistedSharing=true;break;}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(persistedSharing,true,'Signed sharing did not persist in local PostgreSQL');
  assert.equal(await studentPage.locator('#studentMeals').count(),0);
  await studentPage.reload();
  await studentPage.locator('.efg-coach-waiting').waitFor();
  assert.equal(await studentPage.locator('.ns-welcome-slide').count(),0,
   'Intro should only appear once after signed educational receipt');
  assert.equal(sql('select count(*) from public.efg_coach_relaunch_intakes where student_id='+q(id)),'1');
  sql('insert into public.efg_student_plan_access(student_id,organization_id,coach_id) values('+
   [q(id),q(org),q(coach.id)].join(',')+') on conflict(student_id) do nothing;');
  assert.equal(sql('select count(*) from public.efg_goals where student_id='+q(id)),'0');
  await login(coachPage,coach);
  if(await coachPage.locator('.ns-welcome-slide').count()){
   await coachPage.locator('[data-act="scienceSkip"]').click();
   await coachPage.locator('.ns-welcome-slide').waitFor({state:'detached'});
  }
  await coachPage.locator('[data-tab="coachStudents"]:visible').first().click();
  await coachPage.locator('[data-student="'+id+'"]').first().click();
  await coachPage.locator('[data-coachsection="coachStudentGoals"]').click();
  await coachPage.locator('#targetSex').selectOption('male');
  await coachPage.locator('#targetGoal').selectOption('fat_loss');
  for(const [key,value]of [['targetAge','40'],['targetHeight','175'],['targetWeight','86.4']])
   await coachPage.locator('#'+key).fill(value);
  await coachPage.locator('#targetActivity').selectOption('1.5');
  await coachPage.locator('#targetProtein').selectOption('2.2');
  await coachPage.locator('#targetFat').selectOption('0.6');
  await coachPage.locator('[data-act="calculateGoal"]').click();
  await coachPage.locator('#proposalGoalKcal').fill('2500');
  await coachPage.locator('[data-act="adjustCalculatedGoal"]').click();
  await coachPage.locator('[data-act="makeGuidedDay"]:not([data-periodic-new-guide])').first().click();
  assert.equal(await coachPage.locator('#coachGuidedSlot .efg-guide-meal').count(),6,
   'Count only the editable guide; the automatic read-only preview is a distinct panel');
  assert.equal(sql('select count(*) from public.efg_goals where student_id='+q(id)),'0',
   'Automatic guide generation is NOT a publication');
  const qty=coachPage.locator('[data-guideqty="almuerzo:0"]').first();
  await qty.fill(String(Number(await qty.inputValue())+1));await qty.press('Tab');
  await coachPage.locator('[data-act="saveCoachAtomicDraft"]').first().click();
  await coachPage.getByText(/Versión del borrador:/).first().waitFor();
  assert.equal(sql("select count(*) from public.efg_coach_plan_drafts where student_id="+q(id)+
   " and status='draft'"),'1','Actual server-owned private Coach draft');
  assert.equal(sql('select count(*) from public.efg_goals where student_id='+q(id)),'0');
  assert.equal(sql('select count(*) from public.efg_daily_logs where student_id='+q(id)),'0');
  await studentPage.reload();await studentPage.locator('.efg-coach-waiting').waitFor();
  await coachPage.locator('[data-act="logout"]:visible').first().click();
  await coachPage.locator('#loginEmail').waitFor();
  await login(coachPage,otherCoach);
  if(await coachPage.locator('.ns-welcome-slide').count()){
   await coachPage.locator('[data-act="scienceSkip"]').click();
   await coachPage.locator('.ns-welcome-slide').waitFor({state:'detached'});
  }
  await coachPage.locator('[data-tab="coachStudents"]:visible').first().click();
  assert.equal(await coachPage.locator('[data-student="'+id+'"]').count(),0,
   'Different coach/organization cannot see selected student');
  assert.equal(missing.length,0,'No asset missing in versioned overlay');
  assert.equal(faults.length,0,'No browser errors in real PWA');
  assert.equal(blocked.filter(host=>host.includes('supabase.co')||host.includes('onrender.com')).length,0,
   'No hosted Supabase or Render access allowed');
  assert.equal(changes.some(p=>p==='/efg-nutrition/pilot/science-welcome.js'),true);
  assert.equal(changes.some(p=>p==='/efg-nutrition/pilot/pilot.js'),true);
  const done={status:'PASS_P23_LOCAL_SDK_OVERLAY',sha,
   genuineLocalOtp:true,educationScreens:8,educationOnce:true,
   separateTermsPrivacy:true,studentWait:true,guideSlots:6,
   coachEditedAndSavedPrivate:true,atomicPublicationNotAttempted:true,
   studentMealWrites:0,crossOrganizationDenied:true,
   stagedAssetsServed:true,remoteHostedCalls:0,noProductionWrites:true,
   noHumanApprovals:true};
  writeFileSync(join(reportDir,'p23-overlay-result.json'),JSON.stringify(done,null,2));
  console.log('PASS NCC P23: staged P20/P21 frontend + real local GoTrue OTP/JWT/DB; 8 education steps, legal, share, wait, actual six-slot Coach draft, cross-org deny, no diary/publish/hosted.');
  return done;
 }finally{
  await Promise.allSettled(contexts.map(c=>c.close()));
  await browser?.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  rmSync(out,{recursive:true,force:true});
 }
}
