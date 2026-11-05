import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {assertPwaBuildIdentity} from '../tools/pwa-build-identity.mjs';
const root=resolve(import.meta.dirname,'../..');
const bytes=readFileSync(resolve(root,'efg-nutrition/docs/guide-return-candidate/asset-manifest.json'));
const m=JSON.parse(bytes),read=p=>readFileSync(resolve(root,p),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
test('private manifest pins HTML, complete module graph, and existing CSS',()=>{
 assert.equal(m.status,'RELEASE_CANDIDATE');
 assert.equal(m.build,'ncc-pilot-3a40474052be');assert.equal(m.noFlagChanges,true);
 assert.ok(Object.keys(m.sha256).length>=100);
 for(const [p,digest]of Object.entries(m.sha256))assert.equal(hash(readFileSync(resolve(root,p))),digest,p);
 for(const css of m.stylesheets)assert.equal(hash(readFileSync(resolve(root,css.path))),css.sha256,css.path);
});
test('HTML release identity preserved and candidate asset identity strictly pinned',()=>{
 const html=read('efg-nutrition/pilot/index.html');const result=assertPwaBuildIdentity(html,bytes);
 assert.equal(result.build,m.build);assert.equal(result.assetVersion,m.assetVersion);
 assert.throws(()=>assertPwaBuildIdentity(html,Buffer.from(bytes.toString()+' ')),/pin/);
 assert.throws(()=>assertPwaBuildIdentity(html.replace('name="efg-build" content="'+m.build,'name="efg-build" content="bad'),bytes));
 assert.throws(()=>assertPwaBuildIdentity(html+'<!-- changed -->',bytes));
});
test('all local module edges share candidate version, include whole-egg module, and preserve external SDK',()=>{
 let edges=0,eggEdges=0;
 for(const p of Object.keys(m.sha256).filter(p=>p.endsWith('.js'))){
  for(const hit of read(p).matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const url=hit[1];if(!/\.m?js(?:\?|$)/.test(url))continue;
   assert.equal(new URL(url,'https://example.invalid/').searchParams.get('v'),m.assetVersion,p+' '+url);
   const target=resolve(dirname(resolve(root,p)),url.split('?')[0]);assert.ok(existsSync(target),target);
   assert.ok(m.sha256[target.slice(root.length+1)],'Every import must be hashed');edges++;if(url.includes('guided-countable-portions.js'))eggEdges++;
  }
 }
 assert.ok(edges>100);assert.ok(eggEdges>=3);
 assert.match(read('efg-nutrition/pilot/pilot.js'),/https:\/\/esm.sh\/@supabase\/supabase-js@2.118.0/);
});
test('asset rewrite does not change feature flag values',()=>{
 for(const p of Object.keys(m.sha256).filter(p=>p.endsWith('.js'))){
  const baseline=resolve(root,'baseline',p.split('/').at(-1));if(!existsSync(baseline))continue;
  const flags=s=>[...s.matchAll(/(?:export )?const [A-Z][A-Z0-9_]*(?:ENABLED|VERIFIED)\s*=\s*(?:true|false)/g)].map(x=>x[0]);
  assert.deepEqual(flags(read(p)),flags(readFileSync(baseline,'utf8')),p);
 }
});
