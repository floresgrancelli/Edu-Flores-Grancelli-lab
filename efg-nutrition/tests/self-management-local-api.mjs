// Disposable LOCAL GoTrue/PostgREST/PostgreSQL and HTTP requests; never hosted.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createHostedSelfHandler,SELF_LEGAL_VERSION} from '../self-management/backend/hosted-adapter.mjs';
assert.equal(process.env.NCC_SELF_LOCAL_ONLY,'1');assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.ok(!process.env.SUPABASE_ACCESS_TOKEN&&!process.env.SUPABASE_DB_PASSWORD);
const env=Object.fromEntries(readFileSync(process.env.NCC_SELF_LOCAL_STATUS,'utf8').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const url=env.API_URL;assert.equal(new URL(url).hostname,'127.0.0.1');assert.equal(new URL(url).port,'54321');
const {createClient}=createRequire(process.env.NCC_SELF_SDK_PACKAGE)('@supabase/supabase-js');
const admin=createClient(url,env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const catalog=JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url)));
const users=[];
async function user(label){const email='self-'+label+'-'+randomUUID()+'@example.invalid',password='Local-Only-'+randomUUID();const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);const client=createClient(url,env.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const login=await client.auth.signInWithPassword({email,password});assert.equal(login.error,null);const u={id:created.data.user.id,email,token:login.data.session.access_token,client};users.push(u);return u;}
const a=await user('a'),b=await user('b'),student=await user('student');
assert.equal((await admin.from('efg_profiles').insert([{user_id:a.id,role:'admin',active:true},{user_id:student.id,role:'student',active:true}])).error,null);
assert.equal((await admin.from('ncc_self_pilot_access').insert({user_id:b.id,active:true,expires_at:new Date(Date.now()+3600000).toISOString()})).error,null);
const origins=['http://localhost'],root=fileURLToPath(new URL('../../',import.meta.url));
const handler=createHostedSelfHandler({client:admin,catalog,ownerEmail:a.email,allowedOrigins:origins});
const server=createServer(async(req,res)=>{try{
 if(req.method==='GET'){
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/__qa-sdk.js'){
   res.setHeader('Content-Type','text/javascript');res.end(`export function createClient(){return {auth:{async getUser(){const s=globalThis.__QA_SELF_SESSION__;if(!s)return {data:{user:null},error:{message:'signed out'}};const r=await fetch(${JSON.stringify(url+'/auth/v1/user')},{headers:{apikey:${JSON.stringify(env.ANON_KEY)},Authorization:'Bearer '+s.token}});return r.ok?{data:{user:await r.json()},error:null}:{data:{user:null},error:{message:'invalid'}}},async getSession(){const s=globalThis.__QA_SELF_SESSION__;return {data:{session:s?{user:{id:s.id},access_token:s.token}:null},error:null}},onAuthStateChange(){return {}},async signOut(){globalThis.__QA_SELF_SESSION__=null}}}}`);return;
  }
  const path=resolve(root,'.'+decodeURIComponent(pathname));if(!path.startsWith(root)||!statSync(path).isFile())throw Error('path');
  let body=readFileSync(path);const type=extname(path);res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'}[type]||'application/octet-stream');
  if(path.endsWith('/self-management-app.js'))body=body.toString().replace('https://esm.sh/@supabase/supabase-js@2.118.0','/__qa-sdk.js');
  if(path.endsWith('/self-management-config.js'))body=`export const SELF_MANAGEMENT_URL=${JSON.stringify(origin+'/api')};export const SELF_SUPABASE_URL=${JSON.stringify(url)};export const SELF_PUBLISHABLE_KEY=${JSON.stringify(env.ANON_KEY)};`;
  res.end(body);return;
 }
 const body=await Array.fromAsync(req).then(xs=>Buffer.concat(xs).toString());const r=await handler(new Request('http://localhost/api',{method:req.method,headers:req.headers,body:body||undefined}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());
 }catch{res.writeHead(500);res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;origins.push(origin);
async function call(u,body,expected=200){const r=await fetch(origin,{method:'POST',headers:{Authorization:'Bearer '+u.token,'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,expected,JSON.stringify({action:body.action,response:d}));return d;}
const fields={age_years:35,height_cm:175,weight_kg:80,sex_for_equation:'male',activity_level:'light',objective:'fat_loss',dietary_pattern:'omnivore',eating_window:'regular',processingConsent:true,pregnantOrBreastfeeding:false,clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',health_flags:[],disliked_food_ids:[]};
try{
 assert.equal((await call(a,{action:'status'})).legal.accepted,false);
 await call(a,{action:'register',explicitChoice:true},403);
 await call(a,{action:'accept_terms',accepted:true,version:SELF_LEGAL_VERSION});
 await call(a,{action:'register',explicitChoice:true});
 const first=await call(a,{action:'save_intake',fields,expectedRevision:0,requestId:randomUUID()});assert.equal(first.intake.revision,1);
 const requestId=randomUUID(),generated=await call(a,{action:'generate',requestId});assert.equal(generated.result.guide.meals.length,6);
 assert.equal(generated.result.guide.coachReviewed,false);
 assert.deepEqual(await call(a,{action:'generate',requestId}),generated);
 const restored=await call(a,{action:'context'});assert.deepEqual(restored.latestPlan,generated);
 assert.equal(restored.intake.data.weight_kg,80);
 await call(a,{action:'context',userId:b.id},400);await call({...a,token:'invalid'},{action:'context'},401);
 await call(student,{action:'status'},403);
 for(const table of ['ncc_self_accounts','ncc_self_intakes','ncc_self_results','ncc_self_legal_receipts']){
  const other=await b.client.from(table).select('*').eq('user_id',a.id);assert.equal(other.error,null);assert.deepEqual(other.data,[]);
 }
 const bypass=await b.client.rpc('ncc_self_register',{p_user:a.id,p_legal_version:SELF_LEGAL_VERSION});assert.ok(bypass.error);
 await call(b,{action:'accept_terms',version:SELF_LEGAL_VERSION,accepted:true});await call(b,{action:'register',explicitChoice:true});
 const races=await Promise.all([81,82].map(weight=>fetch(origin,{method:'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify({action:'save_intake',fields:{weight_kg:weight,processingConsent:true},expectedRevision:1,requestId:randomUUID()})})));
 assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);
 const latest=await call(a,{action:'context'});assert.equal(latest.intake.revision,2);assert.equal(latest.latestPlan.intakeRevision,1);
 const intakeRows=await admin.from('ncc_self_intakes').select('revision').eq('user_id',a.id);assert.equal(intakeRows.data.length,2);
 assert.equal((await admin.from('efg_profiles').select('role').eq('user_id',a.id).single()).data.role,'admin');
 assert.equal((await admin.from('efg_profiles').select('role').eq('user_id',student.id).single()).data.role,'student');
 if(process.env.NCC_SELF_BROWSER==='1'){
  const {chromium}=createRequire(process.env.NCC_SELF_SDK_PACKAGE)('playwright'),browser=await chromium.launch({headless:true});
  const out=resolve(root,'artifacts/self-management-live');mkdirSync(out,{recursive:true});
  try{
   // First entry must recover an existing own form after explicit consent,
   // without asking the person to retype their weight, height and age.
   assert.equal((await admin.from('ncc_self_accounts').delete().eq('user_id',b.id)).error,null);
   assert.equal((await admin.from('ncc_self_legal_receipts').delete().eq('user_id',b.id)).error,null);
   assert.equal((await admin.from('efg_coach_relaunch_intakes').insert({student_id:b.id,revision:1,age_years:44,height_cm:170,weight_kg:74,activity_level:'light',objective:'maintenance',dietary_pattern:'omnivore',eating_window:'regular'})).error,null);
   const first=await browser.newContext({viewport:{width:390,height:950},serviceWorkers:'block'});
   await first.addInitScript(session=>{globalThis.__QA_SELF_SESSION__=session;},{id:b.id,token:b.token});
   const firstPage=await first.newPage();await firstPage.goto(origin+'/efg-nutrition/pilot/autogestion.html');await firstPage.locator('#selfEntry').waitFor({state:'visible'});
   assert.equal(await firstPage.locator('#intake').isVisible(),false);
   await firstPage.locator('#selfEntryConsent').check();await firstPage.locator('#openSelfIntake').click();await firstPage.locator('#intake').waitFor({state:'visible'});
   assert.equal(await firstPage.locator('[name=weight_kg]').inputValue(),'74');assert.equal(await firstPage.locator('[name=height_cm]').inputValue(),'170');assert.equal(await firstPage.locator('[name=age_years]').inputValue(),'44');
   assert.equal(await firstPage.locator('[name=scope]').isChecked(),false);assert.equal(await firstPage.locator('[name=consent]').isChecked(),false);
   await first.close();
   for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'}),external=[],errors=[];
   await context.addInitScript(session=>{globalThis.__QA_SELF_SESSION__=session;},{id:a.id,token:a.token});
   await context.route('**/*',route=>{if(['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname))return route.continue();external.push(route.request().url());return route.abort();});
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/efg-nutrition/pilot/autogestion.html');await page.locator('#intake').waitFor({state:'visible'});
   assert.ok([81,82].includes(Number(await page.locator('[name=weight_kg]').inputValue())));
   await page.locator('[name=scope]').check();await page.locator('[name=consent]').check();
   await page.screenshot({path:resolve(out,width+'-ficha.png'),fullPage:true});
   await page.locator('#generate').click();await page.getByText('Guía guardada en tu cuenta. Podés volver a abrirla cuando quieras.',{exact:true}).waitFor({timeout:30000});
   assert.equal(await page.locator('[data-meal]').count(),6);
   for(const tab of await page.locator('[data-meal]').all()){await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:resolve(out,width+'-guia.png'),fullPage:true});
   await page.reload();await page.locator('#result').waitFor({state:'visible'});assert.equal(await page.locator('[name=consent]').isChecked(),false);
   await page.locator('[name=scope]').check();await page.locator('[name=consent]').check();
   await page.evaluate(session=>{globalThis.__QA_SELF_SESSION__=session;},{id:b.id,token:b.token});
   await page.locator('#generate').click();await page.getByText('Cambió la sesión. Ingresá nuevamente.',{exact:true}).waitFor();
   assert.equal(await page.locator('#result').isVisible(),false);assert.equal(await page.locator('#intake').isVisible(),false);
   // A real deleted/absent session clears every private field on reload.
   await page.evaluate(()=>{globalThis.__QA_SELF_SESSION__=null;});
   await page.route('**/__qa-sdk.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('export function createClient(){','globalThis.__QA_SELF_SESSION__=null;export function createClient(){')});});
   await page.reload();await page.getByText('Ingresá nuevamente desde la app.',{exact:true}).waitFor();
   assert.equal(await page.locator('#result').isVisible(),false);assert.equal(await page.locator('#intake').isVisible(),false);
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close();
  }}finally{await browser.close();}
 }
 await admin.auth.admin.deleteUser(a.id);
 const after=await fetch(origin,{method:'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json'},body:JSON.stringify({action:'context'})});assert.equal(after.status,401);
 for(const table of ['ncc_self_accounts','ncc_self_intakes','ncc_self_results','ncc_self_legal_receipts'])assert.deepEqual((await admin.from(table).select('user_id').eq('user_id',a.id)).data,[]);
 console.log('LOCAL Auth JWT / REST / RLS / private reload / six-meal engine / HTTP concurrent CAS / unchanged roles / deletion cascade: PASS');
}finally{server.close();for(const u of users)await admin.auth.admin.deleteUser(u.id);}
