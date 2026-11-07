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
 assert.ok(['da0f3b0bf5c141814f152c569b45e757f5a78857afabb3eb702a6bb3a7bd68cf','fb4d7ff3cb5221c0c847471f6dc713fedd94890ba62314be69f06491b076d12c','57cfe22ba1d0e02dfc5dc00403f92f6cef53544b2e94182155e99ea238b36f9a','cdb3606ca216837299996460ea9a0393265273d0ba32206b87c758d43c0ec85c','ec8890b59f106771fadefb84a0e7cec16a28a0c3571203601597ccf3947f3348','961015ea714acb1851c0886a95e1b3f4a8325ae5566bd701534cd6c1cf675b6b','6f7297b32227c2a2938e2eafdeba6dafab977a58a17dcf9dbe84f07a6a4cb2dc','fc58684aedb9b726c28693cf981bf43dc0eae6da3d1fa52a0ebb2a91bcfafc53','75d84c7bac06d7f50a80de59f8b3a44ab52ad97b9d0fa141807f5d67a7145342','273d14ffba10397cd45ea2068ae8c127239fe83b88688ccf932b2dfcb048e1d5'].includes(digest(hotfixBytes)),'Hotfix manifest must match an exact reviewed pin');
 const hotfix=JSON.parse(hotfixBytes);
 assert.equal(build,hotfix.build,'Hotfix cannot change release identity');
 assert.equal(entry,'./pilot.js?v='+hotfix.assetVersion,'PWA entry must match the pinned hotfix asset identity');
 assert.equal(digest(html),hotfix.sha256['efg-nutrition/pilot/index.html'],'Hotfix HTML must match its pinned hash');
 return {build,assetVersion:hotfix.assetVersion};
}

