// EFG Nutrition Pro / staged Coach server evidence policy.
// Static contract only: no PostgreSQL, no actual JWT, no clinical/legal sign-off.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const policy=readFileSync(new URL("../docs/COACH_PUBLICATION_EVIDENCE_POLICY_STAGING_SQL_20261029.sql",import.meta.url),"utf8");
const atomic=readFileSync(new URL("../docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql",import.meta.url),"utf8");
const client=readFileSync(new URL("../pilot/food-compatibility.js",import.meta.url),"utf8");

assert.match(policy,/STAGING-ONLY dietary evidence and legal policy/);
assert.match(policy,/DO NOT EXECUTE ON PRODUCTION/);
assert.match(policy,/begin;[\s\S]*commit;/);
assert.match(policy,/to_regclass\('public\.efg_legal_documents'\)/);
assert.match(policy,/to_regclass\('public\.efg_legal_acceptances'\)/);
assert.match(policy,/has_table_privilege\('authenticated','public\.efg_legal_acceptances','INSERT'\)/);
assert.match(policy,/has_table_privilege\('authenticated','public\.efg_legal_acceptances','UPDATE'\)/);
assert.match(policy,/create table efg_private\.coach_reviewed_foods/);
assert.match(policy,/evidence_status text not null default 'pending'/);
assert.match(policy,/source_url text not null check\(source_url ~ '\^https:\/\//);
assert.match(policy,/catalog_version text not null/);
assert.match(policy,/reviewed_by uuid references auth\.users/);
assert.match(policy,/expires_at timestamptz/);
assert.match(policy,/alter table efg_private\.coach_reviewed_foods enable row level security/);
assert.match(policy,/revoke all on efg_private\.coach_reviewed_foods from public,anon,authenticated/);
assert.match(policy,/create table efg_private\.coach_food_pattern_reviews/);
assert.match(policy,/verdict text not null default 'unknown'/);
assert.match(policy,/and rule\.verdict='allowed'/);
assert.match(policy,/create table efg_private\.coach_publication_scope_reviews/);
assert.match(policy,/status text not null default 'pending'/);
assert.match(policy,/status='general_guidance_reviewed'/);
assert.match(policy,/s\.intake_updated_at=v_intake_updated/);
assert.match(policy,/create function efg_private\.coach_publication_policy_valid\(/);
assert.match(policy,/volatile security invoker\s+set search_path=''/);
assert.match(policy,/p_coach is distinct from auth\.uid\(\)/);
assert.match(policy,/not efg_private\.coach_has_student\(p_student\)/);
assert.match(policy,/i\.shared_at is not null/);
assert.match(policy,/p\.organization_id=i\.organization_id/);
assert.match(policy,/v_pattern not in \('omnivore','vegetarian','vegan','pescatarian'\)/);
assert.match(policy,/d\.kind in \('terms','privacy'\)/);
assert.match(policy,/d\.status='published'/);
assert.match(policy,/d\.effective_at<=now\(\)/);
assert.match(policy,/d\.retired_at is null or d\.retired_at>now\(\)/);
assert.match(policy,/d\.sha256/);
assert.match(policy,/a\.document_hash_sha256=current_docs\.sha256/);
assert.match(policy,/a\.acceptance_method='explicit_checkbox'/);
assert.match(policy,/a\.user_id=p_student/);
assert.match(policy,/a\.user_id=p_coach/);
assert.match(policy,/v_current_legal_count<>2 or v_accepted_count<>2/);
assert.match(policy,/v_items_count<1 or v_items_count>15/);
assert.match(policy,/v_item->>'id'/);
assert.match(policy,/food\.evidence_status='reviewed'/);
assert.match(policy,/food\.reviewed_at<=now\(\)/);
assert.match(policy,/food\.expires_at>now\(\)/);
assert.match(policy,/food\.unit=v_item->>'unit'/);
assert.match(policy,/if pg_catalog\.abs\(v_value-v_expected\)>0\.001/);
assert.match(policy,/rule\.catalog_version=v_food\.catalog_version/);
assert.match(policy,/rule\.reviewed_at<=now\(\)/);
assert.match(policy,/rule\.expires_at>now\(\)/);
assert.match(policy,/if not found then return false; end if;/);
assert.match(policy,/revoke all on function efg_private\.coach_publication_policy_valid\(/);
assert.doesNotMatch(policy,/\b(?:insert|upsert)\s+into\s+efg_private\.coach_(?:reviewed_foods|food_pattern_reviews|publication_scope_reviews)/i,"No trusted evidence must be auto-seeded");
assert.doesNotMatch(policy,/returns true\s+language|return true;\s*end\s*\$efg_food_policy\$/i,"No unconditional grant of safety");
assert.match(atomic,/to_regprocedure\([\s\S]*coach_publication_policy_valid\(uuid,jsonb,jsonb,uuid\)/);
assert.match(atomic,/if efg_private\.coach_publication_policy_valid\([\s\S]*is distinct from true then/);
assert.match(client,/FOOD_COMPATIBILITY_ENABLED=false/);
assert.match(policy,/No clinical\/medical clearance/);
for(const tag of ["efg_food_policy_preflight","efg_food_policy"])
 assert.equal((policy.match(new RegExp("\\$"+tag+"\\$","g"))||[]).length,2,"Paired $$ delimiters: "+tag);
// A static negative-case matrix. Expected outcome in staged SQL, NOT a live test.
const cases=[
 ["Missing reviewed food",/if not found then return false; end if;/],
 ["Expired food evidence",/food\.expires_at>now\(\)/],
 ["Unknown vegetarian/vegan pattern",/rule\.verdict='allowed'/],
 ["Spoofed item macro",/abs\(v_value-v_expected\)>0\.001/],
 ["Missing legal acceptance",/v_accepted_count<>2/],
 ["Old intake review",/s\.intake_updated_at=v_intake_updated/],
 ["Clinical uncertainty",/status='general_guidance_reviewed'/],
 ["Client provenance untrusted",/No assumption of gluten\/allergy certification/]
];
for(const [name,re] of cases)assert.match(policy,re,"Policy must address "+name);
console.log("PASS: food evidence + current two-party legal + nonclinical scope policy contract; no reviewed rows seeded (STATIC ONLY; requires JWT/Postgres/clinical/legal tests).");
