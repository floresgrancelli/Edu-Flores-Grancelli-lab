// Offline contract for stopgap only: real RLS/JWT/staging tests still required.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assertCoachGoalWriteSafe} from "../pilot/coach-goal-write-gate.js";
const calls=[];
const sb=(result)=>({from(table){
 assert.equal(table,"efg_student_plan_access","Check server plan-access status, never only local UI flags.");
 return {select(cols){assert.equal(cols,"student_id,status");return this;},eq(col,id){
 assert.equal(col,"student_id");calls.push(id);return this;
 },maybeSingle:async()=>result};
}});
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:{status:"pending"},error:null}),{studentId:"new"}),/Objetivo no guardado/);
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:{status:"published"},error:null}),{studentId:"historical"}),/Objetivo no guardado/);
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:{status:"paused"},error:null}),{studentId:"paused"}),/Objetivo no guardado/);
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:null,error:null}),{studentId:"missing-record"}),/Objetivo no guardado/);
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:null,error:{code:"42501",message:"permission denied"}}),{studentId:"rls-deny"}),error=>error?.code==="42501"&&error.message==="permission denied");
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:null,error:{code:"PGRST116",message:"not found"}}),{studentId:"failed"}),error=>error?.code==="PGRST116"&&error.message==="not found");
for(const code of ["42P01","PGRST205"]){
 assert.deepEqual(await assertCoachGoalWriteSafe(sb({data:null,error:{code}}),{studentId:"legacy"}),{legacy:true});
 await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:null,error:{code}}),{studentId:"new-intake",fromSharedIntake:true}),/ficha compartida/);
}
await assert.rejects(()=>assertCoachGoalWriteSafe(sb({data:null,error:null}),{}),/a qué alumno/);
assert.equal(calls.length,10);
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
assert.match(app,/import \{assertCoachGoalWriteSafe\} from "\.\/coach-goal-write-gate\.js/);
assert.match(app,/await assertCoachGoalWriteSafe\(sb,\{studentId,fromSharedIntake:/);
assert.match(app,/await assertCoachGoalWriteSafe\(sb,\{studentId:pending\.studentId\}\)/);
assert.match(app,/goalWriteBlocked\?'<div class="pilot-alert"/);
assert.match(app,/approveGoalButton"\)\.disabled=!!\(state\.coachIntakePrefill/);
assert.equal((app.match(/from\("efg_goals"\)\.insert\(/g)||[]).length,2,"Only two direct Coach write paths exist; review if new ones are added.");
const lines=app.split("\n");
for(const [i,line] of lines.entries())if(line.includes('from("efg_goals").insert('))
 assert.ok(lines.slice(Math.max(0,i-3),i).some(x=>x.includes("await assertCoachGoalWriteSafe(")),
  "Every direct goal write must have a fail-closed guard directly before insert.");
console.log("PASS: Coach goal write stopgap denies pending/published/paused/new cohort; preserves pre-migration legacy only. NOT a DB security control.");
