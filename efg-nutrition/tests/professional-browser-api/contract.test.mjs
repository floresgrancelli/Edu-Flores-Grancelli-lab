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
  assert.match(r,/page.reload\(\)/);assert.match(r,/context\.on\('request'/);assert.doesNotMatch(r,/\.route\(|route\.(fetch|fulfill|continue|abort)\(|Fetch\.enable|setRequestInterception/);
  assert.doesNotMatch(b+r,/storageState\s*\(|tracing\.start|recordHar:|recordVideo:|console\.error\s*\(/);
  assert.match(r,/console\.log\(JSON\.stringify\(report\)\)/);
  assert.match(r,/chromiumSandbox:true/);assert.match(r,/launch\(\{executablePath,headless:true,chromiumSandbox:true\}\)/);assert.match(r,/inspectLaunchPreflight\(OFFICIAL_CHROME_TARGET\.executablePath\)/);assert.match(r,/browserBinarySha256:report\.launchPreflight\.selectedExecutable\.sha256/);
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
    assert.equal(result.status,'NOT_RUN');assert.deepEqual(result.cases,[]);assert.deepEqual(result.codes,['CI_ONLY']);assert.equal(result.failurePhase,'preflight');assert.equal(result.launchPreflight,undefined);assert.equal(result.runtime,undefined);
  }finally{if(before===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=before;}
});

test('launcher maps observed failures to fixed categories and drops sensitive sentinel text',async()=>{
  const {classifyLaunchError}=await import('./run.mjs');
  const cases=[
    ['Failed to move to new namespace: errno = Operation not permitted','SANDBOX_NAMESPACE_DENIED'],
    ['No usable sandbox!','SANDBOX_UNAVAILABLE'],
    ['The SUID sandbox helper binary was found, but is not configured correctly.','SUID_SANDBOX_CONFIGURATION'],
    ['Running as root without --no-sandbox is not supported','ROOT_SANDBOX_CONFLICT'],
    ['Missing X server or $DISPLAY','DISPLAY_UNAVAILABLE'],
    ["Executable doesn't exist at /a/b",'BINARY_MISSING'],
    ['spawn /a/b EACCES','BINARY_NOT_EXECUTABLE'],
    ['error while loading shared libraries: libexample.so.1','SHARED_LIBRARY_MISSING'],
    ['browserType.launch: Timeout 30000ms exceeded.','LAUNCH_TIMEOUT'],
  ];
  for(const [message,expected] of cases){
    const result=classifyLaunchError(Object.assign(new Error(message+' SENSITIVE_SENTINEL_TOKEN_DO_NOT_EMIT'),{headers:{authorization:'SENSITIVE_SENTINEL_TOKEN_DO_NOT_EMIT'}}));
    assert.ok(result.categories.includes(expected));assert.equal(result.appArmorCauseEstablished,false);assert.equal(result.rawErrorRetained,false);
    assert.equal(JSON.stringify(result).includes('SENSITIVE_SENTINEL'),false);assert.equal(JSON.stringify(result).includes('/a/b'),false);
  }
});
test('launcher unknown failures stay unknown; AppArmor context is not a diagnosed cause',async()=>{
  const {classifyLaunchError}=await import('./run.mjs');
  const result=classifyLaunchError({name:'SENSITIVE_SENTINEL',message:'Possible AppArmor? Browser closed for unknown reason SENSITIVE_SENTINEL',stack:'SENSITIVE_SENTINEL'});
  assert.deepEqual(result.categories,['UNCLASSIFIED_LAUNCH_FAILURE']);assert.equal(result.errorType,'UNKNOWN');assert.equal(result.appArmorCauseEstablished,false);
  assert.equal(JSON.stringify(result).includes('SENSITIVE_SENTINEL'),false);
  assert.deepEqual(classifyLaunchError({name:'TimeoutError'}).categories,['LAUNCH_TIMEOUT']);
});
test('launcher retains only allowlisted process exit metadata',async()=>{
  const {classifyLaunchError}=await import('./run.mjs');
  const r=classifyLaunchError(new Error('<launched> pid=1234\n[pid=1234] process did exit: exitCode=1, signal=SIGABRT\nSENSITIVE_SENTINEL'));
  assert.equal(r.processLaunched,true);assert.equal(r.observedExitCode,1);assert.equal(r.observedSignal,'SIGABRT');assert.equal(JSON.stringify(r).includes('1234'),false);
  assert.equal(classifyLaunchError(new Error('signal=SIG_SECRET_SENTINEL')).observedSignal,null);
});
test('launch preflight parser returns public facts without enabling an alternative browser',async()=>{
  const {summarizeLaunchSystemFacts}=await import('./run.mjs');
  const facts={osRelease:'ID=ubuntu\nVERSION_ID="24.04"\nSECRET=SENSITIVE_SENTINEL',appArmorEnabled:'Y\n',appArmorRestrictUserns:'1\n',unprivilegedUsernsClone:'1\n',maxUserNamespaces:'12345\n',
    chromeProfile:'profile chrome /opt/google/chrome/chrome flags=(unconfined) {\n  userns,\n}\n# SENSITIVE_SENTINEL',loadedProfiles:'chrome (unconfined)\nother (enforce)',
    dpkgStatus:'Package: unrelated\nStatus: install ok installed\n\nPackage: google-chrome-stable\nStatus: install ok installed\nVersion: 156.0.8078.79-1\nDescription: SENSITIVE_SENTINEL'};
  const r=summarizeLaunchSystemFacts(facts);assert.equal(r.osId,'ubuntu');assert.equal(r.osVersion,'24.04');assert.equal(r.appArmorRestrictUnprivilegedUserns,1);
  assert.equal(r.chromeProfileMentionsOfficialBinary,true);assert.equal(r.chromeProfileHasUsernsRule,true);assert.equal(r.chromeProfileListedAsLoaded,true);
  assert.equal(r.googleChromePackageInstalled,true);assert.equal(r.googleChromePackageVersion,'156.0.8078.79-1');assert.equal(r.factsOnlyNotLaunchAuthorization,true);
  assert.equal(JSON.stringify(r).includes('SENSITIVE_SENTINEL'),false);
});
test('unreadable launch metadata and commented rules cannot imply support or restrictions',async()=>{
  const {summarizeLaunchSystemFacts}=await import('./run.mjs');
  const r=summarizeLaunchSystemFacts({chromeProfile:'# userns,\n# /opt/google/chrome/chrome',maxUserNamespaces:'SENSITIVE_SENTINEL'});
  assert.equal(r.appArmorEnabled,null);assert.equal(r.appArmorRestrictUnprivilegedUserns,null);assert.equal(r.maxUserNamespaces,null);
  assert.equal(r.chromeProfileHasUsernsRule,false);assert.equal(r.chromeProfileMentionsOfficialBinary,false);assert.equal(r.chromeProfileListedAsLoaded,null);assert.equal(r.googleChromePackageInstalled,null);
  const unknown=summarizeLaunchSystemFacts();assert.equal(unknown.chromeProfileMentionsOfficialBinary,null);assert.equal(unknown.chromeProfileHasUsernsRule,null);
  assert.equal(summarizeLaunchSystemFacts({dpkgStatus:'Package: other\nStatus: install ok installed'}).googleChromePackageInstalled,false);
});
test('diagnostic patch keeps one sandboxed launch and has no shell, alternate launch or setting writes',async()=>{
  const r=await readFile(new URL('./run.mjs',import.meta.url),'utf8');
  assert.equal((r.match(/\.launch\(/g)||[]).length,1);assert.match(r,/launch\(\{executablePath,headless:true,chromiumSandbox:true\}\)/);
  assert.doesNotMatch(r,/child_process|execSync|execFile|spawn\(|chmod\(|chown\(|writeFile\(/);
  assert.match(r,/selection:OFFICIAL_CHROME_TARGET\.selector,automaticFallback:false,downloadedChromiumRetried:false/);
  assert.doesNotMatch(r,/chromium\.executablePath\(/);
  assert.match(r,/process\.env\.NCC_BROWSER===OFFICIAL_CHROME_TARGET\.environmentValue/);
});

test('official Chrome selection is one fixed verified target, not an arbitrary path or fallback',async()=>{
  const {OFFICIAL_CHROME_TARGET:t,verifyOfficialChromeTarget}=await import('./run.mjs');
  assert.equal(t.environmentValue,'system-chrome');assert.equal(t.executablePath,'/opt/google/chrome/chrome');assert.equal(t.browserVersion,'156.0.8078.79');
  const observed={selection:t.selector,system:{googleChromePackageInstalled:true,googleChromePackageVersion:t.packageVersion,chromeProfileFileReadable:true,chromeProfileMentionsOfficialBinary:true,chromeProfileHasUsernsRule:true,chromeProfileListedAsLoaded:null},
    selectedExecutable:{status:'PRESENT',elf:true,executableBit:true,ownedByRoot:true,sha256:t.sha256}};
  assert.equal(verifyOfficialChromeTarget(observed),t.executablePath); // unknown loaded profile is not promoted to proof
  assert.equal(observed.system.chromeProfileListedAsLoaded,null);
  for(const change of [p=>p.selection='PLAYWRIGHT_PINNED_DOWNLOAD_ONLY',p=>p.system.googleChromePackageInstalled=false,p=>p.system.googleChromePackageInstalled=null,p=>p.system.googleChromePackageVersion='1.0.0',
    p=>p.selectedExecutable.status='MISSING',p=>p.selectedExecutable.sha256='a'.repeat(64),p=>p.selectedExecutable.elf=false,p=>p.selectedExecutable.executableBit=false,p=>p.selectedExecutable.ownedByRoot=false,
    p=>p.system.chromeProfileFileReadable=false,p=>p.system.chromeProfileMentionsOfficialBinary=false,p=>p.system.chromeProfileHasUsernsRule=null]){
    const p=structuredClone(observed);change(p);assert.throws(()=>verifyOfficialChromeTarget(p));
  }
  const extra=structuredClone(observed);extra.executablePath='/arbitrary/unsafe';assert.equal(verifyOfficialChromeTarget(extra),'/opt/google/chrome/chrome');
});

test('passive HTTP observation validates native OPTIONS without producing or changing requests',async()=>{
  const {observeHttpRequest}=await import('./run.mjs'),c=config(),assets=new Set(['/','/harness/browser.mjs']);
  assert.deepEqual(observeHttpRequest({url:front+'/',method:'GET',isNavigation:true},c,assets),{kind:'asset',preflight:false,action:null});
  assert.deepEqual(observeHttpRequest({url:backend+'/rest/v1/efg_messages?select=id',method:'OPTIONS',preflightMethod:'POST'},c,assets),{kind:'api',preflight:true,action:null});
  assert.deepEqual(observeHttpRequest({url:backend+'/rest/v1/efg_messages?select=id',method:'POST'},c,assets),{kind:'api',preflight:false,action:'sendMessage'});
  for(const request of [
    {url:'https://external.invalid/a',method:'GET'},
    {url:backend+'/auth/v1/user',method:'GET',redirected:true},
    {url:backend+'/auth/v1/admin/users',method:'OPTIONS',preflightMethod:'GET'},
    {url:backend+'/rest/v1/efg_messages',method:'OPTIONS'},
    {url:front+'/',method:'OPTIONS',preflightMethod:'GET'},
    {url:backend+'/auth/v1/user',method:'GET',isNavigation:true}
  ])assert.throws(()=>observeHttpRequest(request,c,assets));
});
test('native CORS remains mandatory and HTTP interception is absent from the runner',async()=>{
  const r=await readFile(new URL('./run.mjs',import.meta.url),'utf8'),assets=await readFile(new URL('./assets-server.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(r,/\.route\(|route\.(continue|fetch|fulfill|abort)\(|Fetch\.enable|setRequestInterception/);
  assert.match(r,/routeWebSocket/);assert.match(r,/httpInterception:false/);
  assert.match(r,/final\.cors\.preflightRequests>0&&final\.cors\.optionsAccepted>0&&final\.cors\.originRejected===0,'CORS_NOT_EXERCISED'/);
  assert.match(r,/'CORS_NOT_EXERCISED'.*\]\.includes/);
  for(const phase of ['reopen_context','reconcile_receipt','reconcile_receipt_result','reconcile_journal','final_network_observation','verify_native_cors','verify_exact_receipt_read'])assert.ok(r.includes("':"+phase+"'"));
  assert.match(assets,/default-src 'none'; script-src 'self'; connect-src \$\{backendOrigin\}; base-uri 'none'; form-action 'none'/);
  assert.match(assets,/sandbox allow-scripts allow-same-origin/);assert.doesNotMatch(assets,/allow-top-navigation|allow-popups|allow-forms/);
});
