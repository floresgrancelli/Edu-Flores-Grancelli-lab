// COACH-GO-01: protect explicit owner decision. No hosted access or real identities.
// This is a RELEASE SCOPE guard, NOT proof of backup, legal consent or production auth.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const main=read('../pilot/pilot.js');
const personal=read('../pilot/personal-workspace.js');
const sql=read('../docs/COACH_PILOT_10_EXISTING_STUDENT_PROMOTION_STAGING_ONLY.sql');
const scope=read('../docs/COACH_GO_01_RELEASE_SCOPE_CARLA_POSTGO_RESTORE_20261030.md');
// Carla stays student until a SEPARATE post-GO admin action; no secondary admin.
assert.match(scope,/Carla no bloquea la Gran Actualización/);
assert.match(scope,/coach piloto/);
assert.match(scope,/nunca «administrador secundario»/);
assert.match(scope,/Carla continuará siendo alumna/);
assert.match(scope,/POST-GO, NO BLOQUEANTE/);
// Pilot promotion cannot silently become a public/coach action with this release.
assert.match(main,/const COACH_PILOT_PROMOTION_ENABLED=false\b/);
assert.match(main,/state\.profile\?\.role!=="admin"\|\|!COACH_PILOT_PROMOTION_ENABLED/);
assert.match(main,/sb\.rpc\("efg_promote_existing_student_to_pilot_coach",\{p_email:email\}\)/);
assert.match(sql,/if not efg_private\.is_admin\(\)/);
assert.match(sql,/update public\.efg_profiles set role='coach',organization_id=null/);
assert.match(sql,/v_user\.role<>'student'/);
assert.match(sql,/seat_limit,status,is_test,license_fee_ars/);
assert.match(sql,/nut57_isolated_staging_marker/);
assert.doesNotMatch(sql,/\bdelete\s+from\s+public\.efg_(?:daily_logs|goals|weights|personal_recipes|habitual_meals)/i);
assert.match(main,/MI DÍA/);
// Out-of-scope personal/self-managed product must remain OFF.
assert.match(personal,/export const PERSONAL_WORKSPACE_ENABLED=false\b/);
// Pro daily database backup alone is NOT a full restore of private receipts/Storage.
assert.match(scope,/metadatos de objetos de Storage, no los archivos/);
assert.match(scope,/19 RPC/);
assert.match(scope,/NO GO de publicación principal/);
console.log('PASS COACH-GO-01: Carla promotion deferred, coach-only after separate admin approval, ten-seat history-safe design, Autogestión OFF, Storage/restore gates explicit. This is NOT release GO.');
