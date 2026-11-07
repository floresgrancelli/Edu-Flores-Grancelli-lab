import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {assertPwaBuildIdentity} from '../tools/pwa-build-identity.mjs';
const root=resolve(import.meta.dirname,'../..');
const bytes=readFileSync(resolve(root,'efg-nutrition/docs/guide-return-candidate/asset-manifest.json'));
const m=JSON.parse(bytes),read=p=>readFileSync(resolve(root,p),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
function verifyPinnedAssets(pins){
 for(const [p,digest]of Object.entries(pins.sha256))assert.equal(hash(readFileSync(resolve(root,p))),digest,p);
 for(const css of pins.stylesheets)assert.equal(hash(readFileSync(resolve(root,css.path))),css.sha256,css.path);
}
test('private manifest pins HTML, complete module graph, and existing CSS',()=>{
 assert.equal(m.status,'RELEASE_CANDIDATE');
 assert.equal(m.build,'ncc-pilot-3a40474052be');assert.equal(m.noFlagChanges,false);assert.equal(m.professionalWorkspaceActivation.enabled,true);assert.equal(m.professionalWorkspaceActivation.individualAcceptanceRequired,true);
 assert.ok(Object.keys(m.sha256).length>=100);
 verifyPinnedAssets(m);
 const altered=structuredClone(m);altered.sha256['efg-nutrition/pilot/period-report-history.js']='0'.repeat(64);
 assert.throws(()=>verifyPinnedAssets(altered),'A wrong asset hash must fail');
});
test('HTML release identity preserved and candidate asset identity strictly pinned',()=>{
 const html=read('efg-nutrition/pilot/index.html');const result=assertPwaBuildIdentity(html,bytes);
 assert.equal(result.build,m.build);assert.equal(result.assetVersion,m.assetVersion);
 assert.throws(()=>assertPwaBuildIdentity(html,Buffer.from(bytes.toString()+' ')),/pin/);
 assert.throws(()=>assertPwaBuildIdentity(html.replace('name="efg-build" content="'+m.build,'name="efg-build" content="bad'),bytes));
 assert.throws(()=>assertPwaBuildIdentity(html+'<!-- changed -->',bytes));
});
function verifyModuleEdges(path,source,pins=m){
 let edges=0,eggEdges=0;
 for(const hit of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)){
  const url=hit[1];if(!/\.m?js(?:\?|$)/.test(url))continue;
  const target=resolve(dirname(resolve(root,path)),url.split('?')[0]);assert.ok(existsSync(target),target);
  const relative=target.slice(root.length+1),expected=pins.moduleVersions[relative];
  assert.ok(expected,'Every module target requires an exact pinned version: '+relative);
  assert.equal(url,url.split('?')[0]+'?v='+expected,path+' '+url);
  assert.ok(pins.sha256[relative],'Every import must be hashed');edges++;if(url.includes('guided-countable-portions.js'))eggEdges++;
 }
 return {edges,eggEdges};
}
test('all module URLs use the exact pinned target version; immutable old assets retain their identity',()=>{
 assert.ok(m.moduleVersions);let edges=0,eggEdges=0;
 const modulePaths=Object.keys(m.sha256).filter(p=>/\.m?js$/.test(p)).sort();
 assert.deepEqual(Object.keys(m.moduleVersions).sort(),modulePaths,'No unversioned module and no untracked version');
 for(const p of modulePaths){const result=verifyModuleEdges(p,read(p));edges+=result.edges;eggEdges+=result.eggEdges;}
 assert.ok(edges>100);assert.ok(eggEdges>=3);
 const pilot=read('efg-nutrition/pilot/pilot.js');
 assert.match(pilot,/https:\/\/esm.sh\/@supabase\/supabase-js@2.118.0/);
 const stale=pilot.replace('period-report-history.js?v='+m.moduleVersions['efg-nutrition/pilot/period-report-history.js'],'period-report-history.js?v=stale');
 assert.notEqual(stale,pilot);assert.throws(()=>verifyModuleEdges('efg-nutrition/pilot/pilot.js',stale),'Stale changed-module URLs must fail');
 const absent=structuredClone(m);delete absent.sha256['efg-nutrition/pilot/period-report-history.js'];
 assert.throws(()=>verifyModuleEdges('efg-nutrition/pilot/pilot.js',pilot,absent),'An unpinned dependency must fail');
 assert.throws(()=>verifyModuleEdges('efg-nutrition/pilot/pilot.js',"import './missing-asset-qa.js?v=never';\nimport {missing} from './missing-asset-qa.js?v=never';"),'A missing dependency file must fail');
});
test('same-origin PDF worker and new CSS are pinned; period PDF assets remain immutable',()=>{
 assert.equal(m.moduleResources.length,1);
 for(const resource of m.moduleResources){
  assert.ok(read(resource.owner).includes("new URL('"+resource.url+"',import.meta.url)"));
  assert.equal(resolve(dirname(resolve(root,resource.owner)),resource.url.split('?')[0]),resolve(root,resource.path));
  assert.equal(new URL(resource.url,'https://example.invalid/').searchParams.get('v'),m.moduleVersions[resource.path]);
  assert.equal(hash(readFileSync(resolve(root,resource.path))),m.sha256[resource.path]);
 }
 assert.ok(m.stylesheets.some(x=>x.path==='efg-nutrition/pilot/weekly-pdf-review.css'&&x.url.endsWith('?v=ncc-weekly-preview-r11-20261106')));
 assert.equal(Object.keys(m.immutablePeriodPdfAssets).length,5);
 for(const [p,digest]of Object.entries(m.immutablePeriodPdfAssets))assert.equal(hash(readFileSync(resolve(root,p))),digest,'Immutable period PDF asset: '+p);
});
test('asset rewrite does not change feature flag values',()=>{
 for(const p of Object.keys(m.sha256).filter(p=>p.endsWith('.js'))){
  const baseline=resolve(root,'baseline',p.split('/').at(-1));if(!existsSync(baseline))continue;
  const flags=s=>[...s.matchAll(/(?:export )?const [A-Z][A-Z0-9_]*(?:ENABLED|VERIFIED)\s*=\s*(?:true|false)/g)].map(x=>x[0]);
  assert.deepEqual(flags(read(p)),flags(readFileSync(baseline,'utf8')),p);
 }
});

test('R12 preserves all published report models, renderers and graph dependencies',()=>{
 assert.equal(Object.keys(m.immutableReportAssets).length,10);
 for(const [p,digest]of Object.entries(m.immutableReportAssets))assert.equal(hash(readFileSync(resolve(root,p))),digest,p);
 for(const css of m.stylesheets)assert.ok(read('efg-nutrition/pilot/index.html').includes('href=\"'+css.url+'\"'),css.url);
});
