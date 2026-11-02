import assert from 'node:assert/strict';
export async function diaryWriteAccessCases({request,users,day,snapshot,restoreRows}){
 const path='/rest/v1/efg_daily_logs',query='?student_id=eq.'+users.studentA.id+'&log_day=eq.'+day+'&select=*';
 const call=(actor,method,body,tail=query)=>request(path+tail,{method,token:actor?.token,body,prefer:'resolution=merge-duplicates,return=representation'});
 const body={student_id:users.studentA.id,log_day:day,meals:{desayuno:[{id:'TEST_ONLY',k:100,p:10,c:10,f:2,fi:3}]},sports:[],skipped:{},totals:{k:100,p:10,c:10,f:2,fi:3}};
 const ok=r=>{assert.ok(r.ok,`HTTP ${r.status}`);return r.data;},noWrite=async(fn)=>{const prior=await snapshot(),r=await fn();assert.ok([401,403].includes(r.status));assert.equal(r.data.code,'42501');assert.deepEqual(await snapshot(),prior);};
 try{
  await noWrite(()=>call(null,'GET'));
  await noWrite(()=>call(null,'POST',body,'?on_conflict=student_id,log_day&select=*'));
  const inserted=ok(await call(users.studentA,'POST',body,'?on_conflict=student_id,log_day&select=*'));assert.equal(inserted.length,1);
  assert.deepEqual(ok(await call(users.coachA,'GET')),inserted,'Authorized coach retains SELECT');
  for(const actor of [users.studentB,users.coachB]){assert.deepEqual(ok(await call(actor,'GET')),[]);await noWrite(()=>call(actor,'POST',body,'?on_conflict=student_id,log_day&select=*'));}
  await noWrite(()=>call(users.coachA,'POST',body,'?on_conflict=student_id,log_day&select=*'));
  await noWrite(()=>call(users.studentA,'PATCH',{student_id:users.studentB.id}));
  await noWrite(()=>call(users.studentA,'DELETE'));
  const updated=ok(await call(users.studentA,'POST',{...body,meals:{desayuno:[{...body.meals.desayuno[0],k:101}]},totals:{...body.totals,k:101}},'?on_conflict=student_id,log_day&select=*'));assert.equal(updated.length,1);assert.equal(ok(await call(users.studentA,'GET')).length,1);
  const emptyBefore=await snapshot();const otherDay={...body,student_id:users.studentB.id};await noWrite(()=>call(users.studentB,'POST',otherDay,'?on_conflict=student_id,log_day&select=*'));assert.deepEqual(await snapshot(),emptyBefore,'B without ready published plan denied by gate, not ownership');
  return {status:'PASS',scope:'local HTTP; authorized coach SELECT preserved; owner writes gated'};
 }finally{await restoreRows();}
}
