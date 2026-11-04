// PRIVATE tests; real local HTTP adapter required. No canned success responses.
import assert from 'node:assert/strict';
export async function diaryAccessCases({request,studentA,studentB,coachA,snapshot}){
 // request(actor,table,method,query,body) -> {status,data}; actor null = anon.
 // Adapter owns ephemeral JWTs; never serialize actors or raw error bodies.
 const cases=[
  ['efg_habitual_meals',{meal_slot:'desayuno',name:'TEST_ONLY habitual',items:[{id:'apple',qty:100,unit:'g',k:52,p:0.3,c:14,f:0.2,fi:2.4}]}],
  ['efg_personal_recipes',{name:'TEST_ONLY receta',ingredients:[{foodId:'apple',grams:100}],portions:1,totals:{k:52,p:0.3,c:14,f:0.2,fi:2.4}}]
 ];
 const ok=r=>{assert.ok(r.status>=200&&r.status<300);return r.data;};
 for(const [table,body] of cases){
  const before=await snapshot();
  const anon=await request(null,table,'GET','select=id');assert.ok([401,403].includes(anon.status));
  assert.deepEqual(await snapshot(),before);
  const created=ok(await request(studentA,table,'POST','select=*',{...body,student_id:studentA.id}));assert.equal(created.length,1);const id=created[0].id;
  const query='id=eq.'+id+'&select=*';
  assert.deepEqual(ok(await request(studentA,table,'GET',query)),created,'Real readback must equal stored row');
  for(const actor of [studentB,coachA]){
   assert.deepEqual(ok(await request(actor,table,'GET',query)),[]);
   const prior=await snapshot();
   const denied=await request(actor,table,'POST','select=*',{...body,student_id:studentA.id});assert.equal(denied.status,403);assert.equal(denied.data.code,'42501');
   assert.deepEqual(ok(await request(actor,table,'DELETE',query)),[]);
   assert.deepEqual(await snapshot(),prior,'Cross-owner rejected writes must not mutate any tracked table');
  }
  const prior=await snapshot();
  const patch=await request(studentA,table,'PATCH',query,{student_id:studentB.id});assert.equal(patch.status,403);assert.equal(patch.data.code,'42501');assert.deepEqual(await snapshot(),prior);
  const invalid=await request(studentA,table,'POST','select=*',{...body,student_id:studentA.id,...(table.endsWith('meals')?{meal_slot:'INVALID'}:{portions:0})});assert.equal(invalid.status,400);assert.equal(invalid.data.code,'23514');assert.deepEqual(await snapshot(),prior);
  // No artificial UNIQUE(name/items): actual schema permits repeated explicit creations.
  const duplicate=ok(await request(studentA,table,'POST','select=*',{...body,student_id:studentA.id}));assert.notEqual(duplicate[0].id,id);
  ok(await request(studentA,table,'DELETE','id=eq.'+duplicate[0].id+'&select=id'));
  assert.deepEqual(ok(await request(studentA,table,'GET',query)),created,'Deleting the duplicate preserves the original');
  ok(await request(studentA,table,'DELETE','id=eq.'+id+'&select=id'));
  assert.deepEqual(await snapshot(),before,'Own create/delete roundtrip preserves baseline');
 }
 return {status:'PASS',scope:'two-table real HTTP ownership/constraints; not UI or hosted'};
}
