// SEC08: non-mutating live-catalog audit regression contract.
// This test NEVER connects to Supabase or claims privileged RPC authorization.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../docs/SEC08_LIVE_READONLY_AUDIT_20261030.sql",import.meta.url),"utf8");
const doc=readFileSync(new URL("../docs/SEC08_LIVE_SECURITY_TRIAGE_20261030.md",import.meta.url),"utf8");
assert.match(sql,/^with rpc as \(/im);
assert.match(sql,/has_function_privilege\('anon',p\.oid,'EXECUTE'\)/);
assert.match(sql,/has_function_privilege\('authenticated',p\.oid,'EXECUTE'\)/);
assert.match(sql,/anon_definer_rpc_count/);
assert.match(sql,/exposed_unlocked_search_path_count/);
assert.match(sql,/service_table_exposure_count/);
assert.match(sql,/missing_relaunch_components/);
assert.match(sql,/pg_catalog\.to_regprocedure/);
assert.doesNotMatch(sql,/^\s*(?:create|alter|drop|truncate|delete|update|insert|grant|revoke|do|call|copy|vacuum)\b/im,
 "Audit must remain metadata READ ONLY.");
const privileged=[
 "efg_activate_paid_coach","efg_claim_invitation","efg_confirm_payment",
 "efg_delete_pending_invitation","efg_invite_coach","efg_invite_student",
 "efg_invite_test_student","efg_offer_coach","efg_revoke_invitation",
 "efg_revoke_test_invitation","efg_set_coach_alias","efg_set_coach_plan",
 "efg_set_platform_alias","efg_set_platform_aliases","efg_set_seats",
 "efg_set_student_active","efg_submit_coach_payment","efg_submit_payment",
 "efg_update_subscription"
];
assert.equal(new Set(privileged).size,19);
for(const name of privileged)assert.ok(doc.includes("`"+name+"`"),"Undocumented live privilege "+name);
for(const term of ["NO GO","privacidad","19","7","RLS","JWT"])
 assert.ok(doc.includes(term),"SEC08 release note lost "+term);
const entry=readFileSync(new URL("../pilot/coach-relaunch-onboarding.js",import.meta.url),"utf8");
const publish=readFileSync(new URL("../pilot/coach-release-plan-gate.js",import.meta.url),"utf8");
const legal=readFileSync(new URL("../pilot/coach-legal-bridge.js",import.meta.url),"utf8");
assert.match(entry,/COACH_RELAUNCH_ONBOARDING_ENABLED=false/);
assert.match(publish,/COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false/);
assert.match(legal,/COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED=false/);
console.log("PASS SEC08 static release contract: audit SQL SELECT-only, inventory of 19 tracked, mandatory Coach+legal flags OFF. NOT signed JWT testing of hosted 19 RPC.");
