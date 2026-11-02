// PRIVATE assembly: import is inert. No hosted destination permitted.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {q,rowSnapshot} from '../runner/snapshot.mjs';
import {attestDatabase} from '../runner/isolation.mjs';
import {installDiaryWrites} from './install.mjs';
import {diaryWriteAccessCases} from './http-cases.mjs';
import {registrationCases} from './browser-cases.mjs';
export async function withDiaryRegistration({sql,out,request,users,snapshot,runBrowser}){
 assert.equal(process.env.EFG_QA_DIARY_REGISTRATION,'1');attestDatabase(sql);
 const baseline=snapshot(),diary=rowSnapshot(sql,['public.efg_daily_logs']);assert.equal(diary['public.efg_daily_logs'],'[]','Fresh diary required, never erase existing rows');
 const ids=[users.studentA.id,users.studentB.id];
 const restoreRows=async()=>{attestDatabase(sql);assert.equal(sql(`select count(*) from public.efg_daily_logs where student_id not in (${ids.map(q).join(',')})`),'0');sql(`delete from public.efg_daily_logs where student_id in (${ids.map(q).join(',')})`);assert.deepEqual(rowSnapshot(sql,['public.efg_daily_logs']),diary);};
 const withRevokedConsent=async fn=>{
  const old=JSON.parse(sql(`select to_jsonb(c) from public.efg_consents c where student_id=${q(users.studentA.id)}`));assert.equal(old.accepted,true);
  const before=rowSnapshot(sql,['public.efg_consents']);
  try{const r=await request('/rest/v1/efg_consents?student_id=eq.'+users.studentA.id+'&select=*',{method:'PATCH',token:users.studentA.token,body:{accepted:false},prefer:'return=representation'});assert.ok(r.ok);assert.equal(r.data.length,1);assert.equal(r.data[0].accepted,false);await fn();}
  finally{
   // The consent table has a timestamp trigger: a normal UPDATE changes
   // updated_at even when an explicit older value is supplied. Undo ONLY
   // this disposable-fixture row in a single transaction; LOCAL cannot leak
   // the trigger setting to any other request or test, and real revoke/
   // authorization operations above still exercise their normal triggers.
   attestDatabase(sql);
   sql(`begin;set local session_replication_role=replica;
    update public.efg_consents set accepted=${old.accepted?'true':'false'},
    updated_at=${q(old.updated_at)}::timestamptz
    where student_id=${q(users.studentA.id)};commit;`);
   assert.deepEqual(rowSnapshot(sql,['public.efg_consents']),before,'Restored consent including exact prior timestamp');
  }
 };
 let install,result={status:'RUNNING',restored:false,dom:[]};
 try{
  install=installDiaryWrites({sql,out});
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  result.http=await diaryWriteAccessCases({request,users,day,snapshot,restoreRows});
  await runBrowser(async context=>{const r=await registrationCases({...context,request,snapshot,restoreRows,withRevokedConsent});result.dom.push(r);});
  assert.deepEqual(result.dom.map(x=>x.width),[390,1280]);result.status='PASS';
 }catch(e){result.status='FAIL';result.error={name:e.name,stage:e.diaryRegistrationStage||null};throw e;}
 finally{
  try{await restoreRows();install?.restore();assert.deepEqual(snapshot(),baseline);result.restored=true;}
  catch(e){result.status='FAIL_RESTORE';throw e;}
  finally{writeFileSync(out+'/diary-registration-result.json',JSON.stringify(result,null,2));}
 }
}
