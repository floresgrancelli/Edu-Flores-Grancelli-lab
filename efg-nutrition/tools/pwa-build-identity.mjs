// Release identity authorizes the server handshake; asset identity only busts caches.
// A differing asset version is accepted ONLY for the exact pinned hotfix HTML.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function assertPwaBuildIdentity(html,hotfixBytes){
 const builds=[...html.matchAll(/<meta\s+name="efg-build"\s+content="([^"]+)"/g)];
 const entries=[...html.matchAll(/<script\s+type="module"\s+src="(\.\/pilot\.js\?[^\"]+)"/g)];
 assert.equal(builds.length,1,'Exactly one release build is required');
 assert.equal(entries.length,1,'Exactly one versioned PWA entry is required');
 const build=builds[0][1],entry=entries[0][1];
 if(entry==='./pilot.js?v='+build)return {build,assetVersion:build};
 assert.ok(hotfixBytes,'Unregistered PWA asset identity');
 assert.ok(['da0f3b0bf5c141814f152c569b45e757f5a78857afabb3eb702a6bb3a7bd68cf','fb4d7ff3cb5221c0c847471f6dc713fedd94890ba62314be69f06491b076d12c','20b839d6feadd087e0af9f83a69664ea0eec1e6fde7a6c5b28d22a55be4e6c97'].includes(digest(hotfixBytes)),'Hotfix manifest must match an exact reviewed pin');
 const hotfix=JSON.parse(hotfixBytes);
 assert.equal(build,hotfix.build,'Hotfix cannot change release identity');
 assert.equal(entry,'./pilot.js?v='+hotfix.assetVersion,'PWA entry must match the pinned hotfix asset identity');
 assert.equal(digest(html),hotfix.sha256['efg-nutrition/pilot/index.html'],'Hotfix HTML must match its pinned hash');
 return {build,assetVersion:hotfix.assetVersion};
}

