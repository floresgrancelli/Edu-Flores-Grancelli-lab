// PRIVATE proposal: no execution on import. Requires specific fixture authorization.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {attestDatabase} from '../runner/isolation.mjs';
import {capturePermissions} from '../runner/acl-contract.mjs';
import {q} from '../runner/snapshot.mjs';
export const tables=['efg_habitual_meals','efg_personal_recipes'];
export function installDiaryFixture({sql,out}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');
 assert.equal(process.env.EFG_QA_DIARY_FIXTURE,'1');
 const identity=attestDatabase(sql); // Existing stack/config/container attestation, not hostname alone.
 for(const t of ['auth.users','public.efg_profiles','public.efg_organizations'])assert.equal(sql(`select count(*) from ${t}`),'0');
 for(const t of tables)assert.equal(sql(`select to_regclass(${q('public.'+t)}) is null`),'t');
 const before=capturePermissions(sql);
 sql("begin;set local efg.qa.diary_fixture='attested_empty_incremental';\n"+readFileSync(new URL('./tables.PROPOSAL.sql',import.meta.url),'utf8')+'\ncommit;');
 const after=capturePermissions(sql);
 for(const k of ['defaults','columns','functions'])assert.deepEqual(after[k],before[k]);
 for(const row of before.tables)assert.deepEqual(after.tables.find(x=>x.name===row.name),row);
 assert.deepEqual(after.tables.filter(x=>!before.tables.some(b=>b.name===x.name)).map(x=>x.name).sort(),tables.map(x=>'public.'+x).sort());
 for(const row of before.policies)assert.deepEqual(after.policies.find(x=>x.schemaname===row.schemaname&&x.tablename===row.tablename&&x.policyname===row.policyname),row);
 const added=after.policies.filter(x=>!before.policies.some(b=>b.schemaname===x.schemaname&&b.tablename===x.tablename&&b.policyname===x.policyname));
 assert.equal(added.length,6);
 for(const t of tables){
  assert.equal(after.tables.find(x=>x.name==='public.'+t).rls,true);
  assert.deepEqual(added.filter(x=>x.tablename===t).map(x=>x.cmd).sort(),['DELETE','INSERT','SELECT']);
  for(const p of added.filter(x=>x.tablename===t)){assert.deepEqual(p.roles,['authenticated']);assert.equal(p.permissive,'PERMISSIVE');assert.match(p.cmd==='INSERT'?p.with_check:p.qual,/student_id.*auth.uid/s);}
  for(const role of ['anon','authenticated'])for(const privilege of ['SELECT','INSERT','DELETE','UPDATE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']){
   const allowed=role==='authenticated'&&['SELECT','INSERT','DELETE'].includes(privilege);
   assert.equal(sql(`select has_table_privilege(${q(role)},${q('public.'+t)},${q(privilege)})`),allowed?'t':'f');
  }
 }
 writeFileSync(out+'/diary-fixture-acl.json',JSON.stringify({before,after,containerId:identity.containerId,synthetic:true},null,2));
 sql("notify pgrst,'reload schema'");
}
