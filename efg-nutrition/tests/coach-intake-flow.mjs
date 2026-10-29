// EFG Nutrition Pro · synthetic Coach intake tests (no network, no real users).
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createCoachIntakeFlow} from "../pilot/coach-intake-flow.js";
const [app,sql,css]=await Promise.all([
 readFile(new URL("../pilot/pilot.js",import.meta.url),"utf8"),
 readFile(new URL("../migrations/20261029_coach_intake_plan_access_DRAFT.sql",import.meta.url),"utf8"),
 readFile(new URL("../pilot/coach-experience.css",import.meta.url),"utf8")
]);
const esc=s=>String(s).replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const state={profile:{role:"student",organization_id:"org-fixture"},session:{user:{id:"student-fixture"}},
 studentIntake:null,planAccess:null,planAccessSupported:false,consent:null,coachGoals:[],coachFoodPlan:null};
let schemaMissing=false,stored=null,writeCount=0,rpcCount=0,refreshCount=0,confirmCount=0;
const submitted=[],calledRpc=[];
const db={
 from(table){
  return {
   select(){return this;},eq(){return this;},
   maybeSingle(){
    if(table==="efg_student_plan_access")return Promise.resolve({
     data:schemaMissing?null:{status:"pending"},
     error:schemaMissing?{code:"PGRST205"}:null
    });
    if(table==="efg_student_intakes")return Promise.resolve({data:stored,error:null});
    throw Error("Unexpected table read: "+table);
   },
   upsert(row,{onConflict}){
    assert.equal(table,"efg_student_intakes");
    assert.equal(onConflict,"student_id");
    writeCount++;submitted.push({...row});stored={...row};return Promise.resolve({error:null});
   }
  };
 },
 rpc(name,payload){rpcCount++;calledRpc.push({name,payload});return Promise.resolve({error:null});}
};
const notifications=[];
let renders=0;
const flow=createCoachIntakeFlow({sb:db,state,escapeHTML:esc,rootText:(a,b)=>a+" | "+b,
 notify:message=>notifications.push(message),render:()=>{renders++;},
 refresh:()=>{refreshCount++;}});
await flow.loadStudent();
assert.equal(flow.pending(),true);
assert.match(flow.view(),/Mi ficha inicial/);
assert.match(flow.view(),/Autorizo compartir/);
assert.match(flow.view(),/Abrir mensajes/);
assert.match(flow.view(),/Estamos preparando tu plan/);
assert.equal(state.planAccess.status,"pending");

// User may save a completely voluntary, private intake. No share consent is implied.
const fields={
 efgIntakeObjective:{value:"recomp"},efgIntakeAge:{value:"41"},
 efgIntakeHeight:{value:"174.0"},efgIntakeWeight:{value:"80.5"},
 efgIntakeActivity:{value:"moderate"},efgIntakeNotes:{value:"Horarios ficticios"},
 efgIntakeShare:{checked:false}
};
globalThis.document={getElementById:id=>fields[id]||null};
await flow.save();
assert.equal(writeCount,1);
assert.equal(submitted[0].student_id,"student-fixture");
assert.equal(submitted[0].organization_id,"org-fixture");
assert.equal(submitted[0].shared_at,null,"Private draft must never be shared by default");
assert.equal(submitted[0].weight_kg,80.5);
assert.equal(submitted[0].age_years,41);
assert.equal(notifications.at(-1),"Ficha privada guardada.");

// Consent must be explicit; revoking it sets shared_at=null, including after a previous share.
fields.efgIntakeShare.checked=true;
await flow.save();
assert.equal(writeCount,2);
assert.ok(submitted[1].shared_at,"Explicit share creates a share timestamp");
assert.equal(notifications.at(-1),"Ficha guardada y compartida.");
fields.efgIntakeShare.checked=false;
await flow.save();
assert.equal(writeCount,3);
assert.equal(submitted[2].shared_at,null,"Revocation must clear share permission");
assert.equal(state.studentIntake.shared_at,null);
assert.equal(renders,3);

// Reject invalid fields before writing. This is UX validation, not a substitute for RLS.
fields.efgIntakeAge.value="17";
await assert.rejects(()=>flow.save(),/Revisá el campo efgIntakeAge/);
assert.equal(writeCount,3);
fields.efgIntakeAge.value="41";
fields.efgIntakeObjective.value="malicious-unlisted-goal";
await assert.rejects(()=>flow.save(),/Objetivo inválido/);
assert.equal(writeCount,3);
fields.efgIntakeObjective.value="recomp";

// No silent publication: absent coach authorization or incomplete guide cannot call RPC.
globalThis.window={confirm:()=>{confirmCount++;return true;}};
state.selectedStudent="student-fixture";
state.coachGoals=[{id:"goal-fixture"}];
state.coachFoodPlan={guided_goal_id:"goal-fixture",guided_plan:{meals:[]},guided_plan_approved_at:"2026-10-29T00:00:00Z"};
await assert.rejects(()=>flow.publish(),/Primero aprobá/);
assert.equal(rpcCount,0);
state.consent={accepted:true};
state.coachFoodPlan.guided_plan_approved_at=null;
await assert.rejects(()=>flow.publish(),/Primero aprobá/);
assert.equal(rpcCount,0);
state.coachFoodPlan.guided_plan_approved_at="2026-10-29T00:00:00Z";
globalThis.window.confirm=()=>{confirmCount++;return false;};
await flow.publish();
assert.equal(rpcCount,0,"Cancelled publish cannot invoke server RPC");
globalThis.window.confirm=()=>{confirmCount++;return true;};
await flow.publish();
assert.equal(rpcCount,1);
assert.deepEqual(calledRpc[0],{name:"efg_publish_coach_plan",
 payload:{p_student:"student-fixture",p_goal_id:"goal-fixture"}});
assert.equal(refreshCount,1);
assert.equal(notifications.at(-1),"Plan publicado. El alumno ya puede utilizar las herramientas nutricionales.");
assert.equal(confirmCount,2);

// Prior-schema compatibility for historical accounts. Backend authorization is authoritative.
schemaMissing=true;await flow.loadStudent();
assert.equal(state.planAccessSupported,false);
assert.equal(flow.pending(),false);
assert.match(app,/if\(studentPlanPending\(\)\&\&!\["intake","messages","privacy","notifications"\]/);
assert.match(app,/data-act="publishCoachStudentPlan"/);
assert.match(app,/coachIntakeFlow\.loadCoach/);
assert.match(app,/coachIntakeFlow\.loadStudent/);
assert.match(app,/coachIntakeFlow\.details/);
assert.match(css,/efg-intake-share-label/);
assert.match(sql,/create table public\.efg_student_intakes/);
assert.match(sql,/create table public\.efg_student_plan_access/);
assert.match(sql,/create function public\.efg_publish_coach_plan/);
assert.match(sql,/f\.guided_goal_id=p_goal_id/);
assert.match(sql,/as restrictive for insert/);
assert.match(sql,/as restrictive for update/);
assert.match(sql,/as restrictive for delete/);
assert.match(sql,/where p\.role='student' and o\.coach_id is not null/);
assert.match(sql,/new\.role <> 'student'/);
assert.match(sql,/shared_at is not null and efg_private\.coach_has_student/);
assert.match(sql,/f\\.guided_plan->>'kind'='five_meal_example'/,"Published guide must have correct kind");
assert.match(sql,/jsonb_array_length\\(f\\.guided_plan->'meals'\\)=5/,"Published guide must have five slots");
assert.match(sql,/count\\(distinct m\\.meal->>'slot'\\)=5/,"Published guide must have five distinct slots");
assert.match(sql,/jsonb_array_length\\(m\\.meal->'items'\\) between 1 and 15/,"Published meals need nonempty item arrays");
console.log("EFG Coach: synthetic private draft, explicit share/revoke, invalid fields, confirm/cancel/publish RPC, pending/legacy paths PASS. RLS/staging E2E not claimed.");
