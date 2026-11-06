import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLocalStatus,requireDisposableEnvironment} from './dual-workspace-ci-guards.mjs';
test('local Auth guard requires explicit fixture and rejects hosted connection variables',()=>{
 assert.doesNotThrow(()=>requireDisposableEnvironment({NCC_DISPOSABLE_FIXTURE:'synthetic-v1'}));
 assert.throws(()=>requireDisposableEnvironment({}));
 for(const name of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','DATABASE_URL','SUPABASE_URL']){
  assert.throws(()=>requireDisposableEnvironment({NCC_DISPOSABLE_FIXTURE:'synthetic-v1',[name]:'DO_NOT_USE'}));
 }
});
test('local Auth status parser only allows numeric loopback API and expected database',()=>{
 const valid='API_URL="http://127.0.0.1:54321"\nANON_KEY="local-test-value"\nDB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"';
 assert.equal(parseLocalStatus(valid).base,'http://127.0.0.1:54321');
 for(const url of ['https://127.0.0.1:54321','http://remote.example.invalid:54321','http://localhost:54321','http://127.0.0.1:443','http://user@127.0.0.1:54321','http://127.0.0.1:54321/path','http://127.0.0.1:54321?redirect=remote','http://127.0.0.1:54321/#data']){
  assert.throws(()=>parseLocalStatus(valid.replace('http://127.0.0.1:54321',url)));
 }
 assert.throws(()=>parseLocalStatus(valid.replace('127.0.0.1:54322','remote.example.invalid:54322')));
});
test('dedicated CI is bounded read-only and contains no hosted deployment commands',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/ncc-dual-workspace-isolated-qa.yml',import.meta.url),'utf8');
 assert.match(workflow,/contents: read/);assert.match(workflow,/cancel-in-progress: true/);
 assert.equal((workflow.match(/persist-credentials: false/g)||[]).length,3);
 assert.equal((workflow.match(/runs-on: ubuntu-latest/g)||[]).length,3);
 assert.doesNotMatch(workflow,/secrets\.|pull_request_target|self-hosted|id-token:|contents: write|supabase (link|db push)|render deploy|vercel|netlify/);
 assert.match(workflow,/playwright@1\.56\.1/);assert.match(workflow,/@electric-sql\/pglite@0\.3\.14/);
 assert.match(workflow,/engine: \[chromium, webkit\]/);
});
