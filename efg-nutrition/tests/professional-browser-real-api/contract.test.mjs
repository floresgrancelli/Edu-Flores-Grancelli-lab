// Offline structural/guard checks only. No sockets, SDK installation or real backend.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runRealDemoBrowserBridge,OFFICIAL_CHROME_TARGET,observeHttpRequest} from './run.mjs';
import {verifyCandidateFiles} from '../professional-browser-api/verify-inputs.mjs';
import {MODULE_HASHES} from '../professional-browser-api/policy.mjs';
const source=name=>readFile(new URL(name,import.meta.url),'utf8');
test('non-CI execution fails before backend import, dependencies or listeners',async()=>{
  const saved=process.env.GITHUB_ACTIONS;delete process.env.GITHUB_ACTIONS;
  try{const r=await runRealDemoBrowserBridge();assert.equal(r.status,'NOT_RUN');assert.deepEqual(r.codes,['CI_ONLY']);assert.equal(r.cases.length,0);}finally{if(saved===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=saved;}
});
test('real demo requires its own explicit opt-in before any backend import',async()=>{
  const saved={GITHUB_ACTIONS:process.env.GITHUB_ACTIONS,NCC_REAL_BROWSER_API:process.env.NCC_REAL_BROWSER_API};
  process.env.GITHUB_ACTIONS='true';delete process.env.NCC_REAL_BROWSER_API;
  try{const r=await runRealDemoBrowserBridge();assert.equal(r.status,'NOT_RUN');assert.deepEqual(r.codes,[process.platform==='linux'?'REAL_DEMO_OPT_IN_REQUIRED':'CI_ONLY']);}finally{for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('same pinned candidate bytes and official browser target',async()=>{
  const c=await verifyCandidateFiles();assert.deepEqual(Object.fromEntries(Object.entries(c.files).map(([k,v])=>[k,v.sha256])),MODULE_HASHES);
  assert.equal(OFFICIAL_CHROME_TARGET.sha256,'da143614d917f346b02c1b29587cc13bf891d4b73faf2bea7b20cbd8fa61510f');
});
test('five original cases, asynchronous real observations and no RAM backend',async()=>{
  const s=await source('run.mjs');
  assert.match(s,/const modes=\['persisted','absent','revoked','alias','read_at'\]/);
  assert.doesNotMatch(s,/startFixtureApi|SYNTHETIC_PUBLIC_ANON_KEY/);
  assert.match(s,/await apiServer\.verifyAuthSession/);
  assert.equal([...s.matchAll(/await apiServer\.snapshot\(/g)].length,3);
  assert.match(s,/await apiServer\.makeReceiptAbsent/);assert.match(s,/await apiServer\.revokeProfessionalAccess/);
  assert.match(s,/DIRECT_LOCAL_SUPABASE_KONG_AUTH_POSTGREST/);
});
test('no HTTP interception, unsafe sandbox launch or runtime settings changes',async()=>{
  const s=await source('run.mjs');
  assert.doesNotMatch(s,/(?:context|page)\.route\(|route\.(?:fetch|fulfill|continue)\(|routeFromHAR|chromiumSandbox\s*:\s*false/);
  assert.match(s,/chromiumSandbox:true/);assert.match(s,/serviceWorkers:'block'/);
  assert.match(s,/ignoreHTTPSErrors:false/);assert.match(s,/context\.on\('request'/);
});
test('separate asset server enforces distinct origin and strict CSP',async()=>{
  const s=await source('assets-server.mjs');assert.match(s,/NCC_REAL_BROWSER_API/);
  assert.match(s,/default-src 'none'; script-src 'self'; connect-src/);assert.match(s,/value!==origin/);
  assert.match(s,/file==='browser.mjs'/);assert.match(s,/\.\.\/professional-browser-api/);
});
test('browser uses shared native fetch loss wrapper and only example.invalid accounts',async()=>{
  const s=await source('browser.mjs');assert.match(s,/from '\/harness\/loss-fetch.mjs'/);
  assert.match(s,/@example\\\.invalid/);assert.match(s,/persistSession:false,autoRefreshToken:false,detectSessionInUrl:false/);
  assert.match(s,/syntheticEnvironment:\(\)=>true/);
});
test('native request observer still rejects unexpected hosts without creating requests',()=>{
  const config={frontendOrigin:'http://127.0.0.1:44001',backendOrigin:'http://127.0.0.1:44002'};
  assert.equal(observeHttpRequest({url:config.backendOrigin+'/rest/v1/efg_messages',method:'OPTIONS',preflightMethod:'POST'},config,new Set(['/'])).preflight,true);
  assert.throws(()=>observeHttpRequest({url:'https://outside.invalid/',method:'GET'},config,new Set(['/'])));
});

const {createNetworkObserver}=await import('./network-observer.mjs');
const config={frontendOrigin:'http://127.0.0.1:44001',backendOrigin:'http://127.0.0.1:54321'};
const observer=()=>createNetworkObserver({config,assetPaths:new Set(['/'])});
const preflight={requestId:'one',request:{url:config.backendOrigin+'/rest/v1/efg_messages',method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST'}}};
test('preflight intent alone never counts as completed CORS; wildcard reported honestly',()=>{
  const n=observer();n.request(preflight);assert.equal(n.snapshot().cors.optionsCompleted,0);
  n.response({requestId:'one',response:{status:200,headers:{'Access-Control-Allow-Origin':'*'}}});assert.equal(n.snapshot().cors.optionsCompleted,0);
  n.finished({requestId:'one'});assert.deepEqual(n.snapshot().cors,{preflightRequests:1,optionsResponses:1,optionsCompleted:1,wildcardResponses:1,exactOriginResponses:0});assert.deepEqual(n.snapshot().violations,[]);
});
test('preflight failure or invalid CORS cannot become successful evidence',()=>{
  for(const origin of [undefined,'https://other.invalid']){const n=observer();n.request(preflight);n.response({requestId:'one',response:{status:204,headers:{'access-control-allow-origin':origin}}});n.finished({requestId:'one'});assert.equal(n.snapshot().cors.optionsCompleted,0);assert.ok(n.snapshot().violations.length);}
  const n=observer();n.request(preflight);n.failed({requestId:'one'});assert.equal(n.snapshot().cors.optionsCompleted,0);assert.deepEqual(n.snapshot().violations,['CDP_REQUEST_FAILED']);
});
test('exact receipt is retained only after successful response and completion; secrets never retained',()=>{
  const n=observer(),id='10000000-0000-4000-8000-000000000001',student='20000000-0000-4000-8000-000000000002',coach='30000000-0000-4000-8000-000000000003';
  n.request({requestId:'r',request:{method:'GET',url:config.backendOrigin+`/rest/v1/efg_messages?id=eq.${id}&student_id=eq.${student}&coach_id=eq.${coach}`,headers:{authorization:'secret'},postData:'secret'}});
  assert.equal(n.snapshot().receiptReads.length,0);n.response({requestId:'r',response:{status:200,headers:{authorization:'secret'}}});n.finished({requestId:'r'});
  assert.deepEqual(n.snapshot().receiptReads,[{id,studentId:student,coachId:coach}]);assert.ok(!JSON.stringify(n.snapshot()).includes('secret'));
});
test('HTTP mutation dispatch is independent of database effect',()=>{
  const n=observer();n.request({requestId:'m',request:{method:'POST',url:config.backendOrigin+'/rest/v1/efg_messages'}});assert.equal(n.snapshot().mutationDispatches.sendMessage,1);assert.equal(n.snapshot().receiptReads.length,0);
});

test('CDP attachment namespaces colliding request IDs across two sessions',async()=>{
  const {attachNetworkObserver}=await import('./network-observer.mjs');
  const n=observer(),sessions=[];
  const context={async newCDPSession(page){const listeners=new Map(),commands=[];const session={page,listeners,commands,on(name,fn){listeners.set(name,fn);},async send(name){commands.push(name);}};sessions.push(session);return session;}};
  await attachNetworkObserver(context,{name:'first'},n);await attachNetworkObserver(context,{name:'second'},n);
  for(const session of sessions){assert.deepEqual(session.commands,['Network.enable']);session.listeners.get('Network.requestWillBeSent')(preflight);}
  assert.equal(n.snapshot().pending,2);assert.equal(n.snapshot().cors.preflightRequests,2);
  sessions[0].listeners.get('Network.responseReceived')({requestId:'one',response:{status:204,headers:{'Access-Control-Allow-Origin':config.frontendOrigin}}});
  sessions[0].listeners.get('Network.loadingFinished')({requestId:'one'});
  assert.equal(n.snapshot().pending,1);assert.equal(n.snapshot().cors.optionsCompleted,1);
  sessions[1].listeners.get('Network.responseReceived')({requestId:'one',response:{status:204,headers:{'Access-Control-Allow-Origin':'*'}}});
  sessions[1].listeners.get('Network.loadingFinished')({requestId:'one'});
  assert.equal(n.snapshot().pending,0);assert.equal(n.snapshot().cors.optionsCompleted,2);
  assert.equal(n.snapshot().cors.exactOriginResponses,1);assert.equal(n.snapshot().cors.wildcardResponses,1);assert.deepEqual(n.snapshot().violations,[]);
});
test('CDP rejects redirects without counting redirected mutations or completed preflights',()=>{
  const n=observer();n.request({...preflight,redirectResponse:{status:302}});
  assert.equal(n.snapshot().cors.preflightRequests,0);assert.deepEqual(n.snapshot().violations,['CDP_REQUEST_REJECTED']);
  n.request({requestId:'redirected',redirectResponse:{status:307},request:{method:'POST',url:config.backendOrigin+'/rest/v1/efg_messages'}});
  assert.equal(n.snapshot().mutationDispatches.sendMessage,0);
  const responseRedirect=observer();responseRedirect.request(preflight);
  responseRedirect.response({requestId:'one',response:{status:302,headers:{'Access-Control-Allow-Origin':'*',location:'https://outside.invalid/'}}});
  responseRedirect.finished({requestId:'one'});
  assert.equal(responseRedirect.snapshot().cors.optionsCompleted,0);assert.ok(responseRedirect.snapshot().violations.includes('CDP_RESPONSE_REJECTED'));
});

test('existing SDK build opt-in is scoped to compilation, not the real API runtime',async()=>{
  const workflow=await source('../../../.github/workflows/ncc-dual-workspace-fullapp-qa.yml');
  const job=workflow.split('\n  real-sdk-browser-auth-api-demo:\n')[1];assert.ok(job);
  assert.match(job,/NCC_REAL_BROWSER_API: '1'/);
  assert.match(job,/NCC_SYNTHETIC_BROWSER_API=1 node efg-nutrition\/tests\/professional-browser-api\/build-sdk\.mjs/);
  assert.equal([...job.matchAll(/NCC_SYNTHETIC_BROWSER_API/g)].length,1);
  assert.match(job,/run: node efg-nutrition\/tests\/professional-browser-real-api\/run\.mjs/);
  const build=await source('../professional-browser-api/build-sdk.mjs');
  assert.ok(build.includes("process.env.NCC_SYNTHETIC_BROWSER_API==='1'"));
  assert.ok(build.includes("'CI_BUILD_ONLY'"));
});
