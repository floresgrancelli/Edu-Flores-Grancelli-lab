// READ ONLY. This must fail instead of turning absent hydration RPCs/tables into [] or true.
import assert from 'node:assert/strict';
import {localContext,literal as q} from './helpers/coach119-local.mjs';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.EFG_QA_SDK_ENTRY,'1');
const {sql}=localContext();
const requiredTables=['efg_profiles','efg_organizations','efg_consents','efg_invitations',
 'efg_daily_logs','efg_weights','efg_activities','efg_goals','efg_personal_targets','efg_food_plans',
 'efg_payments','efg_billing_settings','efg_coach_relaunch_intakes','efg_student_plan_access',
 'efg_weekly_reports','efg_habitual_meals','efg_personal_recipes'];
const requiredRpcs=['efg_claim_invitation()','efg_current_coach_health_document()',
 'efg_get_coach_health_intake(uuid)','efg_read_bound_guide(uuid)'];
const missing=[];
for(const name of requiredTables)if(sql('select to_regclass('+q('public.'+name)+') is not null')!=='t')missing.push('table:'+name);
for(const name of requiredRpcs)if(sql('select to_regprocedure('+q('public.'+name)+') is not null')!=='t')missing.push('rpc:'+name);
assert.deepEqual(missing,[],'SDK UI needs actual hydration schema; do not stub these dependencies. This is a minimum preflight, not exhaustive schema parity.');
console.log('PASS minimum SDK entry hydration objects exist; policies/fields/functional entry still require execution.');
