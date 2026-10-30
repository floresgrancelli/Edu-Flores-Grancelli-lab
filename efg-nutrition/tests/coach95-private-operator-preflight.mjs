// COACH95 — no private data, secrets, Docker or database used in this test.
import assert from 'node:assert/strict';
import {assessWorkstation} from '../scripts/coach95-private-operator-preflight.mjs';
const good={node:'22.16.0',psql:'psql (PostgreSQL) 17.11',
  supabase:'2.84.2',docker:'27.5.1',freeBytes:6*1024**3,
  env:{EFG_COACH95_MANUAL_ACK:'I_AM_ON_MY_PRIVATE_COMPUTER'}};
assert.deepEqual(assessWorkstation(good),{
 ready_for_manual_export_preparation:true,backup_created:false,
 encryption_checked:false,database_access_checked:false
});
for(const bad of [
 {node:'18.17.0'},{psql:'psql (PostgreSQL) 15.6'},
 {supabase:'1.9.2'},{docker:''},{freeBytes:100*1024**2},
 {env:{}},{env:{CI:'true',EFG_COACH95_MANUAL_ACK:'I_AM_ON_MY_PRIVATE_COMPUTER'}},
 {env:{GITHUB_ACTIONS:'true',EFG_COACH95_MANUAL_ACK:'I_AM_ON_MY_PRIVATE_COMPUTER'}},
 ...['PGPASSWORD','PGHOST','PGDATABASE','SUPABASE_ACCESS_TOKEN','DATABASE_URL']
  .map(k=>({env:{...good.env,[k]:'synthetic_secret_not_real'}}))
])assert.throws(()=>assessWorkstation({...good,...bad}),/COACH95 STOP/);
console.log('PASS COACH95: workstation preflight is local-only and fail-closed on secrets, CI, tools, space. No private files or network.');
