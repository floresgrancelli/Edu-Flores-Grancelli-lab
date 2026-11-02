import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {chromium} from 'playwright';
import {yes,denied} from './helpers/coach119-local.mjs';
export async function runPersistedCoachBrowser({users,orgs,official,request,rpc,password,sql}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_PERSISTED_UI,'1');
 const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV,'utf8').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).replace(/^["']|["']$/g,'')];}));
 assert.ok(['http://127.0.0.1:54321','http://localhost:54321'].includes(env.API_URL));
 const root=process.cwd(),out=resolve('artifacts/persisted-coach-ui');mkdirSync(out,{recursive:true});
 const source=readFileSync(new URL('./persisted-coach-browser-client.mjs',import.meta.url),'utf8');
 const server=createServer((req,res)=>{try{
  const pathname=new URL(req.url,'http://localhost').pathname,p=resolve(root,'.'+decodeURIComponent(pathname));assert.ok(p.startsWith(root+'/'));
  let body=readFileSync(pathname.endsWith('/')?join(p,'index.html'):p);
  if(pathname.endsWith('/coach-adapted-workspace.js'))body=Buffer.from(body.toString().replace('COACH_ADAPTED_GUIDE_PREVIEW_ENABLED=false','COACH_ADAPTED_GUIDE_PREVIEW_ENABLED=true'));
  if(pathname==='/efg-nutrition/pilot/pilot.js'){
   const marker='const coachPersistedGuideSource=null;';assert.equal(body.toString().split(marker).length,2);
   body=Buffer.from("import {createPersistedGuideProvider} from './persisted-guide-provider.js';\nimport {createClient as localClient} from '../tests/persisted-coach-browser-client.mjs';\n"+body.toString().replace(marker,'const coachPersistedGuideSource=createPersistedGuideProvider({client:localClient(),readScope:adaptedCoachScope,template:'+JSON.stringify(official.template)+'});')+'\nwindow.__PERSISTED_VIEW__={state,render,workspace:coachAdaptedWorkspace,handleAuthStateChange,setCoachSessionIdentity,setConsentMap:v=>{coachRosterConsent=v}};');
  }
  if(pathname==='/efg-nutrition/pilot/pilot.js'&&process.env.EFG_QA_BOUND_PUBLICATION==='1'){
   const marker='const coachBoundPublication=null;';assert.equal(body.toString().split(marker).length,2);
   body=Buffer.from("import {createBoundGuidePublication} from './bound-guide-publication-client.js';\n"+body.toString().replace(marker,'const coachBoundPublication=createBoundGuidePublication({sb:localClient(),readScope:adaptedCoachScope,enabled:true});'));
  }
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[extname(p)]||(pathname.endsWith('/')?'text/html':'application/octet-stream'),'Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 let browser;const results=[];
 try{browser=await chromium.launch({headless:true});
 for(const [i,width] of [390,1280].entries()){
  const side=i?'B':'A',coach=users['coach'+side],student=users['student'+side],org=orgs[side];
  const context=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:1});
  const errors=[],calls=[];
  await context.route('https://**/*',route=>route.abort());
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:source,headers:{'Access-Control-Allow-Origin':'*'}}));
  await context.route(/https:\/\/[^/]*supabase\.co\//,route=>route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{const u=new URL(r.url());if(u.origin==='http://127.0.0.1:54321')calls.push({path:u.pathname,status:r.status()});});
  let token=coach.token;
  const boot=async()=>{
   await page.goto(origin+'/efg-nutrition/pilot/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>!!window.__PERSISTED_VIEW__);
   await page.evaluate(async({token,key,coach,student,org,goal})=>{
    window.__PERSISTED_LOCAL__={url:'http://127.0.0.1:54321',token,key};
    const v=window.__PERSISTED_VIEW__,s=v.state;
    const user={id:coach.id,email:coach.email};v.setCoachSessionIdentity({user,access_token:token},user);
    s.profile={user_id:coach.id,role:'coach',active:true,nickname:'Coach ficticio'};
    s.org={id:org,coach_id:coach.id,name:'Organización ficticia',status:'active',seat_limit:25};
    s.roster=[{user_id:student.id,organization_id:org,active:true,role:'student',nickname:'Alumno ficticio'}];
    s.selectedStudent=student.id;s.consent={accepted:true,student_id:student.id,organization_id:org};v.setConsentMap({[student.id]:true});
    // Goal is fetched by signed RPC before this bootstrap; no independent UI target fixture.
    s.coachGoals=[goal];s.goals=[goal];s.pendingGoal=goal;s.pendingGoalRevision=null;
    s.coachProgressLogs=[];s.progressLogs=[];s.weights=[];s.activities=[];s.invitations=[];s.testInvitations=[];s.payments=[];
    s.welcomePending=false;s.tab='coachStudents';await v.render();
   },{token,key:env.ANON_KEY||env.PUBLISHABLE_KEY,coach:{id:coach.id,email:coach.email},student:{id:student.id},org,goal:yes(await rpc('efg_read_bound_guide',token,{p_student:student.id}),'load UI goal').goal});
   await page.locator('#coachStudentGoals > summary').click();
   await page.locator('[data-act="openCoachAdaptedPreview"]').click();
   await page.locator('[data-persisted-revision]').waitFor();
  };
  try{
   await boot();const mount=page.locator('#coachAdaptedDraftMount');
   assert.equal(await mount.locator('[data-persisted-revision]').getAttribute('data-persisted-revision'),'1');
   const current=await page.evaluate(()=>window.__PERSISTED_VIEW__.workspace.snapshot());
   assert.deepEqual(current.editor.review.targets,{k:official.goal.kcal,p:official.goal.protein_g,c:official.goal.carb_g,f:official.goal.fat_g,fi:official.goal.fiber_g});
   assert.ok(current.editor.committed.meals.every(m=>m.items.every(x=>x.id!=='apple')));
   await mount.getByRole('button',{name:'Editar borrador',exact:true}).click();
   const qty=mount.locator('[data-edit-row="desayuno:0"] input');await qty.fill(String(Number(await qty.inputValue())+1));await qty.press('Tab');
   await mount.getByRole('button',{name:'Conservar borrador editado',exact:true}).click();
   const expected=await page.evaluate(()=>window.__PERSISTED_VIEW__.workspace.snapshot().editor.committed);
   await mount.getByRole('button',{name:'Guardar borrador privado',exact:true}).click();
   await mount.locator('[data-persisted-revision="2"]').waitFor();
   const saved=yes(await rpc('efg_read_bound_guide',token,{p_student:student.id}),'HTTP readback');assert.deepEqual(saved.guide,expected);assert.equal(saved.draft_revision,2);
   await page.screenshot({path:join(out,`persisted-coach-saved-${width}.png`),fullPage:true});
   // New real GoTrue login, new JWT session, then a fresh page and provider.
   const login=yes(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:coach.email,password}}),'new local session');
   assert.notEqual(JSON.parse(Buffer.from(login.access_token.split('.')[1],'base64url')).session_id,JSON.parse(Buffer.from(token.split('.')[1],'base64url')).session_id);token=login.access_token;
   await boot();assert.deepEqual(await page.evaluate(()=>window.__PERSISTED_VIEW__.workspace.snapshot().editor.committed),expected);
   assert.equal(await mount.locator('[data-persisted-revision]').getAttribute('data-persisted-revision'),'2');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:join(out,`persisted-coach-reloaded-${width}.png`),fullPage:true});
   // Stale student scope clears the mounted draft before any write begins.
   const beforeScopeWrites=calls.filter(c=>c.path.endsWith('/efg_save_bound_guide')).length;
   await page.evaluate(async()=>{const v=window.__PERSISTED_VIEW__;v.state.selectedStudent=null;try{await v.workspace.persist();throw Error('unexpected save');}catch(e){if(e.message==='unexpected save')throw e;}});
   assert.equal(await mount.locator('[data-guide-totals]').count(),0);
   assert.equal(calls.filter(c=>c.path.endsWith('/efg_save_bound_guide')).length,beforeScopeWrites);
   await boot();
   // Hold a real successful RPC response; sign-out must discard it, not render stale data.
   await mount.getByRole('button',{name:'Cerrar vista de prueba',exact:true}).click();
   let release,entered;const started=new Promise(r=>entered=r);
   await page.route('http://127.0.0.1:54321/rest/v1/rpc/efg_read_bound_guide',async route=>{
    const response=await route.fetch();entered();await new Promise(r=>release=r);await route.fulfill({response});
   });
   const opening=page.evaluate(()=>window.__PERSISTED_VIEW__.workspace.open(document.getElementById('coachAdaptedDraftMount')).then(()=>false,()=>true));
   await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(Error('Real RPC not reached')),15000))]);
   await page.evaluate(()=>window.__PERSISTED_VIEW__.handleAuthStateChange('SIGNED_OUT',null));release();
   assert.equal(await opening,true);assert.equal(await page.locator('[data-guide-totals]').count(),0);
   await page.unroute('http://127.0.0.1:54321/rest/v1/rpc/efg_read_bound_guide');await boot();
   if(process.env.EFG_QA_BOUND_PUBLICATION==='1'){
    const {runBoundPublication}=await import('./bound-publication-local-private.mjs');
    results.push(await runBoundPublication({page,context,mount,width,side,users,orgs,token,request,rpc,sql,out,env,origin}));
    continue; // This run covers publication negatives, not the following prior UI-only revocation scenario.
   }
   // Revocation is a signed student mutation, not a browser fixture flag.
   yes(await rpc('efg_revoke_coach_health_intake',student.token,{p_expected_revision:2}),'revoke source');
   const writesBefore=calls.filter(c=>c.path.endsWith('/efg_save_bound_guide')).length;
   await mount.getByRole('button',{name:'Guardar borrador privado',exact:true}).click();
   await mount.getByRole('alert').waitFor();assert.equal(await mount.locator('[data-guide-totals]').count(),0);
   assert.equal(calls.filter(c=>c.path.endsWith('/efg_save_bound_guide')).length,writesBefore);
   denied(await rpc('efg_read_bound_guide',token,{p_student:student.id}),'revoked readback');
   denied(await rpc('efg_read_bound_guide',users['coach'+(side==='A'?'B':'A')].token,{p_student:student.id}),'other org');
   assert.ok(calls.some(c=>c.path==='/auth/v1/user'&&c.status===200));assert.ok(calls.some(c=>c.path.endsWith('/efg_read_bound_guide')&&c.status===200));
   assert.ok(calls.some(c=>c.path.endsWith('/efg_save_bound_guide')&&c.status===200));assert.deepEqual(errors,[]);
   results.push({width,revision:2,reloaded:true,revoked:true,http:calls,publishable:false});
  }catch(error){await page.screenshot({path:join(out,`persisted-coach-failure-${width}.png`),fullPage:true}).catch(()=>{});throw error;}
  finally{await context.close();}
 }
 writeFileSync(join(out,'result.json'),JSON.stringify({status:'PASS',results},null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
