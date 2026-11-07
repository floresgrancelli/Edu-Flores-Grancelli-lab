import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessionalTermsSdkTransport, PROFESSIONAL_TERMS_SDK_ENABLED} from '../pilot/professional-terms-sdk-transport.mjs';

const user = '11111111-1111-4111-8111-111111111111', session = '22222222-2222-4222-8222-222222222222';
const org = '33333333-3333-4333-8333-333333333333', request = '44444444-4444-4444-8444-444444444444';
const personal = '55555555-5555-4555-8555-555555555555', other = '66666666-6666-4666-8666-666666666666';
const binding = 'a'.repeat(64);
const bundleRPC = 'ncc_pilot_workspace_legal_bundle_v2', acceptRPC = 'ncc_pilot_workspace_accept_terms_v2', receiptRPC = 'ncc_pilot_workspace_receipt_v1';
const acceptance = () => ({p_org: org, p_expected_binding_sha256: binding, p_request_id: request});
const token = id => `a.${Buffer.from(JSON.stringify({session_id: id})).toString('base64url')}.b`;
function fixture() {
  const listeners = new Set();
  const state = {calls: [], writes: 0, session, active: true, legalReady: false, own: true, loss: false, receipts: new Map(), observerCount: 0};
  const config = {explicitReleaseConfiguration: true, backendOrigin: 'https://ncc.example.com'};
  const sdk = {supabaseUrl: config.backendOrigin,
    auth: {
      onAuthStateChange(listener) { state.observerCount++; listeners.add(listener); return {data: {subscription: {unsubscribe() { listeners.delete(listener); }}}}; },
      async getSession() { state.calls.push('getSession'); return {data: {session: {access_token: token(state.session)}}}; },
      async getUser(accessToken) { state.calls.push('getUser'); assert.equal(accessToken, token(state.session));
        if (state.onGetUser) state.onGetUser(); return {data: {user: {id: user}}}; }
    },
    from(table) {
      assert.equal(table, 'efg_profiles'); const query = {select() { return query; }, eq() { return query; }, single() { return query; },
        then(resolve) { state.calls.push('profile'); resolve({data: {user_id: user, role: 'student', active: true, organization_id: personal}}); }};
      return query;
    },
    async rpc(name, args) {
      state.calls.push({name, args: structuredClone(args)});
      if (name === 'ncc_dual_workspace_contexts_v1') return {data: {user_id: user, active: state.active, profile_role: 'student',
        student_context: {organization_id: personal, coach_id: other, consent_accepted: true}, managed_coaches: [],
        coach_contexts: state.own ? [{id: org, coach_id: user, name: 'Ficticio', is_test: false, legal_ready: state.legalReady,
          status: 'active', seat_limit: 5, active_students: 0, pending_invitations: 0}] : []}};
      let data;
      if (name === bundleRPC) data = {contract_version: 2, actor_id: user, organization_id: org,
        scope: 'professional_workspace_acceptance_v2', binding_sha256: binding, documents: [{kind: 'terms'}, {kind: 'privacy'}]};
      else if (name === acceptRPC) {
        state.writes++; data = {contract_version: 2, actor_id: user, organization_id: org, request_id: args.p_request_id,
          legal_ready: true, legal_binding_sha256: args.p_expected_binding_sha256};
        state.receipts.set(args.p_request_id, {operation: 'acceptTerms', payload: {p_org: org, p_expected_binding_sha256: binding}, result: structuredClone(data)});
        if (state.loss) throw Error('Fictional lost response');
      } else if (name === receiptRPC) data = structuredClone(state.receipts.get(args.p_request_id) ?? null);
      else throw Error('Unexpected RPC');
      if (state.onRpc) await state.onRpc(name, args, data);
      return state.rpcError ? {data: null, error: state.rpcError} : {data};
    }};
  const make = () => createProfessionalTermsSdkTransport({sdk, config, enabled: true});
  return {state, sdk, config, make, emit(event) { for (const listener of listeners) listener(event); }, listeners};
}
test('SDK transport OFF does not read SDK, storage or attach observers', async () => {
  assert.equal(PROFESSIONAL_TERMS_SDK_ENABLED, false);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', {configurable: true, get() { throw Error('OFF touched storage'); }});
  try {
    const sdk = new Proxy({}, {get() { throw Error('OFF touched SDK'); }});
    const config = new Proxy({}, {get() { throw Error('OFF touched config'); }});
    const transport = createProfessionalTermsSdkTransport({sdk, config});
    await assert.rejects(transport.selectOrganization(org), /FEATURE_DISABLED/);
    await assert.rejects(transport.rpc(acceptRPC, acceptance()), /FEATURE_DISABLED/); transport.dispose();
  } finally { if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor); else delete globalThis.indexedDB; }
});
test('captured exact HTTPS origin rejects mismatches and synthetic/backend paths before auth', async () => {
  for (const value of ['http://ncc.example.com', 'https://ncc.example.com/path', 'https://ncc-fixture.invalid', 'https://127.0.0.1', 'https://other.example.com']) {
    const f = fixture(); f.sdk.supabaseUrl = value; const a = f.make();
    await assert.rejects(a.selectOrganization(org), /INVALID_BACKEND|BACKEND_MISMATCH/); assert.equal(f.state.calls.length, 0); assert.equal(f.state.observerCount, 0);
  }
  const f = fixture(); f.config.backendOrigin = new URL('https://ncc.example.com');
  await assert.rejects(f.make().selectOrganization(org), /INVALID_BACKEND/); assert.equal(f.state.calls.length, 0);
});
test('read-only bootstrap allows owned context before professional acceptance without altering student profile', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org);
  const result = await a.rpc(bundleRPC, {p_org: org}); assert.equal(result.data.organization_id, org);
  assert.equal(f.state.legalReady, false); assert.equal(f.state.writes, 0);
  assert.equal(f.state.calls.some(call => call.name?.includes('roster')), false);
  a.dispose(); assert.equal(f.listeners.size, 0);
});
test('foreign, managed-only or original student workspace cannot be selected', async () => {
  for (const target of [personal, other, org]) {
    const f = fixture(); if (target === org) f.state.own = false;
    await assert.rejects(f.make().selectOrganization(target), /DENIED/); assert.equal(f.state.writes, 0);
  }
});
test('only three proposed signatures are permitted; no fallback to v1/personal acceptance', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org);
  const before = f.state.calls.length;
  for (const [name, args] of [['ncc_pilot_workspace_accept_terms_v1', acceptance()], ['efg_accept_current_legal', {}],
    [bundleRPC, {p_org: other}], [bundleRPC, {p_org: org, extra: true}], [acceptRPC, {...acceptance(), p_terms_version: 'v1'}],
    [acceptRPC, {...acceptance(), p_expected_binding_sha256: 'invalid'}], [receiptRPC, {p_request_id: 'invalid'}]]) {
    await assert.rejects(a.rpc(name, args), /RPC_NOT_ALLOWED|INVALID_LEGAL_ARGS/);
  }
  assert.equal(f.state.calls.length, before); assert.equal(f.state.writes, 0);
});
test('successful v2 call is attributed and its exact request UUID cannot be reused', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org);
  assert.equal((await a.rpc(acceptRPC, acceptance())).data.legal_binding_sha256, binding);
  const receipt = (await a.rpc(receiptRPC, {p_request_id: request})).data;
  assert.deepEqual(receipt.payload, {p_org: org, p_expected_binding_sha256: binding});
  await assert.rejects(a.rpc(acceptRPC, acceptance()), /ACCEPTANCE_ALREADY_ATTEMPTED/); assert.equal(f.state.writes, 1);
});
test('lost result blocks same/new UUID, including after invalidate/reselect and receipt reads', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org); f.state.loss = true;
  await assert.rejects(a.rpc(acceptRPC, acceptance()), error => error.outcome === 'uncertain');
  a.invalidate(); await a.selectOrganization(org);
  await a.rpc(receiptRPC, {p_request_id: request});
  for (const id of [request, other]) await assert.rejects(a.rpc(acceptRPC, {...acceptance(), p_request_id: id}), /ACCEPTANCE_ALREADY_ATTEMPTED/);
  assert.equal(f.state.writes, 1);
});
test('two concurrent calls using the same request UUID dispatch once', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org);
  const outcomes = await Promise.allSettled([a.rpc(acceptRPC, acceptance()), a.rpc(acceptRPC, acceptance())]);
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1); assert.equal(f.state.writes, 1);
});
test('post-dispatch session/context change prevents success and keeps mutation uncertain', async () => {
  for (const change of ['session', 'ownership', 'observer']) {
    const f = fixture(), a = f.make(); await a.selectOrganization(org);
    f.state.onRpc = name => { if (name === acceptRPC) {
      if (change === 'session') f.state.session = other;
      if (change === 'ownership') f.state.own = false;
      if (change === 'observer') f.emit('SIGNED_OUT');
    }};
    await assert.rejects(a.rpc(acceptRPC, acceptance()), error => error.outcome === 'uncertain'); assert.equal(f.state.writes, 1);
  }
});
test('mutation args/config are captured and SDK origin cannot drift mid-flight', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org);
  const args = acceptance(), pending = a.rpc(acceptRPC, args); args.p_org = other;
  await pending; assert.equal(f.state.calls.find(call => call.name === acceptRPC).args.p_org, org);
  f.config.backendOrigin = f.sdk.supabaseUrl = 'https://changed.example.com';
  await assert.rejects(a.rpc(bundleRPC, {p_org: org}), /BACKEND_MISMATCH/);
});
test('wrong attribution, legacy receipt payload or RPC errors fail closed without retry', async () => {
  for (const mode of ['actor', 'request', 'legacy', 'missing-rpc']) {
    const f = fixture(), a = f.make(); await a.selectOrganization(org);
    if (mode === 'missing-rpc') f.state.rpcError = {code: 'PGRST202', message: 'Not implemented'};
    else f.state.onRpc = (name, args, data) => {
      if (mode === 'actor' && name === acceptRPC) data.actor_id = other;
      if (mode === 'request' && name === acceptRPC) data.request_id = other;
    };
    if (mode === 'legacy') {
      await a.rpc(acceptRPC, acceptance()); f.state.receipts.get(request).payload = {p_org: org, p_terms_version: 'v1', p_privacy_version: 'v1'};
      await assert.rejects(a.rpc(receiptRPC, {p_request_id: request}), /INVALID_LEGAL_RECEIPT/);
    } else await assert.rejects(a.rpc(acceptRPC, acceptance()), error => error.outcome === 'uncertain');
    assert.equal(f.state.writes, 1);
  }
});
test('stable SDK wire pairs stay distinguishable without leaking details, hints or arbitrary messages', async () => {
  for (const [code, message, expected] of [['55000', 'NCC_LEGAL_BINDING_UNBOUND', 'NCC_LEGAL_BINDING_UNBOUND'],
    ['22023', 'NCC_LEGAL_BINDING_CHANGED', 'NCC_LEGAL_BINDING_CHANGED'], ['22023', 'NCC_LEGAL_REQUEST_INVALID', 'NCC_LEGAL_REQUEST_INVALID'],
    ['22023', 'Idempotency conflict', 'Idempotency conflict'], ['55P03', 'NCC_LEGAL_BINDING_BUSY', 'NCC_LEGAL_BINDING_BUSY'],
    ['22023', 'private arbitrary server text', null]]) {
    const f = fixture(), a = f.make(); await a.selectOrganization(org);
    f.state.rpcError = {code, message, details: 'never expose', hint: 'never expose'};
    await assert.rejects(a.rpc(acceptRPC, acceptance()), error => {
      assert.equal(error.code, code); assert.equal(error.serverMessage, expected); assert.equal(error.outcome, 'uncertain');
      assert.equal('details' in error, false); assert.equal('hint' in error, false);
      assert.equal(error.message, expected || code); return true;
    });
    await assert.rejects(a.rpc(acceptRPC, acceptance()), /ACCEPTANCE_ALREADY_ATTEMPTED/); assert.equal(f.state.writes, 1);
  }
});
test('observer invalidates pending selection and dispose is terminal', async () => {
  const f = fixture(), a = f.make(); await a.selectOrganization(org); f.emit('TOKEN_REFRESHED');
  await assert.rejects(a.rpc(bundleRPC, {p_org: org}), /WORKSPACE_REQUIRED/);
  await a.selectOrganization(org); a.dispose();
  await assert.rejects(a.rpc(bundleRPC, {p_org: org}), /DISPOSED/);
  await assert.rejects(a.selectOrganization(org), /DISPOSED/); assert.equal(f.listeners.size, 0);
});
