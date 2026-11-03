// PRIVATE / NOT EXECUTED. No installation on import.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {attestDatabase} from '../runner/isolation.mjs';
import {aclSnapshot,rowSnapshot,q} from '../runner/snapshot.mjs';
export function installDiaryWrites({sql,out}){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_DIARY_REGISTRATION,'1');attestDatabase(sql);
 const table='public.efg_daily_logs',before=aclSnapshot(sql),rows=rowSnapshot(sql,[table,'efg_private.coach_release_switches']);
 const readPolicy=before.policies.filter(p=>p.schemaname==='public'&&p.tablename==='efg_daily_logs');
 assert.equal(readPolicy.length,1);assert.equal(readPolicy[0].cmd,'SELECT');assert.match(readPolicy[0].qual,/coach_has_student/);
 assert.equal(sql(`select has_table_privilege('authenticated','${table}','INSERT')`),'f');assert.equal(sql(`select has_table_privilege('authenticated','${table}','UPDATE')`),'f');
 assert.equal(sql(`select relrowsecurity from pg_class where oid='${table}'::regclass`),'t');
 const original=readFileSync('efg-nutrition/migrations/20261030_coach118_diary_write_gate_disabled.sql','utf8');
 const proposed=readFileSync(new URL('./writes.PROPOSAL.sql',import.meta.url),'utf8');
 const body=original.split('as $coach118_write$\n')[1].split('$coach118_write$;')[0];assert.ok(proposed.includes('as $coach118_write$\n'+body+'$coach118_write$;'));
 sql("begin;set local efg.qa.diary_write='attested_incremental';\n"+proposed+'\ncommit;');
 let restored=false;
 function restore(){if(restored)return;attestDatabase(sql);sql('begin;'+readFileSync(new URL('./restore.PROPOSAL.sql',import.meta.url),'utf8')+'commit;');assert.deepEqual(aclSnapshot(sql),before);assert.deepEqual(rowSnapshot(sql,Object.keys(rows)),rows);restored=true;sql("notify pgrst,'reload schema'");writeFileSync(out+'/diary-write-acl.json',JSON.stringify({before,after,restored:true,exactGateBody:true},null,2));}
 let after;
 try{
  assert.equal(sql("select md5(prosrc) from pg_proc where oid='efg_private.coach_diary_write_gate()'::regprocedure"),createHash('md5').update('\n'+body).digest('hex'));
  assert.equal(sql("select count(*) from pg_trigger where tgrelid='public.efg_daily_logs'::regclass and tgname='efg_coach_diary_release_gate' and tgfoid='efg_private.coach_diary_write_gate()'::regprocedure and tgenabled='O' and tgtype=23"),'1');
  assert.equal(sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_student_diary_write_gate'"),'t');
  for(const role of ['anon','authenticated'])assert.equal(sql(`select has_function_privilege(${q(role)},'efg_private.coach_diary_write_gate()','EXECUTE')`),'f');
  assert.equal(sql("select prosecdef and proconfig=array['search_path=\"\"']::text[] from pg_proc where oid='efg_private.coach_diary_write_gate()'::regprocedure"),'t');
  after=aclSnapshot(sql);
  assert.deepEqual(after.policies.filter(p=>p.tablename==='efg_daily_logs'&&p.cmd==='SELECT'),readPolicy);
  assert.deepEqual(after.policies.filter(p=>p.tablename!=='efg_daily_logs'),before.policies.filter(p=>p.tablename!=='efg_daily_logs'));
  assert.deepEqual(after.tables.filter(t=>t.name!=='efg_daily_logs'),before.tables.filter(t=>t.name!=='efg_daily_logs'));
  assert.deepEqual(after.functions.filter(f=>f.signature!=='efg_private.coach_diary_write_gate()'),before.functions);
  for(const role of ['anon','authenticated'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal(sql(`select has_table_privilege(${q(role)},'${table}',${q(privilege)})`),role==='authenticated'&&['SELECT','INSERT','UPDATE'].includes(privilege)?'t':'f');
  sql("notify pgrst,'reload schema'");return {restore,before,after};
 }catch(e){restore();throw e;}
}
