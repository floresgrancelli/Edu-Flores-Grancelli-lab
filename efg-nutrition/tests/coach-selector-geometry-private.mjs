import assert from 'node:assert/strict';
import {join} from 'node:path';
// Geometry observation, not an assumption that native horizontal truncation is a defect.
export async function observeCoachSelectors(page,width,outDir){
 const mount=page.locator('#coachAdaptedDraftMount');
 const rows=await mount.locator('[data-edit-row]').evaluateAll(nodes=>nodes.map(row=>{
  const select=row.querySelector('select'),input=row.querySelector('input'),style=getComputedStyle(select),r=select.getBoundingClientRect();
  const text=select.selectedOptions[0]?.textContent||'';
  const contentWidth=select.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-20;
  const probe=document.createElement('div');Object.assign(probe.style,{position:'fixed',left:'-10000px',top:'0',width:contentWidth+'px',font:style.font,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap,wordBreak:style.wordBreak});probe.textContent=text;document.body.append(probe);
  const projectedTextHeight=probe.getBoundingClientRect().height;probe.style.whiteSpace='nowrap';const singleLineHeight=probe.getBoundingClientRect().height;probe.remove();
  return {row:row.dataset.editRow,text,quantity:input.value,unit:row.querySelector('span')?.textContent,width:r.width,height:r.height,clientHeight:select.clientHeight,scrollHeight:select.scrollHeight,contentHeight:select.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),whiteSpace:style.whiteSpace,lineHeight:style.lineHeight,projectedTextHeight,singleLineHeight,verticalWrapRisk:style.whiteSpace!=='nowrap'&&projectedTextHeight>select.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)+1};
 }));
 assert.ok(rows.length>=5);assert.ok(rows.every(r=>r.width>100&&r.height>0&&Number.isFinite(Number(r.quantity))&&r.text.length));
 const panel=join(outDir,`coach-official-connected-selectors-${width}.png`);await mount.screenshot({path:panel});
 const samples=[];
 for(const [label,needle] of [['chicken','Chicken'],['rice','Rice']]){
  const index=rows.findIndex(r=>r.text.includes(needle));assert.ok(index>=0,'Official selected food must be visible: '+needle);
  const path=join(outDir,`coach-official-connected-selector-${label}-${width}.png`);await mount.locator('[data-edit-row]').nth(index).screenshot({path});samples.push(path);
 }
 return {rows,panel,samples,classification:'Measured wrapping risk; inspect native control pixels before claiming clipping. Horizontal ellipsis alone is not a vertical failure.'};
}

export async function assertCoachSelectors(page,width,outDir){
 const result=await observeCoachSelectors(page,width,outDir);
 for(const row of result.rows){assert.equal(row.whiteSpace,'nowrap');assert.ok(row.contentHeight+1>=row.singleLineHeight,'Native selected line fits vertically');}
 const names=await page.locator('#coachAdaptedDraftMount [data-edit-row]').evaluateAll(rows=>rows.map(row=>{
  const select=row.querySelector('select'),p=row.querySelector('[data-selected-food-name]');if(!p)return null;
  const range=document.createRange();range.selectNodeContents(p);const text=range.getBoundingClientRect(),box=p.getBoundingClientRect(),r=row.getBoundingClientRect();
  return {matches:p.textContent===select.selectedOptions[0].textContent,described:select.getAttribute('aria-describedby')===p.id,contains:text.top>=box.top-1&&text.bottom<=box.bottom+1&&text.left>=box.left-1&&text.right<=box.right+1&&box.right<=r.right+1,height:box.height};
 }));
 assert.ok(names.every(n=>n&&n.matches&&n.described&&n.contains&&n.height>0),'Complete selected names visible without clipping');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 return {...result,selectedNameGeometry:names};
}
