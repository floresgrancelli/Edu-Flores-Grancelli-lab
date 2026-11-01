// Disposable LOCAL fixture only. Assertions exercise real HTTP/JWT; SQL is the fixture/oracle.
import assert from 'node:assert/strict';
import {literal as q} from './helpers/coach119-local.mjs';

export async function runBoundRecoveryNegatives({sql,request,rpc,users,orgs,official,intake,prep}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.equal(process.env.EFG_QA_GUIDE_RECOVERY,'1');
 assert.equal(process.env.EFG_QA_PERSISTED_GUIDE,'1');
 assert.notEqual(process.env.EFG_QA_PERSISTED_UI,'1');
 assert.equal(sql("select count(*) from efg_private.nut57_isolated_staging_marker where local_only"),'1');
 assert.equal(sql('select count(*) from auth.users'),'4');
 assert.equal(sql('select count(*) from efg_private.coach_release_switches where enabled'),'0');
 const editable=['public.efg_coach_relaunch_intakes','efg_private.efg_coach_health_intakes',
  'efg_private.efg_coach_health_revocations','public.efg_coach_plan_drafts','efg_private.guide_source_bindings'];
 const watched=[...editable,'public.efg_goals','public.efg_food_plans','public.efg_student_plan_access',
  'public.efg_notifications','public.efg_coach_plan_publish_receipts','efg_private.coach_reviewed_foods',
  'public.efg_consents','public.efg_pilot_participation_receipts'];
 const readTable=table=>JSON.parse(sql(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from ${table} t`));
 const snapshot=()=>Object.fromEntries(watched.map(t=>[t,readTable(t)]));
 const baseline=snapshot();
 const originalDraft=baseline['public.efg_coach_plan_drafts'].find(d=>d.student_id===users.studentA.id);
 assert.ok(originalDraft?.guide_proposal?.meals?.length===5,'Existing real signed guide save required');
 const recoveredRevision=originalDraft.draft_revision+1;
 const same=(a,b,label)=>assert.ok(JSON.stringify(a)===JSON.stringify(b),label); // Never print rows/tokens on failure.
 const ok=(r,label)=>{assert.ok(r.ok,`${label}: HTTP ${r.status}, code ${r.data?.code||'none'}`);return r.data;};
 const reject=(r,code,label)=>{assert.equal(r.ok,false,label);assert.equal(r.data?.code,code,label);
  assert.equal(r.status,code==='PT409'?409:403,label);};
 const reset=()=>{
  // Whole fixture is four invented users. No role/trigger/grant changes, no hosted data.
  const order=['efg_private.guide_source_bindings','public.efg_coach_plan_drafts',
   'efg_private.efg_coach_health_intakes','efg_private.efg_coach_health_revocations','public.efg_coach_relaunch_intakes'];
  sql('begin;'+order.map(t=>`delete from ${t};`).join('')+editable.map(t=>
   `insert into ${t} select * from jsonb_populate_recordset(null::${t},${q(JSON.stringify(baseline[t]))}::jsonb);`).join('')+'commit;');
  same(snapshot(),baseline,'Exact fictional baseline restoration');
 };
 const s=users.studentA,c=users.coachA;
 const payload=()=>({...prep('A'),p_intake_revision:2,p_expected_draft:null});
 const call=(body=payload(),actor=c)=>rpc('efg_prepare_bound_guide',actor?.token,body);
 const hidden=async()=>{
  const rows=ok(await request('/rest/v1/efg_coach_plan_drafts?student_id=eq.'+s.id,{token:c.token}),'stale RLS');
  assert.equal(rows.length,0,'No old revision or body exposed');
  reject(await rpc('efg_read_bound_guide',c.token,{p_student:s.id}),'PT409','stale RPC stays blocked');
 };
 const stale=async()=>{
  assert.equal(ok(await rpc('efg_submit_coach_relaunch_intake',s.token,{...intake,p_expected_revision:1,
   p_payload:{...intake.p_payload,notes:'LOCAL fictional changed schedule'}}),'new intake'),2);
  await hidden();
 };
 const unchangedReject=async(fn,code,label)=>{
  const before=snapshot();reject(await fn(),code,label);same(snapshot(),before,label+' must not mutate any watched table');
 };
 const cases=[],integrityLimitations=[];
 async function scenario(name,run){reset();try{await run();cases.push({name,status:'PASS'});}
  catch{cases.push({name,status:'FAIL'});}finally{reset();}}
 try{
  await scenario('current-null-and-second-null',async()=>{
   await unchangedReject(()=>call({...prep('A')}),'PT409','current binding null');
   await stale();const before=snapshot();
   const revision=ok(await call(),'explicit stale recovery');assert.equal(revision,recoveredRevision);
   const result=ok(await rpc('efg_read_bound_guide',c.token,{p_student:s.id}),'new bound readback');
   assert.equal(result.draft_revision,recoveredRevision);assert.equal(result.intake_revision,2);assert.equal(result.health_revision,2);
   assert.equal(result.guide,null);same(result.goal,official.goal,'Same targets');
   const after=snapshot();
   for(const t of watched.filter(t=>!['public.efg_coach_plan_drafts','efg_private.guide_source_bindings'].includes(t)))
    same(after[t],before[t],'Recovery only changes draft and binding: '+t);
   await unchangedReject(()=>call(),'PT409','second null must not overwrite current binding');
  });
  await scenario('two-concurrent-recoveries-one-winner',async()=>{
   await stale();const before=snapshot();
   const responses=await Promise.all([call(),call()]);
   assert.equal(responses.filter(r=>r.ok).length,1,'Exactly one concurrent recovery');
   assert.equal(ok(responses.find(r=>r.ok),'winner'),recoveredRevision);
   reject(responses.find(r=>!r.ok),'PT409','concurrent loser');
   const after=snapshot(),draft=after['public.efg_coach_plan_drafts'].find(d=>d.student_id===s.id),
    binding=after['efg_private.guide_source_bindings'].find(b=>b.student_id===s.id);
   assert.equal(draft.draft_revision,recoveredRevision);assert.equal(binding.draft_revision,recoveredRevision);
   assert.equal(draft.source_intake_revision,2);assert.equal(binding.intake_revision,2);assert.equal(draft.guide_proposal,null);
   for(const t of watched.filter(t=>!['public.efg_coach_plan_drafts','efg_private.guide_source_bindings'].includes(t)))
    same(after[t],before[t],'Concurrent rejection has no collateral mutation: '+t);
   for(const t of ['public.efg_coach_plan_drafts','efg_private.guide_source_bindings'])
    same(after[t].filter(r=>r.student_id!==s.id),before[t].filter(r=>r.student_id!==s.id),'Organization B unchanged');
   await unchangedReject(()=>call(),'PT409','no third mutation');
  });
  await scenario('published-is-not-recovery',async()=>{
   await stale();
   // State fixture, not a claim of publication: INSERT bypasses no trigger/grant.
   // The existing trigger is BEFORE UPDATE OF status; leave it installed and untouched.
   const row={...baseline['public.efg_coach_plan_drafts'].find(d=>d.student_id===s.id),status:'published'};
   sql(`begin;delete from public.efg_coach_plan_drafts where student_id=${q(s.id)};
    insert into public.efg_coach_plan_drafts select * from jsonb_populate_record(null::public.efg_coach_plan_drafts,${q(JSON.stringify(row))}::jsonb);commit;`);
   await hidden();await unchangedReject(()=>call(),'PT409','published blocked');
  });
  for(const kind of ['absent','revision','organization','coach'])await scenario('binding-'+kind,async()=>{
   await stale();
   sql(kind==='absent'?`delete from efg_private.guide_source_bindings where student_id=${q(s.id)}`:
    `update efg_private.guide_source_bindings set ${kind==='revision'?'draft_revision=draft_revision+1':kind==='organization'?`organization_id=${q(orgs.B)}`:`coach_id=${q(users.coachB.id)}`} where student_id=${q(s.id)}`);
   await unchangedReject(()=>call(),'PT409','invalid binding '+kind);
   if(kind==='absent'){
    reject(await rpc('efg_read_bound_guide',c.token,{p_student:s.id}),'PT409','missing binding RPC blocked');
    const rows=ok(await request('/rest/v1/efg_coach_plan_drafts?student_id=eq.'+s.id,{token:c.token}),'owner SELECT after administrative corruption');
    integrityLimitations.push({case:'administratively_deleted_binding',ownerSelectRows:rows.length,
     staleHidden:rows.length===0,classification:'LEGACY_INTEGRITY_LIMIT_NOT_NORMAL_RECOVERY_PASS'});
    assert.ok(rows.every(row=>row.student_id===s.id&&row.coach_id===c.id&&row.organization_id===orgs.A),'No foreign row');
   }else await hidden();
  });
  await scenario('foreign-coach-and-student',async()=>{
   await stale();await unchangedReject(()=>call(payload(),users.coachB),'42501','foreign coach');
   await unchangedReject(()=>call(payload(),users.studentA),'42501','student cannot prepare');
   await unchangedReject(()=>call({...payload(),p_student:users.studentB.id}),'42501','foreign organization student');
   await hidden();
  });
  await scenario('revocation-without-redeclaration',async()=>{
   await stale();assert.equal(ok(await rpc('efg_revoke_coach_health_intake',s.token,{p_expected_revision:2}),'revoke'),true);
   await hidden();await unchangedReject(()=>call(),'42501','revoked declaration');
   await unchangedReject(()=>call({...payload(),p_health_revision:3}),'42501','invented post-revocation revision');
  });
 }finally{reset();}
 console.log(JSON.stringify({status:cases.every(c=>c.status==='PASS')?'PASS_LOCAL_BOUND_RECOVERY_NEGATIVES':'FAIL_LOCAL_BOUND_RECOVERY_NEGATIVES',cases,baselineRestored:true,
  realHttpJwt:true,publishedFixtureOnly:true,hosted:false,integrityLimitations,
  outcome:cases.every(c=>c.status==='PASS')?'PASS':'FAIL'}));
 assert.ok(cases.every(c=>c.status==='PASS'),'Recovery negatives failed; see case names, no row data logged');
}
