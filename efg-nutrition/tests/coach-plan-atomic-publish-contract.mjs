// EFG Nutrition Pro · staged atomic Coach publication contract (STATIC ONLY).
// A passing regex test is NOT PostgreSQL execution, JWT testing or a release approval.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync(new URL("../docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql",import.meta.url),"utf8");
const draft=readFileSync(new URL("../docs/COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql",import.meta.url),"utf8");
const intake=readFileSync(new URL("../migrations/20261029_coach_intake_plan_access_DRAFT.sql",import.meta.url),"utf8");
assert.match(sql,/STAGING-ONLY transaction design/);
assert.match(sql,/DO NOT EXECUTE ON PRODUCTION/);
assert.match(sql,/begin;[\s\S]*commit;/);
assert.match(sql,/to_regclass\('public\.efg_coach_plan_drafts'\)/);
assert.match(sql,/to_regclass\('public\.efg_legal_acceptances'\)/);
assert.match(sql,/to_regprocedure\([\s\S]*coach_publication_policy_valid\(uuid,jsonb,jsonb,uuid\)/);
assert.match(sql,/raise exception 'NOT READY:/);
assert.match(sql,/create table public\.efg_coach_plan_publish_receipts/);
assert.match(sql,/request_id uuid primary key/);
assert.match(sql,/unique\(student_id,draft_revision\)/);
assert.match(sql,/alter table public\.efg_coach_plan_publish_receipts enable row level security/);
assert.match(sql,/revoke all on public\.efg_coach_plan_publish_receipts from public,anon,authenticated/);
assert.match(sql,/revoke execute on function public\.efg_publish_coach_plan\(uuid,uuid\)/);
assert.match(sql,/revoke insert,update,delete on public\.efg_goals from public,anon,authenticated/);
assert.match(sql,/revoke insert,update,delete on public\.efg_food_plans from public,anon,authenticated/);
assert.match(sql,/create function public\.efg_publish_coach_plan_draft\(/);
assert.match(sql,/security definer\s+set search_path=''/);
assert.match(sql,/v_coach uuid := auth\.uid\(\)/);
assert.match(sql,/not efg_private\.coach_has_student\(p_student\)/);
assert.match(sql,/for update of access/);
assert.match(sql,/for share;/);
assert.match(sql,/for update;/);
assert.match(sql,/v_intake_updated/);
assert.match(sql,/v_draft\.source_intake_updated_at is distinct from v_intake_updated/);
assert.match(sql,/v_draft\.status is distinct from 'draft'/);
assert.match(sql,/p_expected_revision/);
assert.match(sql,/p_request_id/);
assert.match(sql,/if found then[\s\S]*return v_existing_goal/);
assert.match(sql,/v_existing_revision is distinct from p_expected_revision/);
assert.match(sql,/v_value != pg_catalog\.trunc\(v_value\)/);
assert.match(sql,/count\(distinct m\.meal->>'slot'\)/);
assert.match(sql,/v_slots<>5 or v_distinct_slots<>5 or v_bad_slots<>0/);
assert.match(sql,/if efg_private\.coach_publication_policy_valid\([\s\S]*is distinct from true then/);
assert.match(sql,/from pg_catalog\.jsonb_array_elements\(v_guide->'meals'\) as m\(meal\)/);
assert.match(sql,/cross join lateral pg_catalog\.jsonb_array_elements\(m\.meal->'items'\) as i\(item\)/);
assert.match(sql,/insert into public\.efg_goals\(/);
assert.match(sql,/insert into public\.efg_food_plans\(/);
assert.match(sql,/on conflict\(student_id\) do update/);
assert.match(sql,/update public\.efg_student_plan_access/);
assert.match(sql,/insert into public\.efg_notifications\(/);
assert.match(sql,/on conflict\(recipient_id,event_key\) do nothing/);
assert.match(sql,/insert into public\.efg_coach_plan_publish_receipts\(/);
assert.match(sql,/update public\.efg_coach_plan_drafts[\s\S]*status='published'/);
assert.match(sql,/revoke all on function public\.efg_publish_coach_plan_draft/);
assert.match(sql,/grant execute on function public\.efg_publish_coach_plan_draft[\s\S]*to authenticated/);

// SQL procedure contains no exception-swallowing path after inserting a goal.
const body=sql.split("as $efg_publish$")[1]||"";
assert.doesNotMatch(body,/exception\s+when\s+others\s+then/i);
for(const part of ["insert into public.efg_goals(","insert into public.efg_food_plans(","update public.efg_student_plan_access","insert into public.efg_notifications(","insert into public.efg_coach_plan_publish_receipts(","update public.efg_coach_plan_drafts"]){
 assert.ok(body.includes(part),"Atomic publication must include "+part);
}
const positions=[
 body.indexOf("insert into public.efg_goals("),
 body.indexOf("insert into public.efg_food_plans("),
 body.indexOf("update public.efg_student_plan_access"),
 body.indexOf("insert into public.efg_notifications("),
 body.indexOf("insert into public.efg_coach_plan_publish_receipts("),
 body.indexOf("update public.efg_coach_plan_drafts")
];
assert.ok(positions.every((x,i)=>x>0&&(i===0||x>positions[i-1])),"Publication writes must be in one ordered function body");
assert.match(draft,/create trigger efg_intake_revision_server_owned/);
assert.match(draft,/check\(status in \('draft','published'\)\)/);
assert.match(draft,/and status in \('draft','published'\)/);
assert.match(intake,/create function public\.efg_publish_coach_plan\(p_student uuid,p_goal_id uuid\)/,"Legacy RPC exists: staged SQL must revoke it");
assert.doesNotMatch(sql,/create\s+function\s+efg_private\.coach_publication_policy_valid\(/i,"Cannot create a permissive placeholder validator");
assert.match(sql,/REAL PostgreSQL parse\/schema application/);
assert.match(sql,/JWT A\/B organizations/);
assert.match(sql,/NO GO today/);
for(const tag of ["efg_preflight","efg_publish"]){
 assert.equal((sql.match(new RegExp("\\$"+tag+"\\$","g"))||[]).length,2,"Dollar quote must pair: "+tag);
}
console.log("PASS: staged atomic Coach goal+guide+access+notification, replay safety and no direct REST bypass (STATIC ONLY; no SQL/JWT executed).");
