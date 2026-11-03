// PRIVATE, NOT EXECUTED. Called only inside the attested existing bridge runner.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {q} from '../runner/snapshot.mjs';
import {yes,denied} from '../runner/local-context.mjs';
import {frame} from './fixtures.mjs';
import {projection} from './tests/bridge-http-contract.mjs';

export async function verifyHiddenTTL({page,context,sql,rpc,fixture,snapshot,open,out,width}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.equal(process.env.EFG_QA_CLINICAL_BRIDGE,'1');
 assert.equal(process.env.EFG_QA_CLINICAL_BRIDGE_MODE,'rpc-dom');
 // Caller has already authenticated this coach through the real SDK/Mailpit.
 const {coach,student}=fixture;const originalSnapshot=snapshot();
 const original=JSON.parse(sql(`select jsonb_build_object(
  'foods',(select jsonb_agg(jsonb_build_object('id',food_id,'expires',expires_at)) from efg_private.coach_reviewed_foods),
  'digest',(select catalog_digest from efg_private.guide_source_bindings where student_id=${q(student.id)}),
  'receipt',(select row_to_json(r) from efg_private.clinical_compatibility_receipts r where student_id=${q(student.id)}))`));
 assert.ok(original.receipt,'Existing receipt required, never create permissions or a new actor');
 const jwt=JSON.parse(Buffer.from(coach.token.split('.')[1],'base64url'));
 const claims=JSON.stringify({sub:coach.id,role:'authenticated',session_id:jwt.session_id});
 let other,saveCalls=0;const onRequest=r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/efg_save_clinical_bound_recipe'))saveCalls++;};
 page.on('request',onRequest);
 try{
  // Same expiry/binding fixture operations already used by the authorized SQL TTL test.
  sql(`begin;set local request.jwt.claims=${q(claims)};
   update efg_private.coach_reviewed_foods set expires_at=clock_timestamp()+interval '20 seconds';
   update efg_private.guide_source_bindings set catalog_digest=efg_private.guide_catalog_digest(food_ids) where student_id=${q(student.id)};
   select efg_private.clinical_bind_saved(${q(student.id)});commit;`);
  await open(page,student);
  const mount=page.locator('#coachAdaptedDraftMount');
  await mount.locator('[data-server-compatibility]').filter({hasText:'Decisión del servidor para esta receta y revisión.'}).waitFor();
  const save=mount.getByRole('button',{name:'Guardar borrador privado',exact:true});
  assert.equal(await save.isEnabled(),true,'A genuinely eligible decision must precede expiry');
  const row=yes(await rpc('efg_read_bound_guide',coach.token,{p_student:student.id}),'TTL fresh read');
  const deadline=Date.parse(row.compatibility.validUntil),remaining=deadline-Date.now();
  assert.ok(remaining>0&&remaining<25000,'Server deadline only, no fake browser clock');
  const before=snapshot(),initialCalls=saveCalls;
  other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
  const hidden=await page.evaluate(()=>document.visibilityState==='hidden');
  if(!hidden)return {status:'NOT_PROVEN_BACKGROUND',width,hidden,reason:'Chromium did not hide the original tab; no lifecycle override used'};
  await new Promise(r=>setTimeout(r,Math.max(0,deadline-Date.now())+150));
  await page.bringToFront();assert.equal(await page.evaluate(()=>document.visibilityState),'visible');
  await page.waitForFunction(()=>{
   const m=document.querySelector('#coachAdaptedDraftMount');
   const b=[...m.querySelectorAll('button')].find(n=>n.textContent==='Guardar borrador privado');
   return b?.disabled&&m.querySelector('[data-server-compatibility]')?.textContent.includes('pendiente')&&!m.querySelector('[data-compatibility="green"]');
  });
  assert.equal(await save.isEnabled(),false);
  await save.scrollIntoViewIfNeeded();const box=await save.boundingBox();assert.ok(box);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  assert.equal(saveCalls,initialCalls,'Expired UI must issue zero save requests');
  assert.deepEqual(snapshot(),before,'Background expiry must cause zero DB mutation');
  const rejection=await rpc('efg_save_clinical_bound_recipe',coach.token,{p_student:student.id,p_expected:frame(row),p_recipe:projection(row.guide),p_request_key:'expired-hidden-'+width});
  denied(rejection,'Expired server save',['PT409','42501']);
  assert.deepEqual(snapshot(),before,'Forced stale request must also make zero mutation');
  await mount.screenshot({path:join(out,`clinical-hidden-ttl-${width}.png`)});
  return {status:'PASS_REAL_HIDDEN_TTL',width,hidden,deadlineUTC:new Date(deadline).toISOString(),uiSaveRequests:saveCalls-initialCalls,mutations:0};
 }finally{
  page.off('request',onRequest);await other?.close();
  // Restore fixture values and receipt exactly; the runner still removes the stack.
  const r=original.receipt;
  sql(`begin;${original.foods.map(f=>`update efg_private.coach_reviewed_foods set expires_at=${q(f.expires)}::timestamptz where food_id=${q(f.id)};`).join('')}
   update efg_private.guide_source_bindings set catalog_digest=${q(original.digest)} where student_id=${q(student.id)};
   update efg_private.clinical_compatibility_receipts set coach_id=${q(r.coach_id)}::uuid,organization_id=${q(r.organization_id)}::uuid,draft_revision=${Number(r.draft_revision)},result=${q(JSON.stringify(r.result))}::jsonb,binding=${q(r.binding)},evaluated_at=${q(r.evaluated_at)}::timestamptz where student_id=${q(student.id)};commit;`);
  assert.deepEqual(snapshot(),originalSnapshot,'All fixture tables restored exactly after hidden TTL');
 }
}
