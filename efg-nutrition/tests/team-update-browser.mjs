// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview='/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/team-update');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
// This colour review uses the published arrangement, not the independent staged
// dual-workspace experiment enabled by the generic fixture builder. Source flags
// stay untouched; only the isolated copy is brought back to its published OFF.
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/workspace-tabs-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/workspace-tabs-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/workspace-tabs-sdk.mjs'));
writeFileSync(pilot,readFileSync(pilot,'utf8')+'\nglobalThis.__NCC_WORKSPACE_HOOKS__={messages,versionNotice,sb,setConsent(values){Object.assign(coachRosterConsent,values);}};\n');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');

const evidence=[],contrastFindings=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [390,320,1280]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width<700,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 const snap=async name=>{
 await page.waitForTimeout(120);
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'});for(const e of document.querySelectorAll('#app,.pilot-layout,.pilot-main'))e.scrollTo({top:0,left:0,behavior:'instant'});});
 if(name==='coach-intake'){await page.locator('.coach-profile-tabs').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.evaluate(()=>window.scrollBy({top:-80,behavior:'instant'}));}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' overflow');
 const tabFit=await page.locator('.ncc-workspace-tabs button:visible').evaluateAll(els=>els.every(e=>e.scrollWidth<=e.clientWidth+1));assert.equal(tabFit,true,name+' complete tab labels');
 const palette=await page.evaluate(()=>{
  const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const buttons=[...document.querySelectorAll('#app button')].filter(e=>e.getClientRects().length&&!e.disabled&&getComputedStyle(e).visibility!=='hidden');
  const bad=buttons.flatMap(e=>{const s=getComputedStyle(e),bg=rgb(s.backgroundColor),fg=rgb(s.color);if(bg.length<3||(bg[3]??1)<.99)return [];const a=lum(bg),b=lum(fg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return ratio<4.5?[{text:e.textContent.slice(0,45),classes:e.className,bg:s.backgroundColor,fg:s.color,ratio}]:[];});
  return {body:getComputedStyle(document.body).backgroundColor,summary:document.querySelector('.ncc-focus-summary')?getComputedStyle(document.querySelector('.ncc-focus-summary')).backgroundColor:null,bad,macros:[...document.querySelectorAll('.ncc-focus-macro')].map(e=>({key:e.dataset.nccMacro,label:getComputedStyle(e.querySelector('strong')).color,bar:getComputedStyle(e.querySelector('.ncc-focus-meter>span')).backgroundColor}))};
 });
 const lightIssues=await page.evaluate(()=>{
 const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 const issues=[];
 for(const el of document.querySelectorAll('#app *')){
  if(!el.getClientRects().length||!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())||el.closest('svg,script,style,.lux-report'))continue;
  let at=el,bg;
  while(at){const st=getComputedStyle(at);if(st.backgroundImage!=='none'){const stops=[...st.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(x=>rgb(x[0]));if(stops.length&&stops.every(c=>(c[3]??1)>.95&&lum(c)>.5)){bg=stops[0];break;}if(/url\(/.test(st.backgroundImage))break;}
   const c=rgb(st.backgroundColor);if(c.length>=3&&(c[3]??1)>.95){bg=c;break;}at=at.parentElement;}
  if(!bg||lum(bg)<.5)continue;const st=getComputedStyle(el),ink=rgb(st.color),ratio=(lum(bg)+.05)/(lum(ink)+.05);
  if(ratio<4.5)issues.push({tag:el.tagName,cls:el.className,text:el.textContent.trim().slice(0,70),bg,ink,ratio});
 }return issues;
 });
 contrastFindings.push(...lightIssues.map(x=>({...x,engine,width,screen:name})));
 writeFileSync(resolve(out,'light-contrast.json'),JSON.stringify(contrastFindings,null,2));
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+name+'.png')});
 assert.equal(await page.locator('[data-ncc-dual-panel]').count(),0,'No independent staged candidate in published-layout review');
 assert.equal(palette.body,'rgb(13, 20, 18)',name+' canvas');assert.deepEqual(palette.bad,[],name+' button contrast');
 const icons=await page.locator('.ncc-meal-icon').evaluateAll(els=>els.map(e=>({slot:e.dataset.mealIcon,hidden:e.getAttribute('aria-hidden'),ink:getComputedStyle(e.querySelector('[data-icon-part=body],[data-icon-part=detail]')).stroke,fill:e.querySelector('[data-icon-part=body]')?getComputedStyle(e.querySelector('[data-icon-part=body]')).fill:'none'})));
 const iconColours={desayuno:['rgb(234, 208, 163)','rgb(177, 132, 85)'],media_manana:['rgb(241, 168, 153)','rgb(213, 111, 98)'],almuerzo:['rgb(163, 208, 194)','rgb(63, 131, 122)'],media_tarde:['rgb(239, 201, 151)','rgb(186, 134, 80)'],merienda:['rgb(240, 210, 156)','rgb(196, 147, 86)'],cena:['rgb(167, 191, 215)','none']};
 for(const icon of icons){assert.equal(icon.hidden,'true','Labels remain the accessible names');assert.deepEqual([icon.ink,icon.fill],iconColours[icon.slot],name+' coloured meal pictogram '+icon.slot);}

 const colors={p:'rgb(140, 185, 208)',c:'rgb(211, 174, 117)',f:'rgb(182, 164, 206)'};
 if(palette.summary)assert.equal(palette.summary,'rgba(0, 0, 0, 0)',name+' transparent summary matches approved reference');
 for(const m of palette.macros){assert.equal(m.label,colors[m.key],name+' macro label');assert.equal(m.bar,colors[m.key],name+' macro fill');}
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+name+'.png')});
 };
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='planner';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;});
 await page.locator('#nccGuideSections [data-workspace-tab=notes]').click();assert.equal(await page.locator('#nccGuideSections-notes').isVisible(),true);
 await page.locator('#nccGuideSections [data-workspace-tab=balance]').click();
 await page.locator('#nccGuideSections [data-workspace-tab=meals]').click();await page.locator('[data-studentguideslot=almuerzo]').click();
 await page.locator('[data-studentguideregister=almuerzo]').click();await page.locator('[data-guideentryqty="0"]').fill('125');await page.keyboard.press('Escape');
 await page.locator('#nccGuideSections [data-workspace-tab=notes]').click();await page.locator('#nccGuideSections [data-workspace-tab=meals]').click();
 await page.locator('[data-studentguideregister=almuerzo]').click();assert.equal(await page.locator('[data-guideentryqty="0"]').inputValue(),'125');await page.keyboard.press('Escape');
 await page.evaluate(()=>window.scrollTo(0,0));await snap('guide');
 for(const tab of ['home','weight','recipes','nutritionScience','studentMore','supplements','reports','privacy']){
 await page.evaluate(async tab=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab=tab;await v.render();},tab);await snap('student-'+tab);
 }
 // Student's actual versioned form and handlers. No submit/network writes.
 await page.evaluate(async()=>{const {renderCoachRelaunchEntry}=await import('/efg-nutrition/pilot/coach-relaunch-entry-client.js');document.querySelector('.pilot-main').innerHTML=renderCoachRelaunchEntry({route:'intake'},{guided:true});});
 await page.locator('#coachRelaunch_age_years').fill('41');await page.locator('.ncc-intake-steps [data-intakestep="1"]').click();await page.locator('#coachRelaunch_preferred_foods').fill('Arroz, pollo y verduras');
 await page.locator('.ncc-intake-steps [data-intakestep="0"]').click();assert.equal(await page.locator('#coachRelaunch_age_years').inputValue(),'41');
 assert.equal(await page.locator('[data-intakepanel]:visible').count(),1);await page.evaluate(()=>window.scrollTo(0,0));await snap('student-intake');
 // Coach's actual home, scoped received form and message center.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('mentor');const s=v.state;s.roster=[{user_id:'pupil-a',nickname:'Ana · ejemplo',active:true},{user_id:'pupil-b',nickname:'Bruno · ejemplo',active:true}];window.__NCC_WORKSPACE_HOOKS__.setConsent({'pupil-a':true,'pupil-b':true});s.coachIntakeVerified=true;s.coachIntakeForms={'pupil-a':{student_id:'pupil-a',shared_at:'2026-11-12T10:00:00Z',objective:'fat_loss',age_years:31,height_cm:168,weight_kg:70,activity_level:'moderate',dietary_pattern:'standard',preferred_foods:'Arroz, pollo y verduras',meal_routine:'Desayuno 7 · Almuerzo 13 · Cena 21'}};s.coachIntakeGoals={};s.coachIntakeAccess={};s.tab='coach';await v.render();});
 assert.equal(await page.locator('[data-workspace-panel=nccCoachHomeSections]:visible').count(),1);await page.evaluate(()=>window.scrollTo(0,0));await snap('coach-home');
 await page.locator('#nccCoachHomeSections [data-workspace-tab=students]').click();assert.equal(await page.locator('#nccCoachHomeStudents').isVisible(),true);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='coachStudents';v.state.selectedStudent='pupil-a';v.state.consent={accepted:true};await v.render();});
 await page.locator('[data-coachsection=coachStudentIntake]').click();
 await page.locator('.coach-intake-shared').scrollIntoViewIfNeeded();await page.evaluate(()=>{document.querySelector('.coach-profile-tabs').scrollIntoView({block:'start'});window.scrollBy(0,-80);});await snap('coach-intake');
 await page.locator('#nccReceivedIntakeSections [data-workspace-tab=food]').click();assert.match(await page.locator('#nccReceivedIntakeSections-food').innerText(),/Arroz/);
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab='messages';await v.render();});await page.locator('[data-chat-contact="pupil-a"]').waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));await snap('messages');
 await page.locator('[data-chat-contact="pupil-a"]').click();await page.locator('#efgMessageText').fill('Quería revisar las alternativas.');
 if(width<700)await page.locator('[data-chat-back]').click();await page.locator('[data-chat-filter=drafts]').click();assert.equal(await page.locator('.efg-chat-contact').count(),1);
 await page.locator('[data-chat-contact="pupil-a"]').click();assert.equal(await page.locator('#efgMessageText').inputValue(),'Quería revisar las alternativas.');
 assert.equal(await page.evaluate(()=>window.__NCC_WORKSPACE_FIXTURE__.writes.length),0);await snap('conversation');
 for(const tab of ['coach','coachStudents','coachIntake','reports','payments','coachTools']){
 await page.evaluate(async tab=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab=tab;await v.render();},tab);await snap('coach-'+tab);
 }
 // Admin: every mutation remains explicit; files and fields stay mounted.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('admin');v.state.tab='adminManage';v.state.platformAlias='EJEMPLO.ALIAS';await v.render();});
 await page.evaluate(()=>window.scrollTo(0,0));await snap('admin');
 await page.locator('#nccAdminSections [data-workspace-tab=new]').click();await page.locator('#newCoachName').fill('Borrador sin enviar');
 await page.locator('#nccAdminSections [data-workspace-tab=settings]').click();await page.locator('#platformAlias').fill('CAMBIO.SIN.GUARDAR');
 await page.locator('#nccAdminSections [data-workspace-tab=payments]').click();assert.equal(await page.locator('#nccAdminPayments').isVisible(),true);
 await page.locator('#nccAdminSections [data-workspace-tab=new]').click();assert.equal(await page.locator('#newCoachName').inputValue(),'Borrador sin enviar');
 await page.locator('#nccAdminSections [data-workspace-tab=settings]').click();assert.equal(await page.locator('#platformAlias').inputValue(),'CAMBIO.SIN.GUARDAR');
 assert.equal(await page.locator('[data-workspace-panel=nccAdminSections]:visible').count(),1);for(const tab of ['admin','adminMore','adminManage','payments']){await page.evaluate(async tab=>{const v=window.__NCC_R4_FULLAPP__;v.state.tab=tab;await v.render();},tab);if(tab==='adminManage')await page.locator('#nccAdminSections [data-workspace-tab=coaches]').click();await snap('admin-'+tab);}

 // Exact roster action order, inactive pupil, cancel and confirmed mocked unlink.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('mentor');v.state.roster=[{user_id:'pupil-a',nickname:'Ana · ejemplo',active:false}];v.state.tab='coachStudents';v.state.selectedStudent=null;await v.render();});
 await page.locator('.ncc-roster-options summary').click();
 assert.deepEqual(await page.locator('.ncc-roster-options button').allTextContents(),['Nombre preferido','Reactivar','Eliminar']);
 await page.locator('.ncc-roster-options').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,engine+'-'+width+'-eliminar.png')});
 let calls=0;await page.exposeFunction('__unlinkCall',()=>{calls++});
 await page.evaluate(()=>{const h=window.__NCC_WORKSPACE_HOOKS__,old=h.sb.rpc;h.sb.rpc=async(name,args)=>{if(name==='efg_remove_student_from_team_v1'){await window.__unlinkCall();window.__unlinkArgs=args;return {data:null,error:{message:'Error de prueba: sin cambios'}};}return old(name,args);};});
 page.once('dialog',d=>d.dismiss());await page.locator('[data-removestudent]').click();assert.equal(calls,0);
 page.once('dialog',d=>{assert.match(d.message(),/Ana.*equipo/);return d.accept();});await page.locator('[data-removestudent]').click();
 await page.waitForFunction(()=>!!window.__unlinkArgs);assert.equal(calls,1);assert.equal(await page.locator('[data-removestudent]').count(),1,'Failure preserves the student card');
 // Global notice and update sheet preserve the mounted form. Reload only by explicit click.
 await page.evaluate(async()=>{const v=window.__NCC_R4_FULLAPP__;await v.fixture.loginAs('admin');v.state.tab='adminManage';await v.render();});
 await page.locator('#nccAdminSections [data-workspace-tab=new]').click();await page.locator('#newCoachName').fill('Borrador conservado');
 const fresh=(await page.locator('html').evaluate(e=>e.outerHTML)).replace(/(<meta name="efg-build" content=")[^"]+/, '$1new-qa-version');
 await page.route('**/pilot/index.html?efg_version_check=*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html>'+fresh}));
 await page.evaluate(()=>window.__NCC_WORKSPACE_HOOKS__.versionNotice.check({force:true}));
 assert.equal(await page.locator('#efgVersionNotice').isVisible(),true);
 await page.screenshot({path:resolve(out,engine+'-'+width+'-nube.png')});
 await page.getByRole('button',{name:'Ver actualización',exact:true}).click();
 assert.equal(await page.locator('#nccVersionDialog').isVisible(),true);assert.equal(await page.locator('#newCoachName').inputValue(),'Borrador conservado');
 await page.screenshot({path:resolve(out,engine+'-'+width+'-actualizar.png')});
 page.once('dialog',d=>d.dismiss());await page.locator('#nccVersionDialog [data-act=applyAppVersion]').click();assert.equal(new URL(page.url()).searchParams.has('ncc_updated'),false);
 await page.evaluate(()=>localStorage.setItem('qa-saved-record','preserved'));
 page.once('dialog',d=>d.accept());await page.locator('#nccVersionDialog [data-act=applyAppVersion]').click();
 await page.waitForURL(/ncc_updated=/);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-saved-record')),'preserved');
 assert.deepEqual(errors,[]);evidence.push({engine,width,passed:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({evidence,contrastIssues:contrastFindings.length}));
}finally{server.close();}
