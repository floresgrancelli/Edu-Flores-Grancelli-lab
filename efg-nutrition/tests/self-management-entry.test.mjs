import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveIndependentEntry} from '../pilot/self-management-entry.js';
import {createPilotAccessManager} from '../self-management/backend/pilot-access.mjs';
const sb={auth:{getSession:async()=>({data:{session:{user:{id:'own'},access_token:'test-only'}}})}};
test('independent route requires a matching server decision and current session',async()=>{
 const options={userId:'own',current:()=>true,fetcher:async()=>Response.json({userId:'own',legal:{accepted:false}})};
 assert.equal(await resolveIndependentEntry(sb,options),true);
 assert.equal(await resolveIndependentEntry(sb,{...options,current:()=>false}),false);
 assert.equal(await resolveIndependentEntry(sb,{...options,userId:'other'}),false);
 await assert.rejects(resolveIndependentEntry(sb,{...options,fetcher:async()=>Response.json({userId:'other'})}));
});
test('no entitlement or coach-bound account stays in its current entry circuit',async()=>{
 for(const error of ['access_required','mode_mismatch'])assert.equal(await resolveIndependentEntry(sb,{userId:'own',current:()=>true,fetcher:async()=>Response.json({error},{status:403})}),false);
 await assert.rejects(resolveIndependentEntry(sb,{userId:'own',current:()=>true,fetcher:async()=>Response.json({error:'unavailable'},{status:503})}));
});
function fixture({role='admin',active=true,targetRole=null,confirmed=true}={}){
 const writes=[],tables={efg_profiles:{own:{role,active},...(targetRole?{target:{role:targetRole,active:true}}:{})},ncc_self_pilot_access:{}};
 const client={auth:{admin:{listUsers:async()=>({data:{users:[{id:'target',email:'person@example.invalid',email_confirmed_at:confirmed?'2026-11-13':null}]}})}},from(table){
  let id=null,write=null;
  const q={select(){return q;},eq(k,v){id=v;return q;},upsert(v){write=v;id=v.user_id;return q;},update(v){write=v;return q;},async maybeSingle(){return {data:tables[table][id]||null,error:null};},then(resolve){if(write){writes.push({table,id,write});tables[table][id]={...tables[table][id],...write};}return Promise.resolve({error:null}).then(resolve);}};return q;
 }};
 return {manage:createPilotAccessManager(client,{now:()=>1000000}),writes,tables};
}
test('only an active admin can consult or modify pilot access',async()=>{
 for(const options of [{role:'coach'},{role:'student'},{active:false}]){
  const f=fixture(options);await assert.rejects(f.manage('own',{action:'admin_grant',email:'person@example.invalid',days:30}),{code:'admin_required'});assert.equal(f.writes.length,0);
 }
});
test('grant, renew and revoke reuse entitlement without touching roles or histories',async()=>{
 const f=fixture();const before=structuredClone(f.tables.efg_profiles);
 const data=await f.manage('own',{action:'admin_grant',email:'Person@example.invalid',days:30});assert.equal(data.access.active,true);assert.equal(data.email,'person@example.invalid');
 await f.manage('own',{action:'admin_revoke',email:data.email});assert.equal(f.tables.ncc_self_pilot_access.target.active,false);
 assert.deepEqual(f.tables.efg_profiles,before);assert.ok(f.writes.every(w=>w.table==='ncc_self_pilot_access'));
});
test('unverified users, students and invalid expiry cannot be granted',async()=>{
 for(const [options,days,code] of [[{confirmed:false},30,'account_not_ready'],[{targetRole:'student'},30,'mode_mismatch'],[{},0,'invalid_request'],[{},91,'invalid_request']]){
  const f=fixture(options);await assert.rejects(f.manage('own',{action:'admin_grant',email:'person@example.invalid',days}),{code});assert.equal(f.writes.length,0);
 }
});
