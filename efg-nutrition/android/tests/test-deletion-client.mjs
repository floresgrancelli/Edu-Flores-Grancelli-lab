import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeletionClient} from '../../pilot/account-deletion-client.mjs';
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const ID='33333333-3333-4333-8333-333333333333';
const row=()=>({id:ID,user_id:A,status:'pending',requested_at:'2026-11-13T15:00:00Z'});
function fixture({existing=null,insertError=null,readError=null,switchAfterInsert=false,noReceipt=false,forged=null}={}) {
  let current=A,stored=existing,writes=0;
  const sdk={auth:{getUser:async()=>({data:{user:{id:current}}})},from(){return {
    select(){return this},eq(){return this},order(){return this},limit(){return this},
    async maybeSingle(){return {data:forged||stored,error:readError}},
    async insert(data){writes++;assert.deepEqual(data,{user_id:A,source:'privacy_web'});
      if(!noReceipt)stored=row();if(switchAfterInsert)current=B;return {error:insertError};}
  }}};
  return {client:createDeletionClient(sdk),writes:()=>writes};
}
test('requires explicit confirmation without writing',async()=>{
  const f=fixture();await assert.rejects(f.client.request(),/Confirmá/);assert.equal(f.writes(),0);
});
test('reports success only after verified persisted receipt',async()=>{
  const f=fixture();assert.equal((await f.client.request({confirmed:true})).id,ID);assert.equal(f.writes(),1);
});
test('reuses an existing open request without another write',async()=>{
  const f=fixture({existing:row()});await f.client.request({confirmed:true});assert.equal(f.writes(),0);
});
test('does not claim a request was saved on backend failure',async()=>{
  const f=fixture({insertError:{code:'42P01'}});await assert.rejects(f.client.request({confirmed:true}),/no se guardó/);
});
test('does not submit while initial state is unavailable',async()=>{
  const f=fixture({readError:{code:'42P01'}});await assert.rejects(f.client.request({confirmed:true}),/consultar/);assert.equal(f.writes(),0);
});
test('detects account switch while request is in flight',async()=>{
  const f=fixture({switchAfterInsert:true});await assert.rejects(f.client.request({confirmed:true}),/sesión cambió/);
});
test('rejects another users receipt',async()=>{
  const f=fixture({forged:{...row(),user_id:B}});await assert.rejects(f.client.current(),/servidor no confirmó/);
});
test('rejects an unverified write with no persisted receipt',async()=>{
  const f=fixture({noReceipt:true});await assert.rejects(f.client.request({confirmed:true}),/No se confirmó/);
});
test('handles simultaneous duplicate request using persisted result',async()=>{
  const f=fixture({insertError:{code:'23505'}});assert.equal((await f.client.request({confirmed:true})).id,ID);
});
