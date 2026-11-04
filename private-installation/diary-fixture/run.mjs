import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {rowSnapshot} from '../runner/snapshot.mjs';
import {attestDatabase} from '../runner/isolation.mjs';
import {diaryAccessCases} from './http-cases.mjs';
import {runDiaryBrowser} from './browser.mjs';
export async function runDiaryFixture({sql,request,users,input,ids,out,mutationTables,record}){
 assert.equal(process.env.EFG_QA_DIARY_FIXTURE,'1');attestDatabase(sql);
 const names=['efg_habitual_meals','efg_personal_recipes'];
 const all=[...new Set([...mutationTables,...names.map(t=>'public.'+t),...(await import('../dom-fixture/install.mjs')).tables.map(t=>'public.'+t)])];
 const snapshot=()=>rowSnapshot(sql,all),before=snapshot();
 for(const t of names)assert.equal(sql('select count(*) from public.'+t),'0');
 const api=(actor,table,method,query,body)=>{assert.ok(names.includes(table));return request('/rest/v1/'+table+'?'+query,{method,token:actor?.token,body,prefer:'return=representation'});};
 const result={status:'RUNNING',restored:false};
 try{
  for(let i=0;i<40;i++){const r=await api(users.studentA,names[0],'GET','select=id');if(r.ok)break;assert.equal(r.data?.code,'PGRST205');assert.ok(i<39);await new Promise(r=>setTimeout(r,250));}
  result.http=await diaryAccessCases({request:api,studentA:users.studentA,studentB:users.studentB,coachA:users.coachA,snapshot});
  if(process.env.EFG_QA_DIARY_REGISTRATION==='1')await (await import('../diary-registration/run.mjs')).withDiaryRegistration({sql,out,request,users,snapshot,runBrowser:registrationCases=>runDiaryBrowser({request,users,input,ids,out,snapshot,registrationCases})});
  else await runDiaryBrowser({request,users,input,ids,out,snapshot});
  result.status='PASS';record(process.env.EFG_QA_DIARY_REGISTRATION==='1'?'Diary registration local HTTP/SDK390/1280 plus ownership/recovery; see dedicated results':'Diary fixture real HTTP ownership and SDK save/reload/select/recovery390/1280; no diary writes');
 }catch(error){result.status='FAIL';result.error={name:error.name};throw error;}finally{
  try{
   // Only two initially empty synthetic tables; no UPDATE, privileged row delete or other table writes.
   for(const actor of [users.studentA,users.studentB])for(const table of names){const r=await api(actor,table,'DELETE','student_id=eq.'+actor.id+'&select=id');assert.ok(r.ok);}
   assert.deepEqual(snapshot(),before,'Complete tracked snapshots restored');result.restored=true;
  }catch(error){result.status='FAIL';result.restorationError={name:error.name};throw error;}finally{writeFileSync(out+'/diary-result.json',JSON.stringify(result,null,2));}
 }
}
