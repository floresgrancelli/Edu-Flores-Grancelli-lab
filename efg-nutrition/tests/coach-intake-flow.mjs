import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createCoachIntakeFlow} from "../pilot/coach-intake-flow.js";
const [app,sql,css]=await Promise.all([
 readFile(new URL("../pilot/pilot.js",import.meta.url),"utf8"),
 readFile(new URL("../migrations/20261029_coach_intake_plan_access_DRAFT.sql",import.meta.url),"utf8"),
 readFile(new URL("../pilot/coach-experience.css",import.meta.url),"utf8")
]);
const state={profile:{role:"student",organization_id:"org1"},session:{user:{id:"s1"}},studentIntake:null,planAccess:null,planAccessSupported:false};
const esc=s=>String(s).replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
let failures=false;
const db={from(table){
 return {select(){return this;},eq(){return this;},maybeSingle(){
  if(table==="efg_student_plan_access")return Promise.resolve({data:failures?null:{status:"pending"},error:failures?{code:"PGRST205"}:null});
  if(table==="efg_student_intakes")return Promise.resolve({data:{objective:"recomp",notes:"Test only",shared_at:null},error:null});
  throw Error("Unexpected read "+table);
 }};
}};
const flow=createCoachIntakeFlow({sb:db,state,escapeHTML:esc,rootText:(a,b)=>a+" | "+b,notify(){},render(){},refresh(){}});
await flow.loadStudent();
assert.equal(flow.pending(),true);
assert.match(flow.view(),/Mi ficha inicial/);
assert.match(flow.view(),/Autorizo compartir/);
assert.match(flow.view(),/Abrir mensajes/);
assert.match(flow.view(),/Estamos preparando tu plan/);
assert.equal(state.planAccess.status,"pending");
failures=true;await flow.loadStudent();
assert.equal(state.planAccessSupported,false,"Without an activated schema existing accounts retain original UX");
assert.equal(flow.pending(),false);
assert.match(app,/if\(studentPlanPending\(\)\&\&!\["intake","messages","privacy","notifications"\]/,"Pending students routed to intake");
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
assert.match(sql,/where p\.role='student' and o\.coach_id is not null/,"Legacy students backfilled");
assert.match(sql,/new\.role <> 'student'/,"New student gets pending status");
assert.match(sql,/shared_at is not null and efg_private\.coach_has_student/,"Coach can only read shared intakes with active consent");
console.log("EFG Coach intake: pending gate, older-schema compatibility, voluntary sharing and SQL safeguards verified with fixtures.");
