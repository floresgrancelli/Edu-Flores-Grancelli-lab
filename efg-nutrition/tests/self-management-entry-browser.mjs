// UI contract tests use isolated test accounts and generated menus, never production data.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {generateSelfManagedPlan} from '../pilot/self-management-engine.js';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const {chromium,webkit}=createRequire(process.env.NCC_PLAYWRIGHT_PACKAGE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const catalog=JSON.parse(readFileSync(resolve(root,'efg-nutrition/catalog/guide-catalog.json')));
const fields={age_years:35,height_cm:175,weight_kg:80,sex_for_equation:'male',activity_level:'light',objective:'fat_loss',dietary_pattern:'omnivore',eating_window:'regular',processingConsent:true,pregnantOrBreastfeeding:false,clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',health_flags:[],disliked_food_ids:[]};
const plan=generateSelfManagedPlan(fields,catalog);
const server=createServer((req,res)=>{
 try{const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!path.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'}[extname(path)]||'application/octet-stream');res.end(readFileSync(path));}
 catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,out=resolve(root,'artifacts/ncc-self-entry');mkdirSync(out,{recursive:true});
const sdk=`export function createClient(){const q={select(){return q},eq(){return q},async maybeSingle(){return {data:window.__test.role?{role:window.__test.role,active:true}:null,error:null}}};return {from(){return q},auth:{async getUser(){return {data:{user:window.__test.user?{id:window.__test.user}:null},error:null}},async getSession(){return {data:{session:window.__test.user?{user:{id:window.__test.user},access_token:'test-only'}:null}}},async signInWithOtp(){return {error:null}},async verifyOtp(){window.__test.user='independent';return {error:null}},async signOut(){window.__test.user=null;window.__test.listener?.('SIGNED_OUT',null);return {error:null}},onAuthStateChange(fn){window.__test.listener=fn}}}}`;
const results=[];
try{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='chromium'?{...(process.env.NCC_CHROMIUM_PATH?{executablePath:process.env.NCC_CHROMIUM_PATH}:{}),args:['--no-sandbox']}:{})});
  try{for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:844}});
   await context.addInitScript(()=>{window.__test=JSON.parse(sessionStorage.getItem('__testInit')||'null')||{user:null,role:null,allowed:true,accepted:false,registered:false,intake:null,saved:null};});
   await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:sdk}));
   await context.route('**/functions/v1/ncc-self-management',async route=>{
    const body=route.request().postDataJSON();const state=await route.request().frame().evaluate(()=>window.__test);let value={userId:state.user},status=200;
    if(body.action.startsWith('admin_')){
     if(state.role!=='admin'){value={error:'admin_required'};status=403;}
     else if(body.action!=='admin_status'){value={...value,email:body.email,eligible:true,access:{active:body.action!=='admin_revoke',expires_at:'2026-12-13T00:00:00Z'}};}
    }else if(!state.allowed){value={error:'access_required'};status=403;}
    else if(state.role==='student'){value={error:'mode_mismatch'};status=403;}
    else if(body.action==='status')value.legal={version:'ncc-self-legal-20261113',accepted:state.accepted};
    else if(body.action==='accept_terms')await route.request().frame().evaluate(()=>window.__test.accepted=true);
    else if(body.action==='register')await route.request().frame().evaluate(()=>window.__test.registered=true);
    else if(body.action==='context'){
     if(!state.registered){status=403;value={error:'mode_mismatch'};}
     else value={...value,intake:state.intake,generalIntake:{student_id:state.user,...fields},latestPlan:state.saved};
    }else if(body.action==='save_intake'){
     const intake={user_id:state.user,revision:(state.intake?.revision||0)+1,data:body.fields};await route.request().frame().evaluate(intake=>window.__test.intake=intake,intake);value.intake=intake;
    }else if(body.action==='generate'){
     value={...value,intakeRevision:state.intake.revision,result:plan};await route.request().frame().evaluate(saved=>window.__test.saved=saved,value);
    }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
   await page.goto(origin+'/efg-nutrition/pilot/autogestion.html');await page.locator('#selfLogin').waitFor({state:'visible'});
   await page.screenshot({path:resolve(out,`${name}-${width}-ingreso.png`),fullPage:true});
   await page.locator('#selfEmail').fill('person@example.invalid');await page.locator('#selfEmailForm button').click();await page.locator('#selfCode').fill('123456');await page.locator('#selfCodeForm button[type=submit]').click();
   await page.locator('#selfEntry').waitFor({state:'visible'});await page.locator('#selfEntryConsent').check();await page.locator('#openSelfIntake').click();await page.locator('#intake').waitFor({state:'visible'});
   assert.equal(await page.locator('[name=weight_kg]').inputValue(),'80');
   await page.locator('[name=age_years]').fill('');await page.locator('#generate').click();assert.equal((await page.evaluate(()=>window.__test.intake)),null);
   await page.locator('[name=age_years]').fill('35');await page.locator('[name=scope]').check();await page.locator('[name=consent]').check();await page.locator('#generate').click();await page.locator('#result').waitFor({state:'visible'});
   assert.equal(await page.locator('#intake').isVisible(),false);assert.equal(await page.locator('.meal-tabs button').count(),6);
   await page.locator('.meal-tabs button').nth(3).click();assert.equal(await page.locator('.meal-panel:visible').count(),1);
   await page.screenshot({path:resolve(out,`${name}-${width}-guia.png`),fullPage:true});
   await page.locator('#retryAccess').click();await page.locator('#result').waitFor({state:'visible'});
   await page.locator('#showIntake').click();await page.locator('[name=weight_kg]').fill('79');assert.equal(await page.locator('#showGuide').isDisabled(),true);
   await page.screenshot({path:resolve(out,`${name}-${width}-ficha.png`),fullPage:true});
   await page.evaluate(()=>{window.__test.user='other';window.__test.allowed=false;window.__test.listener('SIGNED_IN',{user:{id:'other'}});});
   await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('no está habilitado'));assert.equal(await page.locator('#result').textContent(),'');assert.equal(await page.locator('#intake').isVisible(),false);
   await page.evaluate(()=>{window.__test.user='student';window.__test.allowed=true;window.__test.role='student';window.__test.listener('SIGNED_IN',{user:{id:'student'}});});
   await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('circuito con coach'));assert.equal(await page.locator('#mainAppLink').isVisible(),true);
   await page.evaluate(()=>sessionStorage.setItem('__testInit',JSON.stringify({user:'student',role:'student'})));await page.goto(origin+'/efg-nutrition/pilot/autogestion-admin.html');await page.waitForFunction(()=>document.getElementById('adminStatus').textContent.includes('administradora'));assert.equal(await page.locator('#adminControls').isVisible(),false);
   await page.evaluate(()=>{window.__test.user='admin';window.__test.role='admin';});
   // Reload would reset init fixtures, so navigate with a new init identity.
   await page.evaluate(()=>sessionStorage.setItem('__testInit',JSON.stringify({user:'admin',role:'admin'})));await page.reload();await page.locator('#adminControls').waitFor({state:'visible'});
   await page.locator('#accessEmail').fill('person@example.invalid');await page.locator('#accessLookup button').click();await page.locator('#accessDetail').waitFor({state:'visible'});await page.locator('#grantAccess').click();await page.waitForFunction(()=>document.getElementById('adminStatus').textContent==='Acceso al piloto guardado.');
   await page.screenshot({path:resolve(out,`${name}-${width}-administracion.png`),fullPage:true});
   await page.locator('#revokeAccess').click();await page.waitForFunction(()=>document.getElementById('adminStatus').textContent.includes('revocado'));
   await page.evaluate(()=>window.__test.listener('SIGNED_OUT',null));assert.equal(await page.locator('#accessEmail').inputValue(),'');assert.equal(await page.locator('#adminControls').isVisible(),false);
   assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   results.push({engine:name,width,passed:true,cases:['OTP','previous intake','missing fields','generation','six meals','reentry','regeneration required','account switch','student routing','admin denial','grant','revoke','clear on logout']});await context.close();
  }}finally{await browser.close();}
 }
 writeFileSync(resolve(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{server.close();}
