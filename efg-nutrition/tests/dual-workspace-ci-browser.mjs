// CI-only browser QA. Synthetic in-memory demo, not the live app or hosted Auth.
// Runs only locally; installation belongs to the bounded dedicated workflow.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
if(!process.env.NCC_PLAYWRIGHT_MODULE){console.error('NOT RUN: set NCC_PLAYWRIGHT_MODULE to an existing installation.');process.exit(2);}
const engine=process.env.NCC_QA_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'Only approved engines');
const engines=await import(pathToFileURL(process.env.NCC_PLAYWRIGHT_MODULE));
const artifactRoot=resolve('artifacts/ncc-dual-workspace',engine);
await mkdir(artifactRoot,{recursive:true});
const completed=[];
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root.replace(/\/$/,'')+sep)){res.writeHead(403);res.end();return;}
  const content=await readFile(path);res.setHeader('Content-Type',extname(path)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(content);
 }catch{res.writeHead(404);res.end();}
});
let browser;
try{
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
 const base=`http://127.0.0.1:${server.address().port}`;
 browser=await engines[engine].launch({headless:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage();const errors=[],external=[];page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin===base)return route.continue();
   external.push(route.request().url());return route.abort();
  });
  await page.goto(base+'/pilot/dual-workspace-demo.html');
  await page.getByText('Simulación preparada. No hay conexión a servicios reales.').waitFor();
  await page.getByRole('button',{name:'Agregar coach ficticio',exact:true}).click();
  await page.getByText('Cuenta existente habilitada en la simulación',{exact:false}).waitFor();
  await page.getByLabel('Nuevo cupo para Coach DEMO').fill('2');
  await page.getByRole('button',{name:'Guardar cupo ficticio'}).click();
  await page.getByText('Cupo ficticio actualizado.',{exact:true}).waitFor();
  await page.getByLabel('Identidad ficticia').selectOption('learner');
  await page.getByText('Sigo siendo alumna de mi entrenador',{exact:true}).waitFor();
  assert.match(await page.locator('#relationship').textContent(),/original.*autorizado/);
  const options=await page.locator('#workspace option').evaluateAll(options=>options.map(o=>o.value));
  const coach=options.find(o=>o.startsWith('coach:'));assert.ok(coach);
  await page.getByLabel('Espacio actual').selectOption(coach);
  await page.getByLabel('Acepto ambas versiones ficticias para este ensayo').check();
  await page.getByRole('button',{name:'Aceptar condiciones ficticias'}).click();
  await page.getByText('Aceptación profesional ficticia registrada. Sin efectos legales reales.',{exact:true}).waitFor();
  assert.equal(await page.locator('#quota').textContent(),'2 de 2 cupos disponibles');
  for(let n=1;n<=2;n++){
   await page.locator('#student-email').fill(`pupil-${n}@example.invalid`);
   await page.getByRole('button',{name:'Reservar cupo ficticio'}).click();
   await page.waitForFunction(n=>document.querySelector('#quota').textContent===`${2-n} de 2 cupos disponibles`,n);
  }
  assert.equal(await page.locator('#quota').textContent(),'0 de 2 cupos disponibles');
  await page.locator('#student-email').fill('pupil-3@example.invalid');
  await page.getByRole('button',{name:'Reservar cupo ficticio'}).click();
  await page.getByText('Se completaron los cupos.',{exact:true}).waitFor();
  await page.getByLabel('Espacio actual').selectOption('student');
  await page.getByRole('button',{name:'Simular retiro de consentimiento'}).click();
  await page.getByText('Seguimiento no autorizado.',{exact:false}).waitFor();
  await page.getByLabel('Espacio actual').selectOption(coach);
  assert.equal(await page.locator('#quota').textContent(),'0 de 2 cupos disponibles');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
  await page.screenshot({path:resolve(artifactRoot,`coach-${width}.png`),fullPage:true});
  await page.getByLabel('Identidad ficticia').selectOption('other');
  await page.getByText('Identidad ficticia cambiada.',{exact:true}).waitFor();
  const foreignOptions=await page.locator('#workspace option').evaluateAll(items=>items.map(o=>o.value));
  assert.equal(foreignOptions.includes(coach),false,'Other identity cannot select previous professional context');
  await page.reload();
  await page.getByText('Simulación preparada. No hay conexión a servicios reales.').waitFor();
  assert.equal(await page.getByLabel('Identidad ficticia').inputValue(),'admin','Fresh load resets synthetic session');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[],'No external requests');
  completed.push({engine,width,status:'PASS',externalRequests:0});await context.close();
 }
 await writeFile(resolve(artifactRoot,'report.json'),JSON.stringify({status:'PASS',scope:'Synthetic standalone demo only; not full app, GoTrue, physical Safari or production',completed},null,2)+'\n');
 console.log(`PASS ${engine} local demo at 390/1280; session reset and foreign-context denial. Synthetic-only, not full app or physical devices.`);
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
