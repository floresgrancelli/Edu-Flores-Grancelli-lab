import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProfessionalTermsFixtureFlow, professionalTermsBindingSha256, PROFESSIONAL_TERMS_V2_RPC} from '../pilot/professional-terms-fixture-flow.mjs';
import {createTermsFixture, fixtureBinding} from './professional-terms-v2-fixture.mjs';
import {IDS, fakeIDB} from './professional-terms-test-support.mjs';
import {createProfessionalTermsJournal, PROFESSIONAL_TERMS_FIXTURE_ORIGIN} from '../pilot/professional-terms-journal.mjs';
const select = flow => { flow.setSelection('terms', true); flow.setSelection('privacy', true); };

test('fixture default OFF makes zero transport/context/storage calls', async () => {
  const bomb = () => { throw Error('must not touch'); };
  const flow = createProfessionalTermsFixtureFlow({readContext: bomb, fixtureEnvironment: bomb,
    transport: new Proxy({}, {get: bomb}), journal: new Proxy({}, {get: bomb})});
  await assert.rejects(flow.open(), /FEATURE_DISABLED/); await assert.rejects(flow.accept(), /FEATURE_DISABLED/);
  assert.equal(flow.snapshot().canAccept, false);
});
test('OFF default journal never even reads the global IndexedDB getter', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', {configurable: true, get() { throw Error('OFF read IndexedDB'); }});
  try {
    const flow = createProfessionalTermsFixtureFlow();
    await assert.rejects(flow.open(), /FEATURE_DISABLED/); await assert.rejects(flow.accept(), /FEATURE_DISABLED/);
    flow.dispose();
  } finally { if (original) Object.defineProperty(globalThis, 'indexedDB', original); else delete globalThis.indexedDB; }
});
test('only explicit isolated synthetic transport and test context are accepted', async () => {
  for (const patch of [{fixtureEnvironment: () => false}, {transport: {kind: 'supabase', backendOrigin: 'https://real.example.com'}},
    {readContext: () => ({userId: IDS.user, sessionId: IDS.session, organizationId: IDS.org, active: true, isTest: false})}]) {
    const f = createTermsFixture(), a = createProfessionalTermsFixtureFlow({...f.options(), ...patch});
    await assert.rejects(a.open(), /SYNTHETIC_FIXTURE_REQUIRED|FIXTURE_CONTEXT_REQUIRED/);
    assert.equal(f.state.calls.length, 0); assert.equal(f.database.opens, 0);
  }
});
test('exact displayed body bytes and separate unchecked selections bind the one CAS call', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open();
  assert.deepEqual(a.snapshot().checked, {terms: false, privacy: false});
  assert.equal(a.snapshot().bundle.documents[0].body.endsWith('\r\n'), true);
  a.setSelection('terms', true); await assert.rejects(a.accept(), /EXPLICIT_ACCEPTANCE_REQUIRED/);
  a.setSelection('privacy', true); const shown = a.snapshot().bundle.binding_sha256;
  const result = await a.accept(); assert.equal(result.accepted, true); assert.equal(f.state.writes, 1);
  const call = f.state.calls.find(call => call.name === PROFESSIONAL_TERMS_V2_RPC.accept);
  assert.deepEqual(Object.keys(call.args).sort(), ['p_expected_binding_sha256', 'p_org', 'p_request_id']);
  assert.equal(call.args.p_expected_binding_sha256, shown);
  assert.equal(f.state.calls[0].name, PROFESSIONAL_TERMS_V2_RPC.bundle);
  assert.equal(f.state.calls[1].name, PROFESSIONAL_TERMS_V2_RPC.accept, 'no silent bundle substitution before CAS');
  await assert.rejects(a.accept(), /EXPLICIT_ACCEPTANCE_REQUIRED/); assert.equal(f.state.writes, 1);
  const stored = JSON.stringify([...f.database.rows.values()]);
  assert.doesNotMatch(stored, /TEXTO|body|sessionId|access_token/);
});
test('binding canon uses UTF-8 byte lengths and no trim/NFC', async () => {
  const f = createTermsFixture(), b = structuredClone(f.state.bundle);
  b.documents[0].version = ' versión-ñ-🧪 ';
  assert.equal(await professionalTermsBindingSha256(b, webcrypto), fixtureBinding(b));
  const first = await professionalTermsBindingSha256(b, webcrypto); b.documents[0].version = b.documents[0].version.trim();
  assert.notEqual(await professionalTermsBindingSha256(b, webcrypto), first);
});
test('definitive coordinated Unicode vector completes open, CAS, reload and receipt without normalization', async () => {
  const vector = JSON.parse(await readFile(new URL('./professional-terms-v2-fixture-vector.json', import.meta.url), 'utf8'));
  assert.equal(await professionalTermsBindingSha256(vector.bundle, webcrypto), '8f1eaf93ad040faa396fa423fd904b428f0897c57e64226ce1ea5f904232a3ae');
  const database = fakeIDB(); let writes = 0, loss = true, session = IDS.session, random = 0;
  const options = () => ({enabled: true, fixtureEnvironment: () => true,
    readContext: () => ({userId: vector.bundle.actor_id, organizationId: vector.bundle.organization_id,
      sessionId: session, isTest: true, active: true}), journal: createProfessionalTermsJournal(database),
    crypto: {subtle: webcrypto.subtle, randomUUID: () => ++random === 1 ? IDS.next : vector.acceptance_request.p_request_id},
    transport: {kind: 'ncc-professional-terms-v2-fixture', backendOrigin: PROFESSIONAL_TERMS_FIXTURE_ORIGIN,
      async rpc(name, args) {
        if (name === PROFESSIONAL_TERMS_V2_RPC.bundle) return {data: structuredClone(vector.bundle)};
        if (name === PROFESSIONAL_TERMS_V2_RPC.accept) {
          assert.deepEqual(args, vector.acceptance_request); writes++;
          if (loss) throw Error('Lost fictional response'); return {data: structuredClone(vector.acceptance_result)};
        }
        assert.equal(name, PROFESSIONAL_TERMS_V2_RPC.receipt); assert.deepEqual(args, vector.receipt_request);
        return {data: structuredClone(vector.receipt_result)};
      }}});
  const first = createProfessionalTermsFixtureFlow(options()); await first.open(); select(first);
  await assert.rejects(first.accept(), error => error.outcome === 'uncertain'); first.dispose();
  session = IDS.next; loss = false; const second = createProfessionalTermsFixtureFlow(options());
  await second.open(); assert.equal((await second.reconcile()).accepted, true); assert.equal(writes, 1);
  const stored = [...database.rows.values()];
  assert.equal(stored.every(r => r.termsVersion === 'fixture-v1-é' && r.privacyVersion === 'fixture-v1-e\u0301'), true);
  assert.notEqual(stored[0].termsVersion, stored[0].privacyVersion);
});
test('modified body, binding, wrong actor, wrong org, student scope and incomplete pair all reject', async () => {
  const edits = [b => { b.documents[0].body += 'changed'; }, b => { b.binding_sha256 = '0'.repeat(64); },
    b => { b.actor_id = IDS.next; }, b => { b.organization_id = IDS.next; }, b => { b.scope = 'student_participation'; },
    b => { b.documents.pop(); }, b => { b.documents[0].is_current = false; }, b => { b.documents[0].url = 'javascript:alert(1)'; },
    b => { b.documents[0].body = 'BORRADOR INTERNO NO PUBLICAR'; }, b => { b.documents[0].accepted = true; },
    b => { b.documents[0].published_at = '2026-11-07T00:00:00'; }, b => { b.documents[0].published_at = '2026-02-31T00:00:00Z'; }];
  for (const edit of edits) {
    const f = createTermsFixture(); edit(f.state.bundle); const a = f.make();
    await assert.rejects(a.open()); assert.equal(a.snapshot().available, false);
    await assert.rejects(a.accept()); assert.equal(f.state.writes, 0);
  }
});
test('UNBOUND or missing v2 RPC does not fall back to personal or v1 acceptance', async () => {
  for (const missing of [false, true]) {
    const f = createTermsFixture(); f.state.unbound = true;
    if (missing) f.transport.rpc = async () => ({error: {code: 'PGRST202', message: 'Missing function'}});
    const a = f.make(); await assert.rejects(a.open()); await assert.rejects(a.accept());
    assert.equal(f.state.writes, 0); assert.equal(f.state.calls.some(c => c.name === 'efg_accept_current_legal'), false);
  }
});
test('lost reply reload finds request, only exact receipt settles without resend', async () => {
  const f = createTermsFixture(), first = f.make(); await first.open(); select(first); f.state.loss = true;
  await assert.rejects(first.accept(), error => error.outcome === 'uncertain'); first.dispose();
  f.state.context.sessionId = IDS.next; const second = f.make(); await second.open();
  assert.equal(second.snapshot().pending.state, 'uncertain'); assert.equal(second.snapshot().canAccept, false);
  await assert.rejects(second.accept()); assert.equal(f.state.writes, 1);
  assert.equal((await second.reconcile()).accepted, true); assert.equal(f.state.writes, 1);
  const third = f.make(); await third.open(); assert.equal(third.snapshot().accepted, false);
  assert.equal((await third.reconcile()).accepted, true); assert.equal(f.state.writes, 1);
});
test('missing receipt, v1 payload, extra payload, wrong actor or wrong request never unlock pending', async () => {
  const modes = ['missing', 'v1', 'extra', 'actor', 'request', 'binding'];
  for (const mode of modes) {
    const f = createTermsFixture(), a = f.make(); await a.open(); select(a); f.state.loss = true; await assert.rejects(a.accept());
    const [id, receipt] = [...f.state.receipts][0];
    if (mode === 'missing') f.state.receipts.delete(id);
    if (mode === 'v1') receipt.payload = {p_org: IDS.org, p_terms_version: 'synthetic-terms-v1', p_privacy_version: 'synthetic-privacy-v1'};
    if (mode === 'extra') receipt.payload.legal_binding_sha256 = receipt.result.legal_binding_sha256;
    if (mode === 'actor') receipt.result.actor_id = IDS.next;
    if (mode === 'request') receipt.result.request_id = IDS.next;
    if (mode === 'binding') receipt.result.legal_binding_sha256 = '0'.repeat(64);
    await assert.rejects(a.reconcile(), error => error.outcome === 'uncertain');
    assert.equal(a.snapshot().pending.state, 'uncertain'); await assert.rejects(a.accept()); assert.equal(f.state.writes, 1);
  }
});
test('TOCTOU catalog swap is rejected by expected-binding CAS and selections reset', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open(); const shown = a.snapshot().bundle.binding_sha256; select(a);
  f.state.beforeAccept = () => { f.state.bundle.documents[0].body += ' Nueva versión ficticia'; f.rehash(); };
  await assert.rejects(a.accept(), error => error.code === 'LEGAL_BINDING_CHANGED' && error.outcome === 'uncertain');
  assert.equal(f.state.writes, 0); assert.notEqual(a.snapshot().bundle.binding_sha256, shown);
  assert.deepEqual(a.snapshot().checked, {terms: false, privacy: false}); assert.equal(a.snapshot().canAccept, false);
  assert.equal(a.snapshot().pending.bindingSha256, shown); await assert.rejects(a.reconcile());
  await assert.rejects(a.accept()); assert.equal(f.state.calls.filter(c => c.name === PROFESSIONAL_TERMS_V2_RPC.accept).length, 1);
});
test('historical receipt after version change is confirmed but does not assert current acceptance', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open(); select(a); f.state.loss = true; await assert.rejects(a.accept());
  f.state.bundle.documents[1].body += ' Otra publicación ficticia'; f.rehash();
  const result = await a.reconcile(); assert.equal(result.historicalAccepted, true); assert.equal(result.accepted, false);
  assert.deepEqual(result.checked, {terms: false, privacy: false}); assert.equal(result.canAccept, false);
  select(a); assert.equal(a.snapshot().canAccept, true);
  // Deliberate second click for the new pair, never a retry of the old UUID/binding.
  f.state.loss = false; await a.accept(); assert.equal(f.state.writes, 2);
});
test('receipt historical plus unavailable current bundle never grants current readiness', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open(); select(a); f.state.loss = true; await assert.rejects(a.accept());
  f.state.unbound = true; await assert.rejects(a.reconcile(), error => error.outcome === 'confirmed_historical');
  assert.equal(a.snapshot().accepted, false); assert.equal(a.snapshot().available, false); assert.equal(a.snapshot().historicalAccepted, true);
});
test('context change during reservation prevents dispatch and leaves a durable uncertain claim', async () => {
  const f = createTermsFixture(), options = f.options(), reserve = options.journal.reserve;
  options.journal = {...options.journal, reserve: async record => { const ok = await reserve(record); f.state.context.sessionId = IDS.next; return ok; }};
  const a = createProfessionalTermsFixtureFlow(options); await a.open(); select(a);
  await assert.rejects(a.accept(), error => error.outcome === 'uncertain'); assert.equal(f.state.writes, 0);
  const reopened = f.make(); await reopened.open(); assert.equal(reopened.snapshot().pending.state, 'uncertain');
});
test('dismiss while acceptance is in flight blocks completion and later reopening reconciles only', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open(); select(a);
  f.state.beforeAccept = () => a.close();
  await assert.rejects(a.accept(), error => error.outcome === 'uncertain'); assert.equal(a.snapshot().bundle, null);
  delete f.state.beforeAccept; await a.open(); assert.equal((await a.reconcile()).accepted, true); assert.equal(f.state.writes, 1);
});
test('dismiss in microtask after verified bundle cannot restore open, confirmed or changed-binding state', async () => {
  for (const phase of ['open', 'confirm', 'cas-refresh']) {
    const f = createTermsFixture(), options = f.options(); let flow, serial = 0, reads = 0, dismissed = false;
    f.state.onCall = name => { if (name === PROFESSIONAL_TERMS_V2_RPC.bundle) { serial++; reads = 0; } };
    options.readContext = () => {
      if (serial === (phase === 'open' ? 1 : 2) && ++reads === 2) {
        dismissed = true; queueMicrotask(() => flow.close());
      }
      return {...f.state.context};
    };
    flow = createProfessionalTermsFixtureFlow(options);
    if (phase === 'open') await assert.rejects(flow.open(), /STALE_CONTEXT/);
    else {
      await flow.open(); select(flow);
      if (phase === 'cas-refresh') f.state.beforeAccept = () => { f.state.bundle.documents[0].body += ' Ficticio nuevo'; f.rehash(); };
      await assert.rejects(flow.accept());
    }
    assert.equal(dismissed, true); assert.equal(flow.snapshot().status, 'closed');
    assert.equal(flow.snapshot().bundle, null); assert.equal(flow.snapshot().canAccept, false);
  }
});
test('duplicate click during pending write never creates a second mutation', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open(); select(a);
  let release, entered; const enteredPromise = new Promise(resolve => { entered = resolve; });
  f.state.beforeAccept = async () => { entered(); await new Promise(resolve => { release = resolve; }); };
  const first = a.accept(); await enteredPromise; await assert.rejects(a.accept(), /EXPLICIT_ACCEPTANCE_REQUIRED/);
  release(); await first; assert.equal(f.state.writes, 1);
});
test('fixture models CAS before replay: historical v2 write is not replayed on changed binding', async () => {
  const f = createTermsFixture(), a = f.make(); await a.open(); select(a); await a.accept();
  const sent = f.state.calls.find(c => c.name === PROFESSIONAL_TERMS_V2_RPC.accept).args;
  f.state.bundle.documents[0].body += ' Nueva'; f.rehash();
  const response = await f.transport.rpc(PROFESSIONAL_TERMS_V2_RPC.accept, sent);
  assert.equal(response.error.message, 'NCC_LEGAL_BINDING_CHANGED'); assert.equal(f.state.writes, 1);
});
