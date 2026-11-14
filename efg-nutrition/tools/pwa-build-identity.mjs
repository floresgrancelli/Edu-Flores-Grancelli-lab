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
 assert.ok(['da0f3b0bf5c141814f152c569b45e757f5a78857afabb3eb702a6bb3a7bd68cf','fb4d7ff3cb5221c0c847471f6dc713fedd94890ba62314be69f06491b076d12c','57cfe22ba1d0e02dfc5dc00403f92f6cef53544b2e94182155e99ea238b36f9a','cdb3606ca216837299996460ea9a0393265273d0ba32206b87c758d43c0ec85c','ec8890b59f106771fadefb84a0e7cec16a28a0c3571203601597ccf3947f3348','961015ea714acb1851c0886a95e1b3f4a8325ae5566bd701534cd6c1cf675b6b','6f7297b32227c2a2938e2eafdeba6dafab977a58a17dcf9dbe84f07a6a4cb2dc','fc58684aedb9b726c28693cf981bf43dc0eae6da3d1fa52a0ebb2a91bcfafc53','75d84c7bac06d7f50a80de59f8b3a44ab52ad97b9d0fa141807f5d67a7145342','273d14ffba10397cd45ea2068ae8c127239fe83b88688ccf932b2dfcb048e1d5','61962eed7953b7f9136520aa944bc3cf4dd6c2210c0ce4657138422eaca27499','a62650a8ab2f66367ec86888a7aaf7cb3466c97c53968923ac710bd582774528','d825e6f9db30c6fad54b7a02bf07e2ee22b49af54bc8ce0a678ba3665033e9ec','cbc5d9581cfa4c7b29b8c6d79712e8e1546ecb2f53284a32d40b66a9864b6e09','265c4f0a24e773a697f68264a1a1d489c61e58c1bbb40b3525488392931bcebe','eeda68eec8d48833a1229767d36952937eb8ab71052a7810fefdcc61f2f1180c','c4b674c4b211076a689b72241fe06df9858e9c23b1724b5022a0ff5a3bf623d2','15aef8f52ad233b123a5c0b6e66b77f827eb0b9f5b2360b8e86f62f1baf631ce','5998be8d862883ec920b85273eedf1aeea3dfce319547a1088a5149b37798fa2','ed364996e53a3a2f378fa9f6e982604cc59ae76066075d907bce564b219e3946','50e6227f8da4c66df56901b12feec8d9a9234a9f1fc94ec27fd036df65fa4d84','6d834b8b660fc4323c5a583ee881e88da81c18ffd41bbf50bed042b7a4a06c7c','9694aed22d57d943475f6680e21583c2600fe50bf1b893677631f6dba969a534','a560dcc07db13370252c8bf3e2d5282298ba2a7eb6f65c75fae756b762c792a7','5031f19ebe73a5a3b143212c0cf9fa81fca741d6665dcca2f25b1e2da7e3d8af','3276bc49f27a9f05bddbf53622103007be48dc9fdd8f6ee6826d92108ebfe656','36d20ccdb4f4b7fdf6f62d53224ca4181a50098ecaa56d700b48ef74cd71341e','6f0bf6fcd732bb31811e45bc6a0fa24a8e838449957dcfcda456eec6465adfbc','fb349d019a0a34fd3f638c51932ccde7ca2acee38ab5c4fc6d52f1da0e85159c','91863c481c23359bd4652195d2bc4de020148efe2f2321cf5550812aa0040549','073358e5a9f1fcec98f67938612d5c4f6ca59370e7274ed96054f338165b014f','3aeda23f05b279523a332333a7f82fa9c44b1b3f6cac290f2b4ca10a343a93b8','516a2e247ca95cfa94ddbe6527299f3e1614bf0ba8aff8faf4ce891e765c5629','26a7439c76bb9e89ca0cd196535687dfd8a2702ee090ec369b380ea2a3822caa','621c7165705dfd536ac0e18abbf77f2e1b3a6e7083c573c75b50dd126beaf783','8dd77495c53ad80883680b45f5eac15b1cb30d8ec0ac82f2641305e7c4f61cfb','fd0b9fd7067a269242b486cd3f674a6735dfcef76408b555a4a9f4ecd16a9268','be30648048bc2e4da95b8723a994dc1fdc97ca5b5e5df81b4a1693a1cbf7a0b3','d86f2e9d9339330830f9d1a963f02a87adc8bc05a4785629f789b0884883e6c6','5289fafe7d3dd93224caf722b6a91467a5e4311000c2344cd279038d479214d9','f5c3976e5caf26f500d083e7989a62e61f34cfd6f286128f09e055bfa85848e9','4fa01ce3beebc881d4120abd8623e6fb386b792d9e23fc719e2c6ef828592401'].includes(digest(hotfixBytes)),'Hotfix manifest must match an exact reviewed pin');
 const hotfix=JSON.parse(hotfixBytes);
 assert.equal(build,hotfix.build,'Hotfix cannot change release identity');
 assert.equal(entry,'./pilot.js?v='+hotfix.assetVersion,'PWA entry must match the pinned hotfix asset identity');
 assert.equal(digest(html),hotfix.sha256['efg-nutrition/pilot/index.html'],'Hotfix HTML must match its pinned hash');
 return {build,assetVersion:hotfix.assetVersion};
}

