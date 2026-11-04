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
const candidateFlags=[
 ['coach-student-journey.js','COACH_STUDENT_JOURNEY_ENABLED'],
 ['coach-plan-draft-client.js','COACH_ATOMIC_PLAN_UI_ENABLED'],
 ['coach-release-plan-gate.js','COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED'],
 ['coach-legal-bridge.js','COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED'],
 ['legal-onboarding.js','LEGAL_ONBOARDING_ENABLED'],
 ['coach-shared-recipes-read-client.js','COACH_SHARED_STUDENT_RECIPES_UI_ENABLED'],
 ['science-welcome.js','SCIENCE_WELCOME_ENABLED']
];
const mustStayOff=[
 ['coach-relaunch-onboarding.js','COACH_RELAUNCH_ONBOARDING_ENABLED'],
 ['coach-adapted-workspace.js','COACH_ADAPTED_GUIDE_PREVIEW_ENABLED'],
 ['student-restriction-declaration.js','PRIVATE_HEALTH_DECLARATION_UI_ENABLED'],
 ['major-release-client.js','MAJOR_RELEASE_FLOW_ENABLED'],
 ['release-communications.js','RELEASE_COMMUNICATIONS_ENABLED'],
 ['personal-workspace.js','PERSONAL_WORKSPACE_ENABLED'],
 ['pilot-participation-demo.js','PILOT_PARTICIPATION_ENABLED']
];
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
assert.equal(checked.activationCandidates,candidateFlags.length);
assert.equal(checked.deliberatelyDisabled,mustStayOff.length);

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

 // Pilot UI activation is review-only, always staged OUTSIDE the repository.
 // Two entry flows must NEVER turn on together: only COACH_STUDENT_JOURNEY.
 const pilotDraftDir=mkdtempSync(join(tmpdir(),'ncc-pilot-ui-draft-'));
 try{
  assert.notEqual(run(['--check','--pilot-ui-draft']).status,0,
   'Never activate UI while merely checking the source tree');
  assert.notEqual(run(['--emit','--pilot-ui-draft',
   '--expected-sha='+sha,'--build='+build,'--out='+pilotDraftDir]).status,0,
   'Draft activation without review-only ack must fail');
  assert.notEqual(run(['--emit','--pilot-ui-draft','--ack=PREPARE_ONLY_NOT_GO',
   '--expected-sha='+sha,'--build='+build,'--out='+repoRoot]).status,0,
   'Draft activation may never write over a working checkout');
  const proposed=run(['--emit','--pilot-ui-draft','--ack=PREPARE_ONLY_NOT_GO',
   '--expected-sha='+sha,'--build='+build,'--out='+pilotDraftDir]);
  assert.equal(proposed.status,0,proposed.stderr);
  const ready=JSON.parse(proposed.stdout);
  assert.equal(ready.preparationMode,'PILOT_UI_ACTIVATION_PROPOSAL_NOT_GO');
  assert.equal(ready.activationFlagsProposed,candidateFlags.length);
  const proposal=JSON.parse(readFileSync(join(pilotDraftDir,'review-manifest.json'),'utf8'));
  assert.equal(proposal.expectedGitSha,sha);
  assert.equal(proposal.pilotUiDraft,true);
  assert.equal(proposal.noHostedCalls,true);
  assert.equal(proposal.noProductionEdits,true);
  assert.equal(proposal.noPublicationAuthorization,true);
  assert.equal(proposal.hostedPrerequisitesUnverified,true);
  assert.equal(proposal.activationFlags.length,candidateFlags.length);
  for(const [file,flag]of candidateFlags){
   const original=readFileSync(join(repoRoot,'efg-nutrition/pilot',file),'utf8');
   const staged=readFileSync(join(pilotDraftDir,'efg-nutrition/pilot',file),'utf8');
   assert.ok(original.includes('export const '+flag+'=false;'),flag+' source must remain OFF');
   assert.ok(staged.includes('export const '+flag+'=true;'),flag+' proposed only');
   assert.ok(proposal.stagedChangedPaths.includes('efg-nutrition/pilot/'+file));
  }
  for(const [file,flag]of mustStayOff){
   const original=readFileSync(join(repoRoot,'efg-nutrition/pilot',file),'utf8');
   assert.ok(original.includes('export const '+flag+'=false;'),flag+' must remain OFF');
   const stagedPath=join(pilotDraftDir,'efg-nutrition/pilot',file);
   const evaluated=existsSync(stagedPath)?readFileSync(stagedPath,'utf8'):original;
   assert.ok(evaluated.includes('export const '+flag+'=false;'),flag+' cannot be proposed ON');
  }
  const activationHtml=readFileSync(join(pilotDraftDir,'efg-nutrition/pilot/index.html'),'utf8');
  assert.ok(activationHtml.includes('name="efg-build" content="'+build+'"'));
  assert.ok(activationHtml.includes('src="./pilot.js?v='+build+'"'));
  assert.ok(activationHtml.includes('pilot.css?v='+build));
  assert.equal(readFileSync(htmlPath,'utf8'),beforeHtml);
  assert.equal(readFileSync(entryPath,'utf8'),beforeJs);
  console.log('PASS NCC P23 pilot UI activation draft: 7 reviewed ON proposals including one-time educational welcome, 7 conflicting/clinical/post-GO OFF, staged versioned modules outside repository, no GO or hosted write.');
 }finally{rmSync(pilotDraftDir,{recursive:true,force:true});}
 console.log('PASS NCC PRE-GO asset cutover: all local module/CSS versions staged, nested imports refreshed, exact HEAD pinned, zero hosted calls and zero source edits.');
}finally{rmSync(directory,{recursive:true,force:true});}
