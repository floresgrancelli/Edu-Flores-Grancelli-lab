import assert from 'node:assert/strict';
import {createBoundGuidePublication} from '../pilot/bound-guide-publication-client.js';
const coach='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222',org='33333333-3333-4333-8333-333333333333';
for(const scenario of ['stable','changed-during-auth','unconfirmed']){
 let scope={userId:coach,profileId:coach,role:'coach',active:true,organizationId:org,ownerId:coach,studentId:student,studentActive:true,studentOrganizationId:org,consent:true,consentStudentId:student,consentOrganizationId:org,sessionId:'unit-session',sourceEpoch:1};
 let calls=0,release,entered,authCount=0;const started=new Promise(r=>entered=r);
 const sb={auth:{getUser:async()=>{if(scenario==='changed-during-auth'&&++authCount===1){entered();await new Promise(r=>release=r);}return {data:{user:{id:coach}},error:null};}},
  from(table){const q={select(){return q;},eq(){return q;},not(){return q;},maybeSingle:async()=>({data:table==='efg_consents'?{accepted:true}:{student_id:student,organization_id:org,completed_version:'coach_major_2026_r1',revision:1,updated_at:'2026-11-01T00:00:00Z',shared_at:'2026-11-01T00:00:00Z'},error:null})};return q;},
  rpc:async(name,args)=>{calls++;assert.equal(name,'efg_publish_coach_plan_draft_atomic');assert.equal(args.p_student,student);return {data:'44444444-4444-4444-8444-444444444444',error:null};}};
 const client=createBoundGuidePublication({sb,readScope:()=>scope,enabled:true});
 const pending=client.publish({studentId:student,expectedRevision:3,requestId:'55555555-5555-4555-8555-555555555555',confirmed:scenario!=='unconfirmed'});
 if(scenario==='changed-during-auth'){await started;scope={...scope,sourceEpoch:2};release();await assert.rejects(pending,/STALE_PUBLICATION_CONTEXT/);assert.equal(calls,0);}
 else if(scenario==='unconfirmed'){await assert.rejects(pending);assert.equal(calls,0);}
 else{assert.equal((await pending).revision,3);assert.equal(calls,1);}
}
console.log('PASS bound publisher unit guards: existing client, explicit confirmation, stale Auth blocks RPC. Synthetic transport only.');
