import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {assertPwaBuildIdentity} from '../tools/pwa-build-identity.mjs';
const root=resolve(import.meta.dirname,'../..');
const bytes=readFileSync(resolve(root,'efg-nutrition/docs/guide-return-candidate/asset-manifest.json'));
const manifest=JSON.parse(bytes),hash=value=>createHash('sha256').update(value).digest('hex');
function verify(overrides={}){
 const read=path=>overrides[path]??readFileSync(resolve(root,path));
 for(const [path,digest]of Object.entries(manifest.sha256))assert.equal(hash(read(path)),digest,'Pinned asset: '+path);
 for(const css of manifest.stylesheets)assert.equal(hash(read(css.path)),css.sha256,'Pinned CSS: '+css.path);
 const candidate=read('efg-nutrition/pilot/dual-workspace-candidate.mjs').toString();
 assert.match(candidate,/export const DUAL_WORKSPACE_RELEASE_ENABLED = false;/);
 for(const [name,flags] of [['candidate',['PROFESSIONAL_SCREENS_RELEASE_ENABLED']],['transport',['PROFESSIONAL_TRANSPORT_ENABLED','PROFESSIONAL_BACKEND_EXECUTION_ENABLED']]]){
  const source=read('efg-nutrition/pilot/professional-screens-'+name+'.mjs').toString();
  for(const flag of flags)assert.ok(source.includes('export const '+flag+' = false;'));
 }
 assert.match(read('efg-nutrition/pilot/professional-mutation-journal.mjs').toString(),/export const PROFESSIONAL_RECONCILIATION_ENABLED = false;/);
 return assertPwaBuildIdentity(read('efg-nutrition/pilot/index.html').toString(),bytes);
}
test('R4 asset graph is pinned without changing server release identity',()=>{
 assert.equal(manifest.baseline,'9aaddfe21d77302224f93ea82be3b215c86769d6');
 assert.equal(manifest.build,'ncc-pilot-3a40474052be');assert.equal(manifest.assetVersion,'ncc-student-day-r1-20261110');
 assert.equal(Object.keys(manifest.moduleVersions).filter(p=>p.includes('/dual-workspace-')).length,5);
 assert.equal(Object.keys(manifest.moduleVersions).filter(p=>p.includes('/professional-screens-')).length,3);
 assert.equal(Object.keys(manifest.immutablePeriodPdfAssets).length,5);assert.equal(Object.keys(manifest.immutableReportAssets).length,10);
 assert.deepEqual(verify(),{build:manifest.build,assetVersion:manifest.assetVersion});
});
test('modified new or historical module is still rejected by exact pins',()=>{
 for(const path of ['efg-nutrition/pilot/dual-workspace-frame.mjs','efg-nutrition/pilot/weekly-report-pdf-v1.js','efg-nutrition/pilot/student-day-presentation.js'])
  assert.throws(()=>verify({[path]:readFileSync(resolve(root,path),'utf8')+'\n// altered\n'}),/Pinned asset/);
});
test('flipping DUAL flag is rejected even though all other assets are unchanged',()=>{
 const path='efg-nutrition/pilot/dual-workspace-candidate.mjs';
 const changed=readFileSync(resolve(root,path),'utf8').replace('DUAL_WORKSPACE_RELEASE_ENABLED = false','DUAL_WORKSPACE_RELEASE_ENABLED = true');
 assert.throws(()=>verify({[path]:changed}),/Pinned asset/);
});
test('altered manifest, HTML and release build cannot pass the real identity validator',()=>{
 const html=readFileSync(resolve(root,'efg-nutrition/pilot/index.html'),'utf8');
 assert.throws(()=>assertPwaBuildIdentity(html,Buffer.from(bytes.toString()+' ')),/exact reviewed pin/);
 assert.throws(()=>assertPwaBuildIdentity(html+'<!-- altered -->',bytes),/pinned hash/);
 assert.throws(()=>assertPwaBuildIdentity(html.replace('content="'+manifest.build+'"','content="wrong-release"'),bytes),/release identity/);
});
