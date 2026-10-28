// EFG Nutrition Pro — static safety regression; no live DB, no credentials or network.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=(path)=>readFileSync(path,"utf8");
const app=load("efg-nutrition/pilot/pilot.js");
const sql=load("efg-nutrition/migrations/20261028113459_harden_efg_authenticated_privileges.sql");
const auth=app.match(/const SUPABASE_PUBLISHABLE\s*=\s*"([^"]+)"/);
assert.ok(auth&&auth[1].startsWith("sb_publishable_"),"Browser must use a public Supabase key, never a secret key");
assert.doesNotMatch(app,/sb_secret_|service_role|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET/i,"Privileged backend keys must never appear in the browser");
assert.ok(app.includes("sb.auth.getUser()"),"Always validate authenticated identity before loading private views");
assert.ok(app.includes("createSignedUrl"),"Private receipt retrieval must use signed URLs");
assert.ok(app.includes("efg_confirm_payment"),"Payment approval must remain a server-authorized RPC");
assert.match(sql,/REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE/);
assert.match(sql,/FROM authenticated;/);
const protectedTables=["efg_activities","efg_billing_settings","efg_consents","efg_daily_logs","efg_food_plans","efg_goals","efg_habitual_meals","efg_invitations","efg_organizations","efg_payments","efg_personal_recipes","efg_personal_targets","efg_profiles","efg_weekly_reports","efg_weights"];
for(const table of protectedTables)assert.ok(sql.includes("public."+table),"Missing privilege restriction for "+table);
const jobs=["efg-nutrition-premium-qa.yml","efg-nutrition-visual-qa.yml"];
for(const job of jobs){
 const yaml=load(".github/workflows/"+job);
 assert.match(yaml,/pull_request:\s*\n\s*branches: \[efg-nutrition-app\]/,"PR checks must run against the EFG production branch");
}
console.log("PASS: browser publishable key, auth validation, private receipt access, RPC and 15 revoked privileges documented; PR QA triggers present.");
console.log("LIMITATION: static checks do not replace live RLS/negative-authorization or backup restore tests.");
