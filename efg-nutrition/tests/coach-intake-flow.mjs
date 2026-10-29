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
 studentIntake:null,planAccess:null,planAccessSupported:false,consent:null,coachGoals:[],coachFoodPlan:null,coachIntakeForms:{},coachIntakeAccess:{}};
let schemaMissing=false,serverStatus="pending",stored=null,writeCount=0,deleteCount=0,deletedStudent=null,rpcCount=0,refreshCount=0,confirmCount=0;
const submitted=[],calledRpc=[];
const db={
 from(table){
  return {
   select(){return this;},eq(){return this;},not(){return this;},
   maybeSingle(){
    if(table==="efg_student_plan_access")return Promise.resolve({
     data:schemaMissing?null:{status:serverStatus},
     error:schemaMissing?{code:"PGRST205"}:null
    });
    if(table==="efg_student_intakes")return Promise.resolve({data:stored,error:null});
    throw Error("Unexpected table read: "+table);
   },
   upsert(row,{onConflict}){
    assert.equal(table,"efg_student_intakes");
    assert.equal(onConflict,"student_id");
    writeCount++;submitted.push({...row});stored={...row};return Promise.resolve({error:null});
   },
   delete(){
    assert.equal(table,"efg_student_intakes","Erasure may only target the optional intake");
    return {eq(field,value){
     assert.equal(field,"student_id");assert.equal(value,"student-fixture");
     deleteCount++;deletedStudent=value;stored=null;return Promise.resolve({error:null});
    }};
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
 efgIntakeActivity:{value:"moderate"},efgIntakeDiet:{value:"vegetarian"},
 efgIntakePreferred:{value:"Legumbres, arroz, frutas"},
 efgIntakeDisliked:{value:"Morrón (solo por gusto)"},
 efgIntakeSchedule:{value:"Desayuno 7:00; almuerzo 13:00"},
 efgIntakeNotes:{value:"Horarios ficticios"},
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
assert.equal(submitted[0].dietary_pattern,"vegetarian");
assert.equal(submitted[0].preferred_foods,"Legumbres, arroz, frutas");
assert.equal(submitted[0].disliked_foods,"Morrón (solo por gusto)");
assert.equal(submitted[0].meal_routine,"Desayuno 7:00; almuerzo 13:00");
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
fields.efgIntakeDiet.value="invalid-disorder";
await assert.rejects(()=>flow.save(),/Patrón alimentario inválido/);
assert.equal(writeCount,3);
fields.efgIntakeDiet.value="vegetarian";
fields.efgIntakePreferred.value="x".repeat(401);
await assert.rejects(()=>flow.save(),/400 caracteres/);
assert.equal(writeCount,3);
fields.efgIntakePreferred.value="Legumbres, arroz, frutas";
assert.match(flow.view(),/La celiaquía, diabetes, hipertensión, alergias/);
assert.match(flow.view(),/Mis horarios de comida/);

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

// Sharing can be withdrawn even AFTER the coach published a plan.
serverStatus="published";
fields.efgIntakeShare.checked=true;
await flow.save();
assert.ok(stored.shared_at);
await flow.loadStudent();
assert.equal(flow.pending(),false);
assert.equal(state.studentIntake.shared_at,stored.shared_at,"Published users must still see their intake");
assert.match(flow.view(),/Mi ficha y mis permisos/);
assert.doesNotMatch(flow.view(),/Estamos preparando tu plan/);
assert.match(flow.view(),/Volver a MI DÍA/);
fields.efgIntakeShare.checked=false;
await flow.save();
assert.equal(stored.shared_at,null,"Published student can revoke consent in their own intake");
assert.match(app,/Revisar mi ficha y su permiso/,"Published students need a privacy route to their intake");
assert.match(app,/data-tab="intake"/,"Privacy route must remain accessible after publication");
assert.equal(writeCount,5);
assert.equal(state.studentIntake.shared_at,null);

// Erasure is a separate, strictly voluntary action and must not impact plan status.
fields.efgIntakeShare.checked=true;
await flow.save(); // Re-share a fake draft so the DELETE also removes its sharing.
assert.ok(stored.shared_at);
await flow.refreshCoachDetail("student-fixture",true);
assert.match(flow.details("student-fixture"),/Ficha inicial compartida/,"Coach can view current, explicitly shared fake intake");
assert.match(flow.details("student-fixture"),/Patrón alimentario/);
assert.match(flow.details("student-fixture"),/Vegetariano/);
assert.match(flow.details("student-fixture"),/Legumbres, arroz, frutas/);
assert.match(flow.view(),/Eliminar solamente mi ficha inicial/);
globalThis.window.confirm=()=>false;
await flow.deleteOwn();
assert.equal(deleteCount,0,"Cancelled erasure cannot delete records");
assert.ok(state.studentIntake.shared_at);
globalThis.window.confirm=()=>true;
await flow.deleteOwn();
assert.equal(deleteCount,1);
assert.equal(deletedStudent,"student-fixture");
assert.equal(stored,null);
assert.equal(state.studentIntake,null);
await flow.refreshCoachDetail("student-fixture",true);
assert.equal(flow.details("student-fixture"),"","Coach must not display cached intake after it was deleted");
state.coachIntakeForms["student-fixture"]={notes:"stale fixture",shared_at:"2026-10-29T00:00:00Z"};
await flow.refreshCoachDetail("student-fixture",false);
assert.equal(flow.details("student-fixture"),"","Revoked coach-following consent clears cached intake");
assert.match(app,/await coachIntakeFlow\.refreshCoachDetail\(studentId,c\.data\?\.accepted===true\)/,
 "Coach must revalidate consented intake when opening a pupil");
assert.equal(state.planAccess.status,"published","Erasing intake must never unpublish the plan");
assert.doesNotMatch(flow.view(),/Eliminar solamente mi ficha inicial/,"No delete option when there is no intake");
assert.equal(notifications.at(-1),"Tu ficha inicial se eliminó. El seguimiento nutricional conserva sus propios permisos.");
assert.match(app,/if\(action==="deleteStudentIntake"\)return coachIntakeFlow\.deleteOwn\(\)/,"Delete button must be wired to the real action");

// Prior-schema compatibility for historical accounts. Backend authorization is authoritative.
schemaMissing=true;await flow.loadStudent();
assert.equal(state.planAccessSupported,false);
assert.equal(flow.pending(),false);
assert.match(app,/if\(studentPlanPending\(\)\&\&!\["intake","messages","privacy","notifications"\]/);
assert.match(app,/data-act="balanceGuidedDay">Recalcular con nuevos pesos y\/o ingredientes/,
 "The coach needs a clearly named explicit recalculation control");
assert.match(app,/if\(e.target.dataset.guideswap\)[\s\S]*?rebalanceGuidedDay\(swapGuidedFood/,
 "Changing a food should automatically rebalance the other adjustable portions");
assert.match(app,/if\(e.target.dataset.guideqty\)[\s\S]*?rebalanceGuidedDay\(draft,state.coachGoals\[0\]\)/,
 "Changing grams should automatically rebalance the other adjustable portions");
assert.match(app,/function guidedTargetFeedback\(deviations\)/,
 "Show how close the guide got to the approved target; never imply exact matching");
assert.match(app,/data-guidetargetstatus role="status"/,
 "A visible and accessible guide-target progress status is required");
assert.match(app,/data-act="publishCoachStudentPlan"/);
assert.match(app,/coachIntakeFlow\.loadCoach/);
assert.match(app,/coachIntakeFlow\.loadStudent/);
assert.match(app,/coachIntakeFlow\.details/);
assert.match(css,/efg-intake-share-label/);
assert.match(sql,/create table public\.efg_student_intakes/);
assert.match(sql,/create table public\.efg_student_plan_access/);
assert.match(sql,/dietary_pattern text check/,"Dietary pattern must be constrained server-side");
assert.match(sql,/char_length\(preferred_foods\)<=400/);
assert.match(sql,/char_length\(disliked_foods\)<=400/);
assert.match(sql,/char_length\(meal_routine\)<=400/);
assert.match(sql,/lock table public\.efg_profiles in share row exclusive mode/,"Profile backfill must be protected from concurrent new student inserts");
assert.match(sql,/Legacy student access backfill incomplete/,"Incomplete legacy mapping must abort the transaction");
assert.doesNotMatch(sql,/end \$;/,"Draft SQL must never close a DO block with a lone dollar sign");
assert.equal((sql.match(/\$\$/g)||[]).length%2,0,"Draft SQL dollar-quoted blocks must have matching delimiters");

assert.match(sql,/grant select,insert,update,delete on public\.efg_student_intakes to authenticated/);
assert.match(sql,/create policy intake_student_delete on public\.efg_student_intakes/,"Student deletion needs owner-only RLS");

// An approved five-meal guide must be approved AGAIN after its items or goal change.
// Static contract only; run actual BEFORE UPDATE trigger with two role JWTs in staging.
assert.match(sql,/create function efg_private\.invalidate_stale_guided_approval\(\)/);
assert.match(sql,/create trigger efg_guard_guided_approval_update/);
const approvalTriggerSql=sql.slice(sql.indexOf("create function efg_private.invalidate_stale_guided_approval()"),sql.indexOf("create trigger efg_guard_guided_approval_update"));
const sqlDollarPair=String.fromCharCode(36,36);
assert.ok(approvalTriggerSql.includes("as "+sqlDollarPair+"\nbegin"),"PL/pgSQL trigger must open a valid dollar-quoted body");
assert.ok(approvalTriggerSql.includes("end "+sqlDollarPair+";"),"PL/pgSQL trigger must close a valid dollar-quoted body");

assert.match(sql,/before update of guided_plan,guided_goal_id,guided_plan_approved_at/);
assert.match(sql,/new\.guided_plan is distinct from old\.guided_plan/);
assert.match(sql,/new\.guided_goal_id is distinct from old\.guided_goal_id/);
assert.match(sql,/new\.guided_plan_approved_at is not distinct from old\.guided_plan_approved_at/);
assert.match(sql,/new\.guided_plan_approved_at := null;/);
// Staging DRAFT: reject zero/missing/invalid per-item nutrient and amount fields at publish.
assert.match(sql,/create function efg_private\.coach_guide_items_valid\(p_guide jsonb\)/);
assert.match(sql,/and efg_private\.coach_guide_items_valid\(f\.guided_plan\)/);
assert.match(sql,/jsonb_typeof\(v_item->'qty'\) is distinct from 'number'/);
assert.match(sql,/foreach v_nutrient in array array\['k','p','c','f','fi'\]/);
assert.match(sql,/jsonb_typeof\(v_item->v_nutrient\) is distinct from 'number'/);
assert.match(sql,/if v_value<=0 or v_value>1000 then return false;/);
assert.match(app,/if\(food.qty!==qty\)\{food.qty=qty;food.locked=true;\}/,
 "The coach's changed portion must remain locked even without a preceding input event");
assert.match(sql,/create function public\.efg_publish_coach_plan/);
assert.match(sql,/f\.guided_goal_id=p_goal_id/);
assert.match(sql,/as restrictive for insert/);
assert.match(sql,/as restrictive for update/);
assert.match(sql,/as restrictive for delete/);
assert.match(sql,/where p\.role='student' and o\.coach_id is not null/);
assert.match(sql,/new\.role <> 'student'/);
assert.match(sql,/shared_at is not null and efg_private\.coach_has_student/);
assert.match(sql,/f\.guided_plan->>'kind'='five_meal_example'/,"Published guide must have correct kind");
assert.match(sql,/jsonb_array_length\(f\.guided_plan->'meals'\)=5/,"Published guide must have five slots");
assert.match(sql,/count\(distinct m\.meal->>'slot'\)=5/,"Published guide must have five distinct slots");
assert.match(sql,/jsonb_array_length\(m\.meal->'items'\) between 1 and 15/,"Published meals need nonempty item arrays");
console.log("EFG Coach: synthetic private draft, explicit share/revoke, invalid fields, confirm/cancel/publish RPC, pending/legacy paths PASS. RLS/staging E2E not claimed.");
