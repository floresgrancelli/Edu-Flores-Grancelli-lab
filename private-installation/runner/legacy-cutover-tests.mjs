// Disposable existing runner hook. NOT executed in this private preparation.
import assert from 'node:assert/strict';
import {q,rowSnapshot} from './snapshot.mjs';
import {capturePermissions} from './acl-contract.mjs';
import {captureTriggers,verifyCutoverPermissions} from './cutover-acl-contract.mjs';
export async function verifyLegacyCutover({sql,request,rpc,users,goal,readCutover,record,onPermissions}){
 const tables=['public.efg_goals','public.efg_food_plans','public.efg_student_plan_access','public.efg_coach_plan_drafts','public.efg_coach_plan_publish_receipts','efg_private.coach_guide_history'];
 const before=rowSnapshot(sql,tables);
 const permissionsBefore=capturePermissions(sql),triggersBefore=captureTriggers(sql);
 const reads=sql("select jsonb_agg(jsonb_build_object('t',c.oid::regclass::text,'acl',has_table_privilege('authenticated',c.oid,'SELECT'),'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where p.schemaname=n.nspname and p.tablename=c.relname)) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('efg_goals','efg_food_plans','efg_student_plan_access','efg_coach_plan_drafts')");
 sql(readCutover());
 const finalAcl=verifyCutoverPermissions(sql,permissionsBefore,triggersBefore);
 onPermissions(finalAcl); // Preserve post-cutover evidence even if a later negative fails.
 assert.deepEqual(rowSnapshot(sql,tables),before,'Cutover must not change rows/history');
 const readsAfter=sql("select jsonb_agg(jsonb_build_object('t',c.oid::regclass::text,'acl',has_table_privilege('authenticated',c.oid,'SELECT'),'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where p.schemaname=n.nspname and p.tablename=c.relname)) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('efg_goals','efg_food_plans','efg_student_plan_access','efg_coach_plan_drafts')");
 assert.equal(readsAfter,reads,'Read grants and RLS policies preserved exactly');
 for(const role of ['anon','authenticated']) for(const table of tables.slice(0,4)){
  assert.equal(sql(`select has_table_privilege(${q(role)},${q(table)},'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')`),'f');
  assert.equal(sql(`select exists(select 1 from pg_attribute where attrelid=${q(table)}::regclass and attnum>0 and not attisdropped and (has_column_privilege(${q(role)},attrelid,attnum,'INSERT') or has_column_privilege(${q(role)},attrelid,attnum,'UPDATE')))`),'f');
 }
 for(const token of [undefined,users.studentA.token,users.coachA.token,users.coachB.token]){
  for(const [table,body] of [['efg_goals',{student_id:users.studentA.id,approved_by:users.coachA.id,...goal}],['efg_food_plans',{student_id:users.studentA.id,coach_id:users.coachA.id,approved_food_ids:[]}],['efg_student_plan_access',{student_id:users.studentA.id,status:'published'}]]){
   for(const method of ['POST','PATCH','DELETE']){
    const r=await request('/rest/v1/'+table+'?student_id=eq.'+users.studentA.id,{method,token,body:method==='DELETE'?undefined:body});
    assert.equal(r.ok,false);assert.equal(r.data?.code,'42501');
    assert.deepEqual(rowSnapshot(sql,tables),before,'Denied legacy DML has no mutation');
   }
  }
  const r=await rpc('efg_save_coach_plan_draft',token,{p_student:users.studentA.id,p_goal:goal,p_guide:null,p_intake_updated_at:null,p_intake_revision:1,p_expected_revision:null});
  assert.equal(r.ok,false);assert.equal(r.data?.code,'42501');
 }
 const legacy=await request('/rest/v1/efg_goals?student_id=eq.'+users.studentB.id,{token:users.studentB.token});
 assert.equal(legacy.ok,true);assert.equal(legacy.data.length,1,'Old student still reads existing goal');
 // Try to impersonate a definer write with only a client-settable GUC. The
 // administrative SQL is a fault injection; it does not grant this ability to JWTs.
 assert.equal(sql(`begin; set local request.jwt.claims=${q(JSON.stringify({sub:users.coachA.id,role:'authenticated'}))}; set local efg.coach_atomic_publish='on'; do $x$ begin begin insert into public.efg_goals(student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g) values(${q(users.studentA.id)},${q(users.coachA.id)},'maintenance',2100,190,240,45,32); raise exception 'Unexpected write'; exception when insufficient_privilege then null; end; end $x$; rollback;`),'');
 assert.deepEqual(rowSnapshot(sql,tables),before);
 // Administrative DELETE and real FK ON DELETE CASCADE must fail with the
 // guard's own 42501, not merely an unrelated FK error. Every attempt rolls back.
 const deleteTables=[...tables,'public.efg_profiles','public.efg_organizations','public.efg_consents','public.efg_coach_relaunch_intakes','public.efg_pilot_participation_receipts'];
 const deleteBefore=rowSnapshot(sql,deleteTables);
 for(const statement of [
  `delete from public.efg_goals where student_id=${q(users.studentB.id)}`,
  `delete from public.efg_profiles where user_id=${q(users.studentB.id)}`
 ]){
  sql(`begin; do $negative$ declare rejected boolean:=false; msg text; begin begin ${statement}; exception when insufficient_privilege then get stacked diagnostics msg=MESSAGE_TEXT; if msg<>'Published records require controlled retention operation' then raise; end if; rejected:=true; end; if not rejected then raise exception 'DELETE/cascade unexpectedly allowed'; end if; end $negative$; rollback;`);
  assert.deepEqual(rowSnapshot(sql,deleteTables),deleteBefore,'Administrative DELETE/cascade must preserve parent and dependent records');
 }
 record('administrative DELETE and profile cascade rejected by publication guard with no mutation');
 record('legacy cutover: no DML/RPC bypass; reads/history preserved; GUC cannot authorize');
 return finalAcl;
 // Existing downstream run MUST still execute normal bound prepare/save and
 // both COACH119 publications/history/idempotence. This hook alone is not PASS.
}
