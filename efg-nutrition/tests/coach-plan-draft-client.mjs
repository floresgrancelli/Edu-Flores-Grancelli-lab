import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COACH_ATOMIC_PLAN_UI_ENABLED,createCoachPlanDraftClient,validateCoachPlanProposal} from "../pilot/coach-plan-draft-client.js";
import {approvedFoodGuide,coachFoodChoicesFromDom} from "../pilot/coach-food-selection.js";
const STU="00000000-0000-4000-8000-000000000011",REQ="30000000-0000-4000-8000-000000000001",GOAL="40000000-0000-4000-8000-000000000001";
const WHEN="2026-10-29T12:00:00.000Z";
const ORG="50000000-0000-4000-8000-000000000001";
const goal={goal_type:"recomp",kcal:2100,protein_g:140,carb_g:230,fat_g:70,fiber_g:28};
const food={id:"tofu_firm",unit:"g",qty:100,k:0.8,p:0.1,c:0.03,f:0.04,fi:0.02};
const guide={kind:"five_meal_example",version:1,meals:["desayuno","media_manana","almuerzo","merienda","cena"].map(slot=>({slot,items:[{...food}]})),supplementNote:""};
const versionedGuide=approvedFoodGuide(guide,["tofu_firm","banana","oats_raw"],{knownIds:["tofu_firm","banana","oats_raw"]});
assert.deepEqual(versionedGuide.approvedFoodIds,["banana","oats_raw","tofu_firm"]);
assert.equal(guide.approvedFoodIds,undefined,"Selections must not mutate editor source");
assert.throws(()=>approvedFoodGuide(guide,["banana"]),/no está seleccionado/);
assert.throws(()=>approvedFoodGuide(guide,["tofu_firm","tofu_firm"]),/duplicados/);
assert.throws(()=>approvedFoodGuide(guide,["tofu_firm","unknown"],{knownIds:["tofu_firm"]}),/inexistentes/);
assert.throws(()=>coachFoodChoicesFromDom({querySelectorAll:()=>[]}),/selección de alimentos/);
assert.deepEqual(coachFoodChoicesFromDom({querySelectorAll:()=>[
 {checked:true,dataset:{coachfood:"tofu_firm"}},{checked:false,dataset:{coachfood:"banana"}}
]}),["tofu_firm"]);
assert.deepEqual(validateCoachPlanProposal(goal,versionedGuide).guide.approvedFoodIds,versionedGuide.approvedFoodIds);
assert.equal(COACH_ATOMIC_PLAN_UI_ENABLED,false,"Release flag stays OFF until approved staging/JWT/legal QA");
assert.deepEqual(validateCoachPlanProposal(goal,guide).goal,goal);
for(const bad of [{...goal,kcal:"2100"},{...goal,protein_g:-1},{...goal,carb_g:20.5},{...goal,goal_type:"unlisted"}])
 assert.throws(()=>validateCoachPlanProposal(bad,guide));
for(const bad of [{...guide,meals:guide.meals.slice(1)},{...guide,meals:guide.meals.map((v,i)=>i===1?{...v,slot:"desayuno"}:v)},{...guide,meals:guide.meals.map((v,i)=>i===1?{...v,items:[{...food,qty:0}]}:v)}])
 assert.throws(()=>validateCoachPlanProposal(goal,bad));
let operations=0,consent=true,shared=true,stamp=WHEN,failRpc=null,rev=1,invalidRevisionResponse=null,returnedStudent=STU,returnedDraftStudent=STU,returnedDraftOrg=ORG,returnedIntakeOrg=ORG;
const calls=[];
const db={
 from(table){operations++;return {
  select(){return this;},eq(){return this;},not(){return this;},
  maybeSingle(){
   if(table==="efg_consents")return Promise.resolve({data:{accepted:consent},error:null});
   if(table==="efg_student_intakes")return Promise.resolve({data:shared?{student_id:returnedStudent,organization_id:returnedIntakeOrg,updated_at:stamp,shared_at:WHEN,dietary_pattern:"omnivore"}:null,error:null});
   if(table==="efg_coach_relaunch_intakes")return Promise.resolve({data:shared?{student_id:returnedStudent,organization_id:returnedIntakeOrg,updated_at:stamp,shared_at:WHEN,dietary_pattern:"omnivore",completed_version:"coach_major_2026_r1",revision:3}:null,error:null});
   if(table==="efg_coach_plan_drafts")return Promise.resolve({data:{student_id:returnedDraftStudent,organization_id:returnedDraftOrg,goal_proposal:goal,guide_proposal:guide,draft_revision:rev,status:"draft"},error:null});
   throw Error("Unrecognized table "+table);
  }
 };},
 async rpc(name,payload){operations++;calls.push({name,payload});if(failRpc)return {data:null,error:failRpc};if(name==="efg_save_coach_plan_draft")return {data:invalidRevisionResponse===null?rev:invalidRevisionResponse,error:null};if(name==="efg_publish_coach_plan_draft"||name==="efg_publish_coach_plan_draft_atomic")return {data:GOAL,error:null};throw Error("unexpected rpc "+name);}
};
const disabled=createCoachPlanDraftClient({sb:db});
await assert.rejects(()=>disabled.load(STU),/aún no habilitados/);
await assert.rejects(()=>disabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide}),/aún no habilitados/);
await assert.rejects(()=>disabled.publish({studentId:STU,expectedRevision:1,requestId:REQ,confirmed:true}),/aún no habilitados/);
assert.equal(operations,0,"OFF must not issue reads or writes");
const enabled=createCoachPlanDraftClient({sb:db,enabled:true}); // isolated synthetic test, never production flag
const loaded=await enabled.load(STU);
assert.equal(loaded.draft_revision,1);
returnedStudent="00000000-0000-4000-8000-000000000099";
await assert.rejects(()=>enabled.load(STU),/no compartió/,"Wrong-student intake must fail closed");
returnedStudent=STU;
returnedDraftStudent="00000000-0000-4000-8000-000000000099";
await assert.rejects(()=>enabled.load(STU),/no corresponde al alumno/,"Wrong-student draft must fail closed");
returnedDraftStudent=STU;
returnedDraftOrg="50000000-0000-4000-8000-000000000099";
await assert.rejects(()=>enabled.load(STU),/organización seleccionados/,"Wrong-organization draft must fail closed");
returnedDraftOrg=ORG;
returnedIntakeOrg=null;
await assert.rejects(()=>enabled.load(STU),/no compartió/,"Missing organization in shared intake must fail closed");
returnedIntakeOrg=ORG;
const saved=await enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide});
assert.deepEqual(saved,{studentId:STU,revision:1,sourceUpdatedAt:WHEN});
assert.deepEqual(calls[0],{name:"efg_save_coach_plan_draft",payload:{p_student:STU,p_goal:goal,p_guide:guide,p_intake_updated_at:WHEN,p_expected_revision:null}});
rev=2;
const updated=await enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide,expectedRevision:1});
assert.equal(updated.revision,2);
assert.equal(calls[1].payload.p_expected_revision,1);
for(const invalid of [true,"", " 2", "2.0", "1e2"]){
 invalidRevisionResponse=invalid;
 await assert.rejects(()=>enabled.save({studentId:STU,sourceUpdatedAt:WHEN,goal,guide,expectedRevision:2}),/revisión de borrador inválida/);
}
invalidRevisionResponse=null;
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
await assert.rejects(()=>enabled.publish({studentId:STU,expectedRevision:2,requestId:REQ,confirmed:true}),err=>err?.message?.includes("validación legal")===true);
failRpc=null;
await assert.rejects(()=>enabled.save({studentId:"other-student",sourceUpdatedAt:WHEN,goal,guide}),/Identificador de alumno inválido/);
await assert.rejects(()=>enabled.publish({studentId:STU,expectedRevision:2,requestId:"not-uuid",confirmed:true}),/Identificador único/);
// The major release uses COACH119 exclusively; its hosted RPC is NOT installed
// until evidence/consents/legal/release gates have been verified.
const relaunchBlocked=createCoachPlanDraftClient({sb:db,enabled:true,relaunchEnabled:true});
const noServerCalls=calls.length;
await assert.rejects(()=>relaunchBlocked.publish({studentId:STU,expectedRevision:2,requestId:REQ,confirmed:true}),
 /todavía no puede guardarse ni publicarse/);
assert.equal(calls.length,noServerCalls,"A non-verified versioned backend MUST make no write");
const versioned=createCoachPlanDraftClient({sb:db,enabled:true,relaunchEnabled:true,versionedBackendVerified:true});
const beforeMissingList=calls.length;
await assert.rejects(()=>versioned.save({
 studentId:STU,sourceUpdatedAt:WHEN,sourceRevision:3,goal,guide,expectedRevision:2
}),/seleccioná los alimentos aprobados/);
assert.equal(calls.length,beforeMissingList,"No RPC when approved catalog is missing");
const releaseDraft=await versioned.save({
 studentId:STU,sourceUpdatedAt:WHEN,sourceRevision:3,goal,guide:versionedGuide,expectedRevision:2
});
assert.equal(releaseDraft.sourceRevision,3);
assert.equal(calls.at(-1).name,"efg_save_coach_plan_draft");
assert.equal(calls.at(-1).payload.p_intake_revision,3);
await assert.rejects(()=>versioned.save({
 studentId:STU,sourceUpdatedAt:WHEN,sourceRevision:2,goal,guide:versionedGuide,expectedRevision:2
}),/modificada en otra sesión/);
const releasePublish=await versioned.publish({
 studentId:STU,expectedRevision:2,requestId:REQ,confirmed:true
});
assert.equal(releasePublish.goalId,GOAL);
assert.deepEqual(calls.at(-1),{name:"efg_publish_coach_plan_draft_atomic",payload:{
 p_student:STU,p_expected_revision:2,p_request_id:REQ
}});
assert.ok(!calls.slice(noServerCalls).some(x=>x.name==="efg_publish_coach_plan_draft"),
 "Current major release must NEVER fall back to old non-atomic RPC");
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const flow=readFileSync(new URL("../pilot/coach-intake-flow.js",import.meta.url),"utf8");
assert.match(app,/createCoachPlanDraftClient\(\{sb,enabled:COACH_ATOMIC_PLAN_UI_ENABLED,\s*versionedBackendVerified:COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED\}\)/,
 "Main app must pass backend-verification flag; no hardcoded false on GO");
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
assert.match(app,/function activeCoachGuideGoal\(\)\{[\s\S]*?COACH_ATOMIC_PLAN_UI_ENABLED[\s\S]*?state\.pendingGoal\|\|state\.pendingGoalRevision\?\.proposal\|\|null[\s\S]*?state\.coachGoals\[0\]\|\|null/,
 "Atomic drafts must choose only an unpublished Coach goal; legacy chooses the approved goal");
assert.doesNotMatch(app,/COACH_ATOMIC_PLAN_UI_ENABLED&&proposed\)\|\|state\.coachGoals\[0\]/,
 "Never fall back to an approved goal when atomic draft has no proposal");
assert.match(app,/const plan=state\.coachGuidedDraft,goal=activeCoachGuideGoal\(\)/,
 "Live five-meal deviation preview must use the active draft target");
assert.equal((app.match(/const goal=activeCoachGuideGoal\(\);/g)||[]).length,3,
 "Coach guide view, generator and rebalancer must share the draft-safe target");
assert.equal((app.match(/const targetGoal=activeCoachGuideGoal\(\);if\(!targetGoal\)return;/g)||[]).length,2,
 "Changing a food or quantity must refuse stale/absent atomic goal");
assert.match(app,/rebalanceGuidedDay\(swapGuidedFood\([\s\S]*?\),targetGoal\)/,
 "Food changes must rebalance against the current private goal");
assert.match(app,/state\.coachGuidedDraft=rebalanceGuidedDay\(draft,targetGoal\)/,
 "Quantity changes must rebalance against the current private goal");
assert.match(app,/const guide=state\.coachGuidedDraft\?readGuidedEditor\(\):state\.coachIntakeGuidePreview/,
 "Save the edited guide, not the stale auto-generated preview");
assert.match(app,/const active=saved\?\.status==="draft"&&coachDraftSourceCurrent\(intake,saved\)/,
 "Never offer a publish action from a stale intake revision");
assert.match(app,/state\.pendingGoal=\{\.\.\.savedDraft\.goal_proposal,student_id:studentId\}/,
 "Restore only the coach's versioned private draft");
assert.match(app,/coachDraftSourceCurrent\(state\.coachIntakeForms\[studentId\],savedDraft\)/,
 "Never restore a draft against a changed source intake");
assert.match(app,/COACH_ATOMIC_PLAN_UI_ENABLED\?'<p class="pilot-hint">Cuando termines, usá «Guardar borrador privado»/,
 "Staged GUI may not expose old approve-guide button");

assert.match(app,/approvedFoodGuide\(guide,coachFoodChoicesFromDom\(root\)/,
 "Coach must submit exactly the visible selected catalog");
assert.match(app,/COACH_ATOMIC_PLAN_UI_ENABLED&&state\.coachPlanDraftRecord\?\.guide_proposal\?\.approvedFoodIds/,
 "Reopened private draft must show the same approved catalog");
assert.match(app,/guide:finalGuide/,
 "Publish must compare the food selection against the saved draft");
// A server-side commit might succeed while the subsequent UI read fails.
// The request UUID MUST remain the same until readback/render completes.
const pubStart=app.indexOf('async function publishCoachAtomicDraft(){');
const pubEnd=app.indexOf('function activeCoachGuideGoal(){',pubStart);
assert.ok(pubStart>0&&pubEnd>pubStart);
const pub=app.slice(pubStart,pubEnd);
assert.ok(pub.indexOf('await loadStudentDetail(studentId);await render();')>=0);
assert.ok(pub.indexOf('state.coachPlanPublishRequestId=null;')>
 pub.indexOf('await loadStudentDetail(studentId);await render();'),
 "Do not drop an idempotency key before post-commit readback succeeds");
assert.match(pub,/state\.coachPlanPublishRequestId=state\.coachPlanPublishRequestId\|\|crypto\.randomUUID\(\)/,
 "Retry must reuse the original request ID");

console.log("PASS: Coach staged draft adapter OFF; validated five meals, versioned save, confirmed atomic publish, denial on revoked/stale/invalid identity; legacy guide and publish blocked under access schema (SYNTHETIC).");
