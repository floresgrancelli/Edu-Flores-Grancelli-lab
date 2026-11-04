import assert from 'node:assert/strict';
import {testConsumers} from './p29-qa-scope-consumers.mjs';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.NCC_PGLITE_MODULE));
const db=new PGlite();
const student='11111111-1111-4111-8111-111111111111', coach='22222222-2222-4222-8222-222222222222',org='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
const run=s=>db.exec(s);
const value=async s=>(await db.query(s)).rows[0].v;
const check=(kind='coach',id=student)=>value(`select efg_private.p29_qa_scope_required('${id}','${kind}') v`);
const denied=async fn=>assert.rejects(fn,e=>e.code==='42501');
try {
 await run(`create role anon;create role authenticated;create schema auth;create schema efg_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
 create table efg_profiles(user_id uuid primary key,role text,active boolean,organization_id uuid);
 create table efg_organizations(id uuid primary key,coach_id uuid,is_test boolean);
 insert into efg_profiles values('${student}','student',true,'${org}'),('${coach}','coach',true,null);
 insert into efg_organizations values('${org}','${coach}',true);
 select set_config('test.actor','${coach}',false);`);
 await run(readFileSync(new URL('../migrations/20261104_qa_scope_registry_NOT_APPLIED.sql',import.meta.url),'utf8'));
 assert.equal(await check(),false,'unregistered preserves legacy routing');
 await run(`insert into efg_private.p29_qa_release_scope(student_id,organization_id,coach_id,expires_at,reason) values('${student}','${org}','${coach}',clock_timestamp()+interval '1 hour','SYNTHETIC QA');`);
 assert.equal(await check(),true);assert.equal(await check('coach',other),false);
 await denied(()=>check('student'));await denied(()=>check('admin'));
 await run(`select set_config('test.actor','${student}',false)`);assert.equal(await check('student'),true);await denied(()=>check());
 await run(`select set_config('test.actor','',false)`);await denied(()=>check('student'));
 await run(`select set_config('test.actor','${coach}',false)`);
 for (const mutation of [
  `update efg_private.p29_qa_release_scope set revoked_at=clock_timestamp()`,
  `update efg_private.p29_qa_release_scope set created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour'`,
  `update efg_organizations set is_test=false`,
  `update efg_organizations set coach_id='${other}'`,
  `update efg_profiles set organization_id='${other}' where user_id='${student}'`,
  `update efg_profiles set active=false where user_id='${student}'`,
  `update efg_profiles set active=false where user_id='${coach}'`,
  `update efg_profiles set role='admin' where user_id='${coach}'`
 ]) {
  await run('begin');await run(mutation);await denied(()=>check());await run('rollback');assert.equal(await check(),true);
 }
 assert.equal(await value("select has_table_privilege('authenticated','efg_private.p29_qa_release_scope','INSERT') v"),false);
 for(const role of ['anon','authenticated']) assert.equal(await value(`select has_function_privilege('${role}','efg_private.p29_qa_scope_required(uuid,text)','EXECUTE') v`),false);
 await assert.rejects(()=>run(`update efg_private.p29_qa_release_scope set expires_at=created_at+interval '25 hours'`),e=>e.code==='23514');
 console.log('PASS P29F: scope membership, actor, expiry/revocation fail closed, test org, coach/student active, assignment changes, rollback, max TTL, client privileges. PostgreSQL '+(await db.query('show server_version')).rows[0].server_version);
await testConsumers(db,{student,coach,org,other});
}finally{await db.close();}
