// Called by the existing real-SDK harness, after selector/cancel and before cleanup.
import assert from 'node:assert/strict';
import {join} from 'node:path';
const keys=['k','p','c','f','fi'];
export async function registrationCases(ctx){
 const {page,switchPage,users,width,h,r,item,open,openRecipes,login,settled,hold,out,request,restoreRows,withRevokedConsent,snapshot}=ctx;
 const endpoint='/rest/v1/efg_daily_logs',posts=[];
 const listener=req=>{if(req.method()==='POST'&&new URL(req.url()).pathname===endpoint)posts.push(req.postDataJSON());};page.on('request',listener);
 const read=async()=>{const reply=await request(endpoint+'?student_id=eq.'+users.studentA.id+'&select=*',{token:users.studentA.token});assert.ok(reply.ok);return reply.data;};
 const settledRow=async count=>{for(let i=0;i<80;i++){const rows=await read();if(rows.length===1&&Object.values(rows[0].meals).flat().length===count)return rows[0];await new Promise(r=>setTimeout(r,100));}throw Error('DIARY_READBACK_NOT_REACHED');};
 const register=async()=>{await open(page);await page.locator('#habitualChoice_desayuno').selectOption(h.id);await page.locator('[data-habitualapply="desayuno"]:visible').click();};
 const confirm=async()=>{await openRecipes(page);await page.locator('[data-act="registerPersonalRecipe"]:visible').first().click();await page.locator('#efgRecipeRegisterId').selectOption(r.id);await page.locator('#efgRecipeRegisterSlot').selectOption('almuerzo');await page.locator('#efgRecipeRegisterQty').fill('1.5');};
 let stage='initial';const stages=[];
 try{
  assert.deepEqual(await read(),[]);stage='first-habitual';
  const response=page.waitForResponse(x=>x.request().method()==='POST'&&new URL(x.url()).pathname===endpoint);
  await register();const saved=await response;assert.ok(saved.ok());assert.equal(posts.length,1);const payload=posts[0];assert.equal(payload.student_id,users.studentA.id);assert.deepEqual(payload.meals.desayuno,[item]);
  const first=await settledRow(1);for(const k of keys)assert.equal(first.totals[k],item[k]);await page.reload();await open(page);assert.deepEqual(await read(),[first]);stages.push(stage);
  stage='recipe-double-click';await confirm();const held=hold(page,'efg_daily_logs','POST');await page.route(held.pattern,held.handler);
  try{await page.locator('[data-act="confirmRecipeRegistration"]').dblclick();await held.entered;assert.equal(posts.length,2);held.release();await held.finish();}finally{held.release();await page.unroute(held.pattern,held.handler);}
  const second=await settledRow(2);assert.equal(second.meals.almuerzo.length,1);const recipeItem=second.meals.almuerzo[0];assert.equal(recipeItem.qty,1.5);
  for(const k of keys){const expected=Math.round(r.totals[k]/r.portions*1.5*100)/100;assert.equal(recipeItem[k],expected);assert.ok(Math.abs(second.totals[k]-(item[k]+expected))<1e-8);}
  await page.reload();await open(page);assert.deepEqual(await read(),[second]);await page.screenshot({path:join(out,`diary-written-${width}.png`),fullPage:true});stages.push(stage);
  stage='lost-response-reload';await restoreRows();await page.reload();await open(page);const lost=hold(page,'efg_daily_logs','POST',{lose:true});await page.route(lost.pattern,lost.handler);
  try{await register();await lost.entered;lost.release();await lost.finish();}finally{lost.release();await page.unroute(lost.pattern,lost.handler);}
  await page.reload();await open(page);const recovered=await settledRow(1);assert.deepEqual(recovered.meals.desayuno,[item]);stages.push(stage);
  // A second explicit habitual registration is a replacement, never an append.
  page.once('dialog',d=>d.accept());await register();assert.equal((await settledRow(1)).meals.desayuno.length,1);
  stage='late-save-A-B';await restoreRows();await page.reload();await open(page);const late=hold(page,'efg_daily_logs','POST');await page.route(late.pattern,late.handler);
  try{await register();await late.entered;await login(switchPage,users.studentB);await settled(page,users.studentB);late.release();await late.finish();assert.ok(!(await page.locator('body').innerText()).includes('TEST_ONLY banana'));}finally{late.release();await page.unroute(late.pattern,late.handler);}
  assert.equal((await read()).length,1);await login(switchPage,users.studentA);await settled(page,users.studentA);await restoreRows();await page.reload();await open(page);stages.push(stage);
  stage='late-save-logout';const logout=hold(page,'efg_daily_logs','POST');await page.route(logout.pattern,logout.handler);
  try{await register();await logout.entered;await switchPage.locator('[data-act="logout"]:visible').first().click();await page.locator('#loginEmail').waitFor();logout.release();await logout.finish();assert.ok(!(await page.locator('body').innerText()).includes('TEST_ONLY banana'));}finally{logout.release();await page.unroute(logout.pattern,logout.handler);}
  await login(page,users.studentA);await restoreRows();await page.reload();await open(page);stages.push(stage);
  stage='date-change';await restoreRows();await page.reload();await open(page);
  await page.locator('#habitualChoice_desayuno').selectOption(h.id);
  const requestsBefore=posts.length,future=new Date(Date.now()+86400000),futureDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(future);
  // Advance the real browser clock; no application-state/response injection.
  await page.clock.install({time:new Date()});await page.clock.setFixedTime(future);
  try{
   await page.locator('[data-habitualapply="desayuno"]:visible').click();await page.waitForTimeout(300);
   const sent=posts.slice(requestsBefore);assert.ok(sent.length<=1);for(const body of sent)assert.equal(body.log_day,futureDay,'Never submit the stale date');
   for(const row of await read())assert.equal(row.log_day,futureDay);
  }finally{await page.clock.setFixedTime(new Date());await restoreRows();await page.reload();await open(page);}stages.push(stage);
  stage='revoked-before-send';await withRevokedConsent(async()=>{
   // The application may correctly hide MI DÍA as soon as consent is
   // revoked. Do not force-click an unavailable button and mistake that
   // expected UI guard for a failed persistence test. Test the REAL signed
   // REST boundary directly while consent is denied.
   const before=await snapshot();
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const rejected=await request(endpoint+'?on_conflict=student_id,log_day&select=*',{
    method:'POST',token:users.studentA.token,
    prefer:'resolution=merge-duplicates,return=representation',
    body:{student_id:users.studentA.id,log_day:day,meals:{desayuno:[item]},
     sports:[],skipped:{},totals:Object.fromEntries(keys.map(k=>[k,item[k]]))}
   });
   assert.equal(rejected.status,403,'Revoked consent must deny signed diary writes');
   assert.deepEqual(await snapshot(),before,'Revoked consent must cause zero DB mutation');
  });stages.push(stage);
  // Re-establish an actual OTP/session after the revocation workflow; the
  // old UI may have legitimately gated the page before the server restore.
  await login(page,users.studentA);await open(page);
  const restoredView=await page.evaluate(()=>window.__SDK_ENTRY_QA__?.snapshot());
  assert.equal(restoredView?.userId,users.studentA.id,'Restored consent must rehydrate the correct actor');
  assert.equal(restoredView?.route,'ready','Restored consent must return to the ready diary route');
  assert.equal((await read()).length,0,'Revoked attempt may not create a diary record');
  await page.screenshot({path:join(out,`diary-revocation-${width}.png`),fullPage:true});
  return {status:'PASS',width,stages,transport:'real local SDK/HTTP/JWT',explicitRecipeRetryAfterLostResponse:'NOT_TESTED (not idempotent by request key)'};
 }catch(e){e.diaryRegistrationStage=stage;throw e;}finally{page.off('request',listener);await restoreRows();}
}
