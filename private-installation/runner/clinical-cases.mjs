// Authorized disposable runner only. No clinical food/import claim; no hosted calls.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {q,rowSnapshot} from './snapshot.mjs';
import {yes,denied} from './local-context.mjs';
import {capturePermissions} from './acl-contract.mjs';
import {publicationVsWithdrawal} from '../clinical/tests/publication-withdrawal-local.mjs';
import {compareActualSqlCases} from '../clinical/tests/common-parity-private.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=p=>readFileSync(new URL('../clinical/'+p,import.meta.url),'utf8');
const claims=u=>JSON.stringify({sub:u.id,role:'authenticated',session_id:JSON.parse(Buffer.from(u.token.split('.')[1],'base64url')).session_id});
const setActor=u=>`set local request.jwt.claims=${q(claims(u))};`;

async function expireWhileWaiting({sql,rpc,fixture,snapshot,record}){
 const {coach,student,revision}=fixture;
 const stored=JSON.parse(sql(`select jsonb_build_object('foods',(select jsonb_agg(jsonb_build_object('id',f.food_id,'expires',f.expires_at)) from efg_private.coach_reviewed_foods f),'binding',(select catalog_digest from efg_private.guide_source_bindings where student_id=${q(student.id)}),'receipt',(select result from efg_private.clinical_compatibility_receipts where student_id=${q(student.id)}),'evaluated',(select evaluated_at from efg_private.clinical_compatibility_receipts where student_id=${q(student.id)}))`));
 const original=snapshot();let child,pending,exited,output='',failed=false;
 try{
  sql(`begin;${setActor(coach)} update efg_private.coach_reviewed_foods set expires_at=clock_timestamp()+interval '5 seconds';
   update efg_private.guide_source_bindings set catalog_digest=efg_private.guide_catalog_digest(food_ids) where student_id=${q(student.id)};
   select efg_private.clinical_bind_saved(${q(student.id)});commit;`);
  const before=snapshot();
  child=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres'},stdio:['pipe','pipe','pipe']});
  child.stdout.on('data',d=>{output+=String(d);});child.stderr.on('data',()=>{failed=true;});child.on('error',()=>{failed=true;});child.stdin.on('error',()=>{failed=true;});exited=new Promise(r=>child.on('close',r));
  child.stdin.write(`begin;select student_id from public.efg_student_plan_access where student_id=${q(student.id)} for update;select 'LOCKED';\n`);
  for(let n=0;n<100&&!output.includes('LOCKED');n++){assert.equal(failed,false);await sleep(50);}assert.ok(output.includes('LOCKED'));
  pending=rpc('efg_publish_coach_plan_draft_atomic',coach.token,{p_student:student.id,p_expected_revision:revision,p_request_id:randomUUID()});
  let observed=false;for(let n=0;n<100;n++){if(sql("select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event_type='Lock' and query like '%efg_publish_coach_plan_draft_atomic%')")==='t'){observed=true;break;}await sleep(50);}assert.ok(observed,'Real publication lock wait');
  await sleep(5500);child.stdin.end('rollback;\n\\q\n');assert.equal(await exited,0);
  const result=await pending;denied(result,'source expires while publication waits',['PT409','42501']);assert.deepEqual(snapshot(),before,'Waiting expiration rejects without mutation');
  record('source expiration during observed SQL lock wait rejects without mutation');
 }finally{
  if(child&&!child.stdin.writableEnded)child.stdin.end('rollback;\n\\q\n');if(exited)await exited;if(pending)await Promise.allSettled([pending]);
  sql(`begin;${stored.foods.map(f=>`update efg_private.coach_reviewed_foods set expires_at=${q(f.expires)}::timestamptz where food_id=${q(f.id)};`).join('')}
   update efg_private.guide_source_bindings set catalog_digest=${q(stored.binding)} where student_id=${q(student.id)};
   update efg_private.clinical_compatibility_receipts set result=${q(JSON.stringify(stored.receipt))}::jsonb,binding=${q(stored.receipt.binding)},evaluated_at=${q(stored.evaluated)}::timestamptz where student_id=${q(student.id)};commit;`);
  assert.deepEqual(snapshot(),original,'Expiry fixture restored exactly');
 }
}

export async function clinicalCases({sql,rpc,request,users,orgs,goal,guide,ids,doc,digest,intake,mutationTables,record,out}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');
 const report={status:'RUNNING',sqlParity:[],races:[],limits:['Clinical captures and registry rows in negatives are TEST_ONLY; no real clinical catalogue','No frontend, browser, hosted or clinical activation'],cleanup:false};
 const beforeAcl=capturePermissions(sql);
 for(const name of ['clinical-provider.PROPOSAL.sql','backend-compatibility.PROPOSAL.sql','existing-rpc-hooks.PROPOSAL.sql'])sql(read('sql/'+name));
 const afterAcl=capturePermissions(sql);
 for(const k of ['defaults','policies','columns'])assert.deepEqual(afterAcl[k],beforeAcl[k],'Existing '+k+' unchanged');
 for(const k of ['tables','functions'])for(const b of beforeAcl[k]){
  const field=k==='tables'?'name':'signature';assert.deepEqual(afterAcl[k].find(a=>a[field]===b[field]),b,'Existing '+field+' permissions unchanged');
 }
 const addedFunctions=afterAcl.functions.filter(a=>!beforeAcl.functions.some(b=>b.signature===a.signature));
 assert.ok(addedFunctions.length>0);
 for(const f of addedFunctions)for(const role of ['anon','authenticated'])assert.equal(sql(`select has_function_privilege(${q(role)},${q(f.signature)},'EXECUTE')`),'f');
 for(const t of ['clinical_source_versions','clinical_compatibility_receipts','clinical_pattern_reviews'])for(const role of ['anon','authenticated'])assert.equal(sql(`select has_table_privilege(${q(role)},'efg_private.${t}','SELECT,INSERT,UPDATE,DELETE')`),'f');
 writeFileSync(out+'/acl-clinical-contract.json',JSON.stringify({before:beforeAcl,after:afterAcl,verified:true},null,2));
 sql(read('tests/pattern-revision-local.PROPOSAL.sql'));record('clinical private ACL and eight real SQL pattern predicate cases');
 const allTables=[...mutationTables,'efg_private.clinical_source_versions','efg_private.clinical_pattern_reviews','efg_private.clinical_compatibility_receipts'];
 const snap=()=>rowSnapshot(sql,allTables);
 const pubSnap=()=>rowSnapshot(sql,['public.efg_goals','public.efg_food_plans','public.efg_student_plan_access','public.efg_coach_plan_drafts','public.efg_notifications','public.efg_coach_plan_publish_receipts','efg_private.coach_guide_history','efg_private.coach119_atomic_transactions']);
 const fresh=async side=>{
  const student=users['student'+side],coach=users['coach'+side];
  yes(await rpc('efg_accept_pilot_participation',student.token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:true}),'fresh explicit share');
  const ir=Number(sql(`select revision from public.efg_coach_relaunch_intakes where student_id=${q(student.id)}`));
  const intakeRevision=yes(await rpc('efg_submit_coach_relaunch_intake',student.token,intake(ir,true)),'fresh general intake');
  const hr=Number(sql(`select coalesce((select revision from efg_private.efg_coach_health_intakes where student_id=${q(student.id)}),(select last_revision from efg_private.efg_coach_health_revocations where student_id=${q(student.id)}),0)`));
  const healthRevision=yes(await rpc('efg_declare_no_restrictions',student.token,{p_document:doc,p_sha256:digest,p_expected_revision:hr,p_processing_consent:true,p_share_with_coach:true}),'fresh explicit none');
  const previous=Number(sql(`select draft_revision from public.efg_coach_plan_drafts where student_id=${q(student.id)}`));
  const revision=yes(await rpc('efg_prepare_bound_guide',coach.token,{p_student:student.id,p_goal:goal,p_intake_revision:intakeRevision,p_health_revision:healthRevision,p_preferred:['banana'],p_disliked:['apple'],p_food_ids:ids,p_expected_draft:previous}),'fresh bound draft');
  const row=yes(await rpc('efg_read_bound_guide',coach.token,{p_student:student.id}),'fresh bound read');
  const saved=yes(await rpc('efg_save_bound_guide',coach.token,{p_student:student.id,p_expected_draft:revision,p_catalog_digest:row.catalog_digest,p_guide:guide}),'fresh bound save');
  const readback=yes(await rpc('efg_read_bound_guide',coach.token,{p_student:student.id}),'saved clinical decision');
  assert.equal(readback.compatibility.compatibilityReady,true);assert.equal(readback.draft_revision,saved);
  return {student,coach,revision:saved};
 };
 let a;
 try{
  a=await fresh('A');
  const publish=()=>rpc('efg_publish_coach_plan_draft_atomic',a.coach.token,{p_student:a.student.id,p_expected_revision:a.revision,p_request_id:randomUUID()});
  for(const token of [undefined,users.studentA.token,users.coachB.token]){
   const before=snap();denied(await rpc('efg_read_bound_guide',token,{p_student:a.student.id}),'clinical foreign/anonymous read',['42501']);assert.deepEqual(snap(),before);
  }
  // Real SQL parity, transactional administrative TEST_ONLY fixture; no fake RPC success.
  const fixture=JSON.parse(read('tests/common-parity-cases.json')),actual={};
  const original=snap();
  for(const c of fixture.cases){
   const food=fixture.food,recipe={meals:[{slot:'desayuno',items:[{id:food.id,qty:c.qty,unit:'g'}]}]};
   const normalized={id:'TEST_ONLY_gluten_rule',foodId:food.id,restriction:'gluten',preparation:'raw',productId:null,unit:'g',minQty:1,maxQty:10000,conditions:['TEST_ONLY'],basis:'documented_ingredient',verdict:'contains'};
   const normalizedText=JSON.stringify(normalized),originalText='TEST_ONLY clinical rule, not an ANMAT capture';
   const query=`begin; ${setActor(a.coach)}
    insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at,automatic_provenance)
     values(${q(food.id)},'TEST_ONLY','g',${food.k},${food.p},${food.c},${food.f},${food.fi},'validated_composition','https://example.invalid/TEST_ONLY','TEST_ONLY_evidence','reviewed',${q(a.coach.id)},now(),now()+interval '1 hour','{"preparation":"raw","productId":null}');
    update public.efg_coach_relaunch_intakes set dietary_pattern=${q(c.pattern.kind==='keto'?'keto':'omnivore')} where student_id=${q(a.student.id)};
    update public.efg_coach_plan_drafts set goal_proposal=jsonb_set(goal_proposal,'{carb_g}','20') where student_id=${q(a.student.id)};
    update efg_private.guide_source_bindings set food_ids=array[${q(food.id)}],disliked_ids=ARRAY[${c.dislikedIds.map(q).join(',')}]::text[] where student_id=${q(a.student.id)};
    update efg_private.efg_coach_health_intakes set conditions=${q(JSON.stringify(c.restrictions.length?{celiac:'confirmed'}:{}))}::jsonb where student_id=${q(a.student.id)};
    insert into efg_private.clinical_source_versions(id,manifest,normalized_record,original_text,normalized_text)
     values('TEST_ONLY_rule',jsonb_build_object('environment','production','active',true,'sourceVersion','TEST_ONLY','pipelineVersion','TEST_ONLY','rawDigest',encode(sha256(convert_to(${q(originalText)},'UTF8')),'hex'),'normalizedDigest',encode(sha256(convert_to(${q(normalizedText)},'UTF8')),'hex'),'capturedAt',now()-interval '1 minute','reviewAfter',now()+interval '1 hour','captureMethod','official_general_rule','sourceUrl','https://www.argentina.gob.ar/TEST_ONLY'),${q(normalizedText)}::jsonb,${q(originalText)},${q(normalizedText)});
    select efg_private.clinical_confirm_pattern(${q(a.student.id)},${a.revision},${q(c.pattern.kind)},${c.pattern.maxCarbG??'null'});
    select efg_private.clinical_snapshot(${q(a.student.id)},${q(JSON.stringify(recipe))}::jsonb)->'decisions'->0; rollback;`;
   const lines=sql(query).split('\n');actual[c.id]=JSON.parse(lines.at(-1));assert.deepEqual(snap(),original,'Parity fixture rolled back');
  }
  compareActualSqlCases(actual);report.sqlParity=actual;record('six actual SQL decisions equal Node color/reason/eligibility');
  // Actual paths: an existing general confirmation must not survive general->keto with same goals.
  sql(`begin; ${setActor(a.coach)} select efg_private.clinical_confirm_pattern(${q(a.student.id)},${a.revision},'general',null);
   update public.efg_coach_relaunch_intakes set dietary_pattern='keto',revision=revision+1 where student_id=${q(a.student.id)};
   update efg_private.guide_source_bindings set intake_revision=intake_revision+1 where student_id=${q(a.student.id)};
   do $case$ declare rejected boolean:=false; begin
    begin perform efg_private.clinical_snapshot(${q(a.student.id)}); exception when sqlstate 'PT409' then rejected:=true; end;
    if not rejected then raise exception 'Old general review survived keto revision'; end if;
    rejected:=false;begin perform efg_private.clinical_confirm_pattern(${q(a.student.id)},${a.revision},'general',null);exception when sqlstate '22023' then rejected:=true;end;
    if not rejected then raise exception 'Contradictory general confirmation accepted';end if;
   end $case$; rollback;`);
  assert.deepEqual(snap(),original);record('real snapshot rejects stale pattern revision and contradictory confirmation');
  // Deadline expires AFTER early gate, inside final receipt insert. All publication outputs roll back.
  const receipt=sql(`select result from efg_private.clinical_compatibility_receipts where student_id=${q(a.student.id)}`);
  try{
   sql(`update efg_private.clinical_compatibility_receipts set result=jsonb_set(result,'{validUntil}',to_jsonb(clock_timestamp()+interval '700 milliseconds')) where student_id=${q(a.student.id)};
    create function efg_private.qa_clinical_deadline_pause() returns trigger language plpgsql set search_path='' as $$begin perform pg_sleep(1); return new;end$$;
    revoke all on function efg_private.qa_clinical_deadline_pause() from public,anon,authenticated;
    create trigger qa_clinical_deadline_pause before insert on public.efg_coach_plan_publish_receipts for each row execute function efg_private.qa_clinical_deadline_pause();`);
   const before=snap();const expired=await publish();denied(expired,'expiry at final publication gate',['PT409']);assert.equal(expired.data.message,'Evidence expired before publication completed');assert.deepEqual(snap(),before,'Final TTL failure rolls back every tracked table');
  }finally{
   sql(`drop trigger if exists qa_clinical_deadline_pause on public.efg_coach_plan_publish_receipts;drop function if exists efg_private.qa_clinical_deadline_pause();update efg_private.clinical_compatibility_receipts set result=${q(receipt)}::jsonb where student_id=${q(a.student.id)}`);
  }
  assert.deepEqual(snap(),original);record('final TTL after awaited publication write rejects and rolls back');
  await expireWhileWaiting({sql,rpc,fixture:a,snapshot:snap,record});
  // Two fresh independently saved fixtures, not administrative reactivation of withdrawal.
  for(const side of ['A','B']){
   const f=await fresh(side);
   report.races.push(await publicationVsWithdrawal({sql,rpc,...f,requestId:randomUUID(),withdrawalFirst:side==='B',snapshot:snap,publicationSnapshot:pubSnap}));
  }
  record('actual publication-first and withdrawal-first: locks observed, no deadlock, replay denied');
  report.status='PASS';
 }catch(e){report.status='FAIL';report.error={name:e.name,message:String(e.message).replace(/eyJ[A-Za-z0-9_.-]+/g,'[REDACTED]').slice(0,1200)};throw e;}
 finally{
  assert.equal(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='efg_private' and p.proname in ('qa_clinical_race_pause','qa_clinical_deadline_pause')"),'0');
  assert.equal(sql("select count(*) from pg_trigger where tgname in ('zz_qa_clinical_race_pause','qa_clinical_deadline_pause')"),'0');
  report.cleanup=true;writeFileSync(out+'/clinical-result.json',JSON.stringify(report,null,2));
 }
}
