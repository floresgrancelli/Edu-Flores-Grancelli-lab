// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/payments-review');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.
copyFileSync(resolve(root,'efg-nutrition/pilot/nutrition-daily-tip.js'),resolve(preview,'dist/efg-nutrition/pilot/nutrition-daily-tip.js'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');


const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__,s=v.state;s.profile.role=role;s.tab='payments';s.org={...s.org,is_test:false,payment_alias:'COACH.DEMO',license_fee_ars:12000,seat_limit:10,status:'active'};s.platformAlias='NCC.DEMO';s.platformAliases=['NCC.DEMO'];
 s.payments=['pending','approved','rejected'].map((status,i)=>({id:'payment-'+i,status,payment_kind:'student_coach',payer_id:role==='student'?s.session.user.id:'pupil',recipient_id:role==='coach'?s.session.user.id:'coach',organization_id:s.org.id,amount_ars:15000,period_label:'2026-11',created_at:'2026-11-12T12:00:00Z',receipt_path:'demo/'+i+'.png'}));
 await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.payments));
 const nav=page.locator('#nccPaymentSections');
 const first=role==='student'?'summary':'received',send=role==='student'?'send':'license';
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-summary.png'),fullPage:true});
 await nav.locator('[data-workspace-tab='+send+']').click();
 await page.locator('#payAmount').fill('15000');await page.locator('#payPeriod').fill('2026-11');
 await page.locator('#payFile').setInputFiles({name:'comprobante-demo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ioAAAAASUVORK5CYII=','base64')});
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-send.png'),fullPage:true});
 await nav.locator('[data-workspace-tab=history]').click();
 if(role==='student'){
 const history=page.locator('[data-payment-section=history]');
 for(const filter of ['pending','approved','rejected']){await history.locator('[data-payment-filter='+filter+']').click();assert.equal(await history.locator('[data-payment-status]:visible').count(),1);}
 await history.locator('[data-payment-filter=all]').click();
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-history.png'),fullPage:true});
 }
 await nav.locator('[data-workspace-tab='+send+']').click();
 assert.equal(await page.locator('#payAmount').inputValue(),'15000');assert.equal(await page.locator('#payPeriod').inputValue(),'2026-11');assert.equal(await page.locator('#payFile').evaluate(e=>e.files.length),1);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.payments)),before);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 evidence.push({engine,width,role,draftsAndFilePreserved:true,noPaymentMutation:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS payments',evidence.length);
}finally{server.close();}
