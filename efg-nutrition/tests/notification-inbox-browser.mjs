// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/notification-inbox');
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
writeFileSync(pilot,readFileSync(pilot,'utf8')+`
globalThis.__NCC_NOTIFICATION_QA__={inbox,sb,messages,consent:coachRosterConsent,setDirty:v=>{userHasUnconfirmedEdits=v;},setReports:v=>{myWeeklyReports=v;},stubDetail:()=>{loadStudentDetail=async id=>{state.selectedStudent=id;state.consent={accepted:true};};}};
`);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');


const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();
 await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async role=>{
 const v=window.__NCC_R4_FULLAPP__,q=window.__NCC_NOTIFICATION_QA__,s=v.state;
 s.profile.role=role;s.org.is_test=role==='admin';s.tab='notifications';s.selectedStudent=null;s.roster=[{user_id:'pupil',nickname:'María · DEMO',active:true}];q.consent.pupil=true;
 s.coachIntakeForms.pupil={student_id:'pupil',shared_at:'2026-11-12',objective:'Mejorar mis hábitos',meal_routine:'Desayuno, almuerzo y cena'};
 q.stubDetail();
 const rows=role==='student'?[
 {id:'message',kind:'message',title:'Nuevo mensaje',body:'Tu coach te escribió. Abrí la conversación para responder.',target_tab:'messages'},
 {id:'report',kind:'weekly_report',event_key:'weekly:2026-11-06:2026-11-07',title:'Nuevo informe semanal',body:'Tu coach compartió el informe de la semana.',target_tab:'summaries'},
 {id:'guide',kind:'guide',title:'Tu Dieta Guía está lista',body:'Consultá las comidas y las indicaciones de tu coach.',target_tab:'home',is_read:true}]:[
 {id:'intake',kind:'message',title:'Ficha nutricional recibida',body:'María compartió su ficha para preparar su plan.',target_tab:'coachIntake',target_student:'pupil'},
 {id:'message',kind:'message',title:'Nuevo mensaje de María',body:'Abrí la conversación para responder.',target_tab:'messages',target_student:'pupil'},
 {id:'payment',kind:'payment',title:'Comprobante recibido',body:'Revisá el comprobante en Pagos.',target_tab:'payments',is_read:true}];
 rows.forEach(r=>{r.recipient_id=s.session.user.id;r.is_read=!!r.is_read;r.created_at='2026-11-12T12:00:00Z';});
 window.__NOTICE_ROWS__=rows;window.__NOTICE_WRITES__=[];
 const original=q.sb.from.bind(q.sb);q.sb.from=table=>{
 if(!['efg_notifications','efg_weekly_reports'].includes(table))return original(table);
 const filters=[];let update=null;
 const query={select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},limit(){return this;},maybeSingle(){return this;},update(v){update=v;return this;},then(resolve){
 const source=table==='efg_notifications'?rows:[{id:'weekly-old',student_id:s.session.user.id,week_ending:'2026-11-06',report_text:'Informe anterior correcto · DEMO'},{id:'weekly-new',student_id:s.session.user.id,week_ending:'2026-11-13',report_text:'Informe más reciente · DEMO'}];
 const selected=source.filter(r=>filters.every(([k,v])=>r[k]===v));
 if(update){window.__NOTICE_WRITES__.push(filters);selected.forEach(r=>Object.assign(r,update));}
 return Promise.resolve({data:update?selected[0]?{id:selected[0].id}:null:selected,error:null}).then(resolve);
 }};return query;};
 await v.render();await q.inbox.refresh();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;
 },role);
 const inbox=page.locator('#efgInboxFull');await inbox.locator('[data-efg-id]').first().waitFor();
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-all.png'),fullPage:true});
 await inbox.locator('[data-efg-filter=unread]').click();assert.equal(await inbox.locator('[data-efg-id]').count(),2);
 await inbox.locator('[data-efg-filter=read]').click();assert.equal(await inbox.locator('[data-efg-id]').count(),1);
 await inbox.locator('[data-efg-filter=all]').click();
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 await page.evaluate(()=>window.__NCC_NOTIFICATION_QA__.setDirty(true));
 await inbox.locator('[data-efg-id]').first().click();await page.getByRole('alert').first().waitFor();
 assert.equal(await page.evaluate(()=>window.__NOTICE_WRITES__.length),0,'Draft blocks navigation before read receipt');
 await page.evaluate(()=>window.__NCC_NOTIFICATION_QA__.setDirty(false));
 await page.locator('#efgNotifications [data-efg-action=toggle]').click();
 if(role==='student'){
 await inbox.locator('[data-efg-id=report]').click();
 await page.locator('[data-notification-week="2026-11-06"][open]').waitFor();
 assert.match(await page.locator('[data-notification-week="2026-11-06"]').innerText(),/Informe anterior correcto/);
 }else{
 await inbox.locator('[data-efg-id=intake]').click();
 await page.locator('#coachStudentIntake').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>window.__NCC_R4_FULLAPP__.state.selectedStudent),'pupil');
 }
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-destination.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
 assert.ok(await page.evaluate(()=>window.__NOTICE_WRITES__.every(f=>f.some(([k,v])=>k==='recipient_id'&&v===window.__NCC_R4_FULLAPP__.state.session.user.id))));
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='notifications';await v.render();});
 await inbox.locator('[data-efg-id=message]').click();
 await page.locator('.efg-chat-layout.show-thread').waitFor({state:'visible'});
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='notifications';await v.render();});
 await page.locator('#efgNotifications [data-efg-action=toggle]').click();
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-bell.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 evidence.push({engine,width,role,filters:true,draftPreserved:true,exactDestination:true,scopedRead:true,noOverflow:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS notification inbox',evidence.length);
}finally{server.close();}
