import assert from 'node:assert/strict';
export async function assertCoachReportLayout(page){
 const geometry=await page.locator('.coach-student-profile').evaluate(profile=>{
  const header=profile.querySelector('.efg-progress-header'),title=header.querySelector('h2');
  const nav=profile.querySelector('.coach-profile-tabs'),tab=nav.querySelector('[data-coachsection="coachStudentGoals"]');
  const h=header.getBoundingClientRect(),t=title.getBoundingClientRect(),n=nav.getBoundingClientRect(),b=tab.getBoundingClientRect();
  // Check a complete word's fragments, not merely document overflow.
  const node=title.firstChild,word='nutricional',start=node.textContent.toLowerCase().indexOf(word);
  if(start<0)throw Error('Expected coach report title');
  const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+word.length);
  return {header:h.width,title:t.width,wordFragments:range.getClientRects().length,
   tabInside:b.left>=n.left-1&&b.right<=n.right+1&&b.top>=n.top-1&&b.bottom<=n.bottom+1};
 });
 assert.ok(geometry.title>=Math.min(240,geometry.header)-2,'Report title compressed inside its card');
 assert.equal(geometry.wordFragments,1,'A report title word split vertically');
 assert.equal(geometry.tabInside,true,'Objectives tab clipped within navigation');
 const fragmentation=await page.locator('.coach-student-profile').evaluate(profile=>{
  const selectors='.efg-progress-panel h3,.efg-consistency-head strong,.efg-meal-legend span,.efg-meal-legend b';
  const nodes=[...profile.querySelectorAll(selectors)];let checked=0;const broken=[];
  for(const el of nodes){
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const node=walker.currentNode;
    for(const match of node.textContent.matchAll(/[\p{L}\p{N}%]+/gu)){
     if(match[0].length<3)continue;checked++;
     const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
     if(range.getClientRects().length!==1)broken.push(match[0]);
    }
   }
  }
  return {checked,broken,percentage:!!profile.querySelector('.efg-consistency-head strong'),
   legend:profile.querySelectorAll('.efg-meal-legend>div').length};
 });
 assert.ok(fragmentation.checked>=10,'Expected real chart titles and legend text');
 assert.equal(fragmentation.percentage,true);assert.ok(fragmentation.legend>0);
 assert.deepEqual(fragmentation.broken,[],'Chart title, percentage or meal legend fragmented inside words');
 const tab=page.locator('.coach-profile-tabs [data-coachsection="coachStudentGoals"]');
 await tab.click();
 assert.equal(await page.locator('#coachStudentGoals').evaluate(el=>el.open),true,'Objectives action must open its section');
}
