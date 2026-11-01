import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {yes,denied,literal as q} from './helpers/coach119-local.mjs';
// Executed ONLY inside the already-authorized fresh-stack browser harness after a separate future opt-in.
export async function runBoundPublication({page,context,mount,width,side,users,orgs,token,request,rpc,sql,out,env,origin}){
 assert.equal(process.env.EFG_QA_BOUND_PUBLICATION,'1');assert.equal(process.env.GITHUB_ACTIONS,'true');
 const student=users['student'+side],coach=users['coach'+side],otherStudent=users['student'+(side==='A'?'B':'A')],otherCoach=users['coach'+(side==='A'?'B':'A')];
 const read=async(table,user,filter='student_id=eq.'+student.id)=>yes(await request('/rest/v1/'+table+'?'+filter,{token:user.token}),table+' signed read');
 const own=async()=>({goals:await read('efg_goals',student),guide:await read('efg_food_plans',student),
  access:yes(await rpc('efg_coach_pilot_entry_status',student.token),'entry'),
  notices:await read('efg_notifications',student,'recipient_id=eq.'+student.id)});
 const privateSnapshot=()=>sql(`select jsonb_build_object(
  'draft',(select to_jsonb(d) from public.efg_coach_plan_drafts d where student_id=${q(student.id)}),
  'bindings',(select to_jsonb(b) from efg_private.guide_source_bindings b where student_id=${q(student.id)}),
  'receipts',(select jsonb_agg(to_jsonb(r) order by request_id) from public.efg_coach_plan_publish_receipts r where student_id=${q(student.id)}),
  'history',(select jsonb_agg(to_jsonb(h) order by id) from efg_private.coach_guide_history h where student_id=${q(student.id)}));`);
 let body=null;const record=req=>{if(new URL(req.url()).pathname==='/rest/v1/rpc/efg_publish_coach_plan_draft_atomic')body=req.postDataJSON();};page.on('request',record);
 const accept=dialog=>dialog.accept();page.on('dialog',accept);
 try{
  assert.equal((await own()).access.can_log_meals,false);
  denied(await request('/rest/v1/efg_daily_logs',{method:'POST',token:student.token,body:{student_id:student.id,log_day:'2026-11-01',meals:{},totals:{}}}),'pending diary');
  await mount.locator('[data-bound-review]').check();
  await mount.locator('[data-bound-publish]').click(); // explicit review saved through bound RPC; gate remains OFF
  await mount.getByText('No se confirmó la publicación. Conservamos la misma solicitud para consultar o reintentar.',{exact:true}).waitFor();
  assert.ok(body);assert.equal(body.p_expected_revision,3);const requestId=body.p_request_id;
  const current=yes(await rpc('efg_read_bound_guide',token,{p_student:student.id}),'reviewed source');
  const ids=[...new Set(current.guide.meals.flatMap(m=>m.items.map(x=>x.id)))];assert.deepEqual(current.guide.approvedFoodIds,ids);
  assert.equal(current.draft_revision,3);assert.ok(!ids.includes('apple'));
  // Gate mutation is privileged test setup on a disposable local DB, never available through HTTP.
  sql(`update efg_private.bound_publication_local_gate set enabled=true where student_id=${q(student.id)};
   update efg_private.coach_release_switches set enabled=true where switch_key='pilot_coach_atomic_publication';`);
  denied(await rpc('efg_publish_coach_plan_draft_atomic',undefined,body),'anonymous publication');
  denied(await rpc('efg_publish_coach_plan_draft_atomic',otherCoach.token,body),'foreign coach');
  denied(await rpc('efg_publish_coach_plan_draft_atomic',token,{...body,p_expected_revision:2,p_request_id:randomUUID()}),'stale revision');
  yes(await rpc('efg_accept_pilot_participation',student.token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:false}),'revoke sharing');
  denied(await rpc('efg_publish_coach_plan_draft_atomic',token,body),'revoked sharing publication');
  yes(await rpc('efg_accept_pilot_participation',student.token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:true}),'restore explicit sharing');
  const digestBefore=sql(`select catalog_digest from efg_private.guide_source_bindings where student_id=${q(student.id)}`);
  sql(`update efg_private.guide_source_bindings set catalog_digest='tampered-local-test' where student_id=${q(student.id)}`);
  denied(await rpc('efg_publish_coach_plan_draft_atomic',token,body),'changed bound digest');
  sql(`update efg_private.guide_source_bindings set catalog_digest=${q(digestBefore)} where student_id=${q(student.id)}`);
  const before=await own(),privateBefore=privateSnapshot();
  sql(`update efg_private.bound_publication_local_gate set fail_final_write=true where student_id=${q(student.id)}`);
  const failed=await rpc('efg_publish_coach_plan_draft_atomic',token,body);denied(failed,'injected final write',['P0001']);
  assert.match(failed.data.message,/LOCAL_BOUND_FINAL_WRITE_FAILURE/);
  assert.deepEqual(await own(),before,'Signed learner reads must show atomic rollback');assert.equal(privateSnapshot(),privateBefore,'Private receipt/history/draft unchanged');
  assert.equal(sql('select count(*) from efg_private.coach119_atomic_transactions'),'0');
  sql(`update efg_private.bound_publication_local_gate set fail_final_write=false where student_id=${q(student.id)}`);
  await mount.locator('[data-bound-publish]').click();await mount.locator('[data-bound-published]').waitFor();
  const goalId=await mount.locator('[data-bound-published]').getAttribute('data-bound-published');assert.equal(body.p_request_id,requestId);
  assert.equal(yes(await rpc('efg_publish_coach_plan_draft_atomic',token,body),'idempotent same request'),goalId);
  const after=await own();assert.equal(after.goals.length,1);assert.equal(after.guide.length,1);assert.equal(after.goals[0].id,goalId);
  assert.deepEqual(after.guide[0].guided_plan,current.guide);assert.deepEqual(after.guide[0].approved_food_ids,ids);
  assert.equal(after.access.route,'ready');assert.equal(after.access.can_log_meals,true);
  assert.equal(after.notices.filter(n=>n.event_key==='coach_plan:'+goalId).length,1);
  assert.equal(after.notices.filter(n=>['plan_update','guide'].includes(n.kind)).length,1,'Exactly one publication notice');
  yes(await request('/rest/v1/efg_daily_logs',{method:'POST',token:student.token,body:{student_id:student.id,log_day:'2026-11-01',meals:{},totals:{}}}),'ready diary');
  for(const user of [otherStudent,otherCoach]){
   assert.deepEqual(await read('efg_goals',user),[]);assert.deepEqual(await read('efg_food_plans',user),[]);
  }
  denied(await request('/rest/v1/efg_daily_logs',{method:'POST',token:otherStudent.token,body:{student_id:student.id,log_day:'2026-11-02',meals:{},totals:{}}}),'foreign diary');
  await page.screenshot({path:join(out,`bound-published-coach-${width}.png`),fullPage:true});
  const learner=await context.newPage();try{
   await learner.goto(origin+'/efg-nutrition/pilot/',{waitUntil:'networkidle'});await learner.waitForFunction(()=>!!window.__PERSISTED_VIEW__);
   await learner.evaluate(async({token,key,student,org,goals,plan,access})=>{
    window.__PERSISTED_LOCAL__={url:'http://127.0.0.1:54321',token,key};const v=window.__PERSISTED_VIEW__,s=v.state;
    const user={id:student.id,email:student.email};v.setCoachSessionIdentity({user,access_token:token},user);
    s.profile={user_id:student.id,role:'student',active:true,organization_id:org,nickname:'Alumno ficticio'};s.org={id:org,name:'Prueba local'};
    s.goals=goals;s.foodPlan=plan;s.planAccess=access;s.coachPilotEntry=access;s.welcomePending=false;s.tab='home';
    s.diary={student_id:student.id,log_day:'2026-11-01',meals:{},sports:[],skipped:{},totals:{}};s.progressLogs=[];s.weights=[];s.activities=[];
    await v.render();
   },{token:student.token,key:env.ANON_KEY||env.PUBLISHABLE_KEY,student:{id:student.id,email:student.email},org:orgs[side],goals:after.goals,plan:after.guide[0],access:after.access});
   await learner.getByText('📋 Ver mi guía aprobada del coach',{exact:true}).click();
   await learner.getByText('Ver las cinco comidas de ejemplo',{exact:true}).click();
   await learner.locator('.efg-guide-student').waitFor({state:'visible'});
   assert.equal(await learner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await learner.screenshot({path:join(out,`bound-published-student-${width}.png`),fullPage:true});
  }finally{await learner.close();}
  yes(await rpc('efg_revoke_coach_health_intake',student.token,{p_expected_revision:2}),'revoke health source');
  denied(await rpc('efg_publish_coach_plan_draft_atomic',token,body),'revoked health blocks even receipt retry');
  return {publication:'PASS_LOCAL_ONLY',width,revision:3,idempotent:true,uniqueNotice:true,studentReady:true,rollback:true};
 }finally{
  page.off('request',record);page.off('dialog',accept);
  sql(`update efg_private.bound_publication_local_gate set enabled=false,fail_final_write=false where student_id=${q(student.id)};
   update efg_private.coach_release_switches set enabled=false where switch_key='pilot_coach_atomic_publication';`);
 }
}
