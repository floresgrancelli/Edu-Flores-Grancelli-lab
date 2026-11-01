import assert from 'node:assert/strict';
import {join} from 'node:path';
export async function runOfficialCoachFlow(page,width,outDir,collectedErrors){
 const errorStart=collectedErrors.length,pages=[];
 try{
 await page.evaluate(async()=>{
  const v=window.__EFG_VISUAL_QA__,s=v.state;
  s.roster.forEach(p=>p.organization_id='demo-org');s.selectedStudent='demo-student-a';
  s.consent={accepted:true,student_id:'demo-student-a',organization_id:'demo-org'};
  s.tab='coachStudents';await v.render();
 });
 await page.locator('#coachStudentGoals > summary').click();
 const mount=page.locator('#coachAdaptedDraftMount'),open=page.locator('[data-act="openCoachAdaptedPreview"]');
 const before=await page.evaluate(()=>JSON.stringify([window.__EFG_VISUAL_QA__.state.coachGuidedDraft,window.__EFG_VISUAL_QA__.state.coachFoodPlan]));
 await open.click();
 await mount.getByText('Borrador pendiente de aprobación del coach.',{exact:true}).waitFor();
 const initial=await mount.locator('[data-guide-totals]').textContent();
 await mount.getByRole('button',{name:'Editar borrador',exact:true}).click();
 const qty=mount.locator('[data-edit-row="desayuno:0"] input');
 await qty.fill(String(Number(await qty.inputValue())+1));await qty.press('Tab');
 assert.notEqual(await mount.locator('[data-guide-totals]').textContent(),initial);
 await mount.getByRole('button',{name:'Conservar borrador editado'}).click();
 assert.equal(await mount.locator('[data-draft-origin="edited_draft"]').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const screenshot=join(outDir,`coach-official-connected-${width}.png`);
 await page.screenshot({path:screenshot,fullPage:true});pages.push({name:"official-connected-editor",screenshot});
 await mount.getByRole('button',{name:'Editar borrador',exact:true}).click();
 await mount.getByRole('button',{name:'Cancelar edición'}).click();
 await page.evaluate(()=>window.__EFG_OFFICIAL_PROVIDER__.revoke());
 assert.equal(await mount.locator('button').count(),0,'Revocation removes current draft');
 await page.evaluate(()=>window.__EFG_OFFICIAL_PROVIDER__.reset());
 await open.click();await mount.getByText('Borrador pendiente de aprobación del coach.',{exact:true}).waitFor();
 await mount.getByRole('button',{name:'Cerrar vista de prueba'}).click();
 await page.evaluate(()=>window.__EFG_OFFICIAL_PROVIDER__.setCeliac(true));
 await open.click();await page.getByText('Faltan opciones compatibles: revisá la propuesta con el coach.',{exact:true}).waitFor();assert.equal(await mount.locator('[data-guide-totals]').count(),0,'Unknown gluten evidence cannot generate clinical guide');
 await page.evaluate(()=>{const p=window.__EFG_OFFICIAL_PROVIDER__;p.reset();p.hold();});
 await open.click();
 await page.waitForFunction(()=>window.__EFG_OFFICIAL_PROVIDER__.hasPending());
 const after=await page.evaluate(()=>JSON.stringify([window.__EFG_VISUAL_QA__.state.coachGuidedDraft,window.__EFG_VISUAL_QA__.state.coachFoodPlan]));
 assert.equal(after,before,'Preview never writes publication state');
 await page.evaluate(()=>{
  const button=document.querySelector('[data-student="demo-student-b"]');
  if(!button)throw Error('Missing real student-switch control');
  button.click(); // Actual delegated UI handler calls loadStudentDetail; no scope assignment.
 });
 await page.waitForFunction(()=>window.__EFG_VISUAL_QA__.state.selectedStudent==='demo-student-b');
 await page.evaluate(()=>{const p=window.__EFG_OFFICIAL_PROVIDER__;p.changeStudent();p.release();});
 await page.getByText('Cambió el alumno, la ficha o el permiso durante la lectura.',{exact:true}).waitFor();
 assert.equal(await page.locator('#coachAdaptedDraftMount [data-guide-totals]').count(),0,'Late response must not populate another student');
 return {role:'coach',width,pages,errors:collectedErrors.slice(errorStart),officialPrivateConnection:'PASS',clinicalUnknown:'rejected',publishable:false};
 }catch(error){
  await page.screenshot({path:join(outDir,`coach-official-connected-failure-${width}.png`),fullPage:true}).catch(()=>{});
  throw error;
 }
}
