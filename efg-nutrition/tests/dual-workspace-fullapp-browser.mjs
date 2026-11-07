// Pending authorized browser execution. Never run against a hosted URL.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {startSyntheticServer} from './dual-workspace-fullapp-server.mjs';
const engine=process.env.NCC_BROWSER||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'NCC_BROWSER must be chromium or webkit');
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('../../artifacts/fullapp-browser/'+engine+'/',import.meta.url));
mkdirSync(out,{recursive:true});
const result={engine,status:'RUNNING',scope:'complete pilot.js with in-memory synthetic SDK; not backend/RLS parity',scenarios:[],screenshots:[],errors:[],externalRequests:[]};
let browser,server;
try{
 browser=await engines[engine].launch({headless:true});
 for(const enabled of [false,true]){
  server=await startSyntheticServer({enabled});
  for(const width of enabled?[390,1280]:[390]){
   const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===server.origin)return route.continue();
    result.externalRequests.push(url.href);return route.abort('blockedbyclient');
   });
   const page=await context.newPage();
   const capture=async(label)=>{const filename=label+'-'+width+'.png';await page.screenshot({path:out+filename,fullPage:true});result.screenshots.push({engine,width,label,filename});};
   page.on('pageerror',error=>result.errors.push(error.message));
   await page.goto(server.origin+'/efg-nutrition/pilot/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>!!window.__NCC_R4_FULLAPP__);
   const panel=page.locator('[data-ncc-dual-panel]');
   if(!enabled){
    await page.evaluate(()=>window.__NCC_R4_FULLAPP__.fixture.loginAs('learner'));
    assert.equal(await panel.count(),0);
    assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.fixture.calls().filter(c=>c.name?.startsWith('ncc_dual_')||c.name?.startsWith('ncc_pilot_workspace_')).length),0);
    await capture('feature-off');
    result.scenarios.push({enabled,width,passed:['full app boot','feature OFF no panel/RPC']});
    await context.close();continue;
   }
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.fixture.loginAs('admin'));
   const create=panel.locator('form').first();
   await create.locator('[name="email"]').fill('learner@example.invalid');
   await create.locator('[name="name"]').fill('Coach DEMO');
   await create.locator('[name="seats"]').fill('3');
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.hasPendingUnsavedEdits()),false);
   await create.getByRole('button',{name:'Agregar coach ficticio'}).click();
   await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.fixture.inspect().capabilities.length===1);
   await panel.getByRole('button',{name:'Guardar cupo ficticio'}).waitFor();
   const seats=panel.locator('form').nth(1);await seats.locator('[name="seats"]').fill('4');
   await seats.getByRole('button',{name:'Guardar cupo ficticio'}).click();
   await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.fixture.inspect().organizations.find(o=>o.name==='Coach DEMO')?.seat_limit===4);
   await page.waitForFunction(()=>!document.querySelector('[data-ncc-dual-panel] button:disabled'));
   await capture('admin-quota');
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.fixture.loginAs('learner'));
   const original=await page.evaluate(()=>JSON.stringify({profile:window.__NCC_R4_FULLAPP__.state.profile,org:window.__NCC_R4_FULLAPP__.state.org,history:window.__NCC_R4_FULLAPP__.fixture.inspect().history}));
   const key=await panel.locator('select option').last().getAttribute('value');assert.match(key,/^coach:/);
   await panel.getByRole('combobox').selectOption(key);
   assert.equal(await page.locator('[data-ncc-personal-content]').isVisible(),false);
   assert.equal(await page.locator('[data-ncc-personal-content]').evaluate(e=>e.inert),true);
   assert.ok(await page.locator('.pilot-nav [data-tab]:disabled').count()>0);
   assert.ok(await page.locator('[data-act="logout"]:not(:disabled)').count()>0);
   const oldTab=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.tab);
   await page.locator('.pilot-nav [data-tab]').first().dispatchEvent('click');
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.tab),oldTab);
   await panel.locator('input[type="checkbox"]').check();
   await panel.getByRole('button',{name:'Aceptar condiciones ficticias'}).click();
   await panel.getByRole('button',{name:'Invitar alumno ficticio'}).waitFor();
   await panel.locator('[name="name"]').fill('Alumno ficticio');
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.hasPendingUnsavedEdits()),false);
   await panel.getByRole('combobox').selectOption('student');
   assert.equal(await page.locator('[data-ncc-personal-content]').isVisible(),true);
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render()); // rerender must reuse selector/client
   await panel.getByRole('combobox').selectOption(key);
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.render());
   assert.equal(await panel.getByRole('combobox').inputValue(),key);
   await page.evaluate(org=>window.__NCC_R4_FULLAPP__.fixture.addSyntheticRoster(org),key.slice(6));
   await panel.getByRole('button',{name:'Consultar lista básica'}).click();
   await panel.getByText('Alumno DEMO · Sin consentimiento de seguimiento',{exact:true}).waitFor();
   await capture('professional-roster');
   assert.equal(await page.evaluate(()=>JSON.stringify({profile:window.__NCC_R4_FULLAPP__.state.profile,org:window.__NCC_R4_FULLAPP__.state.org,history:window.__NCC_R4_FULLAPP__.fixture.inspect().history})),original);
   // Existing personal draft survives rejected transition. No panel input creates it.
   await panel.getByRole('combobox').selectOption('student');
   await capture('personal-return');
   await page.evaluate(()=>{window.__NCC_R4_FULLAPP__.state.plannerDraftGrams={synthetic:42};});
   await panel.getByRole('combobox').selectOption(key);
   assert.equal(await panel.getByRole('combobox').inputValue(),'student');
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.plannerDraftGrams.synthetic),42);
   await page.evaluate(()=>{window.__NCC_R4_FULLAPP__.state.plannerDraftGrams={};});
   await panel.getByRole('combobox').selectOption(key);
   // A late roster result after logout/new user must not repaint the old identity.
   await page.evaluate(()=>{globalThis.__releaseRoster=window.__NCC_R4_FULLAPP__.fixture.delayNext('ncc_pilot_workspace_roster_v1');});
   await panel.getByRole('button',{name:'Consultar lista básica'}).click();
   await page.locator('[data-act="logout"]:visible').first().click();
   await page.waitForFunction(()=>window.__NCC_R4_FULLAPP__.state.profile===null);
   await page.evaluate(async()=>{await window.__NCC_R4_FULLAPP__.fixture.loginAs('other-student');globalThis.__releaseRoster();});
   await page.waitForTimeout(50);
   assert.equal(await panel.getByRole('combobox').inputValue(),'student');
   assert.equal(await panel.getByText('Alumno DEMO · Sin consentimiento de seguimiento',{exact:true}).count(),0);
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.profile.user_id),'other-student');
   await capture('identity-isolation');
   const baselineCalls=await page.evaluate(()=>window.__NCC_R4_FULLAPP__.fixture.calls().length);
   await page.evaluate(async()=>{const f=window.__NCC_R4_FULLAPP__.fixture;await f.prepareNewCoach();await f.loginViaBootstrap('new-coach');});
   await panel.getByRole('combobox').waitFor();
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.dualCandidateCoach),true);
   assert.equal(await page.locator('.pilot-nav [data-tab]').count(),0);
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.profile.role),'coach');
   let bootstrapCalls=await page.evaluate(offset=>window.__NCC_R4_FULLAPP__.fixture.calls().slice(offset),baselineCalls);
   assert.equal(bootstrapCalls.filter(c=>c.name==='ncc_pilot_workspace_claim_v1').length,1);
   assert.equal(bootstrapCalls.filter(c=>c.name==='efg_claim_invitation').length,0);
   assert.ok(bootstrapCalls.every(c=>!c.table||c.table==='efg_profiles'),'Candidate bootstrap never reads legacy private tables');
   await page.evaluate(()=>window.__NCC_R4_FULLAPP__.refreshVisibleWorkspace());
   bootstrapCalls=await page.evaluate(offset=>window.__NCC_R4_FULLAPP__.fixture.calls().slice(offset),baselineCalls);
   assert.equal(bootstrapCalls.filter(c=>c.name==='ncc_pilot_workspace_claim_v1').length,1,'Pull refresh cannot double claim');
   assert.ok(bootstrapCalls.every(c=>!c.table||c.table==='efg_profiles'),'Candidate pull refresh stays restricted');
   await panel.getByRole('combobox').selectOption(await panel.locator('select option').last().getAttribute('value'));
   assert.ok(await panel.getByText('La aceptación como alumna/o no reemplaza la aceptación profesional.',{exact:false}).count()>0);
   await capture('new-coach-shell');
   await page.evaluate(async()=>{const f=window.__NCC_R4_FULLAPP__.fixture;await f.prepareNewCoach('no-invitation',false);await f.loginViaBootstrap('no-invitation');});
   assert.equal(await panel.count(),0);
   assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.profile),null);
   assert.ok(await page.getByRole('heading',{name:'Necesitamos verificar tu habilitación'}).count()>0);
   await capture('no-invitation');
   result.scenarios.push({enabled,width,passed:['full app boot','admin create/quota','dual learner original role/org','own selector return',
    'personal hidden/inert','personal navigation blocked, logout available','panel edits not personal draft',
    'rerender selection stable','metadata-only roster','real draft protected','late roster discarded across logout/account switch',
    'new-account candidate claim and restricted shell','no legacy private reads','pull-refresh does not double claim','absent invitation denied']});
   await context.close();
  }
  result.scenarios.at(-1).placeholderAssets=[...new Set(server.missing)];
  await server.close();server=null;
 }
 assert.deepEqual(result.externalRequests,[],'No attempted external requests');assert.deepEqual(result.errors,[],'No uncaught browser errors');
 result.status='PASS_SYNTHETIC_FULL_APP_ONLY';
}catch(error){result.status='FAILED_OR_BLOCKED';result.failure=error.message;process.exitCode=1;}
finally{await browser?.close();await server?.close();writeFileSync(out+'result.json',JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
