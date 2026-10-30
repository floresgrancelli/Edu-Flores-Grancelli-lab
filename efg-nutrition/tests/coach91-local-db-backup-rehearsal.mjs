// COACH91: all data here are synthetic metadata strings; never invoke live backup.
import assert from 'node:assert/strict';
import {validateArchiveTOC,validateModeEnvironment}
 from '../scripts/coach91-local-db-backup-rehearsal.mjs';
const tableNames=[
 'auth users','storage objects','public efg_profiles','public efg_organizations',
 'public efg_goals','public efg_food_plans','public efg_daily_logs',
 'public efg_weights','public efg_activities','public efg_habitual_meals',
 'public efg_personal_recipes','public efg_invitations','public efg_messages',
 'public efg_payments','public efg_weekly_reports'
];
const lines=tableNames.map((t,i)=>(i+1)+'; 0 '+(5000+i)+' TABLE DATA '+t+' postgres');
lines.push('100; 0 6000 POLICY public efg_goals student_owner postgres');
lines.push('101; 0 6001 TRIGGER public efg_goals notify_goal postgres');
const toc=lines.join('\n');
assert.deepEqual(validateArchiveTOC(toc),{
 essential_table_data_present:15,has_policies:true,has_triggers:true
});
for(const toRemove of [0,1,3,6,14,15,16]){
 const broken=lines.filter((_,i)=>i!==toRemove).join('\n');
 assert.throws(()=>validateArchiveTOC(broken),/COACH91 STOP/);
}
const base={EFG_COACH91_MANUAL_ACK:'PRIVATE_LOCAL_BACKUP_ONLY'};
const captured={...base,PGHOST:'db.cyjvddhimbsfipjfctsl.supabase.co',
 PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full'};
const restored={...base,PGHOST:'127.0.0.1',PGPORT:'5432',
 PGDATABASE:'efg_coach91_disposable_restore',PGUSER:'postgres',
 EFG_COACH91_RESTORE_ACK:'I_ACCEPT_DISPOSABLE_LOCAL_RESTORE'};
assert.equal(validateModeEnvironment('inspect',base),true);
assert.equal(validateModeEnvironment('capture',captured),true);
assert.equal(validateModeEnvironment('restore',restored),true);
for(const bad of [
 {...captured,CI:'true'}, {...captured,GITHUB_ACTIONS:'true'},
 {...captured,PGHOST:'malicious.example'}, {...captured,PGSSLMODE:'disable'},
 {...captured,PGSERVICE:'hidden'}, {...captured,EFG_COACH91_MANUAL_ACK:''},
 {...restored,PGHOST:'db.cyjvddhimbsfipjfctsl.supabase.co'},
 {...restored,PGDATABASE:'postgres'}, {...restored,PGPORT:'6543'},
 {...restored,EFG_COACH91_RESTORE_ACK:''}
]){
 const mode=bad.EFG_COACH91_RESTORE_ACK!==undefined?'restore':'capture';
 assert.throws(()=>validateModeEnvironment(mode,bad),/COACH91 STOP/);
}
assert.throws(()=>validateModeEnvironment('delete',base),/COACH91 STOP/);
console.log('PASS COACH91: offline PG17 backup/restore guardrails reject missing Auth, Storage metadata, legacy tables, ACL controls, prod destinations, CI and insecure source connections; NO real data touched.');
