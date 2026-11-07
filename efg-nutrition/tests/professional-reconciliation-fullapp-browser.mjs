// CI-only source: real browser reload against fictional service storage. No JWT/RLS parity.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {startSyntheticServer} from './dual-workspace-fullapp-server.mjs';
const engine=process.env.NCC_BROWSER||'chromium';assert.ok(['chromium','webkit'].includes(engine));
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('../../artifacts/fullapp-browser/'+engine+'/professional-reconciliation/',import.meta.url));
mkdirSync(out,{recursive:true});
const result={engine,status:'RUNNING',scope:'synthetic full app only; no JWT/RLS/real SDK parity',scenarios:[],errors:[],externalRequests:[]};
let browser,server,context;
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function enter(page){
 await button(page,'Iniciar alumna dual ficticia').click();
 await page.getByText('Sesión ficticia iniciada. Abrí Mis alumnos en el selector.',{exact:true}).waitFor();
 const select=page.locator('[data-ncc-dual-panel]').getByLabel('Espacio personal o profesional');
 const key=await select.locator('option').last().getAttribute('value');assert.match(key,/^coach:/);await select.selectOption(key);
 const pro=page.locator('[data-ncc-professional-screens]'),pupil=pro.getByLabel('Alumno del espacio profesional',{exact:true});
 await pupil.waitFor();await pupil.selectOption(await pupil.locator('option').nth(1).getAttribute('value'));
 await pro.getByLabel('Mensaje ficticio',{exact:true}).waitFor();return pro;
}
async function counts(page,attempts,inserts){
 await button(page,'Comprobar envíos ficticios').click();
 await page.getByText(`Envíos ficticios: ${attempts} intentos, ${inserts} inserts, ${inserts} filas.`,{exact:true}).waitFor();
}
async function pending(pro){await button(pro,'Verificar envío pendiente').waitFor();assert.equal(await button(pro,'Enviar mensaje ficticio').isDisabled(),true);}
try{
 server=await startSyntheticServer({enabled:true,professionalScreens:true,professionalFixture:true,professionalReconciliation:true});
 browser=await engines[engine].launch({headless:true});
 for(const width of [390,1280])for(const mode of ['persisted','missing','revoked']){
  context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin===server.origin)return route.continue();result.externalRequests.push(route.request().url());return route.abort('blockedbyclient');});
  context.on('page',p=>p.on('pageerror',e=>result.errors.push(e.message)));
  const page=await context.newPage(),url=server.origin+'/efg-nutrition/pilot/';
  await page.goto(url,{waitUntil:'networkidle'});let pro=await enter(page);
  await button(page,mode==='missing'?'Perder próximo envío sin fila':'Perder próxima respuesta de envío').click();
  await pro.getByLabel('Mensaje ficticio',{exact:true}).fill('ENVÍO FICTICIO RECARGA '+mode);
  await button(pro,'Enviar mensaje ficticio').click();await pending(pro);await counts(page,1,mode==='missing'?0:1);
  // A second tab shares the journal, but must explicitly sign in and select scope.
  const second=await context.newPage();await second.goto(url,{waitUntil:'networkidle'});
  const secondPro=await enter(second);await pending(secondPro);await counts(second,1,mode==='missing'?0:1);await second.close();
  await button(pro,'Cancelar borradores').click();await pro.getByText('Borradores cancelados. Las operaciones pendientes se conservan.',{exact:true}).waitFor();await pending(pro);
  await button(page,'Cerrar sesión ficticia').click();await page.getByText('Sesión ficticia cerrada.',{exact:true}).waitFor();assert.equal(await page.locator('[data-ncc-professional-screens]').count(),0);
  if(mode==='revoked')await button(page,'Revocar capacidad ficticia').click();
  await page.reload({waitUntil:'networkidle'});
  // A reload must not restore login from the journal or fictional backend.
  assert.equal(await page.locator('[data-ncc-professional-screens]').count(),0);
  if(mode==='revoked'){
   await button(page,'Iniciar alumna dual ficticia').click();
   await page.getByText('Sesión ficticia iniciada. Abrí Mis alumnos en el selector.',{exact:true}).waitFor();
   assert.equal(await page.locator('[data-ncc-dual-panel] option[value^="coach:"]').count(),0);
   assert.equal(await button(page,'Enviar mensaje ficticio').count(),0);
   await counts(page,1,1);
  }else{
   pro=await enter(page);await pending(pro);await button(pro,'Verificar envío pendiente').click();
   if(mode==='persisted'){
    await pro.getByText('Mensaje anterior confirmado sin reenviar.',{exact:true}).waitFor();
    assert.equal(await button(pro,'Enviar mensaje ficticio').isDisabled(),false);
   }else{
    await pro.getByText('El resultado sigue incierto: no hay un recibo visible que permita confirmarlo. No se reenvía.',{exact:true}).waitFor();
    await pending(pro);
   }
   await counts(page,1,mode==='missing'?0:1);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+mode+'-'+width+'.png',fullPage:true});
  result.scenarios.push({width,mode,passed:['real reload','explicit reauthentication','cross-tab durable reservation','cancel/logout preserve reservation','no duplicate insert',mode==='persisted'?'exact receipt confirmation without resend':mode==='missing'?'absent receipt stays blocked':'revocation survives reload']});
  await context.close();context=null;
 }
 assert.deepEqual(result.externalRequests,[]);assert.deepEqual(result.errors,[]);result.status='PASS_SYNTHETIC_FULL_APP_ONLY';
}catch(error){result.status='FAILED_OR_BLOCKED';result.failure=error.stack;process.exitCode=1;}
finally{try{await context?.close();}finally{try{await browser?.close();}finally{await server?.close();writeFileSync(out+'result.json',JSON.stringify(result,null,2)+'\n');}}}
console.log(JSON.stringify(result,null,2));
