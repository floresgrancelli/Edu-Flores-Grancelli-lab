// COACH75: static QA of a NON-MUTATING hosted prerequisite query.
// Passing this test never asserts that hosted schema is installed or ready.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("./sql/coach75-release-required-schema-readonly.sql",import.meta.url),"utf8");
const code=source.replace(/^\s*--.*$/gm,"").trim();
assert.match(code,/^with requirements\(/i);
assert.match(code,/select kind,object_name,present/i);
assert.match(code,/REQUIRED_SCHEMA_MISSING_DO_NOT_ENABLE/);
assert.match(code,/STRUCTURE_PRESENT_NOT_AUTHORIZED/);
assert.doesNotMatch(code,/\b(create|alter|drop|truncate|delete|insert|update|merge|grant|revoke|execute|call|do|copy|set|lock)\b/i,
 "Metadata preflight must be read-only, no hidden DDL/DML");
assert.equal((code.match(/;/g)||[]).length,1,"Exactly one read-only SQL statement");
const pairs=[...code.matchAll(/\('(table|function)','(public\.[^']+)'\)/g)];
assert.equal(pairs.length,12,"Seven tables and five exact RPC signatures");
assert.equal(pairs.filter(x=>x[1]==="table").length,7);
assert.equal(pairs.filter(x=>x[1]==="function").length,5);
assert.equal(new Set(pairs.map(x=>x[2])).size,12,"No duplicate or missing dependencies");
for(const name of [
 "public.efg_legal_documents","public.efg_legal_acceptances",
 "public.efg_student_plan_access","public.efg_coach_relaunch_intakes",
 "public.efg_coach_plan_drafts","public.efg_coach_plan_publish_receipts",
 "public.efg_notifications","public.efg_legal_current_status()",
 "public.efg_accept_legal_documents(uuid[])",
 "public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)",
 "public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamp with time zone,integer,bigint)",
 "public.efg_publish_coach_plan_draft(uuid,bigint,uuid)"
]) assert.ok(pairs.some(x=>x[2]===name),"Missing required release dependency: "+name);
console.log("PASS COACH75: strict read-only 12-object hosted prerequisite report, no DDL/DML; current hosted state is NOT implied by CI.");
