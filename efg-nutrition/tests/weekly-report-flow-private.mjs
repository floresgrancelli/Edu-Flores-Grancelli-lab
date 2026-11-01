import assert from 'node:assert/strict';
import {join} from 'node:path';

// Runs ONLY inside the existing real-app Playwright fixture. No fake UI handlers.
export async function runWeeklyReportFlow(page,width,outDir){
 const screenshots=[];
 const capture=async name=>{const path=join(outDir,'weekly-flow-'+width+'-'+name+'.png');await page.screenshot({path,fullPage:true});screenshots.push(path);};
 page.on('dialog',dialog=>dialog.accept());
 try{
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state,w=v.weeklyReportWindow();
   s.selectedStudent='demo-student-a';s.tab='reports';s.consent={accepted:true};
   s.coachLogs=Array.from({length:5},(_,i)=>{
    const d=new Date(w.from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);
    return {log_day:d.toISOString().slice(0,10),meals:{desayuno:[{id:'synthetic-breakfast',name:'Desayuno ficticio',k:400,p:30,c:45,f:12,fi:4}],
     almuerzo:[{id:'synthetic-lunch',name:'Almuerzo ficticio',k:700,p:50,c:75,f:20,fi:7}]},skipped:{},sports:[]};
   });
   s.coachHistory=[{id:'synthetic-legacy',student_id:'demo-student-a',week_ending:'2026-01-02',report_text:'Informe histórico ficticio intacto'}];
   window.__WEEKLY_RAM__.db.efg_weekly_reports=structuredClone(s.coachHistory);
   s.coachGuidedDraft={syntheticSentinel:'preserve-unrelated-plan'};
   await v.render();
  });
  const section=page.locator('#coachReportWeek');
  await section.getByText('Conclusión propuesta · pendiente de revisión',{exact:true}).waitFor();
  assert.equal(await page.locator('#weeklyLuxuryPublishButton').isDisabled(),true);
  await page.locator('#weeklyCoachConclusion').fill('Conclusión editada por coach ficticio: revisamos cinco días, sin inventar los ausentes.');
  await page.locator('#weeklyCoachFlexibleNote').fill('Un espacio para disfrutar, acordado con tu coach ficticio.');
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.controls.writes.length),0);
  await section.locator('[data-act="previewLuxuryReport"]').click();
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
  await section.getByText('Conclusión revisada por tu coach',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__WEEKLY_RAM__.controls.writes.length),2); // failed + confirmed
  const resend=await page.evaluate(async()=>{try{await window.__EFG_VISUAL_QA__.publishWeeklyReport();return null;}catch(e){return e.message;}});
  assert.match(resend,/Ya existe/);
  assert.deepEqual(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.coachGuidedDraft),{syntheticSentinel:'preserve-unrelated-plan'});
  assert.equal(await page.evaluate(()=>window.__EFG_VISUAL_QA__.state.coachHistory.length),2);
  await capture('coach-published');
  // Student reads the actual serialized INSERT via the application's real loader.
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   s.session={user:{id:'demo-student-a',email:'student@example.invalid'}};
   s.profile={role:'student',user_id:'demo-student-a',nickname:'Alumno ficticio',active:true,organization_id:'demo-org'};
   s.tab='summaries';await v.loadMyWeeklyReports();await v.render();
  });
  const published=page.locator('details.pilot-record').filter({has:page.locator('.lux-report')});
  await published.locator('summary').click();
  await published.getByText('Fibra: sin dato consolidado en este informe. No se interpreta como cero.',{exact:true}).waitFor();
  assert.match(await published.locator('.lux-report-conclusion p').innerText(),/Conclusión editada/);
  const color=await published.locator('.lux-report-flex').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.ok(color.includes('223, 245, 255')&&color.includes('196, 234, 250'),'Espacio para disfrutar must remain celeste');
  const layout=await published.locator('.lux-report').evaluate(el=>({width:el.getBoundingClientRect().width,overflow:el.scrollWidth>el.clientWidth+2}));
  assert.ok(layout.width>250&&!layout.overflow,'Actual student report must be legible');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await capture('student-history');
  await page.emulateMedia({media:'print'});
  assert.equal(await published.locator('.lux-report-flex').isVisible(),true);
  await capture('student-print');
  await page.emulateMedia({media:'screen'});
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
  await page.locator('#efgMessagesContent').getByText('Respuesta ficticia: gracias, quiero revisar mi próxima semana.',{exact:true}).last().waitFor();
  await capture('coach-received');
  // A late successful INSERT for B must never replace A's current history/draft.
  await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   v.setConsentMap({'demo-student-a':true,'demo-student-b':true});
   s.selectedStudent='demo-student-b';s.consent={accepted:true};s.coachHistory=[];s.tab='reports';await v.render();
  });
  await page.locator('#coachReportWeek [data-act="previewLuxuryReport"]').click();
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
  return {role:'weekly-flow',width,pages:screenshots,errors:[],syntheticTransport:true,hostedRLS:false};
 }catch(error){await capture('failure').catch(()=>{});throw error;}
}
