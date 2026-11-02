import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export async function assertCoachGuideContainer(page){
 const metrics=await page.locator('#coachGuidedSlot .efg-guide-food-group').evaluateAll(nodes=>nodes.map(group=>{
  const rect=group.getBoundingClientRect();
  const visible=n=>!!n.getClientRects().length&&getComputedStyle(n).visibility==='visible'&&getComputedStyle(n).display!=='none';
  const texts=[...group.querySelectorAll('h4,.efg-guide-food-group-hint,.efg-guide-select-label,.efg-guide-food-name>span')].map(n=>{
   const r=n.getBoundingClientRect(),style=getComputedStyle(n),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;
   const direct=[...n.childNodes].filter(x=>x.nodeType===Node.TEXT_NODE).map(x=>x.textContent).join(' ').trim();
   const longest=Math.max(0,...direct.split(/\s+/).map(x=>ctx.measureText(x).width));
   return {text:direct,width:r.width,height:r.height,visible:visible(n),longest,natural:ctx.measureText(direct).width,clipped:n.scrollHeight>n.clientHeight+2};
  });
  const controls=[...group.querySelectorAll('select,input')].map(n=>{
   const r=n.getBoundingClientRect(),style=getComputedStyle(n),selected=n.tagName==='SELECT'?n.selectedOptions[0]?.textContent:null;
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;
   const textSpace=r.width-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0)-(selected?24:0);
   const longest=selected?Math.max(...selected.trim().split(/\s+/).map(t=>ctx.measureText(t).width)):0;
   return {width:r.width,height:r.height,visible:visible(n),inside:r.left>=rect.left&&r.right<=rect.right+1,selected,textSpace,longest};
  });
  return {width:rect.width,height:rect.height,overflow:group.scrollWidth>group.clientWidth+1,texts,controls};
 }));
 assert.ok(metrics.length>0,'Real food groups required');assert.ok(metrics.some(x=>x.controls.some(c=>c.selected)),'Real selected alternatives required');
 for(const row of metrics){
  assert.ok(row.width>=200,'NARROW_GROUP');assert.equal(row.overflow,false,'GROUP_OVERFLOW');
  for(const t of row.texts){assert.ok(t.visible&&t.height>=12,'TEXT_HIDDEN');assert.ok(t.width+1>=Math.min(160,t.natural)&&t.width+1>=t.longest,'FRAGMENTED_TEXT '+JSON.stringify(t));assert.equal(t.clipped,false,'TEXT_CLIPPED');}
  for(const c of row.controls){assert.ok(c.visible&&c.height>=28&&c.width>=120&&c.inside,'CONTROL_GEOMETRY');if(c.selected){assert.ok(c.selected.trim(),'SELECTED_TEXT_EMPTY');assert.ok(c.textSpace>=120&&c.textSpace>=c.longest,'SELECTED_TEXT_FRAGMENTED');}}
 }
 return metrics;
}
export async function runCoachGuideContainer(page,width,outDir){
 const css=readFileSync('efg-nutrition/pilot/guided-meal-picker.css','utf8');
 const marker='\n/* Coach nested cards: use available width, not the desktop viewport breakpoint. */';
 assert.equal(css.split(marker).length,2,'Exact isolated CSS delta required');
 assert.equal(createHash('sha256').update(css.split(marker)[0]).digest('hex'),'2807d4e0084369a1fd795596e03b172fdfdbfe779fedf7994b5fae90fff6c148','Negative control must retain the exact previous stylesheet');
 const result={role:'coach',width,pages:[],errors:[],oldCssRejected:false};
 try{
  const before=await page.evaluate(async()=>{
   const v=window.__EFG_VISUAL_QA__,s=v.state;
   s.selectedStudent='demo-student-a';s.tab='coachStudents';s.consent={accepted:true};
   const item=(id,qty)=>{const f=v.foods.find(x=>x.id===id);if(!f)throw Error('Missing real catalog ID '+id);return {...f,qty};};
   s.coachGoals=[{id:'layout-only-goal',kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28,start_on:'2026-10-01'}];
   s.coachGuidedDraft={version:1,kind:'five_meal_example',supplementNote:'',meals:[
    {slot:'desayuno',label:'Desayuno',items:[item('egg',110),item('bread',40)]},
    {slot:'media_manana',label:'Media mañana',items:[item('yogurt',200),item('apple',120)]},
    {slot:'almuerzo',label:'Almuerzo',items:[item('chicken',175),item('brownrice',185),item('oil',10)]},
    {slot:'merienda',label:'Merienda',items:[item('banana',150),item('yogurt',200)]},
    {slot:'cena',label:'Cena',items:[item('chicken',175),item('potato',120),item('oil',10)]}]};
   await v.render();document.querySelector('#coachStudentGoals').open=true;
   return JSON.stringify({plan:s.coachGuidedDraft,totals:v.guideTotals(s.coachGuidedDraft)});
  });
  await page.locator('#coachGuidedSlot select').first().waitFor({state:'visible'});
  const panel=page.locator('.coach-student-profile');
  result.panel=await panel.boundingBox();assert.ok(result.panel?.width>200);
  if(width===1280)assert.ok(result.panel.width<650,'Must reproduce the real narrow student-detail column');
  // Remove ONLY the six appended fix rules. All earlier production rules stay intact.
  const removed=await page.evaluate(()=>{
   const sheet=[...document.styleSheets].find(s=>s.href?.includes('/guided-meal-picker.css'));
   if(!sheet)throw Error('Missing actual guide stylesheet');
   const matches=[...sheet.cssRules].map((r,index)=>({index,text:r.cssText,selector:r.selectorText})).filter(r=>r.selector?.startsWith('.efg-role-coach .efg-guide-'));
   if(matches.length!==6)throw Error('Expected exact six isolated coach fix rules');
   for(const r of [...matches].reverse())sheet.deleteRule(r.index);
   return matches;
  });
  try{
   try{await assertCoachGuideContainer(page);}catch(e){result.oldCssRejected=true;result.oldCssReason=e.message;}
   await panel.screenshot({path:join(outDir,'coach-guide-container-old-'+width+'.png'),animations:'disabled'});
   result.pages.push('coach-guide-container-old-'+width+'.png');
   if(width===1280)assert.equal(result.oldCssRejected,true,'Regression must fail against old desktop CSS');
  }finally{
   await page.evaluate(rules=>{const sheet=[...document.styleSheets].find(s=>s.href?.includes('/guided-meal-picker.css'));for(const r of rules)sheet.insertRule(r.text,r.index);},removed);
  }
  result.metrics=await assertCoachGuideContainer(page);
  await panel.screenshot({path:join(outDir,'coach-guide-container-fixed-'+width+'.png'),animations:'disabled'});
  result.pages.push('coach-guide-container-fixed-'+width+'.png');
  assert.equal(await page.evaluate(()=>{const v=window.__EFG_VISUAL_QA__;return JSON.stringify({plan:v.state.coachGuidedDraft,totals:v.guideTotals(v.state.coachGuidedDraft)});}),before,'Layout cannot change identity, quantity or nutrients');
 }catch(error){result.errors.push(error.message);await page.screenshot({path:join(outDir,'coach-guide-container-failure-'+width+'.png'),fullPage:true}).catch(()=>{});}
 return result;
}
