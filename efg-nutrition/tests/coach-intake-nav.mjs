import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {currentCoachIntakeDraft} from "../pilot/coach-intake-queue.js";
const base=new URL("../pilot/",import.meta.url);
const [app,style]=await Promise.all(["pilot.js","coach-experience.css"].map(f=>readFile(new URL(f,base),"utf8")));
assert.match(app,/"coachIntake","▣","Ingresos"/,"Coach has a dedicated Ingresos tab");
assert.match(app,/function coachIntakeView\(\)/,"Coach intake dashboard has own routed view");
assert.match(app,/coachIntake:coachIntakeView/,"Intake view is registered in router");
assert.match(app,/data-intake-message/,"Students can open private existing chat from intake");
assert.match(app,/coachRosterConsent\[p\.user_id\]===true/,"Intake never assumes sharing permission from registration");
assert.match(app,/await loadCoachIntakeGoals\(\)/,"Overview uses read-only validated goals");
assert.match(app,/efg_goals"\)\.select\("student_id,id"\)\.in\("student_id",ids\)/,"Goal summary filters explicitly authorized student ids");
assert.match(app,/Una meta guardada no habilita por sí sola la app/,"An existing goal never implies publication");
assert.match(app,/próxima implementación|Próxima implementación/,"No false claims of a functional published-plan gate");
assert.match(style,/coach-intake-summary/,"Responsive intake summary is styled");
assert.match(style,/@media\(max-width:500px\)/,"Mobile layout is defined");

assert.match(app,/await loadCoachIntakeDraftStatuses\(\)/,
 "Draft status must be read as a server-authenticated, RLS-scoped summary.");
assert.match(app,/state\.coachIntakeDraftVerified&&/,
 "No private draft status can appear before the signed readback.");
assert.match(app,/state\.coachIntakeAccess\[p\.user_id\]\?\.status!=="published"/,
 "An already published plan must not be relabeled as an unpublished draft.");
const studentId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const organizationId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const coachId="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ctx={studentId,organizationId,coachId};
const intake={student_id:studentId,organization_id:organizationId,revision:3,shared_at:"2026-10-31T12:00:00Z"};
const draft={student_id:studentId,organization_id:organizationId,coach_id:coachId,
 status:"draft",draft_revision:2,source_intake_revision:3};
assert.equal(currentCoachIntakeDraft(draft,intake,ctx),true);
for(const [d,i,c] of [
 [{...draft,coach_id:organizationId},intake,ctx],
 [{...draft,organization_id:studentId},intake,ctx],
 [{...draft,student_id:coachId},intake,ctx],
 [{...draft,status:"published"},intake,ctx],
 [{...draft,draft_revision:0},intake,ctx],
 [{...draft,source_intake_revision:2},intake,ctx],
 [draft,{...intake,shared_at:null},ctx],
 [draft,{...intake,student_id:coachId},ctx],
 [draft,{...intake,organization_id:coachId},ctx],
 [draft,{...intake,revision:0},ctx],
 [draft,intake,{...ctx,coachId:organizationId}],
 [null,intake,ctx]
])assert.equal(currentCoachIntakeDraft(d,i,c),false,
 "A stale, unshared or cross-organization draft must not appear in the Coach queue.");
console.log("PASS Coach Ingresos: signed RLS drafts distinguish an actual current private draft from legacy goals (synthetic classification).");

