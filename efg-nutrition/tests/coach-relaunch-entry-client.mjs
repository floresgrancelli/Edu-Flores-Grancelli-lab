// COACH relaunch client synthetic contract; no real database.
import assert from "node:assert/strict";
import {COACH_RELAUNCH_ONBOARDING_ENABLED,COACH_RELEASE_INTAKE_VERSION} from "../pilot/coach-relaunch-onboarding.js";
import {loadCoachRelaunchEntry,renderCoachRelaunchEntry,readCoachRelaunchForm,submitCoachRelaunchEntry} from "../pilot/coach-relaunch-entry-client.js";
assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false);
const uid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",org="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const profile={user_id:uid,organization_id:org,role:"student",active:true};
const legal=[{document_id:"terms",version:"1",accepted:true},{document_id:"privacy",version:"1",accepted:true}];
let status=null,allowed=false,queries=0,writes=0;
const sb={
 rpc(name,payload){
  if(name==="efg_legal_current_status")
   return Promise.resolve({data:allowed?legal:[{...legal[0],accepted:false},legal[1]],error:null});
  assert.equal(name,"efg_submit_coach_relaunch_intake");
  writes++;
  assert.equal(payload.p_expected_revision,0);
  status={student_id:uid,organization_id:org,completed_version:COACH_RELEASE_INTAKE_VERSION,revision:1};
  return Promise.resolve({data:1,error:null});
 },
 from(t){
  queries++;assert.equal(t,"efg_coach_relaunch_intakes");
  return {select(){return this},eq(k,v){assert.ok(k==="student_id"&&v===uid||k==="completed_version"&&v===COACH_RELEASE_INTAKE_VERSION);return this},
   maybeSingle(){return Promise.resolve({data:status,error:null})}};
 }
};
await assert.rejects(()=>loadCoachRelaunchEntry(sb,{profile:{...profile,role:"coach"},userId:uid}),/verificar/);
let gate=await loadCoachRelaunchEntry(sb,{profile,userId:uid});
assert.equal(gate.route,"legal");
assert.equal(queries,0,"Documents verified before querying intake.");
allowed=true;gate=await loadCoachRelaunchEntry(sb,{profile,userId:uid});
assert.equal(gate.route,"intake");
const html=renderCoachRelaunchEntry(gate);
assert.match(html,/Conozcámonos de nuevo/);
assert.match(html,/Confirmar mi ficha nueva/);
assert.match(html,/Autorizo compartir/);
assert.doesNotMatch(html,/id="coachRelaunch_share"[^>]+checked/);
const fields={
 objective:{value:"recomp"},age_years:{value:"41"},height_cm:{value:"174"},
 weight_kg:{value:"80.5"},activity_level:{value:"moderate"},
 dietary_pattern:{value:"vegetarian"},preferred_foods:{value:"Arroz"},
 disliked_foods:{value:""},meal_routine:{value:""},notes:{value:""},share:{checked:false}
};
const doc={getElementById:id=>fields[id.replace("coachRelaunch_","")]||null};
const form=readCoachRelaunchForm(doc);
assert.equal(form.shareWithCoach,false);
assert.equal(form.payload.weight_kg,80.5);
assert.ok(!("student_id" in form.payload)&&!("health_flags" in form.payload));
await assert.rejects(()=>submitCoachRelaunchEntry(sb,{profile,userId:uid,entry:gate,...form}),/Verificá/);
assert.equal(writes,0);
const done=await submitCoachRelaunchEntry(sb,{profile,userId:uid,entry:gate,...form,explicitSubmit:true});
assert.equal(done.route,"ready");
assert.equal(renderCoachRelaunchEntry(done),"");
assert.equal(writes,1);
await assert.rejects(()=>submitCoachRelaunchEntry(sb,{profile,userId:uid,entry:done,...form,explicitSubmit:true}),/Verificá/);
fields.age_years.value="17";assert.throws(()=>readCoachRelaunchForm(doc),/Revisá/);fields.age_years.value="41";
fields.dietary_pattern.value="invalid";assert.throws(()=>readCoachRelaunchForm(doc),/Opción/);
const source=await (await import("node:fs/promises")).readFile(
 new URL("../pilot/pilot.js",import.meta.url),"utf8");
const roleGuard=source.indexOf('if(state.profile.role==="student"&&COACH_RELAUNCH_ONBOARDING_ENABLED)',source.indexOf("async function render()"));
const welcome=source.indexOf("if(state.welcomePending)return welcomeView()",source.indexOf("async function render()"));
assert.ok(roleGuard>0&&welcome>roleGuard,"The new Coach versioned intake precedes legacy student welcome/navigation.");
const start=source.indexOf('if(state.profile.role==="student"&&COACH_RELAUNCH_ONBOARDING_ENABLED)',source.indexOf("async function refresh()"));
const legacy=source.indexOf('await Promise.all([loadPersonalData(),loadOrgAndPayments()])',start);
assert.ok(start>0&&legacy>start,"Intake/legal checks precede legacy data fetches for returning students.");
assert.match(source,/if\(e.target.id==="efgCoachRelaunchForm"\)/);
assert.match(source,/await submitCoachRelaunchEntry\(sb,/);
assert.match(source,/COACH_RELAUNCH_ONBOARDING_ENABLED\}/);
console.log("PASS Coach re-entry UI synthetic: Terms first, fresh unsigned form, explicit share-off, no implicit save, signed backend readback required.");
