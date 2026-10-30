// COACH-68 · Mandatory version-aware SQL and client contract for isolated staging.
// This is static contract QA, NOT evidence that these SQL migrations executed.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../docs/",import.meta.url);
const sql=name=>readFileSync(new URL(name,root),"utf8");
const draft=sql("COACH68_VERSIONED_DRAFT_STAGING_ONLY.sql");
const policy=sql("COACH68_VERSIONED_POLICY_STAGING_ONLY.sql");
const publish=sql("COACH68_VERSIONED_ATOMIC_PUBLISH_STAGING_ONLY.sql");
const oldDraft=sql("COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql");
const oldPublish=sql("COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql");
const oldPolicy=sql("COACH_PUBLICATION_EVIDENCE_POLICY_STAGING_SQL_20261029.sql");
const version="coach_major_2026_r1";
for(const [name,text] of [["draft",draft],["policy",policy],["publish",publish]]){
 assert.match(text,/COACH68 STOP: marker or versioned intake missing in isolated stage/);
 assert.match(text,/efg_private\.nut57_isolated_staging_marker/);
 assert.match(text,/public\.efg_coach_relaunch_intakes/);
 assert.match(text,/coach_major_2026_r1/);
 assert.doesNotMatch(text,/(?:from|join|update|into|on)\s+public\.efg_student_intakes\b/i,
  name+" must never use a legacy intake.");
 assert.match(text,/\bbegin;/i);
 assert.match(text,/\bcommit;/i);
 assert.doesNotMatch(text,/\bcreate\s+function\s+public\.efg_publish_coach_plan\s*\(/i);
}
assert.match(oldDraft,/from public\.efg_student_intakes intake/);
assert.match(oldPublish,/from public\.efg_student_intakes intake/);
assert.match(oldPolicy,/from public\.efg_student_intakes i/);
assert.match(draft,/source_intake_revision integer not null/);
assert.match(draft,/p_intake_revision integer/);
assert.match(draft,/v_intake_revision is distinct from p_intake_revision/);
assert.match(draft,/source_intake_revision=v_intake_revision/);
assert.match(draft,/source_intake_revision,goal_proposal,guide_proposal/);
assert.match(draft,/intake\.completed_version='coach_major_2026_r1'/);
assert.doesNotMatch(draft,/efg_intake_server_revision\(\)/,
 "No old-intake trigger should be installed in COACH68.");
assert.match(draft,/grant execute on function public\.efg_save_coach_plan_draft\(\s*uuid,jsonb,jsonb,timestamptz,integer,bigint\)/);
assert.match(policy,/intake_completed_version text not null/);
assert.match(policy,/intake_revision integer not null/);
assert.match(policy,/i\.revision/);
assert.match(policy,/s\.intake_revision=v_intake_revision/);
assert.match(policy,/s\.intake_completed_version='coach_major_2026_r1'/);
assert.match(policy,/v_current_legal_count<>2 or v_accepted_count<>2/);
assert.match(policy,/status='general_guidance_reviewed'/);
assert.match(policy,/evidence_status='reviewed'/);
assert.match(publish,/v_draft\.source_intake_revision is distinct from v_intake_revision/);
assert.match(publish,/intake\.completed_version='coach_major_2026_r1'/);
assert.match(publish,/consent\.accepted/);
assert.match(publish,/for update of access/);
assert.match(publish,/efg_private\.coach_publication_policy_valid/);
assert.match(publish,/insert into public\.efg_goals/);
assert.match(publish,/insert into public\.efg_food_plans/);
assert.match(publish,/insert into public\.efg_coach_plan_publish_receipts/);
assert.match(publish,/on conflict\(recipient_id,event_key\) do nothing/);
const js=readFileSync(new URL("../pilot/coach-plan-draft-client.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
assert.match(js,/sourceRevision=null/);
assert.match(js,/currentIntake\(studentId,sourceUpdatedAt,relaunchEnabled\?sourceRevision:null\)/);
assert.match(js,/params\.p_intake_revision=sourceRevision/);
assert.match(js,/efg_coach_relaunch_intakes/);
assert.match(js,/eq\("completed_version",COACH_RELEASE_INTAKE_VERSION\)/);
assert.match(ui,/sourceRevision:COACH_RELAUNCH_ONBOARDING_ENABLED\?intake\.revision:null/);
assert.match(js,/assertCoachReleasePlanWriteAllowed\(\{relaunchEnabled\}\)/);
const relaunch=readFileSync(new URL("../pilot/coach-relaunch-onboarding.js",import.meta.url),"utf8");
const release=readFileSync(new URL("../pilot/coach-release-plan-gate.js",import.meta.url),"utf8");
assert.match(relaunch,/COACH_RELAUNCH_ONBOARDING_ENABLED=false/);
assert.match(release,/COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false/);
assert.match(release,/El plan del relanzamiento todavía no puede guardarse ni publicarse/);
assert.equal(version,"coach_major_2026_r1");
console.log("PASS COACH-68 static contracts: revision+version on draft/save/food-review/publish; legal, role, consent and nutrition evidence still required; OFF. SQL execution and JWT tests pending.");
