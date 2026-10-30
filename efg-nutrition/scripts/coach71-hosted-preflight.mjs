// COACH-71: strict hosted object-shape preflight, READ ONLY, before Coach migration.
// Intended for an approved isolated PostgreSQL 17 restore. NEVER connects to hosted DB.
// This verifies catalog metadata, foreign keys and effective grants on 15 tables.
// Passing is NOT release approval: function authorization, data/Storage restore, Auth, UAT remain.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseline=JSON.parse(readFileSync(fileURLToPath(new URL('../tests/sql/coach71-hosted-object-signatures-20261030.json',import.meta.url)),'utf8'));
const host=process.env.PGHOST||'';
const port=process.env.PGPORT||'';
const db=process.env.PGDATABASE||'';
if(!['127.0.0.1','localhost'].includes(host) ||
   !['5432','54322'].includes(port) ||
   !/^efg_(nut57_before|nut57_restored|nutrition_ephemeral|coach71_restore_preflight)$/.test(db)){
  console.error('COACH71 STOP: isolated local postgres only; set PGHOST, PGPORT and an approved ephemeral PGDATABASE.');
  process.exit(3);
}
// libpq can use PGHOSTADDR (and service files) to override PGHOST silently.
// Refuse ambiguous routing before invoking psql, even if PGHOST says localhost.
const dangerous=['PGHOSTADDR','PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR','PGOPTIONS'];
if(dangerous.some(key=>String(process.env[key]||'').length>0)){
 console.error('COACH71 STOP: indirect PostgreSQL routing/session overrides are forbidden.');
 process.exit(3);
}
const pgEnv={...process.env,PGCONNECT_TIMEOUT:'5'};
const psqlArgs=['-X','-Atq','-v','ON_ERROR_STOP=1','-h',host,'-p',port,'-d',db];
function localPsql(sql){
 return spawnSync('psql',[...psqlArgs,'-c',sql],{
  env:pgEnv,encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024
 });
}
// Verify the connection actually landed on the intended local server/database.
const identity=localPsql("select current_database(),inet_server_addr()::text,inet_server_port(),current_setting('server_version_num')");
if(identity.status!==0){
 console.error('COACH71 STOP: local PostgreSQL identity query failed.');
 process.exit(3);
}
const idParts=identity.stdout.trim().split('|');
if(idParts.length!==4||idParts[0]!==db||!['127.0.0.1','::1'].includes(idParts[1])||idParts[2]!==port||!/^17[0-9]{4}$/.test(idParts[3])){
 console.error('COACH71 STOP: connection is not the approved PostgreSQL 17 local endpoint.');
 process.exit(3);
}
if(!Array.isArray(baseline.tables)||baseline.tables.length!==15||!baseline.snapshot_sql){
  throw new Error('COACH71 missing/invalid hosted metadata baseline');
}
if(!baseline.access_snapshot_sql||!Array.isArray(baseline.access_tables)||baseline.access_tables.length!==15){
  throw new Error('COACH71 missing FK/role privilege metadata baseline');
}
for(const s of [baseline.snapshot_sql,baseline.access_snapshot_sql]){
 if(!/^\s*select\b/i.test(s)||s.includes(';')){
  console.error('COACH71 STOP: unexpected SQL in metadata-only query');
  process.exit(3);
 }
}
const query="select coalesce(json_agg(t order by t.tbl),'[]'::json) from ("+baseline.snapshot_sql+") t;";
const p=localPsql('BEGIN READ ONLY; '+query+' COMMIT;');
if(p.status!==0){
 console.error('COACH71 SQL error: '+(p.stderr||p.stdout||'unknown').slice(0,1000));
 process.exit(3);
}
const actual=JSON.parse(p.stdout.trim());
const expected=new Map(baseline.tables.map(r=>[r.tbl,r]));
const present=new Map(actual.map(r=>[r.tbl,r]));
const problems=[];
for(const [name,before] of expected){
 const now=present.get(name);
 if(!now){problems.push(name+': table missing');continue}
 for(const field of ['rls','force_rls','policies','policies_signature','triggers','triggers_signature','indexes','indexes_signature','checks','checks_signature']){
   if(now[field]!==before[field])problems.push(name+': '+field+' DIFFERENT from hosted metadata snapshot');
 }
}
for(const name of present.keys())if(!expected.has(name))problems.push(name+': unexpected table');
// Second READ-ONLY preflight: FK definitions + effective table privileges.
// These checks do not authorize access to another student's rows; RLS JWT remains separate.
const accessQuery="select coalesce(json_agg(t order by t.tbl),'[]'::json) from ("+baseline.access_snapshot_sql+") t;";
const a=localPsql('BEGIN READ ONLY; '+accessQuery+' COMMIT;');
if(a.status!==0){
 console.error('COACH71 foreign-key/table-grant SQL error: '+(a.stderr||a.stdout||'unknown').slice(0,1000));
 process.exit(3);
}
const accessActual=JSON.parse(a.stdout.trim());
const roles=['anon','authenticated'];
const operations=['select','insert','update','delete','truncate','references','trigger'];
const accessExpected=new Map(baseline.access_tables.map(r=>[r.tbl,r]));
const accessPresent=new Map(accessActual.map(r=>[r.tbl,r]));
for(const [name,before] of accessExpected){
 const now=accessPresent.get(name);
 if(!now){problems.push(name+': missing table for grants/FK check');continue}
 for(const field of ['foreign_keys','foreign_keys_signature',...roles.flatMap(role=>operations.map(op=>role+'_'+op))]){
   if(now[field]!==before[field])problems.push(name+': '+field+' DIFFERENT from hosted metadata snapshot');
 }
}
for(const name of accessPresent.keys())if(!accessExpected.has(name))problems.push(name+': unexpected grants/FK entry');
if(problems.length){
 console.error('COACH71 NO GO: hosted object-shape parity not demonstrated ('+problems.length+' differences).');
 problems.slice(0,80).forEach(x=>console.error(' - '+x));
 process.exit(2);
}
console.log('COACH71 PASS: 15-table RLS, policy, trigger, index, CHECK, FK and effective table-grant catalog fingerprints MATCH the 2026-10-30 hosted baseline. No data/restore, helper function or JWT authorization, legal, clinical or device validation implied.');
