// UX35 signed major-release reauth contract · synthetic only, NO live users.
import assert from 'node:assert/strict';
import {confirmMajorRelaunchAndExit} from '../pilot/major-release-reauth-client.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profile={user_id:uid,role:'student',active:true};
const args={profile,userId:uid,releaseId:'major_2026_01',currentBuild:'20261030-ux35-session1',
 explicitClick:true,enabled:true,hasUnsavedChanges:()=>false};
let phase='preview',published=true,ackGood=true,authUser=uid;
let calls=[];
const sb={auth:{getUser:async()=>({data:{user:{id:authUser}},error:null}),
 signOut:async opts=>{calls.push(['signOut',opts]);return {error:null}}},
 rpc:async(name,data)=>{
  calls.push([name,data]);
  if(name==='efg_major_release_status')return {data:{
   phase,id:'major_2026_01',version:'2026.11.1',
   title:'Gran actualización de Nutrition Coach',
   highlights:['Nueva ficha de ingreso','Guía alimentaria renovada'],
   build:'20261030-ux35-session1',published,
   roles:['student','coach','admin','personal']},error:null};
  if(name==='efg_major_release_ack')return {
   data:ackGood?true:null,error:ackGood?null:{message:'not allowed'}};
  throw Error('Unexpected RPC '+name);
 }};
await assert.rejects(confirmMajorRelaunchAndExit(sb,{...args,enabled:false}),/todavía no permite/);
await assert.rejects(confirmMajorRelaunchAndExit(sb,{...args,explicitClick:false}),/todavía no permite/);
assert.equal(calls.length,0,'OFF and without click cannot call server');
await assert.rejects(confirmMajorRelaunchAndExit(sb,args),/todavía no fue confirmada/);
assert.equal(calls.filter(x=>x[0]==='signOut').length,0);
phase='live';
await assert.rejects(confirmMajorRelaunchAndExit(sb,args),/todavía no fue confirmada/);
phase='reauth_required';published=false;
await assert.rejects(confirmMajorRelaunchAndExit(sb,args),/todavía no fue confirmada/);
published=true;authUser=other;
await assert.rejects(confirmMajorRelaunchAndExit(sb,args),/identidad|sesión/);
authUser=uid;ackGood=false;
await assert.rejects(confirmMajorRelaunchAndExit(sb,args),/No pudimos confirmar/);
assert.equal(calls.filter(x=>x[0]==='signOut').length,0);
ackGood=true;
const before=calls.length;
const no=await confirmMajorRelaunchAndExit(sb,{...args,
 hasUnsavedChanges:()=>true,confirmDiscard:()=>false});
assert.equal(no.cancelled,true);
assert.equal(calls.length-before,1,'Cancelled after status read but before acknowledgment');
const yes=await confirmMajorRelaunchAndExit(sb,{...args,
 hasUnsavedChanges:()=>true,confirmDiscard:()=>true});
assert.equal(yes.signedOut,true);
assert.deepEqual(calls.at(-1),['signOut',{scope:'local'}]);
assert.deepEqual(calls.at(-2),['efg_major_release_ack',{
 p_release:'major_2026_01',p_event_kind:'reauth_notice_acknowledged',p_explicit_click:true
}]);
console.log('PASS UX35: signed MAJOR only, no preview/minor/unauthorized/early exit, user confirmation before receipt, local OTP exit.');
