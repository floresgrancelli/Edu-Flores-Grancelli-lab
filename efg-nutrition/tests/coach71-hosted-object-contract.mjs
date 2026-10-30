// COACH71 metadata-only contract; no DB access and NO release certification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const base=new URL('./sql/coach71-hosted-object-signatures-20261030.json',import.meta.url);
const m=JSON.parse(readFileSync(base,'utf8'));
assert.equal(m.project,'cyjvddhimbsfipjfctsl');
assert.equal(m.tables.length,15);
assert.equal(new Set(m.tables.map(t=>t.tbl)).size,15);
const totals={policies:0,triggers:0,indexes:0,checks:0};
for(const t of m.tables){
  assert.equal(t.rls,true,'hosted RLS must be enabled');
  assert.equal(t.force_rls,false,'unexpected hosted FORCE RLS');
  for(const kind of Object.keys(totals)){
    assert.ok(Number.isInteger(t[kind])&&t[kind]>=0,kind+' count invalid');
    totals[kind]+=t[kind];
    const signature=t[kind+'_signature'];
    assert.ok(t[kind]===0 ? signature===null : /^[0-9a-f]{32}$/.test(signature),kind+' signature missing');
  }
}
assert.deepEqual(totals,{policies:40,triggers:8,indexes:39,checks:38});

assert.equal(m.totals.foreign_keys,27);
assert.equal(m.access_tables.length,15);
assert.equal(new Set(m.access_tables.map(t=>t.tbl)).size,15);
assert.equal(m.access_tables.reduce((n,t)=>n+t.foreign_keys,0),27);
const operations=['select','insert','update','delete','truncate','references','trigger'];
for(const row of m.access_tables){
  assert.ok(row.foreign_keys>0);
  assert.match(row.foreign_keys_signature,/^[0-9a-f]{32}$/);
  for(const op of operations){
    assert.equal(row['anon_'+op],false,'anonymous direct table grant unexpectedly enabled');
    assert.equal(typeof row['authenticated_'+op],'boolean');
  }
}
assert.equal(m.access_tables.filter(t=>t.authenticated_select).length,15);
assert.match(m.access_snapshot_sql,/^\s*select\s/i);
assert.doesNotMatch(m.access_snapshot_sql,/;/);

assert.match(m.snapshot_sql,/^\s*select\s/i);
assert.doesNotMatch(m.snapshot_sql,/;\s*(drop|delete|update|insert|alter|create|grant|revoke|copy)\b/i);
const guard=spawnSync(process.execPath,
  [new URL('../scripts/coach71-hosted-preflight.mjs',import.meta.url).pathname],
  {encoding:'utf8',env:{...process.env,PGHOST:'',PGPORT:'',PGDATABASE:''},timeout:5000});
assert.equal(guard.status,3,'COACH71 must refuse non-local/unknown PostgreSQL target before any SQL');
assert.match(guard.stderr,/COACH71 STOP/);
console.log('PASS COACH71: hosted metadata snapshot internally consistent; strict preflight refuses unknown DB. No staging comparison or restore performed.');
