// NOT EXECUTED. Called by the existing disposable runner with real local JWT RPC.
// No accounts, network listener, dependencies, grants or hosted operations created.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomInt} from 'node:crypto';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uuid=x=>{assert.match(x,/^[0-9a-f-]{36}$/i);return "'"+x+"'";};
async function until(check){for(let i=0;i<100;i++){if(check())return;await sleep(50);}throw Error('Expected real database wait not observed');}
// sql/rpc are from reviewed localContext(); request identities/tokens remain memory-only.
// Use a fresh saved, publishable fixture for EACH ordering. Do not undo a withdrawal
// administratively or relabel a published draft to manufacture the second case.
export async function publicationVsWithdrawal({sql,rpc,coach,student,revision,requestId,withdrawalFirst=false,snapshot,publicationSnapshot}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');
 for(const k of ['PGHOSTADDR','PGSERVICE','PGSERVICEFILE','PGOPTIONS','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD'])assert.ok(!process.env[k]);
 assert.equal(typeof publicationSnapshot,'function');const publicationBefore=publicationSnapshot();
 const key=randomInt(100000,900000),studentId=uuid(student.id),target=withdrawalFirst?'efg_pilot_participation_receipts':'efg_goals';
 const controller=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres'},stdio:['pipe','pipe','pipe']});
 let output='',controllerFailed=false;controller.stdout.on('data',d=>{output+=String(d);});controller.stderr.on('data',()=>{controllerFailed=true;});
 const exited=new Promise(resolve=>controller.on('close',resolve));controller.on('error',()=>{controllerFailed=true;});controller.stdin.on('error',()=>{controllerFailed=true;});
 let released=false,publishPromise,withdrawPromise;
 const release=()=>{if(!released){released=true;controller.stdin.end(`SELECT pg_advisory_unlock(${key});\n\\q\n`);}};
 const publish=()=>rpc('efg_publish_coach_plan_draft_atomic',coach.token,{p_student:student.id,p_expected_revision:revision,p_request_id:requestId});
 const withdraw=()=>rpc('efg_accept_pilot_participation',student.token,{p_version:'coach_pilot_2026_demo1',p_participation:true,p_sharing:false});
 try{
  controller.stdin.write(`SELECT pg_advisory_lock(${key}); SELECT 'BARRIER_READY';\n`);
  await until(()=>{if(controllerFailed)throw Error('Local barrier failed');return output.includes('BARRIER_READY');});
  sql(`create function efg_private.qa_clinical_race_pause() returns trigger language plpgsql set search_path='' as $pause$ begin if new.student_id=${studentId} then perform pg_advisory_xact_lock(${key}); end if; return new; end $pause$;
   revoke all on function efg_private.qa_clinical_race_pause() from public,anon,authenticated;
   create trigger zz_qa_clinical_race_pause before ${withdrawalFirst?'update':'insert'} on public.${target} for each row execute function efg_private.qa_clinical_race_pause();`);
  if(withdrawalFirst)withdrawPromise=withdraw();else publishPromise=publish();
  await until(()=>sql(`select exists(select 1 from pg_locks where locktype='advisory' and objid=${key} and not granted)`) === 't');
  if(withdrawalFirst)publishPromise=publish();else withdrawPromise=withdraw();
  const waitingFunction=withdrawalFirst?'efg_publish_coach_plan_draft_atomic':'efg_accept_pilot_participation';
  await until(()=>sql(`select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event_type='Lock' and query like '%${waitingFunction}%')`)==='t');
  // In withdrawal-first ordering capture before publication is allowed to proceed.
  // The expected receipt change from withdrawal is not incorrectly called rollback.
  release();assert.equal(await exited,0,'Local barrier controller exits cleanly');
  const [p,w]=await Promise.all([publishPromise,withdrawPromise]);
  assert.equal(w.ok,true,'Withdrawal commits');
  assert.notEqual(p.data?.code,'40P01','No deadlock');assert.notEqual(w.data?.code,'40P01','No withdrawal deadlock');
  if(withdrawalFirst){assert.deepEqual(publicationSnapshot(),publicationBefore,'Rejected publication preserves goals/plans/access/draft/notices/publication receipts/history');assert.equal(p.ok,false);assert.ok(['42501','PT409'].includes(p.data?.code));}
  else assert.equal(p.ok,true,'Already-authorized publication finishes before queued withdrawal');
  assert.equal(sql(`select sharing_accepted from public.efg_pilot_participation_receipts where student_id=${studentId} and version='coach_pilot_2026_demo1'`),'f');
  const before=snapshot();const replay=await publish();assert.equal(replay.ok,false);assert.ok(['42501','PT409'].includes(replay.data?.code));assert.deepEqual(snapshot(),before,'Withdrawn retry cannot mutate any tracked table');
  return {ordering:withdrawalFirst?'withdrawal-first':'publication-first',publication:p.ok,withdrawal:true,noDeadlock:true,postWithdrawalRetryDenied:true};
 }finally{
  release();await exited;
  await Promise.allSettled([publishPromise,withdrawPromise].filter(Boolean));
  sql(`drop trigger if exists zz_qa_clinical_race_pause on public.${target}; drop function if exists efg_private.qa_clinical_race_pause();`);
 }
}
