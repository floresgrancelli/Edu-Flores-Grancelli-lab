// P21: Boot the *actual staged* P20 pilot asset + feature-overlay in a real browser.
// All traffic is local or a fake SDK module. No hosted Supabase/Render, no credentials,
// no OTP, no acceptance and NO GO. This does not replace physical UAT.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

assert.equal(process.env.GITHUB_ACTIONS,'true','P21 local browser smoke is CI only');
assert.equal(process.env.EFG_QA_P20_OVERLAY,'1','P21 requires an explicitly isolated overlay fixture');
const engine=process.env.EFG_QA_ENGINE==='webkit'?'webkit':'chromium';
const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const tool=join(repoRoot,'efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs');
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
assert.match(sha,/^[a-f0-9]{40}$/);
const build='ncc-pilot-'+sha.slice(0,12),out=mkdtempSync(join(tmpdir(),'ncc-p21-isolated-'));
const featureOn=[
 ['coach-student-journey.js','COACH_STUDENT_JOURNEY_ENABLED'],
 ['coach-plan-draft-client.js','COACH_ATOMIC_PLAN_UI_ENABLED'],
 ['coach-release-plan-gate.js','COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED'],
 ['coach-legal-bridge.js','COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED'],
 ['legal-onboarding.js','LEGAL_ONBOARDING_ENABLED'],
 ['coach-shared-recipes-read-client.js','COACH_SHARED_STUDENT_RECIPES_UI_ENABLED']
];
const featureOff=[
 ['coach-relaunch-onboarding.js','COACH_RELAUNCH_ONBOARDING_ENABLED'],
 ['coach-adapted-workspace.js','COACH_ADAPTED_GUIDE_PREVIEW_ENABLED'],
 ['student-restriction-declaration.js','PRIVATE_HEALTH_DECLARATION_UI_ENABLED'],
 ['major-release-client.js','MAJOR_RELEASE_FLOW_ENABLED'],
 ['release-communications.js','RELEASE_COMMUNICATIONS_ENABLED'],
 ['personal-workspace.js','PERSONAL_WORKSPACE_ENABLED'],
 ['pilot-participation-demo.js','PILOT_PARTICIPATION_ENABLED']
];
// Stub only the PUBLIC SDK import; no real auth, profile or database state.
const fakeSdk='export function createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>{throw Error("P21 forbids remote DB access")},rpc:async()=>({data:null,error:{message:"P21 sandbox"}})}}';
let server=null,browser=null,context=null,remoteAttempts=0;
const misses=[],servedOverlay=new Set(),pageErrors=[];
const inDir=(root,file)=>file===root||file.startsWith(root+sep);
const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html',
 '.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png',
 '.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.woff2':'font/woff2'};
try{
 const raw=execFileSync(process.execPath,[tool,'--emit','--pilot-ui-draft',
  '--ack=PREPARE_ONLY_NOT_GO','--expected-sha='+sha,'--build='+build,
  '--out='+out],{cwd:repoRoot,encoding:'utf8'});
 const status=JSON.parse(raw),manifest=JSON.parse(readFileSync(join(out,'review-manifest.json'),'utf8'));
 assert.equal(status.status,'STAGED_OUTSIDE_REPO_NOT_PUBLISHED');
 assert.equal(status.preparationMode,'PILOT_UI_ACTIVATION_PROPOSAL_NOT_GO');
 assert.equal(status.activationFlagsProposed,6);
 assert.equal(manifest.expectedGitSha,sha);
 assert.equal(manifest.noPublicationAuthorization,true);
 assert.equal(manifest.noHostedCalls,true);
 assert.equal(manifest.hostedPrerequisitesUnverified,true);
 assert.equal(manifest.pilotUiDraft,true);
 assert.equal(manifest.activationFlags.length,featureOn.length);
 assert.equal(manifest.deliberatelyDisabledFlags.length,featureOff.length);
 server=createServer((req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   const path=decodeURIComponent(url.pathname);
   assert.ok(path.startsWith('/efg-nutrition/'),'Unexpected browser path');
   const relative=path.slice(1)+(path.endsWith('/')?'index.html':'');
   const candidate=resolve(out,relative),original=resolve(repoRoot,relative);
   assert.ok(inDir(out,candidate)&&inDir(repoRoot,original),'Traversal forbidden');
   const useOverlay=existsSync(candidate),target=useOverlay?candidate:original;
   if(useOverlay)servedOverlay.add(path.endsWith('/')?path+'index.html':path);
   const data=readFileSync(target);
   res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream',
    'Cache-Control':'no-store'});
   res.end(data);
  }catch{
   misses.push(new URL(req.url,'http://127.0.0.1').pathname);
   res.writeHead(404);res.end('P21 local fixture path unavailable');
  }
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await ({chromium,webkit}[engine]).launch({headless:true});
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin)return route.continue();
  if(url.origin==='https://esm.sh')
   return route.fulfill({status:200,contentType:'text/javascript',
    headers:{'Access-Control-Allow-Origin':'*'},body:fakeSdk});
  if(url.hostname.endsWith('.supabase.co')||url.hostname.endsWith('.onrender.com'))remoteAttempts++;
  return route.abort();
 });
 const page=await context.newPage();
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(origin+'/efg-nutrition/pilot/',{waitUntil:'networkidle'});
 await page.locator('#loginEmail').waitFor({timeout:16000});
 const actual=await page.evaluate(async({build,featureOn,featureOff})=>{
  const flags={};
  for(const [file,flag]of [...featureOn,...featureOff]){
   const module=await import('./'+file+'?v='+build);
   flags[flag]=module[flag];
  }
  return {
   build:document.querySelector('meta[name="efg-build"]')?.content,
   main:document.querySelector('script[src*="pilot.js"]')?.getAttribute('src'),
   login:document.getElementById('loginEmail')!==null,
   diaryVisible:document.getElementById('studentMeals')!==null,
   flags
  };
 },{build,featureOn,featureOff});
 assert.equal(actual.build,build);
 assert.equal(actual.main,'./pilot.js?v='+build);
 assert.equal(actual.login,true);
 assert.equal(actual.diaryVisible,false,'Unauthenticated visitor cannot access diary');
 for(const [,flag]of featureOn)assert.equal(actual.flags[flag],true,flag+' should be ON in overlay');
 for(const [,flag]of featureOff)assert.equal(actual.flags[flag],false,flag+' must remain OFF');
 await page.locator('#loginEmail').fill('piloto-sintetico@example.invalid');
 assert.equal(await page.locator('#loginEmail').inputValue(),'piloto-sintetico@example.invalid');
 const requiredOverlay=['/efg-nutrition/pilot/index.html','/efg-nutrition/pilot/pilot.js',
  ...featureOn.map(([file])=>'/efg-nutrition/pilot/'+file)];
 for(const path of requiredOverlay)assert.ok(servedOverlay.has(path),'Staged asset was not actually served: '+path);
 assert.equal(remoteAttempts,0,'No production or hosted backend requests allowed');
 assert.deepEqual(misses,[],'The versioned import graph must resolve without missing local assets');
 if(process.env.EFG_QA_P22_FLOW==='1'){
  const {runStagedPilotFlow}=await import('./ncc-pilot-pre-go-browser-flow.mjs');
  await runStagedPilotFlow(page,build);
  assert.equal(remoteAttempts,0,'P22 local flow must never touch hosted backend');
  assert.deepEqual(misses,[],'P22 staged module imports require complete assets');
  assert.deepEqual(pageErrors,[],'P22 browser must remain free of JS page errors');
 }
 assert.deepEqual(pageErrors,[],'Real browser must have no JavaScript page errors');
 for(const [file,flag]of featureOn)
  assert.ok(readFileSync(join(repoRoot,'efg-nutrition/pilot',file),'utf8')
   .includes('export const '+flag+'=false;'),'Source flag was changed: '+flag);
 console.log('PASS NCC P21 '+engine+': staged P20 versioned overlay booted in browser, 6 pilot flags ON only in temp, 7 excluded flags OFF, local login functional, no backend, no source edits; NOT hosted or physical UAT.');
}finally{
 await context?.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 if(server)await new Promise(resolve=>server.close(resolve));
 rmSync(out,{recursive:true,force:true});
}
