import assert from 'node:assert/strict';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';

// Runs ONLY inside the existing real-app Playwright fixture. No fake UI handlers.
export async function runWeeklyReportFlow(page,width,outDir){
 await import('./weekly-fiber-private.mjs'); // Run focal Node contract in the existing opt-in weekly job.
 const screenshots=[],pdfs=[],printMeasurements=[];
 const waitPdf=async()=>{await page.locator('.weekly-pdf-stage canvas').waitFor();await page.waitForFunction(()=>/^Página \d+ de \d+$/.test(document.querySelector('[data-weekly-counter]')?.textContent||''));};
 const reviewPdf=async()=>{await waitPdf();let numbers=(await page.locator('[data-weekly-counter]').innerText()).match(/\d+/g).map(Number);while(numbers[0]<numbers[1]){await page.locator('[data-weekly-next]').tap();const expected=numbers[0]+1;await page.waitForFunction(n=>document.querySelector('[data-weekly-counter]')?.textContent.startsWith('Página '+n+' de '),expected);numbers=(await page.locator('[data-weekly-counter]').innerText()).match(/\d+/g).map(Number);}await page.locator('#weeklyPdfReviewed').check();};
 const pdfBytes=async()=>Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector('[data-weekly-download]').href)).arrayBuffer()))));
 let coachPdf;
 const capture=async name=>{await page.locator('#pilot-toast').waitFor({state:'hidden',timeout:7000});const path=join(outDir,'weekly-flow-'+width+'-'+name+'.png');await page.screenshot({path,fullPage:true});screenshots.push(path);};
 page.on('dialog',dialog=>dialog.accept());
 try{
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state,w=v.weeklyReportWindow();
   s.selectedStudent='demo-student-a';s.tab='reports';s.consent={accepted:true};
   s.coachLogs=Array.from({length:5},(_,i)=>{
    const d=new Date(w.from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);
    return {log_day:d.toISOString().slice(0,10),meals:{desayuno:[{id:'synthetic-breakfast',name:'Desayuno ficticio',k:400,p:30,c:45,f:12,fi:i===0?0:4}],
     almuerzo:[{id:'synthetic-lunch',name:'Almuerzo ficticio',k:700,p:50,c:75,f:20,...(i===1||i===3?{}:{fi:i===0?0:7})}]},skipped:{},sports:[]};
   });
   const changed=new Date(w.from+'T12:00:00Z');changed.setUTCDate(changed.getUTCDate()+2);
   s.coachGoals=[{start_on:w.from,kcal:2000,protein_g:100,carb_g:220,fat_g:60,fiber_g:20},{start_on:changed.toISOString().slice(0,10),kcal:2000,protein_g:100,carb_g:220,fat_g:60,fiber_g:30}];
   s.coachReportGoals={studentId:s.selectedStudent,userId:s.session.user.id,orgId:s.org?.id,epoch:s.authContextEpoch||0,from:w.from,to:w.to,goals:structuredClone(s.coachGoals)};
   s.coachHistory=[{id:'synthetic-legacy',student_id:'demo-student-a',week_ending:'2026-01-02',report_text:'Informe histórico ficticio intacto'}];
   window.__WEEKLY_RAM__.db.efg_weekly_reports=structuredClone(s.coachHistory);
   s.coachGuidedDraft={syntheticSentinel:'preserve-unrelated-plan'};
   await v.render();
  });
  const section=page.locator('#coachReportWeek');
  await section.getByText('Mi devolución para vos',{exact:true}).waitFor();
  assert.equal(await page.locator('#weeklyLuxuryPublishButton').count(),0);
  await page.locator('#weeklyCoachConclusion').fill('Conclusión editada por coach ficticio: revisamos cinco días, sin inventar los ausentes.');
  await page.locator('#weeklyCoachFlexibleNote').fill('Un espacio para disfrutar, acordado con tu coach ficticio.');
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.controls.writes.length),0);
  await page.evaluate(()=>{document.getElementById('periodReportResult').dataset.returnSentinel='preserve-independent-period-draft';document.addEventListener('click',e=>{if(e.target.closest('[data-act="previewLuxuryReport"],[data-act="printPeriodLuxury"]'))window.__returnOriginY=scrollY;},true);});
  await section.locator('[data-act="previewLuxuryReport"]').tap();
  await reviewPdf();coachPdf=await pdfBytes();
  assert.equal(await page.locator('#weeklyLuxuryPublishButton').isEnabled(),true);
  const revoked=await page.evaluate(async()=>{
   const s=window.__EFG_VISUAL_QA__.state;s.consent={accepted:false};
   try{await window.__EFG_VISUAL_QA__.publishWeeklyReport();return null;}catch(e){return e.message;}finally{s.consent={accepted:true};}
  });
  assert.match(revoked,/sin autorización/);
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.controls.writes.length),0);
  // An INSERT error preserves the coach's exact draft and never invents history.
  const failed=await page.evaluate(async()=>{
   window.__WEEKLY_RAM__.controls.failInsert=true;
   try{await window.__EFG_VISUAL_QA__.publishWeeklyReport();return null;}catch(e){return e.message;}
  });
  assert.equal(failed,'SYNTHETIC_INSERT_FAILURE');
  assert.match(await page.locator('#weeklyCoachConclusion').inputValue(),/Conclusión editada/);
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.db.efg_weekly_reports.length),1);
  await capture('coach-preview');
  // A real second invocation while INSERT is pending must issue no second write.
  await page.evaluate(()=>{
   const c=window.__WEEKLY_RAM__.controls;c.holdInsert=true;c.failRead=true;
   window.__weeklyPending=window.__EFG_VISUAL_QA__.publishWeeklyReport();
  });
  await page.waitForFunction(()=>!!window.__WEEKLY_RAM__.controls.release);
  const duplicate=await page.evaluate(async()=>{try{await window.__EFG_VISUAL_QA__.publishWeeklyReport();return null;}catch(e){return e.message;}});
  assert.match(duplicate,/publicación anterior/);
  await page.evaluate(async()=>{window.__WEEKLY_RAM__.controls.release();await window.__weeklyPending;});
  await section.getByText('Informe de esta semana ya compartido · historial protegido',{exact:true}).waitFor();
  await section.getByText('Mi devolución para vos',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.controls.writes.length),2); // failed + confirmed
  const resend=await page.evaluate(async()=>{try{await window.__EFG_VISUAL_QA__.publishWeeklyReport();return null;}catch(e){return e.message;}});
  assert.match(resend,/Ya existe/);
  assert.deepEqual(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.coachGuidedDraft),{syntheticSentinel:'preserve-unrelated-plan'});
  assert.equal(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.coachHistory.length),2);
  assert.equal(await page.locator('.weekly-pdf-dialog').count(),0);
  assert.equal(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.tab),'reports');
  assert.equal(await page.locator('#periodReportResult').getAttribute('data-return-sentinel'),'preserve-independent-period-draft');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.act),'printLuxuryReport');
  assert.ok(await page.evaluate(()=>Math.abs(scrollY-Math.min(window.__returnOriginY,document.documentElement.scrollHeight-innerHeight))<=2));
  await capture('coach-published-return');
  // Student reads the actual serialized INSERT via the application's real loader.
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   s.session={user:{id:'demo-student-a',email:'student@example.invalid'}};
   s.profile={role:'student',user_id:'demo-student-a',nickname:'Alumno ficticio',active:true,organization_id:'demo-org'};
   s.coachPilotEntry=null;
   s.tab='summaries';await v.loadMyWeeklyReports();await v.render();
  });
  // Switching fixture identity alone is NOT proof of completed onboarding.
  // Keep the real application guard active and prove that it hides reports.
  await page.getByRole('heading',{name:'Tu ingreso necesita verificación',exact:true}).waitFor();
  assert.equal(await page.locator('details.pilot-record .lux-report').count(),0);
  assert.equal(await page.locator('.weekly-pdf-dialog').count(),0);
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.controls.writes.length),2);
  // Explicit post-onboarding fixture, matching premium-visual-smoke's student
  // setup. This is RAM test input, not a hosted authentication/eligibility claim.
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   s.coachPilotEntry={route:'ready',canLogMeals:true};
   s.planAccessSupported=true;s.planAccess={status:'published'};
   await v.render();
  });
  const published=page.locator('details.pilot-record').filter({has:page.locator('.lux-report')});
  await published.locator(':scope > summary').click();
  await published.locator('.lux-report-fiber-status').waitFor();
  const fiberText=await published.locator('.lux-report-fiber-status').innerText();
  assert.match(fiberText,/7,3 g de promedio en 3 de 7 días/);
  assert.match(fiberText,/3 fechas con dato y meta vigente: 7,3 g registrados \/ 26,7 g/);
  const storedFiber=await page.evaluate(()=>JSON.parse(window.__WEEKLY_RAM__.db.efg_weekly_reports.find(r=>r.id!=='synthetic-legacy').report_text));
  assert.equal(storedFiber.trendGoals.v,1);assert.equal(storedFiber.trendGoals.rows[0][1],2000);assert.equal(storedFiber.fiber.daysMeasured,3);assert.equal(storedFiber.days[0].fi,0);assert.equal(storedFiber.days[1].fi,null);
  const fiberLayout=await published.locator('.lux-report-fiber-status').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth+2}));
  assert.ok(fiberLayout.width>200&&fiberLayout.height>15&&!fiberLayout.overflow);
  assert.match(await published.locator('.lux-report-conclusion p').innerText(),/Conclusión editada/);
  const color=await published.locator('.lux-report-flex').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.ok(color.includes('223, 245, 255')&&color.includes('196, 234, 250'),'Espacio para disfrutar must remain celeste');
  const layout=await published.locator('.lux-report').evaluate(el=>({width:el.getBoundingClientRect().width,overflow:el.scrollWidth>el.clientWidth+2}));
  assert.ok(layout.width>250&&!layout.overflow,'Actual student report must be legible');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await capture('student-history');
  // Actual app DOM + original touch event: real PDF.js pixels, not print interception.
  await page.evaluate(()=>{window.__weeklyPrintCalls=0;window.print=()=>{window.__weeklyPrintCalls++;};});
  await published.locator('[data-act="printLuxuryReport"]').tap();await waitPdf();
  assert.equal(await page.evaluate(()=>window.__weeklyPrintCalls),0);
  assert.equal(await page.locator('#weeklyLuxuryPublishButton').count(),0,'History is read-only');
  const studentPdf=await pdfBytes();assert.deepEqual(studentPdf,coachPdf,'Student PDF bytes equal the exact PDF reviewed by coach');
  const layoutPdf=await page.locator('.weekly-pdf-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,bottom:r.bottom,topLayer:el.matches(':modal')};});
  assert.ok(layoutPdf.left>=0&&layoutPdf.right<=width+2&&layoutPdf.topLayer,'PDF dialog must sit over the real mobile navbar');printMeasurements.push(layoutPdf);
  await capture('student-pdf');
  const pdfPath=join(outDir,'weekly-flow-'+width+'-student-export.pdf');writeFileSync(pdfPath,studentPdf);pdfs.push(pdfPath);
  await page.locator('[data-weekly-close]').tap();
  await published.locator('[data-act="replyWeeklyReport"]').click();
  await page.locator('#efgMessageText').waitFor();
  assert.match(await page.locator('#efgMessageText').inputValue(),/informe de la semana/);
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.db.efg_messages.length),0,'Navigation must not send');
  await page.locator('#efgMessageText').fill('Respuesta ficticia: gracias, quiero revisar mi próxima semana.');
  await page.locator('#efgMessageForm').evaluate(form=>form.requestSubmit());
  await page.waitForFunction(()=>window.__WEEKLY_RAM__.db.efg_messages.length===1);
  const sent=await page.evaluate(()=>window.__WEEKLY_RAM__.db.efg_messages[0]);
  assert.equal(sent.student_id,'demo-student-a');assert.equal(sent.coach_id,'demo-coach');assert.equal(sent.sender_id,'demo-student-a');
  await capture('student-reply');
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.db.efg_weekly_reports.find(r=>r.id==='synthetic-legacy').report_text),'Informe histórico ficticio intacto');
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   s.session={user:{id:'demo-coach',email:'coach@example.invalid'}};
   s.profile={role:'coach',user_id:'demo-coach',nickname:'Coach ficticio',active:true,organization_id:'demo-org'};
   s.tab='messages';await v.render();v.messages.selectStudent('demo-student-a');
  });
  await page.locator('#efgMessagesContent .efg-message-bubble').filter({hasText:'Respuesta ficticia: gracias, quiero revisar mi próxima semana.'}).waitFor();
  await capture('coach-received');
  // A late successful INSERT for B must never replace A's current history/draft.
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   v.setConsentMap({'demo-student-a':true,'demo-student-b':true});
   s.selectedStudent='demo-student-b';s.consent={accepted:true};s.coachHistory=[];s.tab='reports';await v.render();
  });
  await page.locator('#coachReportWeek [data-act="previewLuxuryReport"]').tap();await reviewPdf();
  await page.evaluate(()=>{
   const v=window.__EFG_VISUAL_QA__,c=window.__WEEKLY_RAM__.controls;
   c.release=null;c.holdInsert=true;window.__weeklyPending=v.publishWeeklyReport();
  });
  await page.waitForFunction(()=>!!window.__WEEKLY_RAM__.controls.release);
  const late=await page.evaluate(async()=>{
   const s=window.__EFG_VISUAL_QA__.state;
   s.selectedStudent='demo-student-a';s.consent={accepted:false};s.coachHistory=[{sentinel:'A history must stay'}];
   window.__WEEKLY_RAM__.controls.release();await window.__weeklyPending;
   return s.coachHistory;
  });
  assert.deepEqual(late,[{sentinel:'A history must stay'}]);
  // Reported period gate: the real admin-test owner can choose dates in the real app DOM.
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   s.session={user:{id:'demo-admin',email:'admin@example.invalid'}};
   s.profile={user_id:'demo-admin',role:'admin',active:true,nickname:'Admin FICTICIO'};
   s.org={id:'demo-org',coach_id:'demo-admin',is_test:true,status:'trial',seat_limit:20};
   s.selectedStudent='demo-student-a';s.roster=s.roster.map(r=>({...r,organization_id:'demo-org',role:'student'}));
   s.consent={student_id:'demo-student-a',organization_id:'demo-org',accepted:true};s.coachHistory=[];s.tab='reports';
   const ram=window.__WEEKLY_RAM__;ram.db.efg_daily_logs=s.coachLogs.map(r=>({...r,student_id:'demo-student-a'}));ram.db.efg_goals=s.coachGoals.map((r,i)=>({...r,id:'synthetic-goal-'+i,student_id:'demo-student-a'}));
   await v.render();
  });
  await page.locator('#periodReportFrom').waitFor();
  const dates=await page.evaluate(()=>window.__EFG_VISUAL_QA__.weeklyReportWindow());
  await page.locator('#periodReportFrom').fill(dates.from);await page.locator('#periodReportTo').fill(dates.to);
  await page.locator('[data-act="generatePeriodReport"]').tap();await page.locator('#periodReportConclusion').waitFor();
  assert.equal(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.profile.role),'admin');
  await page.locator('[data-act="printPeriodLuxury"]').tap();await page.locator('[data-pdf-download]').waitFor({state:'visible'});
  assert.equal(await page.locator('#periodPublishButton').isDisabled(),true);
  await page.locator('.period-pdf-dialog canvas').waitFor();
  while(await page.locator('#periodReportReviewed').isDisabled()){const before=await page.locator('[data-weekly-counter]').textContent();await page.locator('[data-weekly-next]').tap();await page.waitForFunction(before=>document.querySelector('[data-weekly-counter]').textContent!==before,before);}
  await page.locator('#periodReportReviewed').check();await page.locator('#periodPublishButton').tap();
  await page.waitForFunction(()=>window.__WEEKLY_RAM__.db.efg_period_reports.length===1);
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.db.efg_period_reports[0].coach_id),'demo-admin');
  await page.locator('.period-pdf-dialog').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.tab),'reports');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.act),'printPeriodLuxury');
  assert.ok(await page.evaluate(()=>Math.abs(scrollY-Math.min(window.__returnOriginY,document.documentElement.scrollHeight-innerHeight))<=2));
  await page.locator('#periodPublishStatus').getByText('Informe compartido y confirmado en el historial del alumno.',{exact:true}).waitFor();
  await capture('admin-test-period-shared-return');
  return {role:'weekly-flow',width,pages:screenshots,pdfs,printMeasurements,errors:[],syntheticTransport:true,hostedRLS:false,physicalDevice:false,actualAppDom:true,periodAdminTestOwner:true};
 }catch(error){
  await capture('failure').catch(()=>{});
  const context=await page.evaluate(()=>{
   const s=window.__EFG_VISUAL_QA__?.state;
   return {userId:s?.session?.user?.id,role:s?.profile?.role,tab:s?.tab,entry:s?.coachPilotEntry,
    planAccess:s?.planAccess,epoch:s?.authContextEpoch,body:document.body?.innerText?.slice(0,2000)};
  }).catch(()=>null);
  writeFileSync(join(outDir,'weekly-flow-'+width+'-failure.json'),JSON.stringify({message:error.message,context},null,2));
  throw error;
 }
}

