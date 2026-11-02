// Preparation only; authentic SDK/OTP and existing coach shell, no state injection.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {bridgeBrowserSource,localSdkEntryFlag} from './browser-source.mjs';
import {createLocalMailReader} from '../../efg-nutrition/tests/sdk-entry-mail-local.mjs';
import {verifyClinicalBridgeDOM} from './tests/bridge-dom-local.mjs';
import {frame} from './fixtures.mjs';
import {yes} from '../runner/local-context.mjs';
// No hydration overlay is silently installed. The incremental API baseline lacks
// some of the previously authorized SDK fixture's UI tables/policies.
export function checkBrowserSchema(sql){
 const missing=['efg_activities','efg_billing_settings','efg_invitations','efg_payments','efg_personal_targets','efg_weights'].filter(t=>sql(`select to_regclass('public.${t}') is not null`)!=='t');
 assert.deepEqual(missing,[],'DOM requires reviewed SDK hydration fixture, absent from API baseline; do not add grants implicitly');
}
export async function bridgeBrowser({sql,rpc,users,input,ids,newFixture,out}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_CLINICAL_BRIDGE,'1');checkBrowserSchema(sql);
 const {chromium}=await import('playwright');
 const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV,'utf8').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
 assert.ok(['http://127.0.0.1:54321','http://localhost:54321'].includes(env.API_URL));
 const readOtp=createLocalMailReader({origin:env.MAILPIT_URL||env.INBUCKET_URL});
 const root=process.cwd(),contexts=[],results=[];let origin,browser,stage='launch';const failures=[];
 const server=createServer((req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''));assert.ok(file.startsWith(root+'/'));
  let bytes=readFileSync(file);
  if(path==='/efg-nutrition/pilot/pilot.js')bytes=Buffer.from(bridgeBrowserSource(bytes.toString(),{apiUrl:env.API_URL,publishableKey:env.ANON_KEY||env.PUBLISHABLE_KEY,origin,official:{template:input.template,ids}}));
  else if(extname(file)==='.js')bytes=Buffer.from(localSdkEntryFlag(path,bytes.toString()));
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.avif':'image/avif'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{failures.push({kind:'source',path:new URL(req.url,'http://localhost').pathname});res.writeHead(500);res.end('LOCAL_SOURCE_FAILURE');}});
 const settled=page=>page.waitForFunction(()=>window.__SDK_ENTRY_QA__?.snapshot().role&&!window.__SDK_ENTRY_QA__.snapshot().loading);
 async function open(page,student){
  stage='open-settled';await settled(page);stage='coach-students-tab';await page.locator('[data-tab="coachStudents"]:visible').first().click();stage='select-student';await page.locator(`[data-student="${student.id}"]`).first().click();
  // Selecting a student awaits real HTTP before rendering the details. Do not
  // count the previous DOM and skip opening a still-unmounted details element.
  stage='student-goals-rendered';const details=page.locator('#coachStudentGoals');await details.waitFor({state:'visible'});
  if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();
  assert.notEqual(await details.getAttribute('open'),null,'Real goals details must be open');
  stage='open-preview';await page.locator('[data-act="openCoachAdaptedPreview"]').click();stage='read-persisted';await page.locator('[data-persisted-revision]').waitFor();
 }
 try{
  await new Promise((r,j)=>{server.once('error',j);server.listen(4173,'127.0.0.1',r);});origin='http://127.0.0.1:4173';browser=await chromium.launch({headless:true});
  for(const [index,width]of [390,1280].entries()){
   const f=await newFixture(index?'B':'A');
   const context=await browser.newContext({viewport:{width,height:860},serviceWorkers:'block'});contexts.push(context);
   await context.route('**/*',route=>{const u=new URL(route.request().url());return [origin,env.API_URL,'https://esm.sh'].includes(u.origin)?route.continue():route.abort();});
   const page=await context.newPage();page.on('dialog',d=>d.accept());
   // Record only resource path/status, never query strings, Auth payloads or console.
   page.on('response',r=>{if(r.status()>=400)failures.push({kind:'http',path:new URL(r.url()).pathname,status:r.status()});});
   stage='login-page';await page.goto(origin+'/efg-nutrition/pilot/');await page.locator('#loginEmail').fill(f.coach.email);const after=Date.now();
   stage='request-otp';await page.locator('#pilot-login-form button[type=submit]').click();stage='read-otp';const otp=await readOtp({email:f.coach.email,after});await page.locator('#loginOtp').fill(otp);stage='submit-otp';await page.locator('#pilot-otp-form button[type=submit]').click();stage='login-hydration';await settled(page);
   if(await page.locator('[data-act="scienceSkip"]').count())await page.locator('[data-act="scienceSkip"]').click();
   await open(page,f.student);
   // Row from real HTTP; the subsequent edit test must match actual persisted targets.
   const row=yes(await rpc('efg_read_bound_guide',f.coach.token,{p_student:f.student.id}),'browser initial read');
   const meal=row.guide.meals[0],item=meal.items[0];
   stage='edit-save-reload-'+width;results.push({width,...await verifyClinicalBridgeDOM({page,mealLabel:meal.label,mealSlot:meal.slot,quantity:item.qty+1,initialReadRow:row,expectedFrame:frame(row),expectedRevision:row.draft_revision+1,openAfterReload:p=>open(p,f.student),artifactPath:join(out,`clinical-bridge-${width}.png`)})});
  }
  assert.equal(failures.filter(x=>x.kind==='source').length,0,'Source transform must really load');
  writeFileSync(join(out,'bridge-browser.json'),JSON.stringify({status:'PASS_EDIT_SAVE_RELOAD_ONLY',results,resourceFailures:failures,limits:['General explicitly declared fixture; not certified clinical foods','Background expiration DOM is separate and not counted here','No clinical publication or hosted activation']},null,2));
 }catch(error){const diagnostic={stage,name:error.name,code:error.code||null,message:String(error.message).split('\n')[0].replace(/eyJ[A-Za-z0-9_.-]+/g,'[REDACTED]').slice(0,250),sites:String(error.stack).split('\n').filter(x=>/^\s+at .+:\d+:\d+/.test(x)).slice(0,5).map(x=>x.trim()),resourceFailures:failures};console.error('BRIDGE_BROWSER_DIAGNOSTIC '+JSON.stringify(diagnostic));writeFileSync(join(out,'bridge-browser-failure.json'),JSON.stringify({status:'FAIL',diagnostic,resourceFailures:failures},null,2));throw Error('BRIDGE_BROWSER_FAILED: inspect sanitized artifact');}
 finally{await Promise.allSettled(contexts.map(c=>c.close()));await browser?.close();if(server.listening)await new Promise(r=>server.close(r));}
}
