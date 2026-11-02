// Independent of hosted Supabase; uses the same private RPC interface as the pilot.
import assert from 'node:assert/strict';
import {createStudentRestrictionDeclaration} from '../pilot/student-restriction-declaration.js';
import {applyDeclaredFoodGuidance as signal} from '../pilot/declared-food-guidance.js';
const uid='11111111-1111-4111-8111-111111111111',oid='22222222-2222-4222-8222-222222222222',sid='33333333-3333-4333-8333-333333333333';
const doc={id:sid,sha256:'a'.repeat(64),content:'Solo prueba local.'};
let rev=0,row=null,epoch=1,switchAtAuth=false,mismatch=false,writes=0;
const sb={auth:{async getUser(){if(switchAtAuth){epoch++;switchAtAuth=false;}return {data:{user:{id:uid}}};}},async rpc(name,args){
 if(name==='efg_current_coach_health_document')return {data:doc};
 if(name==='efg_get_coach_health_intake')return {data:structuredClone(row)};
 assert.equal(args.p_expected_revision,rev);rev++;writes++;
 if(name==='efg_revoke_coach_health_intake'){row={revision:rev,revoked:true,conditions:{}};return {data:true};}
 assert.equal(name,'efg_submit_coach_health_intake');assert.equal(args.p_document_id,doc.id);assert.equal(args.p_document_sha256,doc.sha256);
 row={student_id:uid,organization_id:oid,revision:rev,conditions:mismatch?{}:structuredClone(args.p_conditions),shared_with_coach:args.p_share_with_coach};return {data:rev};
}};
const client=createStudentRestrictionDeclaration({sb,enabled:true,readContext:()=>({userId:uid,sessionId:sid,organizationId:oid,epoch,role:'student',active:true})});
const opts={conditions:{celiac:'confirmed',hypertension:'suspected'},processing:true,sharing:false};
assert.equal((await client.load()).declaration,'unknown');
for(const bad of [{...opts,processing:false},{...opts,noneDeclared:true},{...opts,conditions:{XX:'confirmed'}},{...opts,conditions:{celiac:'yes'}}])await assert.rejects(()=>client.declare(bad));
assert.equal(writes,0);await client.declare(opts);const privateView=await client.load();assert.equal(privateView.shared,false);
await client.declare({...opts,sharing:true});const shared=await client.load();assert.deepEqual(shared.selected,opts.conditions);assert.equal(shared.shared,true);
const base={color:'neutral',symbol:'',details:'',canRecord:true};assert.equal(signal(base,{id:'toast_whole'},shared).color,'red');assert.equal(signal(base,{id:'apple'},shared).color,'yellow');
switchAtAuth=true;await assert.rejects(()=>client.declare(opts));assert.equal(writes,2);
await client.load();const revoked=await client.revoke();assert.equal(revoked.revoked,true);assert.deepEqual(revoked.selected,{});
mismatch=true;await assert.rejects(()=>client.declare(opts),/no coincide/);
console.log('PASS: selected options → signed private or shared payload → confirmed readback → contextual colour; conflict, account switch and revocation. Mock transport.');
