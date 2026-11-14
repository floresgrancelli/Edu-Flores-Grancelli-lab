import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const bytes=readFileSync(new URL('docs/p30k-closure/asset-manifest.json',root));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'505ab0f21dc4db8109990f04eff330755cbbd5e2c1ccb269c22dd90091c2df60','Approved release manifest must not drift');
const manifest=JSON.parse(bytes);
assert.equal(manifest.proposedBuild,'ncc-pilot-3a40474052be');
const fixBytes=readFileSync(new URL('docs/p30o-guide/asset-overrides.json',root));
assert.equal(createHash('sha256').update(fixBytes).digest('hex'),'da0f3b0bf5c141814f152c569b45e757f5a78857afabb3eb702a6bb3a7bd68cf','P30O candidate asset identities (not production approval)');
const fix=JSON.parse(fixBytes);
// A separately pinned private candidate may replace assets, never release flags.
const candidatePath=new URL('docs/guide-return-candidate/asset-manifest.json',root);
let candidate=null;
if(existsSync(candidatePath)){
 const candidateBytes=readFileSync(candidatePath);
 assert.equal(createHash('sha256').update(candidateBytes).digest('hex'),'97e270dd158ab56e6fc3390a9c5be82ab2195bc3cc0401a67306a8d00596f38a','Exact private candidate manifest');
 candidate=JSON.parse(candidateBytes);
 assert.equal(candidate.status,'RELEASE_CANDIDATE');
 assert.equal(candidate.baseline,'9aaddfe21d77302224f93ea82be3b215c86769d6');
 assert.equal(candidate.build,manifest.proposedBuild);
 for(const [path,expected] of Object.entries(candidate.sha256)){
  assert.equal(createHash('sha256').update(readFileSync(new URL(path.replace(/^efg-nutrition\//,''),root))).digest('hex'),expected,'Private candidate asset: '+path);
 }
}
assert.equal(fix.baseline,'f00dc7ff6a35bd2aace22c15389caf7420457498');
assert.deepEqual(Object.keys(fix.sha256).sort(),['efg-nutrition/pilot/index.html','efg-nutrition/pilot/pilot.js','efg-nutrition/pilot/coach-pilot-intake-client.js','efg-nutrition/pilot/coach-relaunch-entry-client.js','efg-nutrition/pilot/guided-meal-picker.css'].sort());
assert.equal(createHash('sha256').update(readFileSync(new URL('pilot/index.html',root))).digest('hex'),candidate?.sha256['efg-nutrition/pilot/index.html']??fix.sha256['efg-nutrition/pilot/index.html'],'Pinned HTML hash');
// This is a source contract, not proof of hosted activation or human approval.
// Owner GO is recorded in GO_APPLIED.md and the release PR.
for(const item of manifest.files){
 assert.equal(createHash('sha256').update(readFileSync(new URL(item.path.replace(/^efg-nutrition\//,''),root))).digest('hex'),candidate?.sha256[item.path]??fix.sha256[item.path]??item.stagedSha256,item.path);
}
for(const item of [...manifest.activationFlags,...manifest.deliberatelyDisabledFlags]){
 const source=readFileSync(new URL(item.file.replace(/^efg-nutrition\//,''),root),'utf8');
 const expected=item.proposed??item.enabled;
 assert.match(source,new RegExp('(?:export )?const '+item.flag+'='+expected+'\\s*;'),item.flag);
}
export function expectedReleaseFlag(flag){
 const item=manifest.activationFlags.find(x=>x.flag===flag);
 assert.ok(item,'Only explicitly reviewed release flags may be expected ON');
 return item.proposed;
}


export const expectedAssetVersion=candidate?.assetVersion??manifest.proposedBuild;

export function expectedModuleAssetVersion(path){
 if(!candidate?.moduleVersions)return expectedAssetVersion;
 assert.ok(candidate.sha256[path],'Module must be present in the pinned graph: '+path);
 assert.ok(candidate.moduleVersions[path],'Module must have an exact pinned identity: '+path);
 return candidate.moduleVersions[path];
}
const professionalConfig=readFileSync(new URL('pilot/professional-workspace-release-config.mjs',root),'utf8');
assert.match(professionalConfig,/export const PROFESSIONAL_WORKSPACE_RELEASE_ENABLED = true;/);
assert.match(professionalConfig,/export const PROFESSIONAL_WORKSPACE_RELEASE_BACKEND = 'https:\/\/cyjvddhimbsfipjfctsl\.supabase\.co';/);
assert.equal(candidate.professionalWorkspaceActivation.enabled,true);
assert.equal(candidate.professionalWorkspaceActivation.individualAcceptanceRequired,true);
