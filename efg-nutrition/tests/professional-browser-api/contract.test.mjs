// OFFLINE ONLY. nativeFetch below is deliberately mocked. No installed SDK,
// browser, IndexedDB, API, SQL, server, socket, credentials or package install.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePublicConfig,loopbackOrigin,assertApiRequest,assertBrowserRequest,metadataOnly,MODULE_HASHES} from './policy.mjs';
import {createLossFetch} from './loss-fetch.mjs';
import {verifyCandidateFiles,verifyInstalledDependencies,root,versions} from './verify-inputs.mjs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const backend='http://127.0.0.1:43001',front='http://127.0.0.1:43002'; // Offline URLs only, no listeners.
const U='10000000-0000-4000-8000-000000000001',S='10000000-0000-4000-8000-000000000002',O='20000000-0000-4000-8000-000000000001',ID='30000000-0000-4000-8000-000000000001';
const digest=async x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const payload={id:ID,student_id:S,coach_id:U,sender_id:U,body:'SYNTHETIC OFFLINE PAYLOAD'};
async function record(action='sendMessage') {
  const r={version:1,backendNamespace:backend,scope:{userId:U,organizationId:O},operationId:ID,action,studentId:action==='setAlias'?null:S,createdAt:'2026-11-07T00:00:00.000Z',payloadDigest:await digest(action==='sendMessage'?['ncc-message-v1',S,U,U,payload.body]:['ncc-mutation-v1',action,action==='markRead'?[ID]:[]])};
  if(action==='markRead')r.readIds=[ID];r.lane=JSON.stringify([backend,U,O,action,r.studentId]);return r;
}
const config=()=>({frontendOrigin:front,backendOrigin:backend,runId:'offline-case-001',dbName:'ncc-professional-fixture-journal-offline-case-001',sdk:{path:'/sdk/published-entry.js',format:'umd',sha256:'a'.repeat(64),version:'2.118.0'}});
const request=body=>({method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}});
async function fixture({nativeFetch=async()=>new Response('{}',{status:201}),action='sendMessage',recordOverride,hash=digest}={}) {
  const r=recordOverride||await record(action);let calls=0;
  const f=createLossFetch({nativeFetch:async(...args)=>{calls++;return nativeFetch(...args);},backendOrigin:backend,readReservations:async()=>[r],digest:hash});
  f.arm({action,studentId:action==='setAlias'?null:S});return {f,r,calls:()=>calls};
}
test('exact three candidate files and OFF disk defaults',async()=>{
  const actual=await verifyCandidateFiles();
  assert.deepEqual(Object.fromEntries(Object.entries(actual.files).map(([k,v])=>[k,v.sha256])),MODULE_HASHES);
  for(const [name,flags] of Object.entries({'professional-mutation-journal.mjs':['PROFESSIONAL_RECONCILIATION_ENABLED'],'professional-screens-candidate.mjs':['PROFESSIONAL_SCREENS_RELEASE_ENABLED'],'professional-screens-transport.mjs':['PROFESSIONAL_TRANSPORT_ENABLED','PROFESSIONAL_BACKEND_EXECUTION_ENABLED']})){
    const s=actual.files[name].bytes.toString('utf8');for(const flag of flags)assert.match(s,new RegExp('export const '+flag+' = false;'));
  }
});
test('journal identity is shared only with exact version query',async()=>{
  const source=resolve(process.env.NCC_CANDIDATE_ROOT||resolve(root,'../../pilot'),'professional-mutation-journal.mjs');
  const same=await import(pathToFileURL(source).href+'?v=ncc-professional-reconciliation-r1-20261107'),other=await import(pathToFileURL(source).href);
  const journal=same.createProfessionalMutationJournal();assert.equal(same.isProfessionalMutationJournal(journal),true);assert.equal(other.isProfessionalMutationJournal(journal),false);
});
test('public config has no secrets and binds DB name to run',()=>{
  assert.equal(validatePublicConfig(config()).dbName,config().dbName);
  for(const mutate of [c=>c.password='secret',c=>c.sdk.version='2.119.0',c=>c.dbName+='-other',c=>c.sdk.path='https://cdn.invalid/sdk.js',c=>c.runId='../x']) {const c=config();mutate(c);assert.throws(()=>validatePublicConfig(c));}
});
for(const bad of ['https://example.com','http://127.0.0.1:80','http://localhost.attacker.invalid','http://127.0.0.1:43001/','http://user:pass@127.0.0.1:43001','http://127.0.0.1:43001?token=x','http://127.0.0.1:43001#x','file:///tmp/x'])test('origin rejects '+bad,()=>assert.throws(()=>loopbackOrigin(bad)));
test('API allowlist excludes admin, token refresh, outside routes and secret query',()=>{
  assertApiRequest(backend+'/auth/v1/token?grant_type=password','POST',backend);
  for(const [path,method] of [['/auth/v1/admin/users','GET'],['/auth/v1/token?grant_type=refresh_token','POST'],['/rest/v1/efg_profiles','PATCH'],['/rest/v1/efg_messages?access_token=x','GET'],['/rest/v1/efg_messages?select=id&select=body','GET']])assert.throws(()=>assertApiRequest(backend+path,method,backend));
});
test('browser allows exact supplied origin/path; rejects unlisted scripts and other loopback ports',()=>{
  const c=config(),a=new Set(['/','/harness/browser.mjs']);assert.equal(assertBrowserRequest(front+'/','GET',c,a).kind,'asset');
  for(const url of [front+'/missing.mjs','http://127.0.0.1:43999/rest/v1/efg_messages','https://sdk.invalid/a.js'])assert.throws(()=>assertBrowserRequest(url,'GET',c,a));
});
test('metadata accepts only journal schema and no tokens/content/arbitrary fields',async()=>{
  const r=await record();assert.equal(metadataOnly([r]),true);
  for(const change of [x=>x.body=payload.body,x=>x.access_token='secret',x=>x.scope.token='secret',x=>x.createdAt='secret',x=>x.lane='secret',x=>x.backendNamespace='https://example.com',x=>x.readIds=['secret']]){const x=structuredClone(r);change(x);assert.throws(()=>metadataOnly([x]));}
});
test('mock successful response is consumed fully before loss; no synthetic success returned',async()=>{
  let drained=false;const h=await fixture({nativeFetch:async()=>({ok:true,status:201,redirected:false,arrayBuffer:async()=>{drained=true;return new ArrayBuffer(0);}})});
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)),{code:'RESPONSE_LOST_AFTER_CONSUMPTION'});
  assert.equal(drained,true);assert.equal(h.calls(),1);assert.equal(h.f.stats().injected,1);assert.equal(h.f.stats().last.operationId,ID);
});
test('replay after loss with changed body/query/auth is blocked before fetch',async()=>{
  const h=await fixture();await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)));
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages?select=id',{...request({...payload,body:'CHANGED'}),headers:{authorization:'Bearer synthetic-offline'}}),{code:'REPLAY_BLOCKED'});
  assert.equal(h.calls(),1);assert.equal(h.f.stats().blockedReplays,1);
});
test('synchronous latch prevents overlap before digest/IDB awaits',async()=>{
  let release;const barrier=new Promise(r=>release=r);let arrived;const entered=new Promise(r=>arrived=r);
  const h=await fixture({hash:async x=>{arrived();await barrier;return digest(x);}});
  const first=h.f.fetch(backend+'/rest/v1/efg_messages',request(payload));const rejection=assert.rejects(first);await entered;
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)),{code:'REPLAY_BLOCKED'});release();await rejection;assert.equal(h.calls(),1);
});
test('truncated response remains uncertain with no replay or false injection success',async()=>{
  const h=await fixture({nativeFetch:async()=>({ok:true,status:201,redirected:false,arrayBuffer:async()=>{throw new Error('offline truncated body');}})});
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)));assert.equal(h.f.stats().injected,0);
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)),{code:'REPLAY_BLOCKED'});assert.equal(h.calls(),1);
});
test('network failure remains latched; never reset on uncertain outcome',async()=>{
  const h=await fixture({nativeFetch:async()=>{throw new Error('offline network failure');}});
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)));
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)),{code:'REPLAY_BLOCKED'});assert.equal(h.calls(),1);
});
test('request forces no redirects, no cookies and no cache; rejects 302',async()=>{
  let options;const h=await fixture({nativeFetch:async req=>{options=req;return new Response(null,{status:302});}});
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)),{code:'REDIRECT_REJECTED'});
  assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
});
test('raw ambiguous URLs and already normalized Request/URL objects are blocked',async()=>{
  for(const input of [backend+'/rest/v1/x/../efg_messages',backend+'/rest/v1/%65fg_messages',new URL(backend+'/rest/v1/efg_messages'),new Request(backend+'/rest/v1/efg_messages')]){
    const h=await fixture();await assert.rejects(h.f.fetch(input,request(payload)));assert.equal(h.calls(),0);
  }
});
test('wrong UUID/digest or no reservation never dispatches',async()=>{
  for(const change of [p=>p.id='40000000-0000-4000-8000-000000000001',p=>p.body='DIFFERENT',p=>p.coach_id=S,p=>p.read_at='2026-11-07T00:00:00.000Z']){
    const h=await fixture(),p=structuredClone(payload);change(p);await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(p)));assert.equal(h.calls(),0);
  }
});
test('failed HTTP response is never mislabeled drained success',async()=>{
  const h=await fixture({nativeFetch:async()=>new Response('{}',{status:403})});await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages',request(payload)),{code:'LOSS_REQUIRES_SUCCESSFUL_RESPONSE'});assert.equal(h.f.stats().injected,0);
});
test('alias validates existing action digest but never claims content-bound receipt',async()=>{
  const h=await fixture({action:'setAlias',nativeFetch:async()=>new Response('true',{status:200})});
  await assert.rejects(h.f.fetch(backend+'/rest/v1/rpc/efg_set_coach_alias',request({p_alias:'ncc.synthetic.alias'})),{code:'RESPONSE_LOST_AFTER_CONSUMPTION'});assert.equal(h.calls(),1);
});
test('markRead validates exact pair, sender, null and journal IDs',async()=>{
  const query=new URLSearchParams({student_id:'eq.'+S,coach_id:'eq.'+U,sender_id:'eq.'+S,read_at:'is.null',id:'in.('+ID+')'});
  const h=await fixture({action:'markRead',nativeFetch:async()=>new Response('[]',{status:200})});
  await assert.rejects(h.f.fetch(backend+'/rest/v1/efg_messages?'+query,{method:'PATCH',body:JSON.stringify({read_at:'2026-11-07T00:00:01.000Z'})}),{code:'RESPONSE_LOST_AFTER_CONSUMPTION'});assert.equal(h.calls(),1);
  const wrong=await fixture({action:'markRead'});query.set('coach_id','eq.'+S);await assert.rejects(wrong.f.fetch(backend+'/rest/v1/efg_messages?'+query,{method:'PATCH',body:JSON.stringify({read_at:'2026-11-07T00:00:01.000Z'})}),{code:'READ_FILTER_MISMATCH'});assert.equal(wrong.calls(),0);
});
test('harness does not restore auth or collect token-bearing artifacts',async()=>{
  const b=await readFile(new URL('./browser.mjs',import.meta.url),'utf8'),r=await readFile(new URL('./run.mjs',import.meta.url),'utf8');
  assert.match(b,/persistSession:false,autoRefreshToken:false,detectSessionInUrl:false/);assert.match(b,/db:\{retry:false\}/);
  assert.match(b,/createIndexedDBJournalDriver\(\{name:c.dbName\}\)/);assert.match(b,/getUser\(signed.session.access_token\)/);
  assert.match(r,/page.reload\(\)/);assert.match(r,/route.continue\(\)/);assert.doesNotMatch(r,/route\.(fetch|fulfill)\(/);
  assert.doesNotMatch(b+r,/storageState\s*\(|tracing\.start|recordHar:|recordVideo:|console\.error\s*\(/);
  assert.match(r,/console\.log\(JSON\.stringify\(report\)\)/);
  assert.match(r,/chromiumSandbox:true/);assert.match(r,/launch\(\{executablePath,headless:true,chromiumSandbox:true\}\)/);assert.match(r,/readFile\(executablePath\)/);
});


test('CI-generated lock verifier requires full registry/integrity/version closure, offline files only',async()=>{
  const dir=await mkdtemp(join(root,'.offline-lock-'));
  try {
    await writeFile(join(dir,'package.json'),JSON.stringify({dependencies:versions}));
    const entries={'':{dependencies:versions}};
    for(const [name,version] of Object.entries(versions)){
      const p='node_modules/'+name;await mkdir(join(dir,p),{recursive:true});await writeFile(join(dir,p,'package.json'),JSON.stringify({name,version}));
      entries[p]={version,resolved:'https://registry.npmjs.org/'+name+'/-/offline-only.tgz',integrity:'sha512-b2ZmbGluZQ=='};
    }
    entries['node_modules/@esbuild/offline-optional']={version:'0.25.5',resolved:'https://registry.npmjs.org/@esbuild/offline-optional/-/offline.tgz',integrity:'sha512-b2ZmbGluZQ==',optional:true};
    const lock={lockfileVersion:3,packages:entries},file=join(dir,'package-lock.json');await writeFile(file,JSON.stringify(lock));
    assert.equal((await verifyInstalledDependencies(join(dir,'node_modules'))).packages.length,4);
    entries['node_modules/esbuild'].resolved='https://untrusted.invalid/package.tgz';await writeFile(file,JSON.stringify(lock));
    await assert.rejects(verifyInstalledDependencies(join(dir,'node_modules')),{code:'REGISTRY_REQUIRED'});
    entries['node_modules/esbuild'].resolved='https://registry.npmjs.org/esbuild/-/offline.tgz';delete entries['node_modules/esbuild'].integrity;await writeFile(file,JSON.stringify(lock));
    await assert.rejects(verifyInstalledDependencies(join(dir,'node_modules')),{code:'PACKAGE_INTEGRITY_REQUIRED'});
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('public runner never imports private runtime approval, SQL or fake SDK',async()=>{
  const s=await readFile(new URL('./run.mjs',import.meta.url),'utf8'),build=await readFile(new URL('./build-sdk.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(s,/runtime-approval|runtime-gate|private\.json|pg_ctl|psql|createPrivateSdk/);
  assert.match(s,/REAL_NPM_SDK_BROWSER_INDEXEDDB_HTTP_WITH_SYNTHETIC_API/);assert.match(s,/notCovered:/);
  assert.match(build,/@supabase\/supabase-js/);assert.match(build,/platform:'browser'/);assert.match(build,/bundle:true/);
});
test('runtime entry refuses non-CI execution before any SDK/browser/listener work',async()=>{
  const before=process.env.GITHUB_ACTIONS;
  process.env.GITHUB_ACTIONS='false';
  try {
    const {runSyntheticBrowserBridge}=await import('./run.mjs');
    const result=await runSyntheticBrowserBridge();
    assert.equal(result.status,'NOT_RUN');assert.deepEqual(result.cases,[]);assert.deepEqual(result.codes,['CI_ONLY']);assert.equal(result.failurePhase,'preflight');
  }finally{if(before===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=before;}
});
