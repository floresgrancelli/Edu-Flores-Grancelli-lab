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
 assert.ok(['da0f3b0bf5c141814f152c569b45e757f5a78857afabb3eb702a6bb3a7bd68cf','fb4d7ff3cb5221c0c847471f6dc713fedd94890ba62314be69f06491b076d12c','57cfe22ba1d0e02dfc5dc00403f92f6cef53544b2e94182155e99ea238b36f9a','cdb3606ca216837299996460ea9a0393265273d0ba32206b87c758d43c0ec85c','ec8890b59f106771fadefb84a0e7cec16a28a0c3571203601597ccf3947f3348','961015ea714acb1851c0886a95e1b3f4a8325ae5566bd701534cd6c1cf675b6b','6f7297b32227c2a2938e2eafdeba6dafab977a58a17dcf9dbe84f07a6a4cb2dc','fc58684aedb9b726c28693cf981bf43dc0eae6da3d1fa52a0ebb2a91bcfafc53','75d84c7bac06d7f50a80de59f8b3a44ab52ad97b9d0fa141807f5d67a7145342','273d14ffba10397cd45ea2068ae8c127239fe83b88688ccf932b2dfcb048e1d5','61962eed7953b7f9136520aa944bc3cf4dd6c2210c0ce4657138422eaca27499','a62650a8ab2f66367ec86888a7aaf7cb3466c97c53968923ac710bd582774528','d825e6f9db30c6fad54b7a02bf07e2ee22b49af54bc8ce0a678ba3665033e9ec','cbc5d9581cfa4c7b29b8c6d79712e8e1546ecb2f53284a32d40b66a9864b6e09','265c4f0a24e773a697f68264a1a1d489c61e58c1bbb40b3525488392931bcebe','eeda68eec8d48833a1229767d36952937eb8ab71052a7810fefdcc61f2f1180c','c4b674c4b211076a689b72241fe06df9858e9c23b1724b5022a0ff5a3bf623d2','15aef8f52ad233b123a5c0b6e66b77f827eb0b9f5b2360b8e86f62f1baf631ce','5998be8d862883ec920b85273eedf1aeea3dfce319547a1088a5149b37798fa2','ed364996e53a3a2f378fa9f6e982604cc59ae76066075d907bce564b219e3946','50e6227f8da4c66df56901b12feec8d9a9234a9f1fc94ec27fd036df65fa4d84','f5d31b6dfdd565e836d8b76c4872ab7607941264b589a268ae5abc566f26b86d'].includes(digest(hotfixBytes)),'Hotfix manifest must match an exact reviewed pin');
 const hotfix=JSON.parse(hotfixBytes);
 assert.equal(build,hotfix.build,'Hotfix cannot change release identity');
 assert.equal(entry,'./pilot.js?v='+hotfix.assetVersion,'PWA entry must match the pinned hotfix asset identity');
 assert.equal(digest(html),hotfix.sha256['efg-nutrition/pilot/index.html'],'Hotfix HTML must match its pinned hash');
 return {build,assetVersion:hotfix.assetVersion};
}

