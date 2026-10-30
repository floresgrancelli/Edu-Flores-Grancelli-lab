// COACH relaunch client synthetic contract; no real database.
import assert from "node:assert/strict";
import {COACH_RELAUNCH_ONBOARDING_ENABLED,COACH_RELEASE_INTAKE_VERSION} from "../pilot/coach-relaunch-onboarding.js";
import {loadCoachRelaunchEntry,renderCoachRelaunchEntry,readCoachRelaunchForm,submitCoachRelaunchEntry,revokeCoachRelaunchSharing,clearCoachRelaunchData,currentCoachRelaunchPayload} from "../pilot/coach-relaunch-entry-client.js";
import {createCoachCalculatorPrefill} from "../pilot/coach-intake-prefill.js";
assert.equal(COACH_RELAUNCH_ONBOARDING_ENABLED,false);
const uid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",org="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const profile={user_id:uid,organization_id:org,role:"student",active:true};
const legal=[{kind:"terms",document_id:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",version:"1",sha256:"a".repeat(64),accepted:true},
 {kind:"privacy",document_id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",version:"1",sha256:"b".repeat(64),accepted:true}];
let status=null,allowed=false,queries=0,writes=0,selectedProjection="";
const sb={
 rpc(name,payload){
  if(name==="efg_legal_current_status")
   return Promise.resolve({data:allowed?legal:[{...legal[0],accepted:false},legal[1]],error:null});
  assert.equal(name,"efg_submit_coach_relaunch_intake");
  writes++;
  assert.equal(payload.p_expected_revision,status?.revision||0);
  const revision=(status?.revision||0)+1;
  status={student_id:uid,organization_id:org,completed_version:COACH_RELEASE_INTAKE_VERSION,
   revision,updated_at:"2026-10-30T12:00:00."+String(revision).padStart(3,"0")+"Z",
   shared_at:payload.p_share_with_coach?"2026-10-30T12:00:00Z":null,...payload.p_payload};
  return Promise.resolve({data:revision,error:null});
 },
 from(t){
  queries++;assert.equal(t,"efg_coach_relaunch_intakes");
  return {select(columns){selectedProjection=columns;return this},eq(k,v){assert.ok(k==="student_id"&&v===uid||k==="completed_version"&&v===COACH_RELEASE_INTAKE_VERSION);return this},
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
assert.ok(selectedProjection.split(",").includes("updated_at"),"Coach intake readback MUST request the authoritative timestamp");
assert.equal(done.status.updated_at,"2026-10-30T12:00:00.001Z");
assert.throws(()=>createCoachCalculatorPrefill({intake:done.status,studentId:uid,
 coachAuthorized:true,requiredIntakeVersion:COACH_RELEASE_INTAKE_VERSION}),
 /No hay una ficha/,"Coach calculator must DENY unshared intake");
const goodStatus=status;
status={...status,updated_at:null};
const cannotVerifyTimestamp=await loadCoachRelaunchEntry(sb,{profile,userId:uid});
assert.equal(cannotVerifyTimestamp.route,"retry","Missing timestamp must block Coach release");
assert.equal(cannotVerifyTimestamp.status,null,"Do not return misleading completed intake");
status=goodStatus;
assert.equal(renderCoachRelaunchEntry(done),"");
assert.equal(writes,1);
const editView=renderCoachRelaunchEntry(done,{editing:true});
assert.match(editView,/Revisar mi ficha nueva/);
assert.match(editView,/efgCoachRelaunchManageForm/);
assert.match(editView,/Arroz/);
assert.match(editView,/Retirar permiso de compartir/);
assert.match(editView,/Borrar solo los datos/);
assert.doesNotMatch(editView,/id="coachRelaunch_share"[^>]*checked/,
 "Private intake must not be shared automatically.");
const updated=await submitCoachRelaunchEntry(sb,{profile,userId:uid,entry:done,
 payload:{...form.payload,notes:"Horario de comidas editado"},
 shareWithCoach:true,explicitSubmit:true});
assert.equal(updated.status.revision,2);
const prefill=createCoachCalculatorPrefill({intake:updated.status,studentId:uid,
 coachAuthorized:true,requiredIntakeVersion:COACH_RELEASE_INTAKE_VERSION});
assert.equal(prefill.sourceRevision,2);
assert.equal(prefill.sourceUpdatedAt,updated.status.updated_at);
assert.equal(prefill.eligibleForGeneralExample,false,"Vegetarian guide must not be fabricated");
assert.match(renderCoachRelaunchEntry(updated,{editing:true}),/checked/,
 "Existing explicit share state must remain visible when user edits.");
const saved=currentCoachRelaunchPayload(updated);
assert.deepEqual(Object.keys(saved).sort(),Object.keys(form.payload).sort(),
 "Only whitelisted general fields are preserved; no server IDs.");
const revoked=await revokeCoachRelaunchSharing(sb,{profile,userId:uid,entry:updated,explicitSubmit:true});
assert.equal(revoked.status.revision,3);
assert.equal(revoked.status.shared_at,null);
assert.equal(revoked.status.notes,"Horario de comidas editado",
 "Revocation does not erase food preferences/notes.");
const cleared=await clearCoachRelaunchData(sb,{profile,userId:uid,entry:revoked,explicitSubmit:true});
assert.equal(cleared.status.revision,4);
assert.equal(cleared.status.completed_version,COACH_RELEASE_INTAKE_VERSION,
 "Clearing keeps a version marker to avoid endless re-onboarding.");
assert.equal(cleared.status.objective,null);
assert.equal(cleared.status.notes,"");
assert.equal(cleared.status.shared_at,null);
assert.equal(cleared.route,"ready");
assert.equal(writes,4);
await assert.rejects(()=>clearCoachRelaunchData(sb,{profile,userId:uid,entry:cleared}),/Confirmá/);
await assert.rejects(()=>revokeCoachRelaunchSharing(sb,{profile,userId:uid,entry:cleared}),/Confirmá/);

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
assert.match(source,/if\(e.target.id==="efgCoachRelaunchForm"\|\|e.target.id==="efgCoachRelaunchManageForm"\)/);
assert.match(source,/await submitCoachRelaunchEntry\(sb,/);
assert.match(source,/COACH_RELAUNCH_ONBOARDING_ENABLED,COACH_RELEASE_INTAKE_VERSION\}/);
const flow=await (await import("node:fs/promises")).readFile(
 new URL("../pilot/coach-intake-flow.js",import.meta.url),"utf8");
assert.match(flow,/const currentIntakeTable=/);
assert.match(flow,/COACH_RELAUNCH_ONBOARDING_ENABLED\?/);
assert.match(flow,/filterRelease\(sb.from\(currentIntakeTable\(\)\)/,
 "Coach must read only current revision when relaunch enabled.");
assert.match(flow,/if\(COACH_RELAUNCH_ONBOARDING_ENABLED\)[\s\S]*?throw Error\("Esta versión utiliza una ficha/,
 "Legacy student update must not overwrite new release intake.");
assert.match(flow,/el borrado antiguo está deshabilitado/,
 "Legacy delete must never erase the wrong versioned record.");
console.log("PASS Coach re-entry UI synthetic: Terms first, fresh unsigned form, explicit share-off, no implicit save, signed backend readback required.");
