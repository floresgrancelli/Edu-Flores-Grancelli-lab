import assert from 'node:assert/strict';
export async function assertCompactProgress(page,screenshot){
 const panels=page.locator('[data-progresspanel]');
 assert.equal(await panels.count(),5);
 assert.equal(await page.locator('[data-progresspanel]:visible').count(),1);
 assert.equal(await page.locator('[data-progresspanel]:visible').getAttribute('data-progresspanel'),'summary');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.ncc-progress-tabs [aria-pressed=true]')).backgroundColor==='rgb(45, 56, 39)');
 assert.equal(await page.locator('.ncc-progress-tabs [aria-pressed=true]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(45, 56, 39)');
 const initial=await page.evaluate(()=>JSON.stringify([window.__EFG_VISUAL_QA__.state.weights,window.__EFG_VISUAL_QA__.state.activities]));
 await page.locator('[data-progresssection="weight"]').click();
 const oldWeight=await page.locator('#weightKg').inputValue();
 await page.locator('#weightKg').fill('79.2');
 await page.locator('[data-progresssection="activity"]').click();
 const oldSteps=await page.locator('#activitySteps').inputValue();
 await page.locator('#activitySteps').fill('4321');
 await page.locator('[data-progresssection="nutrition"]').focus();await page.keyboard.press('Enter');
 await page.locator('[data-progresspanel]:visible [data-progress-range="30"]').click();
 await page.locator('[data-progresssection="weight"]').click();assert.equal(await page.locator('#weightKg').inputValue(),'79.2');
 await page.locator('#weightKg').fill(oldWeight);
 await page.locator('[data-progresssection="activity"]').click();assert.equal(await page.locator('#activitySteps').inputValue(),'4321');
 await page.locator('#activitySteps').fill(oldSteps);
 await page.locator('[data-progresssection="nutrition"]').click();await page.locator('[data-progresspanel]:visible [data-progress-range="7"]').click();
 assert.equal(await page.locator('[data-progresspanel]:visible').count(),1);
 assert.equal(await page.evaluate(()=>JSON.stringify([window.__EFG_VISUAL_QA__.state.weights,window.__EFG_VISUAL_QA__.state.activities])),initial,'Changing sections must not save records');
 const length=await page.evaluate(()=>{const panels=[...document.querySelectorAll('[data-progresspanel]')],compact=document.documentElement.scrollHeight;panels.forEach(p=>p.hidden=false);const expanded=document.documentElement.scrollHeight;panels.forEach(p=>p.hidden=p.dataset.progresspanel!=='summary');return {compact,expanded};});
 assert.ok(length.compact<length.expanded*.8,'Summary must reduce the combined scroll by at least 20%: '+JSON.stringify(length));
 await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
}
export async function assertCompactCoach(page){
 assert.equal(await page.locator('.ncc-coach-next').isVisible(),true);
 await page.locator('#nccCoachHomeSections [data-workspace-tab=tools]').click();
 assert.equal(await page.locator('[data-workspace-panel=nccCoachHomeSections]:visible').count(),1);
 const layout=await page.locator('.efg-coach-tiles').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,height:el.getBoundingClientRect().height,buttons:[...el.querySelectorAll('button')].map(b=>({height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width,scroll:b.scrollWidth}))}));
 assert.equal(layout.columns,2);assert.ok(layout.height<550);
 assert.equal(layout.buttons.length,7);assert.ok(layout.buttons.every(b=>b.height>=44&&b.scroll<=b.width+1));
 await page.locator('#nccCoachHomeSections [data-workspace-tab=pending]').click();
 assert.equal(await page.locator('.ncc-coach-next').isVisible(),true);
 const states=await page.evaluate(async()=>{
  const v=window.__EFG_VISUAL_QA__,s=v.state;
  const keys=['coachIntakeVerified','coachIntakeForms','coachIntakeGoals','coachIntakeAccess'];
  const saved=Object.fromEntries(keys.map(k=>[k,s[k]]));
  const id='demo-student-a';
  s.coachIntakeForms={[id]:{shared_at:'2026-11-11'}};s.coachIntakeGoals={};s.coachIntakeAccess={};s.coachIntakeVerified=false;
  await v.render();const unknown=!!document.querySelector('.ncc-coach-next [data-tab="coachIntake"]');
  s.coachIntakeVerified=true;await v.render();const pending=document.querySelector('.ncc-coach-next [data-student]')?.dataset.student===id;
  s.coachIntakeGoals={[id]:true};await v.render();const existing=!!document.querySelector('.ncc-coach-next [data-tab="coachIntake"]');
  Object.assign(s,saved);await v.render();return {unknown,pending,existing};
 });
 assert.deepEqual(states,{unknown:true,pending:true,existing:true},'Coach priority must distinguish verified pending work from missing data or existing goals');

}
export async function assertDirectDay(page){
 const before=await page.evaluate(()=>JSON.stringify(window.__EFG_VISUAL_QA__.state.diary));
 assert.equal(await page.locator('.ncc-register-dock,[data-act="registerDayFood"]').count(),0,'Removed oversized/duplicate entry');
 const entrySlot=await page.locator('[data-daymeal][aria-pressed="true"]').getAttribute('data-daymeal');
 const dock=page.locator('[data-daymealpanel="'+entrySlot+'"] [data-setmeal]');
 await dock.scrollIntoViewIfNeeded();
 const rect=await dock.boundingBox();assert.ok(rect.height>=44,'Local add control remains touch accessible');
 await dock.click();
 assert.equal(await page.locator('.meal-popup').isVisible(),true);
 for(const source of ['recent','habitual','recipes']){
  await page.locator('[data-mealsource="'+source+'"]').click();
  assert.equal(await page.locator('[data-mealsource="'+source+'"]').getAttribute('aria-pressed'),'true');
 }
 await page.getByRole('button',{name:'Cerrar ventana de alimentos'}).click();
 assert.equal(await dock.evaluate(el=>el===document.activeElement),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__EFG_VISUAL_QA__.state.diary)),before,'Opening and canceling never records a food');
 // Existing schedule tabs now expose actual entries, including zero-calorie foods.
 const originalSlot=await page.locator('[data-daymeal][aria-pressed="true"]').getAttribute('data-daymeal');
 const originalComment=await page.locator('#dayComment').count()?await page.locator('#dayComment').inputValue():null;
 if(originalComment!==null){await page.locator('#dayComment').evaluate(el=>el.closest('details').open=true);await page.locator('#dayComment').fill('Comentario sin guardar');}
 const counts=await page.evaluate(()=>Object.fromEntries(Object.entries(window.__EFG_VISUAL_QA__.state.diary.meals).map(([slot,items])=>[slot,items.length])));
 for(const slot of ['desayuno','media_manana','almuerzo','media_tarde','merienda','cena']){
  const tab=page.locator('[data-daymeal="'+slot+'"]');await tab.click();
  assert.equal(await page.locator('[data-daymealpanel]:visible').count(),1);
  assert.equal(await page.locator('[data-daymealpanel]:visible').getAttribute('data-daymealpanel'),slot);
  if(counts[slot])assert.equal(await tab.locator('small').textContent(),counts[slot]+' alimento'+(counts[slot]===1?'':'s'));
 }
 await page.locator('[data-daymealpanel]:visible [data-setmeal]').click();await page.locator('#mealEntrySlot').selectOption('almuerzo');
 await page.getByRole('button',{name:'Cerrar ventana de alimentos'}).click();
 assert.equal(await page.locator('[data-daymealpanel]:visible').getAttribute('data-daymealpanel'),'almuerzo');
 assert.equal(await page.locator('[data-daymeal="almuerzo"]').evaluate(el=>el===document.activeElement),true,'Changing schedules restores focus to the visible schedule');
 // A trigger hidden by the new schedule must return focus to its visible tab.
 await page.locator('[data-daymealpanel="almuerzo"] [data-setmeal]').click();
 await page.locator('#mealEntrySlot').selectOption('cena');await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-daymeal="cena"]').evaluate(el=>el===document.activeElement),true);
 if(originalComment!==null){assert.equal(await page.locator('#dayComment').inputValue(),'Comentario sin guardar');await page.locator('#dayComment').fill(originalComment);}
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__EFG_VISUAL_QA__.state.diary)),before,'Schedule changes and cancel leave diary intact');
 await page.locator('[data-daymeal="desayuno"]').focus();await page.keyboard.press('End');assert.equal(await page.locator('[data-daymealpanel]:visible').getAttribute('data-daymealpanel'),'cena');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-daymealpanel]:visible').getAttribute('data-daymealpanel'),'desayuno');
 await page.locator('[data-daymeal="'+originalSlot+'"]').click();
 await page.evaluate(()=>scrollTo(0,0));
}
export async function assertRosterActions(page){
 const original=await page.evaluate(()=>{
  const s=window.__EFG_VISUAL_QA__.state;return Object.fromEntries(['coachIntakeVerified','coachIntakeForms','coachIntakeGoals','coachIntakeAccess','coachIntakeDraftVerified','coachIntakeDraftStatuses'].map(k=>[k,s[k]]));
 });
 const stage=async(values)=>{
  await page.evaluate(async values=>{Object.assign(window.__EFG_VISUAL_QA__.state,values);await window.__EFG_VISUAL_QA__.render();},values);
  return page.locator('[data-rostername]:has([data-student="demo-student-a"])').getAttribute('data-rosterstage');
 };
 assert.equal(await stage({coachIntakeVerified:false}),'unknown');
 await page.locator('[data-rosterfilter="pending"]').click();
 assert.equal(await page.locator('[data-rosterstage="unknown"]:visible').count(),0,'Unknown state is not a confirmed pending plan');
 assert.equal(await stage({coachIntakeVerified:true,coachIntakeGoals:{},coachIntakeForms:{'demo-student-a':{shared_at:'2026-11-11'}},coachIntakeAccess:{},coachIntakeDraftVerified:false}),'intake');
 await page.locator('[data-rosterfilter="intake"]').click();assert.equal(await page.locator('[data-rostername]:visible').count(),1);
 await page.locator('#coachRosterSearch').fill('no existe');assert.equal(await page.locator('[data-rostername]:visible').count(),0);
 await page.locator('#coachRosterSearch').fill('');assert.equal(await page.locator('[data-rostername]:visible').count(),1);
 assert.equal(await stage({coachIntakeForms:{}}),'plan','Optional form is not required to prepare a plan');
 assert.equal(await stage({coachIntakeAccess:{'demo-student-a':{status:'published'}}}),'follow');
 await page.evaluate(async()=>{
  const v=window.__EFG_VISUAL_QA__,s=v.state,id='demo-student-a';
  s.coachIntakeDraftVerified=true;
  s.coachIntakeForms={[id]:{student_id:id,organization_id:s.org.id,revision:1,shared_at:'2026-11-11'}};
  s.coachIntakeDraftStatuses={[id]:{student_id:id,organization_id:s.org.id,coach_id:s.session.user.id,status:'draft',draft_revision:1,source_intake_revision:1}};
  await v.render();
 });
 const draftRow=page.locator('[data-rostername]:has([data-student="demo-student-a"])');
 assert.equal(await draftRow.getAttribute('data-rosterstage'),'draft');
 assert.equal(await draftRow.locator('.ncc-roster-primary').textContent(),'Continuar plan');
 await page.locator('[data-rosterfilter="plan"]').click();
 assert.equal(await draftRow.isVisible(),true,'Published student with a current draft remains in pending plans');
 assert.equal(await page.locator('[data-rostername]').first().getAttribute('data-rosterstage'),'draft');
 await stage(original);await page.locator('[data-rosterfilter="all"]').click();
}
export async function assertCompactGuideEditor(page){
 const card=page.locator('#coachGuidedSlot [data-guidecard]:visible').first();
 const row=card.locator('.ncc-guide-food-compact').first();
 const input=row.locator('[data-guideqty]');const old=await input.inputValue();
 const before=await page.evaluate(()=>JSON.stringify(window.__EFG_VISUAL_QA__.state.coachGuidedDraft));
 assert.equal(await row.locator('details').getAttribute('open'),null);
 await row.locator('summary').click();await row.locator('summary').click();
 assert.equal(await input.inputValue(),old);assert.equal(await input.isVisible(),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__EFG_VISUAL_QA__.state.coachGuidedDraft)),before,'Disclosure changes do not change the plan');
 const sizes=await row.evaluate(el=>{const name=el.querySelector('.efg-guide-food-name').getBoundingClientRect(),qty=el.querySelector('input').getBoundingClientRect();return {name,qty};});
 assert.ok(sizes.qty.x>=sizes.name.right&&sizes.qty.height>=44,'Food and quantity share a row');
}
