// New release UI + native IndexedDB only, synthetic SDK. Not real Auth/API/server-CAS evidence.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve,extname,sep} from 'node:path';import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const html='<!doctype html><meta name="viewport" content="width=device-width"><style>body{font:16px system-ui;margin:16px}section,article{max-width:100%}label{display:block}input,select,textarea,button{max-width:100%;box-sizing:border-box}pre{white-space:pre-wrap;overflow-wrap:anywhere}button{margin:6px 4px 6px 0}</style><main><section id="personal">Mi espacio personal · historial intacto</section><section id="professional"></section></main><script type="module" src="/efg-nutrition/tests/professional-workspace-release-browser-fixture.mjs"></script>';
const server=createServer((req,res)=>{try{if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))throw Error('loopback only');const path=new URL(req.url,'http://127.0.0.1').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error('outside');res.setHeader('Content-Type',extname(file)==='.json'?'application/json':'text/javascript');res.end(readFileSync(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const args=process.env.NCC_CHROMIUM_ARGS?JSON.parse(process.env.NCC_CHROMIUM_ARGS):[];
const browser=await chromium.launch({headless:true,...(process.env.NCC_CHROMIUM_EXECUTABLE?{executablePath:process.env.NCC_CHROMIUM_EXECUTABLE}:{}),args});
const result={scope:'Release UI at 390/1280 + native IndexedDB/reload, synthetic SDK only; no hosted or server-CAS claim',checks:[],errors:[],external:[]};
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});await context.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();result.external.push(r.request().url());return r.abort();});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>result.errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>!!window.fixture);await page.evaluate(()=>window.fixture.ready);
  const chooser=page.getByRole('combobox',{name:'Elegí tu espacio'});await chooser.selectOption('72000000-0000-4000-8000-000000000002');
  const confirm=page.getByRole('button',{name:'Aceptar ambos documentos',exact:true});await confirm.waitFor();assert.equal(await confirm.isEnabled(),false);
  assert.equal(await page.locator('#personal').isVisible(),false);
  assert.equal(await page.locator('[data-document-kind="terms"]').textContent(),JSON.parse(readFileSync(new URL('./professional-terms-v2-fixture-vector.json',import.meta.url))).bundle.documents[0].body);
  await page.getByRole('checkbox').nth(0).check();assert.equal(await confirm.isEnabled(),false);await page.getByRole('checkbox').nth(1).check();assert.equal(await confirm.isEnabled(),true);
  await page.evaluate(()=>{window.fixture.state.lost=true;window.fixture.save();});await confirm.click();await page.getByText('Hay una operación anterior con resultado incierto.',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>window.fixture.state.writes),1);
  await page.reload();await page.waitForFunction(()=>!!window.fixture);await page.evaluate(()=>window.fixture.ready);await chooser.selectOption('72000000-0000-4000-8000-000000000002');
  await page.getByRole('button',{name:'Verificar aceptación anterior',exact:true}).click();await page.getByRole('button',{name:'Invitar alumno',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.fixture.state.writes),1);
  assert.equal(await page.getByRole('checkbox').count(),1);
  assert.equal(await page.getByRole('checkbox').isChecked(),false);
  await chooser.selectOption('');assert.equal(await page.locator('#personal').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.fixture.original.role),'student');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  result.checks.push(width+'px: exact inline text, separate checks, lost response, IndexedDB reload/readback without resend, personal return/profile intact, no horizontal overflow');
  // Admin works through the same UI with a separate verified profile, not a client role switch.
  await page.evaluate(()=>{window.fixture.state.role='admin';window.fixture.state.lost=false;window.fixture.save();});await page.reload();await page.waitForFunction(()=>!!window.fixture);await page.evaluate(()=>window.fixture.ready);
  await page.getByRole('spinbutton',{name:'Cupo para Coach ficticia',exact:true}).fill('20');await page.getByRole('button',{name:'Guardar cupo',exact:true}).click();await page.getByText('0 activos + 0 invitados de 20 cupos',{exact:true}).waitFor();
  await page.evaluate(()=>window.fixture.emit('SIGNED_OUT'));assert.equal(await page.locator('#professional').textContent(),'');assert.equal(await page.locator('#personal').isVisible(),true);
  result.checks.push(width+'px: explicit admin quota update with receipt; logout clears professional view');
  await context.close();
 }
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);result.status='PASS';
} catch(e){result.status='FAIL';result.failure=e.message;throw e;}finally{await browser.close();await new Promise(r=>server.close(r));const out=process.env.NCC_RELEASE_UI_EVIDENCE;if(out)writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
