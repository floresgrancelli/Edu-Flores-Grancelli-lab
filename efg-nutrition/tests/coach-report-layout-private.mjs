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
 const tab=page.locator('.coach-profile-tabs [data-coachsection="coachStudentGoals"]');
 await tab.click();
 assert.equal(await page.locator('#coachStudentGoals').evaluate(el=>el.open),true,'Objectives action must open its section');
}
