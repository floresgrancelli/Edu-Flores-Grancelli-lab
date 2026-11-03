// OFFLINE ONLY. This tests fail-closed mechanics, NOT hosted OTP/JWT.
import assert from 'node:assert/strict';
import {ACK,HOSTED_ORIGIN,validateHostedActors,runHostedSignedReadOnly} from '../tools/ncc-p26-hosted-signed-readonly.mjs';
const now=Math.floor(Date.now()/1000);
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const orgs=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
const token=id=>{
 const payload=Buffer.from(JSON.stringify({role:'authenticated',sub:id,exp:now+3600})).toString('base64url');
 return 'eyJhbGciOiJIUzI1NiJ9.'+payload+'.'+'testsignature_not_real_no_hosted_requests';
};
const env={
 NCC_P26_ACK:ACK,NCC_P26_URL:HOSTED_ORIGIN,
 NCC_P26_PUBLIC_KEY:'sb_publishable_FICTIONAL_UNIT_ONLY_12345678',
 NCC_P26_PHASE:'after_share',NCC_P26_ORG_A_ID:orgs[0],NCC_P26_ORG_B_ID:orgs[1],
 NCC_P26_STUDENT_ID:ids[0],NCC_P26_STUDENT_JWT:token(ids[0]),
 NCC_P26_COACH_A_ID:ids[1],NCC_P26_COACH_A_JWT:token(ids[1]),
 NCC_P26_COACH_B_ID:ids[2],NCC_P26_COACH_B_JWT:token(ids[2])
};
assert.throws(()=>validateHostedActors({...env,NCC_P26_ACK:''},now));
assert.throws(()=>validateHostedActors({...env,NCC_P26_URL:'https://example.org'},now));
assert.throws(()=>validateHostedActors({...env,NCC_P26_ORG_B_ID:orgs[0]},now));
assert.throws(()=>validateHostedActors({...env,NCC_P26_COACH_B_ID:ids[1]},now));
assert.throws(()=>validateHostedActors({...env,NCC_P26_PHASE:'production'},now));
assert.throws(()=>validateHostedActors({...env,SUPABASE_SERVICE_ROLE_KEY:'not-allowed'},now));
const adminPayload=Buffer.from(JSON.stringify({role:'service_role',sub:ids[1],exp:now+3600})).toString('base64url');
assert.throws(()=>validateHostedActors({...env,NCC_P26_COACH_A_JWT:'a.'+adminPayload+'.c'},now));
const valid=validateHostedActors(env,now);
const observed=[];
let crossLeak=false;
const json=data=>({status:200,json:async()=>data});
const fakeGet=async(url,options)=>{
 assert.equal(options.method,'GET','No non-read request permitted');
 assert.equal(options.redirect,'error');
 assert.ok(!url.includes('publish')&&!url.includes('insert')&&!url.includes('otp'));
 const actor=valid.actors.find(x=>options.headers.Authorization==='Bearer '+x.token);
 assert.ok(actor,'Unexpected bearer actor');
 const u=new URL(url),path=u.pathname,search=u.searchParams;
 assert.equal(u.origin,HOSTED_ORIGIN);
 observed.push({method:options.method,path});
 if(path==='/auth/v1/user')return json({id:actor.id,email_confirmed_at:'2026-11-03T00:00:00Z'});
 if(path==='/rest/v1/efg_profiles')return json([{user_id:actor.id,role:actor.name==='student'?'student':'coach',
    organization_id:actor.name==='student'?orgs[0]:null,active:true}]);
 if(path==='/rest/v1/efg_organizations'){
  const index=actor.name==='coachA'?0:1;
  return json([{id:orgs[index],coach_id:actor.id,is_test:true}]);
 }
 if(path==='/rest/v1/efg_coach_relaunch_intakes')
  return json(actor.name==='coachB'?(crossLeak?[{student_id:ids[0],organization_id:orgs[0],shared_at:'now'}]:[])
   :[{student_id:ids[0],organization_id:orgs[0],shared_at:'now'}]);
 if(path==='/rest/v1/efg_coach_plan_drafts')return json([]);
 if(path==='/rest/v1/efg_student_plan_access')
  return json(actor.name==='coachB'?[]:[{student_id:ids[0],status:'pending'}]);
 if(path==='/rest/v1/efg_daily_logs')return json([]);
 throw Error('Unexpected fixture read '+path+' '+search);
};
const result=await runHostedSignedReadOnly(valid,fakeGet);
assert.equal(result.status,'PASS_SIGNED_RLS_READ_ONLY');
assert.equal(result.hosted_writes,0);
assert.equal(result.otp_provenance,'REQUIRES_SEPARATE_HUMAN_BROWSER_EVIDENCE');
assert.ok(observed.every(x=>x.method==='GET'));
crossLeak=true;
await assert.rejects(()=>runHostedSignedReadOnly(valid,fakeGet),/Cross-org intake exposure/);
const original=globalThis.fetch;
assert.equal(typeof original,'function');
console.log('PASS NCC P26 OFFLINE: JWT shape rejects privileged/expired/wrong actors, all requests GET, cross-org leak fails, no hosted network/OTP/consent/write. Signed live test NOT RUN.');
