import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const bytes=readFileSync(new URL('docs/p30k-closure/asset-manifest.json',root));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'505ab0f21dc4db8109990f04eff330755cbbd5e2c1ccb269c22dd90091c2df60','Approved release manifest must not drift');
const manifest=JSON.parse(bytes);
assert.equal(manifest.proposedBuild,'ncc-pilot-3a40474052be');
const fixBytes=readFileSync(new URL('docs/p30o-guide/asset-overrides.json',root));
assert.equal(createHash('sha256').update(fixBytes).digest('hex'),'da0f3b0bf5c141814f152c569b45e757f5a78857afabb3eb702a6bb3a7bd68cf','P30O candidate asset identities (not production approval)');
const fix=JSON.parse(fixBytes);
assert.equal(fix.baseline,'f00dc7ff6a35bd2aace22c15389caf7420457498');
assert.deepEqual(Object.keys(fix.sha256).sort(),['efg-nutrition/pilot/index.html','efg-nutrition/pilot/pilot.js','efg-nutrition/pilot/coach-pilot-intake-client.js','efg-nutrition/pilot/coach-relaunch-entry-client.js','efg-nutrition/pilot/guided-meal-picker.css'].sort());
assert.equal(createHash('sha256').update(readFileSync(new URL('pilot/index.html',root))).digest('hex'),fix.sha256['efg-nutrition/pilot/index.html'],'Released HTML hash');
// This is a source contract, not proof of hosted activation or human approval.
// Owner GO is recorded in GO_APPLIED.md and the release PR.
for(const item of manifest.files){
 assert.equal(createHash('sha256').update(readFileSync(new URL(item.path.replace(/^efg-nutrition\//,''),root))).digest('hex'),fix.sha256[item.path]??item.stagedSha256,item.path);
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
