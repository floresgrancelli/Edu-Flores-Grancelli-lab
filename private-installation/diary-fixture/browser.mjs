// Local CI only. Authentic SDK; no profile, consent, diary or response injection.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {localSdkEntrySource,localSdkEntryFlag} from '../../efg-nutrition/tests/sdk-entry-source-private.mjs';
import {createLocalMailReader} from '../../efg-nutrition/tests/sdk-entry-mail-local.mjs';
const tables=['efg_habitual_meals','efg_personal_recipes'];
const hkey=id=>'efg-nutrition-habitual-v2:'+id+':desayuno';
const rkey=id=>'efg-nutrition-custom-recipes:'+id;
export async function runDiaryBrowser({request,users,input,ids,out,snapshot}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_DIARY_FIXTURE,'1');
 const {chromium}=await import('playwright');
 const env=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV,'utf8').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^["']|["']$/g,'')];}));
 assert.ok(['http://127.0.0.1:54321','http://localhost:54321'].includes(env.API_URL));
 const readOtp=createLocalMailReader({origin:env.MAILPIT_URL||env.INBUCKET_URL});
 const root=process.cwd(),origin='http://127.0.0.1:4173',failures=[],results=[];let browser,context,stage='server';
 const server=createServer((req,res)=>{try{
  const path=new URL(req.url,origin).pathname,file=resolve(root,'.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''));assert.ok(file.startsWith(root+'/'));
  let bytes=readFileSync(file);
  if(path==='/efg-nutrition/pilot/pilot.js')bytes=Buffer.from(localSdkEntrySource(bytes.toString(),{apiUrl:env.API_URL,publishableKey:env.ANON_KEY||env.PUBLISHABLE_KEY,origin,declarationPanel:true,official:{template:input.template,ids}}));
  else if(extname(file)==='.js')bytes=Buffer.from(localSdkEntryFlag(path,bytes.toString()));
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.avif':'image/avif'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{failures.push({kind:'source',path:new URL(req.url,origin).pathname});res.writeHead(500);res.end('LOCAL_SOURCE_FAILURE');}});
 const api=async(actor,table,method='GET',body,query='select=*')=>{const r=await request('/rest/v1/'+table+'?'+query,{token:actor.token,method,body,prefer:'return=representation'});assert.ok(r.ok,`Diary HTTP ${method} ${table}: ${r.status}`);return r.data;};
 const owned=(actor,table)=>api(actor,table,'GET',undefined,'student_id=eq.'+actor.id+'&select=*&order=created_at.asc');
 const clean=async actor=>{for(const table of tables)await api(actor,table,'DELETE',undefined,'student_id=eq.'+actor.id+'&select=id');};
 const settled=async(page,user)=>{await page.waitForFunction(id=>window.__SDK_ENTRY_QA__?.snapshot().userId===id&&!window.__SDK_ENTRY_QA__.snapshot().loading,user.id);};
 async function login(page,user){
  await page.goto(origin+'/efg-nutrition/pilot/');
  if(!await page.locator('#loginEmail').isVisible()){
   await page.locator('[data-act="logout"]:visible').first().click();await page.locator('#loginEmail').waitFor();
  }
  await page.locator('#loginEmail').fill(user.email);const after=Date.now();
  await page.locator('#pilot-login-form button[type=submit]').click();const otp=await readOtp({email:user.email,after});
  await page.locator('#loginOtp').fill(otp);await page.locator('#pilot-otp-form button[type=submit]').click();await settled(page,user);
  if(await page.locator('[data-act="scienceSkip"]:visible').count())await page.locator('[data-act="scienceSkip"]:visible').click();
 }
 async function open(page){await settled(page,users.studentA);await page.locator('[data-tab="home"]:visible').first().click();await page.locator('[data-act="createPersonalRecipe"]:visible').first().waitFor();const breakfast=page.locator('[data-habitualsave="desayuno"]').locator('xpath=ancestor::details[1]');if(await breakfast.getAttribute('open')===null)await breakfast.locator(':scope > summary').click();}
 async function createRecipe(page,name,done){
  const answers=[name,'banana','1','100','','2'];let fault;
  const handler=async d=>{try{assert.equal(d.type(),'prompt');assert.ok(answers.length);await d.accept(answers.shift());}catch(e){fault=e;await d.dismiss();}};
  page.on('dialog',handler);
  try{await page.locator('[data-act="createPersonalRecipe"]:visible').first().click();await done();if(fault)throw fault;assert.equal(answers.length,0);}finally{page.off('dialog',handler);}
 }
 const backup=(page,key)=>page.evaluate(k=>localStorage.getItem(k),key);
 async function waitRows(actor,table,count){for(let n=0;n<100;n++){const rows=await owned(actor,table);if(rows.length===count)return rows;await new Promise(r=>setTimeout(r,100));}throw Error('REAL_HTTP_ROW_COUNT_NOT_REACHED');}
 function hold(page,table,method,{lose=false}={}){
  let enteredResolve,releaseResolve,completedResolve;const entered=new Promise(r=>enteredResolve=r),release=new Promise(r=>releaseResolve=r),completed=new Promise(r=>completedResolve=r);let used=false,fault;
  const pattern='**/rest/v1/'+table+'*';
  const handler=async route=>{if(used||route.request().method()!==method)return route.continue();used=true;
   try{const response=await route.fetch();assert.ok(response.ok());enteredResolve();await release;if(lose)await route.abort('failed');else await route.fulfill({response});}
   catch(e){fault=e;enteredResolve();try{await route.abort();}catch{}}finally{completedResolve();}
  };
  return {pattern,handler,entered,release:()=>releaseResolve(),finish:async()=>{releaseResolve();await completed;if(fault)throw fault;await page.unroute(pattern,handler);}};
 }
 const item={id:'banana',name:'TEST_ONLY banana',qty:100,unit:'g',k:89,p:1.09,c:22.84,f:0.33,fi:2.6};
 const habitual=name=>({student_id:users.studentA.id,meal_slot:'desayuno',name,items:[item]});
 const recipe=name=>({student_id:users.studentA.id,name,ingredients:[{foodId:'banana',grams:100}],portions:1,totals:{k:89,p:1.09,c:22.84,f:0.33,fi:2.6}});
 // These totals are TEST_ONLY API payloads, never catalogue evidence or clinical claims.
 try{
  await new Promise((r,j)=>{server.once('error',j);server.listen(4173,'127.0.0.1',r);});browser=await chromium.launch({headless:true});
  for(const width of [390,1280]){
   stage='baseline-'+width;for(const actor of [users.studentA,users.studentB])for(const t of tables)assert.equal((await owned(actor,t)).length,0,'Fresh two-table fixture required');
   const baseline=await snapshot();
   context=await browser.newContext({viewport:{width,height:860},serviceWorkers:'block'});
   await context.route('**/*',route=>[origin,env.API_URL,'https://esm.sh'].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
   const page=await context.newPage(),switchPage=await context.newPage();
   page.on('response',r=>{if(r.status()>=400)failures.push({kind:'http',path:new URL(r.url()).pathname,status:r.status()});});
   stage='login-'+width;await login(page,users.studentA);await open(page);
   stage='save-reload-select-'+width;
   const h=(await api(users.studentA,tables[0],'POST',habitual('TEST_ONLY saved habitual')))[0];
   const post=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/rest/v1/'+tables[1]);
   await createRecipe(page,'TEST_ONLY UI recipe',async()=>{assert.equal((await post).status(),201);});
   const r=(await waitRows(users.studentA,tables[1],1))[0];assert.deepEqual(r.ingredients,[{foodId:'banana',grams:100}]);assert.equal(r.portions,2);
   const diaryBefore=await api(users.studentA,'efg_daily_logs');await page.reload();await open(page);
   await page.locator('#habitualChoice_desayuno').selectOption(h.id);await page.locator('#habitualPreview_desayuno').waitFor({state:'visible'});
   await page.locator('[data-act="registerPersonalRecipe"]:visible').first().click();await page.locator('#efgRecipeRegisterId').selectOption(r.id);
   assert.match(await page.locator('#efgRecipeRegisterId option:checked').textContent(),/TEST_ONLY UI recipe/);
   await page.screenshot({path:join(out,`diary-select-${width}.png`),fullPage:true});await page.locator('[data-act="closeRecipeRegistration"]').first().click();
   assert.deepEqual(await api(users.studentA,'efg_daily_logs'),diaryBefore,'Selection/cancel never writes diary');
   assert.deepEqual((await owned(users.studentA,tables[0])).find(x=>x.id===h.id),h);assert.deepEqual((await owned(users.studentA,tables[1])).find(x=>x.id===r.id),r);
   await clean(users.studentA);
   stage='lost-response-'+width;await page.reload();await open(page);
   const lost=hold(page,tables[1],'POST',{lose:true});await page.route(lost.pattern,lost.handler);
   try{await createRecipe(page,'TEST_ONLY lost response',async()=>{await lost.entered;lost.release();await lost.finish();await page.waitForFunction(k=>Boolean(localStorage.getItem(k)),rkey(users.studentA.id));});}finally{lost.release();await page.unroute(lost.pattern,lost.handler);}
   assert.equal((await owned(users.studentA,tables[1])).length,1);assert.ok(await backup(page,rkey(users.studentA.id)));
   await page.reload();await open(page);await page.reload();await open(page);assert.equal((await owned(users.studentA,tables[1])).length,1);assert.equal(await backup(page,rkey(users.studentA.id)),null);
   stage='late-get-A-B-'+width;
   const late=hold(page,tables[1],'GET');await page.route(late.pattern,late.handler);
   try{await page.reload({waitUntil:'domcontentloaded'});await late.entered;await login(switchPage,users.studentB);await settled(page,users.studentB);late.release();await late.finish();assert.ok(!(await page.locator('body').innerText()).includes('TEST_ONLY lost response'));assert.equal((await owned(users.studentB,tables[1])).length,0);}finally{late.release();await page.unroute(late.pattern,late.handler);}
   await login(switchPage,users.studentA);await settled(page,users.studentA);await page.reload();await open(page);await clean(users.studentA);await page.reload();await open(page);
   stage='late-post-A-B-'+width;
   const latePost=hold(page,tables[1],'POST');await page.route(latePost.pattern,latePost.handler);
   try{await createRecipe(page,'TEST_ONLY late POST',async()=>{await latePost.entered;await login(switchPage,users.studentB);await settled(page,users.studentB);latePost.release();await latePost.finish();});assert.ok(!(await page.locator('body').innerText()).includes('TEST_ONLY late POST'));assert.equal((await owned(users.studentB,tables[1])).length,0);assert.equal((await owned(users.studentA,tables[1])).length,1);}finally{latePost.release();await page.unroute(latePost.pattern,latePost.handler);}
   await login(switchPage,users.studentA);await settled(page,users.studentA);await page.reload();await open(page);await clean(users.studentA);
   stage='capacity-20-30-'+width;
   const hs=await api(users.studentA,tables[0],'POST',Array.from({length:20},(_,i)=>habitual('TEST_ONLY H'+i)));
   const rs=await api(users.studentA,tables[1],'POST',Array.from({length:30},(_,i)=>recipe('TEST_ONLY R'+i)));
   const pendingH={name:'TEST_ONLY pending H',items:[item]},pendingR=recipe('TEST_ONLY pending R');delete pendingR.student_id;
   // Explicit legacy backup fixture; not application state/identity/consent injection.
   await page.evaluate(({h,r,a,b})=>{localStorage.setItem(h,JSON.stringify([a]));localStorage.setItem(r,JSON.stringify([b]));},{h:hkey(users.studentA.id),r:rkey(users.studentA.id),a:pendingH,b:pendingR});
   await page.reload();await open(page);assert.equal((await owned(users.studentA,tables[0])).length,20);assert.equal((await owned(users.studentA,tables[1])).length,30);assert.ok(await backup(page,hkey(users.studentA.id)));assert.ok(await backup(page,rkey(users.studentA.id)));
   await api(users.studentA,tables[0],'DELETE',undefined,'id=eq.'+hs[0].id+'&select=id');await api(users.studentA,tables[1],'DELETE',undefined,'id=eq.'+rs[0].id+'&select=id');
   await page.reload();await open(page);await page.reload();await open(page);
   for(const [t,name,count,key]of [[tables[0],pendingH.name,20,hkey(users.studentA.id)],[tables[1],pendingR.name,30,rkey(users.studentA.id)]]){const rows=await owned(users.studentA,t);assert.equal(rows.length,count);assert.equal(rows.filter(x=>x.name===name).length,1);assert.equal(await backup(page,key),null);}
   assert.deepEqual((await owned(users.studentA,tables[0])).find(x=>x.id===hs[1].id),hs[1]);assert.deepEqual((await owned(users.studentA,tables[1])).find(x=>x.id===rs[1].id),rs[1]);
   await page.screenshot({path:join(out,`diary-capacity-${width}.png`),fullPage:true});await clean(users.studentA);
   assert.deepEqual(await snapshot(),baseline,'All tracked database rows preserved after cleanup');
   results.push({width,status:'PASS',cases:['save/reload/select/cancel','lost response dedup','late GET A-B','late POST A-B','capacity20/30 and recovery'],diaryRegistration:'NOT_TESTED'});
   await context.close();context=null;
  }
  assert.equal(failures.filter(x=>x.kind==='source'||tables.some(t=>x.path==='/rest/v1/'+t)&&x.status===404).length,0,'No missing fixture endpoints hidden');
  writeFileSync(join(out,'diary-browser.json'),JSON.stringify({status:'PASS',results,resourceFailures:failures},null,2));
 }catch(e){writeFileSync(join(out,'diary-browser.json'),JSON.stringify({status:'FAIL',stage,error:{name:e.name},results,resourceFailures:failures},null,2));throw Error('DIARY_BROWSER_FAILED: see sanitized stage');}
 finally{await context?.close();await browser?.close();if(server.listening)await new Promise(r=>server.close(r));}
}
