import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COACH_ATOMIC_PLAN_UI_ENABLED,createCoachPlanDraftClient,validateCoachPlanProposal} from "../pilot/coach-plan-draft-client.js";
const STU="00000000-0000-4000-8000-000000000011",REQ="30000000-0000-4000-8000-000000000001",GOAL="40000000-0000-4000-8000-000000000001";
const WHEN="2026-10-29T12:00:00.000Z";
const goal={goal_type:"recomp",kcal:2100,protein_g:140,carb_g:230,fat_g:70,fiber_g:28};
const food={id:"tofu_firm",unit:"g",qty:100,k:0.8,p:0.1,c:0.03,f:0.04,fi:0.02};
const guide={kind:"five_meal_example",version:1,meals:["desayuno","media_manana","almuerzo","merienda","cena"].map(slot=>({slot,items:[{...food}]})),supplementNote:""};
assert.equal(COACH_ATOMIC_PLAN_UI_ENABLED,false,"Release flag stays OFF until approved staging/JWT/legal QA");
assert.deepEqual(validateCoachPlanProposal(goal,guide).goal,goal);
for(const bad of [{...goal,kcal:"2100"},{...goal,protein_g:-1},{...goal,carb_g:20.5},{...goal,goal_type:"unlisted"}])
 assert.throws(()=>validateCoachPlanProposal(bad,guide));
for(const bad of [{...guide,meals:guide.meals.slice(1)},{...guide,meals:guide.meals.map((v,i)=>i===1?{...v,slot:"desayuno"}:v)},{...guide,meals:guide.meals.map((v,i)=>i===1?{...v,items:[{...food,qty:0}]}:v)}])
 assert.throws(()=>validateCoachPlanProposal(goal,bad));
let operations=0,consent=true,shared=true,stamp=WHEN,failRpc=null,rev=1;
const calls=[];
const db={
 from(table){operations++;return {
  select(){return this;},eq(){return this;},not(){return this;},
  maybeSingle(){
   if(table==="efg_consents")return Promise.resolve({data:{accepted:consent},error:null});
   if(table==="efg_student_intakes")return Promise.resolve({data:shared?{student_id:STU,updated_at:stamp,shared_at:WHEN,dietary_pattern:"omnivore"}:null,error:null});
   if(table==="efg_coach_plan_drafts")return Promise.resolve({data:{student_id:STU,goal_proposal:goal,guide_proposal:guide,draft_revision:rev,status:"draft"},error:null});
   throw Error("Unrecognized table "+table);
  }
 };},
 async rpc(name,payload){operations++;calls.push({name,payload});if(failRpc)return {data:null,error:failRpc};if(name==="efg_save_coach_plan_draft")return {data:rev,error:null};if(name==="efg_publish_coach_plan_draft")return {data:GOAL,error:null};throw Error("unexpected rpc "+name);}
};
const disabled=createCoachPlanDraftClient({sb:db});
await assert.rejects(()=>disabled.load(STU),/aún no habilitados/);
await assert.rejects(()=>disabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide}),/aún no habilitados/);
await assert.rejects(()=>disabled.publish({studentId:STU,expectedRevision:1,requestId:REQ,confirmed:true}),/aún no habilitados/);
assert.equal(operations,0,"OFF must not issue reads or writes");
const enabled=createCoachPlanDraftClient({sb:db,enabled:true}); // isolated synthetic test, never production flag
const loaded=await enabled.load(STU);
assert.equal(loaded.draft_revision,1);
const saved=await enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide});
assert.deepEqual(saved,{studentId:STU,revision:1,sourceUpdatedAt:WHEN});
assert.deepEqual(calls[0],{name:"efg_save_coach_plan_draft",payload:{p_student:STU,p_goal:goal,p_guide:guide,p_intake_updated_at:WHEN,p_expected_revision:null}});
rev=2;
const updated=await enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide,expectedRevision:1});
assert.equal(updated.revision,2);
assert.equal(calls[1].payload.p_expected_revision,1);
const before=calls.length;
await assert.rejects(()=>enabled.publish({studentId:STU,expectedRevision:2,requestId:REQ}),/aprobación explícita/);
assert.equal(calls.length,before);
const published=await enabled.publish({studentId:STU,expectedRevision:2,requestId:REQ,confirmed:true});
assert.deepEqual(published,{studentId:STU,goalId:GOAL,requestId:REQ,revision:2});
assert.deepEqual(calls.at(-1),{name:"efg_publish_coach_plan_draft",payload:{p_student:STU,p_expected_revision:2,p_request_id:REQ}});
consent=false;
await assert.rejects(()=>enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide,expectedRevision:2}),/no autorizó/);
await assert.rejects(()=>enabled.publish({studentId:STU,expectedRevision:2,requestId:REQ,confirmed:true}),/no autorizó/);
consent=true;shared=false;
await assert.rejects(()=>enabled.load(STU),/no compartió/);
shared=true;stamp="2026-10-29T12:01:00Z";
await assert.rejects(()=>enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide,expectedRevision:2}),/modificada/);
stamp=WHEN;
failRpc={message:"La validación legal del servidor rechazó la propuesta."};
await assert.rejects(()=>enabled.publish({studentId:STU,expectedRevision:2,requestId:REQ,confirmed:true}),/validación legal/);
failRpc=null;
await assert.rejects(()=>enabled.save({studentId:"other-student",sourceUpdatedAt:WHEN,goal,guide}),/Identificador de alumno inválido/);
await assert.rejects(()=>enabled.publish({studentId:STU,expectedRevision:2,requestId:"not-uuid",confirmed:true}),/Identificador único/);
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const flow=readFileSync(new URL("../pilot/coach-intake-flow.js",import.meta.url),"utf8");
assert.match(app,/createCoachPlanDraftClient\(\{sb,enabled:COACH_ATOMIC_PLAN_UI_ENABLED\}\)/);
assert.match(app,/if\(!COACH_ATOMIC_PLAN_UI_ENABLED\)return ""/);
assert.match(app,/data-act="saveCoachAtomicDraft"/);
assert.match(app,/data-act="publishCoachAtomicDraft"/);
assert.match(app,/coachDraftClient\.save\(/);
assert.match(app,/coachDraftClient\.publish\(/);
assert.match(app,/if\(action==="saveCoachAtomicDraft"\)return saveCoachAtomicDraft\(\)/);
assert.match(app,/if\(action==="publishCoachAtomicDraft"\)return publishCoachAtomicDraft\(\)/);
assert.match(app,/await assertCoachGoalWriteSafe\(sb,\{studentId:student,fromSharedIntake:/);
assert.match(flow,/await assertCoachGoalWriteSafe\(sb,\{studentId:student,fromSharedIntake:/);
assert.match(app,/state\.coachPlanDraftRecord=null;state\.coachPlanPublishRequestId=null/);
console.log("PASS: Coach staged draft adapter OFF; validated five meals, versioned save, confirmed atomic publish, denial on revoked/stale/invalid identity; legacy guide and publish blocked under access schema (SYNTHETIC).");
