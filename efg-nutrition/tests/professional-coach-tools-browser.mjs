// New clinical/tool routes only. Real Chromium + native IDB + actual PDF bytes;
// backend is an explicit in-memory SDK fixture, not Auth/API/SQL certification.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFileSync,writeFileSync} from 'node:fs';import {resolve,extname} from 'node:path';import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const html='<!doctype html><meta name="viewport" content="width=device-width"><style>body{font:16px system-ui;margin:16px}section,article{max-width:100%}label{display:block}input,select,textarea,button{max-width:100%;box-sizing:border-box}pre{white-space:pre-wrap;overflow-wrap:anywhere}button{margin:6px 4px 6px 0}</style><main><section id="personal">Historial personal intacto</section><section id="professional"></section></main><script type="module" src="/efg-nutrition/tests/professional-coach-tools-browser-entry.mjs"></script>';
const server=createServer((req,res)=>{try{if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))throw Error('loopback only');const path=new URL(req.url,'http://127.0.0.1').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw Error('outside');let data=readFileSync(file);if(path.endsWith('/professional-coach-tools-fixture.mjs')){
 let source=data.toString();const once=(a,b)=>{assert.equal(source.split(a).length,2);source=source.replace(a,b);};
 once("import {webcrypto} from 'node:crypto';","const webcrypto=globalThis.crypto;");once("import {readFileSync} from 'node:fs';",'');once("import {fakeIDB} from './professional-terms-test-support.mjs';",'');
 once("JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url)))",readFileSync(resolve(root,'efg-nutrition/catalog/guide-catalog.json'),'utf8'));
 once("Buffer.from(JSON.stringify({session_id:s.session})).toString('base64url')","btoa(JSON.stringify({session_id:s.session}))");once('createReleaseJournal(fakeIDB())','createReleaseJournal()');data=Buffer.from(source);
 }res.setHeader('Content-Type',extname(file)==='.json'?'application/json':'text/javascript');res.end(data);}catch(e){res.statusCode=404;res.end('Fixture resource unavailable');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.NCC_CHROMIUM_EXECUTABLE?{executablePath:process.env.NCC_CHROMIUM_EXECUTABLE}:{}),args:process.env.NCC_CHROMIUM_ARGS?JSON.parse(process.env.NCC_CHROMIUM_ARGS):[]});
const result={scope:'Existing release parent + new coach tools at 390/1280, native IDB and actual Luxury PDF; synthetic SDK, no hosted backend claim',checks:[],errors:[],external:[]};
try{for(const width of [390,1280]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});await context.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();result.external.push(r.request().url());return r.abort();});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>!!window.coachFixture);await page.evaluate(()=>window.coachFixture.ready);
 await page.getByRole('combobox',{name:'Elegí tu espacio'}).selectOption('11000000-0000-4000-8000-000000000003');
 await page.getByRole('combobox',{name:'Alumno del espacio profesional'}).selectOption('11000000-0000-4000-8000-000000000004');
 await page.getByRole('heading',{name:'Ficha de Alumno ficticio',exact:true}).waitFor();
 await page.getByRole('button',{name:'Consultar conversación',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('select[aria-label="Elegí tu espacio"]')?.disabled);
 assert.equal(await page.getByText('Ficha recibida · lista para revisar',{exact:true}).isVisible(),true);
 await page.getByRole('button',{name:'Continuar a objetivos',exact:true}).click();
 assert.equal(await page.locator('.ncc-plan-step:visible').count(),1);
 assert.equal(await page.getByRole('button',{name:'Calcular propuesta',exact:true}).isEnabled(),true);
 await page.getByRole('combobox',{name:'Parámetro de la ecuación'}).selectOption('male');
 await page.getByRole('button',{name:'1. Ficha recibida',exact:true}).click();
 await page.getByRole('button',{name:'Continuar a objetivos',exact:true}).click();
 assert.equal(await page.getByRole('combobox',{name:'Parámetro de la ecuación'}).inputValue(),'male','Switching steps preserves calculator input without submitting');
 await page.getByRole('button',{name:'Calcular propuesta',exact:true}).click();
 await page.getByRole('button',{name:'Generar Dieta Guía de seis horarios',exact:true}).click();await page.getByRole('heading',{name:'Dieta Guía para revisar',exact:true}).waitFor();
 const guide=page.locator('[data-ncc-coach-tools] section').filter({has:page.getByRole('heading',{name:'Dieta Guía para revisar',exact:true})}).first();assert.equal(await guide.locator('h4').count(),6);
 await page.getByRole('button',{name:'Revisar y enviar',exact:true}).click();
 assert.equal(await page.locator('.ncc-plan-step:visible').count(),1);
 await page.getByRole('checkbox',{name:'Revisé cantidades, alimentos y objetivos de este borrador',exact:true}).check();await page.getByRole('button',{name:'Guardar borrador revisado',exact:true}).click();
 await page.waitForFunction(()=>window.coachFixture.f.s.tables.efg_coach_plan_drafts[0]?.draft_revision===1);
 await page.getByRole('checkbox',{name:'Apruebo enviar este objetivo y esta guía al alumno',exact:true}).check();await page.getByRole('button',{name:'Publicar objetivo y Dieta Guía',exact:true}).click();await page.waitForFunction(()=>window.coachFixture.f.s.tables.efg_coach_plan_drafts[0]?.status==='published');
 assert.equal(await page.evaluate(()=>window.coachFixture.f.original.role),'student');assert.equal(await page.evaluate(()=>window.coachFixture.f.original.organization_id),'11000000-0000-4000-8000-000000000005');
 await page.getByRole('textbox',{name:'Informe desde',exact:true}).count().catch(()=>0);await page.getByLabel('Informe desde',{exact:true}).fill('2026-11-01');await page.getByLabel('Informe hasta',{exact:true}).fill('2026-11-06');await page.getByRole('button',{name:'Generar informe Luxury Pro',exact:true}).click();
 await page.getByRole('button',{name:'Revisar PDF y compartir',exact:true}).click();const dialog=page.locator('dialog.period-pdf-dialog');await dialog.waitFor();await page.waitForFunction(()=>document.querySelector('dialog [data-weekly-counter]')?.textContent.startsWith('Página 1 de '));
 for(let count=0;count<12&&await dialog.locator('[data-weekly-next]').isEnabled();count++){const text=await dialog.locator('[data-weekly-counter]').textContent();await dialog.locator('[data-weekly-next]').click();await page.waitForFunction(old=>document.querySelector('dialog [data-weekly-counter]')?.textContent!==old,text);}
 await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Aprobar y compartir con alumno',exact:true}).click();await page.waitForFunction(()=>window.coachFixture.f.s.tables.efg_period_reports.length===1);await dialog.waitFor({state:'detached'});
 await page.getByRole('button',{name:'Aprobar pago FICTICIO',exact:true}).click();await page.getByText('100 ARS · FICTICIO · approved',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.coachFixture.f.s.writes.filter(x=>x.rpc==='efg_publish_coach_plan_draft_atomic').length),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByRole('combobox',{name:'Elegí tu espacio'}).selectOption('');assert.equal(await page.locator('#personal').isVisible(),true);
 result.checks.push(width+'px: independent student-coach scope; shared intake, calculator, six meals without health sharing, reviewed draft, atomic publication, actual reviewed Luxury PDF/share, exact payment recipient, personal return');await context.close();
}assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);result.status='PASS';}
catch(e){result.status='FAIL';result.failure=e.message;throw e;}finally{await browser.close();await new Promise(r=>server.close(r));if(process.env.NCC_COACH_TOOLS_EVIDENCE)writeFileSync(process.env.NCC_COACH_TOOLS_EVIDENCE,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
