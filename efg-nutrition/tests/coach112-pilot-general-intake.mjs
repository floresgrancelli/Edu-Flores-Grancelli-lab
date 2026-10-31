import assert from 'node:assert/strict';
import {loadCoachPilotGeneralIntake,submitCoachPilotGeneralIntake}
 from '../pilot/coach-pilot-intake-client.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const org='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profile={user_id:uid,organization_id:org,role:'student',active:true};
const receipt={student_id:uid,organization_id:org,version:'coach_pilot_2026_demo1',
 participation_accepted:true,sharing_accepted:true,acceptance_method:'two_explicit_checkboxes',
 accepted_at:'2026-10-30T15:00:00Z',revoked_at:null,updated_at:'2026-10-30T15:00:00Z'};
const intake={student_id:uid,organization_id:org,completed_version:'coach_major_2026_r1',
 revision:1,shared_at:'2026-10-30T15:15:00Z',updated_at:'2026-10-30T15:15:00Z',
 dietary_pattern:'keto',eating_window:'16_8'};
const payload={objective:'recomp',age_years:40,height_cm:174.0,weight_kg:79.3,
 activity_level:'moderate',dietary_pattern:'keto',eating_window:'16_8',
 notes:'Entreno 5 días por semana'};
let nRPC=0;
function fake({signed=uid,pilot=receipt,stored=null}={}){
 let row=stored;
 return {auth:{getUser:async()=>({data:{user:{id:signed}},error:null})},
 from:name=>({select:()=>({eq(){return this},maybeSingle:async()=>({data:name==='efg_pilot_participation_receipts'?pilot:row,error:null})})}),
 rpc:async(name,params)=>{
  nRPC++;
  assert.equal(name,'efg_submit_coach_relaunch_intake');
  assert.equal(params.p_completed_version,'coach_major_2026_r1');
  assert.equal(params.p_expected_revision,row?.revision??0);
  row={...intake,...params.p_payload,revision:params.p_expected_revision+1,
   shared_at:params.p_share_with_coach?'2026-10-30T15:18:00Z':null,
   updated_at:'2026-10-30T15:18:00Z'};
  return {data:row.revision,error:null};
 }};
}
const sb=fake();
const before=await loadCoachPilotGeneralIntake(sb,{profile});
assert.equal(before.intake,null);
const s=await submitCoachPilotGeneralIntake(sb,{profile,payload,expectedRevision:0,shareWithCoach:true,explicitSubmit:true});
assert.equal(s.intake.revision,1);
assert.equal(s.intake.dietary_pattern,'keto');
assert.equal(s.intake.eating_window,'16_8');
assert.equal(s.shared,true);assert.equal(s.medicalConsent,false);
const s2=await submitCoachPilotGeneralIntake(sb,{profile,payload,expectedRevision:1,shareWithCoach:false,explicitSubmit:true});
assert.equal(s2.shared,false,'Revocation of sharing must return private state');
assert.equal(s2.intake.revision,2);
for(const bad of [{...payload,health_flags:['sibo']},{...payload,diagnosis:'diabetes'},
 {...payload,allergy_details:'celiac'},{...payload,unrecognized:'x'}]){
 await assert.rejects(submitCoachPilotGeneralIntake(sb,{profile,payload:bad,
  expectedRevision:2,explicitSubmit:true}),/campo no pertenece/);
}
// Reject invalid values before calling the signed RPC; DB keeps final authority.
const rpcBeforeValidation=nRPC;
for(const bad of [
 {...payload,age_years:17}, {...payload,age_years:40.5},
 {...payload,height_cm:99}, {...payload,weight_kg:401},
 {...payload,weight_kg:Infinity}, {...payload,age_years:'40'},
 {...payload,dietary_pattern:'unsupported'}, {...payload,eating_window:'18_6'},
 {...payload,activity_level:'extreme'}, {...payload,objective:'diagnosis'},
 {...payload,preferred_foods:'x'.repeat(401)}, {...payload,notes:'x'.repeat(1001)}
]){
 await assert.rejects(submitCoachPilotGeneralIntake(sb,{profile,payload:bad,
  expectedRevision:2,explicitSubmit:true}),/ficha inválido/);
}
assert.equal(nRPC,rpcBeforeValidation,'Invalid general-intake data never reaches the RPC');
await assert.rejects(submitCoachPilotGeneralIntake(sb,{profile,payload,
 expectedRevision:0,explicitSubmit:true}),/otro dispositivo/);
await assert.rejects(submitCoachPilotGeneralIntake(sb,{profile,payload,
 expectedRevision:2,explicitSubmit:false}),/confirmación expresa/);
const beforeDenied=nRPC;
await assert.rejects(loadCoachPilotGeneralIntake(fake({signed:org}),{profile}),/identidad/);
await assert.rejects(loadCoachPilotGeneralIntake(fake({pilot:{...receipt,revoked_at:'2026-10-30T16:00:00Z'}}),{profile}),/dos opciones/);
await assert.rejects(loadCoachPilotGeneralIntake(fake({pilot:{...receipt,organization_id:uid}}),{profile}),/otra organización/,
 'Receipt of a previous organization must never authorize the current intake.');
assert.equal(nRPC,beforeDenied,'Denied or revoked user cannot submit.');
console.log('PASS COACH112: two real pilot decisions, owner-only general intake, keto/16:8, revisions and share revoke; sensitive keys denied.');
