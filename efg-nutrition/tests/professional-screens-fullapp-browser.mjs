// CI/browser test source. Synthetic SDK only; never claim real JWT/RLS parity.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {startSyntheticServer} from './dual-workspace-fullapp-server.mjs';
const engine=process.env.NCC_BROWSER||'chromium';assert.ok(['chromium','webkit'].includes(engine));
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('../../artifacts/fullapp-browser/'+engine+'/professional/',import.meta.url));mkdirSync(out,{recursive:true});
const result={engine,status:'RUNNING',scope:'complete pilot.js with synthetic SDK only; no backend parity',scenarios:[],errors:[],externalRequests:[]};
let browser,server;
try{
 browser=await engines[engine].launch({headless:true});
 for(const screens of [false,true]){
  server=await startSyntheticServer({enabled:true,professionalScreens:screens,professionalFixture:true});
  for(const width of screens?[390,1280]:[390]){
   const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin===server.origin)return route.continue();result.externalRequests.push(route.request().url());return route.abort('blockedbyclient');});
   const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
   await page.goto(server.origin+'/efg-nutrition/pilot/',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Iniciar alumna dual ficticia',exact:true}).click();
   const panel=page.locator('[data-ncc-dual-panel]'),select=panel.getByLabel('Espacio personal o profesional');
   const key=await select.locator('option').last().getAttribute('value');assert.match(key,/^coach:/);await select.selectOption(key);
   if(!screens){
    assert.equal(await page.locator('[data-ncc-professional-screens]').count(),0);
    await panel.getByText('siguen cerrados hasta integrar',{exact:false}).waitFor();
    await page.screenshot({path:out+'screens-off-'+width+'.png',fullPage:true});result.scenarios.push({screens,width,passed:['complete app boot','professional screens OFF']});await context.close();continue;
   }
   const pro=page.locator('[data-ncc-professional-screens]');await pro.getByLabel('Nuevo alias ficticio',{exact:true}).waitFor();
   assert.equal(await page.locator('[data-ncc-personal-content]').isVisible(),false);assert.equal(await page.locator('[data-ncc-personal-content]').evaluate(e=>e.inert),true);
   await pro.getByLabel('Nuevo alias ficticio',{exact:true}).fill('APP.FICTICIA');await pro.getByRole('button',{name:'Guardar alias ficticio',exact:true}).click();
   await pro.getByText('Alias actual: APP.FICTICIA',{exact:true}).waitFor();
   const pupil=pro.getByLabel('Alumno del espacio profesional',{exact:true});const first=await pupil.locator('option').nth(1).getAttribute('value');await pupil.selectOption(first);
   await pro.getByRole('button',{name:'Consultar recetas ficticias',exact:true}).click();await pro.getByText('Receta FICTICIA · 2 porciones',{exact:true}).waitFor();
   await pro.getByRole('button',{name:'Consultar mensajes ficticios',exact:true}).click();await pro.getByText('Alumno: Consulta FICTICIA',{exact:true}).waitFor();
   await pro.getByRole('button',{name:'Confirmar lecturas ficticias',exact:true}).click();await pro.getByText('Alumno: Consulta FICTICIA · Leído',{exact:true}).waitFor();
   const payload='<img src=x onerror=alert(1)> FICTICIO';await pro.getByLabel('Mensaje ficticio',{exact:true}).fill(payload);
   await pro.getByRole('button',{name:'Enviar mensaje ficticio',exact:true}).click();await pro.getByText('Vos: '+payload,{exact:true}).waitFor();assert.equal(await pro.locator('img').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
   await page.screenshot({path:out+'professional-'+width+'.png',fullPage:true});
   await pro.getByLabel('Mensaje ficticio',{exact:true}).fill('BORRADOR FICTICIO');await select.selectOption('student');await panel.getByText('Guardá o cancelá',{exact:false}).waitFor();
   assert.equal(await pro.getByLabel('Mensaje ficticio',{exact:true}).inputValue(),'BORRADOR FICTICIO');await pro.getByRole('button',{name:'Cancelar borradores',exact:true}).click();
   await select.selectOption('student');assert.equal(await page.locator('[data-ncc-personal-content]').isVisible(),true);
   await page.getByRole('button',{name:'Comprobar vínculo personal',exact:true}).click();await page.getByText('Rol student, organización, consentimiento e historial personales intactos.',{exact:true}).waitFor();
   await select.selectOption(key);await pro.getByLabel('Nuevo alias ficticio',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Revocar capacidad ficticia',exact:true}).click();await pro.getByRole('button',{name:'Volver a consultar',exact:true}).click();
   await pro.getByText('No hay contexto profesional cargado.',{exact:true}).waitFor();assert.equal(await pro.getByLabel('Nuevo alias ficticio',{exact:true}).count(),0);
   await pro.getByRole('button',{name:'Consultar espacio ficticio',exact:true}).click();await pro.getByText('No hay contexto profesional cargado.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Cerrar sesión ficticia',exact:true}).click();assert.equal(await panel.count(),0);
   result.scenarios.push({screens,width,passed:['complete app boot','own workspace','personal hidden/inert','alias','recipes','messages','read receipts','safe text','draft guarded leave/cancel','personal preservation','revocation','logout','no horizontal overflow']});
   await context.close();
  }
  await server.close();server=null;
 }
 assert.deepEqual(result.externalRequests,[]);assert.deepEqual(result.errors,[]);result.status='PASS_SYNTHETIC_FULL_APP_ONLY';
}catch(error){result.status='FAILED_OR_BLOCKED';result.failure=error.message;process.exitCode=1;}
finally{await browser?.close();await server?.close();writeFileSync(out+'result.json',JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
