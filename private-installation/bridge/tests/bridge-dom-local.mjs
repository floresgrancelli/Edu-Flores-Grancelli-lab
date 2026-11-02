// NOT EXECUTED. Existing real shell/SDK/HTTP only. No profile, receipt or state injection.
import assert from 'node:assert/strict';
import {projection,matchesRequest,assertReply,assertReadback} from './bridge-http-contract.mjs';
const rpcName=request=>new URL(request.url()).pathname.split('/').at(-1);
function bodyOf(request){try{return request.postDataJSON();}catch{return null;}}
export async function verifyClinicalBridgeDOM({page,mealLabel,mealSlot,ingredientIndex=1,quantity,initialReadRow,expectedFrame,expectedRevision,openAfterReload,artifactPath}){
 assert.equal(typeof openAfterReload,'function','Actual UI navigation after reload required');
 const studentId=initialReadRow.student_id,expectedProjection=projection(initialReadRow.guide);
 assert.equal(initialReadRow.draft_revision,expectedFrame.draft);
 assert.equal(expectedRevision,expectedFrame.draft+1);
 const item=expectedProjection.meals.find(m=>m.slot===mealSlot)?.items[ingredientIndex-1];
 assert.ok(item);assert.ok(Number.isFinite(quantity)&&quantity>0);assert.notEqual(quantity,item.qty,'Must actually edit quantity');
 const oldQuantity=item.qty;item.qty=quantity;
 const seenKeys=new Set(),eligible=new Map(),replies=[];let phase=null;
 const onRequest=request=>{
  const name=rpcName(request),body=bodyOf(request);
  if(request.method()!=='POST'||!body)return;
  const expected={studentId,expectedFrame,expectedProjection,excludedKeys:seenKeys};
  if(phase&&name===phase&&matchesRequest(body,expected))eligible.set(request,{body,expected:{studentId,expectedFrame,expectedProjection}});
  if(typeof body.p_request_key==='string')seenKeys.add(body.p_request_key);
 };
 const onResponse=response=>{const name=rpcName(response.request());if(/^efg_(preview_clinical_bound_recipe|save_clinical_bound_recipe|read_bound_guide)$/.test(name))replies.push({name,status:response.status()});};
 page.on('request',onRequest);page.on('response',onResponse);
 const waitEdited=()=>page.waitForResponse(r=>eligible.has(r.request())&&rpcName(r.request())===phase);
 try{
  await page.locator('[data-server-compatibility]').filter({hasText:'Decisión del servidor para esta receta y revisión.'}).waitFor();
  // Editing itself requests a preview of the unchanged recipe. Await it explicitly;
  // it must never satisfy the subsequent edited-projection waiter.
  const initialExpected={studentId,expectedFrame,expectedProjection:projection(initialReadRow.guide)};
  const initialWaiting=page.waitForResponse(r=>rpcName(r.request())==='efg_preview_clinical_bound_recipe'&&matchesRequest(bodyOf(r.request()),initialExpected));
  await page.getByRole('button',{name:'Editar borrador',exact:true}).click();
  const initialResponse=await initialWaiting;assert.equal(initialResponse.status(),200);assertReply(bodyOf(initialResponse.request()),await initialResponse.json(),initialExpected);
  await page.locator('[data-server-compatibility]').filter({hasText:'Decisión del servidor para esta receta y revisión.'}).waitFor();
  const control=()=>page.getByLabel(`${mealLabel} cantidad ${ingredientIndex}`,{exact:true});
  assert.equal(Number(await control().inputValue()),oldQuantity);
  phase='efg_preview_clinical_bound_recipe';const previewWaiting=waitEdited();
  await control().fill(String(quantity));await control().press('Tab');
  const previewResponse=await previewWaiting,previewRequest=eligible.get(previewResponse.request());
  assert.equal(previewResponse.status(),200);assertReply(previewRequest.body,await previewResponse.json(),previewRequest.expected);
  phase=null;
  await page.getByRole('button',{name:'Conservar borrador editado',exact:true}).click();
  // The conserve action may preview again. It cannot satisfy the save waiter.
  phase='efg_save_clinical_bound_recipe';const saveWaiting=waitEdited();
  await page.locator('#coachAdaptedDraftMount').getByRole('button',{name:'Guardar borrador privado',exact:true}).click();
  const saveResponse=await saveWaiting,saveRequest=eligible.get(saveResponse.request());
  assert.equal(saveResponse.status(),200);const saved=await saveResponse.json();
  assertReply(saveRequest.body,saved,saveRequest.expected);assert.equal(saved.draft_revision,expectedRevision);
  phase=null;await page.locator(`[data-persisted-revision="${expectedRevision}"]`).waitFor();
  // Require a new request issued AFTER reload begins; an old in-flight read is excluded.
  const freshReads=new Set();const onFresh=request=>{if(request.method()==='POST'&&rpcName(request)==='efg_read_bound_guide'&&bodyOf(request)?.p_student===studentId)freshReads.add(request);};
  page.on('request',onFresh);
  try{
   const readWaiting=page.waitForResponse(r=>freshReads.has(r.request()));
   await page.reload();await openAfterReload(page);
   const readResponse=await readWaiting;assert.equal(readResponse.status(),200);
   assertReadback(await readResponse.json(),{studentId,expectedProjection,expectedRevision});
   await page.locator(`[data-persisted-revision="${expectedRevision}"]`).waitFor();
   await page.getByRole('button',{name:'Editar borrador',exact:true}).click();
   assert.equal(Number(await control().inputValue()),quantity,'Reloaded editor shows persisted quantity');
   assert.equal(await page.locator('[data-bound-publish]').count(),0);
   await page.screenshot({path:artifactPath,fullPage:true});
  }finally{page.off('request',onFresh);}
  return {status:'PASS_REAL_EDIT_SAVE_RELOAD',revision:expectedRevision,replies};
 }finally{page.off('request',onRequest);page.off('response',onResponse);}
}
// Caller supplies the advertised server deadline and a separate real tab. No
// browser clock or green/ready state is injected. Short TTL belongs to the
// separately authorized local SQL fixture, never production policy.
export async function verifyClinicalExpiryDOM({page,otherPage,deadlineUTC,artifactPath}){
 const deadline=Date.parse(deadlineUTC);
 assert.ok(Number.isFinite(deadline)&&deadline>Date.now()&&deadline-Date.now()<15000,'Require a bounded real fixture TTL');
 await page.locator('[data-compatibility="green"]').first().waitFor();
 await otherPage.bringToFront();
 const hidden=await page.evaluate(()=>document.visibilityState==='hidden');
 if(!hidden)throw Error('BACKGROUND_DOM_NOT_PROVEN: browser did not hide coach tab');
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,deadline-Date.now())+100));
 await page.bringToFront();
 await page.waitForFunction(()=>!document.querySelector('[data-compatibility="green"]')&&
  [...document.querySelectorAll('button')].some(b=>b.textContent==='Guardar borrador privado'&&b.disabled)&&
  document.querySelector('[data-server-compatibility]')?.textContent.includes('pendiente'));
 await page.screenshot({path:artifactPath,fullPage:true});
 return {status:'PASS_REAL_BACKGROUND_EXPIRATION',deadlineUTC};
}
