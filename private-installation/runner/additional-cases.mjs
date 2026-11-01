import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {q,rowSnapshot} from './snapshot.mjs';
export async function negativePublicationCases({sql,rpc,coach,otherCoach,student,doc,text,digest,tables,noMutation}){
 const publication=()=>rpc('efg_publish_coach_plan_draft_atomic',coach.token,{p_student:student.id,p_expected_revision:2,p_request_id:randomUUID()});
 // Deliberate privileged fixture fault injection. These two cases do NOT claim
 // that browser clients can INSERT private markers or bypass draft DML grants.
 for(const variant of ['forged_guc','marker_other_actor']){
  const before=rowSnapshot(sql,tables);
  const marker=variant==='marker_other_actor'?`insert into efg_private.coach119_atomic_transactions(txid,coach_id,student_id,draft_revision) values(txid_current(),${q(otherCoach.id)},${q(student.id)},2);`:'';
  sql(`begin; select set_config('request.jwt.claims',${q(JSON.stringify({sub:coach.id,role:'authenticated'}))},true); set local efg.coach_atomic_publish='on'; ${marker}
   do $negative$ declare rejected boolean:=false; msg text; begin
    begin update public.efg_coach_plan_drafts set status='published' where student_id=${q(student.id)};
    exception when insufficient_privilege then get stacked diagnostics msg=message_text;
     if msg<>'Normal atomic publication required' then raise; end if; rejected:=true; end;
    if not rejected then raise exception 'Guard accepted ${variant}'; end if;
   end $negative$; rollback;`);
  assert.deepEqual(rowSnapshot(sql,tables),before,variant+' leaves no mutation');
 }
 // A new current document invalidates the earlier receipt for NEW publication.
 const prior=rowSnapshot(sql,tables),replacement=randomUUID();
 try{
  sql(`begin; update efg_private.efg_coach_health_documents set status='retired' where id=${q(doc)};
   insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at) values(${q(replacement)},'isolated_replacement_v1',${q(digest)},${q(text)},'published',now()); commit;`);
  await noMutation(publication,'current health document replaced',['42501']);
 }finally{
  sql(`begin; delete from efg_private.efg_coach_health_documents where id=${q(replacement)}; update efg_private.efg_coach_health_documents set status='published' where id=${q(doc)}; commit;`);
 }
 assert.deepEqual(rowSnapshot(sql,tables),prior,'document fault restored exactly');
 const food='oats_raw';const dates=JSON.parse(sql(`select jsonb_build_object('validated',automated_validated_at,'expires',expires_at) from efg_private.coach_reviewed_foods where food_id=${q(food)}`));
 const beforeExpiry=rowSnapshot(sql,tables);
 try{
  // Keep the row's CHECK valid, so the test reaches expiration logic rather than
  // failing at an unrelated constraint. No nutrient/source identity is changed.
  sql(`update efg_private.coach_reviewed_foods set automated_validated_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where food_id=${q(food)}`);
  assert.equal(sql(`select efg_private.coach_food_evidence_current(f) from efg_private.coach_reviewed_foods f where food_id=${q(food)}`),'f');
  await noMutation(publication,'expired official composition',['PT409','42501']);
 }finally{sql(`update efg_private.coach_reviewed_foods set automated_validated_at=${q(dates.validated)}::timestamptz,expires_at=${q(dates.expires)}::timestamptz where food_id=${q(food)}`);}
 assert.deepEqual(rowSnapshot(sql,tables),beforeExpiry,'expiry fault restored exactly');
 return ['forged GUC blocked','foreign private marker blocked (administrative fault injection)','replaced document blocked via JWT','expired source blocked via JWT'];
}
export async function secondPublicationCase({sql,rpc,request,yes,coach,student,prep,provider,guide,firstReceipt,firstGoal,tables}){
 const oldPlan=yes(await request('/rest/v1/efg_food_plans?student_id=eq.'+student.id,{token:student.token}),'first published guide')[0];
 assert.equal(yes(await rpc('efg_prepare_bound_guide',coach.token,{...prep,p_expected_draft:2}),'explicit next draft'),3);
 await provider.load();assert.equal((await provider.save(guide)).row.draft_revision,4);
 const requestId=randomUUID(),args={p_student:student.id,p_expected_revision:4,p_request_id:requestId};
 const secondGoal=yes(await rpc('efg_publish_coach_plan_draft_atomic',coach.token,args),'second explicit publication');assert.notEqual(secondGoal,firstGoal);
 const rows=JSON.parse(sql(`select jsonb_agg(to_jsonb(h)) from efg_private.coach_guide_history h where student_id=${q(student.id)}`));
 assert.equal(rows.length,1);assert.equal(rows[0].guided_goal_id,firstGoal);assert.deepEqual(rows[0].guided_plan,oldPlan.guided_plan);assert.deepEqual(rows[0].approved_food_ids,oldPlan.approved_food_ids);
 assert.deepEqual(JSON.parse(sql(`select to_jsonb(r) from public.efg_coach_plan_publish_receipts r where request_id=${q(firstReceipt.request_id)}`)),firstReceipt,'first immutable receipt retained');
 assert.equal(sql(`select count(*) from public.efg_coach_plan_publish_receipts where student_id=${q(student.id)}`),'2');
 assert.equal(sql(`select count(*) from public.efg_notifications where recipient_id=${q(student.id)} and event_key like 'coach_plan:%'`),'2');
 const current=yes(await request('/rest/v1/efg_food_plans?student_id=eq.'+student.id,{token:student.token}),'second student read')[0];assert.equal(current.guided_goal_id,secondGoal);
 assert.equal(yes(await request('/rest/v1/efg_goals?student_id=eq.'+student.id,{token:student.token}),'student goal history').length,2);
 const beforeRetry=rowSnapshot(sql,tables);assert.equal(yes(await rpc('efg_publish_coach_plan_draft_atomic',coach.token,args),'second retry'),secondGoal);assert.deepEqual(rowSnapshot(sql,tables),beforeRetry);
 // Prepare an otherwise valid third draft so revocation tests aren't satisfied
 // merely by status=published or an already obsolete expected revision.
 assert.equal(yes(await rpc('efg_prepare_bound_guide',coach.token,{...prep,p_expected_draft:4}),'third review draft'),5);
 await provider.load();assert.equal((await provider.save(guide)).row.draft_revision,6);
 return {nextRevision:6,secondGoal};
}
