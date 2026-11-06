// Compiles the local Auth fixture in disposable PGlite. NOT real GoTrue/multisession.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {bootstrapSql,fixtureRlsSql,fixtureGrantsSql,candidateEndpoints} from './dual-workspace-ci-fixture.mjs';
assert.ok(process.env.NCC_PGLITE_MODULE,'Existing approved PGlite installation required');
const {PGlite}=await import(pathToFileURL(process.env.NCC_PGLITE_MODULE));
const db=new PGlite();
try {
 await db.exec(`create schema auth; create role anon; create role authenticated;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
 await db.exec(bootstrapSql);
 await db.exec("set ncc.dual_workspace_fixture='synthetic-v1';");
 await db.exec(readFileSync(new URL('../proposed/20261106_dual_workspace_STAGING_ONLY_NOT_APPLIED.sql',import.meta.url),'utf8'));
 for(const endpoint of candidateEndpoints)for(const role of ['anon','authenticated']){
  const {rows}=await db.query("select has_function_privilege($1,$2,'EXECUTE') ok",[role,'public.'+endpoint]);
  assert.equal(rows[0].ok,false,'Proposal remains ungranted before fixture overlay');
 }
 await db.exec(fixtureRlsSql+fixtureGrantsSql);
 for(const endpoint of candidateEndpoints){
  const {rows}=await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') ok",['public.'+endpoint]);
  assert.equal(rows[0].ok,true,'TEST-ONLY overlay grants compile');
 }
 console.log('PASS local Auth fixture SQL compile in PGlite; NOT GoTrue runtime or concurrency.');
}finally{await db.close();}
