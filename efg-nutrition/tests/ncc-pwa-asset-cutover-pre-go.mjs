// PWA release asset preparation: source code must remain unchanged.
// This regression stages only a versioned proposal in an OS temp directory.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const tool=join(repoRoot,'efg-nutrition/tools/prepare-ncc-pwa-assets-pre-go.mjs');
const htmlPath=join(repoRoot,'efg-nutrition/pilot/index.html');
const entryPath=join(repoRoot,'efg-nutrition/pilot/pilot.js');
const beforeHtml=readFileSync(htmlPath,'utf8'),beforeJs=readFileSync(entryPath,'utf8');
const run=(args)=>spawnSync(process.execPath,[tool,...args],{
 cwd:repoRoot,encoding:'utf8'
});
const check=run(['--check']);
assert.equal(check.status,0,check.stderr);
const checked=JSON.parse(check.stdout);
assert.equal(checked.status,'BASELINE_VALID_PRE_GO');
assert.ok(checked.stylesheets>=20&&checked.jsModules>=65);
assert.equal(checked.writes,0);
assert.equal(checked.hostedCalls,0);

const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
const build='ncc-pilot-'+sha.slice(0,12);
const directory=mkdtempSync(join(tmpdir(),'ncc-pilot-pre-go-assets-'));
try{
 assert.notEqual(run(['--emit','--out='+directory]).status,0,
  'Never stage a release proposal without the explicit review-only ack');
 assert.notEqual(run(['--emit','--ack=PREPARE_ONLY_NOT_GO',
  '--expected-sha='+('0'.repeat(40)),'--build=ncc-pilot-000000000000',
  '--out='+directory]).status,0,'Reject a stale or incorrect SHA');
 assert.notEqual(run(['--emit','--ack=PREPARE_ONLY_NOT_GO',
  '--expected-sha='+sha,'--build='+build,'--out='+repoRoot]).status,0,
  'Never write staged artifacts over repository sources');
 const emitted=run(['--emit','--ack=PREPARE_ONLY_NOT_GO',
  '--expected-sha='+sha,'--build='+build,'--out='+directory]);
 assert.equal(emitted.status,0,emitted.stderr);
 const receipt=JSON.parse(emitted.stdout);
 assert.equal(receipt.status,'STAGED_OUTSIDE_REPO_NOT_PUBLISHED');
 assert.ok(receipt.stagedFiles>2);
 const local=p=>join(directory,p);
 const stagedHtml=readFileSync(local('efg-nutrition/pilot/index.html'),'utf8');
 const stagedJs=readFileSync(local('efg-nutrition/pilot/pilot.js'),'utf8');
 const stagedNested=readFileSync(local('efg-nutrition/pilot/food-catalog.js'),'utf8');
 const manifest=JSON.parse(readFileSync(local('review-manifest.json'),'utf8'));
 assert.ok(stagedHtml.includes('name="efg-build" content="'+build+'"'));
 assert.ok(stagedHtml.includes('src="./pilot.js?v='+build+'"'));
 assert.match(stagedHtml,new RegExp('pilot\\.css\\?v='+build));
 assert.match(stagedHtml,new RegExp('styles\\.css\\?v='+build));
 assert.ok(stagedJs.includes('./food-catalog.js?v='+build));
 assert.ok(stagedNested.includes('./food-expansion.js?v='+build));
 assert.ok(stagedJs.includes('https://esm.sh/@supabase/supabase-js@2.118.0'),
  'External SDK URL is intentionally unchanged');
 assert.equal(manifest.expectedGitSha,sha);
 assert.equal(manifest.proposedBuild,build);
 assert.equal(manifest.noPublicationAuthorization,true);
 assert.equal(manifest.noHostedCalls,true);
 assert.ok(manifest.jsModules>=65);
 assert.ok(manifest.rewrittenModules>2);
 assert.ok(manifest.stagedChangedPaths.includes('efg-nutrition/pilot/index.html'));
 assert.ok(manifest.stagedChangedPaths.includes('efg-nutrition/pilot/food-catalog.js'));
 assert.equal(readFileSync(htmlPath,'utf8'),beforeHtml,'No source HTML mutation');
 assert.equal(readFileSync(entryPath,'utf8'),beforeJs,'No source JS mutation');
 assert.ok(existsSync(local('review-manifest.json')));
 console.log('PASS NCC PRE-GO asset cutover: all local module/CSS versions staged, nested imports refreshed, exact HEAD pinned, zero hosted calls and zero source edits.');
}finally{rmSync(directory,{recursive:true,force:true});}
