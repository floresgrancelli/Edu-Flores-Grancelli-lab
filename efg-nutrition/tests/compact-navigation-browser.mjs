import assert from 'node:assert/strict';
export async function assertCompactProgress(page,screenshot){
 const panels=page.locator('[data-progresspanel]');
 assert.equal(await panels.count(),3);
 assert.equal(await page.locator('[data-progresspanel]:visible').count(),1);
 assert.equal(await page.locator('[data-progresspanel]:visible').getAttribute('data-progresspanel'),'summary');
 const initial=await page.evaluate(()=>JSON.stringify([window.__EFG_VISUAL_QA__.state.weights,window.__EFG_VISUAL_QA__.state.activities]));
 await page.locator('[data-progresssection="weight"]').click();
 const oldWeight=await page.locator('#weightKg').inputValue();
 await page.locator('#weightKg').fill('79.2');
 await page.locator('[data-progresssection="activity"]').click();
 const oldSteps=await page.locator('#activitySteps').inputValue();
 await page.locator('#activitySteps').fill('4321');
 await page.locator('[data-progresssection="summary"]').focus();await page.keyboard.press('Enter');
 await page.locator('[data-progress-range="30"]').click();
 await page.locator('[data-progresssection="weight"]').click();assert.equal(await page.locator('#weightKg').inputValue(),'79.2');
 await page.locator('#weightKg').fill(oldWeight);
 await page.locator('[data-progresssection="activity"]').click();assert.equal(await page.locator('#activitySteps').inputValue(),'4321');
 await page.locator('#activitySteps').fill(oldSteps);
 await page.locator('[data-progresssection="summary"]').click();await page.locator('[data-progress-range="7"]').click();
 assert.equal(await page.locator('[data-progresspanel]:visible').count(),1);
 assert.equal(await page.evaluate(()=>JSON.stringify([window.__EFG_VISUAL_QA__.state.weights,window.__EFG_VISUAL_QA__.state.activities])),initial,'Changing sections must not save records');
 const length=await page.evaluate(()=>{const panels=[...document.querySelectorAll('[data-progresspanel]')],compact=document.documentElement.scrollHeight;panels.forEach(p=>p.hidden=false);const expanded=document.documentElement.scrollHeight;panels.forEach(p=>p.hidden=p.dataset.progresspanel!=='summary');return {compact,expanded};});
 assert.ok(length.compact<length.expanded*.8,'Summary must reduce the combined scroll by at least 20%: '+JSON.stringify(length));
 await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
}
export async function assertCompactCoach(page){
 assert.equal(await page.locator('.ncc-coach-next').isVisible(),true);
 const layout=await page.locator('.efg-coach-tiles').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,height:el.getBoundingClientRect().height,buttons:[...el.querySelectorAll('button')].map(b=>({height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width,scroll:b.scrollWidth}))}));
 assert.equal(layout.columns,2);assert.ok(layout.height<550);
 assert.equal(layout.buttons.length,7);assert.ok(layout.buttons.every(b=>b.height>=44&&b.scroll<=b.width+1));
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
