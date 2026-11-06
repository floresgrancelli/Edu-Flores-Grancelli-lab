import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../proposed/20261106_dual_workspace_STAGING_ONLY_NOT_APPLIED.sql',import.meta.url),'utf8');
const body=sql.replace(/--[^\n]*/g,'');
test('SQL proposal hard gates isolated synthetic data and keeps all endpoints ungranted',()=>{
 assert.match(body,/current_setting\('ncc\.dual_workspace_fixture',true\) is distinct from 'synthetic-v1'/);
 assert.match(body,/ncc_dual_workspace_fixture_marker/);
 assert.match(body,/not like '%@example.invalid'/);
 assert.doesNotMatch(body,/\bgrant\b/i);
 assert.doesNotMatch(body,/create\s+or\s+replace/i);
 assert.doesNotMatch(body,/create\s+policy/i);
 const names=[...body.matchAll(/create function (\w+\.\w+)\(/g)].map(m=>m[1]);
 assert.equal(names.length,12);
 for(const name of names)assert.ok(body.includes('revoke all on function '+name+'('));
});
test('proposal preserves all student profiles/history/consents and enforces transactional quota',()=>{
 assert.doesNotMatch(body,/\b(?:update|delete\s+from|alter\s+table)\s+public\.efg_(?:profiles|consents|goals|daily_logs|food_plans|weights)/i);
 assert.match(body,/user_id uuid primary key references public\.efg_profiles/);
 assert.match(body,/if p_seats<v_used then raise exception/);
 assert.match(body,/if v_used>=v_org\.seat_limit then raise exception/);
 assert.match(body,/select \* into v_org from public\.efg_organizations where id=p_org for update/);
 assert.match(body,/v_org\.coach_id is distinct from v_actor/);
 assert.match(body,/if not efg_private\.is_admin\(\)/);
 assert.match(body,/pg_advisory_xact_lock/);
 assert.match(body,/primary key\(actor_id,request_id\)/);
});
test('demo is explicitly synthetic and prevents external network/forms',()=>{
 const html=readFileSync(new URL('../pilot/dual-workspace-demo.html',import.meta.url),'utf8');
 const demo=readFileSync(new URL('../pilot/dual-workspace-demo.mjs',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);
 assert.match(html,/SOLO DATOS FICTICIOS/);assert.match(html,/pantalla de OTP no está integrada/);
 assert.doesNotMatch(demo,/innerHTML|fetch\(|localStorage|sessionStorage|https:\/\//);
 assert.match(demo,/\.textContent=/);
});
