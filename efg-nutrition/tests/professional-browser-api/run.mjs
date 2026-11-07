// CI-only: real npm SDK, browser, IndexedDB and HTTP; synthetic API/auth/data.
// Importing this module never opens a socket or browser.
import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {assertBrowserRequest,validatePublicConfig,requireThat,metadataOnly,UUID,mutationAction,SHA256,HEAD} from './policy.mjs';
import {sha256,versions} from './verify-inputs.mjs';
import {prepareAssets,startAssets} from './assets-server.mjs';
import {startFixtureApi,SYNTHETIC_PUBLIC_ANON_KEY} from './fixture-server.mjs';
const modes=['persisted','absent','revoked','alias','read_at'];
const fixedCode=e=>['CI_ONLY','SYNTHETIC_OPT_IN_REQUIRED','SDK_VERSION_MISMATCH','MODULE_HASH_MISMATCH','BUNDLE_MISMATCH','LOCKFILE_CHANGED'].includes(e?.code)?e.code:'SYNTHETIC_BRIDGE_FAILED';
const browserCodes=new Set(['LOGIN_REQUIRED','DENIED','OUTCOME_UNCERTAIN','WORKSPACE_REQUIRED','STUDENT_REQUIRED','INVALID_RECEIPT','JOURNAL_UNAVAILABLE','SDK_VERSION_MISMATCH','LOSS_ALREADY_ARMED','RESPONSE_LOST_AFTER_CONSUMPTION','STALE_CONTEXT','OPERATION_PENDING','42501','OPERATION_REJECTED']);
const browserMethods=new Set(['initialize','authenticate','enterProfessional','armLoss','send','setAlias','markRead','reconcile','cancel','logout','inspect','auditStorage']);
const unwrap=r=>{
  if(!r?.ok)throw Object.assign(new Error('BROWSER_STEP_REJECTED'),{code:'BROWSER_STEP_REJECTED',browserMethod:r?.diagnosticMethod,browserCode:browserCodes.has(r?.code)?r.code:'OPERATION_REJECTED'});
  return r.value;
};
async function call(page,method,...args){
  requireThat(browserMethods.has(method),'BROWSER_METHOD_REJECTED');
  try {const r=await page.evaluate(({method,args})=>globalThis.nccBridge[method](...args),{method,args});return r&&Object.hasOwn(r,'ok')?{...r,diagnosticMethod:method}:r;}
  catch {throw Object.assign(new Error('BROWSER_EVALUATION_FAILED'),{code:'BROWSER_EVALUATION_FAILED',browserMethod:method});}
}
async function inspect(page){return call(page,'inspect');}
async function audit(page,operationId,expected) {
  const s=unwrap(await call(page,'auditStorage'));metadataOnly(s.records);
  assert.equal(s.localStorageEntries,0);assert.equal(s.sessionStorageEntries,0);
  assert.equal(s.records.filter(r=>r.operationId===operationId).length,expected);return s.records;
}
async function explicitLogin(page,config,fixture,apiServer) {
  assert.equal(fixture.anonKey,SYNTHETIC_PUBLIC_ANON_KEY);
  unwrap(await call(page,'initialize',config,fixture.anonKey));assert.equal((await inspect(page)).signedIn,false);
  const auth=unwrap(await call(page,'authenticate',{email:fixture.email,password:fixture.password}));
  assert.equal(auth.userId,fixture.userId);assert.match(auth.sessionId,UUID);
  // Node validates membership in the fictitious session model, never real Auth SQL.
  await apiServer.verifyAuthSession({userId:auth.userId,sessionId:auth.sessionId});
}
export async function runSyntheticBrowserBridge() {
  const report={status:'NOT_RUN',scope:'REAL_NPM_SDK_BROWSER_INDEXEDDB_HTTP_WITH_SYNTHETIC_API',
    notCovered:['GoTrue','PostgREST','SQL','RLS','R5.3','hosted or CDN parity','full pilot app','browser restart/crash/eviction','simultaneous cross-tab race'],
    candidateModulesSourceHead:HEAD,runCommit:process.env.GITHUB_SHA||null,cases:[],codes:[]};
  let apiServer,assetsServer,browser,context,runtimeAttempted=false,phase='preflight';
  try {
    requireThat(process.env.GITHUB_ACTIONS==='true'&&process.platform==='linux','CI_ONLY');
    requireThat(process.env.NCC_SYNTHETIC_BROWSER_API==='1','SYNTHETIC_OPT_IN_REQUIRED');
    requireThat(!process.env.DEBUG&&!process.env.PWDEBUG&&!process.env.NODE_DEBUG&&!/--inspect/.test(process.env.NODE_OPTIONS||''),'DEBUG_LOGGING_REJECTED');
    requireThat(process.env.NCC_BROWSER==='chromium','CHROMIUM_REQUIRED');
    requireThat(/^[0-9a-f]{40}$/.test(report.runCommit||''),'RUN_COMMIT_REQUIRED');
    const prepared=await prepareAssets();
    const playwright=await import(pathToFileURL(join(prepared.dependencies.modules,'playwright/index.mjs')).href);
    runtimeAttempted=true;report.status='RUNNING';phase='launch_browser';
    const executablePath=playwright.chromium.executablePath();
    browser=await playwright.chromium.launch({executablePath,headless:true,chromiumSandbox:true});
    report.runtime={engine:'chromium',browserVersion:browser.version(),browserBinarySha256:sha256(await readFile(executablePath)),
      playwrightVersion:versions.playwright,sandboxRequested:true,sdk:prepared.bundleReport,candidateModuleHashes:prepared.candidateHashes};
    for(const mode of modes) {
      phase=mode+':start_fixture';
      assetsServer=await startAssets(prepared);apiServer=await startFixtureApi({allowedOrigin:assetsServer.origin});
      assetsServer.setBackendOrigin(apiServer.origin);
      const fixture=apiServer.fixture; // all auth/data are deliberately fictitious, RAM only
      const runId=randomUUID();
      const config=validatePublicConfig({runId,dbName:'ncc-professional-fixture-journal-'+runId,frontendOrigin:assetsServer.origin,backendOrigin:apiServer.origin,sdk:{version:versions['@supabase/supabase-js'],format:'esm',path:'/sdk/supabase-bundle.mjs',sha256:prepared.bundleReport.bundleSha256}});
      const baseline=apiServer.snapshot({operationId:null,readIds:[]});
      requireThat(SHA256.test(baseline.originalProfileHash),'FIXTURE_OBSERVER_REQUIRED');
      assert.equal(baseline.cors.preflightRequests,0);assert.equal(baseline.cors.optionsAccepted,0);
      const violations=[],observed={sendMessage:0,setAlias:0,markRead:0};
      context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:false,acceptDownloads:false});
      requireThat(typeof context.routeWebSocket==='function','WEBSOCKET_GUARD_REQUIRED');
      await context.routeWebSocket('**/*',ws=>{violations.push('WEBSOCKET_REJECTED');ws.close();});
      context.on('page',p=>{p.on('pageerror',()=>violations.push('BROWSER_PAGE_ERROR'));p.on('download',d=>{violations.push('DOWNLOAD_REJECTED');void d.cancel();});});
      await context.route('**/*',async route=>{
        try {
          const request=route.request();
          requireThat(!request.redirectedFrom(),'REDIRECT_REJECTED');
          // Preflight is authorized only for the exact allowlisted requested verb.
          const method=request.method()==='OPTIONS'?await request.headerValue('access-control-request-method'):request.method();
          assertBrowserRequest(request.url(),method,config,new Set(prepared.assets.keys()));
          if(request.method()!=='OPTIONS'&&new URL(request.url()).origin===config.backendOrigin) {
            const action=mutationAction(method,new URL(request.url()).pathname);if(action)observed[action]++;
          }
          // Both assets and API use real HTTP. No route.fetch or route.fulfill.
          await route.continue();
        } catch {violations.push('NETWORK_POLICY_REJECTED');await route.abort('blockedbyclient');}
      });
      context.on('response',response=>{if(response.status()>=300&&response.status()<400)violations.push('REDIRECT_REJECTED');});
      const page=await context.newPage(),url=config.frontendOrigin+'/';
      await page.goto(url);await page.waitForFunction(()=>!!globalThis.nccBridge);
      phase=mode+':initial_login';
      await explicitLogin(page,config,fixture,apiServer);
      phase=mode+':initial_context';
      unwrap(await call(page,'enterProfessional',fixture.organizationId,fixture.studentId));
      const action=mode==='alias'?'setAlias':mode==='read_at'?'markRead':'sendMessage';
      if(action==='setAlias'){requireThat(baseline.aliasHash===null||SHA256.test(baseline.aliasHash),'ALIAS_BASELINE_REQUIRED');assert.notEqual(baseline.aliasHash,sha256(Buffer.from(JSON.stringify('ncc.synthetic.alias'))));}
      if(action==='markRead')requireThat(Array.isArray(baseline.inboundUnreadIds)&&baseline.inboundUnreadIds.length>0&&baseline.inboundUnreadIds.every(id=>UUID.test(id)),'UNREAD_BASELINE_REQUIRED');
      unwrap(await call(page,'armLoss',{action,studentId:action==='setAlias'?null:fixture.studentId}));
      phase=mode+':mutation';
      const lost=action==='sendMessage'?await call(page,'send','NCC synthetic reload '+mode):action==='setAlias'?await call(page,'setAlias','ncc.synthetic.alias'):await call(page,'markRead');
      assert.equal(lost.ok,false);
      phase=mode+':mutation_receipt_audit';
      const first=await inspect(page);assert.equal(first.wire.dispatches,1);assert.equal(first.wire.injected,1);assert.equal(first.wire.last.responseConsumed,true);
      assert.equal(first.wire.last.status,action==='sendMessage'?201:200);
      assert.equal(first.originalProfileUnchanged,true);
      const operationId=first.wire.last.operationId;assert.match(operationId,UUID);
      const journal=await audit(page,operationId,1);assert.equal(journal.length,1);assert.equal(journal[0].action,action);
      if(action==='markRead')assert.deepEqual([...journal[0].readIds].sort(),[...baseline.inboundUnreadIds].sort());
      const afterLoss=apiServer.snapshot({operationId,readIds:journal[0].readIds||[]});
      assert.equal(afterLoss.originalProfileHash,baseline.originalProfileHash);
      assert.equal(afterLoss.mutationDispatches[action]-baseline.mutationDispatches[action],1);
      if(action==='sendMessage') {
        assert.equal(afterLoss.messageRowsForOperation,1);assert.equal(afterLoss.notificationRowsForOperation,1);
        assert.equal(afterLoss.messageInsertCount-baseline.messageInsertCount,1);
        assert.equal(afterLoss.messageDigest,journal[0].payloadDigest);
        assert.deepEqual(afterLoss.messageIdentity,{id:operationId,studentId:fixture.studentId,coachId:fixture.userId,senderId:fixture.userId});
      } else if(action==='setAlias')assert.equal(afterLoss.aliasHash,sha256(Buffer.from(JSON.stringify('ncc.synthetic.alias'))));
      else assert.equal(afterLoss.reservedReadIdsUpdated,journal[0].readIds.length);
      // Observational second tab, NOT a simultaneous IDB transaction race.
      phase=mode+':second_tab';
      const second=await context.newPage();await second.goto(url);await second.waitForFunction(()=>!!globalThis.nccBridge);
      phase=mode+':second_tab_login';
      await explicitLogin(second,config,fixture,apiServer);phase=mode+':second_tab_context';unwrap(await call(second,'enterProfessional',fixture.organizationId,fixture.studentId));
      assert.equal((await inspect(second)).uncertain,true);await audit(second,operationId,1);
      if(action==='sendMessage')assert.equal((await call(second,'send','NCC synthetic duplicate blocked')).ok,false);
      if(action==='setAlias')assert.equal((await call(second,'setAlias','ncc.synthetic.alias')).ok,false);
      const secondObserved=await inspect(second);assert.equal(secondObserved.wire.dispatches,0);await second.close();
      phase=mode+':cancel_logout';
      unwrap(await call(page,'cancel'));await audit(page,operationId,1);
      unwrap(await call(page,'logout'));assert.equal((await inspect(page)).signedIn,false);await audit(page,operationId,1);
      if(mode==='absent')apiServer.makeReceiptAbsent({operationId});
      if(mode==='revoked')apiServer.revokeProfessionalAccess({organizationId:fixture.organizationId});
      // Same page, origin, DB name and backend namespace throughout the reload.
      phase=mode+':reload';
      await page.reload();await page.waitForFunction(()=>!!globalThis.nccBridge);
      assert.equal((await inspect(page)).signedIn,false);
      phase=mode+':reload_login';
      await explicitLogin(page,config,fixture,apiServer);await audit(page,operationId,1);
      phase=mode+':reconcile';
      const entered=await call(page,'enterProfessional',fixture.organizationId,fixture.studentId);
      if(mode==='revoked') {assert.equal(entered.ok,false);assert.equal((await inspect(page)).workspaceReady,false);}
      else {
        unwrap(entered);assert.equal((await inspect(page)).uncertain,true);
        const receipt=unwrap(await call(page,'reconcile'));
        if(mode==='persisted'){assert.equal(receipt.status,'confirmed');assert.equal(receipt.operationId,operationId);await audit(page,operationId,0);}
        else {
          assert.equal(receipt.status,'unresolved');assert.equal(receipt.reason,mode==='absent'?'NOT_VISIBLE':'NO_VERIFIABLE_RESERVATION');
          await audit(page,operationId,1);assert.equal((await inspect(page)).uncertain,true);
          if(mode==='absent')assert.equal((await call(page,'send','NCC synthetic still blocked')).ok,false);
          if(mode==='alias')assert.equal((await call(page,'setAlias','ncc.synthetic.alias')).ok,false);
          // read_at values are not operation receipts; seeing them must not finish its journal.
          if(mode==='read_at'){unwrap(await call(page,'markRead'));await audit(page,operationId,1);}
        }
      }
      assert.equal((await inspect(page)).wire.dispatches,0);
      const final=apiServer.snapshot({operationId,readIds:journal[0].readIds||[]});
      assert.equal(final.originalProfileHash,baseline.originalProfileHash);
      assert.equal(final.mutationDispatches[action]-baseline.mutationDispatches[action],1);
      assert.deepEqual(observed,{sendMessage:action==='sendMessage'?1:0,setAlias:action==='setAlias'?1:0,markRead:action==='markRead'?1:0});
      for(const other of Object.keys(observed))assert.equal(final.mutationDispatches[other]-baseline.mutationDispatches[other],observed[other]);
      assert.deepEqual(violations,[]);assert.equal((await context.cookies()).length,0);
      if(action==='sendMessage') {
        assert.equal(final.messageInsertCount-baseline.messageInsertCount,1);
        assert.equal(final.messageRowsForOperation,mode==='absent'?0:1);
        if(mode!=='absent')assert.equal(final.notificationRowsForOperation,1);
      }
      if(mode==='revoked')await audit(page,operationId,1);
      requireThat(final.cors.optionsAccepted>0&&final.cors.originRejected===0,'CORS_NOT_EXERCISED');
      if(['persisted','absent'].includes(mode))assert.ok(final.receiptReads.some(r=>r.id===operationId&&r.studentId===fixture.studentId&&r.coachId===fixture.userId));
      report.cases.push({mode,status:'PASS',allSdkFetchCallbacksBeforeReload:first.wire.callbacks,
        sdkMutationReplayCallbacksBlocked:first.wire.blockedReplays,secondTabSdkFetchCallbacks:secondObserved.wire.callbacks,
        sdkFetchCallbacksAfterReload:(await inspect(page)).wire.callbacks,mutationDispatches:1,messageRows:action==='sendMessage'?final.messageRowsForOperation:null,
        syntheticNotificationRowsAfterDispatch:action==='sendMessage'?afterLoss.notificationRowsForOperation:null,syntheticNotificationRowsFinal:action==='sendMessage'?final.notificationRowsForOperation:null,corsOptionsAccepted:final.cors.optionsAccepted,profileHashUnchanged:true,
        exactResponseDrained:true,explicitLoginAfterReload:true,secondTab:'observer only',journalRetained:mode!=='persisted'});
      await context.close();context=null;
      await apiServer.close();apiServer=null;await assetsServer.close();assetsServer=null;
    }
    report.status='PASS_REAL_BROWSER_SDK_IDB_SYNTHETIC_HTTP_API';phase='complete';
  }catch(e){report.status=runtimeAttempted?'FAILED':'NOT_RUN';report.codes=[fixedCode(e)];report.failurePhase=phase;
    if(browserMethods.has(e?.browserMethod))report.failureBrowserMethod=e.browserMethod;
    if(browserCodes.has(e?.browserCode))report.failureBrowserCode=e.browserCode;
    if(apiServer){
      const snapshot=apiServer.snapshot();
      report.failureFixtureCounters={};
      for(const group of ['cors','mutationDispatches']) {report.failureFixtureCounters[group]={};for(const key of group==='cors'?['preflightRequests','optionsAccepted','originRejected']:['sendMessage','setAlias','markRead'])if(Number.isSafeInteger(snapshot[group]?.[key]))report.failureFixtureCounters[group][key]=snapshot[group][key];}
    }}
  finally {
    // Close only this test's browser, contexts and loopback listeners.
    try{await context?.close();}catch{report.codes.push('CONTEXT_CLEANUP_FAILED');report.status='FAILED';}
    try{await browser?.close();}catch{report.codes.push('BROWSER_CLEANUP_FAILED');report.status='FAILED';}
    try{await apiServer?.close();}catch{report.codes.push('API_CLEANUP_FAILED');report.status='FAILED';}
    try{await assetsServer?.close();}catch{report.codes.push('ASSET_CLEANUP_FAILED');report.status='FAILED';}
  }
  return report; // Never raw errors, stack, requests, headers, session dumps or tokens.
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const report=await runSyntheticBrowserBridge();
  console.log(JSON.stringify(report));
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `### NCC browser/SDK/IndexedDB with synthetic HTTP API\nStatus: ${report.status}\nCommit: ${report.runCommit}\nCases: ${report.cases.length}/5\nThis does not verify GoTrue, PostgREST, SQL, RLS, R5.3 or the full pilot app.\n`);
  if(report.status!=='PASS_REAL_BROWSER_SDK_IDB_SYNTHETIC_HTTP_API')process.exitCode=1;
}
