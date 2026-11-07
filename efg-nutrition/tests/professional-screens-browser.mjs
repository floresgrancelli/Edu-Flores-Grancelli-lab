import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const base=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(base,'browser-evidence');
await mkdir(out,{recursive:true});
const report={scope:'Detached professional screens, synthetic fixture only. Not full app or backend QA.',checks:[],errors:[],externalRequests:[]};
const server=http.createServer(async(req,res)=>{
 try {
  const requestPath=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const filename=path.resolve(base,'.'+requestPath);
  if(!filename.startsWith(path.join(base,'efg-nutrition')+path.sep))throw new Error('Denied path');
  const data=await readFile(filename);res.writeHead(200,{'Content-Type':filename.endsWith('.html')?'text/html':'text/javascript','Cache-Control':'no-store'});res.end(data);
 }catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
const check=(label,actual)=>{assert.ok(actual,label);report.checks.push(label);};
try {
 const launchOptions={headless:true};
 if(process.env.NCC_CHROMIUM_EXECUTABLE)launchOptions.executablePath=process.env.NCC_CHROMIUM_EXECUTABLE;
 browser=await chromium.launch(launchOptions);
 for(const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin===origin)return route.continue();
   report.externalRequests.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(origin+'/efg-nutrition/tests/professional-screens-preview.html');
  const initial=await page.evaluate(async()=>{const {fixture}=await import('./professional-screens-preview.mjs');return fixture.personalSnapshot();});
  const off=await page.evaluate(async()=>{
   const {mountProfessionalScreens}=await import('../pilot/professional-screens-panel.mjs?v=ncc-professional-reconciliation-r1-20261107');
   const root=document.createElement('div');let calls=0;
   const panel=mountProfessionalScreens({root,transport:{perform(){calls++;}}});
   return {result:await panel.ready,children:root.children.length,calls};
  });
  check(width+' OFF has no DOM or transport calls',off.result.disabled&&off.children===0&&off.calls===0);
  await page.getByRole('button',{name:'Abrir espacio profesional ficticio',exact:true}).click();
  await page.getByRole('button',{name:'Guardar alias ficticio',exact:true}).waitFor();
  await page.getByLabel('Nuevo alias ficticio',{exact:true}).fill('ALIAS.DEMO');
  await page.getByRole('button',{name:'Guardar alias ficticio',exact:true}).click();
  await page.getByText('Alias actual: ALIAS.DEMO',{exact:true}).waitFor();
  check(width+' alias result belongs to professional workspace',true);
  await page.getByLabel('Alumno del espacio profesional',{exact:true}).selectOption('33333333-3333-4333-8333-333333333333');
  await page.getByRole('button',{name:'Consultar recetas ficticias',exact:true}).click();
  await page.getByText('Receta FICTICIA · 2 porciones',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Consultar mensajes ficticios',exact:true}).click();
  await page.getByText('Alumno: Consulta FICTICIA',{exact:true}).waitFor();
  await page.getByLabel('Mensaje ficticio',{exact:true}).fill('<img src=x onerror=alert(1)> FICTICIO');
  await page.getByRole('button',{name:'Enviar mensaje ficticio',exact:true}).click();
  await page.getByText('Vos: <img src=x onerror=alert(1)> FICTICIO',{exact:true}).waitFor();
  check(width+' messages render escaped text',await page.locator('#screens img').count()===0);
  await page.getByRole('button',{name:'Confirmar lecturas ficticias',exact:true}).click();
  await page.getByText('Alumno: Consulta FICTICIA · Leído',{exact:true}).waitFor();
  check(width+' recipes and message workflow render',true);
  const personal=await page.evaluate(async()=>{const {fixture}=await import('./professional-screens-preview.mjs');return fixture.personalSnapshot();});
  assert.deepEqual(personal,initial);check(width+' personal profile role, organization, consent, history and chat unchanged',true);
  check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'professional-screens-'+width+'.png'),fullPage:true});
  await page.getByLabel('Mensaje ficticio',{exact:true}).fill('Borrador FICTICIO');
  await page.getByRole('button',{name:'Volver a mi seguimiento ficticio',exact:true}).click();
  check(width+' unsaved draft blocks leaving',await page.locator('#screens textarea').count()===1);
  await page.getByRole('button',{name:'Cancelar borradores',exact:true}).click();
  await page.getByRole('button',{name:'Volver a mi seguimiento ficticio',exact:true}).click();
  check(width+' cancellation permits return and removes professional UI',await page.locator('#screens').textContent()==='');
  await page.getByRole('button',{name:'Abrir espacio profesional ficticio',exact:true}).click();
  await page.getByLabel('Alumno del espacio profesional',{exact:true}).waitFor();
  await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate')));
  check(width+' Back/Forward event closes and clears panel',await page.locator('#screens').textContent()==='');
  await page.getByRole('button',{name:'Abrir espacio profesional ficticio',exact:true}).click();
  await page.getByLabel('Alumno del espacio profesional',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Simular cierre de sesión',exact:true}).click();
  check(width+' logout clears panel',await page.locator('#screens').textContent()==='');
  await page.getByRole('button',{name:'Abrir espacio profesional ficticio',exact:true}).click();
  await page.getByLabel('Alumno del espacio profesional',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Simular revocación profesional',exact:true}).click();
  await page.getByText('No hay contexto profesional cargado.',{exact:true}).waitFor();
  check(width+' revoke removes all private screen data',await page.locator('#screens input,#screens textarea,#screens select').count()===0);
  await context.close();
 }
 check('No browser exceptions',report.errors.length===0);check('No external network requests',report.externalRequests.length===0);report.status='PASS';
}catch(error){report.status=browser?'FAIL':'BLOCKED_BEFORE_BROWSER';report.failure=error.stack;throw error;}
finally {await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
