// NUT-50 · real pure path: shared intake -> calculator -> 5 meals -> private save -> review -> atomic RPC.
// Data and users in this file are SYNTHETIC. No Supabase connection, no medical approval.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createCoachCalculatorPrefill,coachGuidePreviewAllowed} from "../pilot/coach-intake-prefill.js";
import {estimateMacros} from "../pilot/macro-engine.js";
import {generateGuidedDay,validateGuidedDay,rebalanceGuidedDay} from "../pilot/guided-day.js";
import {validateCoachPlanProposal,createCoachPlanDraftClient,COACH_ATOMIC_PLAN_UI_ENABLED} from "../pilot/coach-plan-draft-client.js";
import {assessCoachDraftPublication} from "../pilot/coach-draft-review.js";

const student="00000000-0000-4000-8000-000000000011",other="00000000-0000-4000-8000-000000000022";
const stamp="2026-10-29T18:00:00.000Z",requestId="30000000-0000-4000-8000-000000000001",goalId="40000000-0000-4000-8000-000000000001";
const intake={student_id:student,shared_at:stamp,updated_at:stamp,age_years:41,height_cm:174,weight_kg:80,
 activity_level:"moderate",dietary_pattern:"omnivore",objective:"recomp",
 preferred_foods:"arroz",disliked_foods:"",meal_routine:"desayuno 7, cena 20"};
const prefill=createCoachCalculatorPrefill({studentId:student,intake,coachAuthorized:true});
assert.equal(prefill.sourceUpdatedAt,stamp);
assert.equal(prefill.fields.targetActivity,"1.5");
assert.equal(prefill.readyForAutomaticCalculation,false);
assert.equal(prefill.fields.targetSex,undefined,"Never infer equation sex from intake");
assert.equal(coachGuidePreviewAllowed(prefill,{studentId:student,consent:true}),true);
assert.equal(coachGuidePreviewAllowed(prefill,{studentId:other,consent:true}),false);
for(const diet of ["vegetarian","vegan","pescatarian","other","unknown"]){
 const p=createCoachCalculatorPrefill({studentId:student,intake:{...intake,dietary_pattern:diet},coachAuthorized:true});
 assert.equal(coachGuidePreviewAllowed(p,{studentId:student,consent:true}),false,"Unreviewed pattern must not generate animal menu");
}
const n=estimateMacros({age:+prefill.fields.targetAge,height:+prefill.fields.targetHeight,weight:+prefill.fields.targetWeight,
 activity:+prefill.fields.targetActivity,sex:"male",goal:prefill.fields.targetGoal,model:"mifflin",fatPerKg:.9});
const goal={goal_type:prefill.fields.targetGoal,kcal:n.kcal,protein_g:n.protein,carb_g:n.carbs,fat_g:n.fat,fiber_g:n.fiber};
for(const key of ["kcal","protein_g","carb_g","fat_g","fiber_g"])assert.ok(Number.isInteger(goal[key]),key+" integer from real macro engine");

const data={
 egg:[1.48,.124,.0096,.0996],bread:[2.47,.13,.41,.042],milk_skim:[.35,.034,.05,.001],coffee_black:[.001,0,0,0],
 yogurt:[.50,.042,.081,.0009],apple:[.52,.003,.138,.002],oats_raw:[3.89,.169,.663,.069],
 chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],pumpkin:[.34,.01,.08,.001],
 oil:[8.84,0,0,1],cheese:[2.17,.27,.017,.12],mandarin:[.53,.008,.133,.003],
 fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],rocket:[.25,.026,.037,.007]
};
const catalog=Object.entries(data).map(([id,[k,p,c,f]])=>({id,name:id,unit:id==="milk_skim"?"ml":"g",k,p,c,f,fi:0}));
const guide=generateGuidedDay(catalog,goal);
assert.equal(guide.meals.length,5);
validateGuidedDay(guide,goal);
const clean=validateCoachPlanProposal({...goal,student_id:student,estimation_method:"mifflin"},guide);
assert.deepEqual(clean.goal,goal,"No client metadata leaks to atomic goal");
assert.equal(clean.guide.kind,"five_meal_example");
assert.equal(COACH_ATOMIC_PLAN_UI_ENABLED,false,"Real integration flag must not be activated");

let serverDraft=null,consent=true,source=stamp,shared=true;
const calls=[];
const sb={
 from(table){
  return {select(){return this;},eq(){return this;},not(){return this;},
   maybeSingle(){
    calls.push({type:"read",table});
    if(table==="efg_consents")return Promise.resolve({data:{accepted:consent},error:null});
    if(table==="efg_student_intakes")return Promise.resolve({data:shared?{student_id:student,shared_at:stamp,updated_at:source}:null,error:null});
    if(table==="efg_coach_plan_drafts")return Promise.resolve({data:serverDraft,error:null});
    throw Error("Forbidden query "+table);
   }};
 },
 async rpc(name,args){
  calls.push({type:"rpc",name,args});
  if(name==="efg_save_coach_plan_draft"){
   const revision=(serverDraft?.draft_revision||0)+1;
   serverDraft={student_id:student,source_intake_updated_at:source,status:"draft",
    draft_revision:revision,goal_proposal:structuredClone(args.p_goal),guide_proposal:structuredClone(args.p_guide)};
   return {data:revision,error:null};
  }
  if(name==="efg_publish_coach_plan_draft"){
   serverDraft.status="published";
   return {data:goalId,error:null};
  }
  throw Error("Legacy or unapproved RPC: "+name);
 }
};
const off=createCoachPlanDraftClient({sb});
await assert.rejects(()=>off.save({studentId:student,sourceUpdatedAt:stamp,goal,guide}),/aún no habilitados/);
assert.equal(calls.length,0,"The production flag OFF must make zero queries");
const mock=createCoachPlanDraftClient({sb,enabled:true});
const result=await mock.save({studentId:student,sourceUpdatedAt:stamp,goal,guide});
assert.equal(result.revision,1);
assert.equal(calls.filter(x=>x.type==="rpc").length,1);
assert.equal(calls.at(-1).name,"efg_save_coach_plan_draft");
const loaded=await mock.load(student);
let assessment=assessCoachDraftPublication({studentId:student,intake,savedDraft:loaded,goal,guide});
assert.equal(assessment.ready,true,assessment.reason);
assert.equal(assessment.revision,1);
assert.equal(assessCoachDraftPublication({studentId:other,intake,savedDraft:loaded,goal,guide}).ready,false,"Cross-student draft not publishable");
assert.equal(assessCoachDraftPublication({studentId:student,intake:{...intake,updated_at:"2026-10-29T18:01:00Z"},savedDraft:loaded,goal,guide}).ready,false,"Outdated intake");
assert.equal(assessCoachDraftPublication({studentId:student,intake:{...intake,shared_at:null},savedDraft:loaded,goal,guide}).ready,false,"Revoked shared intake");
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:{...loaded,status:"published"},goal,guide}).ready,false,"Already published");

const edited=structuredClone(guide);edited.meals[0].items[0].qty+=5;
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:loaded,goal,guide:edited}).ready,false,"Unsaved quantity change");
const newGoal={...goal,kcal:goal.kcal+50};
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:loaded,goal:newGoal,guide}).ready,false,"Unsaved energy change");
const noteEdited={...guide,supplementNote:"Sin suplementos"};
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:loaded,goal,guide:noteEdited}).ready,false,"Unsaved supplement note");
const reordered=structuredClone(loaded);reordered.goal_proposal={fiber_g:goal.fiber_g,fat_g:goal.fat_g,carb_g:goal.carb_g,
 protein_g:goal.protein_g,kcal:goal.kcal,goal_type:goal.goal_type};
reordered.guide_proposal={supplementNote:guide.supplementNote,meals:guide.meals,kind:guide.kind,version:guide.version,createdFrom:guide.createdFrom};
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:reordered,goal,guide}).ready,true,"JSONB key order must not create false mismatch");

const newSaved=await mock.save({studentId:student,sourceUpdatedAt:stamp,goal,guide:edited,expectedRevision:1});
assert.equal(newSaved.revision,2);
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:await mock.load(student),goal,guide:edited}).ready,true);
await assert.rejects(()=>mock.publish({studentId:student,expectedRevision:2,requestId,confirmed:false}),/aprobación explícita/);
const pub=await mock.publish({studentId:student,expectedRevision:2,requestId,confirmed:true});
assert.equal(pub.goalId,goalId);
assert.deepEqual(calls.filter(x=>x.type==="rpc").map(x=>x.name),["efg_save_coach_plan_draft","efg_save_coach_plan_draft","efg_publish_coach_plan_draft"]);
assert.equal(assessCoachDraftPublication({studentId:student,intake,savedDraft:serverDraft,goal,guide:edited}).ready,false,"No re-publication after successful commit");

const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
assert.match(app,/import \{assessCoachDraftPublication\} from "\.\/coach-draft-review/);
assert.match(app,/const review=assessCoachDraftPublication\(\{studentId,intake,savedDraft:draft,goal,guide\}\)/);
assert.match(app,/if\(!review\.ready\)throw Error\(review\.reason\)/);
assert.match(app,/state\.coachGuidedDraft\?readGuidedEditor\(\):state\.coachIntakeGuidePreview/);
assert.match(app,/COACH_ATOMIC_PLAN_UI_ENABLED&&proposed/);
assert.match(app,/if\(COACH_ATOMIC_PLAN_UI_ENABLED\)/);
console.log("PASS NUT-50: real pure prefill/calculator/5 meals + synthetic private save/reload/revision/publish with exact-contents guard; OFF for live app.");
